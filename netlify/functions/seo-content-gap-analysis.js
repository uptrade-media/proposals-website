// netlify/functions/seo-content-gap-analysis.js
// Content Gap Analysis - Find missing topics, compare with competitors
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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

  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  const supabase = createSupabaseAdmin()

  // GET - Get content gaps
  if (event.httpMethod === 'GET') {
    return await getContentGaps(event, supabase, headers)
  }

  // POST - Analyze content gaps
  if (event.httpMethod === 'POST') {
    return await analyzeContentGaps(event, supabase, headers)
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
}

async function getContentGaps(event, supabase, headers) {
  const { siteId, status = 'identified', gapType, priority } = event.queryStringParameters || {}

  if (!siteId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
  }

  let query = supabase
    .from('seo_content_gaps')
    .select('*')
    .eq('site_id', siteId)
    .order('ai_importance_score', { ascending: false, nullsFirst: false })
    .limit(100)

  if (status !== 'all') query = query.eq('status', status)
  if (gapType) query = query.eq('gap_type', gapType)
  if (priority) query = query.eq('priority', priority)

  const { data: gaps, error } = await query

  if (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }

  // Get summary
  const summary = {
    total: gaps?.length || 0,
    byType: {
      missing_page: gaps?.filter(g => g.gap_type === 'missing_page').length || 0,
      thin_content: gaps?.filter(g => g.gap_type === 'thin_content').length || 0,
      outdated: gaps?.filter(g => g.gap_type === 'outdated').length || 0,
      competitor_only: gaps?.filter(g => g.gap_type === 'competitor_only').length || 0
    },
    byPriority: {
      critical: gaps?.filter(g => g.priority === 'critical').length || 0,
      high: gaps?.filter(g => g.priority === 'high').length || 0,
      medium: gaps?.filter(g => g.priority === 'medium').length || 0,
      low: gaps?.filter(g => g.priority === 'low').length || 0
    },
    totalTrafficPotential: gaps?.reduce((sum, g) => sum + (g.estimated_traffic_potential || 0), 0) || 0,
    totalSearchVolume: gaps?.reduce((sum, g) => sum + (g.search_volume_total || 0), 0) || 0
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ gaps, summary })
  }
}

async function analyzeContentGaps(event, supabase, headers) {
  const body = JSON.parse(event.body || '{}')
  const { siteId, includeCompetitors = true, focusTopics = [] } = body

  if (!siteId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
  }

  console.log(`[Content Gaps] Analyzing for site ${siteId}`)

  // Get site knowledge base
  const { data: knowledge } = await supabase
    .from('seo_knowledge_base')
    .select('*')
    .eq('site_id', siteId)
    .single()

  // Get existing pages
  const { data: pages } = await supabase
    .from('seo_pages')
    .select('id, url, title, page_type, word_count, clicks_28d, impressions_28d')
    .eq('site_id', siteId)

  // Get keywords we rank for
  const { data: keywords } = await supabase
    .from('seo_keyword_universe')
    .select('keyword, search_volume_monthly, current_position, target_page_url')
    .eq('site_id', siteId)
    .order('search_volume_monthly', { ascending: false, nullsFirst: false })
    .limit(200)

  // Get competitor data
  let competitorData = []
  if (includeCompetitors) {
    const { data: competitors } = await supabase
      .from('seo_competitor_analysis')
      .select('competitor_domain, keyword_gap_data, content_topics, strengths')
      .eq('site_id', siteId)
      .eq('is_active', true)

    competitorData = competitors || []
  }

  // Analyze with AI
  const analysis = await analyzeGapsWithAI({
    knowledge,
    pages: pages || [],
    keywords: keywords || [],
    competitors: competitorData,
    focusTopics
  })

  console.log(`[Content Gaps] Found ${analysis.gaps?.length || 0} gaps`)

  // Save gaps to database
  const savedGaps = []

  for (const gap of analysis.gaps || []) {
    // Check if we already have this gap
    const existingPage = pages?.find(p => 
      p.title?.toLowerCase().includes(gap.topic.toLowerCase()) ||
      p.url?.toLowerCase().includes(gap.topic.split(' ')[0].toLowerCase())
    )

    const { data: saved, error } = await supabase
      .from('seo_content_gaps')
      .upsert({
        site_id: siteId,
        topic: gap.topic,
        keywords: gap.keywords || [],
        search_volume_total: gap.searchVolume || 0,
        gap_type: existingPage ? (gap.isThin ? 'thin_content' : 'outdated') : 'missing_page',
        competitor_coverage: gap.competitorCoverage || [],
        our_coverage: existingPage ? 'partial' : 'none',
        existing_page_id: existingPage?.id,
        ai_importance_score: gap.importanceScore || 50,
        ai_reasoning: gap.reasoning,
        ai_suggested_title: gap.suggestedTitle,
        ai_suggested_url: gap.suggestedUrl,
        ai_suggested_outline: gap.outline || [],
        ai_suggested_word_count: gap.suggestedWordCount || 1500,
        ai_content_type: gap.contentType || 'blog_post',
        ai_suggested_schema: gap.schemaType,
        estimated_traffic_potential: gap.trafficPotential || 0,
        estimated_effort: gap.effort || 'medium',
        priority: gap.priority || 'medium',
        status: 'identified',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'site_id,topic'
      })
      .select()
      .single()

    if (!error && saved) {
      savedGaps.push(saved)
    }
  }

  // Also create AI recommendations for top gaps
  const topGaps = savedGaps
    .sort((a, b) => (b.ai_importance_score || 0) - (a.ai_importance_score || 0))
    .slice(0, 10)

  for (const gap of topGaps) {
    await supabase
      .from('seo_ai_recommendations')
      .upsert({
        site_id: siteId,
        category: 'content',
        subcategory: 'content_gap',
        priority: gap.priority,
        title: `Create: ${gap.ai_suggested_title || gap.topic}`,
        description: gap.ai_reasoning,
        suggested_value: gap.ai_suggested_url,
        ai_reasoning: gap.ai_reasoning,
        ai_confidence: 0.8,
        predicted_impact: {
          metric: 'traffic',
          predicted: gap.estimated_traffic_potential
        },
        estimated_traffic_gain: gap.estimated_traffic_potential,
        effort: gap.estimated_effort,
        auto_fixable: false,
        one_click_fixable: false,
        status: 'pending',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'site_id,title'
      })
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      gapsFound: savedGaps.length,
      byType: {
        missingPage: savedGaps.filter(g => g.gap_type === 'missing_page').length,
        thinContent: savedGaps.filter(g => g.gap_type === 'thin_content').length,
        outdated: savedGaps.filter(g => g.gap_type === 'outdated').length
      },
      totalTrafficPotential: savedGaps.reduce((sum, g) => sum + (g.estimated_traffic_potential || 0), 0),
      topOpportunities: topGaps.map(g => ({
        topic: g.topic,
        suggestedTitle: g.ai_suggested_title,
        contentType: g.ai_content_type,
        trafficPotential: g.estimated_traffic_potential,
        priority: g.priority,
        effort: g.estimated_effort
      }))
    })
  }
}

async function analyzeGapsWithAI({ knowledge, pages, keywords, competitors, focusTopics }) {
  try {
    // Build context
    const ourTopics = pages.map(p => p.title).filter(Boolean)
    const ourKeywords = keywords.map(k => k.keyword)
    
    const competitorKeywords = competitors.flatMap(c => 
      (c.keyword_gap_data || []).map(k => k.keyword || k)
    )
    
    const competitorTopics = competitors.flatMap(c => c.content_topics || [])

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an SEO content strategist analyzing content gaps. Identify topics and keywords that are:
1. Covered by competitors but not by us
2. Important for the industry but missing from our site
3. Related to our services but not addressed
4. Questions our target audience is asking

For each gap, assess:
- Search volume potential
- Competition level
- Relevance to business
- Content type needed
- Priority level`
        },
        {
          role: 'user',
          content: `Analyze content gaps for this business:

Business: ${knowledge?.business_name || 'Unknown'}
Industry: ${knowledge?.industry || 'general'}
Services: ${JSON.stringify(knowledge?.primary_services || [])}
Target Audience: ${JSON.stringify(knowledge?.target_personas || [])}

Our Current Topics (${ourTopics.length} pages):
${ourTopics.slice(0, 30).join('\n')}

Our Keywords (${ourKeywords.length} keywords):
${ourKeywords.slice(0, 50).join(', ')}

Competitor Topics:
${competitorTopics.slice(0, 50).join(', ')}

Competitor Keywords We Don't Rank For:
${competitorKeywords.slice(0, 50).join(', ')}

${focusTopics.length > 0 ? `Focus on these topics: ${focusTopics.join(', ')}` : ''}

Identify 10-20 content gaps. Respond with JSON:
{
  "gaps": [
    {
      "topic": "Topic name",
      "keywords": ["keyword1", "keyword2"],
      "searchVolume": 1500,
      "competitorCoverage": [{"domain": "competitor.com", "url": "/their-page"}],
      "importanceScore": 85,
      "reasoning": "Why this is important",
      "suggestedTitle": "Suggested page title",
      "suggestedUrl": "/suggested-url/",
      "outline": ["Section 1", "Section 2"],
      "suggestedWordCount": 2000,
      "contentType": "service_page|blog_post|guide|faq|location",
      "schemaType": "Article|FAQPage|Service",
      "trafficPotential": 200,
      "effort": "quick|medium|significant",
      "priority": "critical|high|medium|low"
    }
  ]
}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4
    })

    return JSON.parse(response.choices[0].message.content)
  } catch (error) {
    console.error('[Content Gaps] AI analysis error:', error)
    return { gaps: [] }
  }
}
