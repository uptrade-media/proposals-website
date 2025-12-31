/**
 * SEO Crawl Sitemap Background Function
 * 
 * Crawls sitemap(s) and processes all URLs.
 * Background functions can run up to 15 minutes.
 * 
 * For sites with large sitemaps (500+ pages), this prevents timeout.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req) {
  console.log('[seo-crawl-sitemap-background] Starting...')

  try {
    const { siteId, sitemapUrl, jobId } = await req.json()

    if (!siteId) {
      return new Response(JSON.stringify({ error: 'siteId required' }), { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Update job status if jobId provided
    if (jobId) {
      await supabase
        .from('seo_background_jobs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', jobId)
    }

    // Fetch site
    const { data: site, error: siteError } = await supabase
      .from('seo_sites')
      .select('*')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      throw new Error('Site not found')
    }

    const targetSitemapUrl = sitemapUrl || site.sitemap_url
    if (!targetSitemapUrl) {
      throw new Error('No sitemap URL configured')
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

    console.log(`[seo-crawl-sitemap-background] Fetching sitemap: ${targetSitemapUrl}`)

    // Fetch and parse sitemap(s) - with higher limits for background function
    const urls = await fetchSitemapRecursive(targetSitemapUrl, site.domain, 20)

    console.log(`[seo-crawl-sitemap-background] Found ${urls.length} URLs`)

    if (urls.length === 0) {
      await supabase
        .from('seo_crawl_log')
        .update({
          status: 'failed',
          errors: [{ message: 'No URLs found in sitemap' }],
          completed_at: new Date().toISOString()
        })
        .eq('id', crawlLog.id)

      throw new Error('No URLs found in sitemap')
    }

    // Get existing pages for this site
    const { data: existingPages } = await supabase
      .from('seo_pages')
      .select('url')
      .eq('site_id', siteId)

    const existingUrls = new Set(existingPages?.map(p => p.url) || [])

    // Check for dynamic content (blog posts, portfolio) that should be in seo_pages
    const dynamicUrls = []
    
    // Add published blog posts URLs
    const { data: blogPosts } = await supabase
      .from('blog_posts')
      .select('slug')
      .eq('status', 'published')
      .not('slug', 'is', null)
    
    if (blogPosts?.length > 0) {
      blogPosts.forEach(post => {
        const blogUrl = `https://${site.domain}/insights/${post.slug}`
        if (!existingUrls.has(blogUrl)) {
          dynamicUrls.push(blogUrl)
        }
      })
      console.log(`[seo-crawl-sitemap-background] Found ${blogPosts.length} blog posts, ${dynamicUrls.length} not in seo_pages`)
    }
    
    // Add portfolio items URLs
    const { data: portfolioItems } = await supabase
      .from('portfolio_items')
      .select('slug')
      .eq('status', 'published')
      .not('slug', 'is', null)
    
    if (portfolioItems?.length > 0) {
      portfolioItems.forEach(item => {
        const portfolioUrl = `https://${site.domain}/portfolio/${item.slug}`
        if (!existingUrls.has(portfolioUrl)) {
          dynamicUrls.push(portfolioUrl)
        }
      })
      console.log(`[seo-crawl-sitemap-background] Found ${portfolioItems.length} portfolio items`)
    }

    // Combine sitemap URLs with dynamic content URLs
    const allUrls = [...urls, ...dynamicUrls]
    console.log(`[seo-crawl-sitemap-background] Total URLs: ${allUrls.length} (${urls.length} from sitemap, ${dynamicUrls.length} from database)`)

    // Prepare new pages
    const newPages = allUrls
      .filter(url => !existingUrls.has(url))
      .map(url => ({
        site_id: siteId,
        url: url,
        path: new URL(url).pathname,
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
          console.error('[seo-crawl-sitemap-background] Insert error:', insertError)
        } else {
          pagesCreated += batch.length
        }
        
        console.log(`[seo-crawl-sitemap-background] Inserted batch ${i / 100 + 1}, ${pagesCreated} total`)
      }
    }

    // Update crawl log
    await supabase
      .from('seo_crawl_log')
      .update({
        status: 'completed',
        pages_found: allUrls.length,
        pages_crawled: allUrls.length,
        pages_updated: pagesCreated,
        completed_at: new Date().toISOString()
      })
      .eq('id', crawlLog.id)

    const result = {
      message: 'Sitemap crawl completed',
      urlsFound: allUrls.length,
      sitemapUrls: urls.length,
      dynamicUrls: dynamicUrls.length,
      pagesCreated,
      pagesAlreadyExist: allUrls.length - pagesCreated
    }

    // Update job status
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

    console.log('[seo-crawl-sitemap-background] Completed:', result)

    return new Response(JSON.stringify(result), { status: 200 })

  } catch (err) {
    console.error('[seo-crawl-sitemap-background] Error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}

// Recursively fetch sitemaps with higher limit for background
async function fetchSitemapRecursive(sitemapUrl, domain, maxSubSitemaps = 20) {
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
    
    // Simple XML parsing (avoiding heavy dependencies)
    // Handle sitemap index
    const sitemapMatches = xml.match(/<sitemap>[\s\S]*?<loc>(.*?)<\/loc>[\s\S]*?<\/sitemap>/gi)
    if (sitemapMatches && sitemapMatches.length > 0) {
      const sitemapUrls = sitemapMatches
        .map(m => {
          const locMatch = m.match(/<loc>(.*?)<\/loc>/i)
          return locMatch ? locMatch[1].trim() : null
        })
        .filter(Boolean)
      
      console.log(`[seo-crawl-sitemap-background] Found ${sitemapUrls.length} sub-sitemaps`)
      
      // Recursively fetch each sitemap
      for (const subSitemapUrl of sitemapUrls.slice(0, maxSubSitemaps)) {
        try {
          const subUrls = await fetchSitemapRecursive(subSitemapUrl, domain, 0)
          urls.push(...subUrls)
        } catch (e) {
          console.error(`[seo-crawl-sitemap-background] Error fetching ${subSitemapUrl}:`, e.message)
        }
      }
    }

    // Handle regular sitemap URLs
    const urlMatches = xml.match(/<url>[\s\S]*?<loc>(.*?)<\/loc>[\s\S]*?<\/url>/gi)
    if (urlMatches) {
      const pageUrls = urlMatches
        .map(m => {
          const locMatch = m.match(/<loc>(.*?)<\/loc>/i)
          return locMatch ? locMatch[1].trim() : null
        })
        .filter(Boolean)
        .filter(url => {
          try {
            const urlDomain = new URL(url).hostname.replace(/^www\./, '')
            return urlDomain === domain.replace(/^www\./, '')
          } catch {
            return false
          }
        })

      urls.push(...pageUrls)
    }
  } catch (err) {
    console.error(`[fetchSitemap] Error fetching ${sitemapUrl}:`, err.message)
  }

  return [...new Set(urls)] // Deduplicate
}

export const config = {
  type: 'background'
}
