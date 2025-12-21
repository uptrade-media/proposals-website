/**
 * SEO Internal Links Background Function
 * 
 * Thin orchestrator using SEOSkill for internal linking analysis.
 * Background functions can run up to 15 minutes.
 * 
 * @see skills/seo-skill.js - analyzeInternalLinksFull()
 */

import { createClient } from '@supabase/supabase-js'
import { SEOSkill } from './skills/seo-skill.js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req) {
  console.log('[seo-internal-links-background] Starting...')

  let jobId = null
  let supabase = null

  try {
    const { siteId, crawlLinks = true, jobId: jId } = await req.json()
    jobId = jId

    if (!siteId) {
      return new Response(JSON.stringify({ error: 'siteId required' }), { status: 400 })
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Update job status
    if (jobId) {
      await supabase
        .from('seo_background_jobs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', jobId)
    }

    // Fetch site for org context
    const { data: site } = await supabase
      .from('seo_sites')
      .select('*, org:organizations(id, domain)')
      .eq('id', siteId)
      .single()

    if (!site) {
      throw new Error('Site not found')
    }

    // Use SEOSkill for analysis
    const seoSkill = new SEOSkill(supabase, site.org?.id || site.org_id, siteId)

    const result = await seoSkill.analyzeInternalLinksFull({
      crawlLinks,
      maxPages: 75,
      onProgress: (progress) => {
        console.log(`[seo-internal-links-background] ${progress.step}: ${progress.message}`)
      }
    })

    console.log('[seo-internal-links-background] Complete')

    // Update job status
    if (jobId) {
      await supabase
        .from('seo_background_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          result
        })
        .eq('id', jobId)
    }

    return new Response(JSON.stringify(result), { status: 200 })

  } catch (error) {
    console.error('[seo-internal-links-background] Error:', error)

    // Update job with error
    if (jobId && supabase) {
      await supabase
        .from('seo_background_jobs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error: error.message
        })
        .eq('id', jobId)
    }

    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
