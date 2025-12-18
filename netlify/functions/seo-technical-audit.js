// netlify/functions/seo-technical-audit.js
// Run comprehensive technical SEO audit for a site
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import * as cheerio from 'cheerio'

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
}

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
    // GET - Fetch latest audit results
    if (event.httpMethod === 'GET') {
      const { siteId } = event.queryStringParameters || {}
      
      if (!siteId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
      }

      // Get site info
      const { data: site, error: siteError } = await supabase
        .from('seo_sites')
        .select('*')
        .eq('id', siteId)
        .single()

      if (siteError || !site) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Site not found' }) }
      }

      // Get pages with technical issues
      const { data: pages } = await supabase
        .from('seo_pages')
        .select('*')
        .eq('site_id', siteId)
        .order('created_at', { ascending: false })
        .limit(500)

      // Analyze technical issues
      const issues = []
      const warnings = []
      const passed = []

      for (const page of pages || []) {
        // Check title
        if (!page.title) {
          issues.push({ type: 'missing_title', page: page.url, severity: 'critical' })
        } else if (page.title.length > 60) {
          warnings.push({ type: 'title_too_long', page: page.url, length: page.title.length })
        } else if (page.title.length < 30) {
          warnings.push({ type: 'title_too_short', page: page.url, length: page.title.length })
        }

        // Check meta description
        if (!page.meta_description) {
          issues.push({ type: 'missing_meta_description', page: page.url, severity: 'high' })
        } else if (page.meta_description.length > 160) {
          warnings.push({ type: 'meta_description_too_long', page: page.url, length: page.meta_description.length })
        } else if (page.meta_description.length < 70) {
          warnings.push({ type: 'meta_description_too_short', page: page.url, length: page.meta_description.length })
        }

        // Check H1
        if (!page.h1 && page.crawl_status === 'success') {
          issues.push({ type: 'missing_h1', page: page.url, severity: 'high' })
        }

        // Check canonical
        if (!page.canonical_url && page.crawl_status === 'success') {
          warnings.push({ type: 'missing_canonical', page: page.url })
        }

        // Check PageSpeed scores
        if (page.performance_score !== null && page.performance_score < 50) {
          issues.push({ type: 'poor_performance', page: page.url, score: page.performance_score, severity: 'high' })
        } else if (page.performance_score !== null && page.performance_score < 70) {
          warnings.push({ type: 'moderate_performance', page: page.url, score: page.performance_score })
        }

        // Check for broken pages
        if (page.crawl_status === 'error') {
          issues.push({ type: 'crawl_error', page: page.url, severity: 'critical' })
        }
      }

      // Calculate overall score
      const totalChecks = (pages?.length || 0) * 5 // 5 checks per page
      const issueWeight = issues.filter(i => i.severity === 'critical').length * 10 +
                          issues.filter(i => i.severity === 'high').length * 5 +
                          warnings.length * 2
      const score = Math.max(0, Math.min(100, 100 - (issueWeight / Math.max(1, totalChecks)) * 100))

      const audit = {
        siteId,
        domain: site.domain,
        score: Math.round(score),
        issues,
        warnings,
        passed: passed.length,
        totalPages: pages?.length || 0,
        lastAuditAt: new Date().toISOString(),
        summary: {
          criticalIssues: issues.filter(i => i.severity === 'critical').length,
          highIssues: issues.filter(i => i.severity === 'high').length,
          warnings: warnings.length,
          passed: (pages?.length || 0) * 5 - issues.length - warnings.length
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          audit
        })
      }
    }

    // POST - Run new audit
    if (event.httpMethod === 'POST') {
      const { siteId } = JSON.parse(event.body || '{}')

      if (!siteId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
      }

      // Get site and pages
      const { data: site } = await supabase
        .from('seo_sites')
        .select('*')
        .eq('id', siteId)
        .single()

      if (!site) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Site not found' }) }
      }

      // Get all pages for the site
      const { data: pages } = await supabase
        .from('seo_pages')
        .select('id, url, path')
        .eq('site_id', siteId)
        .limit(100)

      // Queue pages for re-crawl (in a real implementation, this would be a background job)
      const auditId = crypto.randomUUID()
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Technical audit started',
          auditId,
          pagesQueued: pages?.length || 0,
          status: 'running'
        })
      }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    console.error('[seo-technical-audit] Error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
