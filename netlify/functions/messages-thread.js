// netlify/functions/messages-thread.js
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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
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

  // Get message ID from path
  const messageId = event.path.split('/').filter(p => p).pop()
  if (!messageId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Message ID required' })
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
    // Only authenticated users can access message threads
    if (contact.role !== 'admin' && contact.role !== 'client') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only authenticated users can access message threads' })
      }
    }

    // Fetch root message
    const { data: rootMessage, error: fetchError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:contacts!messages_sender_id_fkey (id, name, email, avatar),
        recipient:contacts!messages_recipient_id_fkey (id, name, email, avatar),
        project:projects (id, title)
      `)
      .eq('id', messageId)
      .single()

    if (fetchError || !rootMessage) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Message not found' })
      }
    }

    // Check authorization
    // User must be sender or recipient
    if (contact.role !== 'admin' && 
        rootMessage.sender_id !== contact.id && 
        rootMessage.recipient_id !== contact.id) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Not authorized to view this thread' })
      }
    }

    // If this is a reply, fetch the root message
    let threadRoot = rootMessage
    if (rootMessage.parent_id) {
      const { data: parent } = await supabase
        .from('messages')
        .select(`
          *,
          sender:contacts!messages_sender_id_fkey (id, name, email, avatar),
          recipient:contacts!messages_recipient_id_fkey (id, name, email, avatar),
          project:projects (id, title)
        `)
        .eq('id', rootMessage.parent_id)
        .single()
      
      if (parent) {
        threadRoot = parent
      }
    }

    // Fetch all replies to the root message
    const { data: replies } = await supabase
      .from('messages')
      .select(`
        *,
        sender:contacts!messages_sender_id_fkey (id, name, email, avatar),
        recipient:contacts!messages_recipient_id_fkey (id, name, email, avatar)
      `)
      .eq('parent_id', threadRoot.id)
      .order('created_at', { ascending: false })

    // Format thread
    const thread = {
      root: {
        id: threadRoot.id,
        senderId: threadRoot.sender_id,
        recipientId: threadRoot.recipient_id,
        subject: threadRoot.subject,
        content: threadRoot.content,
        readAt: threadRoot.read_at,
        createdAt: threadRoot.created_at,
        sender: threadRoot.sender,
        recipient: threadRoot.recipient,
        project: threadRoot.project
      },
      replies: (replies || []).map(r => ({
        id: r.id,
        senderId: r.sender_id,
        recipientId: r.recipient_id,
        subject: r.subject,
        content: r.content,
        readAt: r.read_at,
        createdAt: r.created_at,
        sender: r.sender,
        recipient: r.recipient
      })),
      totalMessages: 1 + (replies?.length || 0)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ thread })
    }

  } catch (error) {
    console.error('Error fetching message thread:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch message thread',
        message: error.message 
      })
    }
  }
}
