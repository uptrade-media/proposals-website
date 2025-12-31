// netlify/functions/seo-content-gap-analysis.js
// Content Gap Analysis - Find missing topics, compare with competitors
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  const supabase = createSupabaseAdmin()

  // GET - Get content gaps
  if (event.httpMethod === 'GET') {
    return await getContentGaps(event, supabase, headers)
  }

  // POST - Analyze content gaps
  if (event.httpMethod === 'POST') {
    return await analyzeContentGaps(event, supabase, headers)
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
}

async function getContentGaps(event, supabase, headers) {
  const { siteId, status = 'identified', gapType, priority } = event.queryStringParameters || {}

  if (!siteId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
  }

  let query = supabase
    .from('seo_content_gaps')
    .select('*')
    .eq('site_id', siteId)
    .order('ai_importance_score', { ascending: false, nullsFirst: false })
    .limit(100)

  if (status !== 'all') query = query.eq('status', status)
  if (gapType) query = query.eq('gap_type', gapType)
  if (priority) query = query.eq('priority', priority)

  const { data: gaps, error } = await query

  if (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }

  // Get summary
  const summary = {
    total: gaps?.length || 0,
    byType: {
      missing_page: gaps?.filter(g => g.gap_type === 'missing_page').length || 0,
      thin_content: gaps?.filter(g => g.gap_type === 'thin_content').length || 0,
      outdated: gaps?.filter(g => g.gap_type === 'outdated').length || 0,
      competitor_only: gaps?.filter(g => g.gap_type === 'competitor_only').length || 0
    },
    byPriority: {
      critical: gaps?.filter(g => g.priority === 'critical').length || 0,
      high: gaps?.filter(g => g.priority === 'high').length || 0,
      medium: gaps?.filter(g => g.priority === 'medium').length || 0,
      low: gaps?.filter(g => g.priority === 'low').length || 0
    },
    totalTrafficPotential: gaps?.reduce((sum, g) => sum + (g.estimated_traffic_potential || 0), 0) || 0,
    totalSearchVolume: gaps?.reduce((sum, g) => sum + (g.search_volume_total || 0), 0) || 0
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ gaps, summary })
  }
}

async function analyzeContentGaps(event, supabase, headers) {
  const body = JSON.parse(event.body || '{}')
  const { siteId, includeCompetitors = true, focusTopics = [], forceRefresh } = body

  if (!siteId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
  }

  // Always use background job to avoid timeout
  console.log(`[Content Gaps] Queuing background job for site ${siteId}`)
  
  // Create background job
  const { data: job, error: jobError } = await supabase
    .from('seo_background_jobs')
    .insert({
      site_id: siteId,
      job_type: 'content-gap-analysis',
      status: 'pending',
      metadata: { includeCompetitors, focusTopics, forceRefresh }
    })
    .select()
    .single()

  if (jobError) {
    console.error('[Content Gaps] Job creation error:', jobError)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to queue job' }) }
  }

  // Trigger background function
  const baseUrl = process.env.URL || 'http://localhost:8888'
  fetch(`${baseUrl}/.netlify/functions/seo-content-gap-analysis-background`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteId, jobId: job.id, includeCompetitors, focusTopics })
  }).catch(err => console.error('[Content Gaps] Background trigger failed:', err))

  return {
    statusCode: 202,
    headers,
    body: JSON.stringify({
      message: 'Content gap analysis queued',
      jobId: job.id,
      status: 'pending'
    })
  }
}
