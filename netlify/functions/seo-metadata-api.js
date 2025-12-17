/**
 * SEO Metadata API - Public endpoint for main site build
 * 
 * Called by uptrademedia.com at build time to fetch optimized metadata.
 * No authentication required - returns managed metadata only.
 * 
 * Endpoints:
 * - GET ?domain=uptrademedia.com - Get all managed metadata for domain
 * - GET ?domain=uptrademedia.com&path=/design/web-design/ - Get specific page
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    // Cache for 1 hour, stale-while-revalidate for 1 day
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { domain, path } = event.queryStringParameters || {}

    if (!domain) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'domain parameter is required' })
      }
    }

    // Clean domain (remove protocol if present)
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')

    // Find the site
    const { data: site, error: siteError } = await supabase
      .from('seo_sites')
      .select('id, domain, site_name')
      .eq('domain', cleanDomain)
      .single()

    if (siteError || !site) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Site not found', domain: cleanDomain })
      }
    }

    // Build query for pages
    let query = supabase
      .from('seo_pages')
      .select(`
        path,
        url,
        title,
        meta_description,
        managed_title,
        managed_meta_description,
        managed_canonical_url,
        managed_robots_meta,
        managed_schema,
        target_keywords,
        h1,
        seo_health_score,
        metadata_published_at
      `)
      .eq('site_id', site.id)

    // If specific path requested, filter to that page
    if (path) {
      const cleanPath = path.startsWith('/') ? path : `/${path}`
      query = query.eq('path', cleanPath)
    }

    const { data: pages, error: pagesError } = await query

    if (pagesError) {
      console.error('[seo-metadata-api] Error fetching pages:', pagesError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch pages' })
      }
    }

    // Transform to a path-keyed object for easy lookup
    const metadata = {}
    
    for (const page of pages || []) {
      // Use managed values if available, otherwise fall back to detected
      metadata[page.path] = {
        path: page.path,
        url: page.url,
        // Use managed metadata if available, else original
        title: page.managed_title || page.title,
        metaDescription: page.managed_meta_description || page.meta_description,
        canonicalUrl: page.managed_canonical_url,
        robotsMeta: page.managed_robots_meta,
        schema: page.managed_schema,
        // Additional data
        targetKeywords: page.target_keywords,
        h1: page.h1,
        healthScore: page.seo_health_score,
        // Indicate if using managed values
        isOptimized: !!(page.managed_title || page.managed_meta_description),
        publishedAt: page.metadata_published_at
      }
    }

    // If specific path requested, return just that page
    if (path) {
      const cleanPath = path.startsWith('/') ? path : `/${path}`
      const pageData = metadata[cleanPath]
      
      if (!pageData) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Page not found', path: cleanPath })
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          site: { domain: site.domain, name: site.site_name },
          page: pageData
        })
      }
    }

    // Return all pages
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        site: { domain: site.domain, name: site.site_name },
        pageCount: Object.keys(metadata).length,
        pages: metadata,
        // Provide array format too for iteration
        pagesList: Object.values(metadata)
      })
    }

  } catch (err) {
    console.error('[seo-metadata-api] Error:', err)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
