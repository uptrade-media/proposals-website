// netlify/functions/seo-gsc-sync.js
// Queue GSC sync as a background job (immediate return)
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  // Verify authentication
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { siteId } = body

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId is required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Get site details
    const { data: site, error: siteError } = await supabase
      .from('seo_sites')
      .select('*')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Site not found' }) }
    }

    // Create background job
    const { data: job, error: jobError } = await supabase
      .from('seo_background_jobs')
      .insert({
        site_id: siteId,
        job_type: 'gsc_sync',
        status: 'pending',
        metadata: { domain: site.domain }
      })
      .select()
      .single()

    if (jobError || !job) {
      console.error('[GSC Sync] Failed to create job:', jobError?.message)
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to queue job' }) }
    }

    // Trigger background function (fire and forget)
    fetch(`${process.env.URL}/.netlify/functions/seo-gsc-sync-background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId, jobId: job.id })
    }).catch(err => console.error('[GSC Sync] Failed to trigger background job:', err))

    return {
      statusCode: 202,
      headers,
      body: JSON.stringify({
        success: true,
        jobId: job.id,
        message: 'GSC sync queued - running in background'
      })
    }

  } catch (error) {
    console.error('[GSC Sync] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Failed to queue GSC sync' })
    }
  }
}
