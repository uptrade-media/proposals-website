// netlify/functions/messages-list.js
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from './utils/supabase.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
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
    // Only authenticated users can access messages
    if (contact.role !== 'admin' && contact.role !== 'client') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only authenticated users can access messages' })
      }
    }

    // Parse query parameters
    const queryParams = event.queryStringParameters || {}
    const { projectId, unreadOnly, threadType } = queryParams
    
    // Organization-level filtering (messages are between Uptrade and the org)
    const orgId = event.headers['x-organization-id']

    // Build query for root messages (not replies)
    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:contacts!messages_sender_id_fkey (id, name, email, avatar, is_ai, contact_type),
        recipient:contacts!messages_recipient_id_fkey (id, name, email, avatar, is_ai, contact_type),
        project:projects (id, title)
      `)
      .is('parent_id', null)
      .order('created_at', { ascending: false })

    // Filter based on context
    if (orgId) {
      // Organization context: show messages for this org
      // Check both organization_id (new) and project_id (legacy)
      query = query.or(`organization_id.eq.${orgId},project_id.eq.${orgId}`)
      console.log('[messages-list] Organization context, filtering by organization_id:', orgId)
    } else if (contact.role !== 'admin') {
      // Clients see messages where they are sender or recipient
      query = query.or(`sender_id.eq.${contact.id},recipient_id.eq.${contact.id}`)
    }
    // Admins see all messages (when not in tenant context)
    
    if (projectId && !orgId) {
      // Only apply projectId filter if not already filtered by org context
      query = query.eq('project_id', projectId)
    }
    
    if (unreadOnly === 'true') {
      query = query.is('read_at', null)
    }
    
    // Filter by thread type (e.g., 'echo' for Echo AI messages)
    if (threadType) {
      query = query.eq('thread_type', threadType)
      // For Echo threads, fetch ALL messages (including replies) for the current user
      if (threadType === 'echo') {
        // Remove the parent_id IS NULL filter - we want all messages in Echo threads
        // The filter was applied earlier with .is('parent_id', null)
        // So we need to re-build the query without that filter
        query = supabase
          .from('messages')
          .select(`
            *,
            sender:contacts!messages_sender_id_fkey (id, name, email, avatar, is_ai, contact_type),
            recipient:contacts!messages_recipient_id_fkey (id, name, email, avatar, is_ai, contact_type),
            project:projects (id, title)
          `)
          .eq('thread_type', 'echo')
          .or(`sender_id.eq.${contact.id},recipient_id.eq.${contact.id}`)
          .order('created_at', { ascending: true }) // Chronological for chat view
      }
    }

    const { data: messages, error: fetchError } = await query

    if (fetchError) {
      throw fetchError
    }

    // Get reply counts for each message
    const messageIds = messages.map(m => m.id)
    const { data: replyCounts } = await supabase
      .from('messages')
      .select('parent_id')
      .in('parent_id', messageIds)

    const replyCountMap = {}
    replyCounts?.forEach(r => {
      replyCountMap[r.parent_id] = (replyCountMap[r.parent_id] || 0) + 1
    })

    const messagesWithReplies = messages.map(msg => ({
      id: msg.id,
      subject: msg.subject,
      content: msg.content,
      readAt: msg.read_at,
      createdAt: msg.created_at,
      replyCount: replyCountMap[msg.id] || 0,
      sender: msg.sender,
      recipient: msg.recipient,
      project: msg.project
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        messages: messagesWithReplies,
        total: messagesWithReplies.length
      })
    }

  } catch (error) {
    console.error('Error fetching messages:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch messages',
        message: error.message 
      })
    }
  }
}
