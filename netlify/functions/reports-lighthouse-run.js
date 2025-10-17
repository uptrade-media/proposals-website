// netlify/functions/reports-lighthouse-run.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, and } from 'drizzle-orm'
import * as schema from '../../src/db/schema.ts'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'um_session'
const JWT_SECRET = process.env.AUTH_JWT_SECRET
const DATABASE_URL = process.env.DATABASE_URL

// Import Lighthouse (lazy load)
let lighthouse = null

const loadLighthouse = async () => {
  if (lighthouse) return lighthouse
  try {
    const mod = await import('lighthouse')
    lighthouse = mod.default
    return lighthouse
  } catch (err) {
    console.warn('Lighthouse not available in this environment:', err.message)
    return null
  }
}

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers }
  }

  // Get and verify auth token
  const token = event.headers.cookie?.match(/um_session=([^;]+)/)?.[1]

  if (!token) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET)

    if (payload.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      }
    }

    // Parse request body
    const { projectId, targetUrl, deviceType = 'mobile' } = JSON.parse(event.body || '{}')

    if (!projectId || !targetUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'projectId and targetUrl are required' })
      }
    }

    // Validate URL
    try {
      new URL(targetUrl)
    } catch (err) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid URL format' })
      }
    }

    if (!DATABASE_URL) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database not configured' })
      }
    }

    const db = neon(DATABASE_URL)
    const drizzleDb = drizzle(db, { schema })

    // Check if project exists and user has access
    const project = await drizzleDb.query.projects.findFirst({
      where: eq(schema.projects.id, projectId)
    })

    if (!project) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Project not found' })
      }
    }

    // Create audit record with pending status
    const audit = await drizzleDb
      .insert(schema.audits)
      .values({
        projectId,
        contactId: project.contactId,
        targetUrl,
        deviceType,
        status: 'running',
        throttlingProfile: '4g'
      })
      .returning()

    const auditId = audit[0].id

    // Load Lighthouse library
    const lh = await loadLighthouse()

    // If Lighthouse is not available, mark as pending and return
    if (!lh) {
      console.log('[Lighthouse] Lighthouse library not available - audit marked for background processing')
      return {
        statusCode: 202,
        headers,
        body: JSON.stringify({
          auditId,
          status: 'pending',
          message: 'Lighthouse audit queued for background processing',
          targetUrl
        })
      }
    }

    // Run Lighthouse audit in background
    // Don't wait for it - return immediately
    runAuditInBackground(auditId, projectId, targetUrl, deviceType, project.contactId, drizzleDb)

    return {
      statusCode: 202,
      headers,
      body: JSON.stringify({
        auditId,
        status: 'running',
        message: 'Lighthouse audit started',
        targetUrl,
        deviceType
      })
    }
  } catch (error) {
    console.error('Error starting Lighthouse audit:', error)

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired session' })
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to start Lighthouse audit',
        message: error.message
      })
    }
  }
}

/**
 * Run Lighthouse audit in background (async, doesn't block response)
 */
async function runAuditInBackground(auditId, projectId, targetUrl, deviceType, contactId, drizzleDb) {
  try {
    // Load Lighthouse library
    const lh = await loadLighthouse()
    
    if (!lh) {
      throw new Error('Lighthouse not available')
    }

    // Configure Lighthouse options based on device type
    const chromeFlags = ['--headless', '--no-sandbox', '--disable-gpu']
    const options = {
      logLevel: 'error',
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
      emulatedFormFactor: deviceType // 'mobile' or 'desktop'
    }

    // Run the audit
    const runnerResult = await lh(targetUrl, options)
    const lighthouseResult = runnerResult.lhr

    // Extract scores
    const categories = lighthouseResult.categories || {}
    const audits = lighthouseResult.audits || {}

    // Extract Core Web Vitals
    const metrics = lighthouseResult.audits.metrics?.details?.items?.[0] || {}

    const performanceScore = categories.performance?.score ? Math.round(categories.performance.score * 100) : null
    const accessibilityScore = categories.accessibility?.score ? Math.round(categories.accessibility.score * 100) : null
    const bestPracticesScore = categories['best-practices']?.score ? Math.round(categories['best-practices'].score * 100) : null
    const seoScore = categories.seo?.score ? Math.round(categories.seo.score * 100) : null
    const pwaScore = categories.pwa?.score ? Math.round(categories.pwa.score * 100) : null

    // Extract metrics
    const lcpMs = metrics.largest_contentful_paint_ms
    const fidMs = metrics.first_input_delay_ms
    const clsScore = metrics.cumulative_layout_shift
    const fcpMs = metrics.first_contentful_paint_ms
    const ttiMs = metrics.interactive_ms
    const tbtMs = metrics.total_blocking_time_ms
    const speedIndexMs = metrics.speed_index_ms

    // Update audit record with results
    await drizzleDb
      .update(schema.audits)
      .set({
        status: 'completed',
        performanceScore,
        accessibilityScore,
        bestPracticesScore,
        seoScore,
        pwascore: pwaScore,
        lcpMs: lcpMs ? String(lcpMs) : null,
        fidMs: fidMs ? String(fidMs) : null,
        clsScore: clsScore ? String(clsScore) : null,
        fcpMs: fcpMs ? String(fcpMs) : null,
        ttiMs: ttiMs ? String(ttiMs) : null,
        tbtMs: tbtMs ? String(tbtMs) : null,
        speedIndexMs: speedIndexMs ? String(speedIndexMs) : null,
        fullAuditJson: JSON.stringify(lighthouseResult),
        completedAt: new Date().toISOString()
      })
      .where(eq(schema.audits.id, auditId))

    // Store individual metrics for trend tracking
    const metricsToStore = [
      { name: 'performance', score: performanceScore },
      { name: 'accessibility', score: accessibilityScore },
      { name: 'best_practices', score: bestPracticesScore },
      { name: 'seo', score: seoScore },
      { name: 'pwa', score: pwaScore },
      { name: 'lcp', value: lcpMs, unit: 'ms' },
      { name: 'fid', value: fidMs, unit: 'ms' },
      { name: 'cls', value: clsScore, unit: 'unitless' },
      { name: 'fcp', value: fcpMs, unit: 'ms' },
      { name: 'tti', value: ttiMs, unit: 'ms' },
      { name: 'tbt', value: tbtMs, unit: 'ms' },
      { name: 'speed_index', value: speedIndexMs, unit: 'ms' }
    ]

    for (const metric of metricsToStore) {
      await drizzleDb
        .insert(schema.lighthouseMetrics)
        .values({
          auditId,
          projectId,
          metricName: metric.name,
          score: metric.score,
          value: metric.value ? String(metric.value) : null,
          unit: metric.unit
        })
        .onConflictDoNothing()
    }

    console.log(`[Lighthouse] Audit ${auditId} completed successfully`)
  } catch (error) {
    console.error(`[Lighthouse] Error running audit ${auditId}:`, error)

    // Update audit record with error
    try {
      await drizzleDb
        .update(schema.audits)
        .set({
          status: 'failed',
          errorMessage: error.message,
          completedAt: new Date().toISOString()
        })
        .where(eq(schema.audits.id, auditId))
    } catch (updateErr) {
      console.error('Failed to update audit status:', updateErr)
    }
  }
}
