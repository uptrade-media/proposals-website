/**
 * SEO AI Blog Brain - Background Function
 * 
 * Long-running AI blog operations with 15-minute timeout:
 * - Topic generation with full SEO analysis
 * - Post optimization with source citations
 * - Batch content optimization
 * 
 * Uses ContentSkill from Signal for AI operations (no direct OpenAI)
 * Triggered via seo-ai-blog-brain.js
 */

import { createClient } from '@supabase/supabase-js'
import { ContentSkill } from './skills/content-skill.js'

// Background function config - 15 min timeout
export const config = {
  type: 'background'
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Update job status
 */
async function updateJobStatus(jobId, status, data = {}) {
  await supabase
    .from('seo_background_jobs')
    .update({
      status,
      result: data.result || null,
      error: data.error || null,
      progress: data.progress || null,
      completed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId)
}

/**
 * Generate topic recommendations using SEO intelligence
 * Delegates to ContentSkill.suggestTopicsWithSeoContext()
 */
async function generateTopicRecommendations(jobId, siteId, options = {}) {
  await updateJobStatus(jobId, 'processing', { progress: 10 })

  // Get org_id from site
  const { data: site } = await supabase
    .from('seo_sites')
    .select('org_id')
    .eq('id', siteId)
    .single()
  
  const orgId = site?.org_id || null

  await updateJobStatus(jobId, 'processing', { progress: 20 })

  // Initialize ContentSkill
  const contentSkill = new ContentSkill(supabase, orgId)
  
  await updateJobStatus(jobId, 'processing', { progress: 40 })

  // Use ContentSkill's SEO-aware topic suggestion
  const result = await contentSkill.suggestTopicsWithSeoContext(siteId, {
    category: options.category,
    maxTopics: options.maxTopics || 10
  })

  await updateJobStatus(jobId, 'processing', { progress: 90 })
  
  await updateJobStatus(jobId, 'completed', {
    result: {
      topics: result.topics,
      seoContext: result.seoContext
    }
  })
}

/**
 * Analyze and optimize a blog post
 * Delegates to ContentSkill.analyzeBlogPost()
 */
async function analyzeAndOptimizePost(jobId, postId, siteId) {
  await updateJobStatus(jobId, 'processing', { progress: 10 })

  // Get org_id from post or site
  let orgId = null
  
  if (siteId) {
    const { data: site } = await supabase
      .from('seo_sites')
      .select('org_id')
      .eq('id', siteId)
      .single()
    orgId = site?.org_id
  }
  
  if (!orgId) {
    const { data: post } = await supabase
      .from('blog_posts')
      .select('org_id')
      .eq('id', postId)
      .single()
    orgId = post?.org_id
  }

  await updateJobStatus(jobId, 'processing', { progress: 20 })

  // Initialize ContentSkill
  const contentSkill = new ContentSkill(supabase, orgId)
  
  await updateJobStatus(jobId, 'processing', { progress: 40 })

  // Use ContentSkill's analyze method
  const result = await contentSkill.analyzeBlogPost(postId, siteId)

  await updateJobStatus(jobId, 'processing', { progress: 90 })

  await updateJobStatus(jobId, 'completed', {
    result
  })
}

/**
 * Auto-optimize multiple blog posts (em-dash removal, etc.)
 * Delegates to ContentSkill.batchOptimizePosts()
 */
async function autoOptimizeAllPosts(jobId, options = {}) {
  await updateJobStatus(jobId, 'processing', { progress: 5 })

  // Initialize ContentSkill (no org needed for batch ops)
  const contentSkill = new ContentSkill(supabase, null)

  await updateJobStatus(jobId, 'processing', { progress: 10 })

  const result = await contentSkill.batchOptimizePosts({
    status: options.status,
    limit: options.limit
  })

  await updateJobStatus(jobId, 'completed', {
    result
  })
}

/**
 * Main handler - thin orchestrator
 */
export async function handler(event) {
  console.log('[SEO Blog Brain Background] Starting job')
  
  try {
    const body = JSON.parse(event.body || '{}')
    const { jobId, action, siteId, postId, options } = body

    if (!jobId) {
      console.error('[SEO Blog Brain Background] No jobId provided')
      return { statusCode: 400 }
    }

    // Mark job as started
    await updateJobStatus(jobId, 'processing', { progress: 0 })

    switch (action) {
      case 'recommend-topics':
        await generateTopicRecommendations(jobId, siteId, options)
        break

      case 'analyze-post':
        await analyzeAndOptimizePost(jobId, postId, siteId)
        break

      case 'auto-optimize-all':
        await autoOptimizeAllPosts(jobId, options)
        break

      default:
        await updateJobStatus(jobId, 'failed', { error: `Unknown action: ${action}` })
    }

    console.log('[SEO Blog Brain Background] Job completed:', jobId)
    return { statusCode: 200 }

  } catch (error) {
    console.error('[SEO Blog Brain Background] Error:', error)
    
    try {
      const body = JSON.parse(event.body || '{}')
      if (body.jobId) {
        await updateJobStatus(body.jobId, 'failed', { error: error.message })
      }
    } catch (e) {
      console.error('[SEO Blog Brain Background] Failed to update job status:', e)
    }

    return { statusCode: 500 }
  }
}
