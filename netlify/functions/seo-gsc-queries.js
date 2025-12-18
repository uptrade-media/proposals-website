// netlify/functions/seo-gsc-queries.js
// Fetch search query data from Google Search Console
import { googleApiRequest } from './utils/google-auth.js'
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

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
  const { contact, isSuperAdmin, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { 
      siteUrl,           // e.g., 'sc-domain:uptrademedia.com' or 'https://uptrademedia.com/'
      startDate,         // YYYY-MM-DD format
      endDate,           // YYYY-MM-DD format
      dimensions = ['query'], // query, page, country, device, date
      rowLimit = 100,
      startRow = 0,
      dimensionFilters,  // Optional filters
    } = body

    if (!siteUrl) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteUrl is required' }) }
    }

    // Default to last 28 days if no dates provided
    const now = new Date()
    const defaultEndDate = new Date(now.setDate(now.getDate() - 3)) // GSC data has 3-day lag
    const defaultStartDate = new Date(defaultEndDate)
    defaultStartDate.setDate(defaultStartDate.getDate() - 28)

    const requestBody = {
      startDate: startDate || defaultStartDate.toISOString().split('T')[0],
      endDate: endDate || defaultEndDate.toISOString().split('T')[0],
      dimensions,
      rowLimit,
      startRow,
    }

    if (dimensionFilters) {
      requestBody.dimensionFilterGroups = [{
        filters: dimensionFilters
      }]
    }

    // Fetch from Search Console API
    const url = `${GSC_API_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`
    
    console.log('[GSC] Fetching queries for:', siteUrl, requestBody)
    
    const data = await googleApiRequest(url, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    // Transform the response
    const queries = (data.rows || []).map(row => ({
      keys: row.keys,
      query: dimensions.includes('query') ? row.keys[dimensions.indexOf('query')] : null,
      page: dimensions.includes('page') ? row.keys[dimensions.indexOf('page')] : null,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        queries,
        rowCount: data.rows?.length || 0,
        responseAggregationType: data.responseAggregationType,
      })
    }

  } catch (error) {
    console.error('[GSC] Error fetching queries:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
