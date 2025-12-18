/**
 * SEO SERP Features Background Function
 * 
 * Analyzes keywords for SERP feature opportunities using AI.
 * Background functions can run up to 15 minutes.
 * 
 * Triggered by POST from seo-serp-features.js
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// SERP feature types we track
const FEATURE_TYPES = [
  'featured_snippet',
  'faq',
  'people_also_ask',
  'local_pack',
  'video',
  'image_pack',
  'knowledge_panel',
  'sitelinks',
  'reviews',
  'how_to'
]

export default async function handler(req) {
  console.log('[seo-serp-features-background] Starting...')

  try {
    const { siteId, keywords: targetKeywords, jobId } = await req.json()

    if (!siteId) {
      return new Response(JSON.stringify({ error: 'siteId required' }), { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // Update job status if jobId provided
    if (jobId) {
      await supabase
        .from('seo_background_jobs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', jobId)
    }

    console.log(`[seo-serp-features-background] Analyzing for site ${siteId}`)

    // Get top keywords to analyze
    let keywords = []
    
    if (targetKeywords?.length > 0) {
      keywords = targetKeywords
    } else {
      const { data } = await supabase
        .from('seo_keyword_universe')
        .select('keyword, search_volume_monthly, current_position, target_page_id, target_page_url, serp_features')
        .eq('site_id', siteId)
        .lte('current_position', 20)
        .order('search_volume_monthly', { ascending: false, nullsFirst: false })
        .limit(100) // Can do more in background

      keywords = data?.map(k => ({
        keyword: k.keyword,
        volume: k.search_volume_monthly,
        position: k.current_position,
        pageId: k.target_page_id,
        pageUrl: k.target_page_url,
        existingFeatures: k.serp_features
      })) || []
    }

    if (keywords.length === 0) {
      throw new Error('No keywords to analyze')
    }

    console.log(`[seo-serp-features-background] Analyzing ${keywords.length} keywords...`)

    // Get pages for context
    const { data: pages } = await supabase
      .from('seo_pages')
      .select('id, url, title, meta_description, content_summary, h1, has_faq_schema, has_how_to_schema')
      .eq('site_id', siteId)

    // Analyze each keyword for SERP feature opportunities
    const opportunities = []

    for (const kw of keywords) {
      const page = pages?.find(p => p.id === kw.pageId || p.url === kw.pageUrl)
      
      // Analyze with AI
      const analysis = await analyzeKeywordForFeatures(openai, kw, page)
      
      if (analysis?.opportunities?.length > 0) {
        for (const opp of analysis.opportunities) {
          opportunities.push({
            site_id: siteId,
            page_id: page?.id,
            keyword: kw.keyword,
            keyword_hash: hashKeyword(kw.keyword),
            search_volume: kw.volume,
            feature_type: opp.type,
            we_have_feature: opp.weHaveIt || false,
            current_owner: opp.currentOwner,
            our_position: kw.position,
            opportunity_score: opp.score,
            win_probability: opp.probability,
            ai_strategy: opp.strategy,
            ai_required_changes: opp.requiredChanges,
            content_requirements: opp.contentRequirements,
            schema_requirements: opp.schemaRequirements,
            questions: opp.questions || [],
            status: opp.weHaveIt ? 'won' : 'opportunity'
          })
        }
      }
    }

    console.log(`[seo-serp-features-background] Found ${opportunities.length} opportunities`)

    // Save to database
    for (const opp of opportunities) {
      await supabase
        .from('seo_serp_features')
        .upsert(opp, {
          onConflict: 'site_id,keyword_hash,feature_type'
        })
    }

    // Update pages with owned features
    const ownedByPage = new Map()
    for (const opp of opportunities.filter(o => o.we_have_feature)) {
      if (opp.page_id) {
        if (!ownedByPage.has(opp.page_id)) {
          ownedByPage.set(opp.page_id, [])
        }
        ownedByPage.get(opp.page_id).push(opp.feature_type)
      }
    }

    for (const [pageId, features] of ownedByPage) {
      await supabase
        .from('seo_pages')
        .update({ serp_features_owned: features })
        .eq('id', pageId)
    }

    const result = {
      success: true,
      analyzed: keywords.length,
      opportunitiesFound: opportunities.length,
      featuredSnippetOpps: opportunities.filter(o => o.feature_type === 'featured_snippet').length,
      faqOpps: opportunities.filter(o => o.feature_type === 'faq' || o.feature_type === 'people_also_ask').length,
      topOpportunities: opportunities
        .filter(o => !o.we_have_feature)
        .sort((a, b) => b.opportunity_score - a.opportunity_score)
        .slice(0, 15)
    }

    console.log('[seo-serp-features-background] Complete')

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
    console.error('[seo-serp-features-background] Error:', error)

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

async function analyzeKeywordForFeatures(openai, keyword, page) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an SEO expert analyzing SERP feature opportunities. Given a keyword and current page content, identify which SERP features we could target.

SERP features to analyze:
- featured_snippet: Definition, list, table, or step-by-step snippets
- faq: FAQ rich results
- people_also_ask: PAA box questions
- video: Video carousels
- how_to: How-to rich results

For each opportunity, assess:
1. If it's likely present in SERP for this query
2. If our current page could win it
3. What changes would be needed
4. Probability of winning (high/medium/low)`
        },
        {
          role: 'user',
          content: `Analyze SERP feature opportunities for:

Keyword: "${keyword.keyword}"
Search Volume: ${keyword.volume || 'unknown'}
Our Position: ${keyword.position || 'not ranking'}

Our Page:
- Title: ${page?.title || 'No page'}
- Description: ${page?.meta_description || 'None'}
- Has FAQ Schema: ${page?.has_faq_schema || false}
- Has How-To Schema: ${page?.has_how_to_schema || false}
- Content Summary: ${page?.content_summary || 'Unknown'}

Respond with JSON:
{
  "opportunities": [
    {
      "type": "featured_snippet|faq|people_also_ask|video|how_to",
      "weHaveIt": false,
      "currentOwner": "competitor.com or null",
      "score": 75,
      "probability": "high|medium|low",
      "strategy": "How to win this feature",
      "requiredChanges": [{"type": "content|schema|structure", "description": "What to do"}],
      "contentRequirements": {"wordCount": 100, "format": "paragraph|list|table"},
      "schemaRequirements": {"type": "FAQPage", "items": 3},
      "questions": ["Question 1", "Question 2"]
    }
  ]
}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })

    return JSON.parse(response.choices[0].message.content)
  } catch (error) {
    console.error('[seo-serp-features-background] AI analysis error:', error)
    return { opportunities: [] }
  }
}

function hashKeyword(keyword) {
  let hash = 0
  for (let i = 0; i < keyword.length; i++) {
    const char = keyword.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}
