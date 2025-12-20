/**
 * Blog Create AI - Job Initiator
 * Creates async job and returns immediately
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { processJobInBackground } from './blog-ai-worker.js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    // Admin role required
    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      }
    }

    const formData = JSON.parse(event.body || '{}')
    const supabase = createSupabaseAdmin()
    
    // Get org context
    const orgId = event.headers['x-organization-id'] || event.headers['X-Organization-Id']
    let actualOrgId = orgId
    
    if (orgId) {
      // Resolve project tenant to org
      const { data: project } = await supabase
        .from('projects')
        .select('org_id')
        .eq('id', orgId)
        .maybeSingle()
      
      actualOrgId = project?.org_id || orgId
    }
    
    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('blog_generation_jobs')
      .insert({
        org_id: actualOrgId,
        contact_id: contact.id,
        form_data: formData,
        status: 'pending',
        progress: { stage: 0, message: 'Starting...' }
      })
      .select()
      .single()
    
    if (jobError) {
      console.error('[Blog AI] Failed to create job:', jobError)
      throw new Error('Failed to create generation job')
    }
    
    console.log('[Blog AI] Created job:', job.id, '| Topic:', formData.topic)
    
    // Trigger background processing (non-blocking)
    setImmediate(() => {
      processJobInBackground(job.id).catch(err => {
        console.error('[Blog AI] Background processing failed:', err)
      })
    })
    
    // Return immediately with job ID
    return {
      statusCode: 202, // Accepted
      headers,
      body: JSON.stringify({
        success: true,
        jobId: job.id,
        message: 'Blog post generation started',
        estimatedTime: '30-60 seconds'
      })
    }
    
  } catch (error) {
    console.error('[Blog AI] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to start blog generation',
        details: error.message
      })
    }
  }
}
