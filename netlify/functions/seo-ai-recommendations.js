// netlify/functions/seo-ai-recommendations.js
// Fetch AI recommendations for a site with filtering
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const { user, error: authError } = await getAuthenticatedUser(event)
  if (authError || !user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const params = event.queryStringParameters || {}
    const { 
      siteId,
      status = 'pending', // pending, applied, dismissed, all
      category, // title, meta, schema, content, technical, keyword, internal_link
      impact, // critical, high, medium, low
      autoFixable, // true, false
      pageId,
      limit = 100,
      offset = 0
    } = params

    if (!siteId) {
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ error: 'siteId required' }) 
      }
    }

    const supabase = createSupabaseAdmin()

    // Build query
    let query = supabase
      .from('seo_ai_recommendations')
      .select(`
        *,
        page:seo_pages(id, url, title, managed_title)
      `, { count: 'exact' })
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (impact) {
      query = query.eq('impact', impact)
    }

    if (autoFixable !== undefined) {
      query = query.eq('auto_fixable', autoFixable === 'true')
    }

    if (pageId) {
      query = query.eq('page_id', pageId)
    }

    // Pagination
    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

    const { data: recommendations, error, count } = await query

    if (error) {
      console.error('[AI Recommendations] Query error:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message })
      }
    }

    // Get summary stats
    const { data: statsData } = await supabase
      .from('seo_ai_recommendations')
      .select('status, impact, category, auto_fixable')
      .eq('site_id', siteId)

    const stats = {
      total: statsData?.length || 0,
      byStatus: {},
      byImpact: {},
      byCategory: {},
      autoFixable: 0
    }

    statsData?.forEach(r => {
      stats.byStatus[r.status] = (stats.byStatus[r.status] || 0) + 1
      stats.byImpact[r.impact] = (stats.byImpact[r.impact] || 0) + 1
      stats.byCategory[r.category] = (stats.byCategory[r.category] || 0) + 1
      if (r.auto_fixable) stats.autoFixable++
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        recommendations,
        stats,
        pagination: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + recommendations.length) < count
        }
      })
    }

  } catch (error) {
    console.error('[AI Recommendations] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
