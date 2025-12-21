// netlify/functions/seo-content-decay.js
// Content Decay Detection - Identify declining content for refresh
// Analyzes historical performance to find content losing rankings/traffic
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { SEOSkill } from './skills/seo-skill.js'

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

  // GET - Fetch content decay analysis
  if (event.httpMethod === 'GET') {
    return await getDecayAnalysis(event, headers)
  }

  // POST - Run content decay detection
  if (event.httpMethod === 'POST') {
    return await runDecayDetection(event, headers)
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
}

// Get existing decay analysis
async function getDecayAnalysis(event, headers) {
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const { siteId } = event.queryStringParameters || {}

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Get pages marked as decaying
    const { data: decayingPages, error } = await supabase
      .from('seo_pages')
      .select('*')
      .eq('site_id', siteId)
      .eq('is_decaying', true)
      .order('decay_severity', { ascending: false })

    if (error) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
    }

    // Get refresh recommendations
    const { data: refreshRecs } = await supabase
      .from('seo_ai_recommendations')
      .select('*')
      .eq('site_id', siteId)
      .eq('category', 'content_decay')
      .eq('status', 'pending')
      .order('priority_score', { ascending: false })

    // Get last analysis run
    const { data: lastRun } = await supabase
      .from('seo_ai_analysis_runs')
      .select('*')
      .eq('site_id', siteId)
      .eq('run_type', 'content_decay')
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        decayingPages: decayingPages || [],
        refreshRecommendations: refreshRecs || [],
        lastAnalysis: lastRun,
        summary: {
          totalDecaying: decayingPages?.length || 0,
          critical: decayingPages?.filter(p => p.decay_severity === 'critical').length || 0,
          high: decayingPages?.filter(p => p.decay_severity === 'high').length || 0,
          medium: decayingPages?.filter(p => p.decay_severity === 'medium').length || 0
        }
      })
    }

  } catch (error) {
    console.error('[Content Decay] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}

// Run content decay detection
async function runDecayDetection(event, headers) {
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { siteId, thresholds = {} } = body

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Default thresholds
    const config = {
      clicksDropPercent: thresholds.clicksDropPercent || 30, // 30% drop
      impressionsDropPercent: thresholds.impressionsDropPercent || 25,
      positionDropThreshold: thresholds.positionDropThreshold || 5, // 5 position drop
      lookbackDays: thresholds.lookbackDays || 90,
      minPreviousClicks: thresholds.minPreviousClicks || 10
    }

    // Get site GSC connection
    const { data: site } = await supabase
      .from('seo_sites')
      .select('*, gsc_property_url, org:organizations(name)')
      .eq('id', siteId)
      .single()

    if (!site) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Site not found' }) }
    }

    // Initialize SEOSkill for AI operations
    const seoSkill = new SEOSkill(supabase, site.org_id, siteId, { userId: contact.id })

    // Get pages with historical data
    const { data: pages, error: pagesError } = await supabase
      .from('seo_pages')
      .select(`
        *,
        history:seo_page_history(
          snapshot_date,
          clicks,
          impressions,
          avg_position
        )
      `)
      .eq('site_id', siteId)
      .order('clicks_28d', { ascending: false, nullsFirst: false })
      .limit(200)

    if (pagesError) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: pagesError.message }) }
    }

    // Analyze each page for decay
    const decayingPages = []
    const now = new Date()
    const lookbackDate = new Date(now.getTime() - config.lookbackDays * 24 * 60 * 60 * 1000)

    for (const page of pages || []) {
      const history = page.history || []
      if (history.length < 2) continue

      // Sort history by date (using snapshot_date)
      const sortedHistory = [...history].sort((a, b) => new Date(a.snapshot_date) - new Date(b.snapshot_date))

      // Get earlier period (first half) and recent period (second half)
      const midpoint = Math.floor(sortedHistory.length / 2)
      const earlierPeriod = sortedHistory.slice(0, midpoint)
      const recentPeriod = sortedHistory.slice(midpoint)

      if (earlierPeriod.length === 0 || recentPeriod.length === 0) continue

      // Calculate averages
      const earlierClicks = earlierPeriod.reduce((sum, h) => sum + (h.clicks || 0), 0) / earlierPeriod.length
      const recentClicks = recentPeriod.reduce((sum, h) => sum + (h.clicks || 0), 0) / recentPeriod.length
      
      const earlierImpressions = earlierPeriod.reduce((sum, h) => sum + (h.impressions || 0), 0) / earlierPeriod.length
      const recentImpressions = recentPeriod.reduce((sum, h) => sum + (h.impressions || 0), 0) / recentPeriod.length

      const earlierPosition = earlierPeriod.filter(h => h.avg_position).reduce((sum, h) => sum + h.avg_position, 0) / earlierPeriod.filter(h => h.avg_position).length
      const recentPosition = recentPeriod.filter(h => h.avg_position).reduce((sum, h) => sum + h.avg_position, 0) / recentPeriod.filter(h => h.avg_position).length

      // Skip pages with minimal previous traffic
      if (earlierClicks < config.minPreviousClicks) continue

      // Calculate changes
      const clicksChange = earlierClicks > 0 ? ((recentClicks - earlierClicks) / earlierClicks) * 100 : 0
      const impressionsChange = earlierImpressions > 0 ? ((recentImpressions - earlierImpressions) / earlierImpressions) * 100 : 0
      const positionChange = recentPosition - earlierPosition // Positive = worse

      // Determine if decaying
      const isDecaying = 
        clicksChange < -config.clicksDropPercent ||
        impressionsChange < -config.impressionsDropPercent ||
        positionChange > config.positionDropThreshold

      if (isDecaying) {
        // Calculate severity
        let severity = 'medium'
        if (clicksChange < -50 || positionChange > 10) {
          severity = 'critical'
        } else if (clicksChange < -40 || positionChange > 7) {
          severity = 'high'
        }

        decayingPages.push({
          pageId: page.id,
          url: page.url,
          title: page.title,
          pageType: page.page_type,
          severity,
          metrics: {
            earlierClicks: Math.round(earlierClicks),
            recentClicks: Math.round(recentClicks),
            clicksChange: Math.round(clicksChange),
            earlierImpressions: Math.round(earlierImpressions),
            recentImpressions: Math.round(recentImpressions),
            impressionsChange: Math.round(impressionsChange),
            earlierPosition: earlierPosition ? earlierPosition.toFixed(1) : null,
            recentPosition: recentPosition ? recentPosition.toFixed(1) : null,
            positionChange: positionChange ? positionChange.toFixed(1) : null
          },
          decayFactors: [
            clicksChange < -config.clicksDropPercent && 'clicks_drop',
            impressionsChange < -config.impressionsDropPercent && 'impressions_drop',
            positionChange > config.positionDropThreshold && 'ranking_drop'
          ].filter(Boolean)
        })
      }
    }

    // Sort by severity and impact
    const severityOrder = { critical: 0, high: 1, medium: 2 }
    decayingPages.sort((a, b) => {
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity]
      }
      return Math.abs(b.metrics.clicksChange) - Math.abs(a.metrics.clicksChange)
    })

    // Update pages in database
    for (const decay of decayingPages) {
      await supabase
        .from('seo_pages')
        .update({
          is_decaying: true,
          decay_severity: decay.severity,
          decay_detected_at: new Date().toISOString(),
          decay_metrics: decay.metrics
        })
        .eq('id', decay.pageId)
    }

    // Reset non-decaying pages
    const decayingIds = decayingPages.map(p => p.pageId)
    if (decayingIds.length > 0) {
      await supabase
        .from('seo_pages')
        .update({ is_decaying: false, decay_severity: null })
        .eq('site_id', siteId)
        .not('id', 'in', `(${decayingIds.join(',')})`)
    }

    // Generate AI refresh recommendations for top decaying pages
    const topDecaying = decayingPages.slice(0, 10)
    let refreshRecommendations = []

    if (topDecaying.length > 0) {
      refreshRecommendations = await seoSkill.generateContentRefreshRecommendations(topDecaying, site)
      
      // Save recommendations
      for (const rec of refreshRecommendations) {
        await supabase
          .from('seo_ai_recommendations')
          .insert({
            site_id: siteId,
            page_id: rec.pageId,
            category: 'content_decay',
            priority: rec.severity === 'critical' ? 'critical' : rec.severity === 'high' ? 'high' : 'medium',
            title: `Refresh: ${rec.title}`,
            description: rec.recommendation,
            current_value: JSON.stringify(rec.metrics),
            suggested_value: rec.refreshStrategy,
            auto_fixable: false,
            impact_score: rec.severity === 'critical' ? 9 : rec.severity === 'high' ? 7 : 5,
            ai_model: 'signal-seo',
            status: 'pending',
            created_at: new Date().toISOString()
          })
      }
    }

    // Save analysis run
    await supabase
      .from('seo_ai_analysis_runs')
      .insert({
        site_id: siteId,
        run_type: 'content_decay',
        status: 'completed',
        results: {
          totalAnalyzed: pages?.length || 0,
          decayingFound: decayingPages.length,
          byseversity: {
            critical: decayingPages.filter(p => p.severity === 'critical').length,
            high: decayingPages.filter(p => p.severity === 'high').length,
            medium: decayingPages.filter(p => p.severity === 'medium').length
          },
          thresholds: config
        },
        ai_model: 'signal-seo',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })

    // Create alert if critical decay found
    const criticalCount = decayingPages.filter(p => p.severity === 'critical').length
    if (criticalCount > 0) {
      await supabase
        .from('seo_alerts')
        .insert({
          site_id: siteId,
          alert_type: 'content_decay',
          severity: 'high',
          title: `${criticalCount} pages with critical traffic decay`,
          message: `Content refresh recommended to recover lost traffic`,
          data: {
            criticalPages: decayingPages.filter(p => p.severity === 'critical').slice(0, 5)
          },
          triggered_at: new Date().toISOString(),
          status: 'active'
        })
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        totalAnalyzed: pages?.length || 0,
        decayingPages,
        refreshRecommendations,
        summary: {
          total: decayingPages.length,
          critical: decayingPages.filter(p => p.severity === 'critical').length,
          high: decayingPages.filter(p => p.severity === 'high').length,
          medium: decayingPages.filter(p => p.severity === 'medium').length
        }
      })
    }

  } catch (error) {
    console.error('[Content Decay] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}

