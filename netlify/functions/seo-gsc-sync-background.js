// netlify/functions/seo-gsc-sync-background.js
// Background processing for GSC data sync
// Optimized with parallel API calls and batch DB operations
// Pulls: queries, pages, site metrics, sitemaps
import { createSupabaseAdmin } from './utils/supabase.js'
import { googleApiRequest } from './utils/google-auth.js'
import crypto from 'crypto'

const GSC_API_BASE = 'https://searchconsole.googleapis.com/webmasters/v3'

// Batch size for parallel DB operations
const DB_BATCH_SIZE = 50

export async function handler(event) {
  const { siteId, jobId } = JSON.parse(event.body || '{}')
  
  if (!siteId || !jobId) {
    console.error('[GSC Sync BG] Missing siteId or jobId')
    return { statusCode: 400 }
  }

  const supabase = createSupabaseAdmin()

  try {
    // Update job status to processing
    await supabase
      .from('seo_background_jobs')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', jobId)

    // Get site details
    const { data: site, error: siteError } = await supabase
      .from('seo_sites')
      .select('*')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      throw new Error(`Site not found: ${siteId}`)
    }

    // Check service account
    const { getGoogleServiceAccountCredentials } = await import('./utils/supabase.js')
    const creds = await getGoogleServiceAccountCredentials()
    const serviceAccountAvailable = !!(creds?.client_email && creds?.private_key)

    if (!serviceAccountAvailable) {
      throw new Error('GSC service account not configured')
    }

    const siteUrl = site.gsc_property_url || `sc-domain:${site.domain}`
    
    // Calculate date ranges
    const now = new Date()
    const endDate = new Date(now.setDate(now.getDate() - 3)) // 3-day lag
    
    // Current period: last 28 days
    const currentStart = new Date(endDate)
    currentStart.setDate(currentStart.getDate() - 28)
    
    // Previous period: 28 days before that (for comparison)
    const previousEnd = new Date(currentStart)
    previousEnd.setDate(previousEnd.getDate() - 1)
    const previousStart = new Date(previousEnd)
    previousStart.setDate(previousStart.getDate() - 28)

    const url = `${GSC_API_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`
    const sitemapsUrl = `${GSC_API_BASE}/sites/${encodeURIComponent(siteUrl)}/sitemaps`

    // PARALLEL: Fetch current & previous period totals + pages + sitemaps simultaneously
    console.log('[GSC Sync BG] Fetching totals, pages, and sitemaps in parallel...')
    const [currentData, previousData, pagesData, sitemapsData] = await Promise.all([
      googleApiRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          startDate: currentStart.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          dimensions: []
        })
      }),
      googleApiRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          startDate: previousStart.toISOString().split('T')[0],
          endDate: previousEnd.toISOString().split('T')[0],
          dimensions: []
        })
      }),
      // Get more pages - up to 1000
      googleApiRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          startDate: currentStart.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          dimensions: ['page'],
          rowLimit: 1000
        })
      }),
      // Get sitemaps
      googleApiRequest(sitemapsUrl, { method: 'GET' }).catch(err => {
        console.log('[GSC Sync BG] Sitemaps fetch failed (may not be configured):', err.message)
        return { sitemap: [] }
      })
    ])
    
    const topPages = pagesData.rows || []

    // Update progress: 20%
    await supabase
      .from('seo_background_jobs')
      .update({ progress: 20 })
      .eq('id', jobId)

    // PARALLEL: Fetch all query pages simultaneously (10 requests of 250 each = 2500 queries max)
    console.log('[GSC Sync BG] Fetching queries in parallel batches...')
    const queryPromises = [0, 250, 500, 750, 1000, 1250, 1500, 1750, 2000, 2250].map(startRow =>
      googleApiRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          startDate: currentStart.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          dimensions: ['query'],
          rowLimit: 250,
          startRow
        })
      }).catch(() => ({ rows: [] })) // Don't fail if a page is empty
    )
    
    const queryResults = await Promise.all(queryPromises)
    let allQueries = queryResults.flatMap(r => r.rows || [])
    console.log(`[GSC Sync BG] Fetched ${allQueries.length} total queries`)

    // Update progress: 50%
    await supabase
      .from('seo_background_jobs')
      .update({ progress: 50 })
      .eq('id', jobId)

    // Extract metrics
    const currentRow = currentData?.rows?.[0] || {}
    const previousRow = previousData?.rows?.[0] || {}

    // Process sitemaps data
    const sitemaps = (sitemapsData?.sitemap || []).map(sm => ({
      path: sm.path,
      lastSubmitted: sm.lastSubmitted,
      isPending: sm.isPending || false,
      isSitemapsIndex: sm.isSitemapsIndex || false,
      type: sm.type,
      lastDownloaded: sm.lastDownloaded,
      warnings: sm.warnings || 0,
      errors: sm.errors || 0,
      contents: sm.contents // Array of {type, submitted, indexed}
    }))
    console.log(`[GSC Sync BG] Found ${sitemaps.length} sitemaps`)

    // Update site metrics including sitemaps
    await supabase
      .from('seo_sites')
      .update({
        total_clicks_28d: Math.round(currentRow.clicks || 0),
        total_impressions_28d: Math.round(currentRow.impressions || 0),
        avg_position_28d: currentRow.position ? currentRow.position.toFixed(1) : null,
        avg_ctr_28d: currentRow.ctr ? (currentRow.ctr * 100).toFixed(2) : null,
        total_clicks_prev_28d: Math.round(previousRow.clicks || 0),
        total_impressions_prev_28d: Math.round(previousRow.impressions || 0),
        avg_position_prev_28d: previousRow.position ? previousRow.position.toFixed(1) : null,
        avg_ctr_prev_28d: previousRow.ctr ? (previousRow.ctr * 100).toFixed(2) : null,
        gsc_sitemaps: sitemaps,
        gsc_sitemaps_synced_at: new Date().toISOString(),
        gsc_last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', siteId)

    // Update progress: 60%
    await supabase
      .from('seo_background_jobs')
      .update({ progress: 60 })
      .eq('id', jobId)

    // Get existing pages for this site (single query instead of per-page)
    const { data: existingPages } = await supabase
      .from('seo_pages')
      .select('id, url')
      .eq('site_id', siteId)
    
    const existingPageMap = new Map((existingPages || []).map(p => [p.url, p.id]))

    // Prepare page upserts (batch insert new, batch update existing)
    const newPages = []
    const pageUpdates = []
    
    for (const pageData of topPages) {
      const pageUrl = pageData.keys[0]
      const existingId = existingPageMap.get(pageUrl)
      
      if (existingId) {
        pageUpdates.push({
          id: existingId,
          clicks_28d: Math.round(pageData.clicks || 0),
          impressions_28d: Math.round(pageData.impressions || 0),
          avg_position_28d: pageData.position?.toFixed(1) || null,
          last_gsc_sync_at: new Date().toISOString()
        })
      } else {
        let path = '/'
        let title = 'Unknown Page'
        try {
          const urlObj = new URL(pageUrl)
          path = urlObj.pathname
          title = path
            .replace(/\/$/, '')
            .split('/')
            .pop()
            ?.replace(/-/g, ' ')
            ?.replace(/\b\w/g, l => l.toUpperCase()) || site.domain
        } catch (e) {
          path = pageUrl
        }

        newPages.push({
          site_id: siteId,
          url: pageUrl,
          path,
          title,
          status: 'active',
          clicks_28d: Math.round(pageData.clicks || 0),
          impressions_28d: Math.round(pageData.impressions || 0),
          avg_position_28d: pageData.position?.toFixed(1) || null,
          last_gsc_sync_at: new Date().toISOString()
        })
      }
    }

    // Batch insert new pages
    let pagesCreated = 0
    if (newPages.length > 0) {
      const { data: insertedPages } = await supabase
        .from('seo_pages')
        .insert(newPages)
        .select('id, url')
      
      pagesCreated = insertedPages?.length || 0
      
      // Add to map for potential future use
      insertedPages?.forEach(p => existingPageMap.set(p.url, p.id))
    }

    // Batch update existing pages (in chunks to avoid query size limits)
    for (let i = 0; i < pageUpdates.length; i += DB_BATCH_SIZE) {
      const batch = pageUpdates.slice(i, i + DB_BATCH_SIZE)
      await Promise.all(batch.map(update =>
        supabase
          .from('seo_pages')
          .update({
            clicks_28d: update.clicks_28d,
            impressions_28d: update.impressions_28d,
            avg_position_28d: update.avg_position_28d,
            last_gsc_sync_at: update.last_gsc_sync_at
          })
          .eq('id', update.id)
      ))
    }

    console.log(`[GSC Sync BG] Created ${pagesCreated} pages, updated ${pageUpdates.length} pages`)

    // Update progress: 75%
    await supabase
      .from('seo_background_jobs')
      .update({ progress: 75 })
      .eq('id', jobId)

    // Prepare keyword data for batch upsert
    const keywordRecords = allQueries.map(queryData => {
      const keyword = queryData.keys[0]
      if (!keyword) return null
      
      const lowerKeyword = keyword.toLowerCase()
      let intent = 'informational'
      
      if (/buy|price|cost|cheap|best|top|review|vs|compare/.test(lowerKeyword)) {
        intent = 'transactional'
      } else if (/how|what|why|when|where|guide|tutorial|learn/.test(lowerKeyword)) {
        intent = 'informational'
      } else if (/near me|location|address|directions|hours/.test(lowerKeyword)) {
        intent = 'navigational'
      } else if (lowerKeyword.includes(site.domain?.replace(/\.\w+$/, '') || '')) {
        intent = 'navigational'
      }
      
      const isQuestion = /^(who|what|when|where|why|how|is|are|can|do|does|will|should|would|could)/i.test(lowerKeyword)
      const position = queryData.position || 100
      const impressions = queryData.impressions || 0
      const clicks = queryData.clicks || 0
      
      const keywordHash = crypto.createHash('md5').update(keyword).digest('hex')
      
      let opportunityScore = 0
      if (position >= 5 && position <= 20) {
        opportunityScore = Math.round((21 - position) * 5 + Math.log10(impressions + 1) * 10)
      } else if (position > 20 && position <= 50) {
        opportunityScore = Math.round(10 + Math.log10(impressions + 1) * 5)
      } else if (position <= 5) {
        opportunityScore = Math.round(50 + Math.log10(clicks + 1) * 10)
      }
      
      return {
        site_id: siteId,
        keyword: keyword,
        keyword_hash: keywordHash,
        current_position: position ? parseFloat(position.toFixed(1)) : null,
        impressions_28d: Math.round(impressions),
        clicks_28d: Math.round(clicks),
        ctr_28d: queryData.ctr ? parseFloat((queryData.ctr * 100).toFixed(2)) : null,
        intent: intent,
        is_question: isQuestion,
        opportunity_score: opportunityScore,
        is_tracked: position <= 20,
        last_gsc_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }).filter(Boolean)

    // Batch upsert keywords in chunks
    let keywordsUpserted = 0
    const totalKeywords = keywordRecords.length
    
    for (let i = 0; i < keywordRecords.length; i += DB_BATCH_SIZE) {
      const batch = keywordRecords.slice(i, i + DB_BATCH_SIZE)
      
      const { error: batchError } = await supabase
        .from('seo_keyword_universe')
        .upsert(batch, { 
          onConflict: 'site_id,keyword_hash',
          ignoreDuplicates: false
        })
      
      if (!batchError) {
        keywordsUpserted += batch.length
      }
      
      // Update progress (75% -> 99%)
      const progress = Math.round(75 + ((i + batch.length) / totalKeywords) * 24)
      if (i % (DB_BATCH_SIZE * 2) === 0) {
        await supabase
          .from('seo_background_jobs')
          .update({ progress })
          .eq('id', jobId)
      }
    }

    console.log(`[GSC Sync BG] Upserted ${keywordsUpserted} keywords`)

    // Complete job
    await supabase
      .from('seo_background_jobs')
      .update({
        status: 'completed',
        progress: 100,
        result: {
          queriesCount: allQueries.length,
          pagesCount: topPages.length,
          pagesCreated,
          keywordsUpserted,
          sitemapsCount: sitemaps.length,
          metrics: {
            clicks: currentRow.clicks || 0,
            impressions: currentRow.impressions || 0,
            position: currentRow.position || null,
            ctr: currentRow.ctr || null
          }
        },
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    return { statusCode: 200 }

  } catch (error) {
    console.error('[GSC Sync BG] Error:', error)
    
    // Mark job as failed
    await supabase
      .from('seo_background_jobs')
      .update({
        status: 'failed',
        error: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    return { statusCode: 500 }
  }
}
