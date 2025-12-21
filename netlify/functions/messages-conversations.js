// netlify/functions/messages-conversations.js
// Returns unified inbox: Echo, Live Chats, and Team conversations
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
    const orgId = contact.org_id

    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'INVALID_TOKEN' })
      }
    }

    // Build unified inbox with three types:
    // 1. Echo (AI teammate)
    // 2. Live chats (Engage widget)
    // 3. Team/Direct conversations
    
    const conversations = []
    
    // =====================================================
    // 1. ECHO - AI Teammate (always first)
    // =====================================================
    const { data: echoContact } = await supabase
      .from('contacts')
      .select('id, name, email, avatar_url')
      .eq('org_id', orgId)
      .eq('is_ai', true)
      .single()
    
    if (echoContact) {
      // Get last Echo message
      const { data: lastEchoMsg } = await supabase
        .from('messages')
        .select('content, created_at')
        .eq('org_id', orgId)
        .eq('thread_type', 'echo')
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      conversations.push({
        id: echoContact.id,
        partner_id: echoContact.id,
        partner_name: 'Echo',
        partner_email: echoContact.email,
        partner_avatar: echoContact.avatar_url || '/echo-avatar.svg',
        thread_type: 'echo',
        thread_source: 'echo',
        is_ai: true,
        is_live_chat: false,
        unread_count: 0,
        latest_message: lastEchoMsg ? {
          content: lastEchoMsg.content,
          created_at: lastEchoMsg.created_at,
          is_from_partner: true
        } : {
          content: 'Your AI teammate - ask me anything!',
          created_at: new Date().toISOString(),
          is_from_partner: true
        }
      })
    }
    
    // =====================================================
    // 2. LIVE CHATS - From Engage widget
    // =====================================================
    const { data: liveChatSessions } = await supabase
      .from('engage_chat_sessions')
      .select(`
        id,
        visitor_name,
        visitor_email,
        visitor_phone,
        source_url,
        status,
        chat_mode,
        message_count,
        last_message_at,
        created_at,
        project:projects(id, title)
      `)
      .eq('org_id', orgId)
      .or(`status.neq.closed,updated_at.gt.${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}`)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (liveChatSessions?.length) {
      for (const session of liveChatSessions) {
        // Get last message for preview
        const { data: lastMsg } = await supabase
          .from('engage_chat_messages')
          .select('content, role, created_at, read_at')
          .eq('session_id', session.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        
        // Count unread visitor messages
        const { count: unreadCount } = await supabase
          .from('engage_chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', session.id)
          .eq('role', 'visitor')
          .is('read_at', null)
        
        conversations.push({
          id: session.id,
          partner_id: session.id,
          partner_name: session.visitor_name || 'Visitor',
          partner_email: session.visitor_email,
          partner_phone: session.visitor_phone,
          partner_avatar: null,
          thread_type: 'live_chat',
          thread_source: 'live_chat',
          is_ai: false,
          is_live_chat: true,
          engage_session_id: session.id,
          chat_status: session.status,
          chat_mode: session.chat_mode,
          source_url: session.source_url,
          project: session.project,
          unread_count: unreadCount || 0,
          latest_message: lastMsg ? {
            content: lastMsg.content,
            created_at: lastMsg.created_at,
            is_from_partner: lastMsg.role === 'visitor'
          } : {
            content: 'New chat session',
            created_at: session.created_at,
            is_from_partner: true
          }
        })
      }
    }
    
    // =====================================================
    // 3. TEAM/DIRECT CONVERSATIONS
    // =====================================================
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
        thread_type,
        thread_source,
        sender:contacts!messages_sender_id_fkey (id, name, email, company, is_ai, avatar_url),
        recipient:contacts!messages_recipient_id_fkey (id, name, email, company, is_ai, avatar_url)
      `)
      .eq('org_id', orgId)
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .neq('thread_type', 'echo') // Exclude Echo messages
      .is('engage_session_id', null) // Exclude live chat messages
      .order('created_at', { ascending: false })
      .limit(100)

    if (fetchError) {
      throw fetchError
    }

    // Group by conversation partner
    const conversationMap = new Map()
    
    for (const msg of allMessages || []) {
      // Skip if partner is Echo
      const partner = msg.sender_id === userId ? msg.recipient : msg.sender
      if (partner?.is_ai) continue
      
      const partnerId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id
      
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          id: msg.id,
          partner_id: partnerId,
          partner_name: partner?.name,
          partner_email: partner?.email,
          partner_company: partner?.company,
          partner_avatar: partner?.avatar_url,
          thread_type: msg.thread_type || 'direct',
          thread_source: msg.thread_source || 'direct',
          is_ai: false,
          is_live_chat: false,
          unread_count: 0,
          latest_message: {
            id: msg.id,
            subject: msg.subject,
            content: msg.content,
            created_at: msg.created_at,
            read_at: msg.read_at,
            is_from_partner: msg.sender_id !== userId
          }
        })
      }
      
      // Count unread messages from this partner
      if (msg.recipient_id === userId && !msg.read_at) {
        conversationMap.get(partnerId).unread_count++
      }
    }

    // Add team conversations to the list
    conversations.push(...Array.from(conversationMap.values()))
    
    // Sort: Echo first, then live chats, then by last message date
    conversations.sort((a, b) => {
      if (a.is_ai && !b.is_ai) return -1
      if (!a.is_ai && b.is_ai) return 1
      if (a.is_live_chat && !b.is_live_chat) return -1
      if (!a.is_live_chat && b.is_live_chat) return 1
      
      const aDate = new Date(a.latest_message?.created_at || 0)
      const bDate = new Date(b.latest_message?.created_at || 0)
      return bDate - aDate
    })

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
