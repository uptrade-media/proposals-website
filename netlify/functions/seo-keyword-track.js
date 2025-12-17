// netlify/functions/seo-keyword-track.js
// Track keyword rankings over time
// Stores daily snapshots and calculates trends
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { google } from 'googleapis'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  // GET - Fetch tracked keywords with history
  if (event.httpMethod === 'GET') {
    return await getKeywordData(event, headers)
  }

  // POST - Add keywords to track or refresh data
  if (event.httpMethod === 'POST') {
    return await trackKeywords(event, headers)
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
}

// Get keyword tracking data
async function getKeywordData(event, headers) {
  const { user, error: authError } = await getAuthenticatedUser(event)
  if (authError || !user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const { siteId, days = 30, keyword } = event.queryStringParameters || {}

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Fetch tracked keywords with their history
    let query = supabase
      .from('seo_keyword_universe')
      .select('*')
      .eq('site_id', siteId)
      .order('current_position', { ascending: true, nullsFirst: false })

    if (keyword) {
      query = query.ilike('keyword', `%${keyword}%`)
    }

    const { data: keywords, error } = await query

    if (error) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
    }

    // Calculate trends for each keyword
    const keywordsWithTrends = keywords.map(kw => {
      const history = kw.position_history || []
      const recentHistory = history.slice(-parseInt(days))
      
      // Calculate trend
      let trend = 'stable'
      let trendValue = 0
      
      if (recentHistory.length >= 2) {
        const firstPos = recentHistory[0]?.position
        const lastPos = recentHistory[recentHistory.length - 1]?.position
        
        if (firstPos && lastPos) {
          trendValue = firstPos - lastPos // Positive = improved (lower position is better)
          if (trendValue > 3) trend = 'improving'
          else if (trendValue < -3) trend = 'declining'
        }
      }

      return {
        ...kw,
        trend,
        trendValue,
        recentHistory: recentHistory.slice(-7) // Last 7 days for sparkline
      }
    })

    // Group by status
    const summary = {
      total: keywords.length,
      top3: keywords.filter(k => k.current_position <= 3).length,
      top10: keywords.filter(k => k.current_position <= 10).length,
      top20: keywords.filter(k => k.current_position <= 20).length,
      improving: keywordsWithTrends.filter(k => k.trend === 'improving').length,
      declining: keywordsWithTrends.filter(k => k.trend === 'declining').length
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        keywords: keywordsWithTrends,
        summary
      })
    }

  } catch (error) {
    console.error('[Keyword Track] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}

// Track keywords - add new or refresh existing
async function trackKeywords(event, headers) {
  const { user, error: authError } = await getAuthenticatedUser(event)
  if (authError || !user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { 
      siteId, 
      keywords: keywordsToAdd = [], // Array of keywords to start tracking
      refreshAll = false, // Refresh all tracked keywords from GSC
      autoDiscover = false // Discover top keywords from GSC
    } = body

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Fetch site details
    const { data: site, error: siteError } = await supabase
      .from('seo_sites')
      .select('*, org:organizations(domain)')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Site not found' }) }
    }

    const domain = site.org?.domain || site.domain

    // Initialize GSC client
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}'),
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
    })
    const searchConsole = google.searchconsole({ version: 'v1', auth })
    const siteUrl = `sc-domain:${domain.replace(/^(https?:\/\/)?(www\.)?/, '')}`

    const today = new Date()
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() - 3) // GSC has 3-day delay
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - 28)

    const results = {
      added: [],
      updated: [],
      errors: []
    }

    // Auto-discover top keywords from GSC
    if (autoDiscover) {
      try {
        const response = await searchConsole.searchanalytics.query({
          siteUrl,
          requestBody: {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            dimensions: ['query'],
            rowLimit: 50,
            dimensionFilterGroups: [{
              filters: [{
                dimension: 'position',
                operator: 'lessThan',
                expression: '30'
              }]
            }]
          }
        })

        const topQueries = response.data.rows || []
        for (const row of topQueries) {
          // Check if already tracked
          const keywordHash = Buffer.from(row.keys[0]).toString('base64').substring(0, 32)
          const { data: existing } = await supabase
            .from('seo_keyword_universe')
            .select('id')
            .eq('site_id', siteId)
            .eq('keyword_hash', keywordHash)
            .single()

          if (!existing) {
            keywordsToAdd.push(row.keys[0])
          }
        }
      } catch (e) {
        console.error('[Keyword Track] Auto-discover error:', e)
        results.errors.push({ keyword: 'auto-discover', error: e.message })
      }
    }

    // Add new keywords to track
    for (const keyword of keywordsToAdd) {
      try {
        // Get current position from GSC
        const response = await searchConsole.searchanalytics.query({
          siteUrl,
          requestBody: {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            dimensions: ['query'],
            dimensionFilterGroups: [{
              filters: [{
                dimension: 'query',
                operator: 'equals',
                expression: keyword
              }]
            }]
          }
        })

        const row = response.data.rows?.[0]
        const keywordHash = Buffer.from(keyword).toString('base64').substring(0, 32)
        
        const keywordData = {
          site_id: siteId,
          keyword,
          keyword_hash: keywordHash,
          current_position: row?.position || null,
          clicks_28d: row?.clicks || 0,
          impressions_28d: row?.impressions || 0,
          ctr_28d: row?.ctr || 0,
          position_history: row ? [{
            date: endDate.toISOString().split('T')[0],
            position: row.position,
            clicks: row.clicks,
            impressions: row.impressions
          }] : [],
          first_seen_at: new Date().toISOString(),
          last_checked_at: new Date().toISOString(),
          source: 'manual'
        }

        const { error: insertError } = await supabase
          .from('seo_keyword_universe')
          .upsert(keywordData, { 
            onConflict: 'site_id,keyword_hash',
            ignoreDuplicates: false 
          })

        if (insertError) {
          results.errors.push({ keyword, error: insertError.message })
        } else {
          results.added.push(keyword)
        }

      } catch (e) {
        console.error(`[Keyword Track] Error tracking ${keyword}:`, e)
        results.errors.push({ keyword, error: e.message })
      }
    }

    // Refresh all tracked keywords
    if (refreshAll) {
      const { data: trackedKeywords } = await supabase
        .from('seo_keyword_universe')
        .select('id, keyword, position_history')
        .eq('site_id', siteId)

      for (const tracked of (trackedKeywords || [])) {
        try {
          const response = await searchConsole.searchanalytics.query({
            siteUrl,
            requestBody: {
              startDate: startDate.toISOString().split('T')[0],
              endDate: endDate.toISOString().split('T')[0],
              dimensions: ['query'],
              dimensionFilterGroups: [{
                filters: [{
                  dimension: 'query',
                  operator: 'equals',
                  expression: tracked.keyword
                }]
              }]
            }
          })

          const row = response.data.rows?.[0]
          if (row) {
            const todayStr = endDate.toISOString().split('T')[0]
            const history = tracked.position_history || []
            
            // Avoid duplicate entries for same day
            const existingIndex = history.findIndex(h => h.date === todayStr)
            const newEntry = {
              date: todayStr,
              position: row.position,
              clicks: row.clicks,
              impressions: row.impressions
            }

            if (existingIndex >= 0) {
              history[existingIndex] = newEntry
            } else {
              history.push(newEntry)
            }

            // Keep last 90 days
            const trimmedHistory = history.slice(-90)

            await supabase
              .from('seo_keyword_universe')
              .update({
                current_position: row.position,
                clicks_28d: row.clicks,
                impressions_28d: row.impressions,
                ctr_28d: row.ctr,
                position_history: trimmedHistory,
                last_checked_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', tracked.id)

            results.updated.push(tracked.keyword)
          }
        } catch (e) {
          results.errors.push({ keyword: tracked.keyword, error: e.message })
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        results,
        summary: {
          added: results.added.length,
          updated: results.updated.length,
          errors: results.errors.length
        }
      })
    }

  } catch (error) {
    console.error('[Keyword Track] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}
