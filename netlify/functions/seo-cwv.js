/**
 * SEO Core Web Vitals - Track and store CWV history
 * 
 * Uses PageSpeed Insights API to measure page performance
 * and stores history for trend analysis.
 * 
 * POST /api/seo-cwv - Run CWV check for pages
 * GET /api/seo-cwv - Get CWV history
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
}

const PSI_API_KEY = process.env.PAGESPEED_API_KEY

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const supabase = createSupabaseAdmin()

  try {
    // GET - Retrieve CWV history
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {}
      const { siteId, pageId, url, device = 'mobile', days = '30' } = params

      if (!siteId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
      }

      const startDate = new Date()
      startDate.setDate(startDate.getDate() - parseInt(days))

      let query = supabase
        .from('seo_cwv_history')
        .select('*')
        .eq('site_id', siteId)
        .eq('device', device)
        .gte('measured_at', startDate.toISOString())
        .order('measured_at', { ascending: false })

      if (pageId) {
        query = query.eq('page_id', pageId)
      }

      if (url) {
        query = query.eq('url', url)
      }

      const { data: history, error } = await query

      if (error) throw error

      // Calculate aggregates if we have data
      let aggregates = null
      if (history && history.length > 0) {
        const latest = history[0]
        const oldest = history[history.length - 1]
        
        aggregates = {
          latestScore: latest.performance_score,
          averageScore: Math.round(
            history.reduce((sum, h) => sum + (h.performance_score || 0), 0) / history.length
          ),
          scoreTrend: latest.performance_score - (oldest.performance_score || latest.performance_score),
          avgLcp: Math.round(
            history.reduce((sum, h) => sum + (h.lcp_ms || 0), 0) / history.filter(h => h.lcp_ms).length
          ) || null,
          avgCls: (
            history.reduce((sum, h) => sum + (h.cls || 0), 0) / history.filter(h => h.cls !== null).length
          ).toFixed(3) || null,
          avgInp: Math.round(
            history.reduce((sum, h) => sum + (h.inp_ms || 0), 0) / history.filter(h => h.inp_ms).length
          ) || null,
          dataPoints: history.length
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          history, 
          aggregates,
          count: history?.length || 0 
        })
      }
    }

    // POST - Run CWV check
    if (event.httpMethod === 'POST') {
      const { 
        siteId, 
        pageId, 
        url, 
        device = 'mobile',
        action = 'check' 
      } = JSON.parse(event.body || '{}')

      if (!siteId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
      }

      if (action === 'check') {
        if (!url) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'url required' }) }
        }

        const result = await runPageSpeedCheck(supabase, siteId, pageId, url, device)
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, result })
        }
      }

      if (action === 'check-all') {
        // For large batch checks (>5 pages), use background function
        const { limit = 10 } = JSON.parse(event.body || '{}')
        
        if (limit > 5) {
          // Trigger background function for larger batches
          const jobId = crypto.randomUUID()
          
          // Create job record
          await supabase.from('seo_background_jobs').insert({
            id: jobId,
            site_id: siteId,
            job_type: 'cwv-check-all',
            status: 'pending',
            payload: { siteId, device, limit }
          })

          // Trigger background function (fire and forget)
          const baseUrl = process.env.URL || 'https://portal.uptrademedia.com'
          fetch(`${baseUrl}/.netlify/functions/seo-cwv-background`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ siteId, device, limit, jobId })
          }).catch(err => console.error('[seo-cwv] Background trigger error:', err))

          return {
            statusCode: 202,
            headers,
            body: JSON.stringify({ 
              success: true, 
              background: true,
              jobId,
              message: `Checking ${limit} pages in background. Check status via job ID.`,
              checkStatusUrl: `/.netlify/functions/seo-background-jobs?jobId=${jobId}`
            })
          }
        }
        
        // For small batches, run inline
        const result = await checkAllPages(supabase, siteId, device, limit)
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, ...result })
        }
      }

      if (action === 'summary') {
        // Get site-wide CWV summary
        const summary = await getSiteWideSummary(supabase, siteId)
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ summary })
        }
      }

      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  } catch (err) {
    console.error('[seo-cwv] Error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}

// Run PageSpeed Insights check for a single URL
async function runPageSpeedCheck(supabase, siteId, pageId, url, device) {
  if (!PSI_API_KEY) {
    throw new Error('PAGESPEED_API_KEY not configured')
  }

  const strategy = device === 'desktop' ? 'desktop' : 'mobile'
  const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&key=${PSI_API_KEY}&category=performance&category=accessibility&category=best-practices&category=seo`

  const response = await fetch(psiUrl)
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`PageSpeed API error: ${error}`)
  }

  const data = await response.json()
  const lighthouse = data.lighthouseResult

  // Extract metrics
  const metrics = {
    site_id: siteId,
    page_id: pageId,
    url,
    device,
    
    // Lab data
    lcp_ms: Math.round(lighthouse.audits['largest-contentful-paint']?.numericValue || 0),
    fcp_ms: Math.round(lighthouse.audits['first-contentful-paint']?.numericValue || 0),
    cls: parseFloat(lighthouse.audits['cumulative-layout-shift']?.numericValue?.toFixed(4) || 0),
    tbt_ms: Math.round(lighthouse.audits['total-blocking-time']?.numericValue || 0),
    si_ms: Math.round(lighthouse.audits['speed-index']?.numericValue || 0),
    ttfb_ms: Math.round(lighthouse.audits['server-response-time']?.numericValue || 0),
    
    // INP is not always available in lab data, use TBT as proxy
    inp_ms: lighthouse.audits['experimental-interaction-to-next-paint']?.numericValue 
      ? Math.round(lighthouse.audits['experimental-interaction-to-next-paint'].numericValue)
      : null,
    
    // Scores
    performance_score: Math.round((lighthouse.categories.performance?.score || 0) * 100),
    accessibility_score: Math.round((lighthouse.categories.accessibility?.score || 0) * 100),
    best_practices_score: Math.round((lighthouse.categories['best-practices']?.score || 0) * 100),
    seo_score: Math.round((lighthouse.categories.seo?.score || 0) * 100),
    
    // Field data (CrUX)
    has_field_data: !!data.loadingExperience?.metrics,
    measured_at: new Date().toISOString()
  }

  // Add field data if available
  if (data.loadingExperience?.metrics) {
    const field = data.loadingExperience.metrics
    metrics.field_lcp_ms = field.LARGEST_CONTENTFUL_PAINT_MS?.percentile || null
    metrics.field_inp_ms = field.INTERACTION_TO_NEXT_PAINT?.percentile || null
    metrics.field_cls = field.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile 
      ? field.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100 
      : null
  }

  // Insert history record
  const { data: record, error } = await supabase
    .from('seo_cwv_history')
    .insert(metrics)
    .select()
    .single()

  if (error) throw error

  // Also update the seo_pages table with latest CWV
  if (pageId) {
    await supabase
      .from('seo_pages')
      .update({
        pagespeed_mobile: device === 'mobile' ? metrics.performance_score : undefined,
        pagespeed_desktop: device === 'desktop' ? metrics.performance_score : undefined,
        lcp_ms: metrics.lcp_ms,
        cls: metrics.cls,
        inp_ms: metrics.inp_ms,
        ttfb_ms: metrics.ttfb_ms,
        last_cwv_check: new Date().toISOString()
      })
      .eq('id', pageId)
  }

  return record
}

// Check multiple pages
async function checkAllPages(supabase, siteId, device, limit) {
  // Get top pages by traffic that haven't been checked recently
  const oneDayAgo = new Date()
  oneDayAgo.setDate(oneDayAgo.getDate() - 1)

  const { data: pages } = await supabase
    .from('seo_pages')
    .select('id, url')
    .eq('site_id', siteId)
    .or(`last_cwv_check.is.null,last_cwv_check.lt.${oneDayAgo.toISOString()}`)
    .order('clicks_28d', { ascending: false })
    .limit(limit)

  if (!pages || pages.length === 0) {
    return { checked: 0, message: 'No pages need checking' }
  }

  const results = []
  const errors = []

  for (const page of pages) {
    try {
      // Rate limit: PSI API has quota limits
      await new Promise(r => setTimeout(r, 1000))
      const result = await runPageSpeedCheck(supabase, siteId, page.id, page.url, device)
      results.push({ url: page.url, score: result.performance_score })
    } catch (err) {
      errors.push({ url: page.url, error: err.message })
    }
  }

  return {
    checked: results.length,
    errors: errors.length,
    results,
    errorDetails: errors.length > 0 ? errors : undefined
  }
}

// Get site-wide CWV summary
async function getSiteWideSummary(supabase, siteId) {
  // Get latest CWV for each page
  const { data: pages } = await supabase
    .from('seo_pages')
    .select('url, pagespeed_mobile, pagespeed_desktop, lcp_ms, cls, inp_ms, last_cwv_check')
    .eq('site_id', siteId)
    .not('pagespeed_mobile', 'is', null)

  if (!pages || pages.length === 0) {
    return { hasData: false, message: 'No CWV data available' }
  }

  // Calculate averages
  const avgMobileScore = Math.round(
    pages.reduce((sum, p) => sum + (p.pagespeed_mobile || 0), 0) / pages.length
  )
  const avgDesktopScore = Math.round(
    pages.filter(p => p.pagespeed_desktop).reduce((sum, p) => sum + p.pagespeed_desktop, 0) / 
    pages.filter(p => p.pagespeed_desktop).length
  ) || null

  // Categorize by Core Web Vitals thresholds
  const lcpGood = pages.filter(p => p.lcp_ms && p.lcp_ms <= 2500).length
  const lcpNeedsImprovement = pages.filter(p => p.lcp_ms && p.lcp_ms > 2500 && p.lcp_ms <= 4000).length
  const lcpPoor = pages.filter(p => p.lcp_ms && p.lcp_ms > 4000).length

  const clsGood = pages.filter(p => p.cls !== null && p.cls <= 0.1).length
  const clsNeedsImprovement = pages.filter(p => p.cls !== null && p.cls > 0.1 && p.cls <= 0.25).length
  const clsPoor = pages.filter(p => p.cls !== null && p.cls > 0.25).length

  const inpGood = pages.filter(p => p.inp_ms && p.inp_ms <= 200).length
  const inpNeedsImprovement = pages.filter(p => p.inp_ms && p.inp_ms > 200 && p.inp_ms <= 500).length
  const inpPoor = pages.filter(p => p.inp_ms && p.inp_ms > 500).length

  // Find worst performing pages
  const worstPages = pages
    .filter(p => p.pagespeed_mobile)
    .sort((a, b) => (a.pagespeed_mobile || 100) - (b.pagespeed_mobile || 100))
    .slice(0, 5)
    .map(p => ({
      url: p.url,
      mobileScore: p.pagespeed_mobile,
      lcp: p.lcp_ms,
      cls: p.cls,
      inp: p.inp_ms
    }))

  return {
    hasData: true,
    pagesChecked: pages.length,
    avgMobileScore,
    avgDesktopScore,
    lcp: { good: lcpGood, needsImprovement: lcpNeedsImprovement, poor: lcpPoor },
    cls: { good: clsGood, needsImprovement: clsNeedsImprovement, poor: clsPoor },
    inp: { good: inpGood, needsImprovement: inpNeedsImprovement, poor: inpPoor },
    worstPages
  }
}
