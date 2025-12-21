/**
 * SEO Content Decay Background Function
 * 
 * Detects declining content and generates refresh recommendations with AI.
 * Background functions can run up to 15 minutes.
 * 
 * Triggered by POST from seo-content-decay.js
 */

import { createClient } from '@supabase/supabase-js'
import { SEOSkill } from './skills/seo-skill.js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const SEO_AI_MODEL = process.env.SEO_AI_MODEL || 'gpt-4o'

export default async function handler(req) {
  console.log('[seo-content-decay-background] Starting...')

  try {
    const { siteId, thresholds = {}, jobId } = await req.json()

    if (!siteId) {
      return new Response(JSON.stringify({ error: 'siteId required' }), { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Update job status if jobId provided
    if (jobId) {
      await supabase
        .from('seo_background_jobs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', jobId)
    }

    // Default thresholds
    const config = {
      clicksDropPercent: thresholds.clicksDropPercent || 30,
      impressionsDropPercent: thresholds.impressionsDropPercent || 25,
      positionDropThreshold: thresholds.positionDropThreshold || 5,
      lookbackDays: thresholds.lookbackDays || 90,
      minPreviousClicks: thresholds.minPreviousClicks || 10
    }

    // Get site GSC connection
    const { data: site } = await supabase
      .from('seo_sites')
      .select('*, gsc_property_url, org_id, org:organizations(name)')
      .eq('id', siteId)
      .single()

    if (!site) {
      throw new Error('Site not found')
    }

    const seoSkill = new SEOSkill(supabase, site.org_id, siteId, {})

    console.log(`[seo-content-decay-background] Fetching pages for site ${siteId}`)

    // Get pages with historical data
    const { data: pages, error: pagesError } = await supabase
      .from('seo_pages')
      .select(`
        *,
        history:seo_page_history(
          date,
          clicks,
          impressions,
          position
        )
      `)
      .eq('site_id', siteId)
      .order('clicks_28d', { ascending: false, nullsFirst: false })
      .limit(200)

    if (pagesError) {
      throw new Error(`Failed to fetch pages: ${pagesError.message}`)
    }

    console.log(`[seo-content-decay-background] Analyzing ${pages?.length || 0} pages`)

    // Analyze each page for decay
    const decayingPages = []

    for (const page of pages || []) {
      const history = page.history || []
      if (history.length < 2) continue

      // Sort history by date
      const sortedHistory = [...history].sort((a, b) => new Date(a.date) - new Date(b.date))

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

      const earlierPosition = earlierPeriod.filter(h => h.position).reduce((sum, h) => sum + h.position, 0) / earlierPeriod.filter(h => h.position).length
      const recentPosition = recentPeriod.filter(h => h.position).reduce((sum, h) => sum + h.position, 0) / recentPeriod.filter(h => h.position).length

      // Skip pages with minimal previous traffic
      if (earlierClicks < config.minPreviousClicks) continue

      // Calculate changes
      const clicksChange = earlierClicks > 0 ? ((recentClicks - earlierClicks) / earlierClicks) * 100 : 0
      const impressionsChange = earlierImpressions > 0 ? ((recentImpressions - earlierImpressions) / earlierImpressions) * 100 : 0
      const positionChange = recentPosition - earlierPosition

      // Determine if decaying
      const isDecaying = 
        clicksChange < -config.clicksDropPercent ||
        impressionsChange < -config.impressionsDropPercent ||
        positionChange > config.positionDropThreshold

      if (isDecaying) {
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

    console.log(`[seo-content-decay-background] Found ${decayingPages.length} decaying pages`)

    // Sort by severity and impact
    const severityOrder = { critical: 0, high: 1, medium: 2 }
    decayingPages.sort((a, b) => {
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity]
      }
      return Math.abs(b.metrics.clicksChange) - Math.abs(a.metrics.clicksChange)
    })

    // Update pages in database
    console.log('[seo-content-decay-background] Updating page records...')
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
      console.log('[seo-content-decay-background] Generating AI recommendations...')
      refreshRecommendations = await generateRefreshRecommendations(seoSkill, topDecaying, site)
      
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
            ai_model: SEO_AI_MODEL,
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
        ai_model: SEO_AI_MODEL,
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

    const result = {
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
    }

    console.log('[seo-content-decay-background] Complete')

    // Update job status
    if (jobId) {
      await supabase
        .from('seo_background_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          result
        })
        .eq('id', jobId)
    }

    return new Response(JSON.stringify(result), { status: 200 })

  } catch (error) {
    console.error('[seo-content-decay-background] Error:', error)

    // Update job with error
    try {
      const { jobId } = await req.json().catch(() => ({}))
      if (jobId) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        await supabase
          .from('seo_background_jobs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error: error.message
          })
          .eq('id', jobId)
      }
    } catch (e) {
      // Ignore
    }

    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}

// Generate AI refresh recommendations
async function generateRefreshRecommendations(seoSkill, decayingPages, site) {
  try {
    const prompt = `Analyze these decaying content pages and provide specific refresh recommendations.

SITE: ${site.domain}
INDUSTRY: ${site.org?.name || 'Unknown'}

DECAYING PAGES:
${decayingPages.map((p, i) => `
${i + 1}. ${p.url}
   Title: ${p.title}
   Severity: ${p.severity}
   Clicks: ${p.metrics.earlierClicks} → ${p.metrics.recentClicks} (${p.metrics.clicksChange}%)
   Position: ${p.metrics.earlierPosition || 'N/A'} → ${p.metrics.recentPosition || 'N/A'}
   Decay Factors: ${p.decayFactors.join(', ')}
`).join('\n')}

For each page, provide a specific refresh strategy:
1. Why is it likely decaying? (content freshness, competition, search intent shift, etc.)
2. What specific updates would help recover rankings?
3. Priority level for refresh

Return as JSON:
{
  "recommendations": [
    {
      "pageUrl": "url",
      "title": "page title",
      "pageId": "id",
      "severity": "critical|high|medium",
      "likelyDecayCause": "explanation",
      "recommendation": "detailed recommendation",
      "refreshStrategy": "specific steps to take",
      "estimatedEffort": "hours",
      "potentialImpact": "expected traffic recovery"
    }
  ]
}`

    const result = await seoSkill.signal.invoke({
      module: 'seo',
      tool: 'content_decay_recommendations',
      systemPrompt: 'You are an expert content strategist specializing in content refresh and SEO recovery. Analyze decaying content and provide specific, actionable refresh recommendations.',
      userPrompt: prompt,
      responseFormat: { type: 'json_object' },
      temperature: 0.4
    })
    
    // Merge with original page data
    return (result.recommendations || []).map(rec => {
      const original = decayingPages.find(p => p.url === rec.pageUrl)
      return {
        ...rec,
        pageId: original?.pageId,
        metrics: original?.metrics
      }
    })

  } catch (error) {
    console.error('[seo-content-decay-background] AI recommendations error:', error)
    return []
  }
}
