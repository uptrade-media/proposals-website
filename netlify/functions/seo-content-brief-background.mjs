/**
 * SEO Content Brief Background Function
 * 
 * Generates AI-powered content briefs using GSC + OpenAI.
 * Background functions can run up to 15 minutes.
 * 
 * Triggered by POST from seo-content-brief.js
 */

import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import OpenAI from 'openai'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const SEO_AI_MODEL = process.env.SEO_AI_MODEL || 'gpt-4o'

export default async function handler(req) {
  console.log('[seo-content-brief-background] Starting...')

  try {
    const { 
      siteId, 
      targetKeyword,
      contentType = 'blog',
      additionalContext = '',
      jobId 
    } = await req.json()

    if (!siteId || !targetKeyword) {
      return new Response(JSON.stringify({ error: 'siteId and targetKeyword required' }), { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Update job status if jobId provided
    if (jobId) {
      await supabase
        .from('seo_background_jobs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', jobId)
    }

    // Fetch site details and knowledge
    const { data: site, error: siteError } = await supabase
      .from('seo_sites')
      .select('*, org:organizations(domain, name)')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      throw new Error('Site not found')
    }

    const { data: knowledge } = await supabase
      .from('seo_knowledge_base')
      .select('*')
      .eq('site_id', siteId)
      .single()

    // Get related keywords from GSC
    console.log('[seo-content-brief-background] Fetching GSC data...')
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
              expression: targetKeyword.split(' ')[0]
            }]
          }]
        }
      })
      relatedKeywords = (response.data.rows || []).map(r => ({
        keyword: r.keys[0],
        position: r.position,
        impressions: r.impressions
      }))
      console.log(`[seo-content-brief-background] Found ${relatedKeywords.length} related keywords`)

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
      console.error('[seo-content-brief-background] GSC error:', e)
    }

    // Get existing pages for internal linking opportunities
    const { data: existingPages } = await supabase
      .from('seo_pages')
      .select('url, title, h1')
      .eq('site_id', siteId)
      .limit(50)

    // Generate brief with AI
    console.log('[seo-content-brief-background] Generating AI brief...')
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
          content: 'You are an expert SEO content strategist. Create comprehensive, actionable content briefs that help writers create high-ranking content.'
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
      console.error('[seo-content-brief-background] Failed to parse AI response:', e)
      throw new Error('Failed to generate content brief')
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
      intent_analysis: brief.intent_analysis,
      outline: brief.outline,
      primary_keyword: brief.primary_keyword,
      secondary_keywords: brief.secondary_keywords,
      lsi_keywords: brief.lsi_keywords,
      internal_links: brief.internal_links,
      cta_suggestions: brief.cta_suggestions,
      faq_suggestions: brief.faq_suggestions,
      differentiation_notes: brief.differentiation_notes,
      competitor_gap_opportunities: brief.competitor_gap_opportunities,
      related_keywords_from_gsc: relatedKeywords.slice(0, 15),
      existing_ranking: existingPageData,
      ai_model: SEO_AI_MODEL,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: savedBrief, error: saveError } = await supabase
      .from('seo_content_briefs')
      .insert(briefData)
      .select()
      .single()

    if (saveError) {
      throw new Error(`Failed to save brief: ${saveError.message}`)
    }

    const result = {
      success: true,
      brief: savedBrief,
      relatedKeywordsFound: relatedKeywords.length,
      hasExistingRanking: !!existingPageData
    }

    console.log('[seo-content-brief-background] Complete')

    // Update job status
    if (jobId) {
      await supabase
        .from('seo_background_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          result
        })
        .eq('id', jobId)
    }

    return new Response(JSON.stringify(result), { status: 200 })

  } catch (error) {
    console.error('[seo-content-brief-background] Error:', error)

    // Update job with error
    try {
      const { jobId } = await req.json().catch(() => ({}))
      if (jobId) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        await supabase
          .from('seo_background_jobs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error: error.message
          })
          .eq('id', jobId)
      }
    } catch (e) {
      // Ignore
    }

    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
