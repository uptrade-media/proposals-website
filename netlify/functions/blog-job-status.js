/**
 * Blog Job Status
 * Check the status of a blog generation job
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
}

export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    // Auth check
    const { user, contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !user || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }

    // Get job ID from query string
    const jobId = event.queryStringParameters?.jobId
    
    if (!jobId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'jobId parameter required' })
      }
    }

    const supabase = createSupabaseAdmin()
    
    // Get job status
    const { data: job, error: jobError } = await supabase
      .from('blog_generation_jobs')
      .select('id, status, progress, blog_post_id, result, error, created_at, completed_at, duration_ms')
      .eq('id', jobId)
      .single()
    
    if (jobError || !job) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Job not found' })
      }
    }

    // Return job status
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        blogPostId: job.blog_post_id,
        result: job.result,
        error: job.error,
        createdAt: job.created_at,
        completedAt: job.completed_at,
        durationMs: job.duration_ms
      })
    }
    
  } catch (error) {
    console.error('[Blog Job Status] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to get job status',
        details: error.message
      })
    }
  }
}
