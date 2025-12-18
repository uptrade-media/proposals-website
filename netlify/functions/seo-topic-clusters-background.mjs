/**
 * SEO Topic Clusters Background Function
 * 
 * Generates topic clusters from keywords using AI.
 * Background functions can run up to 15 minutes.
 * 
 * Triggered by POST from seo-topic-clusters.js
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req) {
  console.log('[seo-topic-clusters-background] Starting...')

  try {
    const { siteId, minKeywords = 3, includeQuestions = true, jobId } = await req.json()

    if (!siteId) {
      return new Response(JSON.stringify({ error: 'siteId required' }), { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // Update job status if jobId provided
    if (jobId) {
      await supabase
        .from('seo_background_jobs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', jobId)
    }

    console.log(`[seo-topic-clusters-background] Generating clusters for site ${siteId}`)

    // Get all keywords for this site
    const { data: keywords, error: kwError } = await supabase
      .from('seo_keyword_universe')
      .select('id, keyword, search_volume_monthly, intent, topic_cluster, target_page_url, current_position, is_question')
      .eq('site_id', siteId)
      .order('search_volume_monthly', { ascending: false, nullsFirst: false })
      .limit(500)

    if (kwError) {
      throw new Error(`Failed to fetch keywords: ${kwError.message}`)
    }

    if (!keywords || keywords.length < 5) {
      throw new Error('Not enough keywords to cluster. Need at least 5.')
    }

    console.log(`[seo-topic-clusters-background] Found ${keywords.length} keywords`)

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
    console.log('[seo-topic-clusters-background] Running AI clustering...')
    const clusters = await clusterKeywordsWithAI(openai, keywords, knowledge, pages)

    console.log(`[seo-topic-clusters-background] AI identified ${clusters.length} clusters`)

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

    const result = {
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
    }

    console.log('[seo-topic-clusters-background] Complete')

    // Update job status
    if (jobId) {
      await supabase
        .from('seo_background_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          result
        })
        .eq('id', jobId)
    }

    return new Response(JSON.stringify(result), { status: 200 })

  } catch (error) {
    console.error('[seo-topic-clusters-background] Error:', error)

    try {
      const { jobId } = await req.json().catch(() => ({}))
      if (jobId) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        await supabase
          .from('seo_background_jobs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error: error.message
          })
          .eq('id', jobId)
      }
    } catch (e) {
      // Ignore
    }

    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}

async function clusterKeywordsWithAI(openai, keywords, knowledge, pages) {
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
    console.error('[seo-topic-clusters-background] AI clustering error:', error)
    
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

    // Convert to clusters
    const clusters = []
    for (const [word, kws] of groups) {
      if (kws.length >= 3) {
        clusters.push({
          name: word.charAt(0).toUpperCase() + word.slice(1),
          description: `Keywords related to ${word}`,
          primary_keyword: kws[0].keyword,
          keywords: kws,
          topics_covered: [],
          topics_missing: [],
          suggested_content: [],
          priority: 'medium'
        })
      }
    }
    
    return clusters
  }
}
