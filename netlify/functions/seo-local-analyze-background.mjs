// netlify/functions/seo-local-analyze-background.mjs
// Background function for Local SEO Analysis (up to 15 min timeout)
// Comprehensive local search optimization with AI
import { createClient } from '@supabase/supabase-js'
import { SEOSkill } from './skills/seo-skill.js'

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
    const { siteId, orgId, userId, includeCompetitorAnalysis = false, jobId: existingJobId } = body

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
    }

    // Create job record to track progress
    let jobId = existingJobId
    if (!jobId) {
      const { data: job, error: jobError } = await supabase
        .from('seo_background_jobs')
        .insert({
          site_id: siteId,
          org_id: orgId,
          job_type: 'local_seo_analysis',
          status: 'running',
          progress: 0,
          started_by: userId,
          started_at: new Date().toISOString()
        })
        .select()
        .single()

      if (jobError) {
        console.error('[Local SEO Background] Failed to create job:', jobError)
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to create job' }) }
      }
      jobId = job.id
    } else {
      // Update existing job to running
      await supabase
        .from('seo_background_jobs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', jobId)
    }

    // Return 202 Accepted immediately - client will poll for status
    const response = {
      statusCode: 202,
      headers,
      body: JSON.stringify({
        success: true,
        jobId,
        message: 'Local SEO analysis started in background',
        pollUrl: `/.netlify/functions/seo-background-jobs?jobId=${jobId}`
      })
    }

    // Get site to fetch orgId for SEOSkill
    const { data: siteForOrg } = await supabase
      .from('seo_sites')
      .select('org_id')
      .eq('id', siteId)
      .single()

    const seoSkill = siteForOrg 
      ? new SEOSkill(supabase, siteForOrg.org_id, siteId, {})
      : null

    // Start background processing
    processLocalSeoAnalysis(supabase, siteId, jobId, includeCompetitorAnalysis, seoSkill).catch(err => {
      console.error('[Local SEO Background] Processing error:', err)
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
    console.error('[Local SEO Background] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}

async function processLocalSeoAnalysis(supabase, siteId, jobId, includeCompetitorAnalysis, seoSkill) {
  try {
    // Update progress: Getting data
    await updateJobProgress(supabase, jobId, 10, 'Fetching site data...')

    // Get all relevant data
    const [knowledgeResult, pagesResult, keywordsResult, siteResult] = await Promise.all([
      supabase.from('seo_knowledge_base').select('*').eq('site_id', siteId).single(),
      supabase.from('seo_pages').select('*').eq('site_id', siteId).limit(200),
      supabase.from('seo_keyword_universe').select('*').eq('site_id', siteId).eq('is_local', true).limit(200),
      supabase.from('seo_sites').select('*, org:organizations(name, domain)').eq('id', siteId).single()
    ])

    const knowledge = knowledgeResult.data
    const pages = pagesResult.data || []
    const localKeywords = keywordsResult.data || []
    const site = siteResult.data

    if (!knowledge?.is_local_business) {
      await supabase
        .from('seo_background_jobs')
        .update({
          status: 'completed',
          progress: 100,
          result: {
            success: true,
            message: 'Site is not marked as a local business. Update site knowledge to enable local SEO analysis.',
            recommendations: []
          },
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)
      return
    }

    await updateJobProgress(supabase, jobId, 25, 'Analyzing location pages...')

    // Identify location pages
    const locationPages = pages.filter(p =>
      p.url.includes('location') ||
      p.url.includes('service-area') ||
      p.url.includes('near')
    )

    // Identify missing location pages
    const serviceAreas = knowledge?.service_areas || []
    const existingLocationPageUrls = locationPages.map(p => p.url.toLowerCase())
    const missingLocationPages = serviceAreas.filter(area => {
      const areaSlug = area.name?.toLowerCase().replace(/\s+/g, '-')
      return !existingLocationPageUrls.some(url => url.includes(areaSlug))
    })

    await updateJobProgress(supabase, jobId, 40, 'Analyzing local keywords...')

    // Build context for AI analysis
    const analysisContext = {
      business: {
        name: knowledge.business_name || site?.org?.name,
        domain: site?.domain,
        industry: knowledge.industry,
        primaryLocation: knowledge.primary_location,
        serviceAreas: serviceAreas,
        serviceRadius: knowledge.service_radius_miles
      },
      currentState: {
        totalPages: pages.length,
        locationPages: locationPages.length,
        localKeywords: localKeywords.length,
        localKeywordsRanking: localKeywords.filter(k => k.current_position <= 20).length,
        missingLocationPages: missingLocationPages.length
      },
      topLocalKeywords: localKeywords.slice(0, 30).map(k => ({
        keyword: k.keyword,
        position: k.current_position,
        impressions: k.impressions_28d,
        clicks: k.clicks_28d
      })),
      existingLocationPages: locationPages.slice(0, 20).map(p => ({
        url: p.url,
        title: p.title,
        clicks: p.clicks_28d
      }))
    }

    await updateJobProgress(supabase, jobId, 55, 'Running AI analysis...')

    // AI Analysis
    const prompt = `Analyze this local business's SEO and provide comprehensive recommendations.

BUSINESS PROFILE:
${JSON.stringify(analysisContext.business, null, 2)}

CURRENT STATE:
${JSON.stringify(analysisContext.currentState, null, 2)}

TOP LOCAL KEYWORDS:
${JSON.stringify(analysisContext.topLocalKeywords, null, 2)}

EXISTING LOCATION PAGES:
${JSON.stringify(analysisContext.existingLocationPages, null, 2)}

Provide a comprehensive local SEO analysis covering:
1. Google Business Profile optimization
2. Local landing page strategy (including which cities/areas need pages)
3. NAP (Name, Address, Phone) consistency
4. Local schema markup recommendations
5. Citation building priorities
6. Review strategy
7. Local content opportunities
8. Geo-targeted keyword opportunities
9. Competitor local SEO gaps

Return as JSON:
{
  "overallAssessment": "Brief overall assessment (2-3 sentences)",
  "localScore": 0-100,
  "priorityActions": [
    {
      "action": "Specific action to take",
      "category": "gbp|pages|citations|schema|reviews|content|keywords",
      "priority": "critical|high|medium|low",
      "estimatedImpact": "Description of expected impact",
      "effort": "quick|medium|significant",
      "specificInstructions": "Step-by-step how to implement"
    }
  ],
  "locationPageStrategy": {
    "missingPages": [{"city": "City 1", "priority": "high", "targetKeywords": ["keyword1"]}],
    "templateRecommendations": "How to structure location pages",
    "contentGuidelines": ["Guideline 1", "Guideline 2"],
    "internalLinkingStrategy": "How to link between location pages"
  },
  "gbpOptimization": [
    {
      "element": "Business Description|Categories|Photos|Posts|Q&A",
      "currentIssue": "What's wrong or missing",
      "recommendation": "What to optimize",
      "priority": "high|medium|low"
    }
  ],
  "schemaRecommendations": [
    {
      "schemaType": "LocalBusiness|Service|FAQPage",
      "implementation": "How to implement",
      "pages": "Which pages to add it to",
      "exampleMarkup": "Brief example"
    }
  ],
  "citationOpportunities": [
    {
      "platform": "Platform name",
      "category": "general|industry|local",
      "priority": "high|medium|low",
      "notes": "Any specific notes",
      "url": "Platform URL if known"
    }
  ],
  "keywordOpportunities": [
    {
      "keyword": "keyword phrase",
      "type": "city+service|near me|neighborhood",
      "monthlyVolume": "estimated volume",
      "difficulty": "easy|medium|hard",
      "suggestedPage": "URL or page type",
      "priority": "high|medium|low"
    }
  ],
  "reviewStrategy": {
    "currentState": "Assessment of review situation",
    "platforms": ["Google", "Yelp"],
    "recommendations": ["How to get more reviews"],
    "responseTemplates": {
      "positive": "Template for positive reviews",
      "negative": "Template for negative reviews"
    }
  }
}`

    const completion = await seoSkill.signal.invoke({
      module: 'seo',
      tool: 'local_seo_analysis',
      systemPrompt: 'You are an expert local SEO strategist. Provide specific, actionable recommendations for improving local search visibility. Focus on high-impact, practical optimizations that a business can implement.',
      userPrompt: prompt,
      responseFormat: { type: 'json_object' },
      temperature: 0.3
    })

    const analysis = completion

    await updateJobProgress(supabase, jobId, 75, 'Storing recommendations...')

    // Store recommendations in database
    const recommendationsToInsert = analysis.priorityActions.map(action => ({
      site_id: siteId,
      category: 'local',
      subcategory: action.category,
      priority: action.priority,
      title: action.action,
      description: action.estimatedImpact,
      details: {
        specificInstructions: action.specificInstructions,
        effort: action.effort
      },
      effort: action.effort,
      auto_fixable: false,
      one_click_fixable: action.category === 'schema',
      status: 'pending',
      ai_model: SEO_AI_MODEL,
      created_at: new Date().toISOString()
    }))

    if (recommendationsToInsert.length > 0) {
      // Clear old local recommendations first
      await supabase
        .from('seo_ai_recommendations')
        .delete()
        .eq('site_id', siteId)
        .eq('category', 'local')

      await supabase
        .from('seo_ai_recommendations')
        .insert(recommendationsToInsert)
    }

    await updateJobProgress(supabase, jobId, 90, 'Finalizing analysis...')

    // Save analysis run
    await supabase
      .from('seo_ai_analysis_runs')
      .insert({
        site_id: siteId,
        run_type: 'local_seo_analysis',
        status: 'completed',
        results: {
          localScore: analysis.localScore,
          overallAssessment: analysis.overallAssessment,
          recommendationsCreated: recommendationsToInsert.length,
          locationPagesNeeded: analysis.locationPageStrategy?.missingPages?.length || 0,
          citationsIdentified: analysis.citationOpportunities?.length || 0,
          keywordOpportunities: analysis.keywordOpportunities?.length || 0
        },
        ai_model: SEO_AI_MODEL,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })

    // Complete the job
    await supabase
      .from('seo_background_jobs')
      .update({
        status: 'completed',
        progress: 100,
        result: {
          success: true,
          analysis,
          recommendationsCreated: recommendationsToInsert.length,
          summary: {
            localScore: analysis.localScore,
            priorityActions: analysis.priorityActions?.length || 0,
            missingLocationPages: analysis.locationPageStrategy?.missingPages?.length || 0,
            citationOpportunities: analysis.citationOpportunities?.length || 0,
            keywordOpportunities: analysis.keywordOpportunities?.length || 0
          }
        },
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId)

    console.log(`[Local SEO Background] Completed job ${jobId} - ${recommendationsToInsert.length} recommendations created`)

  } catch (error) {
    console.error('[Local SEO Background] Processing error:', error)
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
