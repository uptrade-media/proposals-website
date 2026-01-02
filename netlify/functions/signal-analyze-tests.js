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


// netlify/functions/signal-analyze-tests.js
// Intelligent A/B Test Analysis - auto-detects winners, learns patterns, suggests optimizations

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import Signal from './utils/signal.js'

/**
 * Calculate statistical significance using two-proportion z-test
 * @param {number} conversionsA - Conversions for variant A
 * @param {number} viewsA - Total views for variant A
 * @param {number} conversionsB - Conversions for variant B
 * @param {number} viewsB - Total views for variant B
 * @returns {{ pValue: number, confidence: number, isSignificant: boolean }}
 */
function calculateSignificance(conversionsA, viewsA, conversionsB, viewsB) {
  // Conversion rates
  const rateA = conversionsA / viewsA
  const rateB = conversionsB / viewsB
  
  // Pooled proportion
  const pooled = (conversionsA + conversionsB) / (viewsA + viewsB)
  
  // Standard error
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / viewsA + 1 / viewsB))
  
  // Z-score
  const z = (rateB - rateA) / se
  
  // P-value (two-tailed test)
  const pValue = 2 * (1 - normalCDF(Math.abs(z)))
  
  // Confidence level
  const confidence = (1 - pValue) * 100
  
  return {
    pValue,
    confidence,
    isSignificant: confidence >= 95,
    lift: ((rateB - rateA) / rateA) * 100
  }
}

/**
 * Normal cumulative distribution function (approximation)
 */
function normalCDF(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x))
  const d = 0.3989423 * Math.exp(-x * x / 2)
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return x > 0 ? 1 - prob : prob
}

/**
 * Analyze A/B tests for statistical significance and patterns
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
    const { elementId, autoPromote = false } = JSON.parse(event.body || '{}')
    
    // Get organization ID
    const orgId = contact.org_id

    // Query for A/B tests that need analysis
    let query = supabase
      .from('engage_elements')
      .select('*, engage_element_variants(*)')
      .eq('org_id', orgId)
      .eq('is_ab_test', true)
      .eq('ab_test_status', 'running')
      .gte('views', 100) // Minimum sample size

    if (elementId) {
      query = query.eq('id', elementId)
    }

    const { data: elements, error: elementsError } = await query

    if (elementsError) throw elementsError

    const results = []
    const signal = new Signal(supabase, orgId)

    for (const element of elements) {
      const variants = element.engage_element_variants || []
      
      if (variants.length < 2) continue // Need at least 2 variants

      // Find control (original) and best performing variant
      const control = variants.find(v => v.is_control) || variants[0]
      const testVariants = variants.filter(v => !v.is_control)

      for (const variant of testVariants) {
        // Calculate statistical significance
        const stats = calculateSignificance(
          control.conversions || 0,
          control.views || 0,
          variant.conversions || 0,
          variant.views || 0
        )

        const analysis = {
          elementId: element.id,
          elementName: element.name,
          controlId: control.id,
          variantId: variant.id,
          variantName: variant.name,
          ...stats,
          sampleSize: {
            control: control.views,
            variant: variant.views
          },
          conversionRates: {
            control: (control.conversions / control.views * 100).toFixed(2) + '%',
            variant: (variant.conversions / variant.views * 100).toFixed(2) + '%'
          }
        }

        // If significant winner detected
        if (stats.isSignificant && stats.lift > 0) {
          // Store in Signal memory
          await signal.remember('engage', 'test_result', `test_${element.id}_${variant.id}`, {
            elementType: element.element_type,
            winner: variant.name,
            lift: stats.lift,
            confidence: stats.confidence,
            pattern: extractPattern(element, control, variant),
            timestamp: new Date().toISOString()
          }, { importance: 0.9 })

          // Learn pattern from winning variant
          const pattern = extractPattern(element, control, variant)
          if (pattern.patternKey) {
            await signal.learnPattern('engage', 'ab_test_insight', pattern.patternKey, {
              success: true,
              description: pattern.description,
              example: {
                winning_variant: variant.name,
                losing_variant: control.name,
                lift: stats.lift
              },
              patternData: pattern.data
            })
          }

          // Auto-promote winner if enabled
          if (autoPromote) {
            await supabase
              .from('engage_elements')
              .update({
                ab_test_status: 'completed',
                ab_test_winner_id: variant.id,
                content: variant.content,
                updated_at: new Date().toISOString()
              })
              .eq('id', element.id)

            analysis.promoted = true
          }
        }

        results.push(analysis)
      }
    }

    // Generate optimization suggestions from learned patterns
    const suggestions = await generateSuggestions(signal, orgId)

    return {
      statusCode: 200,
      body: JSON.stringify({
        analyzed: results.length,
        results,
        suggestions
      })
    }

  } catch (error) {
    console.error('A/B test analysis error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to analyze A/B tests',
        details: error.message
      })
    }
  }
}

/**
 * Extract pattern from winning variant comparison
 */
function extractPattern(element, control, variant) {
  const controlContent = control.content || {}
  const variantContent = variant.content || {}

  // Analyze headline differences
  if (controlContent.headline !== variantContent.headline) {
    const variantHeadline = variantContent.headline || ''
    const hasNumber = /\d+/.test(variantHeadline)
    const hasFree = /free/i.test(variantHeadline)
    const hasDiscount = /\d+%\s*(off|discount)/i.test(variantHeadline)
    const hasUrgency = /(limited|today|now|hurry)/i.test(variantHeadline)

    if (hasNumber && !hasDiscount) {
      return {
        patternKey: 'headline_numbers',
        description: 'Headlines with numbers perform better',
        data: { element_type: element.element_type, has_number: true }
      }
    }

    if (hasFree) {
      return {
        patternKey: 'headline_free',
        description: 'Headlines mentioning "free" increase conversions',
        data: { element_type: element.element_type, has_free: true }
      }
    }

    if (hasUrgency) {
      return {
        patternKey: 'headline_urgency',
        description: 'Urgency words in headlines drive action',
        data: { element_type: element.element_type, has_urgency: true }
      }
    }
  }

  // Analyze CTA differences
  if (controlContent.cta_text !== variantContent.cta_text) {
    const variantCTA = variantContent.cta_text || ''
    const isShort = variantCTA.length <= 20
    const isActionOriented = /^(get|start|try|claim|download|learn)/i.test(variantCTA)

    if (isShort && isActionOriented) {
      return {
        patternKey: 'cta_short_action',
        description: 'Short, action-oriented CTAs convert better',
        data: { element_type: element.element_type, cta_length: 'short', is_action: true }
      }
    }
  }

  // Analyze color/design differences
  if (controlContent.primary_color !== variantContent.primary_color) {
    return {
      patternKey: 'color_contrast',
      description: 'High-contrast CTA colors improve visibility',
      data: { element_type: element.element_type, color_variant: variantContent.primary_color }
    }
  }

  return { patternKey: null, description: 'Generic improvement', data: {} }
}

/**
 * Generate optimization suggestions from learned patterns
 */
async function generateSuggestions(signal, orgId) {
  const patterns = await signal.loadPatterns('engage')
  
  const suggestions = []

  // Analyze patterns for high-confidence recommendations
  for (const pattern of patterns) {
    if (pattern.success_rate > 0.7 && pattern.confidence > 0.8) {
      suggestions.push({
        type: pattern.pattern_type,
        recommendation: pattern.data.description || pattern.pattern_type,
        confidence: pattern.confidence,
        successRate: pattern.success_rate,
        examples: pattern.data.examples || []
      })
    }
  }

  return suggestions
}
