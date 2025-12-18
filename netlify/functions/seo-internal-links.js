// netlify/functions/seo-internal-links.js
// Internal Linking Analysis - Optimize site architecture and link equity flow
// Identifies orphan pages, hub opportunities, and strategic linking gaps
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import OpenAI from 'openai'
import * as cheerio from 'cheerio'

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

  // GET - Fetch internal link analysis
  if (event.httpMethod === 'GET') {
    return await getInternalLinkAnalysis(event, headers)
  }

  // POST - Run internal link analysis
  if (event.httpMethod === 'POST') {
    return await analyzeInternalLinks(event, headers)
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
}

// Get internal link analysis
async function getInternalLinkAnalysis(event, headers) {
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

    // Get pages with link data
    const { data: pages, error } = await supabase
      .from('seo_pages')
      .select('id, url, title, internal_links_in, internal_links_out, clicks_28d, impressions_28d')
      .eq('site_id', siteId)
      .order('clicks_28d', { ascending: false, nullsFirst: false })

    if (error) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
    }

    // Identify orphan pages (no internal links pointing to them)
    const orphanPages = pages.filter(p => 
      (p.internal_links_in || 0) === 0 && 
      !p.url.includes('sitemap') &&
      !p.url.includes('privacy') &&
      !p.url.includes('terms')
    )

    // Identify hub pages (high number of outgoing links)
    const hubPages = pages.filter(p => (p.internal_links_out || 0) >= 10)
      .sort((a, b) => (b.internal_links_out || 0) - (a.internal_links_out || 0))

    // Identify high-value pages that need more internal links
    const underlinkedHighValue = pages.filter(p => 
      p.clicks_28d > 10 && 
      (p.internal_links_in || 0) < 3
    )

    // Calculate link distribution stats
    const totalInternalLinks = pages.reduce((sum, p) => sum + (p.internal_links_out || 0), 0)
    const avgLinksPerPage = pages.length > 0 ? totalInternalLinks / pages.length : 0

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        totalPages: pages.length,
        totalInternalLinks,
        avgLinksPerPage: Math.round(avgLinksPerPage * 10) / 10,
        orphanPages: orphanPages.slice(0, 20),
        hubPages: hubPages.slice(0, 10),
        underlinkedHighValue,
        summary: {
          orphanCount: orphanPages.length,
          hubCount: hubPages.length,
          underlinkedCount: underlinkedHighValue.length,
          healthScore: Math.max(0, 100 - (orphanPages.length * 5) - (underlinkedHighValue.length * 3))
        }
      })
    }

  } catch (error) {
    console.error('[Internal Links] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}

// Analyze internal links and generate recommendations
async function analyzeInternalLinks(event, headers) {
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { siteId, crawlLinks = false } = body

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
    }

    const supabase = createSupabaseAdmin()
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // Get site and pages
    const { data: site } = await supabase
      .from('seo_sites')
      .select('*, org:organizations(domain)')
      .eq('id', siteId)
      .single()

    const { data: pages } = await supabase
      .from('seo_pages')
      .select('*')
      .eq('site_id', siteId)
      .order('clicks_28d', { ascending: false, nullsFirst: false })
      .limit(100)

    const { data: knowledge } = await supabase
      .from('seo_knowledge_base')
      .select('content_pillars, primary_services')
      .eq('site_id', siteId)
      .single()

    const domain = site?.org?.domain || site?.domain

    // If crawlLinks is true, crawl pages for link data
    if (crawlLinks && pages?.length > 0) {
      const linkMap = new Map() // url -> { inLinks: [], outLinks: [] }

      // Initialize all pages
      pages.forEach(p => {
        linkMap.set(p.url, { inLinks: [], outLinks: [] })
      })

      // Crawl top pages for links
      const pagesToCrawl = pages.slice(0, 30) // Limit to avoid timeout
      
      for (const page of pagesToCrawl) {
        try {
          const response = await fetch(page.url, {
            headers: { 'User-Agent': 'UptradeSEOBot/1.0' },
            signal: AbortSignal.timeout(5000)
          })
          
          if (!response.ok) continue
          
          const html = await response.text()
          const $ = cheerio.load(html)
          
          // Find all internal links
          const outLinks = []
          $('a[href]').each((_, el) => {
            const href = $(el).attr('href')
            if (!href) return
            
            let fullUrl = href
            if (href.startsWith('/')) {
              fullUrl = `https://${domain}${href}`
            }
            
            if (fullUrl.includes(domain) && !fullUrl.includes('#')) {
              outLinks.push(fullUrl.split('?')[0]) // Remove query strings
            }
          })
          
          // Update page data
          const pageData = linkMap.get(page.url) || { inLinks: [], outLinks: [] }
          pageData.outLinks = [...new Set(outLinks)]
          linkMap.set(page.url, pageData)
          
          // Update inLinks for linked pages
          outLinks.forEach(linkedUrl => {
            const linkedPageData = linkMap.get(linkedUrl)
            if (linkedPageData) {
              linkedPageData.inLinks.push(page.url)
            }
          })
          
        } catch (e) {
          console.log(`[Internal Links] Failed to crawl ${page.url}: ${e.message}`)
        }
      }

      // Update database with link counts
      for (const page of pages) {
        const pageData = linkMap.get(page.url)
        if (pageData) {
          await supabase
            .from('seo_pages')
            .update({
              internal_links_in: pageData.inLinks.length,
              internal_links_out: pageData.outLinks.length,
              updated_at: new Date().toISOString()
            })
            .eq('id', page.id)
        }
      }
    }

    // Build context for AI analysis
    const topPages = pages.slice(0, 30).map(p => ({
      url: p.url.replace(`https://${domain}`, ''),
      title: p.title,
      clicks: p.clicks_28d,
      linksIn: p.internal_links_in || 0,
      linksOut: p.internal_links_out || 0
    }))

    const contentPillars = knowledge?.content_pillars || []
    const services = knowledge?.primary_services?.map(s => s.name) || []

    // AI Analysis
    const prompt = `Analyze this site's internal linking structure and provide strategic recommendations.

SITE STRUCTURE:
Content Pillars: ${contentPillars.join(', ') || 'Not defined'}
Services: ${services.join(', ') || 'Not defined'}

TOP PAGES (by traffic):
${JSON.stringify(topPages, null, 2)}

Analyze and provide:
1. Link equity distribution issues
2. Strategic internal linking opportunities
3. Topic cluster linking improvements
4. Anchor text recommendations

Return as JSON:
{
  "assessment": "Overall assessment of internal linking health",
  "score": 0-100,
  "criticalIssues": [
    {
      "issue": "Description",
      "affectedPages": ["url1", "url2"],
      "recommendation": "How to fix"
    }
  ],
  "linkingOpportunities": [
    {
      "fromPage": "/source-page",
      "toPage": "/target-page",
      "suggestedAnchor": "anchor text",
      "reason": "Why this link adds value",
      "priority": "high|medium|low"
    }
  ],
  "hubPageRecommendations": [
    {
      "page": "/page-url",
      "role": "pillar|hub|spoke",
      "shouldLinkTo": ["/page1", "/page2"],
      "reason": "Why this creates good structure"
    }
  ],
  "orphanPageFixes": [
    {
      "orphanPage": "/orphan-url",
      "linkFrom": ["/page1", "/page2"],
      "suggestedAnchors": ["anchor 1", "anchor 2"]
    }
  ],
  "topicClusterStrategy": {
    "clusters": [
      {
        "pillarPage": "/pillar-url",
        "clusterPages": ["/spoke1", "/spoke2"],
        "missingLinks": ["description of missing links"]
      }
    ]
  }
}`

    const completion = await openai.chat.completions.create({
      model: SEO_AI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert in site architecture and internal linking for SEO. Provide specific, strategic recommendations for improving link equity distribution and topic clustering.'
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })

    const analysis = JSON.parse(completion.choices[0].message.content)

    // Store recommendations
    const recommendations = []
    
    // Add critical issues as recommendations
    analysis.criticalIssues?.forEach(issue => {
      recommendations.push({
        site_id: siteId,
        category: 'link',
        subcategory: 'internal',
        priority: 'high',
        title: issue.issue,
        description: issue.recommendation,
        supporting_data: { affectedPages: issue.affectedPages },
        auto_fixable: false,
        status: 'pending',
        ai_model: SEO_AI_MODEL,
        created_at: new Date().toISOString()
      })
    })

    // Add high priority linking opportunities
    analysis.linkingOpportunities?.filter(o => o.priority === 'high').forEach(opp => {
      recommendations.push({
        site_id: siteId,
        category: 'link',
        subcategory: 'internal',
        priority: 'medium',
        title: `Add internal link from ${opp.fromPage} to ${opp.toPage}`,
        description: opp.reason,
        current_value: opp.fromPage,
        suggested_value: `Link to ${opp.toPage} with anchor: "${opp.suggestedAnchor}"`,
        auto_fixable: false,
        status: 'pending',
        ai_model: SEO_AI_MODEL,
        created_at: new Date().toISOString()
      })
    })

    if (recommendations.length > 0) {
      await supabase
        .from('seo_ai_recommendations')
        .insert(recommendations)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        analysis,
        recommendationsCreated: recommendations.length
      })
    }

  } catch (error) {
    console.error('[Internal Links] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}
