/**
 * SEO Content Gap Analysis Background Function
 * 
 * Analyzes content gaps vs competitors and industry using AI.
 * Background functions can run up to 15 minutes.
 * 
 * Triggered by POST from seo-content-gap-analysis.js
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req) {
  console.log('[seo-content-gap-analysis-background] Starting...')

  try {
    const { siteId, includeCompetitors = true, focusTopics = [], jobId } = await req.json()

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

    console.log(`[seo-content-gap-analysis-background] Analyzing for site ${siteId}`)

    // Get site knowledge base
    const { data: knowledge } = await supabase
      .from('seo_knowledge_base')
      .select('*')
      .eq('site_id', siteId)
      .single()

    // Get existing pages
    const { data: pages } = await supabase
      .from('seo_pages')
      .select('id, url, title, page_type, word_count, clicks_28d, impressions_28d')
      .eq('site_id', siteId)

    // Get keywords we rank for
    const { data: keywords } = await supabase
      .from('seo_keyword_universe')
      .select('keyword, search_volume_monthly, current_position, target_page_url')
      .eq('site_id', siteId)
      .order('search_volume_monthly', { ascending: false, nullsFirst: false })
      .limit(200)

    console.log(`[seo-content-gap-analysis-background] Found ${pages?.length || 0} pages, ${keywords?.length || 0} keywords`)

    // Get competitor data
    let competitorData = []
    if (includeCompetitors) {
      const { data: competitors } = await supabase
        .from('seo_competitor_analysis')
        .select('competitor_domain, keyword_gap_data, content_topics, strengths')
        .eq('site_id', siteId)
        .eq('is_active', true)

      competitorData = competitors || []
    }

    // Analyze with AI
    console.log('[seo-content-gap-analysis-background] Running AI analysis...')
    const analysis = await analyzeGapsWithAI(openai, {
      knowledge,
      pages: pages || [],
      keywords: keywords || [],
      competitors: competitorData,
      focusTopics
    })

    console.log(`[seo-content-gap-analysis-background] Found ${analysis.gaps?.length || 0} gaps`)

    // Save gaps to database
    const savedGaps = []

    for (const gap of analysis.gaps || []) {
      const existingPage = pages?.find(p => 
        p.title?.toLowerCase().includes(gap.topic.toLowerCase()) ||
        p.url?.toLowerCase().includes(gap.topic.split(' ')[0].toLowerCase())
      )

      const { data: saved, error } = await supabase
        .from('seo_content_gaps')
        .upsert({
          site_id: siteId,
          topic: gap.topic,
          keywords: gap.keywords || [],
          search_volume_total: gap.searchVolume || 0,
          gap_type: existingPage ? (gap.isThin ? 'thin_content' : 'outdated') : 'missing_page',
          competitor_coverage: gap.competitorCoverage || [],
          our_coverage: existingPage ? 'partial' : 'none',
          existing_page_id: existingPage?.id,
          ai_importance_score: gap.importanceScore || 50,
          ai_reasoning: gap.reasoning,
          ai_suggested_title: gap.suggestedTitle,
          ai_suggested_url: gap.suggestedUrl,
          ai_suggested_outline: gap.outline || [],
          ai_suggested_word_count: gap.suggestedWordCount || 1500,
          ai_content_type: gap.contentType || 'blog_post',
          ai_suggested_schema: gap.schemaType,
          estimated_traffic_potential: gap.trafficPotential || 0,
          estimated_effort: gap.effort || 'medium',
          priority: gap.priority || 'medium',
          status: 'identified',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'site_id,topic'
        })
        .select()
        .single()

      if (!error && saved) {
        savedGaps.push(saved)
      }
    }

    // Create AI recommendations for top gaps
    const topGaps = savedGaps
      .sort((a, b) => (b.ai_importance_score || 0) - (a.ai_importance_score || 0))
      .slice(0, 15)

    console.log(`[seo-content-gap-analysis-background] Creating recommendations...`)
    for (const gap of topGaps) {
      await supabase
        .from('seo_ai_recommendations')
        .upsert({
          site_id: siteId,
          category: 'content',
          subcategory: 'content_gap',
          priority: gap.priority,
          title: `Create: ${gap.ai_suggested_title || gap.topic}`,
          description: gap.ai_reasoning,
          suggested_value: gap.ai_suggested_url,
          ai_reasoning: gap.ai_reasoning,
          ai_confidence: 0.8,
          predicted_impact: {
            metric: 'traffic',
            predicted: gap.estimated_traffic_potential
          },
          estimated_traffic_gain: gap.estimated_traffic_potential,
          effort: gap.estimated_effort,
          auto_fixable: false,
          one_click_fixable: false,
          status: 'pending',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'site_id,title'
        })
    }

    const result = {
      success: true,
      gapsFound: savedGaps.length,
      byType: {
        missingPage: savedGaps.filter(g => g.gap_type === 'missing_page').length,
        thinContent: savedGaps.filter(g => g.gap_type === 'thin_content').length,
        outdated: savedGaps.filter(g => g.gap_type === 'outdated').length
      },
      totalTrafficPotential: savedGaps.reduce((sum, g) => sum + (g.estimated_traffic_potential || 0), 0),
      topOpportunities: topGaps.map(g => ({
        topic: g.topic,
        suggestedTitle: g.ai_suggested_title,
        contentType: g.ai_content_type,
        trafficPotential: g.estimated_traffic_potential,
        priority: g.priority,
        effort: g.estimated_effort
      }))
    }

    console.log('[seo-content-gap-analysis-background] Complete')

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
    console.error('[seo-content-gap-analysis-background] Error:', error)

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

async function analyzeGapsWithAI(openai, { knowledge, pages, keywords, competitors, focusTopics }) {
  try {
    const ourTopics = pages.map(p => p.title).filter(Boolean)
    const ourKeywords = keywords.map(k => k.keyword)
    
    const competitorKeywords = competitors.flatMap(c => 
      (c.keyword_gap_data || []).map(k => k.keyword || k)
    )
    
    const competitorTopics = competitors.flatMap(c => c.content_topics || [])

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an SEO content strategist analyzing content gaps. Identify topics and keywords that are:
1. Covered by competitors but not by us
2. Important for the industry but missing from our site
3. Related to our services but not addressed
4. Questions our target audience is asking

For each gap, assess:
- Search volume potential
- Competition level
- Relevance to business
- Content type needed
- Priority level`
        },
        {
          role: 'user',
          content: `Analyze content gaps for this business:

Business: ${knowledge?.business_name || 'Unknown'}
Industry: ${knowledge?.industry || 'general'}
Services: ${JSON.stringify(knowledge?.primary_services || [])}
Target Audience: ${JSON.stringify(knowledge?.target_personas || [])}

Our Current Topics (${ourTopics.length} pages):
${ourTopics.slice(0, 30).join('\n')}

Our Keywords (${ourKeywords.length} keywords):
${ourKeywords.slice(0, 50).join(', ')}

Competitor Topics:
${competitorTopics.slice(0, 50).join(', ')}

Competitor Keywords We Don't Rank For:
${competitorKeywords.slice(0, 50).join(', ')}

${focusTopics.length > 0 ? `Focus on these topics: ${focusTopics.join(', ')}` : ''}

Identify 10-20 content gaps. Respond with JSON:
{
  "gaps": [
    {
      "topic": "Topic name",
      "keywords": ["kw1", "kw2"],
      "searchVolume": 500,
      "competitorCoverage": ["competitor1.com", "competitor2.com"],
      "importanceScore": 85,
      "reasoning": "Why this gap matters",
      "suggestedTitle": "Suggested article title",
      "suggestedUrl": "/suggested-url",
      "outline": ["Section 1", "Section 2"],
      "suggestedWordCount": 2000,
      "contentType": "blog_post|service_page|landing_page|guide|faq",
      "schemaType": "Article|Service|FAQPage|HowTo",
      "trafficPotential": 150,
      "effort": "quick|medium|significant",
      "priority": "critical|high|medium|low",
      "isThin": false
    }
  ]
}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4
    })

    return JSON.parse(response.choices[0].message.content)
  } catch (error) {
    console.error('[seo-content-gap-analysis-background] AI error:', error)
    return { gaps: [] }
  }
}
