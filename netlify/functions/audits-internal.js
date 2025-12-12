// netlify/functions/audits-internal.js
// Internal audit function for proposal dialog - no email, no project required
// This creates an audit record and triggers the background function
import crypto from 'crypto'
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  // GET request = check status of existing audit
  if (event.httpMethod === 'GET') {
    const auditId = event.queryStringParameters?.auditId
    
    if (!auditId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'auditId is required' })
      }
    }

    try {
      const { contact, error: authError } = await getAuthenticatedUser(event)
      if (authError || !contact || contact.role !== 'admin') {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Admin access required' })
        }
      }

      const supabase = createSupabaseAdmin()
      const { data: audit, error } = await supabase
        .from('audits')
        .select('*')
        .eq('id', auditId)
        .single()

      if (error || !audit) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Audit not found' })
        }
      }

      // If complete, format the response for UI
      if ((audit.status === 'complete' || audit.status === 'completed') && audit.summary) {
        const summary = audit.summary
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: 'complete',
            audit: {
              target_url: audit.target_url,
              performance: audit.performance_score,
              seo: audit.seo_score,
              accessibility: audit.accessibility_score,
              bestPractices: audit.best_practices_score ?? summary.metrics?.bestPractices ?? 0,
              security: audit.score_security,
              overall: audit.score_overall,
              grade: summary.grade ?? summary.metrics?.grade ?? 'N/A',
              performanceMobile: summary.metrics?.performance,
              coreWebVitals: summary.coreWebVitals,
              opportunities: summary.opportunities,
              diagnostics: summary.diagnostics,
              seoDetails: summary.seoDetails,
              status: 'complete'
            }
          })
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: audit.status,
          auditId: audit.id
        })
      }

    } catch (error) {
      console.error('[audits-internal] Status check error:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to check audit status' })
      }
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Verify admin authentication
    const { contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Not authenticated' })
      }
    }

    // Only admins can use internal audit
    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      }
    }

    // Parse request body - accept both 'url' and 'targetUrl' for flexibility
    const body = JSON.parse(event.body || '{}')
    const url = body.url || body.targetUrl

    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URL is required' })
      }
    }

    // Validate URL format
    let targetUrl
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
      targetUrl = urlObj.toString()
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid URL format' })
      }
    }

    console.log(`[audits-internal] Creating audit for: ${targetUrl}`)

    const supabase = createSupabaseAdmin()

    // Create audit record
    const auditId = crypto.randomUUID()
    const { error: insertError } = await supabase
      .from('audits')
      .insert({
        id: auditId,
        contact_id: contact.id,
        target_url: targetUrl,
        status: 'pending',
        device_type: 'mobile',
        throttling_profile: '4g',
        created_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('[audits-internal] Insert error:', insertError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create audit record' })
      }
    }

    // Trigger background function
    const baseUrl = process.env.URL || 'https://portal.uptrademedia.com'
    const backgroundUrl = `${baseUrl}/.netlify/functions/audits-internal-background`
    
    console.log(`[audits-internal] Triggering background function: ${backgroundUrl}`)

    try {
      // Fire and forget - don't wait for response
      fetch(backgroundUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditId })
      }).catch(err => console.error('[audits-internal] Background trigger error:', err))
    } catch (err) {
      console.error('[audits-internal] Failed to trigger background:', err)
    }

    return {
      statusCode: 202,
      headers,
      body: JSON.stringify({
        success: true,
        auditId,
        status: 'pending',
        message: 'Audit started. Poll for status using GET with auditId.'
      })
    }

  } catch (error) {
    console.error('[audits-internal] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to start audit', details: error.message })
    }
  }
}
