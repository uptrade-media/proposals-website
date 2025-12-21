// netlify/functions/engage-chat-messages.js
// Portal agent API for viewing and replying to chat sessions

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS }
  }

  // Verify authentication
  const { contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  const supabase = createSupabaseAdmin()

  try {
    // GET: List chat sessions or get session messages
    if (event.httpMethod === 'GET') {
      const { sessionId, projectId, status } = event.queryStringParameters || {}
      
      // Get specific session with messages
      if (sessionId) {
        const { data: session, error: sessionError } = await supabase
          .from('engage_chat_sessions')
          .select(`
            *,
            project:projects(id, title),
            messages:engage_chat_messages(
              id, role, content, sender_id, created_at, read_at,
              sender:contacts(id, name, email, avatar)
            )
          `)
          .eq('id', sessionId)
          .single()

        if (sessionError || !session) {
          return {
            statusCode: 404,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Session not found' })
          }
        }

        // Sort messages by created_at
        session.messages = (session.messages || []).sort((a, b) => 
          new Date(a.created_at) - new Date(b.created_at)
        )

        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ session })
        }
      }

      // List sessions for a project
      let query = supabase
        .from('engage_chat_sessions')
        .select(`
          id, visitor_name, visitor_email, status, chat_mode,
          source_url, message_count, last_message_at, created_at,
          project:projects(id, title)
        `)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      if (status) {
        query = query.eq('status', status)
      }

      // Limit to recent sessions
      query = query.limit(50)

      const { data: sessions, error: listError } = await query

      if (listError) throw listError

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ sessions })
      }
    }

    // POST: Send a message as an agent
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const { sessionId, content } = body

      if (!sessionId || !content) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'sessionId and content required' })
        }
      }

      // Verify session exists and agent has access
      const { data: session, error: sessionError } = await supabase
        .from('engage_chat_sessions')
        .select('id, project_id, org_id, status, message_count, first_response_at')
        .eq('id', sessionId)
        .single()

      if (sessionError || !session) {
        return {
          statusCode: 404,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Session not found' })
        }
      }

      // Check if session is closed
      if (session.status === 'closed') {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Cannot send messages to closed session' })
        }
      }

      // Insert message
      const { data: message, error: messageError } = await supabase
        .from('engage_chat_messages')
        .insert({
          session_id: sessionId,
          role: 'agent',
          sender_id: contact.id,
          content
        })
        .select(`
          id, role, content, sender_id, created_at,
          sender:contacts(id, name, email, avatar)
        `)
        .single()

      if (messageError) throw messageError

      // Update session
      const updates = {
        message_count: (session.message_count || 0) + 1,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Track first response time
      if (!session.first_response_at) {
        updates.first_response_at = new Date().toISOString()
      }

      await supabase
        .from('engage_chat_sessions')
        .update(updates)
        .eq('id', sessionId)

      // Track event
      await supabase
        .from('engage_chat_events')
        .insert({
          session_id: sessionId,
          project_id: session.project_id,
          org_id: session.org_id,
          event_type: 'agent_reply',
          metadata: { agentId: contact.id, contentLength: content.length }
        })

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message })
      }
    }

    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('Engage chat messages error:', error)
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message })
    }
  }
}
