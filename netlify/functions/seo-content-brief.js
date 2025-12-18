// netlify/functions/seo-content-brief.js
// Generate AI-powered content briefs for SEO
// Creates comprehensive briefs based on keyword analysis and site knowledge
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { google } from 'googleapis'
import OpenAI from 'openai'

// Use env variable for model - easily update when new models release
const SEO_AI_MODEL = process.env.SEO_AI_MODEL || 'gpt-4o'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  // GET - Fetch content briefs
  if (event.httpMethod === 'GET') {
    return await getContentBriefs(event, headers)
  }

  // POST - Generate new content brief
  if (event.httpMethod === 'POST') {
    return await generateContentBrief(event, headers)
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
}

// Get content briefs
async function getContentBriefs(event, headers) {
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const { siteId, status, limit = 20 } = event.queryStringParameters || {}

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
    }

    const supabase = createSupabaseAdmin()

    let query = supabase
      .from('seo_content_briefs')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))

    if (status) {
      query = query.eq('status', status)
    }

    const { data: briefs, error } = await query

    if (error) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ briefs })
    }

  } catch (error) {
    console.error('[Content Brief] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}

// Generate content brief
async function generateContentBrief(event, headers) {
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { 
      siteId, 
      targetKeyword,
      contentType = 'blog', // blog, service_page, landing_page, guide, case_study
      additionalContext = ''
    } = body

    if (!siteId || !targetKeyword) {
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ error: 'siteId and targetKeyword required' }) 
      }
    }

    const supabase = createSupabaseAdmin()

    // Fetch site details and knowledge
    const { data: site, error: siteError } = await supabase
      .from('seo_sites')
      .select('*, org:organizations(domain, name)')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Site not found' }) }
    }

    const { data: knowledge } = await supabase
      .from('seo_knowledge_base')
      .select('*')
      .eq('site_id', siteId)
      .single()

    // Get related keywords from GSC
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}'),
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
    })
    const searchConsole = google.searchconsole({ version: 'v1', auth })
    const domain = site.org?.domain || site.domain
    const siteUrl = `sc-domain:${domain.replace(/^(https?:\/\/)?(www\.)?/, '')}`

    const today = new Date()
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() - 3)
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - 28)

    let relatedKeywords = []
    let existingPageData = null

    try {
      // Find related keywords
      const response = await searchConsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          dimensions: ['query'],
          rowLimit: 50,
          dimensionFilterGroups: [{
            filters: [{
              dimension: 'query',
              operator: 'contains',
              expression: targetKeyword.split(' ')[0] // Search for first word
            }]
          }]
        }
      })
      relatedKeywords = (response.data.rows || []).map(r => ({
        keyword: r.keys[0],
        position: r.position,
        impressions: r.impressions
      }))

      // Check if we already rank for the target keyword
      const targetResponse = await searchConsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          dimensions: ['query', 'page'],
          dimensionFilterGroups: [{
            filters: [{
              dimension: 'query',
              operator: 'equals',
              expression: targetKeyword
            }]
          }]
        }
      })
      
      if (targetResponse.data.rows?.length > 0) {
        const row = targetResponse.data.rows[0]
        existingPageData = {
          url: row.keys[1],
          position: row.position,
          clicks: row.clicks,
          impressions: row.impressions
        }
      }
    } catch (e) {
      console.error('[Content Brief] GSC error:', e)
    }

    // Get existing pages for internal linking opportunities
    const { data: existingPages } = await supabase
      .from('seo_pages')
      .select('url, title, h1')
      .eq('site_id', siteId)
      .limit(50)

    // Generate brief with AI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const contentTypeDescriptions = {
      blog: 'an informative blog post that educates and engages readers',
      service_page: 'a service page that converts visitors into leads',
      landing_page: 'a focused landing page optimized for conversions',
      guide: 'a comprehensive guide that establishes authority',
      case_study: 'a case study that showcases results and builds trust'
    }

    const briefPrompt = `Generate a comprehensive SEO content brief for creating ${contentTypeDescriptions[contentType]}.

BUSINESS CONTEXT:
- Business: ${knowledge?.business_name || site.org?.name || domain}
- Industry: ${knowledge?.industry || 'Not specified'}
- Services: ${knowledge?.services?.join(', ') || 'Not specified'}
- Service Areas: ${knowledge?.service_areas?.join(', ') || 'Not specified'}
- Target Audience: ${knowledge?.target_audience || 'Not specified'}
- USPs: ${knowledge?.unique_selling_points?.join('; ') || 'Not specified'}

TARGET KEYWORD: "${targetKeyword}"

${existingPageData ? `CURRENT RANKING:
We already rank #${existingPageData.position.toFixed(0)} for this keyword at: ${existingPageData.url}
This brief should help improve/update that content.` : 'We do not currently rank for this keyword.'}

RELATED KEYWORDS FROM GSC (consider incorporating):
${relatedKeywords.slice(0, 15).map(k => `- "${k.keyword}" (${k.impressions} impressions, position ${k.position.toFixed(1)})`).join('\n')}

EXISTING PAGES FOR INTERNAL LINKING:
${existingPages?.slice(0, 10).map(p => `- ${p.title || p.url}`).join('\n') || 'None available'}

${additionalContext ? `ADDITIONAL CONTEXT:\n${additionalContext}` : ''}

Create a detailed content brief with:
1. Optimized title tag (60 chars max)
2. Meta description (160 chars max)
3. H1 heading
4. Target word count
5. Search intent analysis
6. Suggested outline with H2/H3 structure
7. Key points to cover for each section
8. Secondary keywords to include naturally
9. Internal linking suggestions
10. Call-to-action recommendations
11. FAQ section suggestions (for featured snippet opportunities)
12. Content differentiation strategies

Return as JSON:
{
  "title_tag": "SEO-optimized title",
  "meta_description": "Compelling meta description",
  "h1": "Main heading",
  "target_word_count": 1500,
  "search_intent": "informational|transactional|navigational|commercial",
  "intent_analysis": "Brief explanation of searcher intent",
  "outline": [
    {
      "type": "h2",
      "text": "Section heading",
      "key_points": ["Point 1", "Point 2"],
      "target_words": 200
    },
    {
      "type": "h3",
      "text": "Subsection heading",
      "key_points": ["Point 1"],
      "target_words": 150
    }
  ],
  "primary_keyword": "target keyword",
  "secondary_keywords": ["keyword 1", "keyword 2"],
  "lsi_keywords": ["related term 1", "related term 2"],
  "internal_links": [
    {
      "anchor_text": "suggested anchor",
      "target_url": "URL to link to",
      "context": "Where in content to place"
    }
  ],
  "cta_suggestions": [
    {
      "type": "primary|secondary",
      "text": "CTA text",
      "placement": "Where to place"
    }
  ],
  "faq_suggestions": [
    {
      "question": "FAQ question",
      "answer_points": ["Key point 1", "Key point 2"]
    }
  ],
  "differentiation_notes": "How to make this content stand out",
  "competitor_gap_opportunities": "Content gaps to exploit"
}`

    const completion = await openai.chat.completions.create({
      model: SEO_AI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an expert SEO content strategist. Create detailed, actionable content briefs that help writers create high-ranking content. Focus on search intent, comprehensiveness, and business goals. Always consider E-E-A-T principles.`
        },
        {
          role: 'user',
          content: briefPrompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4
    })

    let brief
    try {
      brief = JSON.parse(completion.choices[0].message.content)
    } catch (e) {
      console.error('[Content Brief] Failed to parse AI response:', e)
      return { 
        statusCode: 500, 
        headers, 
        body: JSON.stringify({ error: 'Failed to generate brief' }) 
      }
    }

    // Store the brief
    const briefData = {
      site_id: siteId,
      target_keyword: targetKeyword,
      content_type: contentType,
      status: 'draft',
      title_tag: brief.title_tag,
      meta_description: brief.meta_description,
      h1: brief.h1,
      target_word_count: brief.target_word_count,
      search_intent: brief.search_intent,
      brief_content: brief,
      related_keywords: relatedKeywords.slice(0, 20),
      existing_page_url: existingPageData?.url || null,
      existing_position: existingPageData?.position || null,
      created_by: contact.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: savedBrief, error: saveError } = await supabase
      .from('seo_content_briefs')
      .insert(briefData)
      .select()
      .single()

    if (saveError) {
      console.error('[Content Brief] Save error:', saveError)
      // Still return the brief even if save fails
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        brief: savedBrief || briefData,
        content: brief,
        relatedKeywords: relatedKeywords.slice(0, 20),
        existingPageData
      })
    }

  } catch (error) {
    console.error('[Content Brief] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}
