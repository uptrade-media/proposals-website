/**
 * SEO CWV Background Function
 * 
 * Runs PageSpeed Insights checks for multiple pages.
 * Background functions can run up to 15 minutes.
 * 
 * Triggered by POST from seo-cwv.js with action='check-all'
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const PSI_API_KEY = process.env.PAGESPEED_API_KEY

export default async function handler(req) {
  console.log('[seo-cwv-background] Starting...')

  try {
    const { siteId, device = 'mobile', limit = 20, jobId } = await req.json()

    if (!siteId) {
      return new Response(JSON.stringify({ error: 'siteId required' }), { status: 400 })
    }

    if (!PSI_API_KEY) {
      return new Response(JSON.stringify({ error: 'PAGESPEED_API_KEY not configured' }), { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Update job status if jobId provided
    if (jobId) {
      await supabase
        .from('seo_background_jobs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', jobId)
    }

    // Get pages that haven't been checked recently
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    const { data: pages, error: pagesError } = await supabase
      .from('seo_pages')
      .select('id, url')
      .eq('site_id', siteId)
      .or(`last_cwv_check.is.null,last_cwv_check.lt.${oneDayAgo.toISOString()}`)
      .order('clicks_28d', { ascending: false })
      .limit(limit)

    if (pagesError) {
      throw new Error(`Failed to fetch pages: ${pagesError.message}`)
    }

    if (!pages || pages.length === 0) {
      const result = { checked: 0, message: 'No pages need checking' }
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
    }

    console.log(`[seo-cwv-background] Checking ${pages.length} pages...`)

    const results = []
    const errors = []
    const strategy = device === 'desktop' ? 'desktop' : 'mobile'

    for (const page of pages) {
      try {
        console.log(`[seo-cwv-background] Checking: ${page.url}`)
        
        // Rate limit: 2-3 seconds between calls
        await new Promise(r => setTimeout(r, 2500))

        const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(page.url)}&strategy=${strategy}&key=${PSI_API_KEY}&category=performance&category=accessibility&category=best-practices&category=seo`

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
          page_id: page.id,
          url: page.url,
          device,
          lcp_ms: Math.round(lighthouse.audits['largest-contentful-paint']?.numericValue || 0),
          fcp_ms: Math.round(lighthouse.audits['first-contentful-paint']?.numericValue || 0),
          cls: parseFloat(lighthouse.audits['cumulative-layout-shift']?.numericValue?.toFixed(4) || 0),
          tbt_ms: Math.round(lighthouse.audits['total-blocking-time']?.numericValue || 0),
          si_ms: Math.round(lighthouse.audits['speed-index']?.numericValue || 0),
          ttfb_ms: Math.round(lighthouse.audits['server-response-time']?.numericValue || 0),
          inp_ms: lighthouse.audits['experimental-interaction-to-next-paint']?.numericValue 
            ? Math.round(lighthouse.audits['experimental-interaction-to-next-paint'].numericValue)
            : null,
          performance_score: Math.round(lighthouse.categories.performance?.score * 100 || 0),
          accessibility_score: Math.round(lighthouse.categories.accessibility?.score * 100 || 0),
          best_practices_score: Math.round(lighthouse.categories['best-practices']?.score * 100 || 0),
          seo_score: Math.round(lighthouse.categories.seo?.score * 100 || 0),
          measured_at: new Date().toISOString()
        }

        // Insert into history
        await supabase.from('seo_cwv_history').insert(metrics)

        // Update page record
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
          .eq('id', page.id)

        results.push({ url: page.url, score: metrics.performance_score })
        console.log(`[seo-cwv-background] ✓ ${page.url}: ${metrics.performance_score}`)

      } catch (err) {
        console.error(`[seo-cwv-background] Error for ${page.url}:`, err.message)
        errors.push({ url: page.url, error: err.message })
      }
    }

    const finalResult = {
      checked: results.length,
      errors: errors.length,
      results,
      errorDetails: errors.length > 0 ? errors : undefined
    }

    // Update job status
    if (jobId) {
      await supabase
        .from('seo_background_jobs')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString(),
          result: finalResult
        })
        .eq('id', jobId)
    }

    console.log(`[seo-cwv-background] Completed: ${results.length} checked, ${errors.length} errors`)

    return new Response(JSON.stringify(finalResult), { status: 200 })

  } catch (err) {
    console.error('[seo-cwv-background] Fatal error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}

export const config = {
  type: 'background'
}
