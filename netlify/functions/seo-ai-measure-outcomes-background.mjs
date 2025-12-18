// netlify/functions/seo-ai-measure-outcomes-background.mjs
// ═══════════════════════════════════════════════════════════════════════════════
// Measures outcomes for implemented recommendations
// Runs on a schedule to:
// 1. Find recommendations that were implemented 14+ days ago
// 2. Fetch before/after metrics from GSC
// 3. Calculate if it was a win, loss, or neutral
// 4. Update learning patterns for the AI
// ═══════════════════════════════════════════════════════════════════════════════

import { createSupabaseAdmin } from './utils/supabase.js'
import { 
  recordOutcome, 
  findRecommendationsToMeasure,
  generateInsightsFromPatterns 
} from './utils/seo-ai-learning.js'

export const config = {
  type: 'background'
}

const DAYS_BEFORE = 30  // Compare 30 days before implementation
const DAYS_AFTER = 30   // To 30 days after implementation

export async function handler(event) {
  const startTime = Date.now()
  const supabase = createSupabaseAdmin()
  
  console.log('[Outcome Measurement] Starting outcome measurement job')
  
  try {
    // 1. Find recommendations to measure
    const pendingMeasurements = await findRecommendationsToMeasure()
    
    console.log(`[Outcome Measurement] Found ${pendingMeasurements.length} recommendations to measure`)
    
    if (pendingMeasurements.length === 0) {
      return { statusCode: 200, body: 'No recommendations to measure' }
    }
    
    let measured = 0
    let failed = 0
    
    // 2. Process each recommendation
    for (const rec of pendingMeasurements) {
      try {
        await measureRecommendation(supabase, rec)
        measured++
      } catch (error) {
        console.error(`[Outcome Measurement] Failed to measure ${rec.id}:`, error.message)
        failed++
      }
    }
    
    // 3. Generate insights from new patterns
    const siteIds = [...new Set(pendingMeasurements.map(r => r.site_id))]
    for (const siteId of siteIds) {
      try {
        const insights = await generateInsightsFromPatterns(siteId)
        if (insights.length > 0) {
          console.log(`[Outcome Measurement] Generated ${insights.length} new insights for site ${siteId}`)
        }
      } catch (error) {
        console.error(`[Outcome Measurement] Failed to generate insights for ${siteId}:`, error.message)
      }
    }
    
    const duration = Date.now() - startTime
    console.log(`[Outcome Measurement] Complete. Measured: ${measured}, Failed: ${failed}. Duration: ${duration}ms`)
    
    return {
      statusCode: 200,
      body: JSON.stringify({ measured, failed, duration })
    }
  } catch (error) {
    console.error('[Outcome Measurement] Job failed:', error)
    return { statusCode: 500, body: error.message }
  }
}

/**
 * Measure the outcome of a single recommendation
 */
async function measureRecommendation(supabase, rec) {
  const implementedAt = new Date(rec.implemented_at)
  const beforeStart = new Date(implementedAt)
  beforeStart.setDate(beforeStart.getDate() - DAYS_BEFORE)
  const afterEnd = new Date(implementedAt)
  afterEnd.setDate(afterEnd.getDate() + DAYS_AFTER)
  
  // Check if we have enough time for measurement
  if (afterEnd > new Date()) {
    console.log(`[Outcome Measurement] Not enough time elapsed for ${rec.id}`)
    return
  }
  
  const pageUrl = rec.page?.url
  if (!pageUrl) {
    console.log(`[Outcome Measurement] No page URL for ${rec.id}`)
    return
  }
  
  // Fetch GSC metrics for before period
  const { data: beforeMetrics } = await supabase
    .from('seo_gsc_queries')
    .select('clicks_28d, impressions_28d, avg_position_28d, ctr_28d')
    .eq('site_id', rec.site_id)
    .eq('page_url', pageUrl)
    .gte('date', beforeStart.toISOString().split('T')[0])
    .lt('date', implementedAt.toISOString().split('T')[0])
    .order('date', { ascending: false })
    .limit(1)
    .single()
  
  // Fetch GSC metrics for after period
  const { data: afterMetrics } = await supabase
    .from('seo_gsc_queries')
    .select('clicks_28d, impressions_28d, avg_position_28d, ctr_28d')
    .eq('site_id', rec.site_id)
    .eq('page_url', pageUrl)
    .gte('date', afterEnd.toISOString().split('T')[0])
    .order('date', { ascending: false })
    .limit(1)
    .single()
  
  // Get target keyword position if applicable
  let positionBefore = null
  let positionAfter = null
  let targetKeyword = null
  
  if (rec.category === 'title' || rec.category === 'meta' || rec.category === 'content') {
    // Try to find the main keyword for this page
    const { data: keywordData } = await supabase
      .from('seo_gsc_queries')
      .select('query, avg_position_28d')
      .eq('site_id', rec.site_id)
      .eq('page_url', pageUrl)
      .order('clicks_28d', { ascending: false })
      .limit(1)
      .single()
    
    if (keywordData) {
      targetKeyword = keywordData.query
      
      // Get position before
      const { data: posBefore } = await supabase
        .from('seo_gsc_queries')
        .select('avg_position_28d')
        .eq('site_id', rec.site_id)
        .eq('page_url', pageUrl)
        .eq('query', targetKeyword)
        .gte('date', beforeStart.toISOString().split('T')[0])
        .lt('date', implementedAt.toISOString().split('T')[0])
        .order('date', { ascending: false })
        .limit(1)
        .single()
      
      // Get position after
      const { data: posAfter } = await supabase
        .from('seo_gsc_queries')
        .select('avg_position_28d')
        .eq('site_id', rec.site_id)
        .eq('page_url', pageUrl)
        .eq('query', targetKeyword)
        .gte('date', afterEnd.toISOString().split('T')[0])
        .order('date', { ascending: false })
        .limit(1)
        .single()
      
      positionBefore = posBefore?.avg_position_28d
      positionAfter = posAfter?.avg_position_28d
    }
  }
  
  // Record the outcome
  await recordOutcome({
    recommendationId: rec.id,
    siteId: rec.site_id,
    pageId: rec.page_id,
    category: rec.category,
    changeType: rec.subcategory || rec.field_name,
    beforeValue: rec.current_value,
    afterValue: rec.suggested_value,
    implementedAt: rec.implemented_at,
    targetKeyword,
    positionBefore,
    positionAfter,
    clicksBefore: beforeMetrics?.clicks_28d,
    clicksAfter: afterMetrics?.clicks_28d,
    impressionsBefore: beforeMetrics?.impressions_28d,
    impressionsAfter: afterMetrics?.impressions_28d,
    ctrBefore: beforeMetrics?.ctr_28d,
    ctrAfter: afterMetrics?.ctr_28d
  })
  
  console.log(`[Outcome Measurement] Recorded outcome for recommendation ${rec.id}`)
}
