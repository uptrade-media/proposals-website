// netlify/functions/echo-chat.js
// Echo Internal: AI chat endpoint for portal team members (Messages)
// 
// Architecture:
//   Portal Functions = Thin proxy layer (authentication + routing)
//   Signal API = AI brain (OpenAI, tools, knowledge, skills, context)
//   Echo = Conversational interface managed by Signal API
//
// This Echo endpoint proxies to Signal API /echo/chat with full internal access.
// All AI logic (prompts, tools, OpenAI calls) lives in Signal API.

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { SignalAPIClient } from './utils/signal-api-client.js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

// =====================================================
// MAIN HANDLER - Proxy to Signal API
// =====================================================
export async function handler(event) {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS }
  }
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }
  
  try {
    // Authenticate user
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }
    
    // Parse request
    const { 
      message, 
      conversationId,
      projectId,
      skillKey, // Optional: lock to specific skill (module echo)
      history = []
    } = JSON.parse(event.body || '{}')
    
    if (!message) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Message is required' })
      }
    }
    
    // Forward to Signal API
    // Signal API handles:
    // - ECHO_SYSTEM_PROMPT (internal teammate personality)
    // - ECHO_TOOLS (searchKnowledge, getProjectData, getSEOMetrics, etc.)
    // - OpenAI calls with function calling
    // - Tool execution
    // - Knowledge base RAG search
    // - Memory and patterns
    const signal = new SignalAPIClient(contact.org_id, {
      userId: contact.id,
      tenantId: projectId, // Project acts as tenant context
      conversationId
    })
    
    const response = await signal.chat(message, conversationId, skillKey)
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(response)
    }
    
  } catch (error) {
    console.error('[Echo Chat] Error calling Signal API:', error)
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Echo encountered an error',
        details: error.message
      })
    }
  }
}
