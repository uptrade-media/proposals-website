// netlify/functions/seo-local-analyze.js
// Local SEO Analysis - GBP optimization, local citations, NAP consistency
// Comprehensive local search optimization
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
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

  // GET - Fetch local SEO status
  if (event.httpMethod === 'GET') {
    return await getLocalSeoStatus(event, headers)
  }

  // POST - Run local SEO analysis
  if (event.httpMethod === 'POST') {
    return await analyzeLocalSeo(event, headers)
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
}

// Get local SEO status
async function getLocalSeoStatus(event, headers) {
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

    // Get site knowledge for local data
    const { data: knowledge } = await supabase
      .from('seo_knowledge_base')
      .select('*')
      .eq('site_id', siteId)
      .single()

    // Get local-focused recommendations
    const { data: recommendations } = await supabase
      .from('seo_ai_recommendations')
      .select('*')
      .eq('site_id', siteId)
      .eq('category', 'local')
      .eq('status', 'pending')
      .order('priority', { ascending: true })

    // Get location pages
    const { data: locationPages } = await supabase
      .from('seo_pages')
      .select('*')
      .eq('site_id', siteId)
      .or('url.ilike.%location%,url.ilike.%service-area%,url.ilike.%near-me%')
      .limit(50)

    // Get local keywords
    const { data: localKeywords } = await supabase
      .from('seo_keyword_universe')
      .select('*')
      .eq('site_id', siteId)
      .eq('is_local', true)
      .order('impressions_28d', { ascending: false })
      .limit(50)

    // Calculate local SEO score
    let localScore = 0
    const scoreBreakdown = {
      hasLocalBusiness: knowledge?.is_local_business ? 10 : 0,
      hasPrimaryLocation: knowledge?.primary_location ? 10 : 0,
      hasServiceAreas: (knowledge?.service_areas?.length || 0) > 0 ? 10 : 0,
      hasLocalPages: locationPages?.length > 0 ? 15 : 0,
      localPageCoverage: Math.min((locationPages?.length || 0) / Math.max(knowledge?.service_areas?.length || 1, 1) * 15, 15),
      localKeywordRankings: localKeywords?.filter(k => k.current_position <= 10).length > 0 ? 20 : 
                            localKeywords?.filter(k => k.current_position <= 20).length > 0 ? 10 : 0,
      noOpenIssues: (recommendations?.length || 0) === 0 ? 20 : Math.max(0, 20 - recommendations.length * 2)
    }

    Object.values(scoreBreakdown).forEach(v => localScore += v)

    // Identify missing location pages
    const serviceAreas = knowledge?.service_areas || []
    const existingLocationPageUrls = (locationPages || []).map(p => p.url.toLowerCase())
    const missingLocationPages = serviceAreas.filter(area => {
      const areaSlug = area.name?.toLowerCase().replace(/\s+/g, '-')
      return !existingLocationPageUrls.some(url => url.includes(areaSlug))
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        isLocalBusiness: knowledge?.is_local_business || false,
        primaryLocation: knowledge?.primary_location,
        serviceAreas,
        localScore,
        scoreBreakdown,
        locationPages: locationPages || [],
        localKeywords: localKeywords || [],
        missingLocationPages,
        pendingRecommendations: recommendations || [],
        summary: {
          totalServiceAreas: serviceAreas.length,
          coveredByPages: serviceAreas.length - missingLocationPages.length,
          missingPages: missingLocationPages.length,
          localKeywordsTracked: localKeywords?.length || 0,
          localKeywordsTop10: localKeywords?.filter(k => k.current_position <= 10).length || 0
        }
      })
    }

  } catch (error) {
    console.error('[Local SEO] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}

// Analyze local SEO and generate recommendations
async function analyzeLocalSeo(event, headers) {
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { siteId, includeCompetitorAnalysis = false } = body

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Get site and org_id
    const { data: site } = await supabase
      .from('seo_sites')
      .select('org_id, domain')
      .eq('id', siteId)
      .single()

    const orgId = site?.org_id || 'uptrade'

    // Get all relevant data
    const [knowledgeResult, pagesResult, keywordsResult] = await Promise.all([
      supabase.from('seo_knowledge_base').select('*').eq('site_id', siteId).single(),
      supabase.from('seo_pages').select('*').eq('site_id', siteId).limit(100),
      supabase.from('seo_keyword_universe').select('*').eq('site_id', siteId).eq('is_local', true).limit(100)
    ])

    const knowledge = knowledgeResult.data
    const pages = pagesResult.data || []
    const localKeywords = keywordsResult.data || []

    if (!knowledge?.is_local_business) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Site is not marked as a local business. Update site knowledge to enable local SEO analysis.',
          recommendations: []
        })
      }
    }

    // Initialize SEO Skill
    const seoSkill = new SEOSkill(supabase, orgId, siteId, { userId: contact.id })

    // Build context for AI analysis
    const analysisContext = {
      businessName: knowledge.business_name,
      industry: knowledge.industry,
      location: knowledge.primary_location,
      serviceAreas: knowledge.service_areas || [],
      gbpData: {
        serviceRadius: knowledge.service_radius_miles,
        currentState: {
          totalPages: pages.length,
          locationPages: pages.filter(p => 
            p.url.includes('location') || 
            p.url.includes('service-area') ||
            p.url.includes('near')
          ).length,
          localKeywords: localKeywords.length,
          localKeywordsRanking: localKeywords.filter(k => k.current_position <= 20).length
        },
        topLocalKeywords: localKeywords.slice(0, 20).map(k => ({
          keyword: k.keyword,
          position: k.current_position,
          impressions: k.impressions_28d
        }))
      }
    }

    // AI Analysis via SEOSkill
    const analysis = await seoSkill.analyzeLocalSEO(analysisContext)

    // Store recommendations in database (SEOSkill returns recommendations[] format)
    const recommendations = analysis.recommendations || []
    const recommendationsToInsert = recommendations.map(rec => ({
      site_id: siteId,
      category: 'local',
      subcategory: rec.category || 'general',
      priority: rec.priority || 'medium',
      title: rec.issue || rec.title || 'Local SEO recommendation',
      description: rec.fix || rec.description || '',
      effort: rec.effort || 'medium',
      auto_fixable: false,
      one_click_fixable: rec.category === 'schema',
      status: 'pending',
      ai_model: 'seo-skill',
      created_at: new Date().toISOString()
    }))

    if (recommendationsToInsert.length > 0) {
      await supabase
        .from('seo_ai_recommendations')
        .insert(recommendationsToInsert)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        analysis,
        recommendationsCreated: recommendationsToInsert.length
      })
    }

  } catch (error) {
    console.error('[Local SEO] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}
