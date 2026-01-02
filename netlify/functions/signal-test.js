// ============================================================================
// DEPRECATED: This function is now redundant - use Signal API directly
// ============================================================================
// Portal now calls Signal API (NestJS) instead of internal Signal implementation.
// This function remains for backward compatibility but should not be used in new code.
//
// Migration:
//   Old: /.netlify/functions/signal-xxx
//   New: Signal API endpoints (see SIGNAL-API-MIGRATION.md)
//
// Signal API Base URL: $SIGNAL_API_URL (http://localhost:3001 or https://signal-api.uptrademedia.com)
// ============================================================================


// netlify/functions/signal-test.js
// Signal Module: Test Signal AI chat functionality
// Sends a test message and returns AI response

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import OpenAI from 'openai'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

export async function handler(event) {
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

  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  try {
    const supabase = createSupabaseAdmin()
    const { projectId, siteId, testMessage } = JSON.parse(event.body || '{}')

    if (!projectId && !siteId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'projectId or siteId is required' })
      }
    }

    // Get SEO site
    let site
    if (siteId) {
      const { data } = await supabase
        .from('seo_sites')
        .select('id, domain, project_id, org_id')
        .eq('id', siteId)
        .single()
      site = data
    } else {
      const { data } = await supabase
        .from('seo_sites')
        .select('id, domain, project_id, org_id')
        .eq('project_id', projectId)
        .single()
      site = data
    }

    if (!site) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'SEO site not found' })
      }
    }

    // Get knowledge base for context
    const { data: knowledge } = await supabase
      .from('seo_knowledge_base')
      .select('*')
      .eq('site_id', site.id)
      .single()

    // Get approved FAQs
    const { data: faqs } = await supabase
      .from('signal_faqs')
      .select('question, answer')
      .eq('project_id', site.project_id || projectId)
      .eq('status', 'approved')
      .limit(10)

    // Build system prompt with business context
    let systemPrompt = `You are Signal, an AI assistant for ${knowledge?.business_name || site.domain}.

## About the Business
`
    if (knowledge) {
      systemPrompt += `- Type: ${knowledge.business_type || 'Business'}\n`
      systemPrompt += `- Industry: ${knowledge.industry || 'General'}\n`
      systemPrompt += `- Services: ${(knowledge.primary_services || []).join(', ')}\n`
      systemPrompt += `- Service Areas: ${(knowledge.service_areas || []).join(', ')}\n`
      systemPrompt += `- Summary: ${knowledge.site_content_summary || ''}\n`
      if (knowledge.brand_voice_description) {
        systemPrompt += `\n## Brand Voice\n${knowledge.brand_voice_description}\n`
      }
    }

    if (faqs && faqs.length > 0) {
      systemPrompt += `\n## Common Questions\n`
      systemPrompt += faqs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')
    }

    systemPrompt += `

## Guidelines
- Be helpful, friendly, and professional
- Keep responses concise (2-3 paragraphs max)
- If you don't know something, offer to connect them with the team
- Never make up information about pricing, availability, or specific details`

    // Default test message
    const message = testMessage || 'What services do you offer?'

    // Generate test response
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const startTime = Date.now()
    const completion = await openai.chat.completions.create({
      model: process.env.SEO_AI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 500
    })
    const responseTime = Date.now() - startTime

    const aiResponse = completion.choices[0].message.content

    // Validate response quality
    const checks = {
      hasResponse: aiResponse && aiResponse.length > 0,
      appropriateLength: aiResponse.length > 50 && aiResponse.length < 2000,
      noHallucination: !aiResponse.toLowerCase().includes('i don\'t have information') || knowledge === null,
      responseTime: responseTime < 5000
    }

    const allPassed = Object.values(checks).every(v => v)

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: allPassed,
        testMessage: message,
        response: aiResponse,
        responseTime,
        checks,
        knowledgeLoaded: !!knowledge,
        faqsLoaded: faqs?.length || 0
      })
    }

  } catch (error) {
    console.error('[Signal Test] Error:', error)
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    }
  }
}
