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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    const { projectId, unreadOnly } = queryParams

    // Build query for root messages (not replies)
    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:contacts!messages_sender_id_fkey (id, name, email, avatar),
        recipient:contacts!messages_recipient_id_fkey (id, name, email, avatar),
        project:projects (id, title)
      `)
      .is('parent_id', null)
      .order('created_at', { ascending: false })

    // Filter by user role
    if (contact.role !== 'admin') {
      // Clients see messages where they are sender or recipient
      query = query.or(`sender_id.eq.${contact.id},recipient_id.eq.${contact.id}`)
    }
    
    if (projectId) {
      query = query.eq('project_id', projectId)
    }
    
    if (unreadOnly === 'true') {
      query = query.is('read_at', null)
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
