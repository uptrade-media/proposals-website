// netlify/functions/seo-pagespeed-impact.js
// Page Speed Impact Scoring - Correlate Core Web Vitals with rankings
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

// PageSpeed Insights API
const PSI_API_KEY = process.env.PAGESPEED_API_KEY

// Rate limiting settings - PSI API is very restrictive
const PSI_REQUEST_DELAY_MS = 10000 // 10 seconds between requests
const PSI_MAX_RETRIES = 3
const PSI_RETRY_DELAY_MS = 30000 // 30 seconds base for retry (exponential backoff)
const PSI_MAX_PAGES_PER_RUN = 10 // Limit pages per run to avoid timeouts

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
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

  // GET - Get page speed impact data
  if (event.httpMethod === 'GET') {
    return await getSpeedImpact(event, supabase, headers)
  }

  // POST - Analyze page speed and correlate with rankings
  if (event.httpMethod === 'POST') {
    return await analyzeSpeedImpact(event, supabase, headers)
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
}

async function getSpeedImpact(event, supabase, headers) {
  const { siteId, pageId } = event.queryStringParameters || {}

  if (!siteId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
  }

  let query = supabase
    .from('seo_pagespeed_impact')
    .select('*, page:seo_pages(id, url, title)')
    .eq('site_id', siteId)
    .order('priority_score', { ascending: false })
    .limit(50)

  if (pageId) {
    query = query.eq('page_id', pageId)
  }

  const { data, error } = await query

  if (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }

  // Calculate summary
  const summary = {
    pagesAnalyzed: data?.length || 0,
    avgPerformanceScore: Math.round(data?.reduce((sum, d) => sum + (d.performance_score || 0), 0) / (data?.length || 1)),
    pagesBelowThreshold: data?.filter(d => d.performance_score < 50).length || 0,
    potentialTrafficGain: data?.reduce((sum, d) => sum + (d.potential_traffic_gain || 0), 0) || 0,
    criticalIssues: data?.filter(d => d.priority_score >= 80).length || 0
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ pages: data, summary })
  }
}

async function analyzeSpeedImpact(event, supabase, headers) {
  const body = JSON.parse(event.body || '{}')
  const { siteId, pageUrls, strategy = 'mobile' } = body

  if (!siteId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
  }

  console.log(`[PageSpeed Impact] Analyzing for site ${siteId}`)

  // Get pages to analyze
  let pages = []

  if (pageUrls?.length > 0) {
    const { data } = await supabase
      .from('seo_pages')
      .select('id, url, title, clicks_28d, impressions_28d, avg_position_28d')
      .eq('site_id', siteId)
      .in('url', pageUrls)

    pages = data || []
  } else {
    // Get top pages by traffic
    const { data } = await supabase
      .from('seo_pages')
      .select('id, url, title, clicks_28d, impressions_28d, avg_position_28d')
      .eq('site_id', siteId)
      .order('clicks_28d', { ascending: false, nullsFirst: false })
      .limit(20)

    pages = data || []
  }

  if (pages.length === 0) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'No pages to analyze' }) }
  }

  // Limit pages to avoid rate limiting and timeouts
  const pagesToAnalyze = pages.slice(0, PSI_MAX_PAGES_PER_RUN)
  console.log(`[PageSpeed Impact] Analyzing ${pagesToAnalyze.length} of ${pages.length} pages (limited to ${PSI_MAX_PAGES_PER_RUN} per run)`)

  const results = []

  for (let i = 0; i < pagesToAnalyze.length; i++) {
    const page = pagesToAnalyze[i]
    try {
      console.log(`[PageSpeed Impact] Analyzing page ${i + 1}/${pagesToAnalyze.length}: ${page.url}`)
      
      // Fetch PageSpeed Insights with retry logic
      const psiData = await fetchPageSpeedInsights(page.url, strategy)

      if (!psiData) continue

      // Calculate impact
      const impact = calculateSpeedImpact(psiData, page)

      results.push({
        site_id: siteId,
        page_id: page.id,
        url: page.url,
        ...psiData.metrics,
        performance_score: psiData.performanceScore,
        mobile_score: strategy === 'mobile' ? psiData.performanceScore : null,
        keywords_tracked: 1, // Would need to aggregate from keyword data
        avg_position: page.avg_position_28d,
        speed_ranking_correlation: impact.correlation,
        estimated_position_if_fast: impact.estimatedPositionIfFast,
        traffic_lost_to_speed: impact.trafficLost,
        potential_traffic_gain: impact.potentialGain,
        priority_score: impact.priorityScore,
        speed_issues: psiData.issues,
        estimated_fix_hours: psiData.issues?.reduce((sum, i) => sum + (i.hours || 0), 0) || 0,
        measured_at: new Date().toISOString()
      })
    } catch (error) {
      console.error(`[PageSpeed Impact] Error analyzing ${page.url}:`, error)
    }

    // Longer delay between requests to avoid rate limiting
    if (i < pagesToAnalyze.length - 1) {
      console.log(`[PageSpeed Impact] Waiting ${PSI_REQUEST_DELAY_MS / 1000}s before next request...`)
      await new Promise(resolve => setTimeout(resolve, PSI_REQUEST_DELAY_MS))
    }
  }

  // Save to database
  for (const result of results) {
    await supabase
      .from('seo_pagespeed_impact')
      .upsert(result, {
        onConflict: 'page_id'
      })
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      pagesAnalyzed: results.length,
      totalPages: pages.length,
      remainingPages: pages.length - pagesToAnalyze.length,
      avgScore: results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.performance_score, 0) / results.length) : null,
      poorPerformance: results.filter(r => r.performance_score < 50).length,
      totalPotentialGain: results.reduce((sum, r) => sum + (r.potential_traffic_gain || 0), 0),
      topPriorities: results
        .sort((a, b) => b.priority_score - a.priority_score)
        .slice(0, 5)
        .map(r => ({
          url: r.url,
          score: r.performance_score,
          priorityScore: r.priority_score,
          potentialGain: r.potential_traffic_gain,
          topIssues: r.speed_issues?.slice(0, 3)
        }))
    })
  }
}

async function fetchPageSpeedInsights(url, strategy, retryCount = 0) {
  try {
    const apiUrl = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed')
    apiUrl.searchParams.set('url', url)
    apiUrl.searchParams.set('strategy', strategy)
    apiUrl.searchParams.set('category', 'performance')
    
    if (PSI_API_KEY) {
      apiUrl.searchParams.set('key', PSI_API_KEY)
    }

    const response = await fetch(apiUrl.toString())
    
    if (response.status === 429) {
      // Rate limited - retry with exponential backoff
      if (retryCount < PSI_MAX_RETRIES) {
        const delay = PSI_RETRY_DELAY_MS * Math.pow(2, retryCount)
        console.log(`[PageSpeed] Rate limited for ${url}, retrying in ${delay / 1000}s (attempt ${retryCount + 1}/${PSI_MAX_RETRIES})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return fetchPageSpeedInsights(url, strategy, retryCount + 1)
      }
      console.error(`[PageSpeed] Rate limit exceeded for ${url} after ${PSI_MAX_RETRIES} retries`)
      return null
    }
    
    if (!response.ok) {
      console.error(`[PageSpeed] API error for ${url}: ${response.status}`)
      return null
    }

    const data = await response.json()
    const lighthouse = data.lighthouseResult

    if (!lighthouse) return null

    // Extract Core Web Vitals
    const metrics = {
      lcp_ms: Math.round(lighthouse.audits?.['largest-contentful-paint']?.numericValue || 0),
      fid_ms: Math.round(lighthouse.audits?.['max-potential-fid']?.numericValue || 0),
      cls: parseFloat((lighthouse.audits?.['cumulative-layout-shift']?.numericValue || 0).toFixed(3)),
      fcp_ms: Math.round(lighthouse.audits?.['first-contentful-paint']?.numericValue || 0),
      ttfb_ms: Math.round(lighthouse.audits?.['server-response-time']?.numericValue || 0),
      inp_ms: Math.round(lighthouse.audits?.['interaction-to-next-paint']?.numericValue || 0)
    }

    // Get performance score
    const performanceScore = Math.round((lighthouse.categories?.performance?.score || 0) * 100)

    // Extract issues with estimated fix time
    const issues = []
    const opportunities = lighthouse.audits || {}

    // Map audits to issues
    const impactfulAudits = [
      { key: 'render-blocking-resources', name: 'Render-blocking resources', hours: 2 },
      { key: 'unused-javascript', name: 'Unused JavaScript', hours: 3 },
      { key: 'unused-css-rules', name: 'Unused CSS', hours: 2 },
      { key: 'unminified-javascript', name: 'Unminified JavaScript', hours: 1 },
      { key: 'unminified-css', name: 'Unminified CSS', hours: 1 },
      { key: 'uses-responsive-images', name: 'Image sizing', hours: 2 },
      { key: 'offscreen-images', name: 'Offscreen images', hours: 1 },
      { key: 'uses-optimized-images', name: 'Image optimization', hours: 2 },
      { key: 'uses-webp-images', name: 'WebP images', hours: 2 },
      { key: 'uses-text-compression', name: 'Text compression', hours: 1 },
      { key: 'uses-rel-preconnect', name: 'Preconnect hints', hours: 0.5 },
      { key: 'server-response-time', name: 'Server response time', hours: 4 },
      { key: 'largest-contentful-paint-element', name: 'LCP element', hours: 2 }
    ]

    for (const audit of impactfulAudits) {
      const result = opportunities[audit.key]
      if (result && result.score !== null && result.score < 0.9) {
        issues.push({
          issue: audit.name,
          impact: result.score < 0.5 ? 'high' : 'medium',
          savings: result.numericValue ? `${Math.round(result.numericValue)}ms` : null,
          fix: result.title,
          hours: audit.hours,
          effort: audit.hours <= 1 ? 'quick' : audit.hours <= 3 ? 'medium' : 'significant'
        })
      }
    }

    return {
      metrics,
      performanceScore,
      issues: issues.sort((a, b) => (b.impact === 'high' ? 1 : 0) - (a.impact === 'high' ? 1 : 0))
    }
  } catch (error) {
    console.error(`[PageSpeed] Fetch error for ${url}:`, error)
    return null
  }
}

function calculateSpeedImpact(psiData, page) {
  const { performanceScore, metrics } = psiData
  const currentPosition = page.avg_position_28d || 50
  const monthlyClicks = (page.clicks_28d || 0) * (30 / 28)

  // Correlation estimate based on industry data
  // Google uses CWV as ranking signal - faster sites tend to rank higher
  let correlation = 0

  // LCP impact (target: < 2500ms)
  if (metrics.lcp_ms > 4000) correlation -= 0.3
  else if (metrics.lcp_ms > 2500) correlation -= 0.15

  // CLS impact (target: < 0.1)
  if (metrics.cls > 0.25) correlation -= 0.2
  else if (metrics.cls > 0.1) correlation -= 0.1

  // Performance score impact
  if (performanceScore < 50) correlation -= 0.25
  else if (performanceScore < 75) correlation -= 0.1

  // Estimate position improvement if we hit green CWV
  // Rule of thumb: ~2 position improvement for going from poor to good CWV
  let positionImprovement = 0
  if (performanceScore < 50) positionImprovement = 3
  else if (performanceScore < 75) positionImprovement = 1.5
  else if (performanceScore < 90) positionImprovement = 0.5

  const estimatedPositionIfFast = Math.max(1, currentPosition - positionImprovement)

  // Traffic impact estimation
  // CTR increases ~30% for each position improvement in top 10
  const ctrImprovement = positionImprovement * 0.1 // 10% per position
  const potentialGain = Math.round(monthlyClicks * ctrImprovement)
  const trafficLost = Math.round(potentialGain * 0.5) // Conservative estimate

  // Priority score: combines traffic potential with speed issues
  let priorityScore = 0
  priorityScore += (100 - performanceScore) * 0.4 // Low score = high priority
  priorityScore += Math.min(monthlyClicks, 100) * 0.3 // High traffic = high priority
  priorityScore += (positionImprovement * 10) // Improvement potential
  priorityScore = Math.min(100, Math.round(priorityScore))

  return {
    correlation,
    estimatedPositionIfFast,
    trafficLost,
    potentialGain,
    priorityScore
  }
}
