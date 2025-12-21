// netlify/functions/messages-send.js
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getAuthenticatedUser } from './utils/supabase.js'
import { Signal } from './utils/signal.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'portal@send.uptrademedia.com'
const RESEND_FROM = `Uptrade Media <${RESEND_FROM_EMAIL}>`

// =====================================================
// ECHO DETECTION UTILITIES
// =====================================================

// Check if a contact is Echo AI
function isEchoContact(contact) {
  return contact?.is_ai === true || contact?.contact_type === 'ai'
}

// Check if message contains @Echo mention
function detectEchoMention(content) {
  const mentionPatterns = [
    /@echo\b/i,
    /@signal\b/i,
    /^echo[,:]?\s/i,
    /^hey echo\b/i
  ]
  return mentionPatterns.some(p => p.test(content))
}

// Extract query after @Echo mention
function extractEchoQuery(content) {
  return content
    .replace(/@echo\b/gi, '')
    .replace(/@signal\b/gi, '')
    .replace(/^echo[,:]?\s*/i, '')
    .replace(/^hey echo\b/i, '')
    .trim()
}

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Verify authentication using Supabase
  const { user, contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  try {
    // Only authenticated users can send messages
    if (contact.role !== 'admin' && contact.role !== 'client') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only authenticated users can send messages' })
      }
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}')
    const {
      recipientId,
      subject,
      content,
      projectId,
      parentId
    } = body

    // Validate required fields
    if (!recipientId || !content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'recipientId and content are required' })
      }
    }

    // For new threads, subject is required
    if (!parentId && !subject) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'subject is required for new threads' })
      }
    }

    // Connect to database - verify recipient exists
    const { data: recipient, error: recipientError } = await supabase
      .from('contacts')
      .select('id, name, email, is_ai, contact_type')
      .eq('id', recipientId)
      .single()

    if (recipientError || !recipient) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Recipient not found' })
      }
    }

    // Check if this is an Echo thread (sending to Echo AI)
    const isEchoThread = isEchoContact(recipient)
    const hasEchoMention = detectEchoMention(content)

    // If projectId provided, verify it exists
    if (projectId) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .single()

      if (projectError || !project) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Project not found' })
        }
      }
    }

    // If parentId provided, verify parent message exists
    let parentMessage = null
    if (parentId) {
      const { data: parent, error: parentError } = await supabase
        .from('messages')
        .select('id, subject, project_id')
        .eq('id', parentId)
        .single()

      if (parentError || !parent) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Parent message not found' })
        }
      }
      parentMessage = parent
    }

    // Create message
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        sender_id: contact.id,
        recipient_id: recipientId,
        subject: subject || parentMessage?.subject || 'Re: Conversation',
        content,
        project_id: projectId || parentMessage?.project_id || null,
        parent_id: parentId || null,
        org_id: contact.org_id,
        thread_type: isEchoThread ? 'echo' : (hasEchoMention ? 'group' : 'direct'),
        is_echo_response: false
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    // If this is an Echo thread, get AI response
    let echoResponse = null
    if (isEchoThread) {
      try {
        echoResponse = await getEchoResponse(contact, content, projectId || parentMessage?.project_id)
        
        if (echoResponse) {
          // Store Echo's response as a message
          await supabase
            .from('messages')
            .insert({
              sender_id: recipientId, // Echo is the sender
              recipient_id: contact.id,
              subject: message.subject,
              content: echoResponse.content,
              project_id: message.project_id,
              parent_id: message.id,
              org_id: contact.org_id,
              thread_type: 'echo',
              is_echo_response: true,
              signal_conversation_id: echoResponse.conversationId,
              echo_metadata: {
                suggestions: echoResponse.suggestions,
                usage: echoResponse.usage
              }
            })
        }
      } catch (echoError) {
        console.error('Echo response error:', echoError)
        // Don't fail the request if Echo fails
      }
    }

    // Handle @Echo mentions in group threads
    if (hasEchoMention && !isEchoThread) {
      try {
        // Get Echo contact for this org
        const { data: echoContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('org_id', contact.org_id)
          .eq('is_ai', true)
          .single()
        
        if (echoContact) {
          const query = extractEchoQuery(content)
          echoResponse = await getEchoResponse(contact, query, projectId || parentMessage?.project_id)
          
          if (echoResponse) {
            // Store Echo's response in the same thread
            await supabase
              .from('messages')
              .insert({
                sender_id: echoContact.id,
                recipient_id: contact.id, // Reply to the person who mentioned Echo
                subject: message.subject,
                content: echoResponse.content,
                project_id: message.project_id,
                parent_id: message.id,
                org_id: contact.org_id,
                thread_type: 'group',
                is_echo_response: true,
                signal_conversation_id: echoResponse.conversationId,
                echo_metadata: {
                  suggestions: echoResponse.suggestions,
                  usage: echoResponse.usage,
                  trigger: 'mention'
                }
              })
          }
        }
      } catch (echoError) {
        console.error('Echo mention response error:', echoError)
      }
    }

    // Send email notification to recipient (skip for Echo)
    if (RESEND_API_KEY && recipient.email && !isEchoThread) {
      try {
        const resend = new Resend(RESEND_API_KEY)
        const isReply = !!parentId
        
        await resend.emails.send({
          from: RESEND_FROM,
          to: recipient.email,
          subject: isReply ? `Re: ${message.subject}` : `New Message: ${message.subject}`,
          html: `
            <h2>${isReply ? 'New Reply' : 'New Message'}</h2>
            <p><strong>From:</strong> ${contact.name || 'Team'} (${contact.email || ''})</p>
            <p><strong>Subject:</strong> ${message.subject}</p>
            <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-left: 4px solid #007bff;">
              ${content.replace(/\n/g, '<br>')}
            </div>
            <p><a href="${process.env.URL}/messages/${message.id}">View Message</a></p>
          `
        })
      } catch (emailError) {
        console.error('Failed to send message notification:', emailError)
        // Don't fail the request if email fails
      }
    }

    // Format response
    const formattedMessage = {
      id: message.id,
      senderId: message.sender_id,
      recipientId: message.recipient_id,
      subject: message.subject,
      content: message.content,
      projectId: message.project_id,
      parentId: message.parent_id,
      readAt: message.read_at,
      createdAt: message.created_at
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        message: formattedMessage,
        echoResponse: echoResponse ? {
          content: echoResponse.content,
          suggestions: echoResponse.suggestions,
          conversationId: echoResponse.conversationId
        } : null,
        notification: 'Message sent successfully'
      })
    }

  } catch (error) {
    console.error('Error sending message:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to send message',
        message: error.message 
      })
    }
  }
}

// =====================================================
// ECHO RESPONSE HANDLER (Using Signal)
// =====================================================
async function getEchoResponse(contact, message, projectId = null) {
  // Echo system prompt for internal teammate mode
  const systemPrompt = `You are Echo, an AI teammate within a marketing agency portal. You help internal team members with their work.

## Your Personality
- You're a helpful, knowledgeable colleague - not a chatbot
- Be direct and efficient - these are busy professionals
- Use casual but professional tone (like Slack messages)
- Show personality - you can use emojis sparingly 
- Admit when you don't know something

## Response Style
- Keep responses concise - this is messaging, not documentation
- Use bullet points and bold for scannable info
- Include relevant data when available
- Suggest next actions when appropriate

Current context:
- User: ${contact.name} (${contact.role || 'team member'})
- Organization: ${contact.org_id}
${projectId ? `- Active Project: ${projectId}` : ''}`

  try {
    const signal = new Signal(supabase, contact.org_id, { userId: contact.id })
    
    const content = await signal.invoke({
      module: 'echo',
      tool: 'messaging_response',
      systemPrompt,
      userPrompt: message
    })
    
    // Generate contextual suggestions
    const suggestions = generateSuggestions(message, content)
    
    // Create/get conversation for context tracking
    const { data: conv } = await supabase
      .from('signal_conversations')
      .insert({
        project_id: projectId,
        session_id: `echo_${contact.id}_${Date.now()}`,
        visitor_name: contact.name,
        visitor_email: contact.email,
        status: 'active',
        source: 'echo_messaging',
        started_at: new Date().toISOString()
      })
      .select('id')
      .single()
    
    return {
      content,
      suggestions,
      conversationId: conv?.id,
      usage: { totalTokens: 0 } // Signal tracks usage internally
    }
  } catch (error) {
    console.error('Echo AI error:', error)
    return {
      content: "Sorry, I'm having trouble processing that right now. Try again in a moment, or reach out to the team directly.",
      suggestions: ['Try again', 'Contact support'],
      usage: { totalTokens: 0 }
    }
  }
}

// Generate contextual follow-up suggestions
function generateSuggestions(userMessage, aiResponse) {
  const suggestions = []
  const lowerMsg = userMessage.toLowerCase()
  const lowerResp = aiResponse.toLowerCase()
  
  if (lowerResp.includes('seo') || lowerResp.includes('traffic')) {
    suggestions.push('Show me keyword rankings')
    suggestions.push('What content should I create?')
  }
  
  if (lowerResp.includes('follow up') || lowerResp.includes('lead')) {
    suggestions.push('Create a reminder')
    suggestions.push('Draft an email for them')
  }
  
  if (lowerResp.includes('task') || lowerResp.includes('project')) {
    suggestions.push('What else needs attention?')
    suggestions.push('Show project overview')
  }
  
  if (!suggestions.length) {
    suggestions.push('What else can you help with?')
    suggestions.push('Show me my priorities')
  }
  
  return suggestions.slice(0, 3)
}
