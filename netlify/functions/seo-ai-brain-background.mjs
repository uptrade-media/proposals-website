// netlify/functions/seo-ai-brain-background.mjs
// Background function for comprehensive AI SEO analysis - runs up to 15 minutes
// The "master brain" that generates all recommendations
import OpenAI from 'openai'
import { google } from 'googleapis'
import { createSupabaseAdmin } from './utils/supabase.js'

export const config = {
  type: 'background'
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Use env variable for model - easily update when new models release
const SEO_AI_MODEL = process.env.SEO_AI_MODEL || 'gpt-4o'

export async function handler(event) {
  const startTime = Date.now()
  
  try {
    const body = JSON.parse(event.body || '{}')
    const { 
      siteId, 
      userId,
      analysisType = 'comprehensive',
      focusAreas = [],
      pageIds = []
    } = body

    if (!siteId) {
      console.error('[AI Brain BG] No siteId provided')
      return
    }

    const supabase = createSupabaseAdmin()
    
    // Create analysis run record
    const { data: analysisRun, error: runError } = await supabase
      .from('seo_ai_analysis_runs')
      .insert({
        site_id: siteId,
        analysis_type: analysisType,
        triggered_by: 'manual',
        triggered_by_user: userId,
        scope_description: focusAreas.length > 0 ? `Focus: ${focusAreas.join(', ')}` : 'Full site analysis',
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    const runId = analysisRun?.id

    console.log(`[AI Brain BG] Starting ${analysisType} analysis for site ${siteId}`)

    // Fetch all required data
    const [siteData, knowledgeData, pagesData, gscData, existingRecs] = await Promise.all([
      fetchSiteData(supabase, siteId),
      fetchKnowledgeBase(supabase, siteId),
      fetchPagesData(supabase, siteId, pageIds),
      fetchGscData(siteId, supabase),
      fetchExistingRecommendations(supabase, siteId)
    ])

    if (!siteData) {
      await updateAnalysisRun(supabase, runId, 'failed', 'Site not found')
      return
    }

    const domain = siteData.org?.domain || siteData.domain
    console.log(`[AI Brain BG] Analyzing ${domain} with ${pagesData.length} pages`)

    // Clear old pending recommendations if doing comprehensive analysis
    if (analysisType === 'comprehensive') {
      await supabase
        .from('seo_ai_recommendations')
        .delete()
        .eq('site_id', siteId)
        .eq('status', 'pending')
    }

    let totalRecommendations = 0
    let criticalIssues = 0
    let quickWins = 0

    // Analysis 1: Title & Meta Optimization
    if (shouldAnalyze(focusAreas, ['title', 'meta', 'all'])) {
      console.log('[AI Brain BG] Running title/meta analysis...')
      const metaRecs = await analyzeMetadata(supabase, siteId, pagesData, knowledgeData, gscData, runId)
      totalRecommendations += metaRecs.count
      criticalIssues += metaRecs.critical
      quickWins += metaRecs.quickWins
    }

    // Analysis 2: Content Gaps
    if (shouldAnalyze(focusAreas, ['content', 'gaps', 'all'])) {
      console.log('[AI Brain BG] Running content gap analysis...')
      const contentRecs = await analyzeContentGaps(supabase, siteId, knowledgeData, gscData, runId)
      totalRecommendations += contentRecs.count
    }

    // Analysis 3: Keyword Opportunities  
    if (shouldAnalyze(focusAreas, ['keywords', 'all'])) {
      console.log('[AI Brain BG] Running keyword opportunity analysis...')
      const keywordRecs = await analyzeKeywordOpportunities(supabase, siteId, pagesData, gscData, knowledgeData, runId)
      totalRecommendations += keywordRecs.count
      quickWins += keywordRecs.quickWins
    }

    // Analysis 4: Internal Linking
    if (shouldAnalyze(focusAreas, ['links', 'internal', 'all'])) {
      console.log('[AI Brain BG] Running internal linking analysis...')
      const linkRecs = await analyzeInternalLinking(supabase, siteId, pagesData, runId)
      totalRecommendations += linkRecs.count
    }

    // Analysis 5: Technical SEO
    if (shouldAnalyze(focusAreas, ['technical', 'all'])) {
      console.log('[AI Brain BG] Running technical SEO analysis...')
      const techRecs = await analyzeTechnicalSeo(supabase, siteId, pagesData, runId)
      totalRecommendations += techRecs.count
      criticalIssues += techRecs.critical
    }

    // Analysis 6: Schema Markup
    if (shouldAnalyze(focusAreas, ['schema', 'all'])) {
      console.log('[AI Brain BG] Running schema analysis...')
      const schemaRecs = await analyzeSchemaOpportunities(supabase, siteId, pagesData, knowledgeData, runId)
      totalRecommendations += schemaRecs.count
    }

    // Analysis 7: Cannibalization Detection
    if (shouldAnalyze(focusAreas, ['cannibalization', 'all'])) {
      console.log('[AI Brain BG] Running cannibalization detection...')
      const cannibRecs = await analyzeCannibalization(supabase, siteId, pagesData, gscData, runId)
      totalRecommendations += cannibRecs.count
      criticalIssues += cannibRecs.critical
    }

    // Analysis 8: Content Decay
    if (shouldAnalyze(focusAreas, ['decay', 'freshness', 'all'])) {
      console.log('[AI Brain BG] Running content decay analysis...')
      const decayRecs = await analyzeContentDecay(supabase, siteId, pagesData, gscData, runId)
      totalRecommendations += decayRecs.count
      criticalIssues += decayRecs.critical
    }

    // Analysis 9: SERP Feature Opportunities
    if (shouldAnalyze(focusAreas, ['serp', 'features', 'snippets', 'all'])) {
      console.log('[AI Brain BG] Running SERP feature analysis...')
      const serpRecs = await analyzeSerpFeatures(supabase, siteId, pagesData, gscData, knowledgeData, runId)
      totalRecommendations += serpRecs.count
      quickWins += serpRecs.quickWins
    }

    // Analysis 10: Page Speed Impact
    if (shouldAnalyze(focusAreas, ['speed', 'performance', 'cwv', 'all'])) {
      console.log('[AI Brain BG] Running page speed impact analysis...')
      const speedRecs = await analyzePageSpeedImpact(supabase, siteId, pagesData, runId)
      totalRecommendations += speedRecs.count
    }

    // Analysis 11: Topic Clusters
    if (shouldAnalyze(focusAreas, ['clusters', 'pillars', 'all'])) {
      console.log('[AI Brain BG] Running topic cluster analysis...')
      const clusterRecs = await analyzeTopicClusters(supabase, siteId, pagesData, knowledgeData, runId)
      totalRecommendations += clusterRecs.count
    }

    // Calculate overall health score
    const healthScore = calculateHealthScore(pagesData, existingRecs, criticalIssues)

    // Update analysis run as complete
    const duration = Date.now() - startTime
    await supabase
      .from('seo_ai_analysis_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_ms: duration,
        recommendations_generated: totalRecommendations,
        critical_issues_found: criticalIssues,
        quick_wins_found: quickWins,
        health_score: healthScore,
        ai_model: SEO_AI_MODEL
      })
      .eq('id', runId)

    // Update site with latest analysis timestamp
    await supabase
      .from('seo_sites')
      .update({
        last_ai_analysis_at: new Date().toISOString(),
        seo_health_score: healthScore,
        updated_at: new Date().toISOString()
      })
      .eq('id', siteId)

    console.log(`[AI Brain BG] Analysis complete. Generated ${totalRecommendations} recommendations in ${duration}ms`)

  } catch (error) {
    console.error('[AI Brain BG] Error:', error)
    
    try {
      const supabase = createSupabaseAdmin()
      const body = JSON.parse(event.body || '{}')
      // Try to mark the run as failed
      await supabase
        .from('seo_ai_analysis_runs')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('site_id', body.siteId)
        .eq('status', 'running')
    } catch (e) {
      console.error('[AI Brain BG] Could not update failure status')
    }
  }
}

// Helper functions
function shouldAnalyze(focusAreas, triggers) {
  if (focusAreas.length === 0) return true
  return triggers.some(t => focusAreas.includes(t))
}

async function fetchSiteData(supabase, siteId) {
  const { data } = await supabase
    .from('seo_sites')
    .select('*, org:organizations(name, domain)')
    .eq('id', siteId)
    .single()
  return data
}

async function fetchKnowledgeBase(supabase, siteId) {
  const { data } = await supabase
    .from('seo_knowledge_base')
    .select('*')
    .eq('site_id', siteId)
    .single()
  return data
}

async function fetchPagesData(supabase, siteId, pageIds = []) {
  let query = supabase
    .from('seo_pages')
    .select('*')
    .eq('site_id', siteId)
  
  if (pageIds.length > 0) {
    query = query.in('id', pageIds)
  }
  
  const { data } = await query.limit(200)
  return data || []
}

async function fetchGscData(siteId, supabase) {
  // Fetch recent queries from seo_queries table
  const { data: queries } = await supabase
    .from('seo_queries')
    .select('*')
    .eq('site_id', siteId)
    .order('clicks_28d', { ascending: false })
    .limit(500)

  return {
    queries: queries || [],
    // Could add more GSC data here
  }
}

async function fetchExistingRecommendations(supabase, siteId) {
  const { data } = await supabase
    .from('seo_ai_recommendations')
    .select('*')
    .eq('site_id', siteId)
  return data || []
}

function calculateHealthScore(pages, existingRecs, criticalIssues) {
  let score = 100
  
  // Deduct for missing titles
  const missingTitles = pages.filter(p => !p.title && !p.managed_title).length
  score -= Math.min(missingTitles * 2, 20)
  
  // Deduct for missing meta descriptions
  const missingMeta = pages.filter(p => !p.meta_description && !p.managed_meta_description).length
  score -= Math.min(missingMeta * 1.5, 15)
  
  // Deduct for critical issues
  score -= Math.min(criticalIssues * 5, 25)
  
  // Deduct for pending recommendations
  const pendingRecs = existingRecs.filter(r => r.status === 'pending').length
  score -= Math.min(pendingRecs * 0.5, 20)
  
  return Math.max(0, Math.round(score))
}

async function updateAnalysisRun(supabase, runId, status, errorMessage = null) {
  if (!runId) return
  await supabase
    .from('seo_ai_analysis_runs')
    .update({
      status,
      error_message: errorMessage,
      completed_at: new Date().toISOString()
    })
    .eq('id', runId)
}

// ============ ANALYSIS FUNCTIONS ============

async function analyzeMetadata(supabase, siteId, pages, knowledge, gscData, runId) {
  const recommendations = []
  let critical = 0
  let quickWins = 0

  // Find pages with issues
  const pagesNeedingWork = pages.filter(p => {
    const hasTitle = p.title || p.managed_title
    const hasMeta = p.meta_description || p.managed_meta_description
    const titleLen = (p.managed_title || p.title || '').length
    const metaLen = (p.managed_meta_description || p.meta_description || '').length
    
    return !hasTitle || !hasMeta || titleLen > 60 || titleLen < 30 || metaLen > 160 || metaLen < 100
  }).slice(0, 20) // Limit to 20 pages per run

  if (pagesNeedingWork.length === 0) {
    return { count: 0, critical: 0, quickWins: 0 }
  }

  // Get related queries for these pages
  const pageUrls = pagesNeedingWork.map(p => p.url)
  const relevantQueries = gscData.queries.filter(q => 
    pageUrls.some(url => q.page_url === url || url.includes(q.query?.replace(/\s+/g, '-')))
  )

  // Use GPT-4.5-preview to generate optimized titles/meta
  const prompt = buildMetadataPrompt(pagesNeedingWork, knowledge, relevantQueries)

  try {
    const completion = await openai.chat.completions.create({
      model: SEO_AI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an expert SEO specialist. Generate optimized title tags and meta descriptions that maximize CTR while accurately representing page content. Consider the business context and target keywords.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })

    const suggestions = JSON.parse(completion.choices[0].message.content)

    // Create recommendations for each page
    for (const suggestion of (suggestions.pages || [])) {
      const page = pagesNeedingWork.find(p => p.url === suggestion.url || p.id === suggestion.page_id)
      if (!page) continue

      // Title recommendation
      if (suggestion.title && suggestion.title !== page.title) {
        const isCritical = !page.title
        if (isCritical) critical++
        
        recommendations.push({
          site_id: siteId,
          page_id: page.id,
          category: 'title',
          priority: isCritical ? 'critical' : 'high',
          title: `Optimize title tag: ${page.url.split('/').pop() || 'Homepage'}`,
          description: suggestion.title_reasoning || 'Improved title for better CTR and keyword targeting',
          current_value: page.title || page.managed_title,
          suggested_value: suggestion.title,
          field_name: 'managed_title',
          auto_fixable: true,
          one_click_fixable: true,
          effort: 'instant',
          ai_reasoning: suggestion.title_reasoning,
          ai_confidence: 0.85,
          ai_model: SEO_AI_MODEL,
          analysis_run_id: runId,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        quickWins++
      }

      // Meta description recommendation
      if (suggestion.meta_description && suggestion.meta_description !== page.meta_description) {
        recommendations.push({
          site_id: siteId,
          page_id: page.id,
          category: 'meta',
          priority: !page.meta_description ? 'high' : 'medium',
          title: `Optimize meta description: ${page.url.split('/').pop() || 'Homepage'}`,
          description: suggestion.meta_reasoning || 'Improved meta description for better CTR',
          current_value: page.meta_description || page.managed_meta_description,
          suggested_value: suggestion.meta_description,
          field_name: 'managed_meta_description',
          auto_fixable: true,
          one_click_fixable: true,
          effort: 'instant',
          ai_reasoning: suggestion.meta_reasoning,
          ai_confidence: 0.85,
          ai_model: SEO_AI_MODEL,
          analysis_run_id: runId,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        quickWins++
      }
    }

    // Batch insert recommendations
    if (recommendations.length > 0) {
      await supabase.from('seo_ai_recommendations').insert(recommendations)
    }

  } catch (e) {
    console.error('[AI Brain BG] Metadata analysis error:', e)
  }

  return { count: recommendations.length, critical, quickWins }
}

async function analyzeContentGaps(supabase, siteId, knowledge, gscData, runId) {
  if (!knowledge) return { count: 0 }

  const recommendations = []

  // Check for content gaps from knowledge base
  const gaps = knowledge.content_gaps_identified || []
  
  for (const gap of gaps.slice(0, 10)) {
    recommendations.push({
      site_id: siteId,
      category: 'content',
      subcategory: 'gap',
      priority: 'medium',
      title: `Create content for: ${gap}`,
      description: `Your site is missing content about "${gap}" which could attract relevant traffic.`,
      auto_fixable: false,
      effort: 'significant',
      ai_model: SEO_AI_MODEL,
      analysis_run_id: runId,
      status: 'pending',
      created_at: new Date().toISOString()
    })
  }

  if (recommendations.length > 0) {
    await supabase.from('seo_ai_recommendations').insert(recommendations)
  }

  return { count: recommendations.length }
}

async function analyzeKeywordOpportunities(supabase, siteId, pages, gscData, knowledge, runId) {
  const recommendations = []
  let quickWins = 0

  // Find striking distance keywords (positions 8-20)
  const strikingQueries = gscData.queries.filter(q => 
    q.avg_position_28d >= 8 && q.avg_position_28d <= 20 && q.impressions_28d > 50
  )

  for (const query of strikingQueries.slice(0, 15)) {
    recommendations.push({
      site_id: siteId,
      page_id: query.page_id,
      category: 'keyword',
      subcategory: 'striking_distance',
      priority: 'high',
      title: `Push to page 1: "${query.query}"`,
      description: `Currently ranking #${Math.round(query.avg_position_28d)} with ${query.impressions_28d} impressions. Small optimizations could push this to page 1.`,
      current_value: `Position ${query.avg_position_28d.toFixed(1)}`,
      suggested_value: query.query,
      auto_fixable: false,
      effort: 'medium',
      predicted_impact: {
        metric: 'position',
        current: query.avg_position_28d,
        predicted: Math.max(1, query.avg_position_28d - 5)
      },
      ai_model: SEO_AI_MODEL,
      analysis_run_id: runId,
      status: 'pending',
      created_at: new Date().toISOString()
    })
    quickWins++
  }

  if (recommendations.length > 0) {
    await supabase.from('seo_ai_recommendations').insert(recommendations)
  }

  return { count: recommendations.length, quickWins }
}

async function analyzeInternalLinking(supabase, siteId, pages, runId) {
  const recommendations = []

  // Find orphan pages (no internal links pointing to them)
  const orphanPages = pages.filter(p => (p.internal_links_in || 0) === 0 && p.clicks_28d > 0)

  for (const page of orphanPages.slice(0, 10)) {
    recommendations.push({
      site_id: siteId,
      page_id: page.id,
      category: 'link',
      subcategory: 'orphan',
      priority: 'medium',
      title: `Add internal links to: ${page.title || page.url}`,
      description: `This page has no internal links pointing to it, making it harder for search engines and users to discover.`,
      auto_fixable: false,
      effort: 'quick',
      ai_model: SEO_AI_MODEL,
      analysis_run_id: runId,
      status: 'pending',
      created_at: new Date().toISOString()
    })
  }

  if (recommendations.length > 0) {
    await supabase.from('seo_ai_recommendations').insert(recommendations)
  }

  return { count: recommendations.length }
}

async function analyzeTechnicalSeo(supabase, siteId, pages, runId) {
  const recommendations = []
  let critical = 0

  // Check for technical issues
  for (const page of pages) {
    // Duplicate titles
    const duplicateTitles = pages.filter(p => p.id !== page.id && p.title === page.title && page.title)
    if (duplicateTitles.length > 0 && !recommendations.find(r => r.current_value === page.title)) {
      recommendations.push({
        site_id: siteId,
        page_id: page.id,
        category: 'technical',
        subcategory: 'duplicate_title',
        priority: 'high',
        title: `Fix duplicate title tag`,
        description: `"${page.title}" is used on ${duplicateTitles.length + 1} pages. Each page should have a unique title.`,
        current_value: page.title,
        auto_fixable: false,
        effort: 'quick',
        ai_model: SEO_AI_MODEL,
        analysis_run_id: runId,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      critical++
    }

    // Missing canonical
    if (!page.canonical_url && page.url?.includes('?')) {
      recommendations.push({
        site_id: siteId,
        page_id: page.id,
        category: 'technical',
        subcategory: 'missing_canonical',
        priority: 'medium',
        title: `Add canonical tag`,
        description: `This URL has parameters but no canonical tag, which could cause duplicate content issues.`,
        auto_fixable: true,
        one_click_fixable: true,
        effort: 'instant',
        ai_model: SEO_AI_MODEL,
        analysis_run_id: runId,
        status: 'pending',
        created_at: new Date().toISOString()
      })
    }
  }

  if (recommendations.length > 0) {
    await supabase.from('seo_ai_recommendations').insert(recommendations)
  }

  return { count: recommendations.length, critical }
}

async function analyzeSchemaOpportunities(supabase, siteId, pages, knowledge, runId) {
  const recommendations = []

  const isLocalBusiness = knowledge?.is_local_business
  const hasServices = (knowledge?.primary_services?.length || 0) > 0

  // Check each page for schema opportunities
  for (const page of pages.slice(0, 30)) {
    const hasSchema = page.schema_types && page.schema_types.length > 0
    const isHomepage = page.url?.endsWith('/') || page.path === '/'
    const isServicePage = page.url?.includes('/service') || page.url?.includes('/what-we-do')
    const isBlogPost = page.url?.includes('/blog/') || page.url?.includes('/insights/')

    if (!hasSchema) {
      let schemaType = 'WebPage'
      let priority = 'low'

      if (isHomepage && isLocalBusiness) {
        schemaType = 'LocalBusiness'
        priority = 'high'
      } else if (isServicePage && hasServices) {
        schemaType = 'Service'
        priority = 'medium'
      } else if (isBlogPost) {
        schemaType = 'Article'
        priority = 'medium'
      }

      if (schemaType !== 'WebPage') {
        recommendations.push({
          site_id: siteId,
          page_id: page.id,
          category: 'schema',
          priority,
          title: `Add ${schemaType} schema`,
          description: `Adding ${schemaType} structured data can improve rich snippet visibility in search results.`,
          suggested_value: schemaType,
          auto_fixable: false,
          effort: 'medium',
          ai_model: SEO_AI_MODEL,
          analysis_run_id: runId,
          status: 'pending',
          created_at: new Date().toISOString()
        })
      }
    }
  }

  if (recommendations.length > 0) {
    await supabase.from('seo_ai_recommendations').insert(recommendations)
  }

  return { count: recommendations.length }
}

function buildMetadataPrompt(pages, knowledge, queries) {
  const businessContext = knowledge ? `
BUSINESS CONTEXT:
- Business: ${knowledge.business_name}
- Industry: ${knowledge.industry}
- Services: ${knowledge.primary_services?.map(s => s.name).join(', ')}
- USPs: ${knowledge.unique_selling_points?.join(', ')}
- Target Audience: ${knowledge.target_personas?.map(p => p.name).join(', ')}
` : ''

  const queriesContext = queries.length > 0 ? `
RELATED SEARCH QUERIES:
${queries.slice(0, 20).map(q => `- "${q.query}" (${q.clicks_28d} clicks, position ${q.avg_position_28d?.toFixed(1)})`).join('\n')}
` : ''

  const pagesInfo = pages.map(p => `
URL: ${p.url}
Current Title: ${p.title || p.managed_title || 'MISSING'}
Current Meta: ${p.meta_description || p.managed_meta_description || 'MISSING'}
H1: ${p.h1 || 'Unknown'}
`).join('\n---\n')

  return `${businessContext}
${queriesContext}

Optimize titles and meta descriptions for these pages:

${pagesInfo}

For each page, provide optimized versions. Return JSON:
{
  "pages": [
    {
      "url": "page url",
      "title": "Optimized title (50-60 chars)",
      "title_reasoning": "Why this title is better",
      "meta_description": "Compelling meta description (140-160 chars)",
      "meta_reasoning": "Why this meta is better"
    }
  ]
}`
}

// ===== NEW ANALYSIS FUNCTIONS =====

// Analysis 7: Cannibalization Detection
async function analyzeCannibalization(supabase, siteId, pages, gscData, runId) {
  const recommendations = []
  let criticalCount = 0

  // Get existing cannibalization data
  const { data: cannibIssues } = await supabase
    .from('seo_cannibalization')
    .select('*')
    .eq('site_id', siteId)
    .eq('status', 'detected')
    .order('estimated_traffic_loss', { ascending: false })
    .limit(20)

  for (const issue of cannibIssues || []) {
    const priority = issue.severity === 'critical' ? 'critical' : issue.severity === 'high' ? 'high' : 'medium'
    if (priority === 'critical') criticalCount++

    recommendations.push({
      site_id: siteId,
      page_id: issue.recommended_primary_page_id,
      category: 'cannibalization',
      priority,
      title: `Fix cannibalization: "${issue.keyword}"`,
      description: `${issue.page_count} pages compete for this keyword. Estimated ${issue.estimated_traffic_loss || 0} monthly clicks lost.`,
      current_value: issue.competing_pages?.map(p => p.url).join(', '),
      suggested_value: issue.ai_strategy,
      ai_reasoning: issue.ai_reasoning,
      supporting_data: { keyword: issue.keyword, pages: issue.competing_pages },
      effort: issue.ai_strategy === 'canonicalize' ? 'quick' : 'medium',
      ai_model: SEO_AI_MODEL,
      analysis_run_id: runId,
      status: 'pending'
    })
  }

  if (recommendations.length > 0) {
    await supabase.from('seo_ai_recommendations').insert(recommendations)
  }

  return { count: recommendations.length, critical: criticalCount }
}

// Analysis 8: Content Decay
async function analyzeContentDecay(supabase, siteId, pages, gscData, runId) {
  const recommendations = []
  let criticalCount = 0

  // Get decaying pages from existing analysis
  const { data: decayingPages } = await supabase
    .from('seo_content_decay')
    .select('*')
    .eq('site_id', siteId)
    .eq('status', 'detected')
    .order('decay_rate', { ascending: true })
    .limit(20)

  for (const decay of decayingPages || []) {
    const priority = decay.decay_rate < -50 ? 'critical' : decay.decay_rate < -30 ? 'high' : 'medium'
    if (priority === 'critical') criticalCount++

    const recommendation = decay.ai_recommendation || {}

    recommendations.push({
      site_id: siteId,
      page_id: decay.page_id,
      category: 'content_decay',
      priority,
      title: `Refresh decaying content: ${decay.title || decay.url}`,
      description: `Traffic dropped ${Math.abs(decay.decay_rate || 0).toFixed(0)}%. Previous: ${decay.previous_clicks} clicks, Current: ${decay.current_clicks} clicks.`,
      current_value: `Position ${decay.previous_position?.toFixed(1)} → ${decay.current_position?.toFixed(1)}`,
      suggested_value: recommendation.action || 'Update and refresh content',
      ai_reasoning: recommendation.reasoning || `Content has declined significantly. Consider updating with fresh information.`,
      effort: 'medium',
      ai_model: SEO_AI_MODEL,
      analysis_run_id: runId,
      status: 'pending'
    })
  }

  if (recommendations.length > 0) {
    await supabase.from('seo_ai_recommendations').insert(recommendations)
  }

  return { count: recommendations.length, critical: criticalCount }
}

// Analysis 9: SERP Feature Opportunities
async function analyzeSerpFeatures(supabase, siteId, pages, gscData, knowledge, runId) {
  const recommendations = []
  let quickWinCount = 0

  // Get SERP feature opportunities
  const { data: serpOpps } = await supabase
    .from('seo_serp_features')
    .select('*')
    .eq('site_id', siteId)
    .eq('status', 'opportunity')
    .gte('opportunity_score', 50)
    .order('opportunity_score', { ascending: false })
    .limit(20)

  for (const opp of serpOpps || []) {
    const isQuickWin = opp.win_probability === 'high' && 
      (opp.feature_type === 'faq' || opp.feature_type === 'featured_snippet')
    if (isQuickWin) quickWinCount++

    recommendations.push({
      site_id: siteId,
      page_id: opp.page_id,
      category: 'serp_feature',
      subcategory: opp.feature_type,
      priority: opp.opportunity_score >= 70 ? 'high' : 'medium',
      title: `Target ${opp.feature_type.replace('_', ' ')}: "${opp.keyword}"`,
      description: `Opportunity score: ${opp.opportunity_score}. ${opp.ai_strategy}`,
      current_value: `Position ${opp.our_position || 'not ranking'}`,
      suggested_value: opp.ai_strategy,
      ai_reasoning: JSON.stringify(opp.ai_required_changes || []),
      supporting_data: { 
        contentRequirements: opp.content_requirements,
        schemaRequirements: opp.schema_requirements,
        questions: opp.questions
      },
      effort: opp.content_requirements?.wordCount > 500 ? 'medium' : 'quick',
      ai_model: SEO_AI_MODEL,
      analysis_run_id: runId,
      status: 'pending'
    })
  }

  if (recommendations.length > 0) {
    await supabase.from('seo_ai_recommendations').insert(recommendations)
  }

  return { count: recommendations.length, quickWins: quickWinCount }
}

// Analysis 10: Page Speed Impact
async function analyzePageSpeedImpact(supabase, siteId, pages, runId) {
  const recommendations = []

  // Get pages with speed issues
  const { data: speedData } = await supabase
    .from('seo_pagespeed_impact')
    .select('*')
    .eq('site_id', siteId)
    .lt('performance_score', 75)
    .gt('priority_score', 50)
    .order('priority_score', { ascending: false })
    .limit(15)

  for (const speed of speedData || []) {
    const priority = speed.performance_score < 50 ? 'high' : 'medium'
    const topIssues = (speed.speed_issues || []).slice(0, 3)

    recommendations.push({
      site_id: siteId,
      page_id: speed.page_id,
      category: 'technical',
      subcategory: 'page_speed',
      priority,
      title: `Improve page speed: ${speed.url}`,
      description: `Performance score: ${speed.performance_score}. Potential traffic gain: +${speed.potential_traffic_gain || 0}/month.`,
      current_value: `LCP: ${speed.lcp_ms}ms, CLS: ${speed.cls}`,
      suggested_value: topIssues.map(i => i.issue).join(', '),
      ai_reasoning: `Improving Core Web Vitals could improve position from ${speed.avg_position?.toFixed(1)} to ${speed.estimated_position_if_fast?.toFixed(1)}`,
      supporting_data: { issues: topIssues, estimatedHours: speed.estimated_fix_hours },
      effort: speed.estimated_fix_hours > 4 ? 'significant' : speed.estimated_fix_hours > 2 ? 'medium' : 'quick',
      ai_model: SEO_AI_MODEL,
      analysis_run_id: runId,
      status: 'pending'
    })
  }

  if (recommendations.length > 0) {
    await supabase.from('seo_ai_recommendations').insert(recommendations)
  }

  return { count: recommendations.length }
}

// Analysis 11: Topic Clusters
async function analyzeTopicClusters(supabase, siteId, pages, knowledge, runId) {
  const recommendations = []

  // Get clusters missing pillar pages
  const { data: clusters } = await supabase
    .from('seo_topic_clusters')
    .select('*')
    .eq('site_id', siteId)
    .order('total_search_volume', { ascending: false })
    .limit(20)

  for (const cluster of clusters || []) {
    // Missing pillar page
    if (!cluster.pillar_page_id) {
      recommendations.push({
        site_id: siteId,
        category: 'content',
        subcategory: 'topic_cluster',
        priority: cluster.ai_priority || 'medium',
        title: `Create pillar page: ${cluster.cluster_name}`,
        description: `Cluster has ${cluster.keyword_count} keywords with ${cluster.total_search_volume} monthly volume but no pillar page.`,
        suggested_value: cluster.primary_keyword,
        ai_reasoning: `Building a comprehensive pillar page for "${cluster.cluster_name}" will establish topical authority.`,
        supporting_data: { keywords: cluster.keywords?.slice(0, 10), suggestedTopics: cluster.ai_suggested_topics },
        effort: 'significant',
        ai_model: SEO_AI_MODEL,
        analysis_run_id: runId,
        status: 'pending'
      })
    }

    // Low internal linking in cluster
    if (cluster.link_score < 50 && cluster.pillar_page_id) {
      recommendations.push({
        site_id: siteId,
        page_id: cluster.pillar_page_id,
        category: 'link',
        subcategory: 'topic_cluster',
        priority: 'medium',
        title: `Improve cluster linking: ${cluster.cluster_name}`,
        description: `Link score: ${cluster.link_score}/100. Add internal links between cluster pages.`,
        suggested_value: JSON.stringify(cluster.ai_link_suggestions?.slice(0, 5)),
        effort: 'quick',
        ai_model: SEO_AI_MODEL,
        analysis_run_id: runId,
        status: 'pending'
      })
    }

    // Missing cluster content
    for (const gap of (cluster.ai_content_gaps || []).slice(0, 3)) {
      recommendations.push({
        site_id: siteId,
        category: 'content',
        subcategory: 'cluster_content',
        priority: 'medium',
        title: `Create cluster content: ${gap.title || gap}`,
        description: `Missing topic in ${cluster.cluster_name} cluster.`,
        suggested_value: gap.target_keyword || gap,
        supporting_data: { cluster: cluster.cluster_name, clusterId: cluster.id },
        effort: 'medium',
        ai_model: SEO_AI_MODEL,
        analysis_run_id: runId,
        status: 'pending'
      })
    }
  }

  if (recommendations.length > 0) {
    await supabase.from('seo_ai_recommendations').insert(recommendations)
  }

  return { count: recommendations.length }
}

