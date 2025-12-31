// netlify/functions/seo-topic-clusters.js
// Semantic Keyword Clustering - Build topic clusters and pillar page strategies
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
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

  // GET - List clusters
  if (event.httpMethod === 'GET') {
    return await getClusters(event, supabase, headers)
  }

  // POST - Generate clusters from keywords
  if (event.httpMethod === 'POST') {
    return await generateClusters(event, supabase, headers)
  }

  // PUT - Update cluster (assign pages, edit)
  if (event.httpMethod === 'PUT') {
    return await updateCluster(event, supabase, headers)
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
}

async function getClusters(event, supabase, headers) {
  const { siteId, clusterId } = event.queryStringParameters || {}

  if (!siteId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
  }

  // Get single cluster with full details
  if (clusterId) {
    const { data: cluster, error } = await supabase
      .from('seo_topic_clusters')
      .select('*, pillar_page:seo_pages!pillar_page_id(*)')
      .eq('id', clusterId)
      .single()

    if (error || !cluster) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Cluster not found' }) }
    }

    // Get cluster pages
    const { data: clusterPages } = await supabase
      .from('seo_pages')
      .select('id, url, title, clicks_28d, impressions_28d, avg_position_28d')
      .eq('cluster_id', clusterId)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ cluster, clusterPages })
    }
  }

  // List all clusters
  const { data: clusters, error } = await supabase
    .from('seo_topic_clusters')
    .select('*')
    .eq('site_id', siteId)
    .order('total_search_volume', { ascending: false })

  if (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }

  // Get summary stats
  const summary = {
    totalClusters: clusters?.length || 0,
    totalKeywords: clusters?.reduce((sum, c) => sum + (c.keyword_count || 0), 0) || 0,
    totalVolume: clusters?.reduce((sum, c) => sum + (c.total_search_volume || 0), 0) || 0,
    withPillar: clusters?.filter(c => c.pillar_page_id).length || 0,
    needsPillar: clusters?.filter(c => !c.pillar_page_id).length || 0
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ clusters, summary })
  }
}

async function generateClusters(event, supabase, headers) {
  const body = JSON.parse(event.body || '{}')
  const { siteId, minKeywords = 3, includeQuestions = true, forceRefresh } = body

  if (!siteId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
  }

  // Always use background job to avoid timeout
  console.log(`[Topic Clusters] Queuing background job for site ${siteId}`)
  
  // Create background job
  const { data: job, error: jobError } = await supabase
    .from('seo_background_jobs')
    .insert({
      site_id: siteId,
      job_type: 'topic-clusters',
      status: 'pending',
      metadata: { minKeywords, includeQuestions, forceRefresh }
    })
    .select()
    .single()

  if (jobError) {
    console.error('[Topic Clusters] Job creation error:', jobError)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to queue job' }) }
  }

  // Trigger background function
  const baseUrl = process.env.URL || 'http://localhost:8888'
  fetch(`${baseUrl}/.netlify/functions/seo-topic-clusters-background`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteId, jobId: job.id, minKeywords, includeQuestions })
  }).catch(err => console.error('[Topic Clusters] Background trigger failed:', err))

  return {
    statusCode: 202,
    headers,
    body: JSON.stringify({
      message: 'Topic cluster analysis queued',
      jobId: job.id,
      status: 'pending'
    })
  }
}

async function updateCluster(event, supabase, headers) {
  const body = JSON.parse(event.body || '{}')
  const { clusterId, pillarPageId, clusterName, description, addPageIds, removePageIds } = body

  if (!clusterId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'clusterId required' }) }
  }

  // Build update object
  const updates = { updated_at: new Date().toISOString() }
  
  if (clusterName) updates.cluster_name = clusterName
  if (description) updates.description = description
  
  if (pillarPageId) {
    updates.pillar_page_id = pillarPageId
    
    // Get pillar page URL
    const { data: page } = await supabase
      .from('seo_pages')
      .select('url')
      .eq('id', pillarPageId)
      .single()
    
    if (page) {
      updates.pillar_url = page.url
      updates.pillar_status = 'published'
    }
  }

  const { data: updated, error } = await supabase
    .from('seo_topic_clusters')
    .update(updates)
    .eq('id', clusterId)
    .select()
    .single()

  if (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }

  // Add pages to cluster
  if (addPageIds?.length > 0) {
    await supabase
      .from('seo_pages')
      .update({ cluster_id: clusterId })
      .in('id', addPageIds)
  }

  // Remove pages from cluster
  if (removePageIds?.length > 0) {
    await supabase
      .from('seo_pages')
      .update({ cluster_id: null })
      .in('id', removePageIds)
  }

  // Recalculate cluster stats
  const { data: clusterPages } = await supabase
    .from('seo_pages')
    .select('id')
    .eq('cluster_id', clusterId)

  await supabase
    .from('seo_topic_clusters')
    .update({ page_count: clusterPages?.length || 0 })
    .eq('id', clusterId)

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, cluster: updated })
  }
}
