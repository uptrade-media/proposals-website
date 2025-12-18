// netlify/functions/seo-gsc-pages.js
// Fetch page-level performance data from Google Search Console
import { googleApiRequest } from './utils/google-auth.js'
import { getAuthenticatedUser } from './utils/supabase.js'

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
    const { 
      siteUrl,
      startDate,
      endDate,
      rowLimit = 100,
      pageFilter,  // Optional: filter to specific page
    } = body

    if (!siteUrl) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteUrl is required' }) }
    }

    // Default to last 28 days
    const now = new Date()
    const defaultEndDate = new Date(now.setDate(now.getDate() - 3))
    const defaultStartDate = new Date(defaultEndDate)
    defaultStartDate.setDate(defaultStartDate.getDate() - 28)

    const requestBody = {
      startDate: startDate || defaultStartDate.toISOString().split('T')[0],
      endDate: endDate || defaultEndDate.toISOString().split('T')[0],
      dimensions: ['page'],
      rowLimit,
    }

    if (pageFilter) {
      requestBody.dimensionFilterGroups = [{
        filters: [{
          dimension: 'page',
          operator: 'contains',
          expression: pageFilter
        }]
      }]
    }

    const url = `${GSC_API_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`
    
    console.log('[GSC] Fetching pages for:', siteUrl)
    
    const data = await googleApiRequest(url, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const pages = (data.rows || []).map(row => ({
      page: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ pages })
    }

  } catch (error) {
    console.error('[GSC] Error fetching pages:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
