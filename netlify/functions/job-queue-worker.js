// netlify/functions/job-queue-worker.js
// ═══════════════════════════════════════════════════════════════════════════════
// Job Queue Worker - Scheduled function to process queued jobs
// ═══════════════════════════════════════════════════════════════════════════════
// Runs on a schedule to process jobs from the Redis queue
// This provides reliable job execution with retries and monitoring

import { processQueue, getQueueStats } from './utils/job-queue.js'
import { createSupabaseAdmin } from './utils/supabase.js'

// Map job types to their handler functions
const JOB_HANDLERS = {
  // SEO Jobs
  'seo:crawl_sitemap': handleSeoJob,
  'seo:gsc_sync': handleSeoJob,
  'seo:ai_brain_analysis': handleSeoJob,
  'seo:ai_train': handleSeoJob,
  'seo:detect_opportunities': handleSeoJob,
  'seo:competitor_analyze': handleSeoJob,
  'seo:cwv_check': handleSeoJob,
  'seo:internal_links_analyze': handleSeoJob,
  'seo:content_brief': handleSeoJob,
  'seo:content_decay_analyze': handleSeoJob,
  'seo:content_gap_analyze': handleSeoJob,
  'seo:cannibalization_analyze': handleSeoJob,
  'seo:schema_generate': handleSeoJob,
  'seo:backlinks_discover': handleSeoJob,
  'seo:local_seo_analyze': handleSeoJob,
  'seo:serp_analyze': handleSeoJob,
  
  // Email Jobs
  'email:send_campaign': handleEmailJob,
  'email:send_followup': handleEmailJob,
  'email:send_notification': handleEmailJob,
  
  // AI Jobs
  'ai:proposal_generate': handleAiJob,
  'ai:content_generate': handleAiJob,
  'ai:analyze': handleAiJob
}

// Map SEO job types to their background function names
const SEO_FUNCTION_MAP = {
  'crawl_sitemap': 'seo-crawl-sitemap-background',
  'ai_brain_analysis': 'seo-ai-brain-v2-background',
  'ai_train': 'seo-ai-train-background',
  'detect_opportunities': 'seo-opportunities-detect-background',
  'competitor_analyze': 'seo-competitor-analyze-background',
  'cwv_check': 'seo-cwv-background',
  'internal_links_analyze': 'seo-internal-links-background',
  'content_brief': 'seo-content-brief-background',
  'content_decay_analyze': 'seo-content-decay-background',
  'content_gap_analyze': 'seo-content-gap-analysis-background',
  'cannibalization_analyze': 'seo-cannibalization-background',
  'schema_generate': 'seo-schema-generate-background',
  'backlinks_discover': 'seo-backlinks-background',
  'local_seo_analyze': 'seo-local-analyze-background',
  'serp_analyze': 'seo-serp-analyze-background'
}

export async function handler(event) {
  const startTime = Date.now()
  console.log('[Queue Worker] Starting job processing...')
  
  const results = {
    seo: { processed: 0, errors: 0 },
    email: { processed: 0, errors: 0 },
    ai: { processed: 0, errors: 0 }
  }

  try {
    // Process each queue
    for (const queue of ['seo', 'email', 'ai']) {
      const stats = await getQueueStats(queue)
      console.log(`[Queue Worker] ${queue} queue: ${stats.pending} pending, ${stats.processing} processing`)

      if (stats.pending > 0 || stats.processing > 0) {
        const result = await processQueue(queue, createJobHandler(queue), {
          maxJobs: 5, // Process up to 5 jobs per queue per run
          timeout: 20000 // 20 second timeout per queue
        })
        
        results[queue].processed = result.processed
        console.log(`[Queue Worker] ${queue}: processed ${result.processed} jobs in ${result.elapsed}ms`)
      }
    }

    const duration = Date.now() - startTime
    console.log(`[Queue Worker] Completed in ${duration}ms`)

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        duration,
        results
      })
    }

  } catch (error) {
    console.error('[Queue Worker] Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    }
  }
}

// Create a handler function for a specific queue
function createJobHandler(queue) {
  return async (job) => {
    const handlerKey = `${queue}:${job.type}`
    const handler = JOB_HANDLERS[handlerKey]
    
    if (handler) {
      return await handler(job)
    } else {
      // Default: trigger background function
      return await triggerBackgroundFunction(queue, job)
    }
  }
}

// Handler for SEO jobs - triggers the appropriate background function
async function handleSeoJob(job) {
  const functionName = SEO_FUNCTION_MAP[job.type]
  
  if (!functionName) {
    throw new Error(`Unknown SEO job type: ${job.type}`)
  }

  // Trigger the background function
  const response = await fetch(`${process.env.URL}/.netlify/functions/${functionName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      siteId: job.data.siteId,
      orgId: job.data.orgId,
      jobId: job.id,
      ...job.data
    })
  })

  if (!response.ok) {
    throw new Error(`Background function ${functionName} failed: ${response.status}`)
  }

  // Update job record in Supabase
  const supabase = createSupabaseAdmin()
  await supabase
    .from('seo_background_jobs')
    .update({
      status: 'started',
      started_at: new Date().toISOString()
    })
    .eq('id', job.data.dbJobId)

  return { triggered: functionName }
}

// Handler for email jobs
async function handleEmailJob(job) {
  const supabase = createSupabaseAdmin()
  
  switch (job.type) {
    case 'send_campaign':
      // Trigger campaign send background function
      await fetch(`${process.env.URL}/.netlify/functions/email-campaign-send-background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job.data)
      })
      return { triggered: 'email-campaign-send-background' }

    case 'send_followup':
      // Process scheduled followup
      await fetch(`${process.env.URL}/.netlify/functions/scheduled-followups-process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followupId: job.data.followupId })
      })
      return { triggered: 'scheduled-followups-process' }

    case 'send_notification':
      // Send notification email directly
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: job.data.to,
        subject: job.data.subject,
        html: job.data.html
      })
      return { sent: true }

    default:
      throw new Error(`Unknown email job type: ${job.type}`)
  }
}

// Handler for AI jobs
async function handleAiJob(job) {
  switch (job.type) {
    case 'proposal_generate':
      await fetch(`${process.env.URL}/.netlify/functions/proposals-create-ai-background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job.data)
      })
      return { triggered: 'proposals-create-ai-background' }

    case 'content_generate':
      await fetch(`${process.env.URL}/.netlify/functions/seo-ai-blog-brain-background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job.data)
      })
      return { triggered: 'seo-ai-blog-brain-background' }

    default:
      throw new Error(`Unknown AI job type: ${job.type}`)
  }
}

// Generic background function trigger
async function triggerBackgroundFunction(queue, job) {
  console.log(`[Queue Worker] Triggering ${queue}:${job.type} for job ${job.id}`)
  
  // For unknown job types, we just log and complete
  // In production, you'd want to handle this differently
  return { 
    warning: `No specific handler for ${queue}:${job.type}`,
    job: job.id
  }
}
