// netlify/functions/seo-ai-analyze.js
// AI-powered SEO analysis and recommendations via Signal SEO Skill
// Analyzes GSC data + page content and generates actionable fixes
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { googleApiRequest } from './utils/google-auth.js'
import { SEOSkill } from './skills/seo-skill.js'

const GSC_API_BASE = 'https://searchconsole.googleapis.com/webmasters/v3'

// Analysis types
const ANALYSIS_TYPES = {
  TITLE_META: 'title_meta',
  LOW_CTR: 'low_ctr', 
  STRIKING_DISTANCE: 'striking_distance',
  THIN_CONTENT: 'thin_content',
  CANNIBALIZATION: 'cannibalization',
  FULL_AUDIT: 'full_audit'
}

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { 
      siteId,
      pageId,
      domain,
      analysisType = ANALYSIS_TYPES.FULL_AUDIT,
      targetKeywords = []
    } = body

    if (!domain && !siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'domain or siteId is required' }) }
    }

    const supabase = createSupabaseAdmin()
    
    // Get site info
    let site = null
    if (siteId) {
      const { data } = await supabase.from('seo_sites').select('*').eq('id', siteId).single()
      site = data
    }
    
    const siteDomain = domain || site?.domain
    const siteUrl = `sc-domain:${siteDomain.replace(/^(https?:\/\/)?(www\.)?/, '')}`
    
    // Fetch GSC data
    const gscData = await fetchGSCData(siteUrl, pageId)
    
    // Get page data if pageId provided
    let page = null
    if (pageId) {
      const { data } = await supabase.from('seo_pages').select('*').eq('id', pageId).single()
      page = data
    }
    
    // Get all pages for cannibalization detection
    let allPages = []
    if (siteId && (analysisType === ANALYSIS_TYPES.CANNIBALIZATION || analysisType === ANALYSIS_TYPES.FULL_AUDIT)) {
      const { data } = await supabase.from('seo_pages').select('*').eq('site_id', siteId)
      allPages = data || []
    }

    // Get org_id from site
    const orgId = site?.org_id || 'uptrade'
    
    // Initialize SEO Skill
    const seoSkill = new SEOSkill(supabase, orgId, siteId, { userId: contact.id })

    // Run AI analysis using SEO Skill
    const analysis = await runAIAnalysis({
      analysisType,
      page,
      allPages,
      gscData,
      domain: siteDomain,
      targetKeywords,
      seoSkill
    })

    // Save recommendations to database
    if (analysis.recommendations?.length > 0) {
      await saveRecommendations(supabase, siteId, pageId, analysis.recommendations)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        analysis,
        gscData: {
          queriesAnalyzed: gscData.queries?.length || 0,
          pagesAnalyzed: gscData.pages?.length || 0
        }
      })
    }

  } catch (error) {
    console.error('[SEO AI] Analysis error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}

// Fetch GSC data for analysis
async function fetchGSCData(siteUrl, pageId = null) {
  const now = new Date()
  const endDate = new Date(now.setDate(now.getDate() - 3))
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - 28)

  const dateRange = {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  }

  try {
    const queriesUrl = `${GSC_API_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`
    
    // PARALLEL: Fetch queries and pages simultaneously
    const [queriesData, pagesData] = await Promise.all([
      googleApiRequest(queriesUrl, {
        method: 'POST',
        body: JSON.stringify({
          ...dateRange,
          dimensions: ['query', 'page'],
          rowLimit: 500
        })
      }),
      googleApiRequest(queriesUrl, {
        method: 'POST',
        body: JSON.stringify({
          ...dateRange,
          dimensions: ['page'],
          rowLimit: 100
        })
      })
    ])

    return {
      queries: queriesData.rows || [],
      pages: pagesData.rows || [],
      dateRange
    }
  } catch (error) {
    console.error('[GSC] Error fetching data:', error)
    return { queries: [], pages: [], dateRange }
  }
}

// Run AI analysis based on type using SEO Skill
async function runAIAnalysis({ analysisType, page, allPages, gscData, domain, targetKeywords, seoSkill }) {
  // Build context for AI
  const context = buildAnalysisContext(page, allPages, gscData, domain, targetKeywords)
  
  // Run appropriate analysis using SEOSkill
  switch (analysisType) {
    case ANALYSIS_TYPES.TITLE_META:
      const pageQueries = context.queriesByPage[page?.url] || []
      const result = await seoSkill.analyzeTitleMeta(page, pageQueries.slice(0, 10))
      return { analysisType: 'title_meta', page: { id: page?.id, url: page?.url }, ...result }
      
    case ANALYSIS_TYPES.LOW_CTR:
      const lowCtrResult = await seoSkill.analyzeLowCTR(context.lowCtrQueries, domain)
      return { analysisType: 'low_ctr', queriesAnalyzed: context.lowCtrQueries.length, ...lowCtrResult }
      
    case ANALYSIS_TYPES.STRIKING_DISTANCE:
      const sdResult = await seoSkill.analyzeStrikingDistance(context.strikingDistanceQueries, domain)
      return { analysisType: 'striking_distance', queriesAnalyzed: context.strikingDistanceQueries.length, ...sdResult }
      
    case ANALYSIS_TYPES.THIN_CONTENT:
      const thinPages = context.allPages.filter(p => p.word_count && p.word_count < 300)
      const thinResult = await seoSkill.analyzeThinContent(thinPages, context.queriesByPage, domain)
      return { analysisType: 'thin_content', pagesAnalyzed: thinPages.length, ...thinResult }
      
    case ANALYSIS_TYPES.CANNIBALIZATION:
      const cannResult = await seoSkill.analyzeCannibalization(context.cannibalized, domain)
      return { analysisType: 'cannibalization', issuesFound: context.cannibalized.length, ...cannResult }
      
    case ANALYSIS_TYPES.FULL_AUDIT:
    default:
      const auditResult = await seoSkill.runFullAudit(context)
      return { analysisType: 'full_audit', ...auditResult }
  }
}

// Build context object for AI prompts
function buildAnalysisContext(page, allPages, gscData, domain, targetKeywords) {
  // Group queries by page
  const queriesByPage = {}
  gscData.queries.forEach(q => {
    const pageUrl = q.keys[1]
    if (!queriesByPage[pageUrl]) queriesByPage[pageUrl] = []
    queriesByPage[pageUrl].push({
      query: q.keys[0],
      clicks: q.clicks,
      impressions: q.impressions,
      ctr: q.ctr,
      position: q.position
    })
  })

  // Identify issues
  const lowCtrQueries = gscData.queries.filter(q => 
    q.impressions > 100 && q.ctr < 0.02
  )
  
  const strikingDistanceQueries = gscData.queries.filter(q => 
    q.position >= 8 && q.position <= 20 && q.impressions > 50
  )

  // Detect cannibalization (same query on multiple pages)
  const queryToPages = {}
  gscData.queries.forEach(q => {
    const query = q.keys[0]
    const pageUrl = q.keys[1]
    if (!queryToPages[query]) queryToPages[query] = []
    queryToPages[query].push({ page: pageUrl, position: q.position, clicks: q.clicks })
  })
  
  const cannibalized = Object.entries(queryToPages)
    .filter(([_, pages]) => pages.length > 1)
    .map(([query, pages]) => ({ query, pages: pages.sort((a, b) => a.position - b.position) }))

  return {
    domain,
    page,
    allPages,
    queriesByPage,
    topQueries: gscData.queries.slice(0, 50),
    topPages: gscData.pages.slice(0, 20),
    lowCtrQueries: lowCtrQueries.slice(0, 20),
    strikingDistanceQueries: strikingDistanceQueries.slice(0, 20),
    cannibalized: cannibalized.slice(0, 10),
    targetKeywords
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Analysis functions have been migrated to SEOSkill
// See: netlify/functions/skills/seo-skill.js
// Methods: analyzeTitleMeta, analyzeLowCTR, analyzeStrikingDistance, 
//          analyzeCannibalization, analyzeThinContent, runFullAudit
// ═══════════════════════════════════════════════════════════════════════════════

// Save recommendations to database
async function saveRecommendations(supabase, siteId, pageId, recommendations) {
  if (!siteId) return

  const opportunitiesToInsert = recommendations.map(rec => ({
    site_id: siteId,
    page_id: pageId,
    type: rec.type || 'ai_recommendation',
    priority: rec.priority || 'medium',
    title: rec.title || rec.suggested?.substring(0, 100) || 'AI Recommendation',
    description: rec.reason || rec.explanation || rec.description,
    current_value: rec.current,
    recommended_value: rec.suggested,
    ai_recommendation: JSON.stringify(rec),
    ai_confidence: 0.85,
    estimated_impact: rec.expectedCtrLift || rec.impact || 'medium',
    estimated_effort: rec.effort || 'quick-win',
    status: 'open',
    created_at: new Date().toISOString()
  }))

  if (opportunitiesToInsert.length > 0) {
    await supabase.from('seo_opportunities').insert(opportunitiesToInsert)
  }
}
