/**
 * SEO Schema Generate Background Function
 * 
 * Generates schema markup for multiple pages using AI.
 * Background functions can run up to 15 minutes.
 * 
 * Uses SEOSkill.generateSchemaBulk() - no direct OpenAI calls.
 * Triggered by POST from seo-schema-generate.js
 */

import { createClient } from '@supabase/supabase-js'
import { SEOSkill } from './skills/seo-skill.js'

export const config = {
  type: 'background'
}

export default async function handler(req) {
  console.log('[seo-schema-generate-background] Starting...')

  try {
    const { siteId, orgId, userId, pageIds, generateForAll = false, jobId } = await req.json()

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

    console.log(`[seo-schema-generate-background] Generating schemas for site ${siteId}`)

    // Initialize SEOSkill
    const seoSkill = new SEOSkill(supabase, orgId, siteId, { userId })

    // Generate schemas via SEOSkill
    const result = await seoSkill.generateSchemaBulk({
      pageIds: pageIds || [],
      generateForAll
    })

    console.log(`[seo-schema-generate-background] Generated ${result.generated} schemas`)

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
    console.error('[seo-schema-generate-background] Error:', error)
    
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
      console.error('[seo-schema-generate-background] Could not update job status:', e)
    }

    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
