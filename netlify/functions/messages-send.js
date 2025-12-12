// netlify/functions/messages-send.js
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getAuthenticatedUser } from './utils/supabase.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'portal@send.uptrademedia.com'
const RESEND_FROM = `Uptrade Media <${RESEND_FROM_EMAIL}>`

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
      .select('id, name, email')
      .eq('id', recipientId)
      .single()

    if (recipientError || !recipient) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Recipient not found' })
      }
    }

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
        parent_id: parentId || null
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    // Send email notification to recipient
    if (RESEND_API_KEY && recipient.email) {
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
