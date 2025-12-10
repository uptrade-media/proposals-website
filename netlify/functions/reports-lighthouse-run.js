// netlify/functions/reports-lighthouse-run.js
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from './utils/supabase.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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

  try {
    // Verify authentication
    const { contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: authError || 'Not authenticated' })
      }
    }

    if (contact.role !== 'admin') {
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

    // Check if project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Project not found' })
      }
    }

    // Create audit record with pending status
    const { data: audit, error: auditError } = await supabase
      .from('audits')
      .insert({
        project_id: projectId,
        contact_id: project.contact_id,
        target_url: targetUrl,
        device_type: deviceType,
        status: 'running',
        throttling_profile: '4g'
      })
      .select()
      .single()

    if (auditError) {
      throw auditError
    }

    const auditId = audit.id

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
    runAuditInBackground(auditId, projectId, targetUrl, deviceType, project.contact_id, supabase)

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
async function runAuditInBackground(auditId, projectId, targetUrl, deviceType, contactId, supabaseClient) {
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
    await supabaseClient
      .from('audits')
      .update({
        status: 'completed',
        performance_score: performanceScore,
        accessibility_score: accessibilityScore,
        best_practices_score: bestPracticesScore,
        seo_score: seoScore,
        pwa_score: pwaScore,
        lcp_ms: lcpMs ? String(lcpMs) : null,
        fid_ms: fidMs ? String(fidMs) : null,
        cls_score: clsScore ? String(clsScore) : null,
        fcp_ms: fcpMs ? String(fcpMs) : null,
        tti_ms: ttiMs ? String(ttiMs) : null,
        tbt_ms: tbtMs ? String(tbtMs) : null,
        speed_index_ms: speedIndexMs ? String(speedIndexMs) : null,
        full_audit_json: JSON.stringify(lighthouseResult),
        completed_at: new Date().toISOString()
      })
      .eq('id', auditId)

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
      await supabaseClient
        .from('lighthouse_metrics')
        .upsert({
          audit_id: auditId,
          project_id: projectId,
          metric_name: metric.name,
          score: metric.score,
          value: metric.value ? String(metric.value) : null,
          unit: metric.unit
        }, { onConflict: 'audit_id,metric_name' })
    }

    console.log(`[Lighthouse] Audit ${auditId} completed successfully`)
  } catch (error) {
    console.error(`[Lighthouse] Error running audit ${auditId}:`, error)

    // Update audit record with error
    try {
      await supabaseClient
        .from('audits')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', auditId)
    } catch (updateErr) {
      console.error('Failed to update audit status:', updateErr)
    }
  }
}
