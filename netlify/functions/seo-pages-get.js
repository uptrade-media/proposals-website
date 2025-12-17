// netlify/functions/seo-pages-get.js
// Get a single page with full details
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
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Page ID is required' }) }
    }

    const supabase = createSupabaseAdmin()
    const isAdmin = contact.role === 'admin' || contact.role === 'super_admin'

    // Fetch page with site
    const { data: page, error: pageError } = await supabase
      .from('seo_pages')
      .select(`
        *,
        site:seo_sites!seo_pages_site_id_fkey(id, domain, site_name, contact_id)
      `)
      .eq('id', id)
      .single()

    if (pageError || !page) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Page not found' }) }
    }

    // Verify access
    if (!isAdmin && page.site.contact_id !== contact.id) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Access denied' }) }
    }

    // Fetch queries for this page
    const { data: queries } = await supabase
      .from('seo_queries')
      .select('*')
      .eq('page_id', id)
      .order('clicks_28d', { ascending: false })
      .limit(20)

    // Fetch opportunities for this page
    const { data: opportunities } = await supabase
      .from('seo_opportunities')
      .select('*')
      .eq('page_id', id)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })

    // Fetch history for this page (last 30 days)
    const { data: history } = await supabase
      .from('seo_page_history')
      .select('*')
      .eq('page_id', id)
      .order('snapshot_date', { ascending: false })
      .limit(30)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        page: {
          id: page.id,
          siteId: page.site_id,
          site: {
            id: page.site.id,
            domain: page.site.domain,
            siteName: page.site.site_name
          },
          url: page.url,
          path: page.path,
          // Current metadata
          title: page.title,
          titleLength: page.title_length,
          metaDescription: page.meta_description,
          metaDescriptionLength: page.meta_description_length,
          h1: page.h1,
          h1Count: page.h1_count,
          canonicalUrl: page.canonical_url,
          robotsMeta: page.robots_meta,
          // Managed metadata
          managedTitle: page.managed_title,
          managedMetaDescription: page.managed_meta_description,
          managedCanonicalUrl: page.managed_canonical_url,
          managedRobotsMeta: page.managed_robots_meta,
          // Content
          wordCount: page.word_count,
          internalLinksIn: page.internal_links_in,
          internalLinksOut: page.internal_links_out,
          externalLinks: page.external_links,
          imagesCount: page.images_count,
          imagesWithoutAlt: page.images_without_alt,
          // Schema
          hasSchema: page.has_schema,
          schemaTypes: page.schema_types,
          managedSchema: page.managed_schema,
          // Keywords
          targetKeywords: page.target_keywords,
          // Indexing
          indexStatus: page.index_status,
          lastCrawledByGoogle: page.last_crawled_by_google,
          // Metrics
          metrics: {
            clicks28d: page.clicks_28d || 0,
            impressions28d: page.impressions_28d || 0,
            avgPosition28d: page.avg_position_28d,
            ctr28d: page.ctr_28d,
            clicksPrev28d: page.clicks_prev_28d || 0,
            impressionsPrev28d: page.impressions_prev_28d || 0,
            avgPositionPrev28d: page.avg_position_prev_28d,
            ctrPrev28d: page.ctr_prev_28d
          },
          // PageSpeed
          pagespeed: {
            performance: page.performance_score,
            seo: page.seo_score,
            accessibility: page.accessibility_score,
            bestPractices: page.best_practices_score,
            lastChecked: page.pagespeed_last_checked_at
          },
          // Scores
          healthScore: page.seo_health_score,
          contentQualityScore: page.content_quality_score,
          opportunitiesCount: page.opportunities_count,
          // Timestamps
          firstSeen: page.first_seen_at,
          lastCrawled: page.last_crawled_at,
          lastGscSync: page.last_gsc_sync_at,
          metadataPublished: page.metadata_published_at,
          createdAt: page.created_at,
          updatedAt: page.updated_at
        },
        queries: queries?.map(q => ({
          id: q.id,
          query: q.query,
          clicks28d: q.clicks_28d || 0,
          impressions28d: q.impressions_28d || 0,
          avgPosition28d: q.avg_position_28d,
          ctr28d: q.ctr_28d,
          positionTrend: q.position_trend,
          isStrikingDistance: q.is_striking_distance,
          isLowCtr: q.is_low_ctr,
          isTargetKeyword: q.is_target_keyword
        })) || [],
        opportunities: opportunities?.map(o => ({
          id: o.id,
          type: o.type,
          priority: o.priority,
          title: o.title,
          description: o.description,
          aiRecommendation: o.ai_recommendation,
          currentValue: o.current_value,
          recommendedValue: o.recommended_value,
          estimatedImpact: o.estimated_impact,
          estimatedEffort: o.estimated_effort,
          status: o.status,
          createdAt: o.created_at
        })) || [],
        history: history?.map(h => ({
          date: h.snapshot_date,
          title: h.title,
          metaDescription: h.meta_description,
          clicks: h.clicks,
          impressions: h.impressions,
          avgPosition: h.avg_position,
          ctr: h.ctr,
          healthScore: h.seo_health_score
        })) || []
      })
    }
  } catch (err) {
    console.error('[seo-pages-get] Error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
