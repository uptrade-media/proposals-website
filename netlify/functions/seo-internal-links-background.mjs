/**
 * SEO Internal Links Background Function
 * 
 * Analyzes internal linking structure with page crawling and AI recommendations.
 * Background functions can run up to 15 minutes.
 * 
 * Triggered by POST from seo-internal-links.js
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import * as cheerio from 'cheerio'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const SEO_AI_MODEL = process.env.SEO_AI_MODEL || 'gpt-4o'

export default async function handler(req) {
  console.log('[seo-internal-links-background] Starting...')

  try {
    const { siteId, crawlLinks = true, jobId } = await req.json()

    if (!siteId) {
      return new Response(JSON.stringify({ error: 'siteId required' }), { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // Update job status if jobId provided
    if (jobId) {
      await supabase
        .from('seo_background_jobs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', jobId)
    }

    // Get site and pages
    const { data: site } = await supabase
      .from('seo_sites')
      .select('*, org:organizations(domain)')
      .eq('id', siteId)
      .single()

    if (!site) {
      throw new Error('Site not found')
    }

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

    console.log(`[seo-internal-links-background] Analyzing ${pages?.length || 0} pages for ${domain}`)

    // Crawl pages for link data
    if (crawlLinks && pages?.length > 0) {
      const linkMap = new Map()

      // Initialize all pages
      pages.forEach(p => {
        linkMap.set(p.url, { inLinks: [], outLinks: [] })
      })

      // Crawl pages for links (can do more since we have 15 min)
      const pagesToCrawl = pages.slice(0, 75)
      console.log(`[seo-internal-links-background] Crawling ${pagesToCrawl.length} pages...`)
      
      for (const page of pagesToCrawl) {
        try {
          const response = await fetch(page.url, {
            headers: { 'User-Agent': 'UptradeSEOBot/1.0' },
            signal: AbortSignal.timeout(10000)
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
              outLinks.push(fullUrl.split('?')[0])
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
          console.log(`[seo-internal-links-background] Failed to crawl ${page.url}: ${e.message}`)
        }
      }

      // Update database with link counts
      console.log('[seo-internal-links-background] Updating link counts...')
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

    // Refresh page data after crawl
    const { data: updatedPages } = await supabase
      .from('seo_pages')
      .select('*')
      .eq('site_id', siteId)
      .order('clicks_28d', { ascending: false, nullsFirst: false })
      .limit(100)

    // Build context for AI analysis
    const topPages = (updatedPages || []).slice(0, 40).map(p => ({
      url: p.url.replace(`https://${domain}`, ''),
      title: p.title,
      clicks: p.clicks_28d,
      linksIn: p.internal_links_in || 0,
      linksOut: p.internal_links_out || 0
    }))

    const contentPillars = knowledge?.content_pillars || []
    const services = knowledge?.primary_services?.map(s => s.name) || []

    // AI Analysis
    console.log('[seo-internal-links-background] Running AI analysis...')
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

    // Save recommendations
    console.log(`[seo-internal-links-background] Saving ${recommendations.length} recommendations...`)
    for (const rec of recommendations) {
      await supabase
        .from('seo_ai_recommendations')
        .insert(rec)
    }

    // Identify orphan and underlinked pages
    const orphanPages = (updatedPages || []).filter(p => 
      (p.internal_links_in || 0) === 0 && 
      !p.url.includes('sitemap') &&
      !p.url.includes('privacy') &&
      !p.url.includes('terms')
    )

    const result = {
      success: true,
      totalPages: updatedPages?.length || 0,
      analysis: {
        score: analysis.score,
        assessment: analysis.assessment,
        orphanPages: orphanPages.length,
        criticalIssues: analysis.criticalIssues?.length || 0,
        linkingOpportunities: analysis.linkingOpportunities?.length || 0
      },
      recommendations: recommendations.length,
      topOpportunities: analysis.linkingOpportunities?.slice(0, 10) || []
    }

    console.log('[seo-internal-links-background] Complete')

    // Update job status
    if (jobId) {
      await supabase
        .from('seo_background_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          result
        })
        .eq('id', jobId)
    }

    return new Response(JSON.stringify(result), { status: 200 })

  } catch (error) {
    console.error('[seo-internal-links-background] Error:', error)

    try {
      const { jobId } = await req.json().catch(() => ({}))
      if (jobId) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        await supabase
          .from('seo_background_jobs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error: error.message
          })
          .eq('id', jobId)
      }
    } catch (e) {
      // Ignore
    }

    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
