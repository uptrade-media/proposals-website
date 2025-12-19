// netlify/functions/seo-crawl-sitemap.js
// Crawl a sitemap and import pages
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { parseStringPromise } from 'xml2js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    // Only admins can crawl
    if (contact.role !== 'admin' && contact.role !== 'super_admin') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin access required' }) }
    }

    const { siteId, sitemapUrl } = JSON.parse(event.body || '{}')

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Site ID is required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Fetch site
    const { data: site, error: siteError } = await supabase
      .from('seo_sites')
      .select('*')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Site not found' }) }
    }

    const targetSitemapUrl = sitemapUrl || site.sitemap_url
    if (!targetSitemapUrl) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No sitemap URL configured' }) }
    }

    // Check if we should use background function
    // Use background for sites we expect to have many pages
    const useBackground = event.queryStringParameters?.background === 'true' || 
                          (site.total_pages && site.total_pages > 100)

    if (useBackground) {
      // Create job record
      const jobId = crypto.randomUUID()
      await supabase.from('seo_background_jobs').insert({
        id: jobId,
        site_id: siteId,
        job_type: 'crawl-sitemap',
        status: 'pending',
        payload: { siteId, sitemapUrl: targetSitemapUrl }
      })

      // Trigger background function (fire and forget)
      const baseUrl = process.env.URL || 'https://portal.uptrademedia.com'
      fetch(`${baseUrl}/.netlify/functions/seo-crawl-sitemap-background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, sitemapUrl: targetSitemapUrl, jobId })
      }).catch(err => console.error('[seo-crawl-sitemap] Background trigger error:', err))

      return {
        statusCode: 202,
        headers,
        body: JSON.stringify({ 
          success: true, 
          background: true,
          jobId,
          message: 'Sitemap crawl started in background',
          checkStatusUrl: `/.netlify/functions/seo-background-jobs?jobId=${jobId}`
        })
      }
    }

    // Create crawl log entry
    const { data: crawlLog } = await supabase
      .from('seo_crawl_log')
      .insert({
        site_id: siteId,
        crawl_type: 'sitemap',
        status: 'running'
      })
      .select()
      .single()

    // Fetch and parse sitemap
    const urls = await fetchSitemap(targetSitemapUrl, site.domain)

    if (urls.length === 0) {
      await supabase
        .from('seo_crawl_log')
        .update({
          status: 'failed',
          errors: [{ message: 'No URLs found in sitemap' }],
          completed_at: new Date().toISOString()
        })
        .eq('id', crawlLog.id)

      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No URLs found in sitemap' }) }
    }

    // Get existing pages for this site
    const { data: existingPages } = await supabase
      .from('seo_pages')
      .select('url')
      .eq('site_id', siteId)

    const existingUrls = new Set(existingPages?.map(p => p.url) || [])

    // Prepare new pages
    const newPages = urls
      .filter(url => !existingUrls.has(url))
      .map(url => ({
        site_id: siteId,
        url: url,
        path: new URL(url).pathname,
        discovery_source: 'sitemap', // From NextJS sitemap (source of truth)
        first_seen_at: new Date().toISOString()
      }))

    let pagesCreated = 0
    if (newPages.length > 0) {
      // Insert in batches of 100
      for (let i = 0; i < newPages.length; i += 100) {
        const batch = newPages.slice(i, i + 100)
        const { error: insertError } = await supabase
          .from('seo_pages')
          .insert(batch)

        if (insertError) {
          console.error('[seo-crawl-sitemap] Insert error:', insertError)
        } else {
          pagesCreated += batch.length
        }
      }
    }

    // Update crawl log
    await supabase
      .from('seo_crawl_log')
      .update({
        status: 'completed',
        pages_found: urls.length,
        pages_crawled: urls.length,
        pages_updated: pagesCreated,
        completed_at: new Date().toISOString()
      })
      .eq('id', crawlLog.id)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Sitemap crawl completed',
        urlsFound: urls.length,
        pagesCreated,
        pagesAlreadyExist: urls.length - pagesCreated
      })
    }
  } catch (err) {
    console.error('[seo-crawl-sitemap] Error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || 'Internal server error' }) }
  }
}

async function fetchSitemap(sitemapUrl, domain) {
  const urls = []
  
  try {
    const response = await fetch(sitemapUrl, {
      headers: {
        'User-Agent': 'UptradeBot/1.0 (SEO Crawler)'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch sitemap: ${response.status}`)
    }

    const xml = await response.text()
    const result = await parseStringPromise(xml)

    // Handle sitemap index (contains links to other sitemaps)
    if (result.sitemapindex) {
      const sitemapUrls = result.sitemapindex.sitemap
        ?.map(s => s.loc?.[0])
        .filter(Boolean) || []

      // Recursively fetch each sitemap (limit to first 5 to avoid timeout)
      for (const subSitemapUrl of sitemapUrls.slice(0, 5)) {
        const subUrls = await fetchSitemap(subSitemapUrl, domain)
        urls.push(...subUrls)
      }
    }

    // Handle regular sitemap
    if (result.urlset) {
      const pageUrls = result.urlset.url
        ?.map(u => u.loc?.[0])
        .filter(Boolean)
        .filter(url => {
          // Only include URLs from the same domain
          try {
            const urlDomain = new URL(url).hostname.replace(/^www\./, '')
            return urlDomain === domain.replace(/^www\./, '')
          } catch {
            return false
          }
        }) || []

      urls.push(...pageUrls)
    }
  } catch (err) {
    console.error(`[fetchSitemap] Error fetching ${sitemapUrl}:`, err.message)
  }

  return [...new Set(urls)] // Deduplicate
}
