// netlify/functions/seo-serp-analyze-background.mjs
// Background function for SERP Feature Analysis (up to 15 min timeout)
// Analyzes keywords for SERP feature opportunities with AI
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const SEO_AI_MODEL = process.env.SEO_AI_MODEL || 'gpt-4o'

function createSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const supabase = createSupabaseAdmin()

  try {
    const body = JSON.parse(event.body || '{}')
    const { siteId, orgId, userId, keywords = [], analyzeTopKeywords = 50, jobId: existingJobId } = body

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
    }

    // Create job record
    let jobId = existingJobId
    if (!jobId) {
      const { data: job, error: jobError } = await supabase
        .from('seo_background_jobs')
        .insert({
          site_id: siteId,
          org_id: orgId,
          job_type: 'serp_feature_analysis',
          status: 'running',
          progress: 0,
          started_by: userId,
          started_at: new Date().toISOString()
        })
        .select()
        .single()

      if (jobError) {
        console.error('[SERP Background] Failed to create job:', jobError)
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to create job' }) }
      }
      jobId = job.id
    } else {
      await supabase
        .from('seo_background_jobs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', jobId)
    }

    // Return 202 Accepted immediately
    const response = {
      statusCode: 202,
      headers,
      body: JSON.stringify({
        success: true,
        jobId,
        message: 'SERP feature analysis started in background',
        pollUrl: `/.netlify/functions/seo-background-jobs?jobId=${jobId}`
      })
    }

    // Start background processing
    processSerpAnalysis(supabase, siteId, jobId, keywords, analyzeTopKeywords).catch(err => {
      console.error('[SERP Background] Processing error:', err)
      supabase
        .from('seo_background_jobs')
        .update({
          status: 'failed',
          error_message: err.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)
    })

    return response

  } catch (error) {
    console.error('[SERP Background] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}

async function processSerpAnalysis(supabase, siteId, jobId, providedKeywords, analyzeTopKeywords) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  try {
    await updateJobProgress(supabase, jobId, 5, 'Fetching keywords...')

    // Get keywords to analyze
    let keywordsToAnalyze = []
    if (providedKeywords.length > 0) {
      // Use provided keywords
      const { data } = await supabase
        .from('seo_keyword_universe')
        .select('*')
        .eq('site_id', siteId)
        .in('keyword', providedKeywords)
      keywordsToAnalyze = data || []
    } else {
      // Get top keywords by impressions
      const { data } = await supabase
        .from('seo_keyword_universe')
        .select('*')
        .eq('site_id', siteId)
        .gt('impressions_28d', 10)
        .order('impressions_28d', { ascending: false })
        .limit(analyzeTopKeywords)
      keywordsToAnalyze = data || []
    }

    if (keywordsToAnalyze.length === 0) {
      await supabase
        .from('seo_background_jobs')
        .update({
          status: 'completed',
          progress: 100,
          result: {
            success: true,
            message: 'No keywords found to analyze',
            analyzed: 0
          },
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)
      return
    }

    await updateJobProgress(supabase, jobId, 10, 'Fetching site knowledge...')

    // Get site knowledge for context
    const { data: knowledge } = await supabase
      .from('seo_knowledge_base')
      .select('*')
      .eq('site_id', siteId)
      .single()

    // Batch keywords for efficient AI processing (groups of 10)
    const batches = []
    for (let i = 0; i < keywordsToAnalyze.length; i += 10) {
      batches.push(keywordsToAnalyze.slice(i, i + 10))
    }

    const allResults = []
    const totalBatches = batches.length

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      const progress = Math.round(10 + (batchIndex / totalBatches) * 70)
      await updateJobProgress(supabase, jobId, progress, `Analyzing batch ${batchIndex + 1}/${totalBatches}...`)

      try {
        const batchResults = await analyzeBatchForSerpFeatures(openai, batch, knowledge)
        
        // Update keywords in database
        for (const result of batchResults) {
          const keywordRecord = batch.find(k => k.keyword === result.keyword)
          if (keywordRecord) {
            await supabase
              .from('seo_keyword_universe')
              .update({
                serp_features: result.likely_serp_features,
                intent: result.search_intent,
                is_question: result.is_question,
                serp_opportunity_score: result.opportunity_score,
                updated_at: new Date().toISOString()
              })
              .eq('id', keywordRecord.id)
          }
          allResults.push(result)
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 300))

      } catch (batchError) {
        console.error(`[SERP Background] Batch ${batchIndex} error:`, batchError)
      }
    }

    await updateJobProgress(supabase, jobId, 85, 'Generating opportunities...')

    // Generate actionable opportunities
    const opportunities = generateSerpOpportunities(allResults, keywordsToAnalyze)

    // Store opportunities as recommendations
    const recommendationsToInsert = opportunities.slice(0, 20).map(opp => ({
      site_id: siteId,
      category: 'serp_features',
      subcategory: opp.featureType,
      priority: opp.priority,
      title: `Capture ${opp.featureType.replace('_', ' ')} for "${opp.keyword}"`,
      description: opp.opportunity,
      details: {
        keyword: opp.keyword,
        currentPosition: opp.currentPosition,
        estimatedTrafficGain: opp.estimatedTrafficGain,
        contentRecommendations: opp.contentRecommendations
      },
      effort: opp.effort || 'medium',
      auto_fixable: false,
      one_click_fixable: false,
      status: 'pending',
      ai_model: SEO_AI_MODEL,
      created_at: new Date().toISOString()
    }))

    if (recommendationsToInsert.length > 0) {
      // Clear old SERP feature recommendations
      await supabase
        .from('seo_ai_recommendations')
        .delete()
        .eq('site_id', siteId)
        .eq('category', 'serp_features')

      await supabase
        .from('seo_ai_recommendations')
        .insert(recommendationsToInsert)
    }

    await updateJobProgress(supabase, jobId, 95, 'Finalizing...')

    // Calculate summary stats
    const featureCounts = {}
    allResults.forEach(r => {
      (r.likely_serp_features || []).forEach(f => {
        featureCounts[f] = (featureCounts[f] || 0) + 1
      })
    })

    // Complete job
    await supabase
      .from('seo_background_jobs')
      .update({
        status: 'completed',
        progress: 100,
        result: {
          success: true,
          analyzed: allResults.length,
          featureCounts,
          opportunities: opportunities.length,
          topOpportunities: opportunities.slice(0, 10),
          summary: {
            featuredSnippetOpportunities: opportunities.filter(o => o.featureType === 'featured_snippet').length,
            paaOpportunities: opportunities.filter(o => o.featureType === 'people_also_ask').length,
            localPackOpportunities: opportunities.filter(o => o.featureType === 'local_pack').length,
            videoOpportunities: opportunities.filter(o => o.featureType === 'video_carousel').length
          }
        },
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId)

    console.log(`[SERP Background] Completed job ${jobId} - ${allResults.length} keywords analyzed`)

  } catch (error) {
    console.error('[SERP Background] Processing error:', error)
    await supabase
      .from('seo_background_jobs')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId)
    throw error
  }
}

async function analyzeBatchForSerpFeatures(openai, keywords, knowledge) {
  const keywordList = keywords.map(k => ({
    keyword: k.keyword,
    position: k.current_position,
    impressions: k.impressions_28d,
    clicks: k.clicks_28d
  }))

  try {
    const response = await openai.chat.completions.create({
      model: SEO_AI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an expert in SERP feature optimization. Analyze keywords and identify which SERP features are likely present and which ones the site can capture.

Available SERP features:
- featured_snippet (paragraph, list, table, video)
- people_also_ask
- local_pack
- knowledge_panel
- video_carousel
- image_pack
- shopping_results
- top_stories
- site_links
- faq_rich_result`
        },
        {
          role: 'user',
          content: `Analyze these keywords for SERP feature opportunities:

BUSINESS CONTEXT:
- Industry: ${knowledge?.industry || 'Unknown'}
- Is Local: ${knowledge?.is_local_business || false}
- Services: ${knowledge?.primary_services?.map(s => s.name || s).join(', ') || 'Unknown'}

KEYWORDS:
${JSON.stringify(keywordList, null, 2)}

For each keyword, identify:
1. Which SERP features are likely present
2. Search intent
3. If it's a question query
4. Opportunity score (1-10) based on position and feature potential

Return JSON:
{
  "results": [
    {
      "keyword": "keyword text",
      "likely_serp_features": ["featured_snippet", "people_also_ask"],
      "search_intent": "informational|transactional|navigational|commercial",
      "is_question": true/false,
      "opportunity_score": 1-10,
      "best_feature_target": "featured_snippet",
      "optimization_tip": "Brief tip for capturing the feature"
    }
  ]
}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })

    const result = JSON.parse(response.choices[0].message.content)
    return result.results || []
  } catch (error) {
    console.error('[SERP Background] Batch analysis error:', error)
    return []
  }
}

function generateSerpOpportunities(analysisResults, originalKeywords) {
  const opportunities = []

  for (const result of analysisResults) {
    const keywordData = originalKeywords.find(k => k.keyword === result.keyword)
    if (!keywordData) continue

    const position = keywordData.current_position
    const impressions = keywordData.impressions_28d || 0
    const features = result.likely_serp_features || []

    // Featured snippet opportunities (position 2-10)
    if (features.includes('featured_snippet') && position >= 2 && position <= 10) {
      opportunities.push({
        keyword: result.keyword,
        currentPosition: position,
        featureType: 'featured_snippet',
        opportunity: `Page ranks #${Math.round(position)} - optimize to capture featured snippet`,
        priority: position <= 5 ? 'high' : 'medium',
        estimatedTrafficGain: Math.round(impressions * 0.25),
        effort: 'medium',
        contentRecommendations: [
          'Add clear, concise answer paragraph (40-60 words)',
          'Use structured headings (H2, H3)',
          'Include definition-style content',
          result.optimization_tip
        ].filter(Boolean)
      })
    }

    // People Also Ask opportunities
    if (features.includes('people_also_ask') && position <= 20 && result.is_question) {
      opportunities.push({
        keyword: result.keyword,
        currentPosition: position,
        featureType: 'people_also_ask',
        opportunity: 'Question-based query can target PAA box',
        priority: 'medium',
        estimatedTrafficGain: Math.round(impressions * 0.1),
        effort: 'quick',
        contentRecommendations: [
          'Add FAQ section with this question',
          'Provide concise, direct answer',
          'Add FAQ schema markup'
        ]
      })
    }

    // Local pack opportunities
    if (features.includes('local_pack') && position <= 20) {
      opportunities.push({
        keyword: result.keyword,
        currentPosition: position,
        featureType: 'local_pack',
        opportunity: 'Local query can target Local Pack',
        priority: position <= 5 ? 'high' : 'medium',
        estimatedTrafficGain: Math.round(impressions * 0.3),
        effort: 'medium',
        contentRecommendations: [
          'Optimize Google Business Profile',
          'Build local citations',
          'Get customer reviews',
          'Ensure NAP consistency'
        ]
      })
    }

    // Video carousel opportunities
    if (features.includes('video_carousel') && position <= 15) {
      opportunities.push({
        keyword: result.keyword,
        currentPosition: position,
        featureType: 'video_carousel',
        opportunity: 'Create video content to appear in carousel',
        priority: 'low',
        estimatedTrafficGain: Math.round(impressions * 0.15),
        effort: 'significant',
        contentRecommendations: [
          'Create YouTube video targeting this keyword',
          'Optimize video title and description',
          'Add video to relevant page'
        ]
      })
    }
  }

  // Sort by estimated traffic gain
  return opportunities.sort((a, b) => b.estimatedTrafficGain - a.estimatedTrafficGain)
}

async function updateJobProgress(supabase, jobId, progress, message) {
  await supabase
    .from('seo_background_jobs')
    .update({
      progress,
      progress_message: message,
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId)
}
