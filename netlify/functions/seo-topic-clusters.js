// netlify/functions/seo-topic-clusters.js
// Semantic Keyword Clustering - Build topic clusters and pillar page strategies
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id',
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
  const { siteId, minKeywords = 3, includeQuestions = true } = body

  if (!siteId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
  }

  console.log(`[Topic Clusters] Generating clusters for site ${siteId}`)

  // Get all keywords for this site
  const { data: keywords, error: kwError } = await supabase
    .from('seo_keyword_universe')
    .select('id, keyword, search_volume_monthly, intent, topic_cluster, target_page_url, current_position, is_question')
    .eq('site_id', siteId)
    .order('search_volume_monthly', { ascending: false, nullsFirst: false })
    .limit(500)

  if (kwError) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: kwError.message }) }
  }

  if (!keywords || keywords.length < 5) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Not enough keywords to cluster. Need at least 5.' }) }
  }

  // Get existing pages for mapping
  const { data: pages } = await supabase
    .from('seo_pages')
    .select('id, url, title, page_type')
    .eq('site_id', siteId)

  // Get site knowledge for context
  const { data: knowledge } = await supabase
    .from('seo_knowledge_base')
    .select('business_type, industry, primary_services, content_pillars')
    .eq('site_id', siteId)
    .single()

  // Use AI to cluster keywords
  const clusters = await clusterKeywordsWithAI(keywords, knowledge, pages)

  console.log(`[Topic Clusters] AI identified ${clusters.length} clusters`)

  // Save clusters to database
  const savedClusters = []

  for (const cluster of clusters) {
    // Find best existing page for pillar
    const pillarPage = pages?.find(p => 
      cluster.keywords.some(kw => 
        p.url?.toLowerCase().includes(kw.keyword.split(' ')[0].toLowerCase()) ||
        p.title?.toLowerCase().includes(cluster.primary_keyword.toLowerCase())
      )
    )

    const { data: saved, error } = await supabase
      .from('seo_topic_clusters')
      .insert({
        site_id: siteId,
        cluster_name: cluster.name,
        cluster_slug: cluster.name.toLowerCase().replace(/\s+/g, '-'),
        description: cluster.description,
        primary_keyword: cluster.primary_keyword,
        keywords: cluster.keywords,
        keyword_count: cluster.keywords.length,
        total_search_volume: cluster.keywords.reduce((sum, k) => sum + (k.search_volume || 0), 0),
        avg_difficulty: Math.round(cluster.keywords.reduce((sum, k) => sum + (k.difficulty || 50), 0) / cluster.keywords.length),
        pillar_page_id: pillarPage?.id,
        pillar_url: pillarPage?.url,
        pillar_status: pillarPage ? 'published' : 'not_started',
        topics_covered: cluster.topics_covered || [],
        topics_missing: cluster.topics_missing || [],
        ai_suggested_topics: cluster.suggested_content || [],
        ai_priority: cluster.priority || 'medium'
      })
      .select()
      .single()

    if (!error && saved) {
      savedClusters.push(saved)

      // Update keywords with cluster assignment
      const keywordIds = cluster.keywords.map(k => k.id).filter(Boolean)
      if (keywordIds.length > 0) {
        await supabase
          .from('seo_keyword_universe')
          .update({ cluster_id: saved.id, topic_cluster: cluster.name })
          .in('id', keywordIds)
      }

      // Update pillar page
      if (pillarPage) {
        await supabase
          .from('seo_pages')
          .update({ cluster_id: saved.id })
          .eq('id', pillarPage.id)
      }
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      clustersCreated: savedClusters.length,
      clusters: savedClusters.map(c => ({
        id: c.id,
        name: c.cluster_name,
        keywordCount: c.keyword_count,
        searchVolume: c.total_search_volume,
        hasPillar: !!c.pillar_page_id,
        priority: c.ai_priority
      }))
    })
  }
}

async function clusterKeywordsWithAI(keywords, knowledge, pages) {
  try {
    const keywordList = keywords.map(k => ({
      id: k.id,
      keyword: k.keyword,
      volume: k.search_volume_monthly,
      intent: k.intent,
      isQuestion: k.is_question,
      ranking: k.current_position
    }))

    const context = knowledge ? {
      businessType: knowledge.business_type,
      industry: knowledge.industry,
      services: knowledge.primary_services,
      existingPillars: knowledge.content_pillars
    } : {}

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an SEO expert specializing in topic cluster strategy. Analyze keywords and group them into semantic clusters for pillar/cluster content strategy.

Each cluster should have:
- A primary head term (highest volume, most general)
- Related long-tail keywords
- Question keywords (can be FAQ content)
- Clear topical focus

Consider search intent and buyer journey when clustering. Create clusters that make sense for a content hub.`
        },
        {
          role: 'user',
          content: `Cluster these keywords into topic groups. Business context: ${JSON.stringify(context)}

Keywords:
${JSON.stringify(keywordList, null, 2)}

Respond with JSON:
{
  "clusters": [
    {
      "name": "Cluster Name",
      "description": "What this cluster covers",
      "primary_keyword": "main head term",
      "keywords": [{"id": "uuid", "keyword": "term", "search_volume": 100}],
      "topics_covered": ["subtopic1", "subtopic2"],
      "topics_missing": ["gap1", "gap2"],
      "suggested_content": [
        {"type": "pillar|cluster|faq", "title": "Suggested Title", "target_keyword": "keyword"}
      ],
      "priority": "high|medium|low"
    }
  ]
}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })

    const result = JSON.parse(response.choices[0].message.content)
    return result.clusters || []
  } catch (error) {
    console.error('[Topic Clusters] AI clustering error:', error)
    
    // Fallback: simple grouping by first word
    const groups = new Map()
    for (const kw of keywords) {
      const firstWord = kw.keyword.split(' ')[0].toLowerCase()
      if (!groups.has(firstWord)) {
        groups.set(firstWord, [])
      }
      groups.get(firstWord).push({
        id: kw.id,
        keyword: kw.keyword,
        search_volume: kw.search_volume_monthly
      })
    }

    return Array.from(groups.entries())
      .filter(([_, kws]) => kws.length >= 3)
      .map(([name, kws]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        description: `Keywords related to ${name}`,
        primary_keyword: kws[0].keyword,
        keywords: kws,
        topics_covered: [],
        topics_missing: [],
        suggested_content: [],
        priority: 'medium'
      }))
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
