// netlify/functions/seo-gsc-indexing-background.mjs
// Background function to inspect URLs via GSC URL Inspection API
// Enhanced to find ALL not-indexed URLs from GSC, not just tracked pages
// Uses parallel requests for speed (5 concurrent)
import { createSupabaseAdmin } from './utils/supabase.js'
import { googleApiRequest } from './utils/google-auth.js'

// API endpoints
const URL_INSPECTION_API = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect'
const GSC_API_BASE = 'https://searchconsole.googleapis.com/webmasters/v3'

// Concurrency settings
const CONCURRENT_REQUESTS = 5
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

/**
 * Sleep helper
 */
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

/**
 * Get all URLs from GSC Search Analytics (pages that have impressions)
 */
async function getAllGscUrls(siteUrl) {
  const urls = new Set()
  
  // Get last 90 days of data to find all pages GSC knows about
  const endDate = new Date()
  endDate.setDate(endDate.getDate() - 3) // 3-day lag
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - 90)
  
  const url = `${GSC_API_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`
  
  // Paginate through all pages
  for (let startRow = 0; startRow < 5000; startRow += 1000) {
    try {
      const data = await googleApiRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          dimensions: ['page'],
          rowLimit: 1000,
          startRow
        })
      })
      
      if (!data.rows?.length) break
      
      data.rows.forEach(row => {
        if (row.keys?.[0]) {
          urls.add(row.keys[0])
        }
      })
      
      if (data.rows.length < 1000) break
    } catch (error) {
      console.error(`[GSC Indexing] Error fetching pages:`, error.message)
      break
    }
  }
  
  return Array.from(urls)
}

/**
 * Inspect a single URL via GSC API with retry logic
 */
async function inspectUrl(siteUrl, pageUrl, retries = 0) {
  try {
    const result = await googleApiRequest(URL_INSPECTION_API, {
      method: 'POST',
      body: JSON.stringify({
        inspectionUrl: pageUrl,
        siteUrl: siteUrl
      })
    })
    
    return result.inspectionResult
  } catch (error) {
    // Retry on rate limit (429) or transient errors
    if ((error.status === 429 || error.status >= 500) && retries < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * Math.pow(2, retries) // Exponential backoff
      console.log(`[GSC Indexing] Rate limited on ${pageUrl}, retrying in ${delay}ms...`)
      await sleep(delay)
      return inspectUrl(siteUrl, pageUrl, retries + 1)
    }
    
    console.error(`[GSC Indexing] Error inspecting ${pageUrl}:`, error.message)
    return null
  }
}

/**
 * Process URLs in parallel batches
 */
async function inspectUrlsBatch(siteUrl, urls, onProgress) {
  const results = []
  
  for (let i = 0; i < urls.length; i += CONCURRENT_REQUESTS) {
    const batch = urls.slice(i, i + CONCURRENT_REQUESTS)
    
    // Run batch concurrently
    const batchResults = await Promise.all(
      batch.map(async (url) => {
        const inspection = await inspectUrl(siteUrl, url)
        return { url, inspection }
      })
    )
    
    results.push(...batchResults)
    
    // Report progress
    if (onProgress) {
      onProgress(i + batch.length, urls.length)
    }
  }
  
  return results
}

/**
 * Update job status
 */
async function updateJobStatus(supabase, jobId, status, data = {}) {
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
 * Generate fixes based on inspection result
 */
function generateFixes(inspection, pageUrl) {
  const fixes = []
  const indexingState = inspection?.indexStatusResult?.indexingState
  const verdict = inspection?.indexStatusResult?.verdict
  const robotsTxtState = inspection?.indexStatusResult?.robotsTxtState
  const crawledAs = inspection?.indexStatusResult?.crawledAs
  const pageFetchState = inspection?.indexStatusResult?.pageFetchState
  
  // Not indexed
  if (verdict !== 'PASS') {
    // Robots.txt blocking
    if (robotsTxtState === 'DISALLOWED') {
      fixes.push({
        type: 'robots_blocking',
        severity: 'critical',
        title: 'Page blocked by robots.txt',
        description: `The URL is blocked by robots.txt`,
        fix: 'Update robots.txt to allow crawling of this URL'
      })
    }
    
    // Noindex tag
    if (indexingState === 'NOINDEX') {
      fixes.push({
        type: 'noindex_tag',
        severity: 'critical',
        title: 'Page has noindex directive',
        description: 'This page has a noindex meta tag or X-Robots-Tag header',
        fix: 'Remove noindex directive if this page should be indexed'
      })
    }
    
    // Crawl errors
    if (pageFetchState === 'SOFT_404') {
      fixes.push({
        type: 'soft_404',
        severity: 'high',
        title: 'Soft 404 detected',
        description: 'Page returns 200 but Google considers it a soft 404',
        fix: 'Add substantial content or return proper 404 status'
      })
    }
    
    if (pageFetchState === 'REDIRECT') {
      fixes.push({
        type: 'redirect',
        severity: 'medium',
        title: 'Page redirects',
        description: 'This URL redirects to another page',
        fix: 'Update internal links to point to final URL'
      })
    }
    
    // Not crawled yet
    if (indexingState === 'DISCOVERED_CURRENTLY_NOT_INDEXED' || 
        indexingState === 'CRAWLED_CURRENTLY_NOT_INDEXED') {
      fixes.push({
        type: 'not_indexed',
        severity: 'medium',
        title: 'Page discovered but not indexed',
        description: 'Google has found this page but not added it to the index',
        fix: 'Improve content quality, add internal links, or request indexing'
      })
    }
  }
  
  return fixes
}

/**
 * Main handler
 */
export async function handler(event) {
  console.log('[GSC Indexing BG] Starting comprehensive indexing check')
  
  const supabase = createSupabaseAdmin()
  
  try {
    const body = JSON.parse(event.body || '{}')
    const { jobId, siteId } = body
    
    if (!jobId || !siteId) {
      console.error('[GSC Indexing BG] Missing jobId or siteId')
      return { statusCode: 400 }
    }
    
    await updateJobStatus(supabase, jobId, 'processing', { progress: 5 })
    
    // Get site info
    const { data: site, error: siteError } = await supabase
      .from('seo_sites')
      .select('*')
      .eq('id', siteId)
      .single()
    
    if (siteError || !site) {
      await updateJobStatus(supabase, jobId, 'failed', { error: 'Site not found' })
      return { statusCode: 404 }
    }
    
    const siteUrl = site.gsc_property_url || `sc-domain:${site.domain}`
    console.log(`[GSC Indexing BG] Fetching ALL URLs from GSC for ${siteUrl}`)
    
    // Step 1: Get ALL URLs from GSC Search Analytics (90 days)
    await updateJobStatus(supabase, jobId, 'processing', { progress: 10 })
    const gscUrls = await getAllGscUrls(siteUrl)
    console.log(`[GSC Indexing BG] Found ${gscUrls.length} URLs in GSC`)
    
    // Step 2: Get tracked pages from our DB
    const { data: trackedPages } = await supabase
      .from('seo_pages')
      .select('id, url')
      .eq('site_id', siteId)
    
    const trackedUrls = new Set((trackedPages || []).map(p => p.url))
    const trackedUrlMap = new Map((trackedPages || []).map(p => [p.url, p.id]))
    
    // Combine all URLs: tracked pages + GSC pages
    const allUrls = new Set([...trackedUrls, ...gscUrls])
    const urlsToInspect = Array.from(allUrls)
    
    // Limit to 200 URLs per run (URL Inspection API has quotas)
    const maxUrls = 200
    const urlBatch = urlsToInspect.slice(0, maxUrls)
    
    console.log(`[GSC Indexing BG] Will inspect ${urlBatch.length} URLs (${urlsToInspect.length} total known)`)
    await updateJobStatus(supabase, jobId, 'processing', { progress: 15 })
    
    const results = {
      indexed: [],
      notIndexed: [],
      orphanNotIndexed: [], // URLs in GSC but not in our DB
      errors: [],
      issues: []
    }
    
    // Inspect URLs in parallel batches (5 concurrent)
    console.log(`[GSC Indexing BG] Starting parallel inspection (${CONCURRENT_REQUESTS} concurrent)`)
    
    const inspectionResults = await inspectUrlsBatch(siteUrl, urlBatch, async (completed, total) => {
      const progress = Math.round(15 + (completed / total) * 75)
      if (completed % 20 === 0 || completed === total) {
        await updateJobStatus(supabase, jobId, 'processing', { progress })
        console.log(`[GSC Indexing BG] Progress: ${progress}% (${completed}/${total})`)
      }
    })
    
    // Process all inspection results
    for (const { url: pageUrl, inspection } of inspectionResults) {
      const isTracked = trackedUrls.has(pageUrl)
      const pageId = trackedUrlMap.get(pageUrl)
      
      if (!inspection) {
        results.errors.push({ url: pageUrl, error: 'Inspection failed' })
        continue
      }
      
      const indexingState = inspection.indexStatusResult?.indexingState
      const verdict = inspection.indexStatusResult?.verdict
      const robotsTxtState = inspection.indexStatusResult?.robotsTxtState
      const pageFetchState = inspection.indexStatusResult?.pageFetchState
      const lastCrawlTime = inspection.indexStatusResult?.lastCrawlTime
      const crawledAs = inspection.indexStatusResult?.crawledAs
      
      // Categorize result
      if (verdict === 'PASS') {
        results.indexed.push({
          url: pageUrl,
          lastCrawl: lastCrawlTime,
          crawledAs: crawledAs,
          isTracked
        })
        
        // Update tracked page if we have it
        if (pageId) {
          await supabase
            .from('seo_pages')
            .update({
              indexing_status: 'INDEXED',
              last_indexed_at: lastCrawlTime || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', pageId)
        }
      } else {
        // NOT INDEXED - determine reason
        let reason = 'Unknown'
        let recommendation = 'Investigate this URL'
        
        if (robotsTxtState === 'DISALLOWED') {
          reason = 'Blocked by robots.txt'
          recommendation = 'Update robots.txt to allow crawling, or remove this URL if intentional'
        } else if (indexingState === 'NOINDEX') {
          reason = 'Has noindex directive'
          recommendation = 'Remove noindex tag if this page should be indexed'
        } else if (pageFetchState === 'SOFT_404') {
          reason = 'Soft 404 - thin content'
          recommendation = 'Add substantial content or return proper 404'
        } else if (pageFetchState === 'REDIRECT') {
          reason = 'Redirects to another URL'
          recommendation = 'Update internal links to point to final URL, or remove from sitemap'
        } else if (indexingState === 'DISCOVERED_CURRENTLY_NOT_INDEXED') {
          reason = 'Discovered but not indexed'
          recommendation = 'Improve content quality, add internal links, or consider removal'
        } else if (indexingState === 'CRAWLED_CURRENTLY_NOT_INDEXED') {
          reason = 'Crawled but not indexed'
          recommendation = 'Content deemed low quality - improve or remove'
        } else if (pageFetchState === 'NOT_FOUND') {
          reason = '404 Not Found'
          recommendation = 'Remove URL from sitemap and request removal from index'
        }
        
        const notIndexedEntry = {
          url: pageUrl,
          state: indexingState,
          verdict: verdict,
          reason,
          recommendation,
          isTracked,
          lastCrawl: lastCrawlTime
        }
        
        if (isTracked) {
          results.notIndexed.push(notIndexedEntry)
          
          // Update tracked page
          if (pageId) {
            await supabase
              .from('seo_pages')
              .update({
                indexing_status: indexingState,
                last_indexed_at: lastCrawlTime || null,
                updated_at: new Date().toISOString()
              })
              .eq('id', pageId)
          }
        } else {
          results.orphanNotIndexed.push(notIndexedEntry)
        }
        
        // Save to seo_not_indexed_urls table for tracking/removal
        await supabase
          .from('seo_not_indexed_urls')
          .upsert({
            site_id: siteId,
            url: pageUrl,
            discovered_from: isTracked ? 'tracked_pages' : 'gsc_analytics',
            indexing_state: indexingState,
            verdict: verdict,
            last_crawl_time: lastCrawlTime,
            crawled_as: crawledAs,
            robots_txt_state: robotsTxtState,
            page_fetch_state: pageFetchState,
            reason,
            recommendation,
            last_checked_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { 
            onConflict: 'site_id,url',
            ignoreDuplicates: false 
          })
        
        // Generate fixes for issues summary
        const fixes = generateFixes(inspection, pageUrl)
        fixes.forEach(fix => {
          const existing = results.issues.find(i => i.type === fix.type)
          if (existing) {
            existing.urls.push(pageUrl)
            existing.count++
          } else {
            results.issues.push({
              type: fix.type,
              severity: fix.severity,
              title: fix.title,
              description: fix.description,
              fix: fix.fix,
              urls: [pageUrl],
              count: 1
            })
          }
        })
      }
    }
    
    console.log(`[GSC Indexing BG] Completed: ${results.indexed.length} indexed, ${results.notIndexed.length} tracked not indexed, ${results.orphanNotIndexed.length} orphan not indexed`)
    
    // Complete job with comprehensive results
    await updateJobStatus(supabase, jobId, 'completed', {
      progress: 100,
      result: {
        urlsInspected: urlBatch.length,
        totalUrlsKnown: urlsToInspect.length,
        indexed: results.indexed.length,
        notIndexed: results.notIndexed.length,
        orphanNotIndexed: results.orphanNotIndexed.length,
        errors: results.errors.length,
        issues: results.issues.sort((a, b) => {
          const severity = { critical: 0, high: 1, medium: 2, low: 3 }
          return (severity[a.severity] || 4) - (severity[b.severity] || 4)
        }),
        // Include sample not-indexed URLs for display
        sampleNotIndexed: results.notIndexed.slice(0, 10),
        sampleOrphanNotIndexed: results.orphanNotIndexed.slice(0, 20)
      }
    })
    
    console.log('[GSC Indexing BG] Job completed:', jobId)
    return { statusCode: 200 }
    
  } catch (error) {
    console.error('[GSC Indexing BG] Error:', error)
    
    try {
      const body = JSON.parse(event.body || '{}')
      if (body.jobId) {
        await updateJobStatus(supabase, body.jobId, 'failed', { error: error.message })
      }
    } catch (e) {}
    
    return { statusCode: 500 }
  }
}
