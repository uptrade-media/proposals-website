// netlify/functions/seo-predictive-ranking.js
// Predictive Ranking - Score content before publishing, predict rank improvements
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { SEOSkill } from './skills/seo-skill.js'

// Ranking factor weights (based on industry research)
const RANKING_FACTORS = {
  contentQuality: 0.25,
  keywordRelevance: 0.15,
  backlinks: 0.20,
  technicalSeo: 0.10,
  userExperience: 0.10,
  contentFreshness: 0.05,
  internalLinks: 0.08,
  domainAuthority: 0.07
}

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

  // GET - Get predictive scores
  if (event.httpMethod === 'GET') {
    return await getPredictions(event, supabase, headers)
  }

  // POST - Generate prediction for page/content
  if (event.httpMethod === 'POST') {
    return await generatePrediction(event, supabase, headers)
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
}

async function getPredictions(event, supabase, headers) {
  const { siteId, pageId } = event.queryStringParameters || {}

  if (!siteId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
  }

  let query = supabase
    .from('seo_predictive_scores')
    .select('*, page:seo_pages(id, url, title, avg_position_28d)')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (pageId) {
    query = query.eq('page_id', pageId)
  }

  const { data, error } = await query

  if (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ predictions: data })
  }
}

async function generatePrediction(event, supabase, headers) {
  const body = JSON.parse(event.body || '{}')
  const { 
    siteId, 
    pageId, 
    targetKeyword,
    // For draft content
    draftContent,
    draftTitle,
    draftUrl
  } = body

  if (!siteId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
  }

  if (!pageId && !draftContent) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'pageId or draftContent required' }) }
  }

  console.log(`[Predictive] Generating prediction for site ${siteId}`)

  // Get site data with org_id
  const { data: site } = await supabase
    .from('seo_sites')
    .select('domain, org_id, org:organizations(name)')
    .eq('id', siteId)
    .single()

  const orgId = site?.org_id || 'uptrade'

  // Get site knowledge
  const { data: knowledge } = await supabase
    .from('seo_knowledge_base')
    .select('*')
    .eq('site_id', siteId)
    .single()

  // Get page data if existing page
  let page = null
  let content = draftContent
  let title = draftTitle
  let url = draftUrl

  if (pageId) {
    const { data: pageData } = await supabase
      .from('seo_pages')
      .select('*')
      .eq('id', pageId)
      .single()

    if (pageData) {
      page = pageData
      title = page.title
      url = page.url
      content = page.content_text || page.content_summary
    }
  }

  // Get keyword data
  let keyword = targetKeyword
  let keywordData = null

  if (keyword) {
    const { data: kwData } = await supabase
      .from('seo_keyword_universe')
      .select('*')
      .eq('site_id', siteId)
      .ilike('keyword', keyword)
      .single()

    keywordData = kwData
  }

  // Get competitor data for this keyword
  const { data: competitors } = await supabase
    .from('seo_competitor_analysis')
    .select('competitor_domain, keyword_gap_data')
    .eq('site_id', siteId)
    .eq('is_active', true)
    .limit(5)

  // Initialize SEO Skill
  const seoSkill = new SEOSkill(supabase, orgId, siteId)

  // Calculate current scores
  const scores = await calculateRankingScores({
    page,
    content,
    title,
    url,
    keyword,
    keywordData,
    knowledge,
    site,
    competitors
  })

  // Generate predictions with AI via SEOSkill
  const predictions = await generateAIPredictions(seoSkill, scores, {
    domain: site?.domain,
    page,
    content,
    title,
    keyword,
    currentPosition: page?.avg_position_28d,
    competitors
  })

  // Calculate overall predicted position
  const overallScore = Object.entries(scores).reduce((total, [key, value]) => {
    return total + (value * (RANKING_FACTORS[key] || 0))
  }, 0)

  // Map score to position (rough estimate)
  // Score 90+ = top 3, 80-90 = top 5, 70-80 = top 10, etc.
  const predictedPosition = scoreToPosition(overallScore)
  const currentPosition = page?.avg_position_28d || 100

  // Estimate traffic
  const estimatedCtr = positionToCtr(predictedPosition)
  const searchVolume = keywordData?.search_volume_monthly || 500
  const predictedTraffic = Math.round(searchVolume * estimatedCtr)

  // Save prediction
  const prediction = {
    site_id: siteId,
    page_id: pageId || null,
    url: url,
    target_keyword: keyword,
    current_position: currentPosition,
    current_content_score: scores.contentQuality,
    current_technical_score: scores.technicalSeo,
    current_authority_score: scores.domainAuthority,
    predicted_position: predictedPosition,
    predicted_traffic: predictedTraffic,
    prediction_confidence: predictions.confidence,
    improvement_factors: predictions.improvementFactors,
    if_add_words: predictions.ifAddWords,
    if_add_internal_links: predictions.ifAddLinks,
    if_improve_speed: predictions.ifImproveSpeed,
    if_add_backlinks: predictions.ifAddBacklinks,
    if_update_title: predictions.ifUpdateTitle,
    model_version: 'v1',
    model_inputs: scores,
    is_draft: !pageId
  }

  const { data: saved, error } = await supabase
    .from('seo_predictive_scores')
    .upsert(prediction, { onConflict: 'page_id' })
    .select()
    .single()

  if (error) {
    console.error('[Predictive] Save error:', error)
  }

  // Update page with predictive score
  if (pageId) {
    await supabase
      .from('seo_pages')
      .update({ predictive_score: Math.round(overallScore) })
      .eq('id', pageId)
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      prediction: {
        currentPosition,
        predictedPosition,
        predictedTraffic,
        overallScore: Math.round(overallScore),
        confidence: predictions.confidence,
        scores,
        improvements: predictions.improvementFactors?.slice(0, 5),
        quickWins: predictions.improvementFactors
          ?.filter(f => f.effort === 'quick')
          .slice(0, 3)
      }
    })
  }
}

async function calculateRankingScores({ page, content, title, url, keyword, keywordData, knowledge, site, competitors }) {
  const scores = {
    contentQuality: 50,
    keywordRelevance: 50,
    backlinks: 30,
    technicalSeo: 70,
    userExperience: 60,
    contentFreshness: 50,
    internalLinks: 40,
    domainAuthority: 50
  }

  // Content Quality
  if (content) {
    const wordCount = content.split(/\s+/).length
    if (wordCount >= 2000) scores.contentQuality = 85
    else if (wordCount >= 1500) scores.contentQuality = 75
    else if (wordCount >= 1000) scores.contentQuality = 65
    else if (wordCount >= 500) scores.contentQuality = 50
    else scores.contentQuality = 35
  }

  // Keyword Relevance
  if (keyword && content) {
    const keywordLower = keyword.toLowerCase()
    const contentLower = content.toLowerCase()
    const titleLower = (title || '').toLowerCase()

    const inTitle = titleLower.includes(keywordLower)
    const inContent = contentLower.includes(keywordLower)
    const density = (contentLower.match(new RegExp(keywordLower, 'g')) || []).length / (content.split(/\s+/).length / 100)

    scores.keywordRelevance = 30
    if (inTitle) scores.keywordRelevance += 25
    if (inContent) scores.keywordRelevance += 20
    if (density >= 0.5 && density <= 2.5) scores.keywordRelevance += 25
  }

  // Backlinks (estimate from existing page data)
  if (page?.backlink_count) {
    if (page.backlink_count >= 50) scores.backlinks = 90
    else if (page.backlink_count >= 20) scores.backlinks = 70
    else if (page.backlink_count >= 10) scores.backlinks = 55
    else if (page.backlink_count >= 5) scores.backlinks = 40
  }

  // Technical SEO
  if (page) {
    let techScore = 60
    if (page.has_h1) techScore += 10
    if (page.has_meta_description) techScore += 10
    if (page.has_schema) techScore += 10
    if (page.is_mobile_friendly !== false) techScore += 10
    scores.technicalSeo = Math.min(100, techScore)
  }

  // Content Freshness
  if (page?.last_modified_at) {
    const daysSinceUpdate = (Date.now() - new Date(page.last_modified_at).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceUpdate <= 30) scores.contentFreshness = 90
    else if (daysSinceUpdate <= 90) scores.contentFreshness = 75
    else if (daysSinceUpdate <= 180) scores.contentFreshness = 60
    else if (daysSinceUpdate <= 365) scores.contentFreshness = 45
    else scores.contentFreshness = 30
  }

  // Internal Links
  if (page?.internal_links_in) {
    if (page.internal_links_in >= 20) scores.internalLinks = 90
    else if (page.internal_links_in >= 10) scores.internalLinks = 70
    else if (page.internal_links_in >= 5) scores.internalLinks = 55
  }

  // Domain Authority (from site-level data)
  if (knowledge?.market_position === 'leader') scores.domainAuthority = 80
  else if (knowledge?.market_position === 'challenger') scores.domainAuthority = 60

  return scores
}

async function generateAIPredictions(seoSkill, scores, context) {
  try {
    // Use SEOSkill predictRankings method
    const result = await seoSkill.predictRankings({
      domain: context.domain,
      keyword: context.keyword,
      page: context.page ? { url: context.page.url } : null,
      currentPosition: context.currentPosition,
      changes: Object.entries(scores).map(([factor, score]) => ({
        type: factor,
        description: `Current score: ${score}/100`
      })),
      competitors: context.competitors?.map(c => ({
        domain: c.competitor_domain,
        position: 'unknown'
      }))
    })

    // Map SEOSkill response to expected format
    const prediction = result.prediction || result
    return {
      confidence: prediction.confidenceLevel || 0.7,
      improvementFactors: (prediction.keyFactors || []).map(factor => ({
        factor: factor,
        impact_score: 10,
        effort: 'medium',
        predicted_position_change: -2
      })),
      ifAddWords: {
        words_to_add: 500,
        predicted_position: prediction.predictedPosition || context.currentPosition,
        predicted_traffic_increase: 100
      },
      ifAddLinks: {
        links_to_add: 5,
        predicted_position: prediction.predictedPosition || context.currentPosition
      },
      ifImproveSpeed: {
        lcp_target_ms: 2000,
        predicted_position: prediction.predictedPosition || context.currentPosition
      },
      ifAddBacklinks: {
        links_needed: 10,
        predicted_position: Math.max(1, (prediction.predictedPosition || 10) - 3)
      },
      ifUpdateTitle: {
        suggested_title: context.title,
        predicted_ctr_increase: 0.02
      }
    }
  } catch (error) {
    console.error('[Predictive] AI error:', error)
    return {
      confidence: 0.5,
      improvementFactors: []
    }
  }
}

function scoreToPosition(score) {
  // Map overall score (0-100) to estimated position
  if (score >= 90) return 2
  if (score >= 85) return 4
  if (score >= 80) return 6
  if (score >= 75) return 9
  if (score >= 70) return 12
  if (score >= 65) return 18
  if (score >= 60) return 25
  if (score >= 50) return 40
  return 60
}

function positionToCtr(position) {
  // Average CTR by position
  const ctrMap = {
    1: 0.316, 2: 0.158, 3: 0.107, 4: 0.076, 5: 0.058,
    6: 0.045, 7: 0.036, 8: 0.030, 9: 0.025, 10: 0.022
  }
  return ctrMap[Math.round(position)] || 0.01
}
