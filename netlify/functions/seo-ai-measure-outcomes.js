// netlify/functions/seo-ai-measure-outcomes.js
// Signal Learning - Track what worked and what didn't
// Compares recommendations applied vs ranking/traffic outcomes
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const params = event.queryStringParameters || {}
    const { siteId, period = '30d' } = params

    if (!siteId) {
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ error: 'siteId required' }) 
      }
    }

    const supabase = createSupabaseAdmin()

    // Check Signal access
    const { data: site, error: siteError } = await supabase
      .from('seo_sites')
      .select('signal_enabled, signal_thread_id')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Site not found' }) }
    }

    if (!site.signal_enabled) {
      return { 
        statusCode: 403, 
        headers, 
        body: JSON.stringify({ 
          error: 'Signal not enabled',
          requiresSignal: true
        }) 
      }
    }

    // Calculate date range
    const days = parseInt(period.replace('d', '')) || 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get outcomes with recommendation and page data
    const { data: outcomes, error: outcomesError } = await supabase
      .from('seo_ai_recommendation_outcomes')
      .select(`
        id,
        recommendation_id,
        page_id,
        category,
        change_type,
        target_keyword,
        clicks_change_pct,
        impressions_change_pct,
        ctr_change_pct,
        keyword_position_change,
        outcome,
        outcome_score,
        outcome_confidence,
        implemented_at,
        measured_at,
        days_since_implementation,
        before_value,
        after_value,
        recommendation:seo_ai_recommendations!seo_ai_recommendation_outcomes_recommendation_id_fkey(
          id,
          category,
          subcategory,
          suggested_value
        ),
        page:seo_pages(url, title)
      `)
      .eq('site_id', siteId)
      .gte('implemented_at', startDate.toISOString())
      .order('implemented_at', { ascending: false })

    if (outcomesError) {
      console.error('[Signal Learning] Error fetching outcomes:', outcomesError)
      return { statusCode: 500, headers, body: JSON.stringify({ error: outcomesError.message }) }
    }

    // Categorize into wins and losses
    const wins = []
    const losses = []
    const pending = []

    for (const item of outcomes || []) {
      if (!item.outcome || item.outcome === 'pending') {
        pending.push({
          id: item.id,
          pageUrl: item.page?.url,
          type: item.change_type || item.recommendation?.category,
          subcategory: item.recommendation?.subcategory,
          category: item.category,
          appliedAt: item.implemented_at,
          daysSinceApplied: item.days_since_implementation || 
            Math.floor((Date.now() - new Date(item.implemented_at).getTime()) / (1000 * 60 * 60 * 24))
        })
        continue
      }

      const learning = {
        id: item.id,
        pageUrl: item.page?.url,
        pageTitle: item.page?.title,
        type: item.change_type || item.recommendation?.category,
        subcategory: item.recommendation?.subcategory,
        category: item.category,
        change: item.after_value || item.recommendation?.suggested_value,
        appliedAt: item.implemented_at,
        measuredAt: item.measured_at,
        impact: {
          clicksChange: item.clicks_change_pct,
          impressionsChange: item.impressions_change_pct,
          ctrChange: item.ctr_change_pct,
          positionChange: item.keyword_position_change
        },
        confidence: item.outcome_confidence,
        score: item.outcome_score
      }

      if (item.outcome === 'win') {
        learning.improvement = item.outcome_score
        wins.push(learning)
      } else if (item.outcome === 'loss') {
        learning.decline = item.outcome_score
        losses.push(learning)
      }
    }

    // Calculate summary stats
    const stats = {
      totalMeasured: outcomes?.length || 0,
      winsCount: wins.length,
      lossesCount: losses.length,
      pendingCount: pending.length,
      winRate: (wins.length + losses.length) > 0 
        ? Math.round((wins.length / (wins.length + losses.length)) * 100) 
        : 0,
      avgImpact: calculateAverageImpact(wins)
    }

    // Get learning insights (patterns from wins)
    const learningInsights = generateLearningInsights(wins, losses)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        period,
        stats,
        wins,
        losses,
        pending,
        insights: learningInsights,
        hasSignal: true
      })
    }

  } catch (error) {
    console.error('[Signal Learning] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}

// Calculate average impact from wins
function calculateAverageImpact(wins) {
  if (!wins.length) return null

  let totalClickIncrease = 0
  let totalImpressionIncrease = 0
  let totalPositionImprovement = 0
  let count = 0

  for (const win of wins) {
    const impact = win.impact || {}
    if (impact.clicksChange) totalClickIncrease += impact.clicksChange
    if (impact.impressionsChange) totalImpressionIncrease += impact.impressionsChange
    if (impact.positionChange) totalPositionImprovement += Math.abs(impact.positionChange)
    count++
  }

  return {
    avgClicksIncrease: count ? Math.round(totalClickIncrease / count) : 0,
    avgImpressionsIncrease: count ? Math.round(totalImpressionIncrease / count) : 0,
    avgPositionImprovement: count ? (totalPositionImprovement / count).toFixed(1) : 0
  }
}

// Generate learning insights from patterns
function generateLearningInsights(wins, losses) {
  const insights = []

  // Find winning categories
  const categoryWins = {}
  const categoryLosses = {}

  for (const win of wins) {
    categoryWins[win.category] = (categoryWins[win.category] || 0) + 1
  }
  for (const loss of losses) {
    categoryLosses[loss.category] = (categoryLosses[loss.category] || 0) + 1
  }

  // Best performing category
  const bestCategory = Object.entries(categoryWins)
    .sort(([,a], [,b]) => b - a)[0]

  if (bestCategory && bestCategory[1] >= 2) {
    insights.push({
      type: 'pattern',
      message: `${bestCategory[0]} changes have the highest success rate (${bestCategory[1]} wins)`,
      confidence: 'high'
    })
  }

  // Worst performing category
  const worstCategory = Object.entries(categoryLosses)
    .sort(([,a], [,b]) => b - a)[0]

  if (worstCategory && worstCategory[1] >= 2) {
    insights.push({
      type: 'caution',
      message: `${worstCategory[0]} changes have had mixed results. Review before applying.`,
      confidence: 'medium'
    })
  }

  // Overall success message
  const totalMeasured = wins.length + losses.length
  if (totalMeasured >= 5) {
    const winRate = Math.round((wins.length / totalMeasured) * 100)
    if (winRate >= 70) {
      insights.push({
        type: 'success',
        message: `Signal recommendations have a ${winRate}% success rate for this site`,
        confidence: 'high'
      })
    } else if (winRate < 40) {
      insights.push({
        type: 'warning',
        message: 'Recommendations need refinement. Consider adjusting strategy.',
        confidence: 'medium'
      })
    }
  }

  return insights
}
