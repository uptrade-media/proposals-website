// netlify/functions/routes/jobs.js
// ═══════════════════════════════════════════════════════════════════════════════
// Jobs Routes - Background job queue management
// ═══════════════════════════════════════════════════════════════════════════════

import { response } from '../api.js'
import * as queue from '../utils/job-queue.js'

export async function handle(ctx) {
  const { method, segments, supabase, query, body, contact, orgId } = ctx
  const [, resource, id, action] = segments
  
  switch (resource) {
    case 'stats':
      if (method === 'GET') return await getQueueStats(ctx)
      break
    case 'pending':
      if (method === 'GET') return await listPendingJobs(ctx)
      break
    case 'enqueue':
      if (method === 'POST') return await enqueueJob(ctx)
      break
    default:
      if (id) {
        if (method === 'GET') return await getJob(ctx, id)
        if (action === 'cancel' && method === 'POST') return await cancelJob(ctx, id)
        if (action === 'retry' && method === 'POST') return await retryJob(ctx, id)
      }
  }
  
  return response(405, { error: 'Method not allowed' })
}

async function getQueueStats(ctx) {
  const { query } = ctx
  const queueName = query.queue || 'seo'
  
  try {
    const stats = await queue.getQueueStats(queueName)
    return response(200, { stats })
  } catch (error) {
    // If Redis not configured, fall back to database stats
    if (error.message?.includes('UPSTASH')) {
      return await getDatabaseStats(ctx, queueName)
    }
    throw error
  }
}

async function getDatabaseStats(ctx, queueType) {
  const { supabase, orgId } = ctx
  
  // Fallback to database-based job tracking
  const { data: jobs, error } = await supabase
    .from('seo_background_jobs')
    .select('status')
    .eq('org_id', orgId)
    .gte('created_at', new Date(Date.now() - 86400000).toISOString()) // Last 24h
  
  if (error) {
    return response(500, { error: error.message })
  }
  
  const stats = {
    queue: queueType,
    pending: jobs.filter(j => j.status === 'pending').length,
    processing: jobs.filter(j => j.status === 'running').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
    source: 'database'
  }
  
  return response(200, { stats })
}

async function listPendingJobs(ctx) {
  const { query, supabase, orgId } = ctx
  const queueName = query.queue || 'seo'
  const limit = parseInt(query.limit) || 50
  
  try {
    const jobs = await queue.listPendingJobs(queueName, limit)
    return response(200, { jobs })
  } catch (error) {
    // Fallback to database
    if (error.message?.includes('UPSTASH')) {
      const { data: dbJobs, error: dbError } = await supabase
        .from('seo_background_jobs')
        .select('*')
        .eq('org_id', orgId)
        .in('status', ['pending', 'running'])
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (dbError) return response(500, { error: dbError.message })
      return response(200, { jobs: dbJobs, source: 'database' })
    }
    throw error
  }
}

async function enqueueJob(ctx) {
  const { body, contact, orgId } = ctx
  const { queue: queueName = 'seo', type, data, priority, delay } = body
  
  if (!type) {
    return response(400, { error: 'Job type is required' })
  }
  
  try {
    const result = await queue.enqueue(queueName, type, {
      ...data,
      orgId,
      userId: contact?.id
    }, {
      priority,
      delay
    })
    
    return response(201, { job: result })
  } catch (error) {
    if (error.message?.includes('UPSTASH')) {
      return response(503, { 
        error: 'Queue service unavailable',
        message: 'Redis not configured. Jobs will be processed via direct function calls.'
      })
    }
    throw error
  }
}

async function getJob(ctx, jobId) {
  const { supabase } = ctx
  
  try {
    // Try Redis first
    const job = await queue.getJob(jobId)
    if (job) {
      return response(200, { job, source: 'redis' })
    }
  } catch (error) {
    // Ignore Redis errors, fall back to database
  }
  
  // Try database
  const { data: dbJob, error } = await supabase
    .from('seo_background_jobs')
    .select('*')
    .eq('id', jobId)
    .single()
  
  if (error) {
    return response(error.code === 'PGRST116' ? 404 : 500, { error: error.message })
  }
  
  return response(200, { job: dbJob, source: 'database' })
}

async function cancelJob(ctx, jobId) {
  try {
    const cancelled = await queue.cancel(jobId)
    if (cancelled) {
      return response(200, { success: true, message: 'Job cancelled' })
    }
    return response(400, { error: 'Job cannot be cancelled (already processing or completed)' })
  } catch (error) {
    if (error.message?.includes('UPSTASH')) {
      // Fallback: update database
      const { supabase } = ctx
      const { error: dbError } = await supabase
        .from('seo_background_jobs')
        .update({ status: 'cancelled' })
        .eq('id', jobId)
        .eq('status', 'pending')
      
      if (dbError) return response(500, { error: dbError.message })
      return response(200, { success: true, source: 'database' })
    }
    throw error
  }
}

async function retryJob(ctx, jobId) {
  const { supabase } = ctx
  
  // Get the original job
  const { data: job, error } = await supabase
    .from('seo_background_jobs')
    .select('*')
    .eq('id', jobId)
    .single()
  
  if (error) {
    return response(404, { error: 'Job not found' })
  }
  
  if (job.status !== 'failed') {
    return response(400, { error: 'Only failed jobs can be retried' })
  }
  
  try {
    // Re-enqueue in Redis
    const result = await queue.enqueue(job.queue || 'seo', job.job_type, {
      ...job.params,
      siteId: job.site_id,
      orgId: job.org_id,
      originalJobId: jobId
    }, {
      priority: 'high' // Retries get high priority
    })
    
    // Update original job
    await supabase
      .from('seo_background_jobs')
      .update({ 
        status: 'retried',
        retry_job_id: result.jobId
      })
      .eq('id', jobId)
    
    return response(200, { 
      success: true, 
      newJobId: result.jobId,
      message: 'Job re-queued'
    })
  } catch (error) {
    if (error.message?.includes('UPSTASH')) {
      // Fallback: just reset the job status
      await supabase
        .from('seo_background_jobs')
        .update({ 
          status: 'pending',
          error_message: null,
          started_at: null,
          completed_at: null
        })
        .eq('id', jobId)
      
      return response(200, { 
        success: true, 
        source: 'database',
        message: 'Job status reset to pending'
      })
    }
    throw error
  }
}
