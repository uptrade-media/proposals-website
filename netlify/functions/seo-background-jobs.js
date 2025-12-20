/**
 * SEO Background Jobs - Trigger and Status API
 * 
 * Manages background job execution for long-running SEO operations.
 * 
 * Endpoints:
 * POST - Start a new background job
 * GET - Check job status
 * 
 * Job Types:
 * - blog-recommend-topics: Generate topic recommendations
 * - blog-analyze-post: Analyze a blog post
 * - blog-auto-optimize: Optimize all blog posts
 * - metadata-extract: Extract metadata from sitemap
 * - ai-train: Train AI on site content
 * - ai-analyze: Run full AI analysis
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
// Note: fetch is built-in to Node.js 18+ (Netlify Functions runtime)

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  try {
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    const supabase = createSupabaseAdmin()

    // GET - Check job status
    if (event.httpMethod === 'GET') {
      const { jobId } = event.queryStringParameters || {}

      if (!jobId) {
        // List recent jobs
        const { data: jobs, error } = await supabase
          .from('seo_background_jobs')
          .select('*')
          .eq('contact_id', contact.id)
          .order('created_at', { ascending: false })
          .limit(20)

        if (error) {
          return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ jobs })
        }
      }

      // Get specific job
      const { data: job, error } = await supabase
        .from('seo_background_jobs')
        .select('*')
        .eq('id', jobId)
        .single()

      if (error || !job) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Job not found' }) }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ job })
      }
    }

    // POST - Start new job
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const { jobType, siteId, postId, options } = body

      if (!jobType) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'jobType is required' }) }
      }

      // Map job types to background functions
      const jobConfig = {
        'blog-recommend-topics': {
          function: 'seo-ai-blog-brain-background',
          action: 'recommend-topics',
          requiresSiteId: true
        },
        'blog-analyze-post': {
          function: 'seo-ai-blog-brain-background',
          action: 'analyze-post',
          requiresPostId: true
        },
        'blog-auto-optimize': {
          function: 'seo-ai-blog-brain-background',
          action: 'auto-optimize-all'
        },
        'metadata-extract': {
          function: 'seo-metadata-extract-background',
          requiresSiteId: true
        },
        'ai-train': {
          function: 'seo-ai-train-background',
          requiresSiteId: true
        },
        'ai-analyze': {
          function: 'seo-ai-brain-background',
          action: 'full-analysis',
          requiresSiteId: true
        },
        'gsc-indexing': {
          function: 'seo-gsc-indexing-background',
          requiresSiteId: true
        },
        'pagespeed': {
          function: 'seo-pagespeed-background',
          requiresSiteId: true
        },
        'gsc-sync': {
          function: 'seo-gsc-sync-background',
          requiresSiteId: true
        }
      }

      const config = jobConfig[jobType]
      if (!config) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: `Unknown job type: ${jobType}`,
            validTypes: Object.keys(jobConfig)
          })
        }
      }

      // Validate requirements
      if (config.requiresSiteId && !siteId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId is required for this job type' }) }
      }
      if (config.requiresPostId && !postId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'postId is required for this job type' }) }
      }

      // Create job record
      const { data: job, error: insertError } = await supabase
        .from('seo_background_jobs')
        .insert({
          job_type: jobType,
          site_id: siteId || null,
          status: 'pending',
          metadata: { postId, options, action: config.action }
        })
        .select()
        .single()

      if (insertError) {
        console.error('[seo-background-jobs] Insert error:', insertError)
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to create job' }) }
      }

      // Trigger background function
      const functionUrl = `${process.env.URL || 'https://portal.uptrademedia.com'}/.netlify/functions/${config.function}`
      
      try {
        // Fire and forget - don't await
        fetch(functionUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId: job.id,
            action: config.action,
            siteId,
            postId,
            options
          })
        }).catch(err => {
          console.error('[seo-background-jobs] Failed to trigger background function:', err)
        })

        return {
          statusCode: 202,
          headers,
          body: JSON.stringify({
            message: 'Job started',
            job: {
              id: job.id,
              type: jobType,
              status: 'pending',
              createdAt: job.created_at
            },
            checkStatusUrl: `/.netlify/functions/seo-background-jobs?jobId=${job.id}`
          })
        }
      } catch (triggerError) {
        console.error('[seo-background-jobs] Trigger error:', triggerError)
        
        // Update job to failed
        await supabase
          .from('seo_background_jobs')
          .update({ status: 'failed', error: triggerError.message })
          .eq('id', job.id)

        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to start background job' })
        }
      }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  } catch (error) {
    console.error('[seo-background-jobs] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}
