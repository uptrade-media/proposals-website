/**
 * Netlify Background Function for Internal Audits
 * 
 * Background functions have a 15-minute timeout (vs 10 seconds for regular functions)
 * This runs the actual PageSpeed analysis and saves results to Supabase
 */

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client (match main site env var usage)
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

// PageSpeed API - request all categories
async function runPageSpeed(url: string, strategy: 'mobile' | 'desktop') {
  const key = process.env.PAGESPEED_API_KEY
  const base = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
  const categories = ['performance', 'accessibility', 'best-practices', 'seo'].join('&category=')
  
  const apiUrl = `${base}?url=${encodeURIComponent(url)}&strategy=${strategy}&category=${categories}${key ? `&key=${key}` : ''}`
  
  console.log(`[audit-background] Calling PageSpeed ${strategy}...`)
  console.log(`[audit-background] API key configured: ${key ? 'YES (length: ' + key.length + ')' : 'NO - using free tier'}`)
  
  try {
    const res = await fetch(apiUrl)
    if (!res.ok) {
      const text = await res.text()
      console.error(`PageSpeed ${strategy} failed:`, res.status, text.substring(0, 500))
      return { error: `PageSpeed returned ${res.status}`, statusCode: res.status, details: text.substring(0, 200) }
    }
    const data = await res.json()
    console.log(`[audit-background] PageSpeed ${strategy} success`)
    return data
  } catch (error: any) {
    console.error(`PageSpeed ${strategy} error:`, error.message)
    return { error: error.message }
  }
}

// SEO Checks
async function runSeoChecks(targetUrl: string) {
  try {
    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UptradeAuditBot/1.0)' }
    })
    
    const responseHeaders = Object.fromEntries(response.headers.entries())
    const html = await response.text()
    
    const get = (regex: RegExp) => {
      const match = html.match(regex)
      return match ? match[1]?.trim() : ''
    }
    
    const title = get(/<title[^>]*>([^<]+)<\/title>/i)
    const metaDescription = get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    const hasH1 = /<h1[^>]*>/i.test(html)
    const h1Count = (html.match(/<h1[^>]*>/gi) || []).length
    
    // Check for robots.txt and sitemap
    const robotsUrl = new URL('/robots.txt', targetUrl).toString()
    const sitemapUrl = new URL('/sitemap.xml', targetUrl).toString()
    
    let hasRobotsTxt = false
    let hasSitemap = false
    
    try {
      const robotsRes = await fetch(robotsUrl)
      hasRobotsTxt = robotsRes.ok
    } catch {}
    
    try {
      const sitemapRes = await fetch(sitemapUrl)
      hasSitemap = sitemapRes.ok
    } catch {}
    
    // Security checks
    const isHttps = targetUrl.startsWith('https')
    const hasHsts = !!responseHeaders['strict-transport-security']
    const hasXfo = !!responseHeaders['x-frame-options']
    const hasXcto = !!responseHeaders['x-content-type-options']
    
    const securityScore = (isHttps ? 40 : 0) + (hasHsts ? 20 : 0) + (hasXfo ? 20 : 0) + (hasXcto ? 20 : 0)
    
    return {
      title,
      titleLength: title.length,
      metaDescription,
      metaDescriptionLength: metaDescription.length,
      hasH1,
      h1Count,
      hasRobotsTxt,
      hasSitemap,
      securityScore,
      isHttps
    }
  } catch (error) {
    console.error('SEO check error:', error)
    return { securityScore: 0 }
  }
}

export default async (req: Request) => {
  const body = await req.json()
  const { auditId } = body
  
  if (!auditId) {
    console.error('[audit-background] No audit ID provided')
    return new Response(JSON.stringify({ error: 'No audit ID' }), { status: 400 })
  }
  
  console.log(`[audit-background] Starting audit: ${auditId}`)
  console.log(`[audit-background] Environment check:`)
  console.log(`  - SUPABASE_URL: ${process.env.SUPABASE_URL ? 'SET' : 'MISSING'}`)
  console.log(`  - SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING'}`)
  console.log(`  - PAGESPEED_API_KEY: ${process.env.PAGESPEED_API_KEY ? `SET (length: ${process.env.PAGESPEED_API_KEY.length})` : 'MISSING'}`)
  console.log(`  - All env keys: ${Object.keys(process.env).filter(k => k.includes('PAGE') || k.includes('SPEED') || k.includes('API')).join(', ') || 'none matching'}`)
  
  try {
    // Get audit record
    const { data: audit, error: auditError } = await supabase
      .from('audits')
      .select('*')
      .eq('id', auditId)
      .single()
    
    if (auditError || !audit) {
      console.error('[audit-background] Audit not found:', auditId, auditError)
      return new Response(JSON.stringify({ error: 'Audit not found' }), { status: 404 })
    }
    
    // Update status to running
    await supabase.from('audits').update({ status: 'running' }).eq('id', auditId)
    
    console.log(`[audit-background] Running analysis for: ${audit.target_url}`)
    
    // Run all checks in parallel
    const [mobile, desktop, seo] = await Promise.all([
      runPageSpeed(audit.target_url, 'mobile'),
      runPageSpeed(audit.target_url, 'desktop'),
      runSeoChecks(audit.target_url)
    ])
    
    // Check if both PageSpeed calls failed
    if (mobile?.error && desktop?.error) {
      console.error('[audit-background] Both PageSpeed calls failed')
      
      // Check if it's a rate limit error
      const isRateLimit = mobile.error?.includes('429') || mobile.error?.includes('rateLimitExceeded') ||
                          mobile.error?.includes('Quota exceeded')
      
      const errorMessage = isRateLimit 
        ? 'PageSpeed API rate limit exceeded. Please try again later or contact support.'
        : 'PageSpeed analysis failed - site may be blocking automated requests'
      
      await supabase
        .from('audits')
        .update({
          status: 'failed',
          error_message: errorMessage,
          summary: { 
            error: errorMessage,
            isRateLimit,
            mobileError: mobile.error, 
            desktopError: desktop.error 
          }
        })
        .eq('id', auditId)
      return new Response(JSON.stringify({ error: errorMessage, isRateLimit }), { status: isRateLimit ? 429 : 500 })
    }
    
    // Extract scores
    const getScore = (obj: any, path: string[]) => 
      path.reduce((acc, key) => acc?.[key], obj)
    
    const mobilePerf = Math.round((getScore(mobile, ['lighthouseResult', 'categories', 'performance', 'score']) ?? 0) * 100)
    const desktopPerf = Math.round((getScore(desktop, ['lighthouseResult', 'categories', 'performance', 'score']) ?? 0) * 100)
    const mobileSeo = Math.round((getScore(mobile, ['lighthouseResult', 'categories', 'seo', 'score']) ?? 0) * 100)
    const desktopSeo = Math.round((getScore(desktop, ['lighthouseResult', 'categories', 'seo', 'score']) ?? 0) * 100)
    const mobileA11y = Math.round((getScore(mobile, ['lighthouseResult', 'categories', 'accessibility', 'score']) ?? 0) * 100)
    const desktopA11y = Math.round((getScore(desktop, ['lighthouseResult', 'categories', 'accessibility', 'score']) ?? 0) * 100)
    const mobileBP = Math.round((getScore(mobile, ['lighthouseResult', 'categories', 'best-practices', 'score']) ?? 0) * 100)
    const desktopBP = Math.round((getScore(desktop, ['lighthouseResult', 'categories', 'best-practices', 'score']) ?? 0) * 100)
    
    // Average scores
    const avgOrMax = (a: number, b: number) => (a && b) ? Math.round((a + b) / 2) : (a || b || 0)
    
    const performance = avgOrMax(mobilePerf, desktopPerf)
    const lighthouseSeo = avgOrMax(mobileSeo, desktopSeo)
    const accessibility = avgOrMax(mobileA11y, desktopA11y)
    const bestPractices = avgOrMax(mobileBP, desktopBP)
    
    // Extract Core Web Vitals for AI context
    const mobileAudits = mobile?.lighthouseResult?.audits || {}
    const desktopAudits = desktop?.lighthouseResult?.audits || {}
    
    const coreWebVitals = {
      lcp: {
        mobile: mobileAudits['largest-contentful-paint']?.displayValue,
        desktop: desktopAudits['largest-contentful-paint']?.displayValue,
        score: Math.round((mobileAudits['largest-contentful-paint']?.score ?? 0) * 100)
      },
      fid: {
        mobile: mobileAudits['max-potential-fid']?.displayValue,
        desktop: desktopAudits['max-potential-fid']?.displayValue
      },
      cls: {
        mobile: mobileAudits['cumulative-layout-shift']?.displayValue,
        desktop: desktopAudits['cumulative-layout-shift']?.displayValue,
        score: Math.round((mobileAudits['cumulative-layout-shift']?.score ?? 0) * 100)
      },
      fcp: {
        mobile: mobileAudits['first-contentful-paint']?.displayValue,
        desktop: desktopAudits['first-contentful-paint']?.displayValue
      },
      speedIndex: {
        mobile: mobileAudits['speed-index']?.displayValue,
        desktop: desktopAudits['speed-index']?.displayValue
      },
      tti: {
        mobile: mobileAudits['interactive']?.displayValue,
        desktop: desktopAudits['interactive']?.displayValue
      },
      tbt: {
        mobile: mobileAudits['total-blocking-time']?.displayValue,
        desktop: desktopAudits['total-blocking-time']?.displayValue
      }
    }
    
    // Extract opportunities for improvement (for AI context)
    const opportunities: any[] = []
    const diagnostics: any[] = []
    
    for (const [key, audit] of Object.entries(mobileAudits) as [string, any][]) {
      if (audit?.details?.type === 'opportunity' && audit.score !== null && audit.score < 0.9) {
        opportunities.push({
          id: key,
          title: audit.title,
          description: audit.description,
          savings: audit.details?.overallSavingsMs ? `${Math.round(audit.details.overallSavingsMs)}ms` : null,
          score: Math.round((audit.score ?? 0) * 100)
        })
      }
      if (audit?.details?.type === 'table' && audit.score !== null && audit.score < 0.5) {
        diagnostics.push({
          id: key,
          title: audit.title,
          description: audit.description,
          score: Math.round((audit.score ?? 0) * 100)
        })
      }
    }
    
    opportunities.sort((a, b) => a.score - b.score)
    diagnostics.sort((a, b) => a.score - b.score)
    
    const securityScore = (seo as any).securityScore || 0
    const overallScore = Math.round((performance + lighthouseSeo + accessibility + bestPractices) / 4)
    const grade = overallScore >= 90 ? 'A' : overallScore >= 80 ? 'B' : overallScore >= 70 ? 'C' : overallScore >= 60 ? 'D' : 'F'
    
    console.log('[audit-background] Scores:', { performance, lighthouseSeo, accessibility, bestPractices, overallScore, grade })
    
    // Save results (match main site column names + completion status)
    const summary = {
      seo,
      grade,
      metrics: {
        performance,
        performanceMobile: mobilePerf,
        performanceDesktop: desktopPerf,
        seo: lighthouseSeo,
        accessibility,
        bestPractices,
        security: securityScore,
        overall: overallScore,
        grade
      },
      coreWebVitals,
      opportunities: opportunities.slice(0, 5),
      diagnostics: diagnostics.slice(0, 5),
      seoDetails: seo
    }

    await supabase
      .from('audits')
      .update({
        performance_score: performance,
        seo_score: lighthouseSeo,
        accessibility_score: accessibility,
        best_practices_score: bestPractices,
        score_security: securityScore,
        score_overall: overallScore,
        grade,
        summary,
        status: 'complete',
        completed_at: new Date().toISOString()
      })
      .eq('id', auditId)
    
    console.log('[audit-background] Audit complete:', auditId)
    
    // NOTE: No email sent for internal audits
    
    return new Response(JSON.stringify({ success: true, auditId, grade }))
    
  } catch (error: any) {
    console.error('[audit-background] Error:', error)
    
    await supabase.from('audits').update({ status: 'failed', error_message: error.message }).eq('id', auditId)
    
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}

// Mark as background function (15 minute timeout)
export const config = {
  type: "background"
}
