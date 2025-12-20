// netlify/functions/seo-crawl-page.js
// Crawl a single page to extract metadata and content
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import * as cheerio from 'cheerio'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
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

    const { pageId, url } = JSON.parse(event.body || '{}')

    if (!pageId && !url) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Page ID or URL is required' }) }
    }

    const supabase = createSupabaseAdmin()
    let page = null
    let targetUrl = url

    if (pageId) {
      const { data, error } = await supabase
        .from('seo_pages')
        .select('*, site:seo_sites!seo_pages_site_id_fkey(domain)')
        .eq('id', pageId)
        .single()

      if (error || !data) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Page not found' }) }
      }

      page = data
      targetUrl = page.url
    }

    // Fetch the page
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'UptradeBot/1.0 (SEO Crawler)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      redirect: 'follow'
    })

    if (!response.ok) {
      const errorMsg = `Failed to fetch page: ${response.status} ${response.statusText}`
      
      if (page) {
        await supabase
          .from('seo_pages')
          .update({
            index_status: response.status === 404 ? 'not-indexed' : 'unknown',
            last_crawled_at: new Date().toISOString()
          })
          .eq('id', pageId)
      }

      return { statusCode: 400, headers, body: JSON.stringify({ error: errorMsg }) }
    }

    const html = await response.text()
    const crawlData = extractPageData(html, targetUrl)

    // Update the page
    if (page) {
      const { error: updateError } = await supabase
        .from('seo_pages')
        .update({
          title: crawlData.title,
          title_length: crawlData.titleLength,
          meta_description: crawlData.metaDescription,
          meta_description_length: crawlData.metaDescriptionLength,
          h1: crawlData.h1,
          h1_count: crawlData.h1Count,
          canonical_url: crawlData.canonicalUrl,
          robots_meta: crawlData.robotsMeta,
          word_count: crawlData.wordCount,
          internal_links_out: crawlData.internalLinksOut,
          external_links: crawlData.externalLinks,
          images_count: crawlData.imagesCount,
          images_without_alt: crawlData.imagesWithoutAlt,
          has_schema: crawlData.hasSchema,
          schema_types: crawlData.schemaTypes,
          last_crawled_at: new Date().toISOString()
        })
        .eq('id', pageId)

      if (updateError) {
        console.error('[seo-crawl-page] Update error:', updateError)
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Page crawled successfully',
        data: crawlData
      })
    }
  } catch (err) {
    console.error('[seo-crawl-page] Error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || 'Internal server error' }) }
  }
}

function extractPageData(html, url) {
  const $ = cheerio.load(html)
  const baseUrl = new URL(url).origin
  const urlHost = new URL(url).hostname.replace(/^www\./, '')

  // Extract title
  const title = $('title').first().text().trim()

  // Extract meta description
  const metaDescription = $('meta[name="description"]').attr('content')?.trim() || 
                          $('meta[property="og:description"]').attr('content')?.trim() || ''

  // Extract H1s
  const h1s = $('h1').map((_, el) => $(el).text().trim()).get()
  const h1 = h1s[0] || ''
  const h1Count = h1s.length

  // Extract canonical
  const canonicalUrl = $('link[rel="canonical"]').attr('href') || ''

  // Extract robots meta
  const robotsMeta = $('meta[name="robots"]').attr('content') || ''

  // Count words in body text
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim()
  const wordCount = bodyText.split(/\s+/).filter(w => w.length > 0).length

  // Count links
  let internalLinksOut = 0
  let externalLinks = 0

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
      return
    }

    try {
      const linkUrl = new URL(href, url)
      const linkHost = linkUrl.hostname.replace(/^www\./, '')
      
      if (linkHost === urlHost) {
        internalLinksOut++
      } else {
        externalLinks++
      }
    } catch {
      // Relative URL
      internalLinksOut++
    }
  })

  // Count images
  const images = $('img')
  const imagesCount = images.length
  const imagesWithoutAlt = images.filter((_, el) => {
    const alt = $(el).attr('alt')
    return !alt || alt.trim() === ''
  }).length

  // Extract schema.org data
  const schemaScripts = $('script[type="application/ld+json"]')
  const schemaTypes = []
  let hasSchema = false

  schemaScripts.each((_, el) => {
    try {
      const json = JSON.parse($(el).html())
      hasSchema = true
      
      if (json['@type']) {
        const types = Array.isArray(json['@type']) ? json['@type'] : [json['@type']]
        schemaTypes.push(...types)
      }
      
      // Handle @graph
      if (json['@graph']) {
        json['@graph'].forEach(item => {
          if (item['@type']) {
            const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']]
            schemaTypes.push(...types)
          }
        })
      }
    } catch {
      // Invalid JSON
    }
  })

  return {
    title,
    titleLength: title.length,
    metaDescription,
    metaDescriptionLength: metaDescription.length,
    h1,
    h1Count,
    canonicalUrl,
    robotsMeta,
    wordCount,
    internalLinksOut,
    externalLinks,
    imagesCount,
    imagesWithoutAlt,
    hasSchema,
    schemaTypes: [...new Set(schemaTypes)]
  }
}
