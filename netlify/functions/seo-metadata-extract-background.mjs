/**
 * SEO Metadata Extract - Background Function
 * 
 * Crawls a website's sitemap and extracts all existing metadata
 * into the seo_pages table. This is the initial data population
 * before AI optimization begins.
 * 
 * Features:
 * - Fetches and parses sitemap.xml
 * - Extracts title, meta description, h1, canonical, schema
 * - Calculates initial SEO health scores
 * - Creates seo_pages records for each URL
 */

import { createClient } from '@supabase/supabase-js'

// Background function config - 15 min timeout
export const config = {
  type: 'background'
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Parse sitemap XML to extract URLs
 */
async function parseSitemap(sitemapUrl) {
  const response = await fetch(sitemapUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch sitemap: ${response.status}`)
  }

  const xml = await response.text()
  const urls = []

  // Handle sitemap index (multiple sitemaps)
  if (xml.includes('<sitemapindex')) {
    const sitemapMatches = xml.match(/<loc>([^<]+)<\/loc>/g) || []
    for (const match of sitemapMatches) {
      const childUrl = match.replace(/<\/?loc>/g, '')
      const childUrls = await parseSitemap(childUrl)
      urls.push(...childUrls)
    }
  } else {
    // Regular sitemap
    const urlMatches = xml.match(/<url>[\s\S]*?<\/url>/g) || []
    for (const urlBlock of urlMatches) {
      const locMatch = urlBlock.match(/<loc>([^<]+)<\/loc>/)
      const lastmodMatch = urlBlock.match(/<lastmod>([^<]+)<\/lastmod>/)
      const priorityMatch = urlBlock.match(/<priority>([^<]+)<\/priority>/)

      if (locMatch) {
        urls.push({
          url: locMatch[1],
          lastmod: lastmodMatch ? lastmodMatch[1] : null,
          priority: priorityMatch ? parseFloat(priorityMatch[1]) : null
        })
      }
    }
  }

  return urls
}

/**
 * Extract metadata from a page
 */
async function extractPageMetadata(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'UptradeSEOBot/1.0 (Metadata Extraction)'
      }
    })

    if (!response.ok) {
      return { error: `HTTP ${response.status}`, url }
    }

    const html = await response.text()

    // Extract title
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : null

    // Extract meta description
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i)
    const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : null

    // Extract canonical
    const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i)
      || html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["']/i)
    const canonicalUrl = canonicalMatch ? canonicalMatch[1] : null

    // Extract robots meta
    const robotsMatch = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["']/i)
    const robotsMeta = robotsMatch ? robotsMatch[1] : null

    // Extract H1
    const h1Match = html.match(/<h1[^>]*>([^<]*)<\/h1>/i)
    const h1 = h1Match ? h1Match[1].trim().replace(/<[^>]+>/g, '') : null

    // Count H1s
    const h1Count = (html.match(/<h1/gi) || []).length

    // Extract Open Graph
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i)
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i)
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i)

    // Extract schema.org JSON-LD
    const schemaMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || []
    const schemaTypes = []
    for (const match of schemaMatches) {
      try {
        const jsonMatch = match.match(/<script[^>]*>([\s\S]*?)<\/script>/i)
        if (jsonMatch) {
          const schema = JSON.parse(jsonMatch[1])
          if (schema['@type']) {
            schemaTypes.push(schema['@type'])
          }
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    }

    // Count links
    const internalLinksOut = (html.match(/href=["'][^"']*uptrademedia\.com[^"']*["']/gi) || []).length
    const externalLinks = (html.match(/href=["']https?:\/\/(?!uptrademedia\.com)[^"']+["']/gi) || []).length

    // Count images
    const imagesCount = (html.match(/<img/gi) || []).length
    const imagesWithoutAlt = (html.match(/<img(?![^>]*alt=["'][^"']+["'])[^>]*>/gi) || []).length

    // Estimate word count (strip HTML, count words)
    const textContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const wordCount = textContent.split(' ').filter(w => w.length > 0).length

    // Calculate basic SEO health score
    let healthScore = 50 // Base score
    if (title && title.length >= 30 && title.length <= 60) healthScore += 10
    if (metaDescription && metaDescription.length >= 120 && metaDescription.length <= 160) healthScore += 10
    if (h1 && h1Count === 1) healthScore += 10
    if (canonicalUrl) healthScore += 5
    if (schemaTypes.length > 0) healthScore += 10
    if (imagesWithoutAlt === 0 && imagesCount > 0) healthScore += 5

    return {
      url,
      title,
      titleLength: title?.length || 0,
      metaDescription,
      metaDescriptionLength: metaDescription?.length || 0,
      canonicalUrl,
      robotsMeta,
      h1,
      h1Count,
      ogTitle: ogTitleMatch ? ogTitleMatch[1] : null,
      ogDescription: ogDescMatch ? ogDescMatch[1] : null,
      ogImage: ogImageMatch ? ogImageMatch[1] : null,
      hasSchema: schemaTypes.length > 0,
      schemaTypes,
      wordCount,
      internalLinksOut,
      externalLinks,
      imagesCount,
      imagesWithoutAlt,
      seoHealthScore: Math.min(100, healthScore)
    }
  } catch (error) {
    return { error: error.message, url }
  }
}

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
 * Main extraction process
 */
async function extractSiteMetadata(jobId, siteId) {
  await updateJobStatus(jobId, 'processing', { progress: 5 })

  // Get site info
  const { data: site, error: siteError } = await supabase
    .from('seo_sites')
    .select('*')
    .eq('id', siteId)
    .single()

  if (siteError || !site) {
    throw new Error('Site not found')
  }

  const domain = site.domain
  const sitemapUrl = `https://${domain}/sitemap.xml`

  await updateJobStatus(jobId, 'processing', { progress: 10 })

  // Parse sitemap
  console.log(`[Metadata Extract] Fetching sitemap: ${sitemapUrl}`)
  const urls = await parseSitemap(sitemapUrl)
  console.log(`[Metadata Extract] Found ${urls.length} URLs`)

  await updateJobStatus(jobId, 'processing', { progress: 20 })

  const results = {
    total: urls.length,
    extracted: 0,
    created: 0,
    updated: 0,
    errors: 0,
    pages: []
  }

  // Process each URL
  for (let i = 0; i < urls.length; i++) {
    const { url, lastmod, priority } = urls[i]
    const progress = 20 + Math.floor((i / urls.length) * 70)

    if (i % 10 === 0) {
      await updateJobStatus(jobId, 'processing', { progress })
    }

    try {
      // Extract metadata
      const metadata = await extractPageMetadata(url)

      if (metadata.error) {
        results.errors++
        results.pages.push({ url, error: metadata.error })
        continue
      }

      results.extracted++

      // Parse path from URL
      const urlObj = new URL(url)
      const path = urlObj.pathname

      // Check if page exists
      const { data: existingPage } = await supabase
        .from('seo_pages')
        .select('id')
        .eq('site_id', siteId)
        .eq('path', path)
        .single()

      const pageData = {
        site_id: siteId,
        url,
        path,
        title: metadata.title,
        title_length: metadata.titleLength,
        meta_description: metadata.metaDescription,
        meta_description_length: metadata.metaDescriptionLength,
        h1: metadata.h1,
        h1_count: metadata.h1Count,
        canonical_url: metadata.canonicalUrl,
        robots_meta: metadata.robotsMeta,
        word_count: metadata.wordCount,
        internal_links_out: metadata.internalLinksOut,
        external_links: metadata.externalLinks,
        images_count: metadata.imagesCount,
        images_without_alt: metadata.imagesWithoutAlt,
        has_schema: metadata.hasSchema,
        schema_types: metadata.schemaTypes,
        seo_health_score: metadata.seoHealthScore,
        last_crawled_at: new Date().toISOString(),
        first_seen_at: existingPage ? undefined : new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      if (existingPage) {
        // Update existing
        await supabase
          .from('seo_pages')
          .update(pageData)
          .eq('id', existingPage.id)
        results.updated++
      } else {
        // Create new
        await supabase
          .from('seo_pages')
          .insert(pageData)
        results.created++
      }

      results.pages.push({
        url,
        path,
        title: metadata.title,
        healthScore: metadata.seoHealthScore,
        status: existingPage ? 'updated' : 'created'
      })

      // Small delay to avoid rate limiting
      if (i % 5 === 0) {
        await new Promise(r => setTimeout(r, 100))
      }

    } catch (err) {
      console.error(`[Metadata Extract] Error processing ${url}:`, err.message)
      results.errors++
      results.pages.push({ url, error: err.message })
    }
  }

  await updateJobStatus(jobId, 'completed', {
    result: {
      domain,
      sitemapUrl,
      ...results
    }
  })

  console.log(`[Metadata Extract] Completed: ${results.created} created, ${results.updated} updated, ${results.errors} errors`)
}

/**
 * Main handler
 */
export async function handler(event) {
  console.log('[SEO Metadata Extract] Starting job')

  try {
    const body = JSON.parse(event.body || '{}')
    const { jobId, siteId } = body

    if (!jobId || !siteId) {
      console.error('[SEO Metadata Extract] Missing jobId or siteId')
      return { statusCode: 400 }
    }

    await extractSiteMetadata(jobId, siteId)

    console.log('[SEO Metadata Extract] Job completed:', jobId)
    return { statusCode: 200 }

  } catch (error) {
    console.error('[SEO Metadata Extract] Error:', error)

    try {
      const body = JSON.parse(event.body || '{}')
      if (body.jobId) {
        await updateJobStatus(body.jobId, 'failed', { error: error.message })
      }
    } catch (e) {
      console.error('[SEO Metadata Extract] Failed to update job status:', e)
    }

    return { statusCode: 500 }
  }
}
