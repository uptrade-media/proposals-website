// netlify/functions/seo-serp-analyze.js
// SERP Feature Analysis - Track featured snippets, PAA, local pack, etc.
// Identifies opportunities for SERP feature capture
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { google } from 'googleapis'
import OpenAI from 'openai'

// Use env variable for model - easily update when new models release
const SEO_AI_MODEL = process.env.SEO_AI_MODEL || 'gpt-4o'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  // GET - Fetch SERP feature opportunities
  if (event.httpMethod === 'GET') {
    return await getSerpOpportunities(event, headers)
  }

  // POST - Analyze keywords for SERP features
  if (event.httpMethod === 'POST') {
    return await analyzeSerpFeatures(event, headers)
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
}

// Get SERP feature opportunities
async function getSerpOpportunities(event, headers) {
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const { siteId, featureType } = event.queryStringParameters || {}

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Fetch keywords with SERP feature opportunities
    let query = supabase
      .from('seo_keyword_universe')
      .select('*')
      .eq('site_id', siteId)
      .not('serp_features', 'is', null)
      .order('opportunity_score', { ascending: false })
      .limit(100)

    const { data: keywords, error } = await query

    if (error) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
    }

    // Group by SERP feature type
    const byFeature = {
      featured_snippet: [],
      people_also_ask: [],
      local_pack: [],
      knowledge_panel: [],
      video_carousel: [],
      image_pack: [],
      shopping: [],
      top_stories: [],
      other: []
    }

    keywords.forEach(kw => {
      const features = kw.serp_features || []
      features.forEach(feature => {
        const bucket = byFeature[feature] || byFeature.other
        if (!bucket.find(k => k.id === kw.id)) {
          bucket.push(kw)
        }
      })
    })

    // Calculate opportunities
    const opportunities = []
    
    // Featured snippet opportunities (position 2-10 with featured snippet in SERP)
    keywords.filter(k => 
      k.current_position >= 2 && 
      k.current_position <= 10 && 
      (k.serp_features || []).includes('featured_snippet')
    ).forEach(kw => {
      opportunities.push({
        keyword: kw.keyword,
        currentPosition: kw.current_position,
        featureType: 'featured_snippet',
        opportunity: 'Can potentially capture featured snippet with content optimization',
        priority: kw.current_position <= 5 ? 'high' : 'medium',
        estimatedTrafficGain: Math.round(kw.impressions_28d * 0.25) // Featured snippets get ~25% of clicks
      })
    })

    // People Also Ask opportunities
    keywords.filter(k => 
      k.current_position <= 20 &&
      (k.serp_features || []).includes('people_also_ask') &&
      k.is_question
    ).forEach(kw => {
      opportunities.push({
        keyword: kw.keyword,
        currentPosition: kw.current_position,
        featureType: 'people_also_ask',
        opportunity: 'Can target People Also Ask box with FAQ content',
        priority: 'medium',
        estimatedTrafficGain: Math.round(kw.impressions_28d * 0.1)
      })
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        byFeature,
        opportunities: opportunities.sort((a, b) => b.estimatedTrafficGain - a.estimatedTrafficGain),
        summary: {
          totalKeywordsWithFeatures: keywords.length,
          featuredSnippetOpportunities: byFeature.featured_snippet.length,
          paaOpportunities: byFeature.people_also_ask.length,
          localPackOpportunities: byFeature.local_pack.length
        }
      })
    }

  } catch (error) {
    console.error('[SERP Analyze] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}

// Analyze SERP features for keywords
async function analyzeSerpFeatures(event, headers) {
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { siteId, keywords = [] } = body

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
    }

    const supabase = createSupabaseAdmin()
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // Get site knowledge for context
    const { data: knowledge } = await supabase
      .from('seo_knowledge_base')
      .select('*')
      .eq('site_id', siteId)
      .single()

    // Analyze each keyword for SERP feature opportunities
    const results = []

    for (const keyword of keywords.slice(0, 20)) {
      const prompt = `Analyze this keyword for SERP feature optimization opportunities.

KEYWORD: "${keyword}"

BUSINESS CONTEXT:
- Industry: ${knowledge?.industry || 'Unknown'}
- Services: ${knowledge?.primary_services?.map(s => s.name).join(', ') || 'Unknown'}
- Is Local Business: ${knowledge?.is_local_business || false}

For this keyword, identify:
1. Which SERP features are likely present (featured_snippet, people_also_ask, local_pack, video_carousel, image_pack, knowledge_panel)
2. The best content type to target each feature
3. Specific optimization recommendations

Return as JSON:
{
  "keyword": "the keyword",
  "likely_serp_features": ["featured_snippet", "people_also_ask"],
  "search_intent": "informational|transactional|navigational|commercial",
  "is_question": true/false,
  "featured_snippet_opportunity": {
    "possible": true/false,
    "snippet_type": "paragraph|list|table|video",
    "optimization_tips": ["tip 1", "tip 2"]
  },
  "paa_opportunity": {
    "possible": true/false,
    "related_questions": ["question 1", "question 2"],
    "optimization_tips": ["tip 1"]
  },
  "local_pack_opportunity": {
    "possible": true/false,
    "optimization_tips": ["tip 1"]
  },
  "content_recommendations": [
    {
      "type": "Add FAQ section",
      "reason": "Why this helps",
      "priority": "high|medium|low"
    }
  ]
}`

      try {
        const completion = await openai.chat.completions.create({
          model: SEO_AI_MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are an expert in SERP feature optimization. Analyze keywords and provide specific, actionable recommendations for capturing featured snippets, PAA boxes, and other SERP features.'
            },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3
        })

        const analysis = JSON.parse(completion.choices[0].message.content)
        results.push(analysis)

        // Update keyword in database with SERP features
        await supabase
          .from('seo_keyword_universe')
          .update({
            serp_features: analysis.likely_serp_features,
            intent: analysis.search_intent,
            is_question: analysis.is_question,
            updated_at: new Date().toISOString()
          })
          .eq('site_id', siteId)
          .eq('keyword', keyword)

      } catch (e) {
        console.error(`[SERP Analyze] Error analyzing ${keyword}:`, e)
        results.push({ keyword, error: e.message })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        analyzed: results.length,
        results
      })
    }

  } catch (error) {
    console.error('[SERP Analyze] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}
