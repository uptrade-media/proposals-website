/**
 * SEO Predictive Ranking Background Function
 * 
 * Predicts ranking potential for pages using AI analysis.
 * Background functions can run up to 15 minutes.
 * 
 * Triggered by POST from seo-predictive-ranking.js
 */

import { createClient } from '@supabase/supabase-js'
import { SEOSkill } from './skills/seo-skill.js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Ranking factor weights
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

export default async function handler(req) {
  console.log('[seo-predictive-ranking-background] Starting...')

  try {
    const { 
      siteId, 
      pageIds, // Can analyze multiple pages in background
      targetKeyword,
      draftContent,
      draftTitle,
      draftUrl,
      jobId 
    } = await req.json()

    if (!siteId) {
      return new Response(JSON.stringify({ error: 'siteId required' }), { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Update job status if jobId provided
    if (jobId) {
      await supabase
        .from('seo_background_jobs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', jobId)
    }

    console.log(`[seo-predictive-ranking-background] Generating predictions for site ${siteId}`)

    // Get site data
    const { data: site } = await supabase
      .from('seo_sites')
      .select('domain, org_id, org:organizations(name)')
      .eq('id', siteId)
      .single()

    if (!site) {
      return new Response(JSON.stringify({ error: 'Site not found' }), { status: 404 })
    }

    const seoSkill = new SEOSkill(supabase, site.org_id, siteId, {})

    // Get site knowledge
    const { data: knowledge } = await supabase
      .from('seo_knowledge_base')
      .select('*')
      .eq('site_id', siteId)
      .single()

    // Determine pages to analyze
    let pagesToAnalyze = []
    
    if (pageIds?.length > 0) {
      const { data: pages } = await supabase
        .from('seo_pages')
        .select('*')
        .in('id', pageIds)
      pagesToAnalyze = pages || []
    } else if (draftContent) {
      // Single draft content
      pagesToAnalyze = [{ 
        id: null,
        isDraft: true,
        title: draftTitle,
        url: draftUrl,
        content_text: draftContent
      }]
    } else {
      // Analyze top pages without recent predictions
      const { data: pages } = await supabase
        .from('seo_pages')
        .select('*')
        .eq('site_id', siteId)
        .gt('clicks_28d', 0)
        .order('clicks_28d', { ascending: false })
        .limit(50)
      pagesToAnalyze = pages || []
    }

    console.log(`[seo-predictive-ranking-background] Analyzing ${pagesToAnalyze.length} pages...`)

    const results = []

    for (const page of pagesToAnalyze) {
      // Get keyword data for this page
      let keyword = targetKeyword
      let keywordData = null

      if (!keyword && page.url) {
        const { data: kwData } = await supabase
          .from('seo_keyword_universe')
          .select('*')
          .eq('site_id', siteId)
          .eq('target_page_url', page.url)
          .order('search_volume_monthly', { ascending: false })
          .limit(1)
          .single()
        
        if (kwData) {
          keyword = kwData.keyword
          keywordData = kwData
        }
      }

      // Calculate current scores
      const scores = calculateRankingScores({
        page,
        content: page.content_text || page.content_summary,
        title: page.title,
        url: page.url,
        keyword,
        keywordData,
        knowledge
      })

      // Generate predictions with AI
      const predictions = await generateAIPredictions(seoSkill, scores, {
        content: page.content_text || page.content_summary,
        title: page.title,
        keyword,
        currentPosition: page.avg_position_28d
      })

      // Calculate overall score
      const overallScore = Object.entries(scores).reduce((total, [key, value]) => {
        return total + (value * (RANKING_FACTORS[key] || 0))
      }, 0)

      const predictedPosition = scoreToPosition(overallScore)
      const currentPosition = page.avg_position_28d || 100
      const estimatedCtr = positionToCtr(predictedPosition)
      const searchVolume = keywordData?.search_volume_monthly || 500
      const predictedTraffic = Math.round(searchVolume * estimatedCtr)

      // Save prediction
      const prediction = {
        site_id: siteId,
        page_id: page.id || null,
        url: page.url,
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
        is_draft: page.isDraft || false
      }

      if (page.id) {
        await supabase
          .from('seo_predictive_scores')
          .upsert(prediction, { onConflict: 'page_id' })

        await supabase
          .from('seo_pages')
          .update({ predictive_score: Math.round(overallScore) })
          .eq('id', page.id)
      }

      results.push({
        pageId: page.id,
        url: page.url,
        currentPosition,
        predictedPosition,
        predictedTraffic,
        overallScore: Math.round(overallScore),
        confidence: predictions.confidence,
        topImprovements: predictions.improvementFactors?.slice(0, 3)
      })
    }

    const result = {
      success: true,
      pagesAnalyzed: results.length,
      predictions: results,
      summary: {
        avgScore: Math.round(results.reduce((sum, r) => sum + r.overallScore, 0) / results.length),
        avgPredictedPosition: Math.round(results.reduce((sum, r) => sum + r.predictedPosition, 0) / results.length),
        totalPredictedTraffic: results.reduce((sum, r) => sum + r.predictedTraffic, 0)
      }
    }

    console.log('[seo-predictive-ranking-background] Complete')

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
    console.error('[seo-predictive-ranking-background] Error:', error)

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

function calculateRankingScores({ page, content, title, url, keyword, keywordData, knowledge }) {
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

  // Backlinks
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

  // Domain Authority
  if (knowledge?.market_position === 'leader') scores.domainAuthority = 80
  else if (knowledge?.market_position === 'challenger') scores.domainAuthority = 60

  return scores
}

async function generateAIPredictions(seoSkill, scores, context) {
  try {
    const result = await seoSkill.signal.invoke({
      module: 'seo',
      tool: 'predict_ranking_improvements',
      systemPrompt: `You are an SEO prediction expert. Based on ranking factor scores and content analysis, predict ranking improvements and provide specific recommendations.`,
      userPrompt: `Analyze and predict ranking potential:

Current Scores: ${JSON.stringify(scores)}
Target Keyword: "${context.keyword}"
Current Position: ${context.currentPosition || 'not ranking'}
Title: "${context.title}"
Content Length: ${context.content?.split(/\s+/).length || 0} words

Respond with JSON:
{
  "confidence": 0.75,
  "improvementFactors": [
    {
      "factor": "content_length",
      "current": "1200 words",
      "suggested": "2000 words",
      "impact_score": 15,
      "predicted_position_change": -3,
      "effort": "quick|medium|significant"
    }
  ],
  "ifAddWords": {
    "words_to_add": 800,
    "predicted_position": 5,
    "predicted_traffic_increase": 150
  },
  "ifAddLinks": {
    "links_to_add": 5,
    "predicted_position": 7
  },
  "ifImproveSpeed": {
    "lcp_target_ms": 2000,
    "predicted_position": 8
  },
  "ifAddBacklinks": {
    "links_needed": 10,
    "predicted_position": 4
  },
  "ifUpdateTitle": {
    "suggested_title": "Better title here",
    "predicted_ctr_increase": 0.02
  }
}`,
      responseFormat: { type: 'json_object' },
      temperature: 0.3
    })

    return result
  } catch (error) {
    console.error('[seo-predictive-ranking-background] AI error:', error)
    return {
      confidence: 0.5,
      improvementFactors: []
    }
  }
}

function scoreToPosition(score) {
  if (score >= 90) return 1
  if (score >= 85) return 2
  if (score >= 80) return 3
  if (score >= 75) return 5
  if (score >= 70) return 7
  if (score >= 65) return 10
  if (score >= 55) return 15
  if (score >= 45) return 25
  return 50
}

function positionToCtr(position) {
  const ctrByPosition = {
    1: 0.316,
    2: 0.158,
    3: 0.107,
    4: 0.076,
    5: 0.058,
    6: 0.045,
    7: 0.036,
    8: 0.030,
    9: 0.025,
    10: 0.022
  }
  return ctrByPosition[Math.round(position)] || 0.01
}
