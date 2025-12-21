/**
 * SEO AI Train Background Function
 * 
 * Background function for AI site training - runs up to 15 minutes.
 * Crawls site content and builds comprehensive knowledge base.
 * 
 * Uses SEOSkill.trainSite() - no direct OpenAI calls.
 * Triggered via seo-ai-train.js
 */

import { createSupabaseAdmin } from './utils/supabase.js'
import { SEOSkill } from './skills/seo-skill.js'

export const config = {
  type: 'background'
}

export async function handler(event) {
  console.log('[SEO Train Background] Starting...')
  
  try {
    const body = JSON.parse(event.body || '{}')
    const { siteId, userId, forceRefresh = false, orgId } = body

    if (!siteId) {
      console.error('[SEO Train Background] No siteId provided')
      return { statusCode: 400 }
    }

    const supabase = createSupabaseAdmin()

    // Mark as in progress
    await supabase
      .from('seo_knowledge_base')
      .upsert({
        site_id: siteId,
        training_status: 'in_progress',
        updated_at: new Date().toISOString()
      }, { onConflict: 'site_id' })

    // Initialize SEOSkill
    const seoSkill = new SEOSkill(supabase, orgId, siteId, { userId })

    // Run training via SEOSkill
    const result = await seoSkill.trainSite({
      forceRefresh,
      maxPages: 50,
      onProgress: (pct, msg) => {
        console.log(`[SEO Train Background] ${pct}% - ${msg}`)
      }
    })

    console.log('[SEO Train Background] Training complete:', result)

    return { statusCode: 200 }

  } catch (error) {
    console.error('[SEO Train Background] Error:', error)
    
    // Try to update status to failed
    try {
      const supabase = createSupabaseAdmin()
      const body = JSON.parse(event.body || '{}')
      if (body.siteId) {
        await supabase
          .from('seo_knowledge_base')
          .upsert({
            site_id: body.siteId,
            training_status: 'failed',
            error_message: error.message,
            updated_at: new Date().toISOString()
          }, { onConflict: 'site_id' })
      }
    } catch (e) {
      console.error('[SEO Train Background] Could not update failure status:', e)
    }

    return { statusCode: 500 }
  }
}
