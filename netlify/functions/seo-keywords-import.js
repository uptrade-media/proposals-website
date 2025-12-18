/**
 * SEO Keywords Import - Import top keywords from GSC for tracking
 * 
 * POST /api/seo-keywords-import
 * Body: { siteId, limit?, source? }
 * 
 * Imports top performing keywords from GSC queries
 * and creates tracked keyword entries for long-term monitoring.
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
    // GET - List tracked keywords
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {}
      const { siteId, status = 'active' } = params

      if (!siteId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
      }

      let query = supabase
        .from('seo_tracked_keywords')
        .select('*')
        .eq('site_id', siteId)
        .order('current_position', { ascending: true, nullsLast: true })

      if (status !== 'all') {
        query = query.eq('status', status)
      }

      const { data: keywords, error } = await query

      if (error) throw error

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ keywords: keywords || [] })
      }
    }

    // POST - Import keywords from GSC
    if (event.httpMethod === 'POST') {
      const { 
        siteId, 
        limit = 50, 
        source = 'gsc',
        keywords: manualKeywords 
      } = JSON.parse(event.body || '{}')

      if (!siteId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
      }

      let imported = 0
      let skipped = 0

      // Get existing tracked keywords
      const { data: existing } = await supabase
        .from('seo_tracked_keywords')
        .select('keyword')
        .eq('site_id', siteId)

      const existingSet = new Set((existing || []).map(k => k.keyword.toLowerCase()))

      // Import from GSC queries
      if (source === 'gsc' || source === 'both') {
        const { data: gscQueries } = await supabase
          .from('seo_gsc_queries')
          .select('query, clicks, impressions, avg_position, ctr')
          .eq('site_id', siteId)
          .order('clicks', { ascending: false })
          .limit(limit)

        if (gscQueries && gscQueries.length > 0) {
          const newKeywords = gscQueries
            .filter(q => !existingSet.has(q.query.toLowerCase()))
            .map(q => ({
              site_id: siteId,
              keyword: q.query,
              current_position: q.avg_position,
              search_volume: null, // Would need external API
              intent: detectIntent(q.query),
              status: 'active',
              priority: q.avg_position <= 10 ? 'high' : q.avg_position <= 20 ? 'medium' : 'low',
              last_gsc_sync_at: new Date().toISOString()
            }))

          if (newKeywords.length > 0) {
            const { data: inserted, error } = await supabase
              .from('seo_tracked_keywords')
              .insert(newKeywords)
              .select()

            if (error) throw error
            imported += inserted?.length || 0
          }

          skipped += gscQueries.length - newKeywords.length
        }
      }

      // Import manual keywords if provided
      if (manualKeywords && Array.isArray(manualKeywords)) {
        const newManual = manualKeywords
          .filter(k => k && !existingSet.has(k.toLowerCase()))
          .map(k => ({
            site_id: siteId,
            keyword: k,
            status: 'active',
            priority: 'medium',
            intent: detectIntent(k)
          }))

        if (newManual.length > 0) {
          const { data: inserted, error } = await supabase
            .from('seo_tracked_keywords')
            .insert(newManual)
            .select()

          if (error) throw error
          imported += inserted?.length || 0
        }

        skipped += manualKeywords.length - newManual.length
      }

      // Get updated count
      const { count } = await supabase
        .from('seo_tracked_keywords')
        .select('*', { count: 'exact', head: true })
        .eq('site_id', siteId)
        .eq('status', 'active')

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          imported,
          skipped,
          totalTracked: count
        })
      }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  } catch (err) {
    console.error('[seo-keywords-import] Error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}

// Simple intent detection
function detectIntent(query) {
  const q = query.toLowerCase()
  
  // Transactional
  if (/buy|purchase|order|price|cost|cheap|deal|discount|shop|hire|get|book/i.test(q)) {
    return 'transactional'
  }
  
  // Commercial investigation
  if (/best|top|review|compare|vs|versus|alternative/i.test(q)) {
    return 'commercial'
  }
  
  // Navigational
  if (/login|sign in|website|contact|address|phone|near me|location/i.test(q)) {
    return 'navigational'
  }
  
  // Default to informational
  return 'informational'
}
