/**
 * SEO Keywords API - Public endpoint for main site
 * 
 * Provides keyword intelligence for content creation and optimization.
 * The main site can use this to:
 * - Display related keywords on blog posts
 * - Show search volume data
 * - Suggest content topics
 * 
 * Endpoints:
 * GET ?topic=web+design - Get keywords related to a topic
 * GET ?page=/design/web-design/ - Get keywords for a specific page
 * GET ?trending=true - Get trending/opportunity keywords
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { 
      topic, 
      page, 
      trending,
      intent,
      domain = 'uptrademedia.com', 
      limit = 20 
    } = event.queryStringParameters || {}

    // Find the site
    const { data: site, error: siteError } = await supabase
      .from('seo_sites')
      .select('id')
      .eq('domain', domain)
      .single()

    if (siteError || !site) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Site not found' })
      }
    }

    // Mode 1: Keywords for a topic
    if (topic) {
      const searchTopic = topic.toLowerCase()
      
      const { data: keywords } = await supabase
        .from('seo_keyword_universe')
        .select(`
          keyword,
          search_volume_monthly,
          keyword_difficulty,
          intent,
          current_position,
          opportunity_score,
          questions
        `)
        .eq('site_id', site.id)
        .order('search_volume_monthly', { ascending: false })
        .limit(200)

      // Filter by topic match
      const matches = (keywords || [])
        .filter(k => k.keyword.toLowerCase().includes(searchTopic))
        .slice(0, parseInt(limit))
        .map(k => ({
          keyword: k.keyword,
          volume: k.search_volume_monthly,
          difficulty: k.keyword_difficulty,
          intent: k.intent,
          position: k.current_position ? Math.round(k.current_position * 10) / 10 : null,
          opportunity: k.opportunity_score,
          questions: k.questions || []
        }))

      // Get related questions
      const allQuestions = matches.flatMap(k => k.questions).slice(0, 5)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          topic,
          keywords: matches,
          relatedQuestions: allQuestions,
          summary: {
            totalKeywords: matches.length,
            avgVolume: Math.round(matches.reduce((sum, k) => sum + (k.volume || 0), 0) / matches.length) || 0,
            avgDifficulty: Math.round(matches.reduce((sum, k) => sum + (k.difficulty || 0), 0) / matches.length) || 0
          }
        })
      }
    }

    // Mode 2: Keywords for a specific page
    if (page) {
      const { data: pageData } = await supabase
        .from('seo_pages')
        .select('id, target_keywords')
        .eq('site_id', site.id)
        .eq('path', page)
        .single()

      if (!pageData) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Page not found' })
        }
      }

      // Get queries ranking for this page
      const { data: queries } = await supabase
        .from('seo_queries')
        .select(`
          query,
          clicks_28d,
          impressions_28d,
          avg_position_28d,
          ctr_28d,
          is_striking_distance
        `)
        .eq('page_id', pageData.id)
        .order('clicks_28d', { ascending: false })
        .limit(parseInt(limit))

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          page,
          targetKeywords: pageData.target_keywords || [],
          rankingQueries: (queries || []).map(q => ({
            query: q.query,
            clicks: q.clicks_28d,
            impressions: q.impressions_28d,
            position: q.avg_position_28d ? Math.round(q.avg_position_28d * 10) / 10 : null,
            ctr: q.ctr_28d ? Math.round(q.ctr_28d * 1000) / 10 : null, // as percentage
            isStrikingDistance: q.is_striking_distance
          })),
          strikingDistance: (queries || [])
            .filter(q => q.is_striking_distance)
            .map(q => q.query)
        })
      }
    }

    // Mode 3: Trending/opportunity keywords
    if (trending === 'true') {
      const { data: opportunities } = await supabase
        .from('seo_keyword_universe')
        .select(`
          keyword,
          search_volume_monthly,
          keyword_difficulty,
          intent,
          current_position,
          opportunity_score,
          target_page_url
        `)
        .eq('site_id', site.id)
        .gte('opportunity_score', 60)
        .order('opportunity_score', { ascending: false })
        .limit(parseInt(limit))

      // Also get striking distance queries
      const { data: striking } = await supabase
        .from('seo_queries')
        .select(`
          query,
          clicks_28d,
          impressions_28d,
          avg_position_28d
        `)
        .eq('site_id', site.id)
        .eq('is_striking_distance', true)
        .order('impressions_28d', { ascending: false })
        .limit(10)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          opportunities: (opportunities || []).map(k => ({
            keyword: k.keyword,
            volume: k.search_volume_monthly,
            difficulty: k.keyword_difficulty,
            intent: k.intent,
            position: k.current_position ? Math.round(k.current_position * 10) / 10 : null,
            opportunityScore: k.opportunity_score,
            targetPage: k.target_page_url
          })),
          strikingDistance: (striking || []).map(q => ({
            query: q.query,
            impressions: q.impressions_28d,
            position: Math.round(q.avg_position_28d * 10) / 10,
            potentialClicks: Math.round(q.impressions_28d * 0.1) // Estimate 10% CTR if on page 1
          }))
        })
      }
    }

    // Mode 4: Keywords by intent
    if (intent) {
      const validIntents = ['informational', 'commercial', 'transactional', 'navigational']
      if (!validIntents.includes(intent)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Invalid intent. Must be one of: ${validIntents.join(', ')}` })
        }
      }

      const { data: keywords } = await supabase
        .from('seo_keyword_universe')
        .select(`
          keyword,
          search_volume_monthly,
          keyword_difficulty,
          current_position,
          opportunity_score,
          target_page_url
        `)
        .eq('site_id', site.id)
        .eq('intent', intent)
        .order('search_volume_monthly', { ascending: false })
        .limit(parseInt(limit))

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          intent,
          keywords: (keywords || []).map(k => ({
            keyword: k.keyword,
            volume: k.search_volume_monthly,
            difficulty: k.keyword_difficulty,
            position: k.current_position ? Math.round(k.current_position * 10) / 10 : null,
            opportunityScore: k.opportunity_score,
            targetPage: k.target_page_url
          }))
        })
      }
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Parameter required',
        usage: {
          topic: 'Get keywords related to a topic',
          page: 'Get keywords for a specific page path',
          trending: 'Set to "true" for opportunity keywords',
          intent: 'Filter by intent (informational, commercial, transactional, navigational)'
        }
      })
    }

  } catch (err) {
    console.error('[seo-keywords-api] Error:', err)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
