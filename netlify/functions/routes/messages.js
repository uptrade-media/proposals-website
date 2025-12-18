// netlify/functions/routes/messages.js
// ═══════════════════════════════════════════════════════════════════════════════
// Messages Routes - Conversations, threads
// ═══════════════════════════════════════════════════════════════════════════════

import { response } from '../api.js'

export async function handle(ctx) {
  const { method, segments, supabase, query, body, contact, orgId } = ctx
  const [, resource, id, action] = segments
  
  switch (resource) {
    case 'conversations':
      return await handleConversations(ctx, id, action)
    case 'threads':
      return await handleThreads(ctx, id)
    case 'send':
      if (method === 'POST') return await sendMessage(ctx)
      break
    case 'mark-read':
      if (method === 'POST') return await markAsRead(ctx)
      break
    default:
      // Default behavior: list messages or get single message
      if (!id) {
        if (method === 'GET') return await listMessages(ctx)
        if (method === 'POST') return await sendMessage(ctx)
      } else {
        if (method === 'GET') return await getMessage(ctx, id)
        if (method === 'DELETE') return await deleteMessage(ctx, id)
      }
  }
  
  return response(405, { error: 'Method not allowed' })
}

async function handleConversations(ctx, conversationId, action) {
  const { method, supabase, query, body, contact, orgId } = ctx
  
  if (action === 'messages') {
    return await getConversationMessages(ctx, conversationId)
  }
  
  if (!conversationId) {
    if (method === 'GET') {
      const { limit = 50 } = query
      
      // Get conversations with last message
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants(
            user:contacts(id, name, avatar)
          ),
          last_message:messages(id, content, created_at, sender:contacts!sender_id(id, name))
        `)
        .eq('org_id', orgId)
        .order('updated_at', { ascending: false })
        .limit(limit)
      
      if (error) return response(500, { error: error.message })
      return response(200, { conversations: data })
    }
    
    if (method === 'POST') {
      const { participantIds, subject, projectId } = body
      
      if (!participantIds?.length) {
        return response(400, { error: 'participantIds are required' })
      }
      
      // Create conversation
      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({
          subject,
          project_id: projectId,
          org_id: orgId,
          created_by: contact.id
        })
        .select()
        .single()
      
      if (error) return response(500, { error: error.message })
      
      // Add participants (including creator)
      const allParticipants = [...new Set([contact.id, ...participantIds])]
      
      await supabase
        .from('conversation_participants')
        .insert(allParticipants.map(userId => ({
          conversation_id: conversation.id,
          user_id: userId
        })))
      
      return response(201, { conversation })
    }
  } else {
    if (method === 'DELETE') {
      const { error } = await supabase.from('conversations').delete().eq('id', conversationId)
      if (error) return response(500, { error: error.message })
      return response(200, { success: true })
    }
  }
  
  return response(405, { error: 'Method not allowed' })
}

async function getConversationMessages(ctx, conversationId) {
  const { supabase, query } = ctx
  const { limit = 50, before } = query
  
  let q = supabase
    .from('messages')
    .select('*, sender:contacts!sender_id(id, name, avatar)')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (before) {
    q = q.lt('created_at', before)
  }
  
  const { data, error } = await q
  
  if (error) return response(500, { error: error.message })
  
  // Return in chronological order
  return response(200, { messages: data?.reverse() || [] })
}

async function handleThreads(ctx, threadId) {
  const { method, supabase, query, body, contact, orgId } = ctx
  
  if (!threadId) {
    if (method === 'GET') {
      // List threads (parent messages with reply counts)
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:contacts!sender_id(id, name, avatar), reply_count')
        .eq('org_id', orgId)
        .is('parent_id', null)
        .order('updated_at', { ascending: false })
        .limit(50)
      
      if (error) return response(500, { error: error.message })
      return response(200, { threads: data })
    }
  } else {
    // Get thread with all replies
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:contacts!sender_id(id, name, avatar)')
      .or(`id.eq.${threadId},parent_id.eq.${threadId}`)
      .order('created_at', { ascending: true })
    
    if (error) return response(500, { error: error.message })
    return response(200, { thread: data })
  }
  
  return response(405, { error: 'Method not allowed' })
}

async function listMessages(ctx) {
  const { supabase, query, orgId, contact } = ctx
  const { conversationId, projectId, limit = 50 } = query
  
  let q = supabase
    .from('messages')
    .select('*, sender:contacts!sender_id(id, name, avatar)')
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (conversationId) q = q.eq('conversation_id', conversationId)
  if (projectId) q = q.eq('project_id', projectId)
  if (orgId) q = q.eq('org_id', orgId)
  
  const { data, error } = await q
  
  if (error) return response(500, { error: error.message })
  return response(200, { messages: data })
}

async function getMessage(ctx, id) {
  const { supabase } = ctx
  
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:contacts!sender_id(id, name, avatar)')
    .eq('id', id)
    .single()
  
  if (error) return response(error.code === 'PGRST116' ? 404 : 500, { error: error.message })
  return response(200, { message: data })
}

async function sendMessage(ctx) {
  const { supabase, body, contact, orgId } = ctx
  const { content, conversationId, projectId, parentId, attachments } = body
  
  if (!content && !attachments?.length) {
    return response(400, { error: 'Content or attachments are required' })
  }
  
  // Create message
  const { data, error } = await supabase
    .from('messages')
    .insert({
      content,
      conversation_id: conversationId,
      project_id: projectId,
      parent_id: parentId,
      sender_id: contact.id,
      org_id: orgId,
      attachments
    })
    .select('*, sender:contacts!sender_id(id, name, avatar)')
    .single()
  
  if (error) return response(500, { error: error.message })
  
  // Update conversation timestamp
  if (conversationId) {
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)
  }
  
  // If this is a reply, update parent's reply count
  if (parentId) {
    await supabase.rpc('increment_reply_count', { message_id: parentId })
  }
  
  // TODO: Send notification to participants
  
  return response(201, { message: data })
}

async function deleteMessage(ctx, id) {
  const { supabase, contact } = ctx
  
  // Only allow deleting own messages
  const { data: msg } = await supabase
    .from('messages')
    .select('sender_id')
    .eq('id', id)
    .single()
  
  if (msg?.sender_id !== contact.id && contact.role !== 'admin') {
    return response(403, { error: 'Cannot delete this message' })
  }
  
  const { error } = await supabase.from('messages').delete().eq('id', id)
  if (error) return response(500, { error: error.message })
  return response(200, { success: true })
}

async function markAsRead(ctx) {
  const { supabase, body, contact } = ctx
  const { messageIds, conversationId } = body
  
  const now = new Date().toISOString()
  
  if (messageIds?.length) {
    await supabase
      .from('messages')
      .update({ read_at: now })
      .in('id', messageIds)
      .is('read_at', null)
  } else if (conversationId) {
    // Mark all messages in conversation as read
    await supabase
      .from('messages')
      .update({ read_at: now })
      .eq('conversation_id', conversationId)
      .neq('sender_id', contact.id)
      .is('read_at', null)
  }
  
  return response(200, { success: true })
}
