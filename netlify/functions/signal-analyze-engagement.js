// ============================================================================
// DEPRECATED: This function is now redundant - use Signal API directly
// ============================================================================
// Portal now calls Signal API (NestJS) instead of internal Signal implementation.
// This function remains for backward compatibility but should not be used in new code.
//
// Migration:
//   Old: /.netlify/functions/signal-xxx
//   New: Signal API endpoints (see SIGNAL-API-MIGRATION.md)
//
// Signal API Base URL: $SIGNAL_API_URL (http://localhost:3001 or https://signal-api.uptrademedia.com)
// ============================================================================


// netlify/functions/signal-analyze-engagement.js
// Signal-Powered Analytics Intelligence - detects patterns and suggests optimizations

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import Signal from './utils/signal.js'

/**
 * Analyze engagement patterns across all Engage elements
 */
export async function handler(event) {
  try {
    // Authenticate user
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }

    const supabase = createSupabaseAdmin()
    const orgId = contact.org_id
    const { projectId, dateRange = 30 } = JSON.parse(event.body || '{}')

    // Initialize Signal for pattern learning
    const signal = new Signal(supabase, orgId)

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - dateRange)

    // Get all elements with their performance data
    const { data: elements, error: elementsError } = await supabase
      .from('engage_elements')
      .select(`
        *,
        engage_analytics (
          views,
          interactions,
          conversions,
          dismissals,
          device,
          created_at
        )
      `)
      .eq('org_id', orgId)
      .gte('engage_analytics.created_at', startDate.toISOString())
      .lte('engage_analytics.created_at', endDate.toISOString())

    if (elementsError) throw elementsError

    const insights = []
    const patterns = []

    // Analyze each element type
    const elementsByType = groupBy(elements, 'element_type')

    for (const [elementType, typeElements] of Object.entries(elementsByType)) {
      const analysis = analyzeElementType(elementType, typeElements)
      
      if (analysis.insights.length > 0) {
        insights.push(...analysis.insights)
      }

      if (analysis.patterns.length > 0) {
        // Store patterns in Signal memory
        for (const pattern of analysis.patterns) {
          await signal.learnPattern('engage', 'engagement_optimization', pattern.key, {
            success: true,
            description: pattern.description,
            confidence: pattern.confidence,
            supporting_data: pattern.data
          })

          await signal.remember('engage', 'insight', pattern.key, {
            pattern: pattern.key,
            recommendation: pattern.recommendation,
            confidence: pattern.confidence,
            supporting_data: pattern.data
          }, { importance: pattern.importance })
        }

        patterns.push(...analysis.patterns)
      }
    }

    // Analyze device-specific patterns
    const deviceInsights = analyzeDevicePatterns(elements)
    insights.push(...deviceInsights.insights)

    // Analyze timing patterns
    const timingInsights = analyzeTimingPatterns(elements)
    insights.push(...timingInsights.insights)

    // Analyze trigger effectiveness
    const triggerInsights = analyzeTriggerEffectiveness(elements)
    insights.push(...triggerInsights.insights)

    // Sort insights by impact (conversion lift * confidence)
    insights.sort((a, b) => b.impact - a.impact)

    return {
      statusCode: 200,
      body: JSON.stringify({
        insights: insights.slice(0, 10), // Top 10 insights
        patterns: patterns.length,
        analyzed: elements.length,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      })
    }

  } catch (error) {
    console.error('Engagement analysis error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to analyze engagement',
        details: error.message
      })
    }
  }
}

/**
 * Analyze patterns for specific element type
 */
function analyzeElementType(elementType, elements) {
  const insights = []
  const patterns = []

  // Calculate aggregate stats
  const totalViews = elements.reduce((sum, el) => sum + (el.views || 0), 0)
  const totalConversions = elements.reduce((sum, el) => sum + (el.conversions || 0), 0)
  const avgConversionRate = totalConversions / totalViews

  // Group by trigger type
  const byTrigger = groupBy(elements, 'trigger_type')

  for (const [trigger, triggerElements] of Object.entries(byTrigger)) {
    const triggerViews = triggerElements.reduce((sum, el) => sum + (el.views || 0), 0)
    const triggerConversions = triggerElements.reduce((sum, el) => sum + (el.conversions || 0), 0)
    const triggerRate = triggerConversions / triggerViews

    const lift = ((triggerRate - avgConversionRate) / avgConversionRate) * 100

    if (Math.abs(lift) > 20 && triggerViews > 100) {
      insights.push({
        type: 'trigger_performance',
        elementType,
        trigger,
        message: lift > 0
          ? `${trigger} ${elementType}s convert ${lift.toFixed(0)}% better than average`
          : `${trigger} ${elementType}s convert ${Math.abs(lift).toFixed(0)}% worse than average`,
        recommendation: lift > 0
          ? `Use ${trigger} triggers for your ${elementType}s`
          : `Consider switching from ${trigger} to a better-performing trigger`,
        confidence: Math.min(triggerViews / 1000, 0.95),
        impact: Math.abs(lift) * 0.01,
        data: {
          conversionRate: (triggerRate * 100).toFixed(2) + '%',
          sampleSize: triggerViews,
          lift
        }
      })

      if (lift > 30) {
        patterns.push({
          key: `${elementType}_${trigger}_high_performance`,
          description: `${trigger} triggers work well for ${elementType}s`,
          recommendation: `Prioritize ${trigger} triggers for ${elementType} elements`,
          confidence: Math.min(triggerViews / 1000, 0.95),
          importance: 0.8,
          data: {
            elementType,
            trigger,
            conversionRate: (triggerRate * 100).toFixed(2) + '%',
            lift
          }
        })
      }
    }
  }

  return { insights, patterns }
}

/**
 * Analyze device-specific patterns
 */
function analyzeDevicePatterns(elements) {
  const insights = []

  const deviceStats = {}
  
  for (const element of elements) {
    for (const analytics of element.engage_analytics || []) {
      const device = analytics.device || 'unknown'
      
      if (!deviceStats[device]) {
        deviceStats[device] = { views: 0, conversions: 0, dismissals: 0 }
      }

      deviceStats[device].views += analytics.views || 0
      deviceStats[device].conversions += analytics.conversions || 0
      deviceStats[device].dismissals += analytics.dismissals || 0
    }
  }

  // Compare mobile vs desktop
  if (deviceStats.mobile && deviceStats.desktop) {
    const mobileRate = deviceStats.mobile.conversions / deviceStats.mobile.views
    const desktopRate = deviceStats.desktop.conversions / deviceStats.desktop.views
    const mobileDismissRate = deviceStats.mobile.dismissals / deviceStats.mobile.views
    const desktopDismissRate = deviceStats.desktop.dismissals / deviceStats.desktop.views

    if (mobileDismissRate > desktopDismissRate * 1.4) {
      insights.push({
        type: 'device_behavior',
        message: `Mobile users dismiss elements ${((mobileDismissRate / desktopDismissRate) * 100 - 100).toFixed(0)}% faster`,
        recommendation: 'Reduce element size and show duration on mobile',
        confidence: 0.85,
        impact: 0.6,
        data: {
          mobileDismissRate: (mobileDismissRate * 100).toFixed(1) + '%',
          desktopDismissRate: (desktopDismissRate * 100).toFixed(1) + '%'
        }
      })
    }

    if (mobileRate < desktopRate * 0.7) {
      insights.push({
        type: 'device_conversion',
        message: 'Mobile conversion rate is significantly lower than desktop',
        recommendation: 'Optimize mobile UX - consider simpler forms and larger tap targets',
        confidence: 0.8,
        impact: 0.7,
        data: {
          mobileRate: (mobileRate * 100).toFixed(2) + '%',
          desktopRate: (desktopRate * 100).toFixed(2) + '%'
        }
      })
    }
  }

  return { insights }
}

/**
 * Analyze timing patterns (hour of day, day of week)
 */
function analyzeTimingPatterns(elements) {
  const insights = []

  const hourlyStats = new Array(24).fill(0).map(() => ({ views: 0, conversions: 0 }))

  for (const element of elements) {
    for (const analytics of element.engage_analytics || []) {
      const hour = new Date(analytics.created_at).getHours()
      hourlyStats[hour].views += analytics.views || 0
      hourlyStats[hour].conversions += analytics.conversions || 0
    }
  }

  // Find peak and low hours
  const hourlyRates = hourlyStats.map((stats, hour) => ({
    hour,
    rate: stats.conversions / Math.max(stats.views, 1),
    views: stats.views
  })).filter(h => h.views > 50)

  if (hourlyRates.length > 0) {
    hourlyRates.sort((a, b) => b.rate - a.rate)
    const peakHour = hourlyRates[0]
    const lowHour = hourlyRates[hourlyRates.length - 1]

    const difference = ((peakHour.rate - lowHour.rate) / lowHour.rate) * 100

    if (difference > 50) {
      insights.push({
        type: 'timing_optimization',
        message: `Engagement peaks at ${formatHour(peakHour.hour)} (${(peakHour.rate * 100).toFixed(1)}% conversion)`,
        recommendation: `Schedule important campaigns around ${formatHour(peakHour.hour)}`,
        confidence: 0.75,
        impact: 0.5,
        data: {
          peakHour: peakHour.hour,
          peakRate: (peakHour.rate * 100).toFixed(2) + '%',
          lowHour: lowHour.hour,
          lowRate: (lowHour.rate * 100).toFixed(2) + '%'
        }
      })
    }
  }

  return { insights }
}

/**
 * Analyze trigger effectiveness
 */
function analyzeTriggerEffectiveness(elements) {
  const insights = []

  const scrollElements = elements.filter(el => el.trigger_type === 'scroll')
  const exitElements = elements.filter(el => el.trigger_type === 'exit_intent')
  const timedElements = elements.filter(el => el.trigger_type === 'time')

  const scrollRate = calculateAvgRate(scrollElements)
  const exitRate = calculateAvgRate(exitElements)
  const timedRate = calculateAvgRate(timedElements)

  const rates = [
    { type: 'scroll', rate: scrollRate },
    { type: 'exit_intent', rate: exitRate },
    { type: 'time', rate: timedRate }
  ].filter(r => r.rate > 0).sort((a, b) => b.rate - a.rate)

  if (rates.length >= 2 && rates[0].rate > rates[1].rate * 2) {
    insights.push({
      type: 'trigger_recommendation',
      message: `${rates[0].type} triggers convert ${((rates[0].rate / rates[1].rate - 1) * 100).toFixed(0)}% better`,
      recommendation: `Switch underperforming elements to ${rates[0].type} triggers`,
      confidence: 0.8,
      impact: 0.65,
      data: {
        best: rates[0].type,
        bestRate: (rates[0].rate * 100).toFixed(2) + '%',
        comparison: rates[1].type,
        comparisonRate: (rates[1].rate * 100).toFixed(2) + '%'
      }
    })
  }

  return { insights }
}

// Helper functions
function groupBy(array, key) {
  return array.reduce((result, item) => {
    const group = item[key] || 'unknown'
    if (!result[group]) result[group] = []
    result[group].push(item)
    return result
  }, {})
}

function calculateAvgRate(elements) {
  const totalViews = elements.reduce((sum, el) => sum + (el.views || 0), 0)
  const totalConversions = elements.reduce((sum, el) => sum + (el.conversions || 0), 0)
  return totalViews > 0 ? totalConversions / totalViews : 0
}

function formatHour(hour) {
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}${period}`
}
