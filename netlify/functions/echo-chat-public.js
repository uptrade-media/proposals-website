// netlify/functions/echo-chat-public.js
// Echo Public: AI chat endpoint for tenant websites (Engage widget)
// 
// Architecture:
//   Portal Functions = Thin proxy layer (authentication + routing)
//   Signal API = AI brain (OpenAI, tools, knowledge, embeddings, RAG)
//   Echo = Conversational interface managed by Signal API
//
// This Echo endpoint proxies to Signal API /echo/chat with public-only knowledge access.
// All AI logic (prompts, tools, OpenAI calls, RAG) lives in Signal API.

import { createSupabaseAdmin } from './utils/supabase.js'
import { SignalAPIClient } from './utils/signal-api-client.js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Project-Id, X-Session-Id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

// =====================================================
// MAIN HANDLER - Proxy to Signal API (Public Mode)
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
    const supabase = createSupabaseAdmin()
    
    // Parse request
    const { 
      message, 
      sessionId,
      projectId,
      visitorName,
      visitorEmail
    } = JSON.parse(event.body || '{}')
    
    if (!message || !projectId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Message and projectId are required' })
      }
    }
    
    // Verify project exists and get org_id
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, org_id')
      .eq('id', projectId)
      .single()
    
    if (projectError || !project) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Project not found' })
      }
    }
    
    // Forward to Signal API (public mode - only public knowledge)
    // Signal API handles:
    // - BASE_SYSTEM_PROMPT (public-facing personality)
    // - ECHO_TOOLS (searchKnowledge, createLead, escalateToHuman)
    // - OpenAI calls with function calling
    // - Tool execution (knowledge RAG with public-only filter)
    // - Lead capture
    // - Conversation storage
    const signal = new SignalAPIClient(project.org_id, {
      tenantId: projectId,
      conversationId: sessionId
    })
    
    // Note: Signal API will filter knowledge to public-only based on absence of userId
    const response = await signal.chat(message, sessionId, null)
    
    // Add visitor info to response for lead tracking
    const responseData = {
      ...response,
      visitorInfo: { name: visitorName, email: visitorEmail }
    }
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(responseData)
    }
    
  } catch (error) {
    console.error('[Echo Public] Error calling Signal API:', error)
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
