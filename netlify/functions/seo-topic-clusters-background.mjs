/**
 * SEO Topic Clusters Background Function
 * 
 * Generates topic clusters from keywords using AI.
 * Background functions can run up to 15 minutes.
 * 
 * Uses SEOSkill.generateTopicClusters() - no direct OpenAI calls.
 * Triggered by POST from seo-topic-clusters.js
 */

import { createClient } from '@supabase/supabase-js'
import { SEOSkill } from './skills/seo-skill.js'

export const config = {
  type: 'background'
}

export default async function handler(req) {
  console.log('[seo-topic-clusters-background] Starting...')

  try {
    const { siteId, orgId, userId, minKeywords = 3, maxClusters = 20, jobId } = await req.json()

    if (!siteId) {
      return new Response(JSON.stringify({ error: 'siteId required' }), { status: 400 })
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Update job status if jobId provided
    if (jobId) {
      await supabase
        .from('seo_background_jobs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', jobId)
    }

    // Initialize SEOSkill
    const seoSkill = new SEOSkill(supabase, orgId, siteId, { userId })

    // Generate clusters via SEOSkill
    const result = await seoSkill.generateTopicClusters({
      minKeywords,
      maxClusters
    })

    console.log(`[seo-topic-clusters-background] Created ${result.clustersCreated} clusters`)

    // Update job status
    if (jobId) {
      await supabase
        .from('seo_background_jobs')
        .update({
          status: 'completed',
          result,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)
    }

    return new Response(JSON.stringify(result), { status: 200 })

  } catch (error) {
    console.error('[seo-topic-clusters-background] Error:', error)
    
    try {
      const { jobId } = await req.json().catch(() => ({}))
      if (jobId) {
        const supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        )
        await supabase
          .from('seo_background_jobs')
          .update({
            status: 'failed',
            error_message: error.message,
            completed_at: new Date().toISOString()
          })
          .eq('id', jobId)
      }
    } catch (e) {
      console.error('[seo-topic-clusters-background] Could not update job status:', e)
    }

    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
