/**
 * SEO Competitor Analyze Background Function
 * 
 * Runs competitor analysis using GSC + OpenAI.
 * Background functions can run up to 15 minutes.
 * 
 * Triggered by POST from seo-competitor-analyze.js
 */

import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import OpenAI from 'openai'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const SEO_AI_MODEL = process.env.SEO_AI_MODEL || 'gpt-4o'

export default async function handler(req) {
  console.log('[seo-competitor-analyze-background] Starting...')

  try {
    const { siteId, competitorDomain, jobId } = await req.json()

    if (!siteId || !competitorDomain) {
      return new Response(JSON.stringify({ error: 'siteId and competitorDomain required' }), { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Update job status if jobId provided
    if (jobId) {
      await supabase
        .from('seo_background_jobs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', jobId)
    }

    // Fetch site details
    const { data: site, error: siteError } = await supabase
      .from('seo_sites')
      .select('*, org:organizations(domain)')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      throw new Error('Site not found')
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
      console.log('[seo-competitor-analyze-background] Fetching GSC keywords...')
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
      console.log(`[seo-competitor-analyze-background] Got ${ourKeywords.length} keywords`)
    } catch (e) {
      console.error('[seo-competitor-analyze-background] GSC error:', e)
    }

    // Use AI to analyze the competitor
    console.log('[seo-competitor-analyze-background] Running AI analysis...')
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
      console.error('[seo-competitor-analyze-background] Failed to parse AI response:', e)
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

    const result = {
      success: true,
      competitor: competitorData,
      keywordsAnalyzed: ourKeywords.length,
      opportunities: analysis.keyword_opportunities?.length || 0
    }

    console.log('[seo-competitor-analyze-background] Complete')

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
    console.error('[seo-competitor-analyze-background] Error:', error)

    // Update job with error
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
