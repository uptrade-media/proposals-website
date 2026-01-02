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


// netlify/functions/signal-faq-generate.js
// Signal Module: Auto-generate FAQs from website content
// Uses AI to identify common questions visitors might ask

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
    const { projectId, siteId, count = 10 } = JSON.parse(event.body || '{}')

    if (!projectId && !siteId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'projectId or siteId is required' })
      }
    }

    // Get SEO site and knowledge base
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

    // Get knowledge base info
    const { data: knowledge } = await supabase
      .from('seo_knowledge_base')
      .select('*')
      .eq('site_id', site.id)
      .single()

    // Get top pages for content context
    const { data: pages } = await supabase
      .from('seo_pages')
      .select('url, title, meta_description, h1')
      .eq('site_id', site.id)
      .order('clicks', { ascending: false })
      .limit(20)

    if (!knowledge && (!pages || pages.length === 0)) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          message: 'Not enough content to generate FAQs',
          generated: 0 
        })
      }
    }

    // Get existing FAQs to avoid duplicates
    const { data: existingFaqs } = await supabase
      .from('signal_faqs')
      .select('question')
      .eq('project_id', site.project_id || projectId)

    const existingQuestions = existingFaqs?.map(f => f.question.toLowerCase()) || []

    // Build context for AI
    let context = ''
    if (knowledge) {
      context += `Business: ${knowledge.business_name || 'Unknown'}\n`
      context += `Industry: ${knowledge.industry || 'Unknown'}\n`
      context += `Services: ${(knowledge.primary_services || []).join(', ')}\n`
      context += `Service Areas: ${(knowledge.service_areas || []).join(', ')}\n`
      context += `Summary: ${knowledge.site_content_summary || ''}\n\n`
    }

    if (pages) {
      context += 'Key Pages:\n'
      context += pages.map(p => `- ${p.title}: ${p.meta_description || ''}`).join('\n')
    }

    // Generate FAQs with AI including confidence scores
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const completion = await openai.chat.completions.create({
      model: process.env.SEO_AI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a customer service expert. Generate frequently asked questions that website visitors would likely ask about this business.

For each FAQ, provide:
- question: The question a visitor might ask
- answer: A helpful, accurate answer based on the provided context
- category: One of: general, services, pricing, location, hours, process, support
- priority: 1-10 (10 = most common/important)
- confidence: 1-10 (how confident you are the answer is accurate based on the content)
  - 10: Information is directly stated word-for-word in the content
  - 8-9: Information is clearly stated or strongly implied
  - 6-7: Information can be reasonably inferred
  - 4-5: Educated guess based on context
  - 1-3: Uncertain, definitely needs human review
- source_url: The URL of the page where you found the information (or null if general)
- source_quote: A brief quote from the content that supports this answer (or null if none)

Return a JSON object with an "faqs" array.
Make questions natural and conversational.
Only include information that can be inferred from the context provided.
If pricing or specific details aren't available, provide general guidance or suggest contacting them.
Be conservative with confidence scores - only score 8+ if you're certain the information is accurate.`
        },
        {
          role: 'user',
          content: `Generate ${Math.min(count, 15)} FAQs for this business:\n\n${context}\n\nExisting questions to avoid:\n${existingQuestions.slice(0, 10).join('\n')}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    })

    let result
    try {
      result = JSON.parse(completion.choices[0].message.content)
    } catch (parseError) {
      console.error('[FAQ Generate] JSON parse error:', parseError)
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Failed to parse AI response' })
      }
    }

    const faqs = result.faqs || []
    if (faqs.length === 0) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          message: 'No FAQs generated',
          generated: 0 
        })
      }
    }

    // Get project for org_id
    const { data: project } = await supabase
      .from('projects')
      .select('org_id')
      .eq('id', site.project_id || projectId)
      .single()

    // Insert FAQs with confidence-based auto-approval
    const AUTO_APPROVE_THRESHOLD = 8
    const faqInserts = faqs
      .filter(faq => !existingQuestions.includes(faq.question.toLowerCase()))
      .map(faq => {
        const confidence = faq.confidence || 5
        const shouldAutoApprove = confidence >= AUTO_APPROVE_THRESHOLD
        
        return {
          project_id: site.project_id || projectId,
          org_id: project?.org_id || site.org_id,
          question: faq.question,
          answer: faq.answer,
          category: faq.category || 'general',
          priority: faq.priority || 5,
          confidence: confidence,
          source_url: faq.source_url || null,
          source_quote: faq.source_quote || null,
          status: shouldAutoApprove ? 'approved' : 'pending',
          auto_approved: shouldAutoApprove,
          is_auto_generated: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      })

    if (faqInserts.length === 0) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          message: 'All generated FAQs already exist',
          generated: 0 
        })
      }
    }

    const { data: insertedFaqs, error: insertError } = await supabase
      .from('signal_faqs')
      .insert(faqInserts)
      .select()

    if (insertError) {
      console.error('[FAQ Generate] Insert error:', insertError)
      throw insertError
    }

    // Count auto-approved vs pending
    const autoApprovedCount = insertedFaqs?.filter(f => f.auto_approved).length || 0
    const pendingCount = insertedFaqs?.filter(f => f.status === 'pending').length || 0

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        generated: insertedFaqs?.length || faqInserts.length,
        autoApproved: autoApprovedCount,
        pendingReview: pendingCount,
        faqs: insertedFaqs,
        message: autoApprovedCount > 0 
          ? `${autoApprovedCount} high-confidence FAQs auto-approved, ${pendingCount} pending review`
          : `${pendingCount} FAQs generated and pending review`
      })
    }

  } catch (error) {
    console.error('[FAQ Generate] Error:', error)
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message })
    }
  }
}
