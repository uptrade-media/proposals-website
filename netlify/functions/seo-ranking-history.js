/**
 * SEO Ranking History - Archive and retrieve historical ranking data
 * 
 * Stores daily snapshots of keyword positions to build long-term history
 * beyond GSC's 16-month data retention limit.
 * 
 * POST /api/seo-ranking-history - Archive current rankings
 * GET /api/seo-ranking-history - Get historical data
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
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
    // GET - Retrieve historical rankings
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {}
      const { siteId, keyword, startDate, endDate, limit = '365' } = params

      if (!siteId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
      }

      let query = supabase
        .from('seo_ranking_history')
        .select('*')
        .eq('site_id', siteId)
        .order('date', { ascending: false })
        .limit(parseInt(limit))

      if (keyword) {
        query = query.ilike('keyword', `%${keyword}%`)
      }

      if (startDate) {
        query = query.gte('date', startDate)
      }

      if (endDate) {
        query = query.lte('date', endDate)
      }

      const { data: history, error } = await query

      if (error) throw error

      // If getting data for a specific keyword, also calculate trends
      let trends = null
      if (keyword && history && history.length > 1) {
        const latestPosition = history[0]?.position
        const oldestPosition = history[history.length - 1]?.position
        const avgPosition = history.reduce((sum, h) => sum + (h.position || 0), 0) / history.length
        const bestPosition = Math.min(...history.map(h => h.position || 100))
        const worstPosition = Math.max(...history.filter(h => h.position).map(h => h.position))

        trends = {
          currentPosition: latestPosition,
          startPosition: oldestPosition,
          avgPosition: avgPosition.toFixed(1),
          bestPosition,
          worstPosition,
          overallChange: oldestPosition && latestPosition ? (oldestPosition - latestPosition).toFixed(1) : null,
          dataPoints: history.length
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          history,
          trends,
          count: history?.length || 0 
        })
      }
    }

    // POST - Archive current rankings or import historical data
    if (event.httpMethod === 'POST') {
      const { siteId, action = 'snapshot', data } = JSON.parse(event.body || '{}')

      if (!siteId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
      }

      if (action === 'snapshot') {
        // Take a snapshot of current rankings
        const result = await archiveCurrentRankings(supabase, siteId)
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, ...result })
        }
      }

      if (action === 'import' && data) {
        // Import historical data (e.g., from external tool)
        const result = await importHistoricalData(supabase, siteId, data)
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, ...result })
        }
      }

      if (action === 'backfill-gsc') {
        // Backfill from GSC queries data
        const result = await backfillFromGsc(supabase, siteId)
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, ...result })
        }
      }

      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  } catch (err) {
    console.error('[seo-ranking-history] Error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}

// Archive current keyword positions as a daily snapshot
async function archiveCurrentRankings(supabase, siteId) {
  const today = new Date().toISOString().split('T')[0]

  // Get current tracked keywords
  const { data: keywords, error } = await supabase
    .from('seo_tracked_keywords')
    .select('id, keyword, current_position, best_ranking_url')
    .eq('site_id', siteId)
    .not('current_position', 'is', null)

  if (error) throw error
  if (!keywords || keywords.length === 0) {
    return { archived: 0, message: 'No tracked keywords with positions' }
  }

  // Get GSC query data for additional metrics
  const { data: gscData } = await supabase
    .from('seo_gsc_queries')
    .select('query, clicks, impressions, ctr, avg_position')
    .eq('site_id', siteId)

  // Build a lookup map
  const gscMap = new Map()
  gscData?.forEach(q => {
    gscMap.set(q.query.toLowerCase(), q)
  })

  // Prepare snapshot records
  const snapshots = keywords.map(kw => {
    const gsc = gscMap.get(kw.keyword.toLowerCase())
    return {
      site_id: siteId,
      keyword_id: kw.id,
      keyword: kw.keyword,
      url: kw.best_ranking_url,
      position: kw.current_position,
      clicks: gsc?.clicks || 0,
      impressions: gsc?.impressions || 0,
      ctr: gsc?.ctr || null,
      date: today,
      source: 'gsc'
    }
  })

  // Upsert (update if exists for today, insert if not)
  const { data: inserted, error: upsertError } = await supabase
    .from('seo_ranking_history')
    .upsert(snapshots, { 
      onConflict: 'site_id,keyword,date',
      ignoreDuplicates: false 
    })
    .select()

  if (upsertError) throw upsertError

  return { 
    archived: inserted?.length || snapshots.length, 
    date: today 
  }
}

// Import historical data from external source
async function importHistoricalData(supabase, siteId, data) {
  if (!Array.isArray(data) || data.length === 0) {
    return { imported: 0, message: 'No data provided' }
  }

  // Validate and transform data
  const records = data.map(item => ({
    site_id: siteId,
    keyword: item.keyword,
    url: item.url || null,
    position: item.position,
    clicks: item.clicks || 0,
    impressions: item.impressions || 0,
    ctr: item.ctr || null,
    date: item.date,
    source: item.source || 'import'
  })).filter(r => r.keyword && r.date && r.position)

  const { data: inserted, error } = await supabase
    .from('seo_ranking_history')
    .upsert(records, { 
      onConflict: 'site_id,keyword,date',
      ignoreDuplicates: true 
    })
    .select()

  if (error) throw error

  return { imported: inserted?.length || records.length }
}

// Backfill ranking history from GSC queries table
async function backfillFromGsc(supabase, siteId) {
  // Get tracked keywords
  const { data: keywords } = await supabase
    .from('seo_tracked_keywords')
    .select('id, keyword')
    .eq('site_id', siteId)

  if (!keywords || keywords.length === 0) {
    return { backfilled: 0, message: 'No tracked keywords' }
  }

  const keywordMap = new Map()
  keywords.forEach(k => keywordMap.set(k.keyword.toLowerCase(), k.id))

  // Get GSC queries
  const { data: gscQueries } = await supabase
    .from('seo_gsc_queries')
    .select('query, avg_position, clicks, impressions, ctr')
    .eq('site_id', siteId)

  if (!gscQueries || gscQueries.length === 0) {
    return { backfilled: 0, message: 'No GSC data' }
  }

  const today = new Date().toISOString().split('T')[0]

  // Match GSC queries to tracked keywords
  const records = []
  gscQueries.forEach(q => {
    const keywordId = keywordMap.get(q.query.toLowerCase())
    if (keywordId) {
      records.push({
        site_id: siteId,
        keyword_id: keywordId,
        keyword: q.query,
        position: q.avg_position,
        clicks: q.clicks,
        impressions: q.impressions,
        ctr: q.ctr,
        date: today,
        source: 'gsc-backfill'
      })
    }
  })

  if (records.length === 0) {
    return { backfilled: 0, message: 'No matching keywords found' }
  }

  const { error } = await supabase
    .from('seo_ranking_history')
    .upsert(records, { 
      onConflict: 'site_id,keyword,date',
      ignoreDuplicates: true 
    })

  if (error) throw error

  return { backfilled: records.length }
}
