// netlify/functions/seo-serp-features.js
// SERP Feature Opportunities - Target featured snippets, FAQs, PAA
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  const { user, error: authError } = await getAuthenticatedUser(event)
  if (authError || !user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  const supabase = createSupabaseAdmin()

  // GET - List SERP feature opportunities
  if (event.httpMethod === 'GET') {
    return await getOpportunities(event, supabase, headers)
  }

  // POST - Analyze SERP features
  if (event.httpMethod === 'POST') {
    return await analyzeFeatures(event, supabase, headers)
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
}

async function getOpportunities(event, supabase, headers) {
  const { siteId, featureType, status, pageId } = event.queryStringParameters || {}

  if (!siteId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
  }

  let query = supabase
    .from('seo_serp_features')
    .select('*, page:seo_pages(id, url, title)')
    .eq('site_id', siteId)
    .order('opportunity_score', { ascending: false })
    .limit(100)

  if (featureType) query = query.eq('feature_type', featureType)
  if (status) query = query.eq('status', status)
  if (pageId) query = query.eq('page_id', pageId)

  const { data, error } = await query

  if (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }

  // Group by feature type for summary
  const byType = {}
  for (const type of FEATURE_TYPES) {
    byType[type] = {
      total: data?.filter(d => d.feature_type === type).length || 0,
      owned: data?.filter(d => d.feature_type === type && d.we_have_feature).length || 0,
      opportunities: data?.filter(d => d.feature_type === type && !d.we_have_feature && d.opportunity_score > 50).length || 0
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      opportunities: data,
      summary: {
        total: data?.length || 0,
        owned: data?.filter(d => d.we_have_feature).length || 0,
        highOpportunity: data?.filter(d => d.opportunity_score >= 70).length || 0,
        byType
      }
    })
  }
}

async function analyzeFeatures(event, supabase, headers) {
  const body = JSON.parse(event.body || '{}')
  const { siteId, keywords: targetKeywords } = body

  if (!siteId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
  }

  console.log(`[SERP Features] Analyzing for site ${siteId}`)

  // Get top keywords to analyze
  let keywords = []
  
  if (targetKeywords?.length > 0) {
    keywords = targetKeywords
  } else {
    // Get top performing keywords from keyword universe
    const { data } = await supabase
      .from('seo_keyword_universe')
      .select('keyword, search_volume_monthly, current_position, target_page_id, target_page_url, serp_features')
      .eq('site_id', siteId)
      .lte('current_position', 20) // We rank in top 20
      .order('search_volume_monthly', { ascending: false, nullsFirst: false })
      .limit(50)

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
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'No keywords to analyze' }) }
  }

  // Get pages for context
  const { data: pages } = await supabase
    .from('seo_pages')
    .select('id, url, title, meta_description, content_summary, h1, has_faq_schema, has_how_to_schema')
    .eq('site_id', siteId)

  // Analyze each keyword for SERP feature opportunities
  const opportunities = []

  for (const kw of keywords.slice(0, 30)) { // Limit to prevent timeout
    const page = pages?.find(p => p.id === kw.pageId || p.url === kw.pageUrl)
    
    // Analyze with AI
    const analysis = await analyzeKeywordForFeatures(kw, page)
    
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

  console.log(`[SERP Features] Found ${opportunities.length} opportunities`)

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

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      analyzed: keywords.length,
      opportunitiesFound: opportunities.length,
      featuredSnippetOpps: opportunities.filter(o => o.feature_type === 'featured_snippet').length,
      faqOpps: opportunities.filter(o => o.feature_type === 'faq' || o.feature_type === 'people_also_ask').length,
      topOpportunities: opportunities
        .filter(o => !o.we_have_feature)
        .sort((a, b) => b.opportunity_score - a.opportunity_score)
        .slice(0, 10)
    })
  }
}

async function analyzeKeywordForFeatures(keyword, page) {
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
    console.error('[SERP Features] AI analysis error:', error)
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
