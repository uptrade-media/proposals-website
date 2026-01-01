// netlify/functions/signal-profile-extract.js
// Signal Module: Extract business profile from crawled page content
// Uses AI to analyze website content and build business understanding

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
    const { projectId, siteId } = JSON.parse(event.body || '{}')

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

    // Get crawled pages with content
    const { data: pages } = await supabase
      .from('seo_pages')
      .select('url, title, meta_description, h1, content_text')
      .eq('site_id', site.id)
      .not('content_text', 'is', null)
      .order('clicks', { ascending: false })
      .limit(20)

    if (!pages || pages.length === 0) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          message: 'No crawled content available yet',
          extracted: false 
        })
      }
    }

    // Prepare content summary for AI analysis
    const contentSummary = pages.map(p => 
      `Page: ${p.url}\nTitle: ${p.title || 'N/A'}\nH1: ${p.h1 || 'N/A'}\nDescription: ${p.meta_description || 'N/A'}\nContent: ${(p.content_text || '').slice(0, 500)}...`
    ).join('\n\n---\n\n')

    // Use AI to extract business profile
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const completion = await openai.chat.completions.create({
      model: process.env.SEO_AI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a business analyst. Extract business profile information from website content.
Return a JSON object with these fields:
- business_name: string
- business_type: string (e.g., "agency", "e-commerce", "saas", "local service")
- industry: string
- primary_services: string[] (up to 5 main services)
- secondary_services: string[] (up to 5 additional services)
- service_areas: string[] (locations served, if mentioned)
- target_personas: string[] (types of customers they target)
- brand_voice_description: string (describe the tone and style)
- tone_keywords: string[] (e.g., "professional", "friendly", "expert")
- unique_selling_points: string[] (what makes them different)
- site_content_summary: string (2-3 sentence summary)

Only include information that is clearly stated or strongly implied in the content.
Return valid JSON only.`
        },
        {
          role: 'user',
          content: `Analyze this website content and extract the business profile:\n\n${contentSummary}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })

    let profile
    try {
      profile = JSON.parse(completion.choices[0].message.content)
    } catch (parseError) {
      console.error('[Profile Extract] JSON parse error:', parseError)
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Failed to parse AI response' })
      }
    }

    // Upsert to seo_knowledge_base
    const { data: knowledge, error: upsertError } = await supabase
      .from('seo_knowledge_base')
      .upsert({
        site_id: site.id,
        business_name: profile.business_name,
        business_type: profile.business_type,
        industry: profile.industry,
        primary_services: profile.primary_services || [],
        secondary_services: profile.secondary_services || [],
        service_areas: profile.service_areas || [],
        target_personas: profile.target_personas || [],
        brand_voice_description: profile.brand_voice_description,
        tone_keywords: profile.tone_keywords || [],
        unique_selling_points: profile.unique_selling_points || [],
        site_content_summary: profile.site_content_summary,
        pages_analyzed: pages.length,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'site_id'
      })
      .select()
      .single()

    if (upsertError) {
      console.error('[Profile Extract] Upsert error:', upsertError)
      throw upsertError
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        extracted: true,
        profile: knowledge,
        pagesAnalyzed: pages.length
      })
    }

  } catch (error) {
    console.error('[Profile Extract] Error:', error)
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message })
    }
  }
}
