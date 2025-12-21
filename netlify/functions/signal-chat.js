// netlify/functions/signal-chat.js
// Signal Module: Main AI chat endpoint with streaming
// Implements Three Brains architecture: Base + Tenant + Moment

import { createSupabaseAdmin } from './utils/supabase.js'
import OpenAI from 'openai'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Project-Id, X-Session-Id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive'
}

// =====================================================
// BASE BRAIN: Universal rules, guardrails, formatting
// =====================================================
const BASE_SYSTEM_PROMPT = `You are Signal, an AI assistant helping visitors on behalf of a business. You provide helpful, accurate information based on the knowledge provided to you.

## Core Rules
- Be friendly, professional, and concise
- Only answer questions you have knowledge about
- If unsure, offer to connect them with a human
- Never make up information or prices
- Respect privacy - don't ask for unnecessary personal details
- Guide conversations toward the business's goals (leads, bookings)

## Response Format
- Keep responses under 3 paragraphs unless complex topic
- Use bullet points for lists
- Bold important info like hours, phone numbers
- End with a relevant follow-up question or CTA when appropriate

## Safety
- Never provide medical, legal, or financial advice
- Don't discuss competitors negatively
- Redirect inappropriate questions politely
- Don't reveal internal business operations or pricing strategies`

// =====================================================
// SIGNAL TOOLS: Callable functions for dynamic data
// =====================================================
const SIGNAL_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'searchKnowledge',
      description: 'Search the business knowledge base for detailed information about services, policies, FAQs, etc.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'What to search for' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'createLead',
      description: 'Create a lead/contact after collecting visitor information. Call this when visitor provides contact details.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Visitor name' },
          email: { type: 'string', description: 'Visitor email' },
          phone: { type: 'string', description: 'Visitor phone (optional)' },
          service: { type: 'string', description: 'Service they are interested in' },
          notes: { type: 'string', description: 'Additional context from conversation' }
        },
        required: ['name', 'email']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'escalateToHuman',
      description: 'Connect the visitor with a human team member when they request it or when the query is too complex.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Why escalation is needed' },
          visitorName: { type: 'string', description: 'Visitor name if known' },
          visitorEmail: { type: 'string', description: 'Visitor email if known' },
          conversationSummary: { type: 'string', description: 'Brief summary of conversation so far' }
        },
        required: ['reason']
      }
    }
  }
]

// =====================================================
// TOOL EXECUTION
// =====================================================
async function executeTool(toolName, args, projectId, supabase, openai) {
  const startTime = Date.now()
  
  switch (toolName) {
    case 'searchKnowledge': {
      // Generate query embedding
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: args.query
      })
      
      // Vector search
      const { data: chunks } = await supabase.rpc('match_signal_knowledge', {
        query_embedding: embeddingResponse.data[0].embedding,
        match_threshold: 0.7,
        match_count: 5,
        filter_project_id: projectId
      })

      const result = chunks?.length > 0 
        ? chunks.map(c => `[${c.content_type}] ${c.content}`).join('\n\n')
        : 'No specific information found for this query.'

      return {
        result,
        latency: Date.now() - startTime,
        tokensUsed: chunks?.reduce((sum, c) => sum + (c.token_count || 0), 0) || 0
      }
    }

    case 'createLead': {
      // Get project org
      const { data: project } = await supabase
        .from('projects')
        .select('org_id')
        .eq('id', projectId)
        .single()

      // Create contact
      const { data: lead, error } = await supabase
        .from('contacts')
        .insert({
          org_id: project?.org_id,
          name: args.name,
          email: args.email,
          phone: args.phone || null,
          source: 'signal_chat',
          status: 'lead',
          notes: args.notes ? `Service Interest: ${args.service || 'General'}\n\n${args.notes}` : null
        })
        .select('id')
        .single()

      if (error) {
        return { result: 'Failed to create lead. Please try again.', error: error.message }
      }

      return {
        result: `Lead created successfully. A team member will follow up soon.`,
        leadId: lead.id,
        latency: Date.now() - startTime
      }
    }

    case 'escalateToHuman': {
      // Get project org
      const { data: project } = await supabase
        .from('projects')
        .select('org_id')
        .eq('id', projectId)
        .single()

      // Create message thread for escalation
      const { data: thread, error } = await supabase
        .from('messages')
        .insert({
          org_id: project?.org_id,
          project_id: projectId,
          sender_type: 'visitor',
          sender_name: args.visitorName || 'Website Visitor',
          sender_email: args.visitorEmail || null,
          subject: `Chat Escalation: ${args.reason}`,
          content: args.conversationSummary || 'Visitor requested to speak with a human.',
          status: 'unread',
          source: 'signal_chat'
        })
        .select('id')
        .single()

      return {
        result: 'I\'ve connected you with our team. Someone will respond shortly. Is there anything else I can help with in the meantime?',
        threadId: thread?.id,
        latency: Date.now() - startTime
      }
    }

    default:
      return { result: 'Unknown tool', error: 'Tool not implemented' }
  }
}

// =====================================================
// MAIN HANDLER
// =====================================================
export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  const supabase = createSupabaseAdmin()
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  try {
    const body = JSON.parse(event.body || '{}')
    const { projectId, sessionId, message, history = [] } = body

    if (!projectId || !message) {
      return {
        statusCode: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'projectId and message are required' })
      }
    }

    // =====================================================
    // TENANT BRAIN: Get business context
    // =====================================================
    const { data: businessContext } = await supabase.rpc('get_signal_business_context', {
      p_project_id: projectId
    })

    if (!businessContext) {
      return {
        statusCode: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Signal is not enabled for this project' })
      }
    }

    // Build tenant snapshot prompt
    const tenantPrompt = buildTenantPrompt(businessContext)

    // =====================================================
    // MOMENT BRAIN: Current context
    // =====================================================
    // Initial RAG search for context
    let retrievedContext = ''
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: message
      })

      const { data: chunks } = await supabase.rpc('match_signal_knowledge', {
        query_embedding: embeddingResponse.data[0].embedding,
        match_threshold: 0.7,
        match_count: 5,
        filter_project_id: projectId
      })

      if (chunks?.length > 0) {
        retrievedContext = '\n\n## Relevant Information:\n' + 
          chunks.map(c => `- ${c.content}`).join('\n')
      }
    } catch (ragError) {
      console.error('RAG search failed:', ragError)
    }

    // =====================================================
    // PROMPT ASSEMBLY
    // =====================================================
    const messages = [
      { role: 'system', content: BASE_SYSTEM_PROMPT },
      { role: 'system', content: tenantPrompt + retrievedContext },
      ...history.slice(-10), // Last 10 messages for context
      { role: 'user', content: message }
    ]

    // Get or create conversation
    let conversationId = null
    const { data: existingConv } = await supabase
      .from('signal_widget_conversations')
      .select('id')
      .eq('project_id', projectId)
      .eq('session_id', sessionId)
      .single()

    if (existingConv) {
      conversationId = existingConv.id
    } else {
      const { data: project } = await supabase
        .from('projects')
        .select('org_id')
        .eq('id', projectId)
        .single()

      const { data: newConv } = await supabase
        .from('signal_widget_conversations')
        .insert({
          project_id: projectId,
          org_id: project?.org_id,
          session_id: sessionId,
          status: 'active'
        })
        .select('id')
        .single()
      conversationId = newConv?.id
    }

    // Save user message
    await supabase
      .from('signal_widget_messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content: message
      })

    // =====================================================
    // AI RESPONSE (with tool calling)
    // =====================================================
    const startTime = Date.now()
    
    const completion = await openai.chat.completions.create({
      model: businessContext.ai_model || 'gpt-4o-mini',
      messages,
      tools: SIGNAL_TOOLS,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 1024
    })

    const aiMessage = completion.choices[0].message
    let finalResponse = aiMessage.content || ''
    let toolCalls = null
    let toolResults = null

    // Handle tool calls
    if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
      toolCalls = aiMessage.tool_calls
      toolResults = []

      for (const toolCall of aiMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments)
        const result = await executeTool(
          toolCall.function.name, 
          args, 
          projectId, 
          supabase, 
          openai
        )
        toolResults.push({
          toolCallId: toolCall.id,
          name: toolCall.function.name,
          result
        })
      }

      // Get final response after tool execution
      const toolMessages = [
        ...messages,
        aiMessage,
        ...toolResults.map(r => ({
          role: 'tool',
          tool_call_id: r.toolCallId,
          content: r.result.result
        }))
      ]

      const finalCompletion = await openai.chat.completions.create({
        model: businessContext.ai_model || 'gpt-4o-mini',
        messages: toolMessages,
        temperature: 0.7,
        max_tokens: 1024
      })

      finalResponse = finalCompletion.choices[0].message.content || ''
    }

    const latency = Date.now() - startTime
    const tokensUsed = completion.usage?.total_tokens || 0

    // Save assistant message
    await supabase
      .from('signal_widget_messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: finalResponse,
        tool_calls: toolCalls,
        tool_results: toolResults,
        tokens_used: tokensUsed,
        latency_ms: latency,
        model_used: businessContext.ai_model || 'gpt-4o-mini'
      })

    // Update conversation stats
    await supabase
      .from('signal_widget_conversations')
      .update({
        message_count: supabase.sql`message_count + 2`,
        visitor_message_count: supabase.sql`visitor_message_count + 1`,
        ai_message_count: supabase.sql`ai_message_count + 1`,
        total_tokens_used: supabase.sql`total_tokens_used + ${tokensUsed}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)

    // Audit log
    await supabase
      .from('signal_widget_audit')
      .insert({
        project_id: projectId,
        conversation_id: conversationId,
        session_id: sessionId,
        action: 'chat',
        action_data: {
          hasToolCalls: !!toolCalls,
          tools: toolCalls?.map(t => t.function.name) || []
        },
        duration_ms: latency,
        tokens_used: tokensUsed
      })

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response: finalResponse,
        conversationId,
        toolsUsed: toolCalls?.map(t => t.function.name) || [],
        latency,
        tokensUsed
      })
    }

  } catch (error) {
    console.error('Signal chat error:', error)
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    }
  }
}

// =====================================================
// HELPER: Build tenant prompt from business context
// =====================================================
function buildTenantPrompt(ctx) {
  const parts = []

  if (ctx.business_name) {
    parts.push(`## You are representing: ${ctx.business_name}`)
  }

  if (ctx.brand_voice) {
    parts.push(`\n### Tone & Voice:\n${ctx.brand_voice}`)
  }

  if (ctx.tone_keywords?.length > 0) {
    parts.push(`Be: ${ctx.tone_keywords.join(', ')}`)
  }

  if (ctx.primary_services) {
    const services = Array.isArray(ctx.primary_services) 
      ? ctx.primary_services 
      : Object.values(ctx.primary_services || {})
    if (services.length > 0) {
      parts.push(`\n### Services Offered:\n${services.join(', ')}`)
    }
  }

  if (ctx.service_areas) {
    const areas = Array.isArray(ctx.service_areas) 
      ? ctx.service_areas 
      : Object.values(ctx.service_areas || {})
    if (areas.length > 0) {
      parts.push(`\n### Service Areas:\n${areas.join(', ')}`)
    }
  }

  if (ctx.contact_phone || ctx.contact_email) {
    parts.push(`\n### Contact Info:`)
    if (ctx.contact_phone) parts.push(`Phone: ${ctx.contact_phone}`)
    if (ctx.contact_email) parts.push(`Email: ${ctx.contact_email}`)
  }

  if (ctx.business_hours) {
    parts.push(`\n### Business Hours:\n${JSON.stringify(ctx.business_hours)}`)
  }

  // Widget-specific overrides from profile_snapshot
  const snapshot = ctx.profile_snapshot || {}
  
  if (snapshot.doNotOffer?.length > 0) {
    parts.push(`\n### DO NOT:\n${snapshot.doNotOffer.map(d => `- ${d}`).join('\n')}`)
  }

  if (snapshot.ctaRules?.length > 0) {
    parts.push(`\n### Call-to-Action Rules:\n${snapshot.ctaRules.map(c => `- ${c}`).join('\n')}`)
  }

  if (snapshot.complianceNotes?.length > 0) {
    parts.push(`\n### Compliance:\n${snapshot.complianceNotes.map(c => `- ${c}`).join('\n')}`)
  }

  return parts.join('\n')
}
