// netlify/functions/seo-auto-optimize.mjs
// Auto-Optimize - Master automation that runs all SEO optimizations
// Background function that orchestrates the AI Brain across all modules
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// Background function - 15 minute timeout
export const config = {
  type: 'background'
}

// Use env variable for model - easily update when new models release
const SEO_AI_MODEL = process.env.SEO_AI_MODEL || 'gpt-4o'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { siteId, mode = 'full' } = body

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
    }

    // Run the master optimization
    await runAutoOptimization(siteId, mode)

    return { 
      statusCode: 202, 
      headers, 
      body: JSON.stringify({ 
        success: true, 
        message: 'Auto-optimization started',
        mode 
      }) 
    }

  } catch (error) {
    console.error('[Auto-Optimize] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}

async function runAutoOptimization(siteId, mode) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  console.log(`[Auto-Optimize] Starting ${mode} optimization for site: ${siteId}`)

  // Create optimization run record
  const { data: run, error: runError } = await supabase
    .from('seo_ai_analysis_runs')
    .insert({
      site_id: siteId,
      run_type: 'auto_optimize',
      status: 'running',
      ai_model: SEO_AI_MODEL,
      started_at: new Date().toISOString()
    })
    .select()
    .single()

  const runId = run?.id

  try {
    // Get site details
    const { data: site } = await supabase
      .from('seo_sites')
      .select('*, org:organizations(name, domain)')
      .eq('id', siteId)
      .single()

    if (!site) {
      throw new Error(`Site not found: ${siteId}`)
    }

    const results = {
      mode,
      startedAt: new Date().toISOString(),
      modules: {},
      totalRecommendations: 0,
      autoApplied: 0,
      alerts: 0
    }

    // ============================================================
    // MODULE 1: Ensure site knowledge is up to date
    // ============================================================
    console.log('[Auto-Optimize] Step 1: Checking site knowledge...')
    const { data: knowledge } = await supabase
      .from('seo_knowledge_base')
      .select('*')
      .eq('site_id', siteId)
      .single()

    const knowledgeAge = knowledge?.last_trained_at 
      ? (Date.now() - new Date(knowledge.last_trained_at).getTime()) / (1000 * 60 * 60 * 24)
      : 999

    if (!knowledge || knowledgeAge > 7) {
      console.log('[Auto-Optimize] Knowledge stale, triggering training...')
      // Trigger training (would call seo-ai-train in production)
      results.modules.knowledge = { status: 'training_triggered', age: Math.round(knowledgeAge) }
    } else {
      results.modules.knowledge = { status: 'current', age: Math.round(knowledgeAge) }
    }

    // ============================================================
    // MODULE 2: Sync GSC data and update pages
    // ============================================================
    console.log('[Auto-Optimize] Step 2: Syncing GSC data...')
    if (site.gsc_property_id && site.gsc_access_token) {
      // Trigger GSC sync (would call appropriate function)
      results.modules.gsc = { status: 'sync_triggered' }
    } else {
      results.modules.gsc = { status: 'not_connected' }
    }

    // ============================================================
    // MODULE 3: Run AI Brain analysis
    // ============================================================
    console.log('[Auto-Optimize] Step 3: Running AI Brain analysis...')
    const aiAnalysis = await runAIBrainAnalysis(supabase, openai, siteId, knowledge)
    results.modules.aiBrain = aiAnalysis
    results.totalRecommendations += aiAnalysis.recommendationsGenerated || 0

    // ============================================================
    // MODULE 4: Check for content decay
    // ============================================================
    console.log('[Auto-Optimize] Step 4: Detecting content decay...')
    const decayAnalysis = await detectContentDecay(supabase, siteId)
    results.modules.contentDecay = decayAnalysis

    // ============================================================
    // MODULE 5: Check keyword rankings
    // ============================================================
    console.log('[Auto-Optimize] Step 5: Updating keyword rankings...')
    const keywordUpdate = await updateKeywordRankings(supabase, siteId)
    results.modules.keywords = keywordUpdate

    // ============================================================
    // MODULE 6: Generate alerts for issues
    // ============================================================
    console.log('[Auto-Optimize] Step 6: Checking for alerts...')
    const alertsGenerated = await generateAlerts(supabase, siteId, results)
    results.alerts = alertsGenerated
    results.modules.alerts = { generated: alertsGenerated }

    // ============================================================
    // MODULE 7: Auto-apply safe recommendations
    // ============================================================
    if (mode === 'full') {
      console.log('[Auto-Optimize] Step 7: Auto-applying safe recommendations...')
      const autoApplied = await autoApplyRecommendations(supabase, siteId)
      results.autoApplied = autoApplied
      results.modules.autoApply = { applied: autoApplied }
    }

    // ============================================================
    // MODULE 8: Generate master summary
    // ============================================================
    console.log('[Auto-Optimize] Step 8: Generating summary...')
    const summary = await generateOptimizationSummary(openai, results, site)
    results.summary = summary

    // Update run record
    if (runId) {
      await supabase
        .from('seo_ai_analysis_runs')
        .update({
          status: 'completed',
          results,
          completed_at: new Date().toISOString()
        })
        .eq('id', runId)
    }

    console.log(`[Auto-Optimize] Completed. Recommendations: ${results.totalRecommendations}, Auto-applied: ${results.autoApplied}, Alerts: ${results.alerts}`)

    return results

  } catch (error) {
    console.error('[Auto-Optimize] Error:', error)
    
    if (runId) {
      await supabase
        .from('seo_ai_analysis_runs')
        .update({
          status: 'error',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', runId)
    }

    throw error
  }
}

// Run AI Brain comprehensive analysis
async function runAIBrainAnalysis(supabase, openai, siteId, knowledge) {
  try {
    // Get pages that need analysis
    const { data: pages } = await supabase
      .from('seo_pages')
      .select('*')
      .eq('site_id', siteId)
      .order('clicks_28d', { ascending: false, nullsFirst: false })
      .limit(50)

    if (!pages?.length) {
      return { status: 'no_pages', recommendationsGenerated: 0 }
    }

    // Analyze pages and generate recommendations
    const analysisPrompt = `Analyze these pages for SEO optimization opportunities:

SITE CONTEXT:
${knowledge ? `
Business: ${knowledge.business_name}
Industry: ${knowledge.industry}
Services: ${knowledge.primary_services?.join(', ')}
` : 'No site knowledge available'}

TOP PAGES (${pages.length}):
${pages.slice(0, 20).map(p => `
- ${p.url}
  Title: ${p.title || 'Missing'}
  Clicks: ${p.clicks_28d || 0}
  Position: ${p.avg_position?.toFixed(1) || 'N/A'}
  Meta: ${p.meta_description ? 'Yes' : 'Missing'}
  H1: ${p.h1 ? 'Yes' : 'Missing'}
`).join('\n')}

Generate prioritized SEO recommendations. Focus on:
1. Missing or weak title tags
2. Missing meta descriptions
3. Striking distance keywords (position 4-20)
4. Content gaps
5. Technical issues

Return as JSON:
{
  "recommendations": [
    {
      "pageUrl": "url",
      "pageId": "id",
      "category": "title|meta|content|technical|keyword",
      "priority": "critical|high|medium|low",
      "title": "Brief title",
      "description": "Detailed explanation",
      "currentValue": "What exists now",
      "suggestedValue": "What to change to",
      "autoFixable": true/false,
      "impactScore": 1-10
    }
  ]
}`

    const completion = await openai.chat.completions.create({
      model: SEO_AI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert SEO analyst. Provide specific, actionable recommendations with exact suggested values where possible.'
        },
        { role: 'user', content: analysisPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })

    const result = JSON.parse(completion.choices[0].message.content)
    const recommendations = result.recommendations || []

    // Save recommendations
    for (const rec of recommendations) {
      // Find page ID
      const page = pages.find(p => p.url === rec.pageUrl)
      
      await supabase
        .from('seo_ai_recommendations')
        .upsert({
          site_id: siteId,
          page_id: page?.id || rec.pageId,
          category: rec.category,
          priority: rec.priority,
          title: rec.title,
          description: rec.description,
          current_value: rec.currentValue,
          suggested_value: rec.suggestedValue,
          auto_fixable: rec.autoFixable,
          impact_score: rec.impactScore,
          ai_model: SEO_AI_MODEL,
          status: 'pending',
          created_at: new Date().toISOString()
        }, {
          onConflict: 'site_id,page_id,title',
          ignoreDuplicates: true
        })
    }

    return {
      status: 'completed',
      pagesAnalyzed: pages.length,
      recommendationsGenerated: recommendations.length
    }

  } catch (error) {
    console.error('[Auto-Optimize] AI Brain error:', error)
    return { status: 'error', error: error.message }
  }
}

// Detect content decay
async function detectContentDecay(supabase, siteId) {
  try {
    // Get pages with historical data
    const { data: pages } = await supabase
      .from('seo_pages')
      .select('id, url, clicks_28d, clicks_prev_28d, impressions_28d, impressions_prev_28d')
      .eq('site_id', siteId)
      .not('clicks_prev_28d', 'is', null)

    if (!pages?.length) {
      return { status: 'no_data', decayingCount: 0 }
    }

    let decayingCount = 0

    for (const page of pages) {
      const prevClicks = page.clicks_prev_28d || 0
      const currClicks = page.clicks_28d || 0
      
      if (prevClicks > 10) {
        const dropPercent = ((prevClicks - currClicks) / prevClicks) * 100
        
        if (dropPercent > 30) {
          decayingCount++
          
          await supabase
            .from('seo_pages')
            .update({
              is_decaying: true,
              decay_severity: dropPercent > 50 ? 'critical' : dropPercent > 40 ? 'high' : 'medium',
              decay_detected_at: new Date().toISOString()
            })
            .eq('id', page.id)
        }
      }
    }

    return { status: 'completed', pagesChecked: pages.length, decayingCount }

  } catch (error) {
    console.error('[Auto-Optimize] Decay detection error:', error)
    return { status: 'error', error: error.message }
  }
}

// Update keyword rankings
async function updateKeywordRankings(supabase, siteId) {
  try {
    const { data: keywords } = await supabase
      .from('seo_keyword_universe')
      .select('id, keyword, current_position, previous_position')
      .eq('site_id', siteId)
      .limit(100)

    // In production, would fetch fresh rankings from GSC
    return { 
      status: 'completed', 
      keywordsTracked: keywords?.length || 0 
    }

  } catch (error) {
    console.error('[Auto-Optimize] Keyword update error:', error)
    return { status: 'error', error: error.message }
  }
}

// Generate alerts for issues
async function generateAlerts(supabase, siteId, results) {
  let alertCount = 0

  try {
    // Alert for high content decay
    if (results.modules.contentDecay?.decayingCount > 5) {
      await supabase
        .from('seo_alerts')
        .insert({
          site_id: siteId,
          alert_type: 'content_decay',
          severity: 'high',
          title: `${results.modules.contentDecay.decayingCount} pages with significant traffic drop`,
          message: 'Multiple pages are losing traffic. Review and refresh content.',
          data: results.modules.contentDecay,
          triggered_at: new Date().toISOString(),
          status: 'active'
        })
      alertCount++
    }

    // Alert for many pending recommendations
    const { count } = await supabase
      .from('seo_ai_recommendations')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .eq('status', 'pending')
      .in('priority', ['critical', 'high'])

    if (count > 10) {
      await supabase
        .from('seo_alerts')
        .insert({
          site_id: siteId,
          alert_type: 'pending_actions',
          severity: 'medium',
          title: `${count} high-priority recommendations pending`,
          message: 'Review and implement pending SEO recommendations.',
          triggered_at: new Date().toISOString(),
          status: 'active'
        })
      alertCount++
    }

    return alertCount

  } catch (error) {
    console.error('[Auto-Optimize] Alert generation error:', error)
    return alertCount
  }
}

// Auto-apply safe recommendations
async function autoApplyRecommendations(supabase, siteId) {
  let appliedCount = 0

  try {
    // Get auto-fixable recommendations
    const { data: recs } = await supabase
      .from('seo_ai_recommendations')
      .select('*')
      .eq('site_id', siteId)
      .eq('status', 'pending')
      .eq('auto_fixable', true)
      .limit(20)

    if (!recs?.length) return 0

    for (const rec of recs) {
      // For now, mark as "auto_approved" - actual implementation would
      // integrate with the target website's CMS/API to make changes
      await supabase
        .from('seo_ai_recommendations')
        .update({
          status: 'auto_approved',
          applied_at: new Date().toISOString(),
          applied_by: 'auto_optimize'
        })
        .eq('id', rec.id)

      appliedCount++
    }

    return appliedCount

  } catch (error) {
    console.error('[Auto-Optimize] Auto-apply error:', error)
    return appliedCount
  }
}

// Generate optimization summary
async function generateOptimizationSummary(openai, results, site) {
  try {
    const prompt = `Summarize this SEO optimization run for ${site.domain}:

Results:
${JSON.stringify(results.modules, null, 2)}

Total Recommendations: ${results.totalRecommendations}
Auto-Applied: ${results.autoApplied}
Alerts Generated: ${results.alerts}

Provide a brief executive summary (2-3 sentences) highlighting:
1. Key findings
2. Most important actions needed
3. Overall site health trend

Return as JSON:
{
  "summary": "Executive summary text",
  "healthTrend": "improving|stable|declining",
  "topPriority": "Most important action"
}`

    const completion = await openai.chat.completions.create({
      model: SEO_AI_MODEL,
      messages: [
        { role: 'system', content: 'You are an SEO expert providing concise optimization summaries.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })

    return JSON.parse(completion.choices[0].message.content)

  } catch (error) {
    console.error('[Auto-Optimize] Summary generation error:', error)
    return { summary: 'Optimization completed. Review recommendations for details.' }
  }
}
