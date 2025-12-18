// netlify/functions/utils/job-queue.js
// ═══════════════════════════════════════════════════════════════════════════════
// Job Queue with Upstash Redis
// ═══════════════════════════════════════════════════════════════════════════════
// Reliable background job queuing using Upstash Redis (serverless Redis)
// Replaces the simple fire-and-forget approach with proper queue management

import { Redis } from '@upstash/redis'

// Initialize Upstash Redis client
// Uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from environment
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

// Queue configuration
const QUEUE_PREFIX = 'jobs:'
const JOB_TTL_SECONDS = 86400 * 7 // 7 days for job data retention
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 5000

// ─────────────────────────────────────────────────────────────────────────────
// Queue Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add a job to the queue
 * @param {string} queue - Queue name (e.g., 'seo', 'email', 'ai')
 * @param {string} jobType - Type of job
 * @param {object} data - Job data
 * @param {object} options - Optional settings (priority, delay, retries)
 * @returns {object} Job info with ID
 */
export async function enqueue(queue, jobType, data, options = {}) {
  const jobId = generateJobId()
  const timestamp = Date.now()
  
  const job = {
    id: jobId,
    queue,
    type: jobType,
    data,
    status: 'pending',
    priority: options.priority || 'normal', // 'high', 'normal', 'low'
    maxRetries: options.maxRetries ?? MAX_RETRIES,
    retryCount: 0,
    createdAt: timestamp,
    scheduledAt: options.delay ? timestamp + options.delay : timestamp,
    startedAt: null,
    completedAt: null,
    error: null,
    result: null
  }

  // Store job data
  await redis.set(`${QUEUE_PREFIX}${jobId}`, JSON.stringify(job), {
    ex: JOB_TTL_SECONDS
  })

  // Add to appropriate queue based on priority and schedule
  const queueKey = getQueueKey(queue, job.priority)
  const score = job.scheduledAt // Use timestamp as score for ordering

  await redis.zadd(queueKey, { score, member: jobId })

  // Track in active jobs set
  await redis.sadd(`${QUEUE_PREFIX}${queue}:pending`, jobId)

  console.log(`[Queue] Enqueued job ${jobId} to ${queue}:${job.priority}`)

  return {
    jobId,
    queue,
    jobType,
    scheduledAt: new Date(job.scheduledAt).toISOString()
  }
}

/**
 * Get the next job from a queue
 * @param {string} queue - Queue name
 * @returns {object|null} Job or null if queue is empty
 */
export async function dequeue(queue) {
  const now = Date.now()

  // Check queues in priority order
  for (const priority of ['high', 'normal', 'low']) {
    const queueKey = getQueueKey(queue, priority)
    
    // Get oldest job that's ready (scheduled time <= now)
    const results = await redis.zrangebyscore(queueKey, 0, now, {
      offset: 0,
      count: 1
    })

    if (results.length > 0) {
      const jobId = results[0]
      
      // Remove from queue (atomic operation)
      const removed = await redis.zrem(queueKey, jobId)
      
      if (removed > 0) {
        // Get and update job data
        const jobData = await redis.get(`${QUEUE_PREFIX}${jobId}`)
        if (jobData) {
          const job = typeof jobData === 'string' ? JSON.parse(jobData) : jobData
          job.status = 'processing'
          job.startedAt = now
          
          await redis.set(`${QUEUE_PREFIX}${jobId}`, JSON.stringify(job), {
            ex: JOB_TTL_SECONDS
          })

          // Move to processing set
          await redis.smove(`${QUEUE_PREFIX}${queue}:pending`, `${QUEUE_PREFIX}${queue}:processing`, jobId)

          return job
        }
      }
    }
  }

  return null
}

/**
 * Complete a job successfully
 */
export async function complete(jobId, result = null) {
  const jobData = await redis.get(`${QUEUE_PREFIX}${jobId}`)
  if (!jobData) return false

  const job = typeof jobData === 'string' ? JSON.parse(jobData) : jobData
  
  job.status = 'completed'
  job.completedAt = Date.now()
  job.result = result

  await redis.set(`${QUEUE_PREFIX}${jobId}`, JSON.stringify(job), {
    ex: JOB_TTL_SECONDS
  })

  // Remove from processing set
  await redis.srem(`${QUEUE_PREFIX}${job.queue}:processing`, jobId)
  
  // Add to completed set (for stats)
  await redis.sadd(`${QUEUE_PREFIX}${job.queue}:completed`, jobId)

  console.log(`[Queue] Job ${jobId} completed`)
  return true
}

/**
 * Fail a job (will retry if retries remaining)
 */
export async function fail(jobId, error) {
  const jobData = await redis.get(`${QUEUE_PREFIX}${jobId}`)
  if (!jobData) return false

  const job = typeof jobData === 'string' ? JSON.parse(jobData) : jobData
  
  job.retryCount++
  job.error = error?.message || String(error)

  if (job.retryCount < job.maxRetries) {
    // Retry with exponential backoff
    job.status = 'pending'
    job.scheduledAt = Date.now() + (RETRY_DELAY_MS * Math.pow(2, job.retryCount))
    
    await redis.set(`${QUEUE_PREFIX}${jobId}`, JSON.stringify(job), {
      ex: JOB_TTL_SECONDS
    })

    // Re-add to queue
    const queueKey = getQueueKey(job.queue, job.priority)
    await redis.zadd(queueKey, { score: job.scheduledAt, member: jobId })
    
    // Move back to pending
    await redis.smove(`${QUEUE_PREFIX}${job.queue}:processing`, `${QUEUE_PREFIX}${job.queue}:pending`, jobId)

    console.log(`[Queue] Job ${jobId} failed, retrying (${job.retryCount}/${job.maxRetries})`)
    return { retry: true, nextAttempt: job.scheduledAt }
  } else {
    // Max retries exceeded
    job.status = 'failed'
    job.completedAt = Date.now()
    
    await redis.set(`${QUEUE_PREFIX}${jobId}`, JSON.stringify(job), {
      ex: JOB_TTL_SECONDS
    })

    // Remove from processing, add to failed
    await redis.smove(`${QUEUE_PREFIX}${job.queue}:processing`, `${QUEUE_PREFIX}${job.queue}:failed`, jobId)

    console.log(`[Queue] Job ${jobId} permanently failed after ${job.retryCount} attempts`)
    return { retry: false, error: job.error }
  }
}

/**
 * Get job status
 */
export async function getJob(jobId) {
  const jobData = await redis.get(`${QUEUE_PREFIX}${jobId}`)
  if (!jobData) return null
  return typeof jobData === 'string' ? JSON.parse(jobData) : jobData
}

/**
 * Get queue stats
 */
export async function getQueueStats(queue) {
  const [pending, processing, completed, failed] = await Promise.all([
    redis.scard(`${QUEUE_PREFIX}${queue}:pending`),
    redis.scard(`${QUEUE_PREFIX}${queue}:processing`),
    redis.scard(`${QUEUE_PREFIX}${queue}:completed`),
    redis.scard(`${QUEUE_PREFIX}${queue}:failed`)
  ])

  // Get queue sizes by priority
  const [highQueue, normalQueue, lowQueue] = await Promise.all([
    redis.zcard(getQueueKey(queue, 'high')),
    redis.zcard(getQueueKey(queue, 'normal')),
    redis.zcard(getQueueKey(queue, 'low'))
  ])

  return {
    queue,
    pending,
    processing,
    completed,
    failed,
    byPriority: {
      high: highQueue,
      normal: normalQueue,
      low: lowQueue
    },
    total: pending + processing
  }
}

/**
 * List pending jobs in a queue
 */
export async function listPendingJobs(queue, limit = 50) {
  const jobIds = await redis.smembers(`${QUEUE_PREFIX}${queue}:pending`)
  
  if (jobIds.length === 0) return []

  const jobs = await Promise.all(
    jobIds.slice(0, limit).map(id => getJob(id))
  )

  return jobs.filter(Boolean).sort((a, b) => {
    // Sort by priority then scheduled time
    const priorityOrder = { high: 0, normal: 1, low: 2 }
    if (a.priority !== b.priority) {
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    }
    return a.scheduledAt - b.scheduledAt
  })
}

/**
 * Cancel a pending job
 */
export async function cancel(jobId) {
  const job = await getJob(jobId)
  if (!job) return false
  
  if (job.status !== 'pending') {
    return false // Can only cancel pending jobs
  }

  // Remove from queue
  const queueKey = getQueueKey(job.queue, job.priority)
  await redis.zrem(queueKey, jobId)
  
  // Remove from pending set
  await redis.srem(`${QUEUE_PREFIX}${job.queue}:pending`, jobId)

  // Update job status
  job.status = 'cancelled'
  job.completedAt = Date.now()
  
  await redis.set(`${QUEUE_PREFIX}${jobId}`, JSON.stringify(job), {
    ex: JOB_TTL_SECONDS
  })

  console.log(`[Queue] Job ${jobId} cancelled`)
  return true
}

/**
 * Clean up old completed/failed jobs
 */
export async function cleanup(queue, olderThanMs = 86400000 * 7) {
  const cutoff = Date.now() - olderThanMs
  let cleaned = 0

  for (const status of ['completed', 'failed']) {
    const jobIds = await redis.smembers(`${QUEUE_PREFIX}${queue}:${status}`)
    
    for (const jobId of jobIds) {
      const job = await getJob(jobId)
      if (job && job.completedAt && job.completedAt < cutoff) {
        await redis.del(`${QUEUE_PREFIX}${jobId}`)
        await redis.srem(`${QUEUE_PREFIX}${queue}:${status}`, jobId)
        cleaned++
      }
    }
  }

  return cleaned
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function generateJobId() {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `${timestamp}-${random}`
}

function getQueueKey(queue, priority) {
  return `${QUEUE_PREFIX}${queue}:queue:${priority}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience Functions for Specific Queues
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Queue an SEO background job
 */
export async function enqueueSeoJob(jobType, siteId, data = {}, options = {}) {
  return enqueue('seo', jobType, {
    siteId,
    ...data
  }, options)
}

/**
 * Queue an email job
 */
export async function enqueueEmailJob(jobType, data, options = {}) {
  return enqueue('email', jobType, data, { 
    ...options, 
    priority: options.priority || 'high' // Emails are typically high priority
  })
}

/**
 * Queue an AI analysis job
 */
export async function enqueueAiJob(jobType, data, options = {}) {
  return enqueue('ai', jobType, data, options)
}

// ─────────────────────────────────────────────────────────────────────────────
// Worker Pattern (for scheduled function to process jobs)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Process jobs from a queue (call this from a scheduled function)
 * @param {string} queue - Queue name
 * @param {function} handler - Async function to process each job
 * @param {object} options - Processing options
 */
export async function processQueue(queue, handler, options = {}) {
  const { maxJobs = 10, timeout = 25000 } = options
  const startTime = Date.now()
  let processed = 0

  while (processed < maxJobs && (Date.now() - startTime) < timeout) {
    const job = await dequeue(queue)
    if (!job) break // Queue is empty

    try {
      const result = await handler(job)
      await complete(job.id, result)
      processed++
    } catch (error) {
      console.error(`[Queue] Error processing job ${job.id}:`, error)
      await fail(job.id, error)
    }
  }

  return { processed, elapsed: Date.now() - startTime }
}

export default {
  enqueue,
  dequeue,
  complete,
  fail,
  getJob,
  getQueueStats,
  listPendingJobs,
  cancel,
  cleanup,
  enqueueSeoJob,
  enqueueEmailJob,
  enqueueAiJob,
  processQueue
}
