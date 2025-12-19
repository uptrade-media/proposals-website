// netlify/functions/seo-pagespeed-background.mjs
// Background function to analyze Core Web Vitals via PageSpeed Insights API
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PSI_API_KEY = process.env.PAGESPEED_API_KEY
const PSI_REQUEST_DELAY_MS = 5000 // 5 seconds between requests

/**
 * Update job status
 */
async function updateJobStatus(jobId, status, data = {}) {
  await supabase
    .from('seo_background_jobs')
    .update({
      status,
      result: data.result || null,
      error: data.error || null,
      progress: data.progress || null,
      completed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId)
}

/**
 * Fetch PageSpeed Insights for a URL
 */
async function fetchPageSpeedInsights(url, strategy = 'mobile') {
  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&key=${PSI_API_KEY}`
  
  try {
    const response = await fetch(apiUrl)
    
    if (!response.ok) {
      const error = await response.text()
      console.error(`[PageSpeed BG] API error for ${url}:`, error)
      return null
    }
    
    const data = await response.json()
    const lighthouse = data.lighthouseResult
    
    if (!lighthouse) return null
    
    // Extract Core Web Vitals
    const audits = lighthouse.audits || {}
    
    const metrics = {
      lcp_ms: audits['largest-contentful-paint']?.numericValue || null,
      fid_ms: audits['max-potential-fid']?.numericValue || null,
      cls: audits['cumulative-layout-shift']?.numericValue || null,
      inp_ms: audits['interaction-to-next-paint']?.numericValue || null,
      fcp_ms: audits['first-contentful-paint']?.numericValue || null,
      ttfb_ms: audits['server-response-time']?.numericValue || null,
      tti_ms: audits['interactive']?.numericValue || null,
      tbt_ms: audits['total-blocking-time']?.numericValue || null,
      speed_index: audits['speed-index']?.numericValue || null
    }
    
    const performanceScore = Math.round((lighthouse.categories?.performance?.score || 0) * 100)
    
    // Extract top issues
    const issues = []
    const opportunityAudits = [
      'render-blocking-resources',
      'unused-javascript',
      'unused-css-rules',
      'unminified-javascript',
      'unminified-css',
      'efficient-animated-content',
      'uses-responsive-images',
      'offscreen-images',
      'uses-optimized-images',
      'uses-webp-images',
      'uses-text-compression',
      'uses-rel-preconnect',
      'server-response-time',
      'redirects',
      'uses-long-cache-ttl',
      'dom-size',
      'critical-request-chains',
      'mainthread-work-breakdown',
      'bootup-time',
      'font-display'
    ]
    
    for (const auditId of opportunityAudits) {
      const audit = audits[auditId]
      if (audit && audit.score !== null && audit.score < 0.9) {
        issues.push({
          id: auditId,
          title: audit.title,
          description: audit.description,
          score: audit.score,
          displayValue: audit.displayValue,
          savings: audit.details?.overallSavingsMs || null,
          hours: estimateFixHours(auditId)
        })
      }
    }
    
    // Sort by potential impact
    issues.sort((a, b) => (b.savings || 0) - (a.savings || 0))
    
    return {
      performanceScore,
      metrics,
      issues: issues.slice(0, 10) // Top 10 issues
    }
    
  } catch (error) {
    console.error(`[PageSpeed BG] Error fetching ${url}:`, error.message)
    return null
  }
}

/**
 * Estimate fix hours based on issue type
 */
function estimateFixHours(auditId) {
  const estimates = {
    'render-blocking-resources': 4,
    'unused-javascript': 8,
    'unused-css-rules': 4,
    'uses-responsive-images': 4,
    'offscreen-images': 2,
    'uses-optimized-images': 2,
    'uses-webp-images': 4,
    'uses-text-compression': 1,
    'server-response-time': 8,
    'uses-long-cache-ttl': 2,
    'dom-size': 16,
    'mainthread-work-breakdown': 16,
    'bootup-time': 8
  }
  return estimates[auditId] || 2
}

/**
 * Calculate speed impact on rankings
 */
function calculateSpeedImpact(psiData, page) {
  const score = psiData.performanceScore
  const position = page.avg_position_28d || 50
  const impressions = page.impressions_28d || 0
  const clicks = page.clicks_28d || 0
  
  // Estimate position improvement if score was 90+
  let estimatedPositionIfFast = position
  if (score < 50) {
    estimatedPositionIfFast = Math.max(1, position - 5)
  } else if (score < 70) {
    estimatedPositionIfFast = Math.max(1, position - 3)
  } else if (score < 90) {
    estimatedPositionIfFast = Math.max(1, position - 1)
  }
  
  // Estimate traffic gain
  const ctr = clicks / Math.max(impressions, 1)
  const potentialCtr = ctr * (1 + (position - estimatedPositionIfFast) * 0.1)
  const potentialGain = Math.round(impressions * (potentialCtr - ctr))
  
  // Priority score (0-100)
  const priorityScore = Math.min(100, Math.round(
    (100 - score) * 0.4 +
    Math.min(50, clicks) * 0.3 +
    (position <= 20 ? 30 : 10)
  ))
  
  return {
    correlation: score < 70 ? 'negative' : score > 90 ? 'positive' : 'neutral',
    estimatedPositionIfFast,
    trafficLost: potentialGain,
    potentialGain,
    priorityScore
  }
}

/**
 * Main handler
 */
export async function handler(event) {
  console.log('[PageSpeed BG] Starting job')
  
  try {
    const body = JSON.parse(event.body || '{}')
    const { jobId, siteId, strategy = 'mobile' } = body
    
    if (!jobId || !siteId) {
      console.error('[PageSpeed BG] Missing jobId or siteId')
      return { statusCode: 400 }
    }
    
    await updateJobStatus(jobId, 'processing', { progress: 5 })
    
    // Get site info
    const { data: site, error: siteError } = await supabase
      .from('seo_sites')
      .select('*')
      .eq('id', siteId)
      .single()
    
    if (siteError || !site) {
      await updateJobStatus(jobId, 'failed', { error: 'Site not found' })
      return { statusCode: 404 }
    }
    
    console.log(`[PageSpeed BG] Analyzing Core Web Vitals for ${site.domain}`)
    
    // Get top pages by traffic
    const { data: pages, error: pagesError } = await supabase
      .from('seo_pages')
      .select('id, url, title, clicks_28d, impressions_28d, avg_position_28d')
      .eq('site_id', siteId)
      .order('clicks_28d', { ascending: false, nullsFirst: false })
      .limit(20) // Top 20 pages
    
    if (pagesError || !pages?.length) {
      await updateJobStatus(jobId, 'completed', { 
        result: { pagesAnalyzed: 0, avgScore: null } 
      })
      return { statusCode: 200 }
    }
    
    console.log(`[PageSpeed BG] Found ${pages.length} pages to analyze`)
    await updateJobStatus(jobId, 'processing', { progress: 10 })
    
    const results = []
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      
      // Update progress (10% to 90%)
      const progress = Math.round(10 + (i / pages.length) * 80)
      if (i % 3 === 0) {
        await updateJobStatus(jobId, 'processing', { progress })
        console.log(`[PageSpeed BG] Progress: ${progress}% (${i + 1}/${pages.length})`)
      }
      
      const psiData = await fetchPageSpeedInsights(page.url, strategy)
      
      if (!psiData) {
        errorCount++
        continue
      }
      
      const impact = calculateSpeedImpact(psiData, page)
      
      const result = {
        site_id: siteId,
        page_id: page.id,
        url: page.url,
        ...psiData.metrics,
        performance_score: psiData.performanceScore,
        mobile_score: strategy === 'mobile' ? psiData.performanceScore : null,
        avg_position: page.avg_position_28d,
        speed_ranking_correlation: impact.correlation,
        estimated_position_if_fast: impact.estimatedPositionIfFast,
        traffic_lost_to_speed: impact.trafficLost,
        potential_traffic_gain: impact.potentialGain,
        priority_score: impact.priorityScore,
        speed_issues: psiData.issues,
        estimated_fix_hours: psiData.issues?.reduce((sum, i) => sum + (i.hours || 0), 0) || 0,
        measured_at: new Date().toISOString()
      }
      
      results.push(result)
      successCount++
      
      // Save to database
      await supabase
        .from('seo_pagespeed_impact')
        .upsert(result, { onConflict: 'page_id' })
      
      // Rate limit between requests
      if (i < pages.length - 1) {
        await new Promise(r => setTimeout(r, PSI_REQUEST_DELAY_MS))
      }
    }
    
    const avgScore = results.length > 0 
      ? Math.round(results.reduce((sum, r) => sum + r.performance_score, 0) / results.length)
      : null
    
    console.log(`[PageSpeed BG] Completed: ${successCount} analyzed, ${errorCount} errors, avg score: ${avgScore}`)
    
    // Complete job
    await updateJobStatus(jobId, 'completed', {
      progress: 100,
      result: {
        pagesAnalyzed: successCount,
        errors: errorCount,
        avgScore,
        poorPerformance: results.filter(r => r.performance_score < 50).length,
        totalPotentialGain: results.reduce((sum, r) => sum + (r.potential_traffic_gain || 0), 0),
        topPriorities: results
          .sort((a, b) => b.priority_score - a.priority_score)
          .slice(0, 5)
          .map(r => ({
            url: r.url,
            score: r.performance_score,
            priorityScore: r.priority_score
          }))
      }
    })
    
    console.log('[PageSpeed BG] Job completed:', jobId)
    return { statusCode: 200 }
    
  } catch (error) {
    console.error('[PageSpeed BG] Error:', error)
    
    try {
      const body = JSON.parse(event.body || '{}')
      if (body.jobId) {
        await updateJobStatus(body.jobId, 'failed', { error: error.message })
      }
    } catch (e) {}
    
    return { statusCode: 500 }
  }
}
