/**
 * SEO Cannibalization Detection Background Function
 * 
 * Detects keyword cannibalization across all pages with AI recommendations.
 * Background functions can run up to 15 minutes.
 * 
 * Triggered by POST from seo-cannibalization.js
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req) {
  console.log('[seo-cannibalization-background] Starting...')

  try {
    const { siteId, minImpressions = 100, jobId } = await req.json()

    if (!siteId) {
      return new Response(JSON.stringify({ error: 'siteId required' }), { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // Update job status if jobId provided
    if (jobId) {
      await supabase
        .from('seo_background_jobs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', jobId)
    }

    console.log(`[seo-cannibalization-background] Fetching pages for site ${siteId}`)

    // Get all pages with their keyword data from GSC
    const { data: pages, error: pagesError } = await supabase
      .from('seo_pages')
      .select('id, url, title, meta_description, clicks_28d, impressions_28d, avg_position_28d, top_queries')
      .eq('site_id', siteId)
      .gt('impressions_28d', 0)

    if (pagesError) {
      throw new Error(`Failed to fetch pages: ${pagesError.message}`)
    }

    console.log(`[seo-cannibalization-background] Found ${pages?.length || 0} pages`)

    // Get query-level data from seo_queries if available
    const { data: queries } = await supabase
      .from('seo_queries')
      .select('query, page_url, clicks, impressions, position')
      .eq('site_id', siteId)
      .gt('impressions', minImpressions)

    // Build keyword-to-pages mapping
    const keywordPageMap = new Map()

    // From seo_queries (more accurate)
    if (queries?.length > 0) {
      console.log(`[seo-cannibalization-background] Processing ${queries.length} queries`)
      for (const q of queries) {
        const keyword = q.query.toLowerCase().trim()
        if (!keywordPageMap.has(keyword)) {
          keywordPageMap.set(keyword, [])
        }
        keywordPageMap.get(keyword).push({
          url: q.page_url,
          page_id: pages?.find(p => p.url === q.page_url)?.id,
          title: pages?.find(p => p.url === q.page_url)?.title,
          position: q.position,
          impressions: q.impressions,
          clicks: q.clicks,
          ctr: q.clicks / q.impressions
        })
      }
    } else if (pages?.length > 0) {
      // Fallback: use top_queries from pages
      for (const page of pages) {
        const topQueries = page.top_queries || []
        for (const query of topQueries) {
          const keyword = (typeof query === 'string' ? query : query.query || '').toLowerCase().trim()
          if (!keyword) continue
          
          if (!keywordPageMap.has(keyword)) {
            keywordPageMap.set(keyword, [])
          }
          keywordPageMap.get(keyword).push({
            url: page.url,
            page_id: page.id,
            title: page.title,
            position: query.position || page.avg_position_28d,
            impressions: query.impressions || page.impressions_28d,
            clicks: query.clicks || page.clicks_28d,
            ctr: query.ctr || (page.clicks_28d / page.impressions_28d)
          })
        }
      }
    }

    // Find keywords with multiple ranking pages
    const cannibalizationIssues = []

    for (const [keyword, rankingPages] of keywordPageMap) {
      // Skip if only one page ranks
      if (rankingPages.length < 2) continue

      // Skip if total impressions too low
      const totalImpressions = rankingPages.reduce((sum, p) => sum + (p.impressions || 0), 0)
      if (totalImpressions < minImpressions) continue

      // Calculate metrics
      const positions = rankingPages.map(p => p.position).filter(Boolean)
      const positionVariance = positions.length > 1 
        ? Math.sqrt(positions.reduce((sum, p) => sum + Math.pow(p - (positions.reduce((s, v) => s + v, 0) / positions.length), 2), 0) / positions.length)
        : 0

      // Estimate CTR loss (consolidated ranking typically has better CTR)
      const totalClicks = rankingPages.reduce((sum, p) => sum + (p.clicks || 0), 0)
      const bestPosition = Math.min(...positions)
      const expectedCtr = getExpectedCtr(bestPosition)
      const expectedClicks = totalImpressions * expectedCtr
      const ctrLoss = Math.max(0, (expectedClicks - totalClicks) / totalImpressions)

      // Determine severity
      let severity = 'low'
      if (ctrLoss > 0.03 || rankingPages.length > 3) severity = 'critical'
      else if (ctrLoss > 0.02 || rankingPages.length > 2) severity = 'high'
      else if (ctrLoss > 0.01) severity = 'medium'

      // Find the best performing page
      const bestPage = rankingPages.reduce((best, page) => {
        const score = (page.clicks || 0) * 2 + (page.impressions || 0) * 0.1 - (page.position || 100)
        const bestScore = (best.clicks || 0) * 2 + (best.impressions || 0) * 0.1 - (best.position || 100)
        return score > bestScore ? page : best
      }, rankingPages[0])

      cannibalizationIssues.push({
        keyword,
        keyword_hash: hashKeyword(keyword),
        competing_pages: rankingPages.sort((a, b) => (a.position || 100) - (b.position || 100)),
        page_count: rankingPages.length,
        total_impressions: totalImpressions,
        total_clicks: totalClicks,
        position_variance: positionVariance,
        ctr_loss_estimate: ctrLoss,
        estimated_traffic_loss: Math.round((expectedClicks - totalClicks) * 30), // Monthly
        severity,
        recommended_primary_page_id: bestPage.page_id,
        recommended_primary_url: bestPage.url
      })
    }

    console.log(`[seo-cannibalization-background] Found ${cannibalizationIssues.length} issues`)

    // Get AI recommendations for top issues
    const topIssues = cannibalizationIssues
      .sort((a, b) => (b.estimated_traffic_loss || 0) - (a.estimated_traffic_loss || 0))
      .slice(0, 20)

    if (topIssues.length > 0) {
      console.log('[seo-cannibalization-background] Getting AI recommendations...')
      const aiRecommendations = await getAiRecommendations(openai, topIssues)
      
      // Merge AI recommendations
      for (const issue of topIssues) {
        const aiRec = aiRecommendations.find(r => r.keyword === issue.keyword)
        if (aiRec) {
          issue.ai_strategy = aiRec.strategy
          issue.ai_reasoning = aiRec.reasoning
          issue.ai_action_steps = aiRec.action_steps
        }
      }
    }

    // Upsert to database
    console.log('[seo-cannibalization-background] Saving issues to database...')
    for (const issue of cannibalizationIssues) {
      const { error } = await supabase
        .from('seo_cannibalization')
        .upsert({
          site_id: siteId,
          ...issue,
          status: 'detected',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'site_id,keyword_hash'
        })
      
      if (error) {
        console.error(`[seo-cannibalization-background] Failed to save issue for ${issue.keyword}:`, error)
      }
    }

    // Mark pages with cannibalization risk
    const affectedPageIds = [...new Set(cannibalizationIssues.flatMap(i => 
      i.competing_pages.map(p => p.page_id).filter(Boolean)
    ))]

    if (affectedPageIds.length > 0) {
      await supabase
        .from('seo_pages')
        .update({ cannibalization_risk: true })
        .in('id', affectedPageIds)
    }

    const result = {
      success: true,
      issuesFound: cannibalizationIssues.length,
      criticalIssues: cannibalizationIssues.filter(i => i.severity === 'critical').length,
      highIssues: cannibalizationIssues.filter(i => i.severity === 'high').length,
      estimatedMonthlyTrafficLoss: cannibalizationIssues.reduce((sum, i) => sum + (i.estimated_traffic_loss || 0), 0),
      topIssues: topIssues.slice(0, 10)
    }

    console.log('[seo-cannibalization-background] Complete')

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
    console.error('[seo-cannibalization-background] Error:', error)

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

// Expected CTR by position (industry averages)
function getExpectedCtr(position) {
  const ctrByPosition = {
    1: 0.316,
    2: 0.158,
    3: 0.107,
    4: 0.076,
    5: 0.058,
    6: 0.045,
    7: 0.036,
    8: 0.030,
    9: 0.025,
    10: 0.022
  }
  return ctrByPosition[Math.round(position)] || 0.01
}

function hashKeyword(keyword) {
  // Simple hash for deduplication
  let hash = 0
  for (let i = 0; i < keyword.length; i++) {
    const char = keyword.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}

async function getAiRecommendations(openai, issues) {
  try {
    const issueDescriptions = issues.map(issue => ({
      keyword: issue.keyword,
      pages: issue.competing_pages.map(p => ({
        url: p.url,
        title: p.title,
        position: p.position,
        clicks: p.clicks
      }))
    }))

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an SEO expert analyzing keyword cannibalization issues. For each issue, recommend a strategy:
- consolidate: Merge content into one page, redirect others
- differentiate: Make each page target distinct long-tail variations  
- canonicalize: Use canonical tags to signal preferred page
- deindex: Remove weaker page from index

Provide actionable steps. Be specific about which page should be primary.`
        },
        {
          role: 'user',
          content: `Analyze these cannibalization issues and recommend strategies:\n\n${JSON.stringify(issueDescriptions, null, 2)}\n\nRespond with JSON array: [{keyword, strategy, reasoning, action_steps: []}]`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })

    const result = JSON.parse(response.choices[0].message.content)
    return result.recommendations || result.issues || []
  } catch (error) {
    console.error('[seo-cannibalization-background] AI recommendation error:', error)
    return []
  }
}
