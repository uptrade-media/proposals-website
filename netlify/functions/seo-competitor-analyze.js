// netlify/functions/seo-competitor-analyze.js
// Analyze competitors for SEO comparison
// Compares keyword overlap, content gaps, and rankings
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
      .select('*, org:organizations(domain)')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Site not found' }) }
    }

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

    // Use AI to analyze the competitor
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const analysisPrompt = `Analyze this competitor for SEO comparison.

OUR BUSINESS:
- Domain: ${ourDomain}
- Industry: ${knowledge?.industry || 'Unknown'}
- Services: ${knowledge?.services?.join(', ') || 'Unknown'}
- Service Areas: ${knowledge?.service_areas?.join(', ') || 'Unknown'}

OUR TOP KEYWORDS (from Google Search Console):
${ourKeywords.slice(0, 30).map(k => `- "${k.keyword}" (Position: ${k.position.toFixed(1)}, Clicks: ${k.clicks})`).join('\n')}

COMPETITOR DOMAIN: ${competitorDomain}

Analyze the competitive landscape and provide:

1. POSITIONING ANALYSIS
- How does this competitor likely position themselves?
- What market segments are they targeting?
- What's their likely competitive advantage?

2. KEYWORD OPPORTUNITIES
List 10-15 keywords we should target based on:
- Keywords where competitor likely ranks but we don't appear in our GSC data
- Keywords that align with our services
- Local keywords for our service areas

3. CONTENT GAPS
What types of content should we create to compete better?

4. DIFFERENTIATION STRATEGY
How can we differentiate from this competitor in search?

Return your analysis as JSON:
{
  "competitor_name": "Best guess at business name",
  "competitor_positioning": "Brief description of their positioning",
  "threat_level": "high|medium|low",
  "overlap_assessment": "Description of how much we compete",
  "keyword_opportunities": [
    {
      "keyword": "keyword phrase",
      "difficulty": "easy|medium|hard",
      "priority": "high|medium|low",
      "rationale": "Why target this"
    }
  ],
  "content_gaps": [
    {
      "topic": "Topic area",
      "content_type": "blog|service page|landing page|guide",
      "priority": "high|medium|low"
    }
  ],
  "differentiation_strategies": [
    "Strategy 1",
    "Strategy 2"
  ],
  "quick_wins": [
    "Action 1",
    "Action 2",
    "Action 3"
  ]
}`

    const completion = await openai.chat.completions.create({
      model: SEO_AI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert SEO competitive analyst. Analyze competitors and identify opportunities based on the provided data. Be specific and actionable.'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })

    let analysis
    try {
      analysis = JSON.parse(completion.choices[0].message.content)
    } catch (e) {
      console.error('[Competitor] Failed to parse AI response:', e)
      analysis = {
        competitor_name: competitorDomain,
        error: 'Failed to analyze'
      }
    }

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
