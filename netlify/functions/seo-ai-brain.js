// netlify/functions/seo-ai-brain.js
// Trigger AI Brain analysis - validates request and kicks off background function
// Returns immediately, actual analysis happens in seo-ai-brain-background.mjs
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

// Analysis modes
const ANALYSIS_MODES = {
  COMPREHENSIVE: 'comprehensive',
  QUICK_WINS: 'quick_wins',
  PAGE_OPTIMIZE: 'page_optimize',
  KEYWORD_STRATEGY: 'keyword_strategy',
  CONTENT_GAPS: 'content_gaps',
  LOCAL_SEO: 'local_seo',
  TECHNICAL: 'technical'
}

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

  // GET - Check analysis status
  if (event.httpMethod === 'GET') {
    return await getAnalysisStatus(event, headers)
  }

  // POST - Trigger new analysis
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const { user, error: authError } = await getAuthenticatedUser(event)
  if (authError || !user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { 
      siteId,
      analysisType = 'comprehensive',
      focusAreas = [],
      pageIds = []
    } = body

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId is required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Check if site exists and is trained
    const { data: site, error: siteError } = await supabase
      .from('seo_sites')
      .select('*, org:organizations(domain)')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Site not found' }) }
    }

    // Check if knowledge base exists
    const { data: knowledge } = await supabase
      .from('seo_knowledge_base')
      .select('training_status')
      .eq('site_id', siteId)
      .single()

    if (!knowledge || knowledge.training_status !== 'completed') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Site not trained. Run AI training first.',
          needsTraining: true
        })
      }
    }

    // Check if there's already an analysis running
    const { data: runningAnalysis } = await supabase
      .from('seo_ai_analysis_runs')
      .select('id, started_at')
      .eq('site_id', siteId)
      .eq('status', 'running')
      .single()

    if (runningAnalysis) {
      // Check if it's been running too long (> 15 minutes = stale)
      const startedAt = new Date(runningAnalysis.started_at)
      const now = new Date()
      const minutesRunning = (now - startedAt) / (1000 * 60)

      if (minutesRunning < 15) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            status: 'running',
            message: 'Analysis already in progress',
            runId: runningAnalysis.id,
            startedAt: runningAnalysis.started_at
          })
        }
      } else {
        // Mark stale run as failed
        await supabase
          .from('seo_ai_analysis_runs')
          .update({
            status: 'failed',
            error_message: 'Timed out',
            completed_at: new Date().toISOString()
          })
          .eq('id', runningAnalysis.id)
      }
    }

    // Create a new analysis run record
    const { data: newRun, error: runError } = await supabase
      .from('seo_ai_analysis_runs')
      .insert({
        site_id: siteId,
        analysis_type: analysisType,
        triggered_by: 'manual',
        triggered_by_user: user.id,
        scope_description: focusAreas.length > 0 ? `Focus: ${focusAreas.join(', ')}` : 'Full site analysis',
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (runError) {
      console.error('[AI Brain] Failed to create run record:', runError)
    }

    // Trigger background function
    const baseUrl = process.env.URL || `https://${event.headers.host}`
    const backgroundUrl = `${baseUrl}/.netlify/functions/seo-ai-brain-background`

    // Fire and forget - don't await
    fetch(backgroundUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        siteId,
        userId: user.id,
        analysisType,
        focusAreas,
        pageIds,
        runId: newRun?.id
      })
    }).catch(err => {
      console.error('[AI Brain] Failed to trigger background function:', err)
    })

    return {
      statusCode: 202, // Accepted
      headers,
      body: JSON.stringify({
        success: true,
        status: 'running',
        message: 'AI analysis started. This may take a few minutes.',
        runId: newRun?.id,
        siteId
      })
    }

  } catch (error) {
    console.error('[AI Brain] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}

// Get status of current/recent analysis runs
async function getAnalysisStatus(event, headers) {
  const { user, error: authError } = await getAuthenticatedUser(event)
  if (authError || !user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const { siteId, runId } = event.queryStringParameters || {}

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId is required' }) }
    }

    const supabase = createSupabaseAdmin()

    // If specific runId requested
    if (runId) {
      const { data: run, error } = await supabase
        .from('seo_ai_analysis_runs')
        .select('*')
        .eq('id', runId)
        .single()

      if (error || !run) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Run not found' }) }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ run })
      }
    }

    // Get recent runs for this site
    const { data: runs, error } = await supabase
      .from('seo_ai_analysis_runs')
      .select('*')
      .eq('site_id', siteId)
      .order('started_at', { ascending: false })
      .limit(10)

    if (error) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
    }

    // Check if any are currently running
    const runningRun = runs.find(r => r.status === 'running')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        runs,
        currentRun: runningRun || null,
        isRunning: !!runningRun
      })
    }

  } catch (error) {
    console.error('[AI Brain] Status error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}
