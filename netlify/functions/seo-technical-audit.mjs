// netlify/functions/seo-technical-audit.mjs
// Technical SEO Audit - Comprehensive site health analysis
// Background function for deep technical analysis
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import * as cheerio from 'cheerio'

// Background function - 15 minute timeout
export const config = {
  type: 'background'
}

// Use env variable for model - easily update when new models release
const SEO_AI_MODEL = process.env.SEO_AI_MODEL || 'gpt-4o'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { siteId, runId } = body

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
    }

    // Run the audit
    await runTechnicalAudit(siteId, runId)

    return { statusCode: 202, headers, body: JSON.stringify({ success: true, message: 'Technical audit started' }) }

  } catch (error) {
    console.error('[Technical Audit] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}

async function runTechnicalAudit(siteId, runId) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  console.log(`[Technical Audit] Starting audit for site: ${siteId}`)

  try {
    // Get site details
    const { data: site, error: siteError } = await supabase
      .from('seo_sites')
      .select('*, org:organizations(name)')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      throw new Error(`Site not found: ${siteId}`)
    }

    const domain = site.domain
    const baseUrl = `https://${domain}`

    // Create audit record
    const { data: audit, error: auditError } = await supabase
      .from('seo_technical_audits')
      .insert({
        site_id: siteId,
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (auditError) {
      // Table might not exist, log and continue
      console.log('[Technical Audit] Audit table not found, storing in analysis runs')
    }

    const auditId = audit?.id

    // Initialize audit results
    const auditResults = {
      score: 0,
      issues: [],
      warnings: [],
      passed: [],
      metrics: {},
      recommendations: []
    }

    // 1. Check robots.txt
    console.log('[Technical Audit] Checking robots.txt...')
    const robotsResult = await checkRobotsTxt(baseUrl)
    if (robotsResult.hasIssues) {
      auditResults.issues.push(...robotsResult.issues)
    }
    if (robotsResult.warnings?.length > 0) {
      auditResults.warnings.push(...robotsResult.warnings)
    }
    if (robotsResult.passed) {
      auditResults.passed.push('robots.txt exists and is valid')
    }
    auditResults.metrics.robotsTxt = robotsResult

    // 2. Check sitemap
    console.log('[Technical Audit] Checking sitemap...')
    const sitemapResult = await checkSitemap(baseUrl)
    if (sitemapResult.hasIssues) {
      auditResults.issues.push(...sitemapResult.issues)
    }
    if (sitemapResult.warnings?.length > 0) {
      auditResults.warnings.push(...sitemapResult.warnings)
    }
    if (sitemapResult.passed) {
      auditResults.passed.push(`Sitemap found with ${sitemapResult.urlCount || 0} URLs`)
    }
    auditResults.metrics.sitemap = sitemapResult

    // 3. Check HTTPS and security headers
    console.log('[Technical Audit] Checking security...')
    const securityResult = await checkSecurity(baseUrl)
    if (securityResult.issues?.length > 0) {
      auditResults.issues.push(...securityResult.issues)
    }
    if (securityResult.warnings?.length > 0) {
      auditResults.warnings.push(...securityResult.warnings)
    }
    if (securityResult.passed?.length > 0) {
      auditResults.passed.push(...securityResult.passed)
    }
    auditResults.metrics.security = securityResult

    // 4. Check Core Web Vitals (from CrUX API if available)
    console.log('[Technical Audit] Checking Core Web Vitals...')
    const cwvResult = await checkCoreWebVitals(baseUrl)
    if (cwvResult.issues?.length > 0) {
      auditResults.issues.push(...cwvResult.issues)
    }
    if (cwvResult.warnings?.length > 0) {
      auditResults.warnings.push(...cwvResult.warnings)
    }
    if (cwvResult.passed?.length > 0) {
      auditResults.passed.push(...cwvResult.passed)
    }
    auditResults.metrics.coreWebVitals = cwvResult

    // 5. Check mobile-friendliness
    console.log('[Technical Audit] Checking mobile optimization...')
    const mobileResult = await checkMobileFriendliness(baseUrl)
    if (mobileResult.issues?.length > 0) {
      auditResults.issues.push(...mobileResult.issues)
    }
    if (mobileResult.warnings?.length > 0) {
      auditResults.warnings.push(...mobileResult.warnings)
    }
    if (mobileResult.passed?.length > 0) {
      auditResults.passed.push(...mobileResult.passed)
    }
    auditResults.metrics.mobile = mobileResult

    // 6. Check page-level issues from stored pages
    console.log('[Technical Audit] Analyzing page-level issues...')
    const { data: pages } = await supabase
      .from('seo_pages')
      .select('*')
      .eq('site_id', siteId)
      .limit(500)

    const pageIssues = analyzePageIssues(pages || [])
    if (pageIssues.issues?.length > 0) {
      auditResults.issues.push(...pageIssues.issues)
    }
    if (pageIssues.warnings?.length > 0) {
      auditResults.warnings.push(...pageIssues.warnings)
    }
    auditResults.metrics.pages = pageIssues.summary

    // 7. Check for common technical SEO issues
    console.log('[Technical Audit] Checking common issues...')
    const commonResult = await checkCommonIssues(baseUrl, pages || [])
    if (commonResult.issues?.length > 0) {
      auditResults.issues.push(...commonResult.issues)
    }
    if (commonResult.warnings?.length > 0) {
      auditResults.warnings.push(...commonResult.warnings)
    }
    if (commonResult.passed?.length > 0) {
      auditResults.passed.push(...commonResult.passed)
    }

    // Calculate overall score
    const issuePoints = auditResults.issues.length * 5
    const warningPoints = auditResults.warnings.length * 2
    const passedPoints = auditResults.passed.length * 3
    const maxPoints = (auditResults.issues.length + auditResults.warnings.length + auditResults.passed.length) * 5
    const score = Math.max(0, Math.min(100, Math.round(((maxPoints - issuePoints - warningPoints) / maxPoints) * 100)))
    auditResults.score = score

    // Generate AI recommendations
    console.log('[Technical Audit] Generating AI recommendations...')
    const aiRecommendations = await generateAIRecommendations(openai, auditResults, site)
    auditResults.recommendations = aiRecommendations

    // Save recommendations to the system
    if (aiRecommendations.length > 0) {
      const recommendationsToInsert = aiRecommendations.map(rec => ({
        site_id: siteId,
        category: 'technical',
        priority: rec.priority || 'medium',
        title: rec.title,
        description: rec.description,
        current_value: rec.currentIssue,
        suggested_value: rec.solution,
        auto_fixable: false,
        impact_score: rec.impactScore,
        ai_model: SEO_AI_MODEL,
        status: 'pending',
        created_at: new Date().toISOString()
      }))

      await supabase
        .from('seo_ai_recommendations')
        .insert(recommendationsToInsert)
    }

    // Update audit record
    if (auditId) {
      await supabase
        .from('seo_technical_audits')
        .update({
          status: 'completed',
          score: auditResults.score,
          issues_count: auditResults.issues.length,
          warnings_count: auditResults.warnings.length,
          passed_count: auditResults.passed.length,
          results: auditResults,
          completed_at: new Date().toISOString()
        })
        .eq('id', auditId)
    }

    // Also save to analysis runs
    await supabase
      .from('seo_ai_analysis_runs')
      .insert({
        site_id: siteId,
        run_type: 'technical_audit',
        status: 'completed',
        results: auditResults,
        ai_model: SEO_AI_MODEL,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })

    // Create alerts for critical issues
    const criticalIssues = auditResults.issues.filter(i => i.severity === 'critical')
    if (criticalIssues.length > 0) {
      await supabase
        .from('seo_alerts')
        .insert({
          site_id: siteId,
          alert_type: 'technical_issue',
          severity: 'critical',
          title: `${criticalIssues.length} critical technical issues found`,
          message: criticalIssues.map(i => i.message || i).join('; '),
          data: { issues: criticalIssues },
          triggered_at: new Date().toISOString(),
          status: 'active'
        })
    }

    console.log(`[Technical Audit] Completed. Score: ${auditResults.score}/100`)
    console.log(`[Technical Audit] Issues: ${auditResults.issues.length}, Warnings: ${auditResults.warnings.length}, Passed: ${auditResults.passed.length}`)

  } catch (error) {
    console.error('[Technical Audit] Error:', error)
    
    // Save error state
    await supabase
      .from('seo_ai_analysis_runs')
      .insert({
        site_id: siteId,
        run_type: 'technical_audit',
        status: 'error',
        error_message: error.message,
        started_at: new Date().toISOString()
      })

    throw error
  }
}

// Check robots.txt
async function checkRobotsTxt(baseUrl) {
  const result = {
    exists: false,
    hasIssues: false,
    issues: [],
    warnings: [],
    passed: false,
    content: null
  }

  try {
    const response = await fetch(`${baseUrl}/robots.txt`, {
      headers: { 'User-Agent': 'Uptrade SEO Bot/1.0' },
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      result.hasIssues = true
      result.issues.push({
        type: 'robots_missing',
        message: 'robots.txt file is missing or inaccessible',
        severity: 'medium'
      })
      return result
    }

    result.exists = true
    result.content = await response.text()
    result.passed = true

    // Check for common issues
    const content = result.content.toLowerCase()
    
    if (content.includes('disallow: /') && !content.includes('disallow: / ')) {
      // Check if it's blocking everything
      const lines = result.content.split('\n')
      for (const line of lines) {
        if (line.trim().toLowerCase() === 'disallow: /') {
          result.hasIssues = true
          result.issues.push({
            type: 'robots_block_all',
            message: 'robots.txt is blocking all crawlers (Disallow: /)',
            severity: 'critical'
          })
          result.passed = false
        }
      }
    }

    if (!content.includes('sitemap:')) {
      result.warnings.push({
        type: 'no_sitemap_reference',
        message: 'robots.txt does not reference a sitemap',
        severity: 'low'
      })
    }

  } catch (error) {
    result.hasIssues = true
    result.issues.push({
      type: 'robots_error',
      message: `Error checking robots.txt: ${error.message}`,
      severity: 'medium'
    })
  }

  return result
}

// Check sitemap
async function checkSitemap(baseUrl) {
  const result = {
    exists: false,
    hasIssues: false,
    issues: [],
    warnings: [],
    passed: false,
    urlCount: 0,
    location: null
  }

  const sitemapLocations = [
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/sitemap_index.xml`,
    `${baseUrl}/sitemap/sitemap.xml`
  ]

  for (const location of sitemapLocations) {
    try {
      const response = await fetch(location, {
        headers: { 'User-Agent': 'Uptrade SEO Bot/1.0' },
        signal: AbortSignal.timeout(10000)
      })

      if (response.ok) {
        result.exists = true
        result.location = location
        result.passed = true

        const content = await response.text()
        
        // Count URLs
        const urlMatches = content.match(/<loc>/gi)
        result.urlCount = urlMatches?.length || 0

        // Check if it's an index
        result.isIndex = content.includes('<sitemapindex')

        // Check for issues
        if (result.urlCount === 0) {
          result.hasIssues = true
          result.issues.push({
            type: 'empty_sitemap',
            message: 'Sitemap exists but contains no URLs',
            severity: 'high'
          })
          result.passed = false
        }

        break
      }
    } catch (error) {
      // Continue to next location
    }
  }

  if (!result.exists) {
    result.hasIssues = true
    result.issues.push({
      type: 'sitemap_missing',
      message: 'XML sitemap not found',
      severity: 'medium'
    })
  }

  return result
}

// Check security headers
async function checkSecurity(baseUrl) {
  const result = {
    https: false,
    issues: [],
    warnings: [],
    passed: [],
    headers: {}
  }

  try {
    // Check HTTPS
    if (baseUrl.startsWith('https://')) {
      result.https = true
      result.passed.push('Site uses HTTPS')
    } else {
      result.issues.push({
        type: 'no_https',
        message: 'Site does not use HTTPS',
        severity: 'critical'
      })
    }

    // Check headers
    const response = await fetch(baseUrl, {
      headers: { 'User-Agent': 'Uptrade SEO Bot/1.0' },
      signal: AbortSignal.timeout(10000)
    })

    const headers = response.headers

    // Check important security headers
    if (headers.get('strict-transport-security')) {
      result.passed.push('HSTS header present')
      result.headers.hsts = headers.get('strict-transport-security')
    } else {
      result.warnings.push({
        type: 'no_hsts',
        message: 'Missing HSTS header',
        severity: 'medium'
      })
    }

    if (headers.get('x-content-type-options')) {
      result.passed.push('X-Content-Type-Options header present')
    }

    if (headers.get('x-frame-options')) {
      result.passed.push('X-Frame-Options header present')
    }

    // Check for redirect
    if (response.redirected) {
      result.redirectUrl = response.url
      if (response.url !== baseUrl && response.url !== baseUrl + '/') {
        result.warnings.push({
          type: 'homepage_redirect',
          message: `Homepage redirects to ${response.url}`,
          severity: 'low'
        })
      }
    }

  } catch (error) {
    result.issues.push({
      type: 'security_check_error',
      message: `Error checking security: ${error.message}`,
      severity: 'low'
    })
  }

  return result
}

// Check Core Web Vitals via PageSpeed Insights API
async function checkCoreWebVitals(baseUrl) {
  const result = {
    hasData: false,
    issues: [],
    warnings: [],
    passed: [],
    metrics: {}
  }

  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY
  if (!apiKey) {
    result.warnings.push({
      type: 'no_cwv_api',
      message: 'Core Web Vitals check skipped (no API key)',
      severity: 'low'
    })
    return result
  }

  try {
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(baseUrl)}&key=${apiKey}&strategy=mobile&category=performance`
    
    const response = await fetch(apiUrl, {
      signal: AbortSignal.timeout(60000)
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const data = await response.json()
    result.hasData = true

    const cruxMetrics = data.loadingExperience?.metrics || {}
    
    // LCP
    if (cruxMetrics.LARGEST_CONTENTFUL_PAINT_MS) {
      const lcp = cruxMetrics.LARGEST_CONTENTFUL_PAINT_MS
      result.metrics.lcp = {
        percentile: lcp.percentile,
        category: lcp.category
      }
      
      if (lcp.category === 'SLOW') {
        result.issues.push({
          type: 'slow_lcp',
          message: `Poor LCP: ${(lcp.percentile / 1000).toFixed(1)}s (should be < 2.5s)`,
          severity: 'high'
        })
      } else if (lcp.category === 'AVERAGE') {
        result.warnings.push({
          type: 'average_lcp',
          message: `LCP needs improvement: ${(lcp.percentile / 1000).toFixed(1)}s`,
          severity: 'medium'
        })
      } else {
        result.passed.push(`Good LCP: ${(lcp.percentile / 1000).toFixed(1)}s`)
      }
    }

    // FID / INP
    if (cruxMetrics.FIRST_INPUT_DELAY_MS) {
      const fid = cruxMetrics.FIRST_INPUT_DELAY_MS
      result.metrics.fid = {
        percentile: fid.percentile,
        category: fid.category
      }
      
      if (fid.category === 'SLOW') {
        result.issues.push({
          type: 'slow_fid',
          message: `Poor FID: ${fid.percentile}ms (should be < 100ms)`,
          severity: 'high'
        })
      } else if (fid.category === 'AVERAGE') {
        result.warnings.push({
          type: 'average_fid',
          message: `FID needs improvement: ${fid.percentile}ms`,
          severity: 'medium'
        })
      } else {
        result.passed.push(`Good FID: ${fid.percentile}ms`)
      }
    }

    // CLS
    if (cruxMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE) {
      const cls = cruxMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE
      result.metrics.cls = {
        percentile: cls.percentile,
        category: cls.category
      }
      
      if (cls.category === 'SLOW') {
        result.issues.push({
          type: 'high_cls',
          message: `Poor CLS: ${(cls.percentile / 100).toFixed(2)} (should be < 0.1)`,
          severity: 'high'
        })
      } else if (cls.category === 'AVERAGE') {
        result.warnings.push({
          type: 'average_cls',
          message: `CLS needs improvement: ${(cls.percentile / 100).toFixed(2)}`,
          severity: 'medium'
        })
      } else {
        result.passed.push(`Good CLS: ${(cls.percentile / 100).toFixed(2)}`)
      }
    }

    // Performance score
    const perfScore = data.lighthouseResult?.categories?.performance?.score
    if (perfScore !== undefined) {
      result.metrics.performanceScore = Math.round(perfScore * 100)
      
      if (perfScore < 0.5) {
        result.issues.push({
          type: 'low_perf_score',
          message: `Low performance score: ${Math.round(perfScore * 100)}/100`,
          severity: 'high'
        })
      } else if (perfScore < 0.9) {
        result.warnings.push({
          type: 'medium_perf_score',
          message: `Performance score: ${Math.round(perfScore * 100)}/100 (target: 90+)`,
          severity: 'medium'
        })
      }
    }

  } catch (error) {
    result.warnings.push({
      type: 'cwv_error',
      message: `Error checking Core Web Vitals: ${error.message}`,
      severity: 'low'
    })
  }

  return result
}

// Check mobile friendliness
async function checkMobileFriendliness(baseUrl) {
  const result = {
    issues: [],
    warnings: [],
    passed: []
  }

  try {
    const response = await fetch(baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15A372 Safari/604.1'
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      result.issues.push({
        type: 'mobile_inaccessible',
        message: 'Site not accessible on mobile user-agent',
        severity: 'critical'
      })
      return result
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Check viewport
    const viewport = $('meta[name="viewport"]').attr('content')
    if (!viewport) {
      result.issues.push({
        type: 'no_viewport',
        message: 'Missing viewport meta tag',
        severity: 'high'
      })
    } else if (!viewport.includes('width=device-width')) {
      result.warnings.push({
        type: 'bad_viewport',
        message: 'Viewport not optimized for mobile',
        severity: 'medium'
      })
    } else {
      result.passed.push('Viewport meta tag properly configured')
    }

    // Check for responsive design indicators
    const hasResponsiveCSS = html.includes('@media') || html.includes('min-width') || html.includes('max-width')
    if (hasResponsiveCSS) {
      result.passed.push('Responsive CSS detected')
    }

    // Check touch targets (simplified)
    const smallButtons = $('button, a').filter((_, el) => {
      const style = $(el).attr('style') || ''
      const width = style.match(/width:\s*(\d+)px/)
      const height = style.match(/height:\s*(\d+)px/)
      return (width && parseInt(width[1]) < 44) || (height && parseInt(height[1]) < 44)
    })
    
    if (smallButtons.length > 5) {
      result.warnings.push({
        type: 'small_touch_targets',
        message: 'Potentially small touch targets detected',
        severity: 'low'
      })
    }

  } catch (error) {
    result.warnings.push({
      type: 'mobile_check_error',
      message: `Error checking mobile friendliness: ${error.message}`,
      severity: 'low'
    })
  }

  return result
}

// Analyze page-level issues
function analyzePageIssues(pages) {
  const result = {
    issues: [],
    warnings: [],
    summary: {
      totalPages: pages.length,
      pagesWithIssues: 0,
      issueBreakdown: {}
    }
  }

  const issueCounts = {
    missing_title: 0,
    missing_description: 0,
    duplicate_title: 0,
    short_title: 0,
    long_title: 0,
    short_description: 0,
    long_description: 0,
    missing_h1: 0,
    multiple_h1: 0,
    thin_content: 0
  }

  const titles = {}
  const descriptions = {}

  for (const page of pages) {
    let hasIssue = false

    // Title checks
    if (!page.title) {
      issueCounts.missing_title++
      hasIssue = true
    } else {
      if (page.title.length < 30) {
        issueCounts.short_title++
        hasIssue = true
      } else if (page.title.length > 60) {
        issueCounts.long_title++
        hasIssue = true
      }
      
      // Check duplicates
      if (titles[page.title]) {
        issueCounts.duplicate_title++
        hasIssue = true
      }
      titles[page.title] = (titles[page.title] || 0) + 1
    }

    // Meta description checks
    if (!page.meta_description) {
      issueCounts.missing_description++
      hasIssue = true
    } else {
      if (page.meta_description.length < 50) {
        issueCounts.short_description++
        hasIssue = true
      } else if (page.meta_description.length > 160) {
        issueCounts.long_description++
        hasIssue = true
      }
    }

    // H1 checks
    if (!page.h1) {
      issueCounts.missing_h1++
      hasIssue = true
    }

    // Content checks
    if (page.word_count && page.word_count < 300) {
      issueCounts.thin_content++
      hasIssue = true
    }

    if (hasIssue) {
      result.summary.pagesWithIssues++
    }
  }

  result.summary.issueBreakdown = issueCounts

  // Create consolidated issues
  if (issueCounts.missing_title > 0) {
    result.issues.push({
      type: 'missing_titles',
      message: `${issueCounts.missing_title} pages missing title tags`,
      severity: 'high',
      count: issueCounts.missing_title
    })
  }

  if (issueCounts.missing_description > 0) {
    result.issues.push({
      type: 'missing_descriptions',
      message: `${issueCounts.missing_description} pages missing meta descriptions`,
      severity: 'medium',
      count: issueCounts.missing_description
    })
  }

  if (issueCounts.duplicate_title > 0) {
    result.issues.push({
      type: 'duplicate_titles',
      message: `${issueCounts.duplicate_title} pages with duplicate titles`,
      severity: 'high',
      count: issueCounts.duplicate_title
    })
  }

  if (issueCounts.missing_h1 > 0) {
    result.warnings.push({
      type: 'missing_h1',
      message: `${issueCounts.missing_h1} pages missing H1 tags`,
      severity: 'medium',
      count: issueCounts.missing_h1
    })
  }

  if (issueCounts.thin_content > 0) {
    result.warnings.push({
      type: 'thin_content',
      message: `${issueCounts.thin_content} pages with thin content (<300 words)`,
      severity: 'medium',
      count: issueCounts.thin_content
    })
  }

  return result
}

// Check common technical SEO issues
async function checkCommonIssues(baseUrl, pages) {
  const result = {
    issues: [],
    warnings: [],
    passed: []
  }

  try {
    const response = await fetch(baseUrl, {
      headers: { 'User-Agent': 'Uptrade SEO Bot/1.0' },
      signal: AbortSignal.timeout(10000)
    })

    const html = await response.text()
    const $ = cheerio.load(html)

    // Check canonical
    const canonical = $('link[rel="canonical"]').attr('href')
    if (!canonical) {
      result.warnings.push({
        type: 'missing_canonical',
        message: 'Homepage missing canonical tag',
        severity: 'medium'
      })
    } else {
      result.passed.push('Canonical tag present on homepage')
    }

    // Check lang attribute
    const lang = $('html').attr('lang')
    if (!lang) {
      result.warnings.push({
        type: 'missing_lang',
        message: 'Missing lang attribute on html tag',
        severity: 'low'
      })
    } else {
      result.passed.push(`Language set: ${lang}`)
    }

    // Check for structured data
    const jsonLd = $('script[type="application/ld+json"]')
    if (jsonLd.length === 0) {
      result.warnings.push({
        type: 'no_structured_data',
        message: 'No structured data (JSON-LD) on homepage',
        severity: 'medium'
      })
    } else {
      result.passed.push(`${jsonLd.length} JSON-LD schema block(s) found`)
    }

    // Check favicon
    const favicon = $('link[rel="icon"], link[rel="shortcut icon"]')
    if (favicon.length === 0) {
      result.warnings.push({
        type: 'missing_favicon',
        message: 'Missing favicon',
        severity: 'low'
      })
    }

    // Check for render-blocking resources (simplified)
    const inlineStyles = $('style').length
    const inlineScripts = $('script:not([src]):not([type="application/ld+json"])').length
    if (inlineStyles > 3 || inlineScripts > 5) {
      result.warnings.push({
        type: 'inline_resources',
        message: 'High number of inline styles/scripts may affect performance',
        severity: 'low'
      })
    }

    // Check 404 page
    try {
      const notFoundResponse = await fetch(`${baseUrl}/this-page-definitely-does-not-exist-12345`, {
        headers: { 'User-Agent': 'Uptrade SEO Bot/1.0' },
        signal: AbortSignal.timeout(10000),
        redirect: 'manual'
      })
      
      if (notFoundResponse.status === 404) {
        result.passed.push('404 page returns proper status code')
      } else if (notFoundResponse.status === 200) {
        result.warnings.push({
          type: 'soft_404',
          message: '404 pages return 200 status (soft 404)',
          severity: 'medium'
        })
      }
    } catch (error) {
      // Skip if error
    }

  } catch (error) {
    result.warnings.push({
      type: 'common_check_error',
      message: `Error checking common issues: ${error.message}`,
      severity: 'low'
    })
  }

  return result
}

// Generate AI recommendations
async function generateAIRecommendations(openai, auditResults, site) {
  try {
    const prompt = `Analyze this technical SEO audit and provide prioritized recommendations.

SITE: ${site.domain}

AUDIT SCORE: ${auditResults.score}/100

CRITICAL ISSUES (${auditResults.issues.length}):
${auditResults.issues.map(i => `- ${i.message || i} (${i.severity || 'medium'})`).join('\n')}

WARNINGS (${auditResults.warnings.length}):
${auditResults.warnings.map(w => `- ${w.message || w} (${w.severity || 'low'})`).join('\n')}

PASSED CHECKS (${auditResults.passed.length}):
${auditResults.passed.map(p => `- ${typeof p === 'string' ? p : p.message}`).join('\n')}

METRICS:
${JSON.stringify(auditResults.metrics, null, 2)}

Provide the top 5 prioritized recommendations in JSON format:
{
  "recommendations": [
    {
      "title": "Brief title",
      "description": "Detailed explanation",
      "currentIssue": "What's wrong",
      "solution": "How to fix it",
      "priority": "critical|high|medium|low",
      "impactScore": 1-10,
      "category": "core_web_vitals|crawlability|indexability|security|content|structure"
    }
  ]
}`

    const completion = await openai.chat.completions.create({
      model: SEO_AI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a technical SEO expert. Analyze audit results and provide actionable, prioritized recommendations. Focus on highest-impact issues first.'
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })

    const result = JSON.parse(completion.choices[0].message.content)
    return result.recommendations || []

  } catch (error) {
    console.error('[Technical Audit] AI recommendations error:', error)
    return []
  }
}
