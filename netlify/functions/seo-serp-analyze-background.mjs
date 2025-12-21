/**
 * SEO SERP Analyze Background Function
 * 
 * Analyzes keywords for SERP feature opportunities with AI.
 * Background functions can run up to 15 minutes.
 * 
 * Uses SEOSkill.analyzeSerpFeaturesBulk() - no direct OpenAI calls.
 * Triggered by POST from seo-serp-features.js or direct call
 */

import { createClient } from '@supabase/supabase-js'
import { SEOSkill } from './skills/seo-skill.js'

export const config = {
  type: 'background'
}

function createSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

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

  const supabase = createSupabaseAdmin()

  try {
    const body = JSON.parse(event.body || '{}')
    const { siteId, orgId, userId, keywords = [], analyzeTopKeywords = 50, jobId: existingJobId } = body

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
    }

    // Create or update job record
    let jobId = existingJobId
    if (!jobId) {
      const { data: job, error: jobError } = await supabase
        .from('seo_background_jobs')
        .insert({
          site_id: siteId,
          org_id: orgId,
          job_type: 'serp_feature_analysis',
          status: 'running',
          progress: 0,
          started_by: userId,
          started_at: new Date().toISOString()
        })
        .select()
        .single()

      if (jobError) {
        console.error('[SERP Background] Failed to create job:', jobError)
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to create job' }) }
      }
      jobId = job.id
    } else {
      await supabase
        .from('seo_background_jobs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', jobId)
    }

    // Return 202 Accepted immediately
    const response = {
      statusCode: 202,
      headers,
      body: JSON.stringify({
        success: true,
        jobId,
        message: 'SERP feature analysis started in background',
        pollUrl: `/.netlify/functions/seo-background-jobs?jobId=${jobId}`
      })
    }

    // Start background processing
    processSerpAnalysis(supabase, siteId, orgId, userId, jobId, keywords, analyzeTopKeywords).catch(err => {
      console.error('[SERP Background] Processing error:', err)
      supabase
        .from('seo_background_jobs')
        .update({
          status: 'failed',
          error_message: err.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)
    })

    return response

  } catch (error) {
    console.error('[SERP Background] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}

async function processSerpAnalysis(supabase, siteId, orgId, userId, jobId, providedKeywords, analyzeTopKeywords) {
  console.log(`[SERP Background] Processing analysis for site ${siteId}`)

  try {
    // Update progress
    await supabase
      .from('seo_background_jobs')
      .update({ progress: 10 })
      .eq('id', jobId)

    // Initialize SEOSkill
    const seoSkill = new SEOSkill(supabase, orgId, siteId, { userId })

    // Run analysis via SEOSkill
    const result = await seoSkill.analyzeSerpFeaturesBulk({
      keywords: providedKeywords,
      analyzeTopKeywords
    })

    console.log(`[SERP Background] Analyzed ${result.analyzed} keywords`)

    // Update job as completed
    await supabase
      .from('seo_background_jobs')
      .update({
        status: 'completed',
        progress: 100,
        result,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId)

  } catch (error) {
    console.error('[SERP Background] Analysis failed:', error)
    throw error
  }
}
