// netlify/functions/seo-serp-features.js
// SERP Feature Opportunities - Target featured snippets, FAQs, PAA
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// SERP feature types we track
const FEATURE_TYPES = [
  'featured_snippet',
  'faq',
  'people_also_ask',
  'local_pack',
  'video',
  'image_pack',
  'knowledge_panel',
  'sitelinks',
  'reviews',
  'how_to'
]

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

  // GET - List SERP feature opportunities
  if (event.httpMethod === 'GET') {
    return await getOpportunities(event, supabase, headers)
  }

  // POST - Analyze SERP features
  if (event.httpMethod === 'POST') {
    return await analyzeFeatures(event, supabase, headers)
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
}

async function getOpportunities(event, supabase, headers) {
  const { siteId, featureType, status, pageId } = event.queryStringParameters || {}

  if (!siteId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
  }

  let query = supabase
    .from('seo_serp_features')
    .select('*, page:seo_pages(id, url, title)')
    .eq('site_id', siteId)
    .order('opportunity_score', { ascending: false })
    .limit(100)

  if (featureType) query = query.eq('feature_type', featureType)
  if (status) query = query.eq('status', status)
  if (pageId) query = query.eq('page_id', pageId)

  const { data, error } = await query

  if (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }

  // Group by feature type for summary
  const byType = {}
  for (const type of FEATURE_TYPES) {
    byType[type] = {
      total: data?.filter(d => d.feature_type === type).length || 0,
      owned: data?.filter(d => d.feature_type === type && d.we_have_feature).length || 0,
      opportunities: data?.filter(d => d.feature_type === type && !d.we_have_feature && d.opportunity_score > 50).length || 0
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      opportunities: data,
      summary: {
        total: data?.length || 0,
        owned: data?.filter(d => d.we_have_feature).length || 0,
        highOpportunity: data?.filter(d => d.opportunity_score >= 70).length || 0,
        byType
      }
    })
  }
}

async function analyzeFeatures(event, supabase, headers) {
  const body = JSON.parse(event.body || '{}')
  const { siteId, keywords: targetKeywords, forceRefresh } = body

  if (!siteId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
  }

  // Always use background job to avoid timeout
  console.log(`[SERP Features] Queuing background job for site ${siteId}`)
  
  // Create background job
  const { data: job, error: jobError } = await supabase
    .from('seo_background_jobs')
    .insert({
      site_id: siteId,
      type: 'serp-features',
      status: 'pending',
      metadata: { keywords: targetKeywords, forceRefresh }
    })
    .select()
    .single()

  if (jobError) {
    console.error('[SERP Features] Job creation error:', jobError)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to queue job' }) }
  }

  // Trigger background function
  const baseUrl = process.env.URL || 'http://localhost:8888'
  fetch(`${baseUrl}/.netlify/functions/seo-serp-features-background`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteId, jobId: job.id, keywords: targetKeywords })
  }).catch(err => console.error('[SERP Features] Background trigger failed:', err))

  return {
    statusCode: 202,
    headers,
    body: JSON.stringify({
      message: 'SERP features analysis queued',
      jobId: job.id,
      status: 'pending'
    })
  }
}

function hashKeyword(keyword) {
  let hash = 0
  for (let i = 0; i < keyword.length; i++) {
    const char = keyword.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}
