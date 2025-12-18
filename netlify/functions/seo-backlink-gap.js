// netlify/functions/seo-backlink-gap.js
// Backlink Gap Analysis - Find sites linking to competitors but not us
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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

  // GET - Get backlink gap data
  if (event.httpMethod === 'GET') {
    return await getBacklinkGap(event, supabase, headers)
  }

  // POST - Analyze backlink gaps from competitor data
  if (event.httpMethod === 'POST') {
    return await analyzeBacklinkGap(event, supabase, headers)
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
}

async function getBacklinkGap(event, supabase, headers) {
  const { siteId, status = 'open' } = event.queryStringParameters || {}

  if (!siteId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
  }

  // Get backlink opportunities marked as competitor_backlink type
  const { data: gaps, error } = await supabase
    .from('seo_backlink_opportunities')
    .select('*')
    .eq('site_id', siteId)
    .eq('opportunity_type', 'competitor_backlink')
    .eq('status', status)
    .order('domain_authority', { ascending: false })
    .limit(100)

  if (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }

  // Get competitor summary
  const { data: competitors } = await supabase
    .from('seo_competitor_analysis')
    .select('competitor_domain, is_primary, keyword_gap_data')
    .eq('site_id', siteId)
    .eq('is_active', true)

  const summary = {
    totalGaps: gaps?.length || 0,
    highAuthority: gaps?.filter(g => (g.domain_authority || 0) >= 50).length || 0,
    mediumAuthority: gaps?.filter(g => (g.domain_authority || 0) >= 30 && (g.domain_authority || 0) < 50).length || 0,
    competitorsTracked: competitors?.length || 0,
    potentialLinks: gaps?.reduce((sum, g) => sum + (g.relevance_score >= 70 ? 1 : 0), 0) || 0
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ gaps, competitors, summary })
  }
}

async function analyzeBacklinkGap(event, supabase, headers) {
  const body = JSON.parse(event.body || '{}')
  const { siteId, competitorDomains, manualBacklinks } = body

  if (!siteId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
  }

  console.log(`[Backlink Gap] Analyzing for site ${siteId}`)

  // Get site info
  const { data: site } = await supabase
    .from('seo_sites')
    .select('domain, org:organizations(name)')
    .eq('id', siteId)
    .single()

  if (!site) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Site not found' }) }
  }

  // Get competitors
  let competitors = []
  
  if (competitorDomains?.length > 0) {
    competitors = competitorDomains
  } else {
    // Get from competitor analysis
    const { data: compData } = await supabase
      .from('seo_competitor_analysis')
      .select('competitor_domain')
      .eq('site_id', siteId)
      .eq('is_active', true)

    competitors = compData?.map(c => c.competitor_domain) || []
  }

  if (competitors.length === 0) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'No competitors to analyze. Add competitors first.' }) }
  }

  // Get site knowledge for context
  const { data: knowledge } = await supabase
    .from('seo_knowledge_base')
    .select('industry, business_type, primary_services')
    .eq('site_id', siteId)
    .single()

  // If manual backlinks provided, analyze those
  let backlinksToAnalyze = []

  if (manualBacklinks?.length > 0) {
    backlinksToAnalyze = manualBacklinks
  } else {
    // Use AI to suggest potential backlink sources based on industry
    backlinksToAnalyze = await suggestBacklinkSources(site, competitors, knowledge)
  }

  // Analyze each potential backlink source
  const opportunities = []

  for (const source of backlinksToAnalyze) {
    // Check if it links to competitors but not us
    const analysis = await analyzeBacklinkSource(source, site.domain, competitors, knowledge)
    
    if (analysis.isOpportunity) {
      opportunities.push({
        site_id: siteId,
        source_url: analysis.url,
        source_domain: analysis.domain,
        opportunity_type: 'competitor_backlink',
        anchor_text: analysis.suggestedAnchor,
        domain_authority: analysis.domainAuthority,
        relevance_score: analysis.relevanceScore,
        contact_email: analysis.contactEmail,
        status: 'open',
        outreach_notes: analysis.outreachStrategy,
        ai_analysis: {
          linksToCompetitors: analysis.linksToCompetitors,
          pageType: analysis.pageType,
          reasoning: analysis.reasoning
        }
      })
    }
  }

  console.log(`[Backlink Gap] Found ${opportunities.length} opportunities`)

  // Save opportunities
  for (const opp of opportunities) {
    await supabase
      .from('seo_backlink_opportunities')
      .upsert(opp, {
        onConflict: 'site_id,source_domain,opportunity_type',
        ignoreDuplicates: true
      })
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      analyzed: backlinksToAnalyze.length,
      opportunitiesFound: opportunities.length,
      highPriority: opportunities.filter(o => o.relevance_score >= 70).length,
      topOpportunities: opportunities
        .sort((a, b) => (b.domain_authority || 0) - (a.domain_authority || 0))
        .slice(0, 10)
        .map(o => ({
          domain: o.source_domain,
          authority: o.domain_authority,
          relevance: o.relevance_score,
          outreach: o.outreach_notes
        }))
    })
  }
}

async function suggestBacklinkSources(site, competitors, knowledge) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a link building expert. Suggest potential backlink sources based on the industry and competitors.

Think about:
1. Industry directories and listings
2. Resource pages that link to similar companies
3. Guest posting opportunities
4. Industry publications and blogs
5. Local business directories
6. Professional associations
7. Tool/resource aggregators`
        },
        {
          role: 'user',
          content: `Suggest backlink sources for:

Domain: ${site.domain}
Industry: ${knowledge?.industry || 'general business'}
Business Type: ${knowledge?.business_type || 'service business'}
Services: ${JSON.stringify(knowledge?.primary_services || [])}

Competitors: ${competitors.join(', ')}

Respond with JSON array of potential sources:
{
  "sources": [
    {
      "type": "directory|resource_page|blog|publication|association",
      "domain": "example.com",
      "url": "https://example.com/resources",
      "why": "Why this is relevant",
      "approach": "How to get a link"
    }
  ]
}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5
    })

    const result = JSON.parse(response.choices[0].message.content)
    return result.sources || []
  } catch (error) {
    console.error('[Backlink Gap] AI suggestion error:', error)
    return []
  }
}

async function analyzeBacklinkSource(source, ourDomain, competitors, knowledge) {
  // In a real implementation, we would:
  // 1. Crawl the source page
  // 2. Check if it links to competitors
  // 3. Assess domain authority (via Moz/Ahrefs API)
  // 4. Determine relevance

  // For now, use AI to assess based on available data
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are analyzing a potential backlink source. Assess if it's a good opportunity for outreach.`
        },
        {
          role: 'user',
          content: `Analyze this backlink source:

Source: ${JSON.stringify(source)}
Our Domain: ${ourDomain}
Competitors: ${competitors.join(', ')}
Industry: ${knowledge?.industry || 'unknown'}

Assess:
1. Is this likely to be a good backlink opportunity?
2. Estimated domain authority (0-100)
3. Relevance to our business (0-100)
4. What anchor text should we suggest?
5. Best outreach strategy

Respond with JSON:
{
  "isOpportunity": true,
  "url": "full url",
  "domain": "domain only",
  "domainAuthority": 45,
  "relevanceScore": 75,
  "pageType": "resource_page|directory|blog|etc",
  "linksToCompetitors": ["competitor1.com"],
  "suggestedAnchor": "anchor text",
  "contactEmail": "email if found or null",
  "outreachStrategy": "How to approach them",
  "reasoning": "Why this is or isn't a good opportunity"
}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })

    return JSON.parse(response.choices[0].message.content)
  } catch (error) {
    console.error('[Backlink Gap] Analysis error:', error)
    return { isOpportunity: false }
  }
}
