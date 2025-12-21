// netlify/functions/engage-chat-session.js
// Create and manage chat sessions (for widget submissions)

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { Resend } from 'resend'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Content-Type': 'application/json'
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS }
  }

  const supabase = createSupabaseAdmin()

  try {
    // POST: Create new chat session (from widget - no auth required)
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const { 
        projectId, 
        visitorId, 
        sessionId,
        visitorName,
        visitorEmail,
        visitorPhone,
        initialMessage,
        sourceUrl,
        referrer,
        userAgent,
        deviceType
      } = body

      if (!projectId || !visitorId || !sessionId) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'projectId, visitorId, and sessionId are required' })
        }
      }

      // Get project and chat config
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, title, org_id')
        .eq('id', projectId)
        .single()

      if (projectError || !project) {
        return {
          statusCode: 404,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Project not found' })
        }
      }

      // Get chat config
      const { data: chatConfig } = await supabase
        .from('engage_chat_config')
        .select('*')
        .eq('project_id', projectId)
        .single()

      if (!chatConfig || !chatConfig.is_enabled) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Chat is not enabled for this project' })
        }
      }

      // Create the session
      const { data: session, error: sessionError } = await supabase
        .from('engage_chat_sessions')
        .insert({
          project_id: projectId,
          org_id: project.org_id,
          visitor_id: visitorId,
          session_id: sessionId,
          visitor_name: visitorName,
          visitor_email: visitorEmail,
          visitor_phone: visitorPhone,
          source_url: sourceUrl,
          referrer,
          user_agent: userAgent,
          device_type: deviceType,
          chat_mode: chatConfig.chat_mode,
          status: chatConfig.chat_mode === 'ai' ? 'ai' : 'active'
        })
        .select()
        .single()

      if (sessionError) throw sessionError

      // If there's an initial message, save it
      if (initialMessage) {
        await supabase
          .from('engage_chat_messages')
          .insert({
            session_id: session.id,
            role: 'visitor',
            content: initialMessage
          })

        // Update session message count
        await supabase
          .from('engage_chat_sessions')
          .update({ 
            message_count: 1,
            last_message_at: new Date().toISOString()
          })
          .eq('id', session.id)
      }

      // Track event
      await supabase
        .from('engage_chat_events')
        .insert({
          session_id: session.id,
          project_id: projectId,
          org_id: project.org_id,
          event_type: 'session_started',
          page_url: sourceUrl,
          visitor_id: visitorId,
          metadata: { chat_mode: chatConfig.chat_mode }
        })

      // For live_only mode, immediately create handoff if configured
      if (chatConfig.chat_mode === 'live_only' && visitorName && visitorEmail) {
        const handoffResult = await createHandoff(supabase, session, chatConfig, {
          visitorName,
          visitorEmail,
          visitorPhone,
          initialMessage
        })
        
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            session: { ...session, ...handoffResult },
            handoffCreated: true
          })
        }
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ session })
      }
    }

    // GET: Get session by ID (requires auth for portal, or session token for widget)
    if (event.httpMethod === 'GET') {
      const sessionId = event.queryStringParameters?.sessionId

      if (!sessionId) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Session ID required' })
        }
      }

      const { data: session, error } = await supabase
        .from('engage_chat_sessions')
        .select(`
          *,
          messages:engage_chat_messages(*)
        `)
        .eq('id', sessionId)
        .single()

      if (error || !session) {
        return {
          statusCode: 404,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Session not found' })
        }
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ session })
      }
    }

    // PUT: Update session (handoff, close, etc.)
    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}')
      const { sessionId, action, ...data } = body

      if (!sessionId || !action) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'sessionId and action required' })
        }
      }

      // Get current session
      const { data: session, error: fetchError } = await supabase
        .from('engage_chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (fetchError || !session) {
        return {
          statusCode: 404,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Session not found' })
        }
      }

      // Get chat config
      const { data: chatConfig } = await supabase
        .from('engage_chat_config')
        .select('*')
        .eq('project_id', session.project_id)
        .single()

      switch (action) {
        case 'request_handoff': {
          const { visitorName, visitorEmail, visitorPhone, initialMessage } = data
          
          const handoffResult = await createHandoff(supabase, session, chatConfig, {
            visitorName,
            visitorEmail,
            visitorPhone,
            initialMessage
          })

          return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
              session: { ...session, ...handoffResult },
              handoffCreated: true
            })
          }
        }

        case 'close': {
          const { error } = await supabase
            .from('engage_chat_sessions')
            .update({
              status: 'closed',
              updated_at: new Date().toISOString()
            })
            .eq('id', sessionId)

          if (error) throw error

          // Track event
          await supabase
            .from('engage_chat_events')
            .insert({
              session_id: sessionId,
              project_id: session.project_id,
              org_id: session.org_id,
              event_type: 'session_ended',
              visitor_id: session.visitor_id
            })

          return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({ success: true })
          }
        }

        default:
          return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: `Unknown action: ${action}` })
          }
      }
    }

    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('Engage chat session error:', error)
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message })
    }
  }
}

/**
 * Create handoff - link chat session to message thread
 */
async function createHandoff(supabase, session, chatConfig, visitorInfo) {
  const { visitorName, visitorEmail, visitorPhone, initialMessage } = visitorInfo

  // Determine who to assign to based on routing config
  let assignedTo = null
  
  if (chatConfig.routing_type === 'custom' && chatConfig.custom_assignees?.length > 0) {
    // Use first custom assignee
    assignedTo = chatConfig.custom_assignees[0]
  } else if (chatConfig.routing_type === 'project') {
    // Get first project member
    const { data: members } = await supabase
      .from('project_members')
      .select('contact_id')
      .eq('project_id', session.project_id)
      .limit(1)
    assignedTo = members?.[0]?.contact_id
  } else if (chatConfig.routing_type === 'org') {
    // Get first org admin
    const { data: members } = await supabase
      .from('organization_members')
      .select('contact_id')
      .eq('organization_id', session.org_id)
      .eq('role', 'admin')
      .limit(1)
    assignedTo = members?.[0]?.contact_id
  }

  // Get project info for message
  const { data: project } = await supabase
    .from('projects')
    .select('title')
    .eq('id', session.project_id)
    .single()

  // Create message thread
  const messageBody = session.chat_mode === 'ai' 
    ? `AI Chat Handoff from ${session.source_url || 'website'}\n\n` +
      `Visitor: ${visitorName || 'Unknown'} (${visitorEmail || 'no email'})\n` +
      (visitorPhone ? `Phone: ${visitorPhone}\n` : '') +
      `\nAI Conversation Summary:\n${session.ai_summary || 'No summary available'}`
    : `Live Chat from ${session.source_url || 'website'}\n\n` +
      `Visitor: ${visitorName || 'Unknown'} (${visitorEmail || 'no email'})\n` +
      (visitorPhone ? `Phone: ${visitorPhone}\n` : '') +
      `\nMessage: "${initialMessage || '(No message)'}"`

  const { data: message, error: messageError } = await supabase
    .from('messages')
    .insert({
      project_id: session.project_id,
      sender_id: null, // External visitor
      recipient_id: assignedTo,
      subject: `Chat from ${visitorName || 'Website Visitor'} (${project?.title || 'Unknown Project'})`,
      body: messageBody,
      is_read: false
    })
    .select()
    .single()

  if (messageError) throw messageError

  // Update session with handoff info
  const { error: updateError } = await supabase
    .from('engage_chat_sessions')
    .update({
      visitor_name: visitorName,
      visitor_email: visitorEmail,
      visitor_phone: visitorPhone,
      handoff_requested_at: new Date().toISOString(),
      handoff_completed_at: new Date().toISOString(),
      handoff_message_thread_id: message.id,
      handoff_assigned_to: assignedTo,
      status: 'human',
      updated_at: new Date().toISOString()
    })
    .eq('id', session.id)

  if (updateError) throw updateError

  // Track event
  await supabase
    .from('engage_chat_events')
    .insert({
      session_id: session.id,
      project_id: session.project_id,
      org_id: session.org_id,
      event_type: session.chat_mode === 'ai' ? 'handoff_requested' : 'form_submitted',
      page_url: session.source_url,
      visitor_id: session.visitor_id,
      metadata: { assignedTo, messageThreadId: message.id }
    })

  // Send notification email to assigned user
  if (assignedTo && resend) {
    const { data: assignee } = await supabase
      .from('contacts')
      .select('email, name')
      .eq('id', assignedTo)
      .single()

    if (assignee?.email) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM || 'Uptrade Portal <portal@uptrademedia.com>',
          to: assignee.email,
          subject: `New Chat: ${visitorName || 'Website Visitor'} - ${project?.title || 'Project'}`,
          html: `
            <h2>New Live Chat Request</h2>
            <p><strong>Visitor:</strong> ${visitorName || 'Unknown'}</p>
            <p><strong>Email:</strong> ${visitorEmail || 'Not provided'}</p>
            ${visitorPhone ? `<p><strong>Phone:</strong> ${visitorPhone}</p>` : ''}
            <p><strong>Project:</strong> ${project?.title || 'Unknown'}</p>
            <p><strong>Source:</strong> ${session.source_url || 'Website'}</p>
            ${initialMessage ? `<p><strong>Message:</strong> "${initialMessage}"</p>` : ''}
            <p><a href="${process.env.URL || 'https://portal.uptrademedia.com'}/p/messages/${message.id}">View in Portal →</a></p>
          `
        })
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError)
      }
    }
  }

  return {
    handoff_message_thread_id: message.id,
    handoff_assigned_to: assignedTo,
    status: 'human'
  }
}
