// netlify/functions/seo-backlinks.js
// Backlink Opportunity Identification
// Finds link building opportunities based on content, competitors, and industry
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { SEOSkill } from './skills/seo-skill.js'

// Use env variable for model - easily update when new models release
const SEO_AI_MODEL = process.env.SEO_AI_MODEL || 'gpt-4o'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  // GET - Fetch backlink opportunities
  if (event.httpMethod === 'GET') {
    return await getBacklinkOpportunities(event, headers)
  }

  // POST - Analyze/discover opportunities
  if (event.httpMethod === 'POST') {
    return await analyzeBacklinks(event, headers)
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
}

// Get existing backlink opportunities
async function getBacklinkOpportunities(event, headers) {
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const { siteId, status = 'all', type } = event.queryStringParameters || {}

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Build query
    let query = supabase
      .from('seo_backlink_opportunities')
      .select('*')
      .eq('site_id', siteId)
      .order('priority_score', { ascending: false })

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    if (type) {
      query = query.eq('opportunity_type', type)
    }

    const { data: opportunities, error } = await query.limit(100)

    if (error) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
    }

    // Get summary stats
    const allOpps = opportunities || []
    const summary = {
      total: allOpps.length,
      byType: {},
      byStatus: {},
      avgDifficulty: 0,
      avgPriority: 0
    }

    for (const opp of allOpps) {
      summary.byType[opp.opportunity_type] = (summary.byType[opp.opportunity_type] || 0) + 1
      summary.byStatus[opp.status] = (summary.byStatus[opp.status] || 0) + 1
      summary.avgDifficulty += opp.difficulty_score || 5
      summary.avgPriority += opp.priority_score || 5
    }

    if (allOpps.length > 0) {
      summary.avgDifficulty = Math.round(summary.avgDifficulty / allOpps.length)
      summary.avgPriority = Math.round(summary.avgPriority / allOpps.length)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        opportunities: opportunities || [],
        summary
      })
    }

  } catch (error) {
    console.error('[Backlinks] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}

// Analyze and discover backlink opportunities
async function analyzeBacklinks(event, headers) {
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { siteId, analysisType = 'comprehensive' } = body

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Get site knowledge
    const { data: site } = await supabase
      .from('seo_sites')
      .select('*, org:organizations(name, domain)')
      .eq('id', siteId)
      .single()

    if (!site) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Site not found' }) }
    }

    const { data: knowledge } = await supabase
      .from('seo_knowledge_base')
      .select('*')
      .eq('site_id', siteId)
      .single()

    // Get top performing content
    const { data: topContent } = await supabase
      .from('seo_pages')
      .select('url, title, page_type, clicks_28d, impressions_28d')
      .eq('site_id', siteId)
      .order('clicks_28d', { ascending: false })
      .limit(20)

    // Get competitor data
    const { data: competitors } = await supabase
      .from('seo_competitor_analysis')
      .select('*')
      .eq('site_id', siteId)
      .limit(5)

    // Discover opportunities using SEOSkill
    const seoSkill = new SEOSkill(supabase, site?.org?.id, siteId, {})
    const opportunities = await discoverOpportunities(seoSkill, {
      site,
      knowledge,
      topContent: topContent || [],
      competitors: competitors || []
    })

    // Save opportunities to database
    const opportunitiesToInsert = opportunities.map(opp => ({
      site_id: siteId,
      opportunity_type: opp.type,
      target_domain: opp.targetDomain,
      target_url: opp.targetUrl,
      target_page_title: opp.targetPageTitle,
      link_type: opp.linkType,
      suggested_anchor: opp.suggestedAnchor,
      target_page: opp.targetPage,
      outreach_template: opp.outreachTemplate,
      priority_score: opp.priorityScore,
      difficulty_score: opp.difficultyScore,
      estimated_da: opp.estimatedDA,
      reason: opp.reason,
      status: 'discovered',
      discovered_at: new Date().toISOString()
    }))

    // Insert new opportunities (avoid duplicates)
    for (const opp of opportunitiesToInsert) {
      await supabase
        .from('seo_backlink_opportunities')
        .upsert(opp, {
          onConflict: 'site_id,target_domain,target_url',
          ignoreDuplicates: true
        })
    }

    // Save analysis run
    await supabase
      .from('seo_ai_analysis_runs')
      .insert({
        site_id: siteId,
        run_type: 'backlink_opportunities',
        status: 'completed',
        results: {
          opportunitiesFound: opportunities.length,
          byType: opportunities.reduce((acc, o) => {
            acc[o.type] = (acc[o.type] || 0) + 1
            return acc
          }, {})
        },
        ai_model: SEO_AI_MODEL,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        opportunitiesFound: opportunities.length,
        opportunities,
        summary: {
          byType: opportunities.reduce((acc, o) => {
            acc[o.type] = (acc[o.type] || 0) + 1
            return acc
          }, {}),
          avgDifficulty: Math.round(opportunities.reduce((sum, o) => sum + o.difficultyScore, 0) / opportunities.length),
          avgPriority: Math.round(opportunities.reduce((sum, o) => sum + o.priorityScore, 0) / opportunities.length)
        }
      })
    }

  } catch (error) {
    console.error('[Backlinks] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}

// AI-powered opportunity discovery via SEOSkill
async function discoverOpportunities(seoSkill, context) {
  const { site, knowledge, topContent, competitors } = context

  try {
    const result = await seoSkill.discoverBacklinkOpportunities({
      domain: site.domain,
      business: {
        name: knowledge?.business_name || site.org?.name,
        type: knowledge?.business_type,
        industry: knowledge?.industry,
        services: knowledge?.primary_services
      },
      isLocal: knowledge?.is_local_business,
      location: knowledge?.primary_location,
      serviceAreas: knowledge?.service_areas,
      topContent: topContent.slice(0, 10),
      competitors: competitors.map(c => c.competitor_domain),
      keywords: knowledge?.target_keywords
    })

    return result.opportunities || []
  } catch (error) {
    console.error('[Backlinks] AI discovery error:', error)
    return []
  }
}
