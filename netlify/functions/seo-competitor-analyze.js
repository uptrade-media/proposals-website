// netlify/functions/seo-competitor-analyze.js
// Analyze competitors for SEO comparison
// Compares keyword overlap, content gaps, and rankings
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { google } from 'googleapis'
import { SEOSkill } from './skills/seo-skill.js'

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

  // GET - Fetch competitor analysis data
  if (event.httpMethod === 'GET') {
    return await getCompetitorData(event, headers)
  }

  // POST - Add competitor or run analysis
  if (event.httpMethod === 'POST') {
    return await analyzeCompetitor(event, headers)
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
}

// Get competitor data
async function getCompetitorData(event, headers) {
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const { siteId } = event.queryStringParameters || {}

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
    }

    const supabase = createSupabaseAdmin()

    const { data: competitors, error } = await supabase
      .from('seo_competitor_analysis')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })

    if (error) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ competitors })
    }

  } catch (error) {
    console.error('[Competitor] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}

// Analyze competitor
async function analyzeCompetitor(event, headers) {
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { 
      siteId, 
      competitorDomain,
      refreshExisting = false
    } = body

    if (!siteId || !competitorDomain) {
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ error: 'siteId and competitorDomain required' }) 
      }
    }

    const supabase = createSupabaseAdmin()

    // Fetch site details
    const { data: site, error: siteError } = await supabase
      .from('seo_sites')
      .select('*, org_id, org:organizations(domain)')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Site not found' }) }
    }

    // Initialize SEOSkill for AI operations
    const seoSkill = new SEOSkill(supabase, site.org_id, siteId, { userId: contact.id })

    const ourDomain = site.org?.domain || site.domain

    // Fetch site knowledge for context
    const { data: knowledge } = await supabase
      .from('seo_knowledge_base')
      .select('*')
      .eq('site_id', siteId)
      .single()

    // Initialize GSC for our domain
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}'),
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
    })
    const searchConsole = google.searchconsole({ version: 'v1', auth })
    const siteUrl = `sc-domain:${ourDomain.replace(/^(https?:\/\/)?(www\.)?/, '')}`

    // Get our top keywords
    const today = new Date()
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() - 3)
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - 28)

    let ourKeywords = []
    try {
      const response = await searchConsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          dimensions: ['query'],
          rowLimit: 100
        }
      })
      ourKeywords = (response.data.rows || []).map(r => ({
        keyword: r.keys[0],
        position: r.position,
        clicks: r.clicks,
        impressions: r.impressions
      }))
    } catch (e) {
      console.error('[Competitor] GSC error:', e)
    }

    // Use SEOSkill to analyze the competitor
    const analysis = await seoSkill.analyzeCompetitorSync(competitorDomain, {
      ourKeywords,
      knowledge,
      ourDomain
    })

    // Store competitor data
    const competitorData = {
      site_id: siteId,
      domain: competitorDomain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, ''),
      name: analysis.competitor_name || competitorDomain,
      positioning: analysis.competitor_positioning,
      threat_level: analysis.threat_level || 'medium',
      overlap_assessment: analysis.overlap_assessment,
      keyword_opportunities: analysis.keyword_opportunities || [],
      content_gaps: analysis.content_gaps || [],
      differentiation_strategies: analysis.differentiation_strategies || [],
      quick_wins: analysis.quick_wins || [],
      our_keywords_analyzed: ourKeywords.length,
      last_analyzed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Check if competitor already exists
    const { data: existing } = await supabase
      .from('seo_competitor_analysis')
      .select('id')
      .eq('site_id', siteId)
      .eq('domain', competitorData.domain)
      .single()

    if (existing) {
      await supabase
        .from('seo_competitor_analysis')
        .update(competitorData)
        .eq('id', existing.id)
    } else {
      competitorData.created_at = new Date().toISOString()
      await supabase
        .from('seo_competitor_analysis')
        .insert(competitorData)
    }

    // Create AI recommendations for keyword opportunities
    for (const opp of (analysis.keyword_opportunities || []).slice(0, 5)) {
      if (opp.priority === 'high') {
        await supabase
          .from('seo_ai_recommendations')
          .insert({
            site_id: siteId,
            category: 'keyword',
            title: `Target keyword: "${opp.keyword}"`,
            description: opp.rationale,
            impact: opp.difficulty === 'easy' ? 'high' : 'medium',
            effort: opp.difficulty,
            auto_fixable: false,
            suggested_value: opp.keyword,
            source: 'competitor_analysis',
            status: 'pending',
            created_at: new Date().toISOString()
          })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        competitor: competitorData,
        analysis
      })
    }

  } catch (error) {
    console.error('[Competitor] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}
