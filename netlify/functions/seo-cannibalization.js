// netlify/functions/seo-cannibalization.js
// Detect keyword cannibalization - multiple pages competing for same keyword
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

  // GET - List cannibalization issues
  if (event.httpMethod === 'GET') {
    return await getCannibalizationIssues(event, supabase, headers)
  }

  // POST - Detect cannibalization
  if (event.httpMethod === 'POST') {
    return await detectCannibalization(event, supabase, headers)
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
}

async function getCannibalizationIssues(event, supabase, headers) {
  const { siteId, status = 'detected', severity } = event.queryStringParameters || {}

  if (!siteId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
  }

  let query = supabase
    .from('seo_cannibalization')
    .select('*')
    .eq('site_id', siteId)
    .eq('status', status)
    .order('estimated_traffic_loss', { ascending: false, nullsFirst: false })
    .limit(50)

  if (severity) {
    query = query.eq('severity', severity)
  }

  const { data, error } = await query

  if (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }

  // Get summary stats
  const { data: stats } = await supabase
    .from('seo_cannibalization')
    .select('severity, status')
    .eq('site_id', siteId)

  const summary = {
    total: stats?.length || 0,
    critical: stats?.filter(s => s.severity === 'critical' && s.status === 'detected').length || 0,
    high: stats?.filter(s => s.severity === 'high' && s.status === 'detected').length || 0,
    medium: stats?.filter(s => s.severity === 'medium' && s.status === 'detected').length || 0,
    resolved: stats?.filter(s => s.status === 'resolved').length || 0
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ issues: data, summary })
  }
}

async function detectCannibalization(event, supabase, headers) {
  const body = JSON.parse(event.body || '{}')
  const { siteId, minImpressions = 100, force = false } = body

  if (!siteId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
  }

  console.log(`[Cannibalization] Starting detection for site ${siteId}`)

  // Get all pages with their keyword data from GSC
  const { data: pages, error: pagesError } = await supabase
    .from('seo_pages')
    .select('id, url, title, meta_description, clicks_28d, impressions_28d, avg_position_28d, top_queries')
    .eq('site_id', siteId)
    .gt('impressions_28d', 0)

  if (pagesError) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: pagesError.message }) }
  }

  // Get query-level data from seo_queries if available
  const { data: queries } = await supabase
    .from('seo_queries')
    .select('query, page_url, clicks, impressions, position')
    .eq('site_id', siteId)
    .gt('impressions', minImpressions)

  // Build keyword-to-pages mapping
  const keywordPageMap = new Map()

  // From seo_queries (more accurate)
  if (queries?.length > 0) {
    for (const q of queries) {
      const keyword = q.query.toLowerCase().trim()
      if (!keywordPageMap.has(keyword)) {
        keywordPageMap.set(keyword, [])
      }
      keywordPageMap.get(keyword).push({
        url: q.page_url,
        page_id: pages.find(p => p.url === q.page_url)?.id,
        title: pages.find(p => p.url === q.page_url)?.title,
        position: q.position,
        impressions: q.impressions,
        clicks: q.clicks,
        ctr: q.clicks / q.impressions
      })
    }
  } else {
    // Fallback: use top_queries from pages
    for (const page of pages) {
      const topQueries = page.top_queries || []
      for (const query of topQueries) {
        const keyword = (typeof query === 'string' ? query : query.query || '').toLowerCase().trim()
        if (!keyword) continue
        
        if (!keywordPageMap.has(keyword)) {
          keywordPageMap.set(keyword, [])
        }
        keywordPageMap.get(keyword).push({
          url: page.url,
          page_id: page.id,
          title: page.title,
          position: query.position || page.avg_position_28d,
          impressions: query.impressions || page.impressions_28d,
          clicks: query.clicks || page.clicks_28d,
          ctr: query.ctr || (page.clicks_28d / page.impressions_28d)
        })
      }
    }
  }

  // Find keywords with multiple ranking pages
  const cannibalizationIssues = []

  for (const [keyword, rankingPages] of keywordPageMap) {
    // Skip if only one page ranks
    if (rankingPages.length < 2) continue

    // Skip if total impressions too low
    const totalImpressions = rankingPages.reduce((sum, p) => sum + (p.impressions || 0), 0)
    if (totalImpressions < minImpressions) continue

    // Calculate metrics
    const positions = rankingPages.map(p => p.position).filter(Boolean)
    const positionVariance = positions.length > 1 
      ? Math.sqrt(positions.reduce((sum, p) => sum + Math.pow(p - (positions.reduce((s, v) => s + v, 0) / positions.length), 2), 0) / positions.length)
      : 0

    // Estimate CTR loss (consolidated ranking typically has better CTR)
    const totalClicks = rankingPages.reduce((sum, p) => sum + (p.clicks || 0), 0)
    const bestPosition = Math.min(...positions)
    const expectedCtr = getExpectedCtr(bestPosition)
    const expectedClicks = totalImpressions * expectedCtr
    const ctrLoss = Math.max(0, (expectedClicks - totalClicks) / totalImpressions)

    // Determine severity
    let severity = 'low'
    if (ctrLoss > 0.03 || rankingPages.length > 3) severity = 'critical'
    else if (ctrLoss > 0.02 || rankingPages.length > 2) severity = 'high'
    else if (ctrLoss > 0.01) severity = 'medium'

    // Find the best performing page
    const bestPage = rankingPages.reduce((best, page) => {
      const score = (page.clicks || 0) * 2 + (page.impressions || 0) * 0.1 - (page.position || 100)
      const bestScore = (best.clicks || 0) * 2 + (best.impressions || 0) * 0.1 - (best.position || 100)
      return score > bestScore ? page : best
    }, rankingPages[0])

    cannibalizationIssues.push({
      keyword,
      keyword_hash: hashKeyword(keyword),
      competing_pages: rankingPages.sort((a, b) => (a.position || 100) - (b.position || 100)),
      page_count: rankingPages.length,
      total_impressions: totalImpressions,
      total_clicks: totalClicks,
      position_variance: positionVariance,
      ctr_loss_estimate: ctrLoss,
      estimated_traffic_loss: Math.round((expectedClicks - totalClicks) * 30), // Monthly
      severity,
      recommended_primary_page_id: bestPage.page_id,
      recommended_primary_url: bestPage.url
    })
  }

  console.log(`[Cannibalization] Found ${cannibalizationIssues.length} issues`)

  // Get AI recommendations for top issues
  const topIssues = cannibalizationIssues
    .sort((a, b) => (b.estimated_traffic_loss || 0) - (a.estimated_traffic_loss || 0))
    .slice(0, 20)

  if (topIssues.length > 0) {
    const aiRecommendations = await getAiRecommendations(topIssues, pages)
    
    // Merge AI recommendations
    for (const issue of topIssues) {
      const aiRec = aiRecommendations.find(r => r.keyword === issue.keyword)
      if (aiRec) {
        issue.ai_strategy = aiRec.strategy
        issue.ai_reasoning = aiRec.reasoning
        issue.ai_action_steps = aiRec.action_steps
      }
    }
  }

  // Upsert to database
  for (const issue of cannibalizationIssues) {
    const { error } = await supabase
      .from('seo_cannibalization')
      .upsert({
        site_id: siteId,
        ...issue,
        status: 'detected',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'site_id,keyword_hash'
      })
    
    if (error) {
      console.error(`[Cannibalization] Failed to save issue for ${issue.keyword}:`, error)
    }
  }

  // Mark pages with cannibalization risk
  const affectedPageIds = [...new Set(cannibalizationIssues.flatMap(i => 
    i.competing_pages.map(p => p.page_id).filter(Boolean)
  ))]

  if (affectedPageIds.length > 0) {
    await supabase
      .from('seo_pages')
      .update({ cannibalization_risk: true })
      .in('id', affectedPageIds)
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      issuesFound: cannibalizationIssues.length,
      criticalIssues: cannibalizationIssues.filter(i => i.severity === 'critical').length,
      highIssues: cannibalizationIssues.filter(i => i.severity === 'high').length,
      estimatedMonthlyTrafficLoss: cannibalizationIssues.reduce((sum, i) => sum + (i.estimated_traffic_loss || 0), 0),
      topIssues: topIssues.slice(0, 10)
    })
  }
}

// Expected CTR by position (industry averages)
function getExpectedCtr(position) {
  const ctrByPosition = {
    1: 0.316,
    2: 0.158,
    3: 0.107,
    4: 0.076,
    5: 0.058,
    6: 0.045,
    7: 0.036,
    8: 0.030,
    9: 0.025,
    10: 0.022
  }
  return ctrByPosition[Math.round(position)] || 0.01
}

function hashKeyword(keyword) {
  // Simple hash for deduplication
  let hash = 0
  for (let i = 0; i < keyword.length; i++) {
    const char = keyword.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}

async function getAiRecommendations(issues, pages) {
  try {
    const issueDescriptions = issues.map(issue => ({
      keyword: issue.keyword,
      pages: issue.competing_pages.map(p => ({
        url: p.url,
        title: p.title,
        position: p.position,
        clicks: p.clicks
      }))
    }))

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an SEO expert analyzing keyword cannibalization issues. For each issue, recommend a strategy:
- consolidate: Merge content into one page, redirect others
- differentiate: Make each page target distinct long-tail variations  
- canonicalize: Use canonical tags to signal preferred page
- deindex: Remove weaker page from index

Provide actionable steps. Be specific about which page should be primary.`
        },
        {
          role: 'user',
          content: `Analyze these cannibalization issues and recommend strategies:\n\n${JSON.stringify(issueDescriptions, null, 2)}\n\nRespond with JSON array: [{keyword, strategy, reasoning, action_steps: []}]`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })

    const result = JSON.parse(response.choices[0].message.content)
    return result.recommendations || result.issues || []
  } catch (error) {
    console.error('[Cannibalization] AI recommendation error:', error)
    return []
  }
}
