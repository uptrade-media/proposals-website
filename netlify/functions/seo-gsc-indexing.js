// netlify/functions/seo-gsc-indexing.js
// Pull indexing issues from Google Search Console URL Inspection API
// and generate actionable fixes
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { googleApiRequest, getAccessToken } from './utils/google-auth.js'

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
}

// URL Inspection API endpoint
const URL_INSPECTION_API = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect'

// Sitemaps API base
const SITEMAPS_API = 'https://searchconsole.googleapis.com/webmasters/v3/sites'

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
    // GET - Fetch indexing status for pages
    if (event.httpMethod === 'GET') {
      const { siteId, action } = event.queryStringParameters || {}

      if (!siteId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
      }

      // Get site
      const { data: site } = await supabase
        .from('seo_sites')
        .select('*')
        .eq('id', siteId)
        .single()

      if (!site) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Site not found' }) }
      }

      const siteUrl = site.gsc_property_url || `sc-domain:${site.domain}`

      // Action: Get sitemaps status
      if (action === 'sitemaps') {
        try {
          const sitemapsUrl = `${SITEMAPS_API}/${encodeURIComponent(siteUrl)}/sitemaps`
          const sitemapsData = await googleApiRequest(sitemapsUrl)
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              sitemaps: sitemapsData.sitemap || [],
              summary: {
                total: sitemapsData.sitemap?.length || 0,
                errors: sitemapsData.sitemap?.filter(s => s.errors > 0).length || 0,
                warnings: sitemapsData.sitemap?.filter(s => s.warnings > 0).length || 0
              }
            })
          }
        } catch (err) {
          console.error('[seo-gsc-indexing] Sitemaps error:', err.message)
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: false,
              error: err.message,
              sitemaps: []
            })
          }
        }
      }

      // Default: Get pages with potential indexing issues from our database
      const { data: pages } = await supabase
        .from('seo_pages')
        .select('id, url, path, title, indexing_status, indexing_verdict, last_crawled_at, crawl_status')
        .eq('site_id', siteId)
        .order('clicks_28d', { ascending: false })
        .limit(100)

      // Categorize by indexing status
      const categories = {
        indexed: pages?.filter(p => p.indexing_status === 'indexed') || [],
        notIndexed: pages?.filter(p => p.indexing_status === 'not_indexed') || [],
        error: pages?.filter(p => p.crawl_status === 'error') || [],
        unknown: pages?.filter(p => !p.indexing_status) || []
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          domain: site.domain,
          pages: pages || [],
          summary: {
            indexed: categories.indexed.length,
            notIndexed: categories.notIndexed.length,
            errors: categories.error.length,
            unknown: categories.unknown.length
          }
        })
      }
    }

    // POST - Inspect URLs or bulk check indexing
    if (event.httpMethod === 'POST') {
      const { siteId, action, urls, url } = JSON.parse(event.body || '{}')

      if (!siteId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
      }

      // Get site
      const { data: site } = await supabase
        .from('seo_sites')
        .select('*')
        .eq('id', siteId)
        .single()

      if (!site) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Site not found' }) }
      }

      const siteUrl = site.gsc_property_url || `sc-domain:${site.domain}`

      // Action: Inspect a single URL
      if (action === 'inspect' && url) {
        try {
          const inspectionResult = await googleApiRequest(URL_INSPECTION_API, {
            method: 'POST',
            body: JSON.stringify({
              inspectionUrl: url,
              siteUrl: siteUrl
            })
          })

          const result = inspectionResult.inspectionResult
          const indexStatus = result?.indexStatusResult

          // Parse the inspection result
          const inspection = {
            url,
            verdict: indexStatus?.verdict || 'UNKNOWN',
            coverageState: indexStatus?.coverageState || 'UNKNOWN',
            robotsTxtState: indexStatus?.robotsTxtState || 'UNKNOWN',
            indexingState: indexStatus?.indexingState || 'UNKNOWN',
            lastCrawlTime: indexStatus?.lastCrawlTime,
            pageFetchState: indexStatus?.pageFetchState || 'UNKNOWN',
            googleCanonical: indexStatus?.googleCanonical,
            userCanonical: indexStatus?.userCanonical,
            crawledAs: indexStatus?.crawledAs,
            referringUrls: indexStatus?.referringUrls || [],
            sitemap: indexStatus?.sitemap || []
          }

          // Generate fix recommendations based on issues
          const fixes = generateFixes(inspection)

          // Update the page in our database
          const { data: existingPage } = await supabase
            .from('seo_pages')
            .select('id')
            .eq('site_id', siteId)
            .eq('url', url)
            .single()

          if (existingPage) {
            await supabase
              .from('seo_pages')
              .update({
                indexing_status: inspection.verdict === 'PASS' ? 'indexed' : 'not_indexed',
                indexing_verdict: inspection.verdict,
                last_crawled_at: inspection.lastCrawlTime || new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', existingPage.id)
          }

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              inspection,
              fixes
            })
          }
        } catch (err) {
          console.error('[seo-gsc-indexing] Inspection error:', err.message)
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: false,
              error: err.message,
              note: 'URL Inspection API requires proper OAuth scope. Make sure service account has searchconsole.readonly scope.'
            })
          }
        }
      }

      // Action: Bulk inspect multiple URLs
      if (action === 'bulk-inspect' && urls?.length > 0) {
        const results = []
        const errors = []

        // GSC has rate limits, so we process in batches
        const batchSize = 5
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

        for (let i = 0; i < Math.min(urls.length, 50); i += batchSize) {
          const batch = urls.slice(i, i + batchSize)
          
          const batchResults = await Promise.all(
            batch.map(async (pageUrl) => {
              try {
                const inspectionResult = await googleApiRequest(URL_INSPECTION_API, {
                  method: 'POST',
                  body: JSON.stringify({
                    inspectionUrl: pageUrl,
                    siteUrl: siteUrl
                  })
                })
                
                const indexStatus = inspectionResult.inspectionResult?.indexStatusResult
                return {
                  url: pageUrl,
                  verdict: indexStatus?.verdict || 'UNKNOWN',
                  coverageState: indexStatus?.coverageState || 'UNKNOWN',
                  lastCrawlTime: indexStatus?.lastCrawlTime,
                  success: true
                }
              } catch (err) {
                return {
                  url: pageUrl,
                  error: err.message,
                  success: false
                }
              }
            })
          )

          results.push(...batchResults)
          
          // Rate limit delay
          if (i + batchSize < urls.length) {
            await delay(1000)
          }
        }

        // Update pages in database
        for (const result of results.filter(r => r.success)) {
          const { data: existingPage } = await supabase
            .from('seo_pages')
            .select('id')
            .eq('site_id', siteId)
            .eq('url', result.url)
            .single()

          if (existingPage) {
            await supabase
              .from('seo_pages')
              .update({
                indexing_status: result.verdict === 'PASS' ? 'indexed' : 'not_indexed',
                indexing_verdict: result.verdict,
                last_crawled_at: result.lastCrawlTime || new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', existingPage.id)
          }
        }

        // Categorize results
        const summary = {
          total: results.length,
          indexed: results.filter(r => r.verdict === 'PASS').length,
          notIndexed: results.filter(r => r.verdict && r.verdict !== 'PASS' && r.verdict !== 'UNKNOWN').length,
          errors: results.filter(r => !r.success).length
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            results,
            summary
          })
        }
      }

      // Action: Submit URL for indexing (via Indexing API - requires separate setup)
      if (action === 'request-indexing' && url) {
        // Note: The Indexing API is separate and typically only for job postings / livestreams
        // For regular URLs, you'd submit via sitemap
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'Direct indexing requests require the Indexing API which is limited to specific content types. Consider updating your sitemap and requesting a recrawl in GSC.',
            recommendation: 'Submit URL via Google Search Console manually or ensure it\'s in your sitemap.'
          })
        }
      }

      // Action: Analyze all pages and generate fixes report
      if (action === 'analyze-all') {
        // Get all pages from database
        const { data: pages } = await supabase
          .from('seo_pages')
          .select('*')
          .eq('site_id', siteId)
          .limit(500)

        // Analyze for common issues
        const issues = analyzeIndexingIssues(pages || [], site.domain)

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            domain: site.domain,
            totalPages: pages?.length || 0,
            issues,
            recommendations: generateBulkRecommendations(issues)
          })
        }
      }

      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    console.error('[seo-gsc-indexing] Error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}

/**
 * Generate fix recommendations based on URL inspection result
 */
function generateFixes(inspection) {
  const fixes = []

  // Not indexed
  if (inspection.verdict !== 'PASS') {
    // Robots.txt blocking
    if (inspection.robotsTxtState === 'DISALLOWED') {
      fixes.push({
        type: 'robots_blocking',
        severity: 'critical',
        title: 'Page blocked by robots.txt',
        description: `The URL ${inspection.url} is blocked by robots.txt`,
        fix: 'Update robots.txt to allow crawling of this URL',
        code: `# Add to robots.txt:\nAllow: ${new URL(inspection.url).pathname}`
      })
    }

    // Noindex tag
    if (inspection.indexingState === 'NOINDEX') {
      fixes.push({
        type: 'noindex_tag',
        severity: 'critical',
        title: 'Page has noindex tag',
        description: 'The page contains a noindex meta tag or X-Robots-Tag header',
        fix: 'Remove the noindex directive if you want this page indexed',
        code: `<!-- Remove this: -->\n<meta name="robots" content="noindex">`
      })
    }

    // Canonical mismatch
    if (inspection.googleCanonical && inspection.userCanonical && 
        inspection.googleCanonical !== inspection.userCanonical) {
      fixes.push({
        type: 'canonical_mismatch',
        severity: 'high',
        title: 'Canonical URL mismatch',
        description: `Google chose ${inspection.googleCanonical} as canonical instead of ${inspection.userCanonical}`,
        fix: 'Either update your canonical tag to match Google\'s choice or improve the page\'s uniqueness',
        googleChose: inspection.googleCanonical,
        userDeclared: inspection.userCanonical
      })
    }

    // Fetch error
    if (inspection.pageFetchState === 'SOFT_404') {
      fixes.push({
        type: 'soft_404',
        severity: 'high',
        title: 'Soft 404 detected',
        description: 'The page returns 200 OK but appears to be an error page',
        fix: 'Either add real content to this page or return a proper 404 status code'
      })
    }

    if (inspection.pageFetchState === 'SERVER_ERROR') {
      fixes.push({
        type: 'server_error',
        severity: 'critical',
        title: 'Server error (5xx)',
        description: 'The server returned an error when Google tried to crawl this page',
        fix: 'Check server logs and fix the underlying error causing 5xx responses'
      })
    }

    if (inspection.pageFetchState === 'NOT_FOUND') {
      fixes.push({
        type: 'not_found',
        severity: 'high',
        title: 'Page not found (404)',
        description: 'The page returns a 404 error',
        fix: 'Either restore the page, set up a redirect, or remove links to this URL'
      })
    }

    if (inspection.pageFetchState === 'REDIRECT_ERROR') {
      fixes.push({
        type: 'redirect_error',
        severity: 'high',
        title: 'Redirect error',
        description: 'There\'s a problem with the redirect chain for this URL',
        fix: 'Check for redirect loops, too many redirects, or invalid redirect targets'
      })
    }

    // Not in sitemap
    if (!inspection.sitemap || inspection.sitemap.length === 0) {
      fixes.push({
        type: 'not_in_sitemap',
        severity: 'medium',
        title: 'URL not in sitemap',
        description: 'This URL is not listed in any submitted sitemap',
        fix: 'Add this URL to your sitemap.xml if you want it indexed'
      })
    }

    // No internal links
    if (!inspection.referringUrls || inspection.referringUrls.length === 0) {
      fixes.push({
        type: 'orphan_page',
        severity: 'medium',
        title: 'Orphan page (no internal links)',
        description: 'Google found no internal links pointing to this page',
        fix: 'Add internal links from other pages to improve discoverability'
      })
    }
  }

  return fixes
}

/**
 * Analyze pages for common indexing issues
 */
function analyzeIndexingIssues(pages, domain) {
  const issues = {
    serverErrors: [],
    notFound: [],
    redirects: [],
    softErrors: [],
    noindex: [],
    canonicalIssues: [],
    crawlErrors: [],
    notInSitemap: [],
    missingMeta: []
  }

  for (const page of pages) {
    // Crawl errors
    if (page.crawl_status === 'error') {
      if (page.http_status >= 500) {
        issues.serverErrors.push({ url: page.url, status: page.http_status })
      } else if (page.http_status === 404) {
        issues.notFound.push({ url: page.url })
      } else if (page.http_status >= 300 && page.http_status < 400) {
        issues.redirects.push({ url: page.url, status: page.http_status })
      }
    }

    // Indexing issues
    if (page.indexing_verdict === 'NEUTRAL' || page.indexing_status === 'not_indexed') {
      if (page.has_noindex) {
        issues.noindex.push({ url: page.url })
      }
    }

    // Canonical issues
    if (page.canonical_url && page.canonical_url !== page.url) {
      issues.canonicalIssues.push({
        url: page.url,
        canonical: page.canonical_url
      })
    }

    // Missing metadata
    if (!page.title || !page.meta_description) {
      issues.missingMeta.push({
        url: page.url,
        missingTitle: !page.title,
        missingDescription: !page.meta_description
      })
    }
  }

  return issues
}

/**
 * Generate bulk recommendations based on issues
 */
function generateBulkRecommendations(issues) {
  const recommendations = []

  if (issues.serverErrors.length > 0) {
    recommendations.push({
      priority: 'critical',
      type: 'server_errors',
      title: `Fix ${issues.serverErrors.length} server errors (5xx)`,
      description: 'Server errors prevent Google from crawling your pages. These need immediate attention.',
      affectedUrls: issues.serverErrors.slice(0, 10).map(i => i.url),
      action: 'Check server logs, fix application errors, and ensure stable hosting'
    })
  }

  if (issues.notFound.length > 0) {
    recommendations.push({
      priority: 'high',
      type: 'not_found',
      title: `Fix ${issues.notFound.length} broken pages (404)`,
      description: 'These pages return 404 errors but may have backlinks or internal links.',
      affectedUrls: issues.notFound.slice(0, 10).map(i => i.url),
      action: 'Restore pages, set up 301 redirects, or remove internal links to these URLs'
    })
  }

  if (issues.redirects.length > 0) {
    recommendations.push({
      priority: 'medium',
      type: 'redirects',
      title: `Review ${issues.redirects.length} redirect pages`,
      description: 'These pages redirect to other URLs. Ensure redirects are intentional.',
      affectedUrls: issues.redirects.slice(0, 10).map(i => i.url),
      action: 'Update internal links to point to final URLs, remove unnecessary redirects'
    })
  }

  if (issues.canonicalIssues.length > 0) {
    recommendations.push({
      priority: 'medium',
      type: 'canonical_issues',
      title: `Review ${issues.canonicalIssues.length} canonical tag issues`,
      description: 'Pages with canonical tags pointing elsewhere may not be indexed.',
      affectedUrls: issues.canonicalIssues.slice(0, 10).map(i => i.url),
      action: 'Ensure canonical tags are correct and intentional'
    })
  }

  if (issues.missingMeta.length > 0) {
    recommendations.push({
      priority: 'medium',
      type: 'missing_meta',
      title: `Add metadata to ${issues.missingMeta.length} pages`,
      description: 'Pages missing title or meta description may have lower CTR in search results.',
      affectedUrls: issues.missingMeta.slice(0, 10).map(i => i.url),
      action: 'Add unique, descriptive title tags and meta descriptions'
    })
  }

  return recommendations
}
