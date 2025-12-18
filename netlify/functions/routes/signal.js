/**
 * Signal Echo Routes
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Echo is the conversational interface to Signal.
 * - Module Echo: Skill-specific, opinionated, action-oriented
 * - Global Echo: Skill-agnostic router, status reporter
 * 
 * Routes:
 * POST /signal/echo/chat          - Send a message (routes automatically)
 * POST /signal/echo/module        - Send to specific skill
 * GET  /signal/conversations      - List user's conversations
 * GET  /signal/conversation/:id   - Get conversation with messages
 * POST /signal/conversation/rate  - Rate a response
 * POST /signal/invoke/:skill/:tool - Direct tool invocation
 */

import { createSupabaseAdmin, getAuthenticatedUser } from '../utils/supabase.js'
import { Signal, Echo, createModuleEcho, createGlobalEcho } from '../utils/signal.js'

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /signal/echo/chat
 * Global Echo - routes to appropriate skill
 */
export async function echoChat(event) {
  const { contact, org, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const { message, conversationId } = JSON.parse(event.body || '{}')
  if (!message) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Message required' }) }
  }

  const supabase = createSupabaseAdmin()
  const echo = createGlobalEcho(supabase, org.id, { userId: contact.id })

  // Continue existing conversation if provided
  if (conversationId) {
    await echo.continueConversation(conversationId)
  }

  const result = await echo.send(message)

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: result.message,
      conversation_id: result.conversation_id,
      skill: result.skill_key,
      model: result.model
    })
  }
}

/**
 * POST /signal/echo/module
 * Module Echo - skill-specific conversation
 */
export async function echoModule(event) {
  const { contact, org, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const { skill, message, conversationId, contextId } = JSON.parse(event.body || '{}')
  
  if (!skill || !message) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Skill and message required' }) }
  }

  // Validate skill exists
  const supabase = createSupabaseAdmin()
  const { data: skillConfig } = await supabase
    .from('signal_skills')
    .select('skill_key')
    .eq('skill_key', skill)
    .eq('is_active', true)
    .single()

  if (!skillConfig) {
    return { statusCode: 400, body: JSON.stringify({ error: `Unknown skill: ${skill}` }) }
  }

  const echo = createModuleEcho(supabase, org.id, skill, { 
    userId: contact.id,
    contextId 
  })

  if (conversationId) {
    await echo.continueConversation(conversationId)
  }

  const result = await echo.send(message)

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: result.message,
      conversation_id: result.conversation_id,
      skill: skill,
      model: result.model
    })
  }
}

/**
 * GET /signal/conversations
 * List user's conversations
 */
export async function listConversations(event) {
  const { contact, org, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const supabase = createSupabaseAdmin()
  const { skill, status, limit = 20 } = event.queryStringParameters || {}

  let query = supabase
    .from('signal_conversations')
    .select('id, skill_key, context_type, context_id, title, summary, message_count, last_message_at, status, created_at')
    .eq('org_id', org.id)
    .eq('user_id', contact.id)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(parseInt(limit))

  if (skill) {
    query = query.eq('skill_key', skill)
  }
  if (status) {
    query = query.eq('status', status)
  }

  const { data: conversations, error } = await query

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ conversations })
  }
}

/**
 * GET /signal/conversation/:id
 * Get conversation with messages
 */
export async function getConversation(event) {
  const { contact, org, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const conversationId = event.path.split('/').pop()
  if (!conversationId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Conversation ID required' }) }
  }

  const supabase = createSupabaseAdmin()

  // Get conversation
  const { data: conversation, error: convError } = await supabase
    .from('signal_conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('org_id', org.id)
    .single()

  if (convError || !conversation) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Conversation not found' }) }
  }

  // Check access
  if (conversation.user_id !== contact.id && contact.role !== 'admin') {
    return { statusCode: 403, body: JSON.stringify({ error: 'Access denied' }) }
  }

  // Get messages
  const { data: messages } = await supabase
    .from('signal_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  return {
    statusCode: 200,
    body: JSON.stringify({ 
      conversation,
      messages: messages || []
    })
  }
}

/**
 * POST /signal/conversation/rate
 * Rate a response
 */
export async function rateResponse(event) {
  const { contact, org, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const { conversationId, rating, feedback } = JSON.parse(event.body || '{}')
  
  if (!conversationId || rating === undefined) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Conversation ID and rating required' }) }
  }

  if (rating < 1 || rating > 5) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Rating must be 1-5' }) }
  }

  const supabase = createSupabaseAdmin()
  const echo = createGlobalEcho(supabase, org.id, { userId: contact.id })
  await echo.continueConversation(conversationId)
  await echo.rate(rating, feedback)

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  }
}

/**
 * POST /signal/invoke/:skill/:tool
 * Direct tool invocation
 */
export async function invokeTool(event) {
  const { contact, org, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  // Extract skill and tool from path: /signal/invoke/{skill}/{tool}
  const pathParts = event.path.split('/').filter(Boolean)
  const invokeIndex = pathParts.indexOf('invoke')
  const skill = pathParts[invokeIndex + 1]
  const tool = pathParts[invokeIndex + 2]

  if (!skill || !tool) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Skill and tool required' }) }
  }

  const params = JSON.parse(event.body || '{}')
  const supabase = createSupabaseAdmin()

  const signal = new Signal(supabase, org.id, { userId: contact.id })

  try {
    const result = await signal.invoke(skill, tool, params, { trackAction: true })
    
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    }
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message })
    }
  }
}

/**
 * GET /signal/skills
 * List available skills
 */
export async function listSkills(event) {
  const { contact, org, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const supabase = createSupabaseAdmin()
  
  const { data: skills, error } = await supabase
    .from('signal_skills')
    .select('skill_key, name, description, allowed_tools, icon, is_active')
    .eq('is_active', true)
    .order('skill_key')

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ skills })
  }
}

/**
 * GET /signal/memory
 * Get relevant memories for the user
 */
export async function getMemory(event) {
  const { contact, org, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const { skill, type, limit = 20 } = event.queryStringParameters || {}
  const supabase = createSupabaseAdmin()

  let query = supabase
    .from('signal_memory')
    .select('*')
    .eq('org_id', org.id)
    .order('importance', { ascending: false })
    .order('last_accessed_at', { ascending: false })
    .limit(parseInt(limit))

  if (skill) {
    query = query.eq('skill_key', skill)
  }
  if (type) {
    query = query.eq('memory_type', type)
  }

  const { data: memories, error } = await query

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ memories })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export default async function handler(event) {
  const path = event.path.replace(/^\/api\/|^\/\.netlify\/functions\/api\//, '')
  const method = event.httpMethod

  // Echo chat routes
  if (path === 'signal/echo/chat' && method === 'POST') {
    return echoChat(event)
  }
  if (path === 'signal/echo/module' && method === 'POST') {
    return echoModule(event)
  }

  // Conversation routes
  if (path === 'signal/conversations' && method === 'GET') {
    return listConversations(event)
  }
  if (path.startsWith('signal/conversation/') && !path.includes('rate') && method === 'GET') {
    return getConversation(event)
  }
  if (path === 'signal/conversation/rate' && method === 'POST') {
    return rateResponse(event)
  }

  // Skill routes
  if (path === 'signal/skills' && method === 'GET') {
    return listSkills(event)
  }

  // Memory routes
  if (path === 'signal/memory' && method === 'GET') {
    return getMemory(event)
  }

  // Tool invocation
  if (path.startsWith('signal/invoke/') && method === 'POST') {
    return invokeTool(event)
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ error: 'Not found', path })
  }
}
