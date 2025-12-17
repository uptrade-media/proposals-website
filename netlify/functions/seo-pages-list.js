// netlify/functions/seo-pages-list.js
// List pages for a site with filtering/sorting
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    const { 
      siteId, 
      search,
      indexStatus,
      minHealthScore,
      maxHealthScore,
      hasOpportunities,
      sortBy = 'clicks_28d',
      sortOrder = 'desc',
      page = '1',
      limit = '50'
    } = event.queryStringParameters || {}

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Site ID is required' }) }
    }

    const supabase = createSupabaseAdmin()
    const isAdmin = contact.role === 'admin' || contact.role === 'super_admin'

    // Verify site access
    const { data: site, error: siteError } = await supabase
      .from('seo_sites')
      .select('id, contact_id')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Site not found' }) }
    }

    if (!isAdmin && site.contact_id !== contact.id) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Access denied' }) }
    }

    // Build query
    let query = supabase
      .from('seo_pages')
      .select('*', { count: 'exact' })
      .eq('site_id', siteId)

    // Apply filters
    if (search) {
      query = query.or(`path.ilike.%${search}%,title.ilike.%${search}%`)
    }

    if (indexStatus) {
      query = query.eq('index_status', indexStatus)
    }

    if (minHealthScore) {
      query = query.gte('seo_health_score', parseInt(minHealthScore))
    }

    if (maxHealthScore) {
      query = query.lte('seo_health_score', parseInt(maxHealthScore))
    }

    if (hasOpportunities === 'true') {
      query = query.gt('opportunities_count', 0)
    }

    // Apply sorting
    const validSortFields = ['clicks_28d', 'impressions_28d', 'avg_position_28d', 'seo_health_score', 'path', 'updated_at']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'clicks_28d'
    const ascending = sortOrder === 'asc'
    query = query.order(sortField, { ascending, nullsFirst: false })

    // Apply pagination
    const pageNum = parseInt(page) || 1
    const limitNum = Math.min(parseInt(limit) || 50, 100)
    const offset = (pageNum - 1) * limitNum
    query = query.range(offset, offset + limitNum - 1)

    const { data: pages, error: pagesError, count } = await query

    if (pagesError) {
      console.error('[seo-pages-list] Error:', pagesError)
      return { statusCode: 500, headers, body: JSON.stringify({ error: pagesError.message }) }
    }

    // Format response
    const formattedPages = pages.map(p => ({
      id: p.id,
      url: p.url,
      path: p.path,
      title: p.title,
      titleLength: p.title_length,
      metaDescription: p.meta_description,
      metaDescriptionLength: p.meta_description_length,
      h1: p.h1,
      indexStatus: p.index_status,
      metrics: {
        clicks28d: p.clicks_28d || 0,
        impressions28d: p.impressions_28d || 0,
        avgPosition28d: p.avg_position_28d,
        ctr28d: p.ctr_28d,
        clicksPrev28d: p.clicks_prev_28d || 0,
        impressionsPrev28d: p.impressions_prev_28d || 0
      },
      healthScore: p.seo_health_score,
      opportunitiesCount: p.opportunities_count || 0,
      hasSchema: p.has_schema,
      lastCrawled: p.last_crawled_at,
      lastGscSync: p.last_gsc_sync_at,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        pages: formattedPages,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count,
          totalPages: Math.ceil(count / limitNum)
        }
      })
    }
  } catch (err) {
    console.error('[seo-pages-list] Error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
