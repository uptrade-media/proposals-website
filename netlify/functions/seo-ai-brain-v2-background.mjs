// netlify/functions/seo-ai-brain-v2-background.mjs
// ═══════════════════════════════════════════════════════════════════════════════
// SEO AI Brain v2 - Using OpenAI Assistants API for persistent context
// ═══════════════════════════════════════════════════════════════════════════════
// Each site has its own conversation thread that maintains full history
// The AI remembers previous analyses, recommendations, and their outcomes
// NEW: Includes learning from past recommendation outcomes (wins/losses)

import { createSupabaseAdmin } from './utils/supabase.js'
import {
  getOrCreateAssistant,
  getOrCreateThread,
  runAnalysis,
  buildAnalysisContext,
  buildAnalysisPrompt
} from './utils/openai-assistants.js'
import { buildLearningContext } from './utils/seo-ai-learning.js'

export const config = {
  type: 'background'
}

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
      additionalContext = ''
    } = body

    if (!siteId) {
      console.error('[AI Brain v2] No siteId provided')
      return
    }

    const supabase = createSupabaseAdmin()
    
    console.log(`[AI Brain v2] Starting ${analysisType} analysis for site ${siteId}`)

    // 1. Fetch site data
    const { data: site, error: siteError } = await supabase
      .from('seo_sites')
      .select('*, org:organizations(id, name, domain)')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      console.error('[AI Brain v2] Site not found:', siteId)
      return
    }

    const orgId = site.org_id

    // 2. Create analysis run record
    const { data: analysisRun, error: runError } = await supabase
      .from('seo_ai_analysis_runs')
      .insert({
        site_id: siteId,
        analysis_type: analysisType,
        triggered_by: 'manual',
        triggered_by_user: userId,
        scope_description: focusAreas.length > 0 ? `Focus: ${focusAreas.join(', ')}` : 'Full site analysis',
        status: 'running',
        started_at: new Date().toISOString(),
        ai_model: SEO_AI_MODEL
      })
      .select()
      .single()

    const analysisRunId = analysisRun?.id

    try {
      // 3. Get or create the organization's assistant
      const assistant = await getOrCreateAssistant(supabase, orgId, site.org?.name || 'SEO Site')
      console.log(`[AI Brain v2] Using assistant: ${assistant.openai_assistant_id}`)

      // 4. Get or create site's thread
      const thread = await getOrCreateThread(supabase, siteId, assistant.id, 'analysis')
      console.log(`[AI Brain v2] Using thread: ${thread.openai_thread_id}`)

      // Update analysis run with thread reference
      await supabase
        .from('seo_ai_analysis_runs')
        .update({ ai_thread_id: thread.id })
        .eq('id', analysisRunId)

      // 5. Fetch all required data (including learning context)
      const [knowledgeData, pagesData, gscData, existingRecs, learningContext] = await Promise.all([
        fetchKnowledgeBase(supabase, siteId),
        fetchPagesData(supabase, siteId, pageIds),
        fetchGscData(supabase, siteId),
        fetchExistingRecommendations(supabase, siteId),
        buildLearningContext(siteId) // NEW: Get learnings from past outcomes
      ])

      console.log(`[AI Brain v2] Loaded ${pagesData.length} pages, ${gscData.queries?.length || 0} queries`)
      if (learningContext) {
        console.log(`[AI Brain v2] Including learning context (${learningContext.length} chars)`)
      }

      // 6. Build context message for the assistant (now includes learnings)
      const contextMessage = buildAnalysisContext({
        site,
        knowledge: knowledgeData,
        pages: pagesData,
        gscData,
        analysisType,
        focusAreas,
        learningContext // NEW: Pass learning context to be included
      })

      // 7. Build analysis prompt
      const analysisPrompt = buildAnalysisPrompt(analysisType, additionalContext)

      // 8. Add previous recommendations context if doing follow-up
      let fullMessage = contextMessage + '\n\n' + analysisPrompt

      if (existingRecs.length > 0) {
        const recentRecs = existingRecs.slice(0, 20).map(r => ({
          category: r.category,
          status: r.status,
          title: r.title,
          implemented_at: r.implemented_at
        }))
        fullMessage += `\n\n## Previous Recommendations Status\n\`\`\`json\n${JSON.stringify(recentRecs, null, 2)}\n\`\`\``
      }

      // 9. Run the analysis
      console.log(`[AI Brain v2] Running analysis with ${fullMessage.length} chars of context`)
      
      const result = await runAnalysis(supabase, {
        siteId,
        threadRecord: thread,
        assistantRecord: assistant,
        message: fullMessage,
        additionalInstructions: `Focus on ${analysisType} analysis. Current date: ${new Date().toISOString().split('T')[0]}`,
        analysisRunId
      })

      // 10. Process recommendations from the response
      let totalRecommendations = 0
      let criticalIssues = 0
      let quickWins = 0

      if (result.recommendations && Array.isArray(result.recommendations)) {
        // Clear old pending recommendations if comprehensive
        if (analysisType === 'comprehensive') {
          await supabase
            .from('seo_ai_recommendations')
            .delete()
            .eq('site_id', siteId)
            .eq('status', 'pending')
        }

        // Insert new recommendations
        const recsToInsert = result.recommendations.map(rec => {
          if (rec.priority === 'critical') criticalIssues++
          if (rec.effort === 'instant' || rec.effort === 'quick') quickWins++

          return {
            site_id: siteId,
            page_id: rec.page_id || findPageByUrl(pagesData, rec.page_url)?.id,
            category: rec.category || 'general',
            subcategory: rec.subcategory,
            priority: rec.priority || 'medium',
            title: rec.title,
            description: rec.description,
            current_value: rec.current_value,
            suggested_value: rec.suggested_value,
            field_name: mapFieldName(rec.category, rec.subcategory),
            auto_fixable: rec.category === 'title' || rec.category === 'meta',
            one_click_fixable: rec.category === 'title' || rec.category === 'meta',
            effort: rec.effort || 'medium',
            predicted_impact: rec.impact_estimate ? { level: rec.impact_estimate } : null,
            ai_reasoning: rec.reasoning,
            ai_confidence: 0.85,
            ai_model: SEO_AI_MODEL,
            analysis_run_id: analysisRunId,
            status: 'pending',
            created_at: new Date().toISOString()
          }
        })

        if (recsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('seo_ai_recommendations')
            .insert(recsToInsert)

          if (insertError) {
            console.error('[AI Brain v2] Failed to insert recommendations:', insertError)
          } else {
            totalRecommendations = recsToInsert.length
          }
        }
      }

      // 11. Store insights if provided
      if (result.insights && Array.isArray(result.insights)) {
        // Could store these in a separate table or as part of the analysis run
        console.log(`[AI Brain v2] Insights: ${result.insights.join('; ')}`)
      }

      // 12. Calculate health score
      const healthScore = calculateHealthScore(pagesData, existingRecs, criticalIssues)

      // 13. Update analysis run as complete
      const duration = Date.now() - startTime
      await supabase
        .from('seo_ai_analysis_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          recommendations_generated: totalRecommendations,
          critical_issues_found: criticalIssues,
          quick_wins_found: quickWins,
          health_score: healthScore
        })
        .eq('id', analysisRunId)

      // 14. Update site with latest analysis timestamp
      await supabase
        .from('seo_sites')
        .update({
          last_ai_analysis_at: new Date().toISOString(),
          seo_health_score: healthScore,
          updated_at: new Date().toISOString()
        })
        .eq('id', siteId)

      // 15. Update context snapshot on thread
      await supabase
        .from('seo_ai_threads')
        .update({
          last_context_snapshot: {
            analyzed_at: new Date().toISOString(),
            analysis_type: analysisType,
            pages_analyzed: pagesData.length,
            recs_generated: totalRecommendations,
            health_score: healthScore
          }
        })
        .eq('id', thread.id)

      console.log(`[AI Brain v2] Analysis complete. Generated ${totalRecommendations} recommendations in ${duration}ms`)

    } catch (analysisError) {
      console.error('[AI Brain v2] Analysis error:', analysisError)
      
      await supabase
        .from('seo_ai_analysis_runs')
        .update({
          status: 'failed',
          error_message: analysisError.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', analysisRunId)
    }

  } catch (error) {
    console.error('[AI Brain v2] Fatal error:', error)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Data Fetching Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function fetchKnowledgeBase(supabase, siteId) {
  const { data } = await supabase
    .from('seo_knowledge_base')
    .select('*')
    .eq('site_id', siteId)
    .single()
  return data
}

async function fetchPagesData(supabase, siteId, pageIds = []) {
  let query = supabase
    .from('seo_pages')
    .select('*')
    .eq('site_id', siteId)
  
  if (pageIds.length > 0) {
    query = query.in('id', pageIds)
  }
  
  const { data } = await query
    .order('clicks_28d', { ascending: false })
    .limit(200)
  return data || []
}

async function fetchGscData(supabase, siteId) {
  const { data: queries } = await supabase
    .from('seo_queries')
    .select('*')
    .eq('site_id', siteId)
    .order('clicks_28d', { ascending: false })
    .limit(500)

  return { queries: queries || [] }
}

async function fetchExistingRecommendations(supabase, siteId) {
  const { data } = await supabase
    .from('seo_ai_recommendations')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })
    .limit(50)
  return data || []
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Helpers
// ─────────────────────────────────────────────────────────────────────────────

function findPageByUrl(pages, url) {
  if (!url) return null
  return pages.find(p => p.url === url || p.url?.endsWith(url))
}

function mapFieldName(category, subcategory) {
  const mapping = {
    title: 'managed_title',
    meta: 'managed_meta_description',
    h1: 'managed_h1',
    schema: 'managed_schema'
  }
  return mapping[category] || null
}

function calculateHealthScore(pages, existingRecs, criticalIssues) {
  let score = 100
  
  // Deduct for missing titles
  const missingTitles = pages.filter(p => !p.title && !p.managed_title).length
  score -= Math.min(missingTitles * 2, 20)
  
  // Deduct for missing meta descriptions
  const missingMeta = pages.filter(p => !p.meta_description && !p.managed_meta_description).length
  score -= Math.min(missingMeta * 1.5, 15)
  
  // Deduct for critical issues
  score -= Math.min(criticalIssues * 5, 25)
  
  // Deduct for pending recommendations
  const pendingRecs = existingRecs.filter(r => r.status === 'pending').length
  score -= Math.min(pendingRecs * 0.5, 20)
  
  return Math.max(0, Math.round(score))
}
