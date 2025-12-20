// netlify/functions/seo-ai-analyze.js
// AI-powered SEO analysis and recommendations
// Analyzes GSC data + page content and generates actionable fixes
import OpenAI from 'openai'
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { googleApiRequest } from './utils/google-auth.js'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Use env variable for model - easily update when new models release
const SEO_AI_MODEL = process.env.SEO_AI_MODEL || 'gpt-4o'

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

    // Run AI analysis
    const analysis = await runAIAnalysis({
      analysisType,
      page,
      allPages,
      gscData,
      domain: siteDomain,
      targetKeywords
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

// Run AI analysis based on type
async function runAIAnalysis({ analysisType, page, allPages, gscData, domain, targetKeywords }) {
  const recommendations = []
  
  // Build context for AI
  const context = buildAnalysisContext(page, allPages, gscData, domain, targetKeywords)
  
  // Run appropriate analysis
  switch (analysisType) {
    case ANALYSIS_TYPES.TITLE_META:
      return await analyzeTitleMeta(context)
    case ANALYSIS_TYPES.LOW_CTR:
      return await analyzeLowCTR(context)
    case ANALYSIS_TYPES.STRIKING_DISTANCE:
      return await analyzeStrikingDistance(context)
    case ANALYSIS_TYPES.THIN_CONTENT:
      return await analyzeThinContent(context)
    case ANALYSIS_TYPES.CANNIBALIZATION:
      return await analyzeCannibalization(context)
    case ANALYSIS_TYPES.FULL_AUDIT:
    default:
      return await runFullAudit(context)
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

// Title and Meta Description optimization
async function analyzeTitleMeta(context) {
  const { page, queriesByPage, domain } = context
  
  if (!page) {
    return { error: 'Page data required for title/meta analysis' }
  }

  const pageQueries = queriesByPage[page.url] || []
  const topQueries = pageQueries.slice(0, 10)

  const prompt = `You are an expert SEO specialist. Analyze this page and generate optimized title and meta description.

PAGE DATA:
URL: ${page.url}
Current Title: ${page.title || 'Missing'}
Current Title Length: ${page.title_length || 0} chars
Current Meta: ${page.meta_description || 'Missing'}
Current Meta Length: ${page.meta_description_length || 0} chars
Current H1: ${page.h1 || 'Missing'}
Word Count: ${page.word_count || 'Unknown'}

TOP SEARCH QUERIES DRIVING TRAFFIC TO THIS PAGE:
${topQueries.map(q => `- "${q.query}" (pos ${q.position.toFixed(1)}, ${q.impressions} impr, ${(q.ctr * 100).toFixed(1)}% CTR)`).join('\n') || 'No query data available'}

REQUIREMENTS:
1. Title must be 50-60 characters
2. Meta description must be 140-160 characters  
3. Include the top performing search query naturally
4. Add compelling CTR-boosting elements (numbers, power words, urgency)
5. Match the search intent of the top queries
6. Differentiate from generic competitors

RESPOND IN THIS EXACT JSON FORMAT:
{
  "currentIssues": ["issue 1", "issue 2"],
  "recommendations": [
    {
      "type": "title",
      "priority": "high",
      "current": "current title here",
      "suggested": "new optimized title here",
      "reason": "why this is better",
      "expectedCtrLift": "estimated % improvement"
    },
    {
      "type": "meta_description", 
      "priority": "high",
      "current": "current meta here",
      "suggested": "new optimized meta here",
      "reason": "why this is better",
      "expectedCtrLift": "estimated % improvement"
    }
  ],
  "additionalTips": ["tip 1", "tip 2"]
}`

  const response = await openai.chat.completions.create({
    model: SEO_AI_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    response_format: { type: 'json_object' }
  })

  const result = JSON.parse(response.choices[0].message.content)
  
  return {
    analysisType: 'title_meta',
    page: { id: page.id, url: page.url },
    ...result
  }
}

// Low CTR Analysis
async function analyzeLowCTR(context) {
  const { lowCtrQueries, domain, queriesByPage } = context

  if (lowCtrQueries.length === 0) {
    return { 
      analysisType: 'low_ctr',
      message: 'No significant low CTR issues detected',
      recommendations: []
    }
  }

  const prompt = `You are an expert SEO specialist. Analyze these search queries that have HIGH impressions but LOW click-through rate.

DOMAIN: ${domain}

LOW CTR QUERIES (high impressions, CTR < 2%):
${lowCtrQueries.map(q => `- "${q.keys[0]}" on ${q.keys[1]}
  Position: ${q.position.toFixed(1)}, Impressions: ${q.impressions}, CTR: ${(q.ctr * 100).toFixed(2)}%`).join('\n\n')}

For each query, explain WHY the CTR is low and provide a SPECIFIC fix.

Consider:
- Is the title compelling enough?
- Does the meta description match the search intent?
- Is there a mismatch between query and content?
- Are competitors doing something better?

RESPOND IN THIS EXACT JSON FORMAT:
{
  "summary": "overall summary of CTR issues",
  "recommendations": [
    {
      "query": "the search query",
      "page": "the page URL",
      "currentCtr": 0.8,
      "currentPosition": 8.2,
      "issue": "why CTR is low",
      "priority": "high|medium|low",
      "fix": {
        "type": "title|meta|content|intent_mismatch",
        "current": "current value if applicable",
        "suggested": "new suggested value",
        "explanation": "why this will improve CTR"
      },
      "expectedCtrLift": "+0.5% to +1.5%"
    }
  ],
  "quickWins": ["easy fixes to implement first"]
}`

  const response = await openai.chat.completions.create({
    model: SEO_AI_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    response_format: { type: 'json_object' }
  })

  const result = JSON.parse(response.choices[0].message.content)
  
  return {
    analysisType: 'low_ctr',
    queriesAnalyzed: lowCtrQueries.length,
    ...result
  }
}

// Striking Distance Keywords Analysis
async function analyzeStrikingDistance(context) {
  const { strikingDistanceQueries, domain, queriesByPage } = context

  if (strikingDistanceQueries.length === 0) {
    return { 
      analysisType: 'striking_distance',
      message: 'No striking distance keywords found (positions 8-20)',
      recommendations: []
    }
  }

  const prompt = `You are an expert SEO specialist. Analyze these "striking distance" keywords that are positions 8-20 (close to page 1 but not there yet).

DOMAIN: ${domain}

STRIKING DISTANCE KEYWORDS:
${strikingDistanceQueries.map(q => `- "${q.keys[0]}" on ${q.keys[1]}
  Position: ${q.position.toFixed(1)}, Impressions: ${q.impressions}, Clicks: ${q.clicks}`).join('\n\n')}

For each keyword, provide SPECIFIC actions to push it to page 1 (positions 1-7).

Consider:
- Content depth improvements
- Title/meta optimization for this keyword
- Internal linking opportunities  
- Content freshness signals
- Featured snippet opportunities

RESPOND IN THIS EXACT JSON FORMAT:
{
  "summary": "overall striking distance opportunity summary",
  "totalPotentialClicks": 0,
  "recommendations": [
    {
      "query": "the keyword",
      "page": "the page URL",
      "currentPosition": 11.2,
      "impressions": 500,
      "priority": "high|medium|low",
      "actions": [
        {
          "type": "title_optimization|content_addition|internal_linking|schema|content_refresh",
          "description": "specific action to take",
          "implementation": "exact copy or steps",
          "effort": "quick|medium|significant",
          "expectedPositionGain": "+2-4 positions"
        }
      ],
      "potentialClicksIfPage1": 150
    }
  ],
  "prioritizedPlan": ["step 1", "step 2", "step 3"]
}`

  const response = await openai.chat.completions.create({
    model: SEO_AI_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    response_format: { type: 'json_object' }
  })

  const result = JSON.parse(response.choices[0].message.content)
  
  return {
    analysisType: 'striking_distance',
    keywordsAnalyzed: strikingDistanceQueries.length,
    ...result
  }
}

// Cannibalization Analysis  
async function analyzeCannibalization(context) {
  const { cannibalized, domain } = context

  if (cannibalized.length === 0) {
    return { 
      analysisType: 'cannibalization',
      message: 'No keyword cannibalization detected',
      recommendations: []
    }
  }

  const prompt = `You are an expert SEO specialist. Analyze these keyword cannibalization issues where multiple pages compete for the same search query.

DOMAIN: ${domain}

CANNIBALIZED KEYWORDS:
${cannibalized.map(c => `Query: "${c.query}"
Pages competing:
${c.pages.map(p => `  - ${p.page} (pos ${p.position.toFixed(1)}, ${p.clicks} clicks)`).join('\n')}`).join('\n\n')}

For each cannibalized keyword, recommend how to consolidate ranking signals.

Options:
1. MERGE: Combine content into one authoritative page
2. DIFFERENTIATE: Adjust content to target different intents
3. CANONICAL: Add canonical tags to point to primary page
4. REDIRECT: 301 redirect the weaker page

RESPOND IN THIS EXACT JSON FORMAT:
{
  "summary": "cannibalization impact summary",
  "estimatedTrafficLoss": "X clicks per month being lost to cannibalization",
  "recommendations": [
    {
      "query": "the cannibalized keyword",
      "affectedPages": ["url1", "url2"],
      "primaryPage": "url that should rank",
      "priority": "high|medium|low",
      "strategy": "merge|differentiate|canonical|redirect",
      "implementation": {
        "action": "specific steps to take",
        "contentChanges": "what to add/remove",
        "technicalChanges": "redirects, canonicals, etc"
      },
      "expectedPositionGain": "+2-5 positions for primary page"
    }
  ]
}`

  const response = await openai.chat.completions.create({
    model: SEO_AI_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    response_format: { type: 'json_object' }
  })

  const result = JSON.parse(response.choices[0].message.content)
  
  return {
    analysisType: 'cannibalization',
    issuesFound: cannibalized.length,
    ...result
  }
}

// Thin Content Analysis
async function analyzeThinContent(context) {
  const { allPages, queriesByPage, domain } = context
  
  const thinPages = allPages.filter(p => p.word_count && p.word_count < 300)
  
  if (thinPages.length === 0) {
    return {
      analysisType: 'thin_content',
      message: 'No thin content pages detected',
      recommendations: []
    }
  }

  const prompt = `You are an expert SEO specialist. Analyze these thin content pages (under 300 words) and provide recommendations.

DOMAIN: ${domain}

THIN CONTENT PAGES:
${thinPages.slice(0, 10).map(p => {
  const queries = queriesByPage[p.url]?.slice(0, 3) || []
  return `- ${p.url}
  Word count: ${p.word_count}
  Title: ${p.title || 'Missing'}
  Top queries: ${queries.map(q => `"${q.query}"`).join(', ') || 'None'}`
}).join('\n\n')}

For each page, determine if it should be:
1. EXPANDED: Add more valuable content
2. MERGED: Combine with a related page
3. REMOVED: Delete or noindex (if no value)

RESPOND IN THIS EXACT JSON FORMAT:
{
  "summary": "thin content impact summary",
  "recommendations": [
    {
      "page": "page URL",
      "currentWordCount": 150,
      "priority": "high|medium|low",
      "strategy": "expand|merge|remove",
      "implementation": {
        "action": "what to do",
        "contentSuggestions": ["topic 1 to add", "topic 2 to add"],
        "targetWordCount": 800,
        "mergeTarget": "URL if merging"
      },
      "reason": "why this strategy"
    }
  ]
}`

  const response = await openai.chat.completions.create({
    model: SEO_AI_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    response_format: { type: 'json_object' }
  })

  const result = JSON.parse(response.choices[0].message.content)
  
  return {
    analysisType: 'thin_content',
    pagesAnalyzed: thinPages.length,
    ...result
  }
}

// Full Site Audit
async function runFullAudit(context) {
  const { domain, topQueries, topPages, lowCtrQueries, strikingDistanceQueries, cannibalized, allPages } = context

  // Quick stats
  const thinPages = allPages.filter(p => p.word_count && p.word_count < 300)
  const missingTitles = allPages.filter(p => !p.title || p.title_length < 30)
  const missingMeta = allPages.filter(p => !p.meta_description)

  const prompt = `You are an expert SEO strategist. Perform a comprehensive SEO audit based on this data.

DOMAIN: ${domain}

SITE OVERVIEW:
- Total pages tracked: ${allPages.length}
- Pages with thin content (<300 words): ${thinPages.length}
- Pages with missing/short titles: ${missingTitles.length}
- Pages with missing meta descriptions: ${missingMeta.length}

TOP 10 QUERIES:
${topQueries.slice(0, 10).map(q => `- "${q.keys[0]}" (pos ${q.position.toFixed(1)}, ${q.impressions} impr, ${(q.ctr * 100).toFixed(1)}% CTR)`).join('\n')}

LOW CTR QUERIES (${lowCtrQueries.length} total):
${lowCtrQueries.slice(0, 5).map(q => `- "${q.keys[0]}" - ${(q.ctr * 100).toFixed(2)}% CTR, ${q.impressions} impressions`).join('\n')}

STRIKING DISTANCE (${strikingDistanceQueries.length} keywords in positions 8-20):
${strikingDistanceQueries.slice(0, 5).map(q => `- "${q.keys[0]}" at position ${q.position.toFixed(1)}`).join('\n')}

CANNIBALIZATION ISSUES (${cannibalized.length} total):
${cannibalized.slice(0, 3).map(c => `- "${c.query}" competing across ${c.pages.length} pages`).join('\n')}

Provide a prioritized action plan with the highest-impact items first.

RESPOND IN THIS EXACT JSON FORMAT:
{
  "overallHealth": "good|needs-work|poor",
  "healthScore": 75,
  "summary": "2-3 sentence executive summary",
  "topOpportunities": [
    {
      "priority": 1,
      "category": "low_ctr|striking_distance|technical|content|cannibalization",
      "title": "opportunity title",
      "description": "what needs to be done",
      "impact": "high|medium|low",
      "effort": "quick|medium|significant",
      "estimatedTrafficGain": "+X clicks/month",
      "specificFixes": [
        {
          "type": "title|meta|content|technical",
          "target": "page URL or keyword",
          "current": "current value if applicable",
          "suggested": "new value or action",
          "reason": "why this helps"
        }
      ]
    }
  ],
  "quickWins": [
    {
      "action": "what to do",
      "pages": ["affected pages"],
      "timeToComplete": "15 minutes|1 hour|etc"
    }
  ],
  "monthlyPriorities": {
    "week1": ["task 1", "task 2"],
    "week2": ["task 3", "task 4"],
    "week3": ["task 5"],
    "week4": ["task 6"]
  }
}`

  const response = await openai.chat.completions.create({
    model: SEO_AI_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    response_format: { type: 'json_object' }
  })

  const result = JSON.parse(response.choices[0].message.content)
  
  return {
    analysisType: 'full_audit',
    dataAnalyzed: {
      queries: topQueries.length,
      pages: allPages.length,
      lowCtrIssues: lowCtrQueries.length,
      strikingDistance: strikingDistanceQueries.length,
      cannibalizationIssues: cannibalized.length
    },
    ...result
  }
}

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
