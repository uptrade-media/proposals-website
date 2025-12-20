// netlify/functions/messages-conversations.js
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
      body: JSON.stringify({ error: 'METHOD_NOT_ALLOWED' })
    }
  }

  // Verify authentication using Supabase
  const { user, contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'UNAUTHORIZED' })
    }
  }

  try {
    const userId = contact.id

    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'INVALID_TOKEN' })
      }
    }

    // Get all messages where user is sender or recipient
    const { data: allMessages, error: fetchError } = await supabase
      .from('messages')
      .select(`
        id,
        subject,
        content,
        created_at,
        read_at,
        sender_id,
        recipient_id,
        sender:contacts!messages_sender_id_fkey (id, name, email, company),
        recipient:contacts!messages_recipient_id_fkey (id, name, email, company)
      `)
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (fetchError) {
      throw fetchError
    }

    // Group by conversation partner and get latest message + unread count
    const conversationMap = new Map()
    
    for (const msg of allMessages || []) {
      const partnerId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id
      const partner = msg.sender_id === userId ? msg.recipient : msg.sender
      
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          partnerId,
          partnerName: partner?.name,
          partnerEmail: partner?.email,
          partnerCompany: partner?.company,
          lastMessage: {
            id: msg.id,
            subject: msg.subject,
            content: msg.content,
            createdAt: msg.created_at,
            readAt: msg.read_at,
            isFromMe: msg.sender_id === userId
          },
          unreadCount: 0
        })
      }
      
      // Count unread messages from this partner
      if (msg.recipient_id === userId && !msg.read_at) {
        conversationMap.get(partnerId).unreadCount++
      }
    }

    const conversations = Array.from(conversationMap.values())

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ conversations })
    }
  } catch (error) {
    console.error('[messages-conversations] Error:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message 
      })
    }
  }
}
