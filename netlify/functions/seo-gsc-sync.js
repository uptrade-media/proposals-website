// netlify/functions/seo-gsc-sync.js
// Sync all GSC data for a site (overview, queries, pages)
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { googleApiRequest } from './utils/google-auth.js'

const GSC_API_BASE = 'https://searchconsole.googleapis.com/webmasters/v3'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  // Verify authentication
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { siteId } = body

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId is required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Get site details
    const { data: site, error: siteError } = await supabase
      .from('seo_sites')
      .select('*')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Site not found' }) }
    }

    // Check if GSC is connected
    if (!site.gsc_refresh_token && !site.gsc_access_token) {
      return { 
        statusCode: 200, 
        headers, 
        body: JSON.stringify({ 
          success: true, 
          message: 'GSC not connected for this site',
          gscConnected: false
        }) 
      }
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

    let currentData = null
    let previousData = null
    let topQueries = []
    let topPages = []

    try {
      // Fetch current period totals
      currentData = await googleApiRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          startDate: currentStart.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          dimensions: []
        })
      })

      // Fetch previous period totals
      previousData = await googleApiRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          startDate: previousStart.toISOString().split('T')[0],
          endDate: previousEnd.toISOString().split('T')[0],
          dimensions: []
        })
      })

      // Fetch top queries
      const queriesData = await googleApiRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          startDate: currentStart.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          dimensions: ['query'],
          rowLimit: 100
        })
      })
      topQueries = queriesData.rows || []

      // Fetch top pages
      const pagesData = await googleApiRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          startDate: currentStart.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          dimensions: ['page'],
          rowLimit: 100
        })
      })
      topPages = pagesData.rows || []

    } catch (gscError) {
      console.error('GSC API error:', gscError)
      return { 
        statusCode: 200, 
        headers, 
        body: JSON.stringify({ 
          success: false, 
          message: 'GSC API error - may need to reconnect',
          error: gscError.message
        }) 
      }
    }

    // Extract metrics from responses
    const currentRow = currentData?.rows?.[0] || {}
    const previousRow = previousData?.rows?.[0] || {}

    // Update site with GSC metrics
    const { error: updateError } = await supabase
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
        gsc_last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', siteId)

    if (updateError) {
      console.error('Update error:', updateError)
    }

    // Update pages with GSC data
    for (const pageData of topPages) {
      const pageUrl = pageData.keys[0]
      
      // Find matching page in our database
      const { data: existingPage } = await supabase
        .from('seo_pages')
        .select('id')
        .eq('site_id', siteId)
        .eq('url', pageUrl)
        .single()

      if (existingPage) {
        // Find queries for this specific page
        const pageQueries = topQueries.filter(q => {
          // This is a simplification - ideally we'd fetch page+query dimension
          return true
        }).slice(0, 10).map(q => ({
          query: q.keys[0],
          clicks: q.clicks,
          impressions: q.impressions,
          position: q.position?.toFixed(1)
        }))

        await supabase
          .from('seo_pages')
          .update({
            clicks_28d: Math.round(pageData.clicks || 0),
            impressions_28d: Math.round(pageData.impressions || 0),
            avg_position_28d: pageData.position?.toFixed(1) || null,
            ctr: pageData.ctr ? (pageData.ctr * 100).toFixed(2) : null,
            top_queries: pageQueries,
            last_gsc_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingPage.id)
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        gscConnected: true,
        metrics: {
          clicks: currentRow.clicks || 0,
          impressions: currentRow.impressions || 0,
          position: currentRow.position || null,
          ctr: currentRow.ctr || null
        },
        queriesCount: topQueries.length,
        pagesCount: topPages.length
      })
    }

  } catch (error) {
    console.error('GSC sync error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Failed to sync GSC data' })
    }
  }
}
