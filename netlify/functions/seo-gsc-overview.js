// netlify/functions/seo-gsc-overview.js
// Fetch overview metrics from Google Search Console (totals + trends)
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
    const { siteUrl } = body

    if (!siteUrl) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteUrl is required' }) }
    }

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

    // PARALLEL: Fetch current, previous, and trend data simultaneously
    const [currentData, previousData, trendData] = await Promise.all([
      googleApiRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          startDate: currentStart.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          dimensions: [], // No dimensions = totals only
        }),
      }),
      googleApiRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          startDate: previousStart.toISOString().split('T')[0],
          endDate: previousEnd.toISOString().split('T')[0],
          dimensions: [],
        }),
      }),
      googleApiRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          startDate: currentStart.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          dimensions: ['date'],
          rowLimit: 30,
        }),
      })
    ])

    // Extract metrics
    const current = currentData.rows?.[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 }
    const previous = previousData.rows?.[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 }

    // Calculate changes
    const calcChange = (curr, prev) => prev ? ((curr - prev) / prev) * 100 : 0

    const overview = {
      period: {
        start: currentStart.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      },
      metrics: {
        clicks: {
          value: current.clicks,
          change: calcChange(current.clicks, previous.clicks),
        },
        impressions: {
          value: current.impressions,
          change: calcChange(current.impressions, previous.impressions),
        },
        ctr: {
          value: current.ctr,
          change: calcChange(current.ctr, previous.ctr),
        },
        position: {
          value: current.position,
          // For position, negative change is good (lower = better)
          change: calcChange(current.position, previous.position) * -1,
        },
      },
      trend: (trendData.rows || []).map(row => ({
        date: row.keys[0],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      })).sort((a, b) => a.date.localeCompare(b.date)),
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(overview)
    }

  } catch (error) {
    console.error('[GSC] Error fetching overview:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
