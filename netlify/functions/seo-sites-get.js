// netlify/functions/seo-sites-get.js
// Get a single SEO site with full details
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

    const { id } = event.queryStringParameters || {}
    if (!id) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Site ID is required' }) }
    }

    const supabase = createSupabaseAdmin()
    const isAdmin = contact.role === 'admin' || contact.role === 'super_admin'

    // Fetch site
    let query = supabase
      .from('seo_sites')
      .select(`
        *,
        contact:contacts!seo_sites_contact_id_fkey(id, name, email, company)
      `)
      .eq('id', id)

    // Non-admins can only view their own sites
    if (!isAdmin) {
      query = query.eq('contact_id', contact.id)
    }

    const { data: site, error: siteError } = await query.single()

    if (siteError || !site) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Site not found' }) }
    }

    // Get page stats
    const { data: pageStats } = await supabase
      .from('seo_pages')
      .select('id, seo_health_score, index_status, opportunities_count')
      .eq('site_id', id)

    const stats = {
      totalPages: pageStats?.length || 0,
      avgHealthScore: pageStats?.length 
        ? Math.round(pageStats.reduce((sum, p) => sum + (p.seo_health_score || 0), 0) / pageStats.length)
        : 0,
      pagesWithOpportunities: pageStats?.filter(p => p.opportunities_count > 0).length || 0,
      totalOpportunities: pageStats?.reduce((sum, p) => sum + (p.opportunities_count || 0), 0) || 0
    }

    // Get recent opportunities
    const { data: opportunities } = await supabase
      .from('seo_opportunities')
      .select('id, type, priority, title, status, created_at')
      .eq('site_id', id)
      .eq('status', 'open')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(5)

    // Get top pages by clicks
    const { data: topPages } = await supabase
      .from('seo_pages')
      .select('id, path, title, clicks_28d, impressions_28d, avg_position_28d, seo_health_score')
      .eq('site_id', id)
      .order('clicks_28d', { ascending: false })
      .limit(10)

    // Get striking distance queries
    const { data: strikingQueries } = await supabase
      .from('seo_queries')
      .select('id, query, clicks_28d, impressions_28d, avg_position_28d')
      .eq('site_id', id)
      .eq('is_striking_distance', true)
      .order('impressions_28d', { ascending: false })
      .limit(10)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        site: {
          id: site.id,
          contactId: site.contact_id,
          contact: site.contact,
          domain: site.domain,
          siteName: site.site_name,
          sitemapUrl: site.sitemap_url,
          gscConnected: !!site.gsc_connected_at,
          gscPropertyUrl: site.gsc_property_url,
          gscLastSync: site.gsc_last_sync_at,
          metrics: {
            clicks28d: site.total_clicks_28d || 0,
            impressions28d: site.total_impressions_28d || 0,
            avgPosition28d: site.avg_position_28d,
            avgCtr28d: site.avg_ctr_28d,
            clicksPrev28d: site.total_clicks_prev_28d || 0,
            impressionsPrev28d: site.total_impressions_prev_28d || 0,
            clicksChange: ((site.total_clicks_28d || 0) - (site.total_clicks_prev_28d || 0)),
            impressionsChange: ((site.total_impressions_28d || 0) - (site.total_impressions_prev_28d || 0))
          },
          indexing: {
            pagesIndexed: site.pages_indexed || 0,
            pagesNotIndexed: site.pages_not_indexed || 0
          },
          cwv: site.cwv_status ? {
            lcpMs: site.cwv_lcp_ms,
            inpMs: site.cwv_inp_ms,
            cls: site.cwv_cls,
            status: site.cwv_status,
            lastChecked: site.cwv_last_checked_at
          } : null,
          autoSyncEnabled: site.auto_sync_enabled,
          syncFrequencyHours: site.sync_frequency_hours,
          createdAt: site.created_at,
          updatedAt: site.updated_at
        },
        stats,
        opportunities: opportunities?.map(o => ({
          id: o.id,
          type: o.type,
          priority: o.priority,
          title: o.title,
          status: o.status,
          createdAt: o.created_at
        })) || [],
        topPages: topPages?.map(p => ({
          id: p.id,
          path: p.path,
          title: p.title,
          clicks28d: p.clicks_28d || 0,
          impressions28d: p.impressions_28d || 0,
          avgPosition28d: p.avg_position_28d,
          healthScore: p.seo_health_score
        })) || [],
        strikingQueries: strikingQueries?.map(q => ({
          id: q.id,
          query: q.query,
          clicks28d: q.clicks_28d || 0,
          impressions28d: q.impressions_28d || 0,
          avgPosition28d: q.avg_position_28d
        })) || []
      })
    }
  } catch (err) {
    console.error('[seo-sites-get] Error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
