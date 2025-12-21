// netlify/functions/seo-ai-brain-background.mjs
// Background function for comprehensive AI SEO analysis - runs up to 15 minutes
// Thin orchestrator that delegates to SEOSkill.runComprehensiveAnalysis()
//
// Migration: December 21, 2025
// - Replaced 957 lines of monolithic code with ~100 lines
// - All AI calls now route through Signal for memory, patterns, and logging
// - Analysis logic consolidated into SEOSkill

import { createSupabaseAdmin } from './utils/supabase.js'
import { SEOSkill } from './skills/seo-skill.js'

export const config = {
  type: 'background'
}

// Use env variable for model - easily update when new models release
const SEO_AI_MODEL = process.env.SEO_AI_MODEL || 'gpt-4o'

export async function handler(event) {
  const startTime = Date.now()
  
  try {
    const body = JSON.parse(event.body || '{}')
    const { 
      siteId, 
      userId,
      analysisType = 'comprehensive',
      focusAreas = [],
      pageIds = [],
      runId: existingRunId
    } = body

    if (!siteId) {
      console.error('[AI Brain BG] No siteId provided')
      return
    }

    const supabase = createSupabaseAdmin()
    
    // Get site to determine orgId
    const { data: site, error: siteError } = await supabase
      .from('seo_sites')
      .select('org_id')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      console.error('[AI Brain BG] Site not found:', siteId)
      return
    }

    const orgId = site.org_id

    // Create analysis run record if not passed in
    let runId = existingRunId
    if (!runId) {
      const { data: analysisRun, error: runError } = await supabase
        .from('seo_ai_analysis_runs')
        .insert({
          site_id: siteId,
          analysis_type: analysisType,
          triggered_by: 'manual',
          triggered_by_user: userId,
          scope_description: focusAreas.length > 0 ? `Focus: ${focusAreas.join(', ')}` : 'Full site analysis',
          status: 'running',
          started_at: new Date().toISOString()
        })
        .select()
        .single()

      if (runError) {
        console.error('[AI Brain BG] Failed to create run:', runError)
      }
      runId = analysisRun?.id
    }

    console.log(`[AI Brain BG] Starting ${analysisType} analysis for site ${siteId} via SEOSkill`)

    // Create SEOSkill and run comprehensive analysis
    const seoSkill = new SEOSkill(supabase, orgId, siteId, { userId })
    
    const results = await seoSkill.runComprehensiveAnalysis({
      analysisType,
      focusAreas,
      pageIds,
      runId
    })

    // Update analysis run as complete
    const duration = Date.now() - startTime
    await supabase
      .from('seo_ai_analysis_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_ms: duration,
        recommendations_generated: results.totalRecommendations,
        critical_issues_found: results.criticalIssues,
        quick_wins_found: results.quickWins,
        health_score: results.healthScore,
        ai_model: SEO_AI_MODEL
      })
      .eq('id', runId)

    // Update site with latest analysis timestamp
    await supabase
      .from('seo_sites')
      .update({
        last_ai_analysis_at: new Date().toISOString(),
        seo_health_score: results.healthScore,
        updated_at: new Date().toISOString()
      })
      .eq('id', siteId)

    console.log(`[AI Brain BG] Analysis complete. Generated ${results.totalRecommendations} recommendations in ${duration}ms`)

  } catch (error) {
    console.error('[AI Brain BG] Error:', error)
    
    try {
      const supabase = createSupabaseAdmin()
      const body = JSON.parse(event.body || '{}')
      
      // Try to mark the run as failed
      await supabase
        .from('seo_ai_analysis_runs')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('site_id', body.siteId)
        .eq('status', 'running')
    } catch (e) {
      console.error('[AI Brain BG] Could not update failure status')
    }
  }
}
