// DEPRECATED: This skill wrapper is no longer used.
/**
 * Signal SEO Skill
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * The SEO skill provides AI-powered SEO analysis, recommendations, and actions.
 * This skill wraps the existing SEO AI brain functionality into Signal's framework.
 * 
 * Available Tools:
 * - analyze_page: Full page analysis with scoring
 * - keyword_recommendations: AI keyword suggestions
 * - content_brief: Generate content briefs
 * - competitor_analysis: Analyze competitor strategies
 * - technical_audit: Technical SEO issues
 * - internal_linking: Suggest internal links
 * - quick_wins: Identify easy improvements
 * - blog_ideas: Generate blog topic ideas
 * 
 * Usage:
 *   import { SEOSkill } from './skills/seo-skill.js'
 *   const seo = new SEOSkill(signal, siteId)
 *   const analysis = await seo.analyzePage(url)
 */

import { Signal, createModuleEcho } from '../utils/signal.js'

// ═══════════════════════════════════════════════════════════════════════════════
// SEO SKILL PROMPTS
// ═══════════════════════════════════════════════════════════════════════════════

const SEO_SYSTEM_PROMPT = `You are Signal SEO, an expert SEO analyst and strategist.

Your role is to help websites improve their organic search visibility through:
- Technical SEO optimization
- On-page SEO improvements  
- Keyword research and strategy
- Content optimization
- Internal linking strategies
- Competitive analysis

When making recommendations:
1. Always cite specific data points (scores, metrics, competitors)
2. Prioritize by impact - what will move the needle most?
3. Be actionable - give specific next steps
4. Consider business context (industry, competitors, goals)
5. Note confidence level for predictions

For content recommendations:
- Focus on user intent, not just keywords
- Suggest semantic variations and related topics
- Consider the content funnel (awareness → conversion)

IMPORTANT: You learn from outcomes. When recommendations lead to traffic gains,
those patterns are reinforced. Failed recommendations help refine the approach.`

const TOOL_PROMPTS = {
  analyze_page: `Analyze the provided page data and return a comprehensive SEO assessment.
Include: technical issues, content quality, keyword optimization, and prioritized recommendations.
Output JSON with: score (0-100), issues[], recommendations[], quick_wins[], and analysis summary.`,

  keyword_recommendations: `Based on the page content and current rankings, suggest keywords to target.
Consider: search volume, competition, relevance, and intent match.
Output JSON with: primary_keywords[], secondary_keywords[], long_tail[], and strategy notes.`,

  content_brief: `Generate a detailed content brief for the specified topic.
Include: target keyword, search intent, outline, semantic keywords, competitor gaps, and word count target.
Output JSON with: title, meta_description, h1, outline[], keywords[], competitors_to_beat[], word_count.`,

  competitor_analysis: `Analyze the competitor's SEO strategy and identify opportunities.
Compare: keyword gaps, content gaps, backlink strategies, technical advantages.
Output JSON with: strengths[], weaknesses[], opportunities[], threats[], action_items[].`,

  technical_audit: `Perform a technical SEO audit of the site.
Check: Core Web Vitals, mobile-friendliness, crawlability, indexation, structured data.
Output JSON with: score, critical_issues[], warnings[], passed[], recommendations[].`,

  internal_linking: `Suggest internal linking opportunities for the page.
Consider: relevance, anchor text, link equity flow, user journey.
Output JSON with: suggested_links[], orphan_pages[], hub_pages[], action_items[].`,

  quick_wins: `Identify quick SEO wins - improvements with high impact and low effort.
Focus on: title/meta fixes, image optimization, content updates, technical fixes.
Output JSON with: wins[] containing title, impact (high/medium/low), effort (hours), description.`,

  blog_ideas: `Generate blog content ideas based on keyword opportunities and competitor gaps.
Consider: search volume, competition, topic clusters, content funnel position.
Output JSON with: ideas[] containing title, target_keyword, search_intent, estimated_traffic, difficulty.`
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEO SKILL CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class SEOSkill {
  constructor(supabase, orgId, siteId, options = {}) {
    this.supabase = supabase
    this.orgId = orgId
    this.siteId = siteId
    this.userId = options.userId
    this.signal = new Signal(supabase, orgId, { 
      userId: options.userId,
      siteId 
    })
    this.echo = createModuleEcho(supabase, orgId, 'seo', { 
      userId: options.userId,
      contextId: siteId
    })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DATA LOADING (scoped to this skill's allowed data)
  // ─────────────────────────────────────────────────────────────────────────────

  async loadSiteData() {
    const { data: site } = await this.supabase
      .from('seo_sites')
      .select(`
        *,
        seo_scans(
          id, created_at, status, performance_score, accessibility_score,
          seo_score, best_practices_score
        ),
        seo_keywords(*),
        seo_pages(url, title, score, issues_count)
      `)
      .eq('id', this.siteId)
      .eq('org_id', this.orgId)
      .single()

    return site
  }

  async loadPageData(url) {
    const { data: page } = await this.supabase
      .from('seo_pages')
      .select('*, seo_page_insights(*)')
      .eq('site_id', this.siteId)
      .eq('url', url)
      .single()

    return page
  }

  async loadCompetitors() {
    const { data: competitors } = await this.supabase
      .from('seo_competitors')
      .select('*')
      .eq('site_id', this.siteId)

    return competitors || []
  }

  async loadRecentRecommendations() {
    const { data } = await this.supabase
      .from('seo_ai_recommendations')
      .select('*')
      .eq('site_id', this.siteId)
      .order('created_at', { ascending: false })
      .limit(20)

    return data || []
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL IMPLEMENTATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  async analyzePage(url, options = {}) {
    const [site, page, competitors] = await Promise.all([
      this.loadSiteData(),
      this.loadPageData(url),
      this.loadCompetitors()
    ])

    const result = await this.signal.invoke('seo', 'analyze_page', {
      site,
      page,
      url,
      competitors: competitors.slice(0, 5),
      options
    }, {
      trackAction: true,
      additionalContext: {
        tool_prompt: TOOL_PROMPTS.analyze_page
      }
    })

    // Store analysis in database
    if (result.recommendations?.length > 0) {
      await this.storeRecommendations(url, result.recommendations)
    }

    return result
  }

  async keywordRecommendations(options = {}) {
    const [site, recentRecs] = await Promise.all([
      this.loadSiteData(),
      this.loadRecentRecommendations()
    ])

    return await this.signal.invoke('seo', 'keyword_recommendations', {
      site,
      current_keywords: site.seo_keywords || [],
      recent_recommendations: recentRecs.filter(r => r.type === 'keyword'),
      ...options
    }, {
      additionalContext: { tool_prompt: TOOL_PROMPTS.keyword_recommendations }
    })
  }

  async generateContentBrief(topic, options = {}) {
    const [site, competitors] = await Promise.all([
      this.loadSiteData(),
      this.loadCompetitors()
    ])

    const result = await this.signal.invoke('seo', 'content_brief', {
      topic,
      site_context: {
        domain: site.domain,
        industry: site.industry,
        existing_pages: site.seo_pages?.length || 0
      },
      competitors,
      ...options
    }, {
      trackAction: true,
      additionalContext: { tool_prompt: TOOL_PROMPTS.content_brief }
    })

    // Store content brief
    await this.supabase
      .from('seo_content_briefs')
      .insert({
        site_id: this.siteId,
        topic,
        brief_data: result,
        status: 'generated',
        created_by: this.userId
      })

    return result
  }

  async analyzeCompetitor(competitorDomain, options = {}) {
    const site = await this.loadSiteData()

    return await this.signal.invoke('seo', 'competitor_analysis', {
      our_site: site,
      competitor_domain: competitorDomain,
      ...options
    }, {
      trackAction: true,
      additionalContext: { tool_prompt: TOOL_PROMPTS.competitor_analysis }
    })
  }

  async technicalAudit(options = {}) {
    const site = await this.loadSiteData()
    const latestScan = site.seo_scans?.[0]

    return await this.signal.invoke('seo', 'technical_audit', {
      site,
      latest_scan: latestScan,
      ...options
    }, {
      trackAction: true,
      additionalContext: { tool_prompt: TOOL_PROMPTS.technical_audit }
    })
  }

  async suggestInternalLinks(url, options = {}) {
    const [page, site] = await Promise.all([
      this.loadPageData(url),
      this.loadSiteData()
    ])

    return await this.signal.invoke('seo', 'internal_linking', {
      page,
      all_pages: site.seo_pages || [],
      ...options
    }, {
      additionalContext: { tool_prompt: TOOL_PROMPTS.internal_linking }
    })
  }

  async findQuickWins() {
    const [site, recentRecs] = await Promise.all([
      this.loadSiteData(),
      this.loadRecentRecommendations()
    ])

    return await this.signal.invoke('seo', 'quick_wins', {
      site,
      pages: site.seo_pages || [],
      recent_recommendations: recentRecs,
      implemented_count: recentRecs.filter(r => r.status === 'implemented').length
    }, {
      additionalContext: { tool_prompt: TOOL_PROMPTS.quick_wins }
    })
  }

  async generateBlogIdeas(options = {}) {
    const [site, competitors] = await Promise.all([
      this.loadSiteData(),
      this.loadCompetitors()
    ])

    return await this.signal.invoke('seo', 'blog_ideas', {
      site,
      keywords: site.seo_keywords || [],
      competitors,
      ...options
    }, {
      additionalContext: { tool_prompt: TOOL_PROMPTS.blog_ideas }
    })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  async storeRecommendations(url, recommendations) {
    const records = recommendations.map(rec => ({
      site_id: this.siteId,
      page_url: url,
      type: rec.type || 'general',
      priority: rec.priority || 'medium',
      title: rec.title,
      description: rec.description,
      action_items: rec.action_items || [],
      impact_score: rec.impact || 50,
      effort_hours: rec.effort_hours,
      status: 'pending',
      ai_confidence: rec.confidence || 0.7
    }))

    await this.supabase
      .from('seo_ai_recommendations')
      .insert(records)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SPECIALIZED ANALYSIS TOOLS (for seo-ai-analyze.js)
  // ─────────────────────────────────────────────────────────────────────────────

  async analyzeTitleMeta(page, topQueries) {
    const result = await this.signal.invoke({
      module: 'seo',
      tool: 'analyze_title_meta',
      systemPrompt: SEO_SYSTEM_PROMPT,
      userPrompt: `You are an expert SEO specialist. Analyze this page and generate optimized title and meta description.

PAGE DATA:
URL: ${page.url}
Current Title: ${page.title || 'Missing'}
Current Title Length: ${page.title_length || 0} chars
Current Meta: ${page.meta_description || 'Missing'}
Current Meta Length: ${page.meta_description_length || 0} chars
Current H1: ${page.h1 || 'Missing'}
Word Count: ${page.word_count || 'Unknown'}

TOP SEARCH QUERIES DRIVING TRAFFIC TO THIS PAGE:
${topQueries.map(q => `- "${q.query}" (pos ${q.position.toFixed(1)}, ${q.impressions} impr, ${(q.ctr * 100).toFixed(1)}% CTR)`).join('\n') || 'No query data available'}

REQUIREMENTS:
1. Title must be 50-60 characters
2. Meta description must be 140-160 characters  
3. Include the top performing search query naturally
4. Add compelling CTR-boosting elements (numbers, power words, urgency)
5. Match the search intent of the top queries
6. Differentiate from generic competitors

Return JSON with: currentIssues[], recommendations[] (type, priority, current, suggested, reason, expectedCtrLift), additionalTips[]`,
      responseFormat: { type: 'json_object' },
      temperature: 0.7
    })

    if (this.echo && typeof this.echo.log === 'function') await this.echo.log({
      action: 'analyze_title_meta',
      input: { pageUrl: page.url, queriesCount: topQueries.length },
      output: result
    })

    return result
  }

  async analyzeLowCTR(lowCtrQueries, domain) {
    if (lowCtrQueries.length === 0) {
      return { 
        analysisType: 'low_ctr',
        message: 'No significant low CTR issues detected',
        recommendations: []
      }
    }

    const result = await this.signal.invoke({
      module: 'seo',
      tool: 'analyze_low_ctr',
      systemPrompt: SEO_SYSTEM_PROMPT,
      userPrompt: `Analyze these search queries that have HIGH impressions but LOW click-through rate.

DOMAIN: ${domain}

LOW CTR QUERIES (high impressions, CTR < 2%):
${lowCtrQueries.map(q => `- "${q.keys[0]}" on ${q.keys[1]}
  Position: ${q.position.toFixed(1)}, Impressions: ${q.impressions}, CTR: ${(q.ctr * 100).toFixed(2)}%`).join('\n\n')}

For each query, explain WHY the CTR is low and provide a SPECIFIC fix.
Consider: title compelling enough? meta description match intent? mismatch between query and content? competitors doing something better?

Return JSON with: summary, recommendations[] (query, page, currentCtr, currentPosition, issue, priority, fix {type, current, suggested, explanation}, expectedCtrLift), quickWins[]`,
      responseFormat: { type: 'json_object' },
      temperature: 0.7
    })

    if (this.echo && typeof this.echo.log === 'function') await this.echo.log({
      action: 'analyze_low_ctr',
      input: { queriesCount: lowCtrQueries.length, domain },
      output: result
    })

    return result
  }

  async analyzeStrikingDistance(strikingDistanceQueries, domain) {
    if (strikingDistanceQueries.length === 0) {
      return { 
        analysisType: 'striking_distance',
        message: 'No striking distance keywords found (positions 8-20)',
        recommendations: []
      }
    }

    const result = await this.signal.invoke({
      module: 'seo',
      tool: 'analyze_striking_distance',
      systemPrompt: SEO_SYSTEM_PROMPT,
      userPrompt: `Analyze these STRIKING DISTANCE keywords (positions 8-20) that are close to page 1.

DOMAIN: ${domain}

STRIKING DISTANCE KEYWORDS:
${strikingDistanceQueries.map(q => `- "${q.keys[0]}" on ${q.keys[1]}
  Position: ${q.position.toFixed(1)}, Impressions: ${q.impressions}, Clicks: ${q.clicks}`).join('\n\n')}

For each keyword, provide specific actions to push it onto page 1 (positions 1-7).
Consider: on-page optimization, content depth, internal linking, featured snippet opportunities.

Return JSON with: summary, opportunities[] (query, page, currentPosition, potentialTraffic, priority, actions[], expectedPositionGain, timeframe), quickWins[]`,
      responseFormat: { type: 'json_object' },
      temperature: 0.7
    })

    if (this.echo && typeof this.echo.log === 'function') await this.echo.log({
      action: 'analyze_striking_distance',
      input: { queriesCount: strikingDistanceQueries.length, domain },
      output: result
    })

    return result
  }

  async analyzeCannibalization(cannibalized, domain) {
    if (cannibalized.length === 0) {
      return { 
        analysisType: 'cannibalization',
        message: 'No keyword cannibalization detected',
        recommendations: []
      }
    }

    const result = await this.signal.invoke({
      module: 'seo',
      tool: 'analyze_cannibalization',
      systemPrompt: SEO_SYSTEM_PROMPT,
      userPrompt: `Analyze these CANNIBALIZED keywords where multiple pages compete for the same search query.

DOMAIN: ${domain}

CANNIBALIZED KEYWORDS:
${cannibalized.map(c => `Query: "${c.query}"
  Pages:${c.pages.map(p => `\n    - ${p.page} (pos ${p.position != null ? Number(p.position).toFixed(1) : 'N/A'}, ${p.clicks} clicks)`).join('')}`).join('\n\n')}

For each cannibalized keyword:
1. Identify which page should be the PRIMARY target
2. Recommend what to do with competing pages (consolidate, differentiate, redirect)
3. Estimate traffic impact of fixing

Return JSON with: summary, issues[] (query, primaryPage, competingPages[], recommendation, action (consolidate|differentiate|redirect), expectedImpact, priority), estimatedTrafficGain`,
      responseFormat: { type: 'json_object' },
      temperature: 0.7
    })

    if (this.echo && typeof this.echo.log === 'function') await this.echo.log({
      action: 'analyze_cannibalization',
      input: { issuesCount: cannibalized.length, domain },
      output: result
    })

    return result
  }

  async runFullAudit(context) {
    const result = await this.signal.invoke({
      module: 'seo',
      tool: 'full_audit',
      systemPrompt: SEO_SYSTEM_PROMPT,
      userPrompt: `Perform a comprehensive SEO audit for this site.

DOMAIN: ${context.domain}

TOP PERFORMING PAGES:
${context.topPages.slice(0, 10).map(p => `- ${p.keys[0]}: ${p.clicks} clicks, ${p.impressions} impr, pos ${p.position.toFixed(1)}`).join('\n')}

TOP QUERIES:
${context.topQueries.slice(0, 15).map(q => `- "${q.keys[0]}": pos ${q.position.toFixed(1)}, ${q.clicks} clicks`).join('\n')}

LOW CTR ISSUES: ${context.lowCtrQueries.length} queries
STRIKING DISTANCE: ${context.strikingDistanceQueries.length} keywords
CANNIBALIZATION: ${context.cannibalized.length} keywords

Provide a prioritized audit with actionable recommendations.

Return JSON with: overallScore (0-100), summary, criticalIssues[], opportunities[], recommendations[] (priority, category, title, description, expectedImpact, effort), quickWins[], monthlyPlan[]`,
      responseFormat: { type: 'json_object' },
      temperature: 0.7
    })

    if (this.echo && typeof this.echo.log === 'function') await this.echo.log({
      action: 'full_audit',
      input: { domain: context.domain },
      output: result
    })

    return result
  }

  async generateSchema(page, schemaType) {
    const result = await this.signal.invoke({
      module: 'seo',
      tool: 'generate_schema',
      systemPrompt: SEO_SYSTEM_PROMPT,
      userPrompt: `Generate structured data (Schema.org JSON-LD) for this page.

PAGE DATA:
URL: ${page.url}
Title: ${page.title}
Description: ${page.meta_description}
Content Type: ${schemaType || 'auto-detect'}
${page.content ? `Content Preview: ${page.content.substring(0, 500)}...` : ''}

Generate appropriate Schema.org markup. Common types:
- Article/BlogPosting for blog posts
- LocalBusiness for local businesses
- Product for e-commerce
- FAQPage for FAQ sections
- HowTo for tutorials
- Organization for about pages

Return JSON with: schemaType, schema (the actual JSON-LD object), implementation_notes[], validation_warnings[]`,
      responseFormat: { type: 'json_object' },
      temperature: 0.5
    })

    if (this.echo && typeof this.echo.log === 'function') await this.echo.log({
      action: 'generate_schema',
      input: { pageUrl: page.url, schemaType },
      output: result
    })

    return result
  }

  async generateSchemaEnhanced(context, schemaType, additionalData = {}) {
    const result = await this.signal.invoke({
      module: 'seo',
      tool: 'generate_schema_enhanced',
      systemPrompt: 'You are an expert in schema.org structured data and Google rich results. Generate valid, comprehensive JSON-LD schema that maximizes chances for rich results in search.',
      userPrompt: `Generate optimal JSON-LD schema markup for this page.

PAGE DETAILS:
URL: ${context.page?.url}
Title: ${context.page?.title}
H1: ${context.page?.h1}
Description: ${context.page?.metaDescription}
Page Type: ${schemaType}
Word Count: ${context.page?.wordCount || 'Unknown'}

BUSINESS CONTEXT:
${context.business ? JSON.stringify(context.business, null, 2) : 'Not available'}

ORGANIZATION:
Name: ${context.organization?.name}
Domain: ${context.organization?.domain}

${Object.keys(additionalData).length > 0 ? `ADDITIONAL DATA:\n${JSON.stringify(additionalData, null, 2)}` : ''}

Generate complete, valid JSON-LD schema that:
1. Uses the most appropriate schema.org types
2. Includes all relevant properties
3. Is optimized for rich results
4. Follows Google's structured data guidelines

Return JSON: { primarySchema: {...}, additionalSchemas: [], richResultEligibility: [], recommendations: [] }`,
      responseFormat: { type: 'json_object' },
      temperature: 0.2
    })

    if (this.echo && typeof this.echo.log === 'function') await this.echo.log({
      action: 'generate_schema_enhanced',
      input: { pageUrl: context.page?.url, schemaType },
      output: result
    })

    return result
  }

  async generateTitleVariants(page, keyword, count = 5) {
    const result = await this.signal.invoke({
      module: 'seo',
      tool: 'generate_title_variants',
      systemPrompt: SEO_SYSTEM_PROMPT,
      userPrompt: `Generate ${count} A/B test title tag variants for this page.

PAGE DATA:
URL: ${page.url}
Current Title: ${page.title}
Target Keyword: ${keyword}
Current Performance: ${page.ctr ? `CTR: ${(page.ctr * 100).toFixed(1)}%` : 'Unknown'}

Generate compelling title variants that:
1. Include the target keyword naturally
2. Are 50-60 characters
3. Use different psychological triggers (curiosity, urgency, numbers, etc.)
4. Would appeal to different user intents

Return JSON with: variants[] (title, charCount, approach, expectedCtrRange), testingNotes, recommendedTestDuration`,
      responseFormat: { type: 'json_object' },
      temperature: 0.8
    })

    if (this.echo && typeof this.echo.log === 'function') await this.echo.log({
      action: 'generate_title_variants',
      input: { pageUrl: page.url, keyword, count },
      output: result
    })

    return result
  }

  async analyzeThinContent(thinPages, queriesByPage, domain) {
    if (thinPages.length === 0) {
      return {
        analysisType: 'thin_content',
        message: 'No thin content pages detected',
        recommendations: []
      }
    }

    const result = await this.signal.invoke({
      module: 'seo',
      tool: 'analyze_thin_content',
      systemPrompt: SEO_SYSTEM_PROMPT,
      userPrompt: `Analyze these thin content pages (under 300 words) and provide recommendations.

DOMAIN: ${domain}

THIN CONTENT PAGES:
${thinPages.slice(0, 10).map(p => {
  const queries = queriesByPage[p.url]?.slice(0, 3) || []
  return `- ${p.url}
  Word count: ${p.word_count}
  Title: ${p.title || 'Missing'}
  Top queries: ${queries.map(q => `"${q.query}"`).join(', ') || 'None'}`
}).join('\n\n')}

For each page, determine if it should be:
1. EXPANDED: Add more valuable content
2. MERGED: Combine with a related page
3. REMOVED: Delete or noindex (if no value)

Return JSON with: summary, recommendations[] (page, currentWordCount, priority, strategy (expand|merge|remove), implementation {action, contentSuggestions[], targetWordCount, mergeTarget}, reason)`,
      responseFormat: { type: 'json_object' },
      temperature: 0.7
    })

    if (this.echo && typeof this.echo.log === 'function') await this.echo.log({
      action: 'analyze_thin_content',
      input: { pagesCount: thinPages.length, domain },
      output: result
    })

    return result
  }

  async fixSchema(existingSchema, errors, context = {}) {
    const result = await this.signal.invoke({
      module: 'seo',
      tool: 'fix_schema',
      systemPrompt: 'You are an expert in schema.org structured data. Fix schema validation errors while preserving valid data and following Google guidelines.',
      userPrompt: `Fix the following JSON-LD schema markup based on these validation errors:

CURRENT SCHEMA:
${JSON.stringify(existingSchema, null, 2)}

VALIDATION ERRORS:
${JSON.stringify(errors, null, 2)}

${context.page ? `PAGE CONTEXT:
URL: ${context.page.url}
Title: ${context.page.title}
H1: ${context.page.h1}
Description: ${context.page.meta_description}` : ''}

${context.knowledge ? `BUSINESS CONTEXT:
Name: ${context.knowledge.business_name}
Type: ${context.knowledge.business_type}
Location: ${context.knowledge.primary_location || 'Not specified'}` : ''}

Fix all the errors while:
1. Preserving existing valid data
2. Adding missing required fields with appropriate values
3. Correcting format issues
4. Following Google's structured data guidelines

Return JSON: { fixedSchema: {...}, changesMade: ["description of each fix"] }`,
      responseFormat: { type: 'json_object' },
      temperature: 0.2
    })

    if (this.echo && typeof this.echo.log === 'function') await this.echo.log({
      action: 'fix_schema',
      input: { errorsCount: errors.length },
      output: result
    })

    return result
  }

  async discoverBacklinkOpportunities(context) {
    const result = await this.signal.invoke('seo', 'discover_backlinks', {
      business: context.business,
      domain: context.domain,
      isLocal: context.isLocal,
      location: context.location,
      topContent: context.topContent,
      competitors: context.competitors,
      keywords: context.keywords
    }, {
      trackAction: true,
      additionalContext: {
        tool_prompt: `Discover backlink opportunities for this site:

BUSINESS: ${context.business?.name || 'Unknown'}
TYPE: ${context.business?.type || 'Unknown'}
INDUSTRY: ${context.business?.industry || 'Unknown'}
DOMAIN: ${context.domain}
${context.isLocal ? `LOCAL BUSINESS: ${context.location}` : ''}

TOP CONTENT:
${context.topContent?.map(c => `- ${c.url}: ${c.title || 'Untitled'}`).join('\n') || 'None'}

${context.competitors?.length > 0 ? `COMPETITORS: ${context.competitors.join(', ')}` : ''}
${context.keywords?.length > 0 ? `TARGET KEYWORDS: ${context.keywords.join(', ')}` : ''}

Find opportunities in: Resource pages, Guest posts, Directories, Digital PR, Competitor gaps, Partnerships.

**Return valid JSON** with: { opportunities: [{ type, targetDomain, targetUrl, reason, suggestedAnchor, priorityScore, difficultyScore }] }`
      }
    })
    return result
  }

  async analyzeTopicClusters(options) {
    const result = await this.signal.invoke({
      module: 'seo',
      tool: 'analyze_topic_clusters',
      systemPrompt: SEO_SYSTEM_PROMPT,
      userPrompt: `Create topic cluster strategy for: ${options.topic || options.domain}

${options.existingContent ? `EXISTING CONTENT:\n${options.existingContent.map(c => `- ${c.title}: ${c.url}`).join('\n')}` : ''}
${options.keywords ? `TARGET KEYWORDS: ${options.keywords.join(', ')}` : ''}

Create a topic cluster with:
1. Pillar page concept
2. Cluster content ideas (8-12)
3. Internal linking strategy
4. Content gaps to fill

Return JSON: { pillarPage: { title, outline }, clusterContent: [{ title, targetKeyword, intentType, priority }], internalLinks: [], gaps: [] }`,
      responseFormat: { type: 'json_object' },
      temperature: 0.7
    })
    return result
  }

  async analyzeContentGaps(context) {
    const result = await this.signal.invoke({
      module: 'seo',
      tool: 'analyze_content_gaps',
      systemPrompt: SEO_SYSTEM_PROMPT,
      userPrompt: `Identify content gaps for: ${context.domain}

${context.competitors ? `COMPETITORS: ${context.competitors.join(', ')}` : ''}
${context.existingContent ? `OUR CONTENT:\n${context.existingContent.slice(0, 20).map(c => `- ${c.title}`).join('\n')}` : ''}
${context.keywords ? `TRACKING KEYWORDS: ${context.keywords.slice(0, 30).join(', ')}` : ''}

Identify:
1. Topics competitors cover that we don't
2. Keywords we're missing
3. Content depth opportunities
4. Format gaps (videos, tools, etc.)

Return JSON: { gaps: [{ topic, opportunity, priority, suggestedTitle, targetKeywords, estimatedSearchVolume }], summary: "" }`,
      responseFormat: { type: 'json_object' },
      temperature: 0.6
    })
    return result
  }

  async analyzeSerpFeatures(keyword, options = {}) {
    const result = await this.signal.invoke({
      module: 'seo',
      tool: 'analyze_serp_features',
      systemPrompt: SEO_SYSTEM_PROMPT,
      userPrompt: `Analyze SERP features opportunity for: "${keyword}"

${options.currentPosition ? `Current position: ${options.currentPosition}` : ''}
${options.page ? `PAGE: ${options.page.url}\nTitle: ${options.page.title}\nDescription: ${options.page.description}` : ''}

Identify opportunities for:
- Featured snippets (paragraph, list, table)
- People Also Ask
- Knowledge Panel
- Video carousels
- Image packs
- Local pack

Return JSON: { features: [{ type, currentlyShowing, opportunityLevel, recommendations: [], contentChanges: [] }], topPriority: "" }`,
      responseFormat: { type: 'json_object' },
      temperature: 0.5
    })
    return result
  }

  async analyzeLocalSEO(context) {
    const result = await this.signal.invoke('seo', 'analyze_local_seo', {
      businessName: context.businessName,
      location: context.location,
      industry: context.industry,
      serviceAreas: context.serviceAreas,
      gbpData: context.gbpData
    }, {
      trackAction: true,
      additionalContext: {
        tool_prompt: `Analyze local SEO for: ${context.businessName}
Location: ${context.location}
Industry: ${context.industry || 'Unknown'}
${context.serviceAreas ? `Service Areas: ${context.serviceAreas.join(', ')}` : ''}
${context.gbpData ? `GBP DATA:\n${JSON.stringify(context.gbpData, null, 2)}` : ''}

Analyze and recommend:
1. GBP optimization
2. Local citation opportunities
3. Review strategy
4. Local content ideas
5. Local schema opportunities

**Return valid JSON** with: { score: 0-100, recommendations: [{ category, priority, issue, fix }], citationOpportunities: [], contentIdeas: [] }`
      }
    })
    return result
  }

  async predictRankings(context) {
    const result = await this.signal.invoke({
      module: 'seo',
      tool: 'predict_rankings',
      systemPrompt: 'You are an SEO analyst specializing in ranking predictions and competitive analysis.',
      userPrompt: `Predict ranking changes for: ${context.domain}

${context.keyword ? `KEYWORD: "${context.keyword}"` : ''}
${context.page ? `PAGE: ${context.page.url}` : ''}
Current Position: ${context.currentPosition || 'Unknown'}

RECENT CHANGES:
${context.changes?.map(c => `- ${c.type}: ${c.description}`).join('\n') || 'None specified'}

COMPETITIVE FACTORS:
${context.competitors?.map(c => `- ${c.domain}: pos ${c.position}`).join('\n') || 'Unknown'}

Predict:
1. Expected position change
2. Timeline
3. Confidence level
4. Key factors

Return JSON: { prediction: { currentPosition, predictedPosition, confidenceLevel, timeline, keyFactors: [], risks: [], opportunities: [] } }`,
      responseFormat: { type: 'json_object' },
      temperature: 0.5
    })
    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CONVERSATIONAL (via Echo)
  // ─────────────────────────────────────────────────────────────────────────────

  async chat(message) {
    return await this.echo.send(message)
  }

  async startConversation(title) {
    return await this.echo.startConversation(title)
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SITE TRAINING - Foundational method that powers ALL Signal modules
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Train AI on site content - crawl, extract, and build comprehensive knowledge base.
   * This knowledge powers SEO, Content, Engage, CRM, and all other Signal modules.
   * 
   * @param {Object} options
   * @param {boolean} options.forceRefresh - Re-crawl even if recently trained
   * @param {number} options.maxPages - Max pages to crawl (default 50)
   * @param {Function} options.onProgress - Progress callback (percentage, message)
   * @returns {Object} Training results with knowledge base data
   */
  async trainSite(options = {}) {
    const { forceRefresh = false, maxPages = 50, onProgress } = options

    const updateProgress = (pct, msg) => {
      if (onProgress) onProgress(pct, msg)
      console.log(`[SEOSkill.trainSite] ${pct}% - ${msg}`)
    }

    updateProgress(0, 'Starting site training...')

    // Get site info
    const { data: site, error: siteError } = await this.supabase
      .from('seo_sites')
      .select('*, org:organizations(name, domain)')
      .eq('id', this.siteId)
      .single()

    if (siteError || !site) {
      throw new Error('Site not found')
    }

    const domain = site.org?.domain || site.domain
    if (!domain) {
      throw new Error('No domain configured for site')
    }

    // Check if recently trained (within 24 hours)
    if (!forceRefresh) {
      const { data: existing } = await this.supabase
        .from('seo_knowledge_base')
        .select('last_trained_at, training_status')
        .eq('site_id', this.siteId)
        .single()

      if (existing?.last_trained_at) {
        const hoursSinceTraining = (Date.now() - new Date(existing.last_trained_at).getTime()) / (1000 * 60 * 60)
        if (hoursSinceTraining < 24 && existing.training_status === 'completed') {
          updateProgress(100, 'Recently trained - skipping')
          return { skipped: true, message: 'Site was trained within last 24 hours' }
        }
      }
    }

    // Mark as in progress
    await this.supabase
      .from('seo_knowledge_base')
      .upsert({
        site_id: this.siteId,
        training_status: 'in_progress',
        updated_at: new Date().toISOString()
      }, { onConflict: 'site_id' })

    updateProgress(5, 'Fetching sitemap...')

    // Step 1: Get URLs from sitemap or database
    let urls = await this._fetchSitemapUrls(domain)
    
    if (urls.length === 0) {
      updateProgress(10, 'No sitemap, using existing pages...')
      const { data: pages } = await this.supabase
        .from('seo_pages')
        .select('url')
        .eq('site_id', this.siteId)
        .limit(100)
      urls = pages?.map(p => p.url) || []
    }

    updateProgress(15, `Found ${urls.length} URLs to analyze`)

    // Step 2: Crawl pages
    const pagesToCrawl = urls.slice(0, maxPages)
    const pageContents = []

    for (let i = 0; i < pagesToCrawl.length; i++) {
      const url = pagesToCrawl[i]
      const progress = 15 + Math.floor((i / pagesToCrawl.length) * 50)
      updateProgress(progress, `Crawling ${i + 1}/${pagesToCrawl.length}...`)

      try {
        const pageData = await this._crawlPage(url)
        if (pageData) pageContents.push(pageData)
      } catch (e) {
        console.log(`[SEOSkill.trainSite] Failed to crawl ${url}: ${e.message}`)
      }
    }

    updateProgress(70, `Crawled ${pageContents.length} pages, analyzing with AI...`)

    // Step 3: Use AI to extract business knowledge
    const knowledge = await this._extractBusinessKnowledge(domain, site.org?.name, pageContents)

    updateProgress(90, 'Saving knowledge base...')

    // Step 4: Save to database
    const knowledgeData = {
      site_id: this.siteId,
      business_name: knowledge.business_name || site.org?.name,
      business_type: knowledge.business_type,
      industry: knowledge.industry,
      industry_keywords: knowledge.industry_keywords || [],
      primary_services: knowledge.primary_services || [],
      secondary_services: knowledge.secondary_services || [],
      unique_selling_points: knowledge.unique_selling_points || [],
      differentiators: knowledge.differentiators || [],
      target_personas: knowledge.target_personas || [],
      primary_location: knowledge.primary_location,
      service_areas: knowledge.service_areas || [],
      is_local_business: knowledge.is_local_business || false,
      brand_voice_description: knowledge.brand_voice,
      tone_keywords: knowledge.tone_keywords || [],
      primary_competitors: knowledge.competitors || [],
      content_pillars: knowledge.content_pillars || [],
      content_gaps_identified: knowledge.content_gaps || [],
      site_content_summary: knowledge.site_summary,
      key_topics_extracted: knowledge.key_topics || [],
      faq_patterns: knowledge.faq_patterns || [],
      last_trained_at: new Date().toISOString(),
      training_completeness: 100,
      pages_analyzed: pageContents.length,
      training_status: 'completed',
      updated_at: new Date().toISOString()
    }

    const { error: saveError } = await this.supabase
      .from('seo_knowledge_base')
      .upsert(knowledgeData, { onConflict: 'site_id' })

    if (saveError) {
      await this.supabase
        .from('seo_knowledge_base')
        .update({ training_status: 'failed', error_message: saveError.message })
        .eq('site_id', this.siteId)
      throw new Error(`Failed to save knowledge: ${saveError.message}`)
    }

    updateProgress(100, 'Training complete!')

    if (this.echo && typeof this.echo.log === 'function') await this.echo.log({
      action: 'train_site',
      input: { domain, maxPages, forceRefresh },
      output: { pagesAnalyzed: pageContents.length, businessType: knowledge.business_type }
    })

    return {
      success: true,
      domain,
      pagesAnalyzed: pageContents.length,
      knowledge: knowledgeData
    }
  }

  /**
   * Fetch URLs from sitemap.xml
   */
  async _fetchSitemapUrls(domain) {
    const urls = []
    try {
      const sitemapUrl = `https://${domain}/sitemap.xml`
      const response = await fetch(sitemapUrl)
      const xml = await response.text()
      
      // Dynamic import cheerio
      const cheerio = await import('cheerio')
      const $ = cheerio.load(xml, { xmlMode: true })
      
      $('url loc').each((_, el) => {
        urls.push($(el).text())
      })
      
      // Also check sitemap index
      const indexUrls = []
      $('sitemap loc').each((_, el) => {
        indexUrls.push($(el).text())
      })

      for (const indexUrl of indexUrls.slice(0, 5)) {
        try {
          const indexRes = await fetch(indexUrl)
          const indexXml = await indexRes.text()
          const $index = cheerio.load(indexXml, { xmlMode: true })
          $index('url loc').each((_, urlEl) => {
            urls.push($index(urlEl).text())
          })
        } catch (e) {
          console.log(`[SEOSkill] Could not fetch sitemap index: ${indexUrl}`)
        }
      }
    } catch (e) {
      console.log('[SEOSkill] No sitemap found')
    }
    return urls
  }

  /**
   * Crawl a single page and extract content
   */
  async _crawlPage(url) {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'UptradeBot/1.0 (SEO Training)' },
      signal: AbortSignal.timeout(10000)
    })
    const html = await response.text()
    
    const cheerio = await import('cheerio')
    const $ = cheerio.load(html)

    // Remove non-content elements
    $('script, style, nav, footer, header, aside, .sidebar, #sidebar, .nav, .footer, .header').remove()

    const pageData = {
      url,
      title: $('title').text().trim(),
      h1: $('h1').first().text().trim(),
      metaDescription: $('meta[name="description"]').attr('content') || '',
      headings: [],
      content: ''
    }

    // Extract headings
    $('h2, h3').each((_, el) => {
      pageData.headings.push({
        tag: el.tagName,
        text: $(el).text().trim()
      })
    })

    // Extract main content
    const mainContent = $('main, article, .content, #content, .main, [role="main"]').first()
    pageData.content = (mainContent.length ? mainContent.text() : $('body').text())
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 3000)

    return pageData
  }

  /**
   * Use AI to extract comprehensive business knowledge from crawled pages
   */
  async _extractBusinessKnowledge(domain, orgName, pageContents) {
    const pagesInfo = pageContents.slice(0, 30).map(p => `
URL: ${p.url}
Title: ${p.title}
H1: ${p.h1}
Meta: ${p.metaDescription}
Headings: ${p.headings.slice(0, 10).map(h => `${h.tag}: ${h.text}`).join(', ')}
Content excerpt: ${p.content.substring(0, 500)}...
`).join('\n---\n')

    const result = await this.signal.invoke('seo', 'train_site', {
      domain,
      orgName: orgName || 'Unknown',
      pagesAnalyzed: pageContents.length,
      pagesInfo
    }, {
      trackAction: true,
      additionalContext: {
        tool_prompt: `You are an expert SEO and business analyst. Analyze website content to deeply understand the business - their services, target audience, unique value proposition, service areas, and competitive positioning. Extract comprehensive knowledge that will power AI-driven SEO, content, and sales recommendations.

Analyze this website and extract comprehensive business knowledge.

DOMAIN: ${domain}
ORGANIZATION: ${orgName || 'Unknown'}

PAGES ANALYZED (${pageContents.length} total):
${pagesInfo}

Extract and return JSON with:
{
  "business_name": "Official business name",
  "business_type": "local_service|ecommerce|saas|agency|professional_services|nonprofit|media|other",
  "industry": "Primary industry",
  "industry_keywords": ["core", "industry", "terms"],
  "primary_services": [
    {"name": "Service Name", "description": "Brief description", "keywords": ["related", "keywords"]}
  ],
  "secondary_services": [{"name": "", "description": ""}],
  "unique_selling_points": ["USP 1", "USP 2"],
  "differentiators": ["What makes them different"],
  "target_personas": [
    {"name": "Persona name", "description": "Who they are", "pain_points": ["Pain 1"], "search_behavior": "How they search"}
  ],
  "is_local_business": true/false,
  "primary_location": {"city": "", "state": "", "country": ""},
  "service_areas": [{"name": "City/Region", "type": "city|county|state", "priority": "primary|secondary"}],
  "brand_voice": "Description of their brand voice and tone",
  "tone_keywords": ["professional", "friendly", etc],
  "competitors": [{"domain": "", "name": "", "why_competitor": ""}],
  "content_pillars": ["Main topic 1", "Main topic 2"],
  "content_gaps": ["Topic they should cover but don't"],
  "site_summary": "2-3 sentence summary of the entire website and business",
  "key_topics": ["topic1", "topic2"],
  "faq_patterns": ["Common question pattern 1", "Common question pattern 2"]
}`
      }
    })

    return result
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // TOPIC CLUSTERS - AI-powered keyword clustering
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Generate topic clusters from keywords using AI
   */
  async generateTopicClusters(options = {}) {
    const { minKeywords = 3, maxClusters = 20 } = options

    // Get all keywords for this site
    const { data: keywords, error: kwError } = await this.supabase
      .from('seo_keyword_universe')
      .select('id, keyword, search_volume_monthly, intent, topic_cluster, target_page_url, current_position, is_question')
      .eq('site_id', this.siteId)
      .order('search_volume_monthly', { ascending: false, nullsFirst: false })
      .limit(500)

    if (kwError || !keywords || keywords.length < 5) {
      throw new Error('Not enough keywords to cluster. Need at least 5.')
    }

    // Get existing pages for mapping
    const { data: pages } = await this.supabase
      .from('seo_pages')
      .select('id, url, title, page_type')
      .eq('site_id', this.siteId)

    // Get site knowledge for context
    const { data: knowledge } = await this.supabase
      .from('seo_knowledge_base')
      .select('business_type, industry, primary_services, content_pillars')
      .eq('site_id', this.siteId)
      .single()

    // Use AI to cluster keywords
    const result = await this.signal.invoke({
      module: 'seo',
      tool: 'generate_topic_clusters',
      systemPrompt: 'You are an SEO strategist specializing in topic clustering and content architecture.',
      userPrompt: `Cluster these keywords into logical topic groups.

BUSINESS CONTEXT:
${knowledge ? `Industry: ${knowledge.industry}, Type: ${knowledge.business_type}` : 'Unknown'}
${knowledge?.content_pillars ? `Content Pillars: ${knowledge.content_pillars.join(', ')}` : ''}

KEYWORDS (${keywords.length}):
${keywords.slice(0, 200).map(k => `- "${k.keyword}" (vol: ${k.search_volume_monthly || 0}, intent: ${k.intent || 'unknown'})`).join('\n')}

EXISTING PAGES:
${pages?.slice(0, 30).map(p => `- ${p.url}: ${p.title}`).join('\n') || 'None'}

Create ${maxClusters} or fewer topic clusters. Each cluster should:
1. Have a clear primary keyword (highest volume in group)
2. Group semantically related keywords
3. Map to an existing page if possible
4. Identify content gaps

Return JSON:
{
  "clusters": [
    {
      "name": "Cluster Name",
      "description": "What this cluster covers",
      "primary_keyword": "main keyword",
      "keywords": [{"id": "uuid", "keyword": "term", "search_volume": 100}],
      "priority": "high|medium|low",
      "suggested_content": ["Topic idea 1", "Topic idea 2"],
      "topics_covered": ["Subtopic 1"],
      "topics_missing": ["Gap 1"]
    }
  ]
}`,
      responseFormat: { type: 'json_object' },
      temperature: 0.4
    })

    // Save clusters to database
    const savedClusters = []

    for (const cluster of (result.clusters || [])) {
      // Find best existing page for pillar
      const pillarPage = pages?.find(p => 
        cluster.keywords?.some(kw => 
          p.url?.toLowerCase().includes(kw.keyword?.split(' ')[0]?.toLowerCase()) ||
          p.title?.toLowerCase().includes(cluster.primary_keyword?.toLowerCase())
        )
      )

      const { data: saved, error } = await this.supabase
        .from('seo_topic_clusters')
        .insert({
          site_id: this.siteId,
          cluster_name: cluster.name,
          cluster_slug: cluster.name?.toLowerCase().replace(/\s+/g, '-'),
          description: cluster.description,
          primary_keyword: cluster.primary_keyword,
          keywords: cluster.keywords,
          keyword_count: cluster.keywords?.length || 0,
          total_search_volume: cluster.keywords?.reduce((sum, k) => sum + (k.search_volume || 0), 0) || 0,
          pillar_page_id: pillarPage?.id,
          pillar_url: pillarPage?.url,
          pillar_status: pillarPage ? 'published' : 'not_started',
          topics_covered: cluster.topics_covered || [],
          topics_missing: cluster.topics_missing || [],
          ai_suggested_topics: cluster.suggested_content || [],
          ai_priority: cluster.priority || 'medium'
        })
        .select()
        .single()

      if (!error && saved) {
        savedClusters.push(saved)

        // Update keywords with cluster assignment
        const keywordIds = cluster.keywords?.map(k => k.id).filter(Boolean) || []
        if (keywordIds.length > 0) {
          await this.supabase
            .from('seo_keyword_universe')
            .update({ cluster_id: saved.id, topic_cluster: cluster.name })
            .in('id', keywordIds)
        }
      }
    }

    if (this.echo && typeof this.echo.log === 'function') {
      await this.echo.log({
        action: 'generate_topic_clusters',
        input: { keywordCount: keywords.length },
        output: { clustersCreated: savedClusters.length }
      })
    }

    return {
      success: true,
      clustersCreated: savedClusters.length,
      clusters: savedClusters
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SERP FEATURE ANALYSIS - Bulk keyword analysis for SERP opportunities
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Analyze keywords for SERP feature opportunities
   */
  async analyzeSerpFeaturesBulk(options = {}) {
    const { keywords: providedKeywords = [], analyzeTopKeywords = 50 } = options

    // Get keywords to analyze
    let keywordsToAnalyze = []
    if (providedKeywords.length > 0) {
      const { data } = await this.supabase
        .from('seo_keyword_universe')
        .select('*')
        .eq('site_id', this.siteId)
        .in('keyword', providedKeywords)
      keywordsToAnalyze = data || []
    } else {
      const { data } = await this.supabase
        .from('seo_keyword_universe')
        .select('*')
        .eq('site_id', this.siteId)
        .gt('impressions_28d', 10)
        .order('impressions_28d', { ascending: false })
        .limit(analyzeTopKeywords)
      keywordsToAnalyze = data || []
    }

    if (keywordsToAnalyze.length === 0) {
      return { success: true, message: 'No keywords found to analyze', analyzed: 0 }
    }

    // Get site knowledge for context
    const { data: knowledge } = await this.supabase
      .from('seo_knowledge_base')
      .select('*')
      .eq('site_id', this.siteId)
      .single()

    // Batch keywords for AI analysis (10 at a time)
    const batchSize = 10
    const results = []

    for (let i = 0; i < keywordsToAnalyze.length; i += batchSize) {
      const batch = keywordsToAnalyze.slice(i, i + batchSize)
      
      const batchResult = await this.signal.invoke('seo', 'analyze_serp_features', {
        keywords: batch,
        knowledge
      }, {
        trackAction: true,
        additionalContext: {
          tool_prompt: `Analyze these keywords for SERP feature opportunities.

BUSINESS: ${knowledge?.business_name || 'Unknown'}
INDUSTRY: ${knowledge?.industry || 'Unknown'}

KEYWORDS:
${batch.map(k => `- "${k.keyword}" (pos: ${k.current_position || 'N/A'}, vol: ${k.search_volume_monthly || 0}, intent: ${k.intent || 'unknown'})`).join('\n')}

For each keyword, identify:
1. Which SERP features it could trigger (featured_snippet, faq, local_pack, image_pack, video, people_also_ask, knowledge_panel, etc.)
2. Likelihood of winning each feature (0-100)
3. Content requirements to win
4. Current opportunity score

Return JSON:
{
  "analyses": [
    {
      "keyword": "the keyword",
      "serp_features": [
        {
          "type": "featured_snippet|faq|local_pack|etc",
          "win_likelihood": 75,
          "requirements": "What content is needed",
          "priority": "high|medium|low"
        }
      ],
      "opportunity_score": 85,
      "recommended_action": "Create FAQ section targeting this query"
    }
  ]
}

**Return valid JSON.**`
        }
      })

      // Save results
      for (const analysis of (batchResult.analyses || [])) {
        const keyword = batch.find(k => k.keyword === analysis.keyword)
        if (keyword) {
          // Update keyword with SERP features
          await this.supabase
            .from('seo_keyword_universe')
            .update({
              serp_features: analysis.serp_features,
              opportunity_score: analysis.opportunity_score,
              updated_at: new Date().toISOString()
            })
            .eq('id', keyword.id)

          // Create recommendations for high-priority opportunities
          for (const feature of (analysis.serp_features || []).filter(f => f.priority === 'high')) {
            await this.supabase
              .from('seo_ai_recommendations')
              .insert({
                site_id: this.siteId,
                category: 'serp_feature',
                priority: 'medium',
                title: `Win ${feature.type} for "${analysis.keyword}"`,
                description: feature.requirements,
                suggested_value: JSON.stringify({
                  keyword: analysis.keyword,
                  feature_type: feature.type,
                  win_likelihood: feature.win_likelihood
                }),
                status: 'pending'
              })
          }

          results.push(analysis)
        }
      }
    }

    if (this.echo && typeof this.echo.log === 'function') await this.echo.log({
      action: 'analyze_serp_features_bulk',
      input: { keywordCount: keywordsToAnalyze.length },
      output: { analyzed: results.length }
    })

    return {
      success: true,
      analyzed: results.length,
      results
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SCHEMA GENERATION - Bulk schema markup generation
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Generate schema markup for multiple pages
   */
  async generateSchemaBulk(options = {}) {
    const { pageIds = [], generateForAll = false } = options

    // Get pages to process
    let pagesToProcess = []
    
    if (pageIds.length > 0) {
      const { data: pages } = await this.supabase
        .from('seo_pages')
        .select('*')
        .in('id', pageIds)
      pagesToProcess = pages || []
    } else if (generateForAll) {
      const { data: pages } = await this.supabase
        .from('seo_pages')
        .select('*')
        .eq('site_id', this.siteId)
        .eq('has_schema', false)
        .order('clicks_28d', { ascending: false })
        .limit(50)
      pagesToProcess = pages || []
    }

    if (pagesToProcess.length === 0) {
      return { success: true, message: 'No pages to process', generated: 0 }
    }

    // Get site knowledge
    const { data: knowledge } = await this.supabase
      .from('seo_knowledge_base')
      .select('*')
      .eq('site_id', this.siteId)
      .single()

    const { data: site } = await this.supabase
      .from('seo_sites')
      .select('*, org:organizations(name, domain)')
      .eq('id', this.siteId)
      .single()

    const results = []

    for (const page of pagesToProcess) {
      // Determine schema type
      let schemaType = 'auto'
      const urlLower = page.url.toLowerCase()
      
      if (urlLower.includes('/blog/') || urlLower.includes('/article/') || urlLower.includes('/post/') || urlLower.includes('/insights/')) {
        schemaType = 'article'
      } else if (urlLower.includes('/service') || urlLower.includes('/what-we-do')) {
        schemaType = 'service'
      } else if (urlLower.includes('/location') || urlLower.includes('/service-area') || urlLower.includes('/near-')) {
        schemaType = 'local_business'
      } else if (urlLower.includes('/faq') || urlLower.includes('/frequently-asked')) {
        schemaType = 'faq'
      } else if (urlLower.includes('/product')) {
        schemaType = 'product'
      } else if (urlLower.endsWith('/') && urlLower.split('/').length <= 4) {
        schemaType = 'organization'
      }

      // Use existing generateSchemaEnhanced method
      const context = {
        page: {
          url: page.url,
          title: page.title,
          h1: page.h1,
          metaDescription: page.meta_description,
          pageType: page.page_type || schemaType,
          wordCount: page.word_count
        },
        business: knowledge ? {
          name: knowledge.business_name,
          type: knowledge.business_type,
          industry: knowledge.industry,
          isLocal: knowledge.is_local_business,
          location: knowledge.primary_location,
          services: knowledge.primary_services,
          serviceAreas: knowledge.service_areas
        } : null,
        organization: {
          name: site?.org?.name || knowledge?.business_name,
          domain: site?.org?.domain || site?.domain
        }
      }

      const schemaResult = await this.generateSchemaEnhanced(context, schemaType)

      if (schemaResult.primarySchema) {
        // Create recommendation
        await this.supabase
          .from('seo_ai_recommendations')
          .insert({
            site_id: this.siteId,
            page_id: page.id,
            category: 'schema',
            priority: 'medium',
            title: `Add ${schemaResult.primarySchema?.['@type'] || schemaType} schema`,
            description: 'Adding structured data can enable rich results in search',
            suggested_value: JSON.stringify({
              '@context': 'https://schema.org',
              ...schemaResult.primarySchema
            }, null, 2),
            auto_fixable: false,
            one_click_fixable: true,
            status: 'pending',
            created_at: new Date().toISOString()
          })

        // Update page
        await this.supabase
          .from('seo_pages')
          .update({
            has_schema: true,
            schema_types: [schemaResult.primarySchema?.['@type'] || schemaType],
            updated_at: new Date().toISOString()
          })
          .eq('id', page.id)

        results.push({
          pageId: page.id,
          url: page.url,
          schemaType: schemaResult.primarySchema?.['@type']
        })
      }
    }

    if (this.echo && typeof this.echo.log === 'function') await this.echo.log({
      action: 'generate_schema_bulk',
      input: { pageCount: pagesToProcess.length },
      output: { generated: results.length }
    })

    return {
      success: true,
      generated: results.length,
      results
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // COMPREHENSIVE ANALYSIS (replaces seo-ai-brain-background.mjs logic)
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Run a comprehensive SEO analysis across the entire site.
   * This is the "master brain" that generates all recommendations.
   * 
   * @param {Object} options
   * @param {string} options.analysisType - 'comprehensive' | 'quick_wins' | 'page_optimize' | etc
   * @param {string[]} options.focusAreas - Filter which analyses to run
   * @param {string[]} options.pageIds - Limit to specific pages
   * @param {string} options.runId - Analysis run ID for tracking
   * @returns {Object} Analysis results with recommendations, health score, metrics
   */
  async runComprehensiveAnalysis(options = {}) {
    const {
      analysisType = 'comprehensive',
      focusAreas = [],
      pageIds = [],
      runId = null
    } = options

    const startTime = Date.now()

    if (this.echo && typeof this.echo.log === 'function') await this.echo.log({
      action: 'comprehensive_analysis_start',
      input: { analysisType, focusAreas, pageIds, runId }
    })

    // Fetch all required data in parallel
    const [siteData, knowledgeData, pagesData, gscData, existingRecs] = await Promise.all([
      this._fetchSiteData(),
      this._fetchKnowledgeBase(),
      this._fetchPagesData(pageIds),
      this._fetchGscData(),
      this._fetchExistingRecommendations()
    ])

    if (!siteData) {
      throw new Error('Site not found')
    }

    const domain = siteData.org?.domain || siteData.domain

    // Clear old pending recommendations if doing comprehensive analysis
    if (analysisType === 'comprehensive') {
      await this.supabase
        .from('seo_ai_recommendations')
        .delete()
        .eq('site_id', this.siteId)
        .eq('status', 'pending')
    }

    // Results accumulator
    const results = {
      totalRecommendations: 0,
      criticalIssues: 0,
      quickWins: 0,
      byCategory: {}
    }

    // Helper to check if we should run an analysis
    const shouldAnalyze = (triggers) => {
      if (focusAreas.length === 0) return true
      return triggers.some(t => focusAreas.includes(t))
    }

    // Analysis 1: Title & Meta Optimization (uses AI)
    if (shouldAnalyze(['title', 'meta', 'all'])) {
      const metaRecs = await this._analyzeMetadata(pagesData, knowledgeData, gscData, runId)
      results.totalRecommendations += metaRecs.count
      results.criticalIssues += metaRecs.critical
      results.quickWins += metaRecs.quickWins
      results.byCategory.metadata = metaRecs
    }

    // Analysis 2: Content Gaps (rule-based)
    if (shouldAnalyze(['content', 'gaps', 'all'])) {
      const contentRecs = await this._analyzeContentGapsFromKB(knowledgeData, runId)
      results.totalRecommendations += contentRecs.count
      results.byCategory.contentGaps = contentRecs
    }

    // Analysis 3: Keyword Opportunities (rule-based)
    if (shouldAnalyze(['keywords', 'all'])) {
      const keywordRecs = await this._analyzeKeywordOpportunities(gscData, runId)
      results.totalRecommendations += keywordRecs.count
      results.quickWins += keywordRecs.quickWins
      results.byCategory.keywords = keywordRecs
    }

    // Analysis 4: Internal Linking (rule-based)
    if (shouldAnalyze(['links', 'internal', 'all'])) {
      const linkRecs = await this._analyzeInternalLinkingBulk(pagesData, runId)
      results.totalRecommendations += linkRecs.count
      results.byCategory.internalLinks = linkRecs
    }

    // Analysis 5: Technical SEO (rule-based)
    if (shouldAnalyze(['technical', 'all'])) {
      const techRecs = await this._analyzeTechnicalSeo(pagesData, runId)
      results.totalRecommendations += techRecs.count
      results.criticalIssues += techRecs.critical
      results.byCategory.technical = techRecs
    }

    // Analysis 6: Schema Markup (rule-based)
    if (shouldAnalyze(['schema', 'all'])) {
      const schemaRecs = await this._analyzeSchemaOpportunities(pagesData, knowledgeData, runId)
      results.totalRecommendations += schemaRecs.count
      results.byCategory.schema = schemaRecs
    }

    // Analysis 7: Cannibalization (from pre-computed table)
    if (shouldAnalyze(['cannibalization', 'all'])) {
      const cannibRecs = await this._analyzeCannibalizationFromTable(runId)
      results.totalRecommendations += cannibRecs.count
      results.criticalIssues += cannibRecs.critical
      results.byCategory.cannibalization = cannibRecs
    }

    // Analysis 8: Content Decay (from pre-computed table)
    if (shouldAnalyze(['decay', 'freshness', 'all'])) {
      const decayRecs = await this._analyzeContentDecayFromTable(runId)
      results.totalRecommendations += decayRecs.count
      results.criticalIssues += decayRecs.critical
      results.byCategory.contentDecay = decayRecs
    }

    // Analysis 9: SERP Features (from pre-computed table)
    if (shouldAnalyze(['serp', 'features', 'snippets', 'all'])) {
      const serpRecs = await this._analyzeSerpFeaturesFromTable(runId)
      results.totalRecommendations += serpRecs.count
      results.quickWins += serpRecs.quickWins
      results.byCategory.serpFeatures = serpRecs
    }

    // Analysis 10: Page Speed (from pre-computed table)
    if (shouldAnalyze(['speed', 'performance', 'cwv', 'all'])) {
      const speedRecs = await this._analyzePageSpeedImpact(runId)
      results.totalRecommendations += speedRecs.count
      results.byCategory.pageSpeed = speedRecs
    }

    // Analysis 11: Topic Clusters (from pre-computed table)
    if (shouldAnalyze(['clusters', 'pillars', 'all'])) {
      const clusterRecs = await this._analyzeTopicClustersFromTable(runId)
      results.totalRecommendations += clusterRecs.count
      results.byCategory.topicClusters = clusterRecs
    }

    // Calculate health score
    const healthScore = this._calculateHealthScore(pagesData, existingRecs, results.criticalIssues)
    results.healthScore = healthScore
    results.duration = Date.now() - startTime

    if (this.echo && typeof this.echo.log === 'function') await this.echo.log({
      action: 'comprehensive_analysis_complete',
      input: { analysisType, runId },
      output: {
        totalRecommendations: results.totalRecommendations,
        criticalIssues: results.criticalIssues,
        quickWins: results.quickWins,
        healthScore,
        duration: results.duration
      }
    })

    return results
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPREHENSIVE ANALYSIS HELPERS - Data Fetching
  // ─────────────────────────────────────────────────────────────────────────────

  async _fetchSiteData() {
    const { data } = await this.supabase
      .from('seo_sites')
      .select('*, org:organizations(name, domain)')
      .eq('id', this.siteId)
      .single()
    return data
  }

  async _fetchKnowledgeBase() {
    const { data } = await this.supabase
      .from('seo_knowledge_base')
      .select('*')
      .eq('site_id', this.siteId)
      .single()
    return data
  }

  async _fetchPagesData(pageIds = []) {
    let query = this.supabase
      .from('seo_pages')
      .select('*')
      .eq('site_id', this.siteId)
    
    if (pageIds.length > 0) {
      query = query.in('id', pageIds)
    }
    
    const { data } = await query.limit(200)
    return data || []
  }

  async _fetchGscData() {
    const { data: queries } = await this.supabase
      .from('seo_queries')
      .select('*')
      .eq('site_id', this.siteId)
      .order('clicks_28d', { ascending: false })
      .limit(500)

    return { queries: queries || [] }
  }

  async _fetchExistingRecommendations() {
    const { data } = await this.supabase
      .from('seo_ai_recommendations')
      .select('*')
      .eq('site_id', this.siteId)
    return data || []
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPREHENSIVE ANALYSIS HELPERS - Analysis Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * AI-powered bulk metadata optimization
   */
  async _analyzeMetadata(pages, knowledge, gscData, runId) {
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
    }).slice(0, 20)

    if (pagesNeedingWork.length === 0) {
      return { count: 0, critical: 0, quickWins: 0 }
    }

    // Get related queries for these pages
    const pageUrls = pagesNeedingWork.map(p => p.url)
    const relevantQueries = gscData.queries.filter(q => 
      pageUrls.some(url => q.page_url === url || url.includes(q.query?.replace(/\s+/g, '-')))
    )

    // Build context and use AI
    const businessContext = knowledge ? {
      businessName: knowledge.business_name,
      industry: knowledge.industry,
      services: knowledge.primary_services?.map(s => s.name) || [],
      usps: knowledge.unique_selling_points || [],
      targetAudience: knowledge.target_personas?.map(p => p.name) || []
    } : null

    try {
      const aiResult = await this.signal.invoke({
        module: 'seo',
        tool: 'bulk_metadata_optimization',
        systemPrompt: SEO_SYSTEM_PROMPT,
        userPrompt: `You are an expert SEO specialist. Generate optimized title tags and meta descriptions that maximize CTR while accurately representing page content.

${businessContext ? `BUSINESS CONTEXT:
- Business: ${businessContext.businessName}
- Industry: ${businessContext.industry}
- Services: ${businessContext.services.join(', ')}
- USPs: ${businessContext.usps.join(', ')}
- Target Audience: ${businessContext.targetAudience.join(', ')}` : ''}

RELATED SEARCH QUERIES:
${relevantQueries.slice(0, 20).map(q => `- "${q.query}" (${q.clicks_28d} clicks, position ${q.avg_position_28d?.toFixed(1)})`).join('\n') || 'None available'}

PAGES TO OPTIMIZE:
${pagesNeedingWork.map(p => `---
URL: ${p.url}
Current Title: ${p.title || p.managed_title || 'MISSING'}
Current Meta: ${p.meta_description || p.managed_meta_description || 'MISSING'}
H1: ${p.h1 || 'Unknown'}`).join('\n')}

For each page, provide optimized versions. Return JSON:
{
  "pages": [
    {
      "url": "page url",
      "page_id": "if available",
      "title": "Optimized title (50-60 chars)",
      "title_reasoning": "Why this title is better",
      "meta_description": "Compelling meta description (140-160 chars)",
      "meta_reasoning": "Why this meta is better"
    }
  ]
}`,
        responseFormat: { type: 'json_object' },
        temperature: 0.3
      })

      const suggestions = aiResult.pages || []

      // Create recommendations from AI suggestions
      for (const suggestion of suggestions) {
        const page = pagesNeedingWork.find(p => p.url === suggestion.url || p.id === suggestion.page_id)
        if (!page) continue

        // Title recommendation
        if (suggestion.title && suggestion.title !== page.title) {
          const isCritical = !page.title
          if (isCritical) critical++
          
          recommendations.push({
            site_id: this.siteId,
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
            ai_model: process.env.SEO_AI_MODEL || 'gpt-4o',
            analysis_run_id: runId,
            status: 'pending',
            created_at: new Date().toISOString()
          })
          quickWins++
        }

        // Meta description recommendation
        if (suggestion.meta_description && suggestion.meta_description !== page.meta_description) {
          recommendations.push({
            site_id: this.siteId,
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
            ai_model: process.env.SEO_AI_MODEL || 'gpt-4o',
            analysis_run_id: runId,
            status: 'pending',
            created_at: new Date().toISOString()
          })
          quickWins++
        }
      }

      // Batch insert recommendations
      if (recommendations.length > 0) {
        await this.supabase.from('seo_ai_recommendations').insert(recommendations)
      }

    } catch (e) {
      console.error('[SEOSkill] Metadata analysis error:', e)
      if (this.echo && typeof this.echo.log === 'function') await this.echo.log({
        action: 'metadata_analysis_error',
        input: { pagesCount: pagesNeedingWork.length },
        output: { error: e.message }
      })
    }

    return { count: recommendations.length, critical, quickWins }
  }

  /**
   * Content gaps from knowledge base (rule-based)
   */
  async _analyzeContentGapsFromKB(knowledge, runId) {
    if (!knowledge) return { count: 0 }

    const recommendations = []
    const gaps = knowledge.content_gaps_identified || []
    
    for (const gap of gaps.slice(0, 10)) {
      recommendations.push({
        site_id: this.siteId,
        category: 'content',
        subcategory: 'gap',
        priority: 'medium',
        title: `Create content for: ${gap}`,
        description: `Your site is missing content about "${gap}" which could attract relevant traffic.`,
        auto_fixable: false,
        effort: 'significant',
        ai_model: process.env.SEO_AI_MODEL || 'gpt-4o',
        analysis_run_id: runId,
        status: 'pending',
        created_at: new Date().toISOString()
      })
    }

    if (recommendations.length > 0) {
      await this.supabase.from('seo_ai_recommendations').insert(recommendations)
    }

    return { count: recommendations.length }
  }

  /**
   * Keyword opportunities - striking distance (rule-based)
   */
  async _analyzeKeywordOpportunities(gscData, runId) {
    const recommendations = []
    let quickWins = 0

    const strikingQueries = gscData.queries.filter(q => 
      q.avg_position_28d >= 8 && q.avg_position_28d <= 20 && q.impressions_28d > 50
    )

    for (const query of strikingQueries.slice(0, 15)) {
      recommendations.push({
        site_id: this.siteId,
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
        ai_model: process.env.SEO_AI_MODEL || 'gpt-4o',
        analysis_run_id: runId,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      quickWins++
    }

    if (recommendations.length > 0) {
      await this.supabase.from('seo_ai_recommendations').insert(recommendations)
    }

    return { count: recommendations.length, quickWins }
  }

  /**
   * Internal linking analysis (rule-based)
   */
  async _analyzeInternalLinkingBulk(pages, runId) {
    const recommendations = []

    const orphanPages = pages.filter(p => (p.internal_links_in || 0) === 0 && p.clicks_28d > 0)

    for (const page of orphanPages.slice(0, 10)) {
      recommendations.push({
        site_id: this.siteId,
        page_id: page.id,
        category: 'link',
        subcategory: 'orphan',
        priority: 'medium',
        title: `Add internal links to: ${page.title || page.url}`,
        description: `This page has no internal links pointing to it, making it harder for search engines and users to discover.`,
        auto_fixable: false,
        effort: 'quick',
        ai_model: process.env.SEO_AI_MODEL || 'gpt-4o',
        analysis_run_id: runId,
        status: 'pending',
        created_at: new Date().toISOString()
      })
    }

    if (recommendations.length > 0) {
      await this.supabase.from('seo_ai_recommendations').insert(recommendations)
    }

    return { count: recommendations.length }
  }

  /**
   * Technical SEO issues (rule-based)
   */
  async _analyzeTechnicalSeo(pages, runId) {
    const recommendations = []
    let critical = 0

    for (const page of pages) {
      // Duplicate titles
      const duplicateTitles = pages.filter(p => p.id !== page.id && p.title === page.title && page.title)
      if (duplicateTitles.length > 0 && !recommendations.find(r => r.current_value === page.title)) {
        recommendations.push({
          site_id: this.siteId,
          page_id: page.id,
          category: 'technical',
          subcategory: 'duplicate_title',
          priority: 'high',
          title: `Fix duplicate title tag`,
          description: `"${page.title}" is used on ${duplicateTitles.length + 1} pages. Each page should have a unique title.`,
          current_value: page.title,
          auto_fixable: false,
          effort: 'quick',
          ai_model: process.env.SEO_AI_MODEL || 'gpt-4o',
          analysis_run_id: runId,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        critical++
      }

      // Missing canonical
      if (!page.canonical_url && page.url?.includes('?')) {
        recommendations.push({
          site_id: this.siteId,
          page_id: page.id,
          category: 'technical',
          subcategory: 'missing_canonical',
          priority: 'medium',
          title: `Add canonical tag`,
          description: `This URL has parameters but no canonical tag, which could cause duplicate content issues.`,
          auto_fixable: true,
          one_click_fixable: true,
          effort: 'instant',
          ai_model: process.env.SEO_AI_MODEL || 'gpt-4o',
          analysis_run_id: runId,
          status: 'pending',
          created_at: new Date().toISOString()
        })
      }
    }

    if (recommendations.length > 0) {
      await this.supabase.from('seo_ai_recommendations').insert(recommendations)
    }

    return { count: recommendations.length, critical }
  }

  /**
   * Schema opportunities (rule-based pattern matching)
   */
  async _analyzeSchemaOpportunities(pages, knowledge, runId) {
    const recommendations = []
    const isLocalBusiness = knowledge?.is_local_business
    const hasServices = (knowledge?.primary_services?.length || 0) > 0

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
            site_id: this.siteId,
            page_id: page.id,
            category: 'schema',
            priority,
            title: `Add ${schemaType} schema`,
            description: `Adding ${schemaType} structured data can improve rich snippet visibility in search results.`,
            suggested_value: schemaType,
            auto_fixable: false,
            effort: 'medium',
            ai_model: process.env.SEO_AI_MODEL || 'gpt-4o',
            analysis_run_id: runId,
            status: 'pending',
            created_at: new Date().toISOString()
          })
        }
      }
    }

    if (recommendations.length > 0) {
      await this.supabase.from('seo_ai_recommendations').insert(recommendations)
    }

    return { count: recommendations.length }
  }

  /**
   * Cannibalization from pre-computed table
   */
  async _analyzeCannibalizationFromTable(runId) {
    const recommendations = []
    let criticalCount = 0

    const { data: cannibIssues } = await this.supabase
      .from('seo_cannibalization')
      .select('*')
      .eq('site_id', this.siteId)
      .eq('status', 'detected')
      .order('estimated_traffic_loss', { ascending: false })
      .limit(20)

    for (const issue of cannibIssues || []) {
      const priority = issue.severity === 'critical' ? 'critical' : issue.severity === 'high' ? 'high' : 'medium'
      if (priority === 'critical') criticalCount++

      recommendations.push({
        site_id: this.siteId,
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
        ai_model: process.env.SEO_AI_MODEL || 'gpt-4o',
        analysis_run_id: runId,
        status: 'pending'
      })
    }

    if (recommendations.length > 0) {
      await this.supabase.from('seo_ai_recommendations').insert(recommendations)
    }

    return { count: recommendations.length, critical: criticalCount }
  }

  /**
   * Content decay from pre-computed table
   */
  async _analyzeContentDecayFromTable(runId) {
    const recommendations = []
    let criticalCount = 0

    const { data: decayingPages } = await this.supabase
      .from('seo_content_decay')
      .select('*')
      .eq('site_id', this.siteId)
      .eq('status', 'detected')
      .order('decay_rate', { ascending: true })
      .limit(20)

    for (const decay of decayingPages || []) {
      const priority = decay.decay_rate < -50 ? 'critical' : decay.decay_rate < -30 ? 'high' : 'medium'
      if (priority === 'critical') criticalCount++

      const recommendation = decay.ai_recommendation || {}

      recommendations.push({
        site_id: this.siteId,
        page_id: decay.page_id,
        category: 'content_decay',
        priority,
        title: `Refresh decaying content: ${decay.title || decay.url}`,
        description: `Traffic dropped ${Math.abs(decay.decay_rate || 0).toFixed(0)}%. Previous: ${decay.previous_clicks} clicks, Current: ${decay.current_clicks} clicks.`,
        current_value: `Position ${decay.previous_position?.toFixed(1)} → ${decay.current_position?.toFixed(1)}`,
        suggested_value: recommendation.action || 'Update and refresh content',
        ai_reasoning: recommendation.reasoning || `Content has declined significantly. Consider updating with fresh information.`,
        effort: 'medium',
        ai_model: process.env.SEO_AI_MODEL || 'gpt-4o',
        analysis_run_id: runId,
        status: 'pending'
      })
    }

    if (recommendations.length > 0) {
      await this.supabase.from('seo_ai_recommendations').insert(recommendations)
    }

    return { count: recommendations.length, critical: criticalCount }
  }

  /**
   * SERP features from pre-computed table
   */
  async _analyzeSerpFeaturesFromTable(runId) {
    const recommendations = []
    let quickWinCount = 0

    const { data: serpOpps } = await this.supabase
      .from('seo_serp_features')
      .select('*')
      .eq('site_id', this.siteId)
      .eq('status', 'opportunity')
      .gte('opportunity_score', 50)
      .order('opportunity_score', { ascending: false })
      .limit(20)

    for (const opp of serpOpps || []) {
      const isQuickWin = opp.win_probability === 'high' && 
        (opp.feature_type === 'faq' || opp.feature_type === 'featured_snippet')
      if (isQuickWin) quickWinCount++

      recommendations.push({
        site_id: this.siteId,
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
        ai_model: process.env.SEO_AI_MODEL || 'gpt-4o',
        analysis_run_id: runId,
        status: 'pending'
      })
    }

    if (recommendations.length > 0) {
      await this.supabase.from('seo_ai_recommendations').insert(recommendations)
    }

    return { count: recommendations.length, quickWins: quickWinCount }
  }

  /**
   * Page speed impact from pre-computed table
   */
  async _analyzePageSpeedImpact(runId) {
    const recommendations = []

    const { data: speedData } = await this.supabase
      .from('seo_pagespeed_impact')
      .select('*')
      .eq('site_id', this.siteId)
      .lt('performance_score', 75)
      .gt('priority_score', 50)
      .order('priority_score', { ascending: false })
      .limit(15)

    for (const speed of speedData || []) {
      const priority = speed.performance_score < 50 ? 'high' : 'medium'
      const topIssues = (speed.speed_issues || []).slice(0, 3)

      recommendations.push({
        site_id: this.siteId,
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
        ai_model: process.env.SEO_AI_MODEL || 'gpt-4o',
        analysis_run_id: runId,
        status: 'pending'
      })
    }

    if (recommendations.length > 0) {
      await this.supabase.from('seo_ai_recommendations').insert(recommendations)
    }

    return { count: recommendations.length }
  }

  /**
   * Topic clusters from pre-computed table
   */
  async _analyzeTopicClustersFromTable(runId) {
    const recommendations = []

    const { data: clusters } = await this.supabase
      .from('seo_topic_clusters')
      .select('*')
      .eq('site_id', this.siteId)
      .order('total_search_volume', { ascending: false })
      .limit(20)

    for (const cluster of clusters || []) {
      // Missing pillar page
      if (!cluster.pillar_page_id) {
        recommendations.push({
          site_id: this.siteId,
          category: 'content',
          subcategory: 'topic_cluster',
          priority: cluster.ai_priority || 'medium',
          title: `Create pillar page: ${cluster.cluster_name}`,
          description: `Cluster has ${cluster.keyword_count} keywords with ${cluster.total_search_volume} monthly volume but no pillar page.`,
          suggested_value: cluster.primary_keyword,
          ai_reasoning: `Building a comprehensive pillar page for "${cluster.cluster_name}" will establish topical authority.`,
          supporting_data: { keywords: cluster.keywords?.slice(0, 10), suggestedTopics: cluster.ai_suggested_topics },
          effort: 'significant',
          ai_model: process.env.SEO_AI_MODEL || 'gpt-4o',
          analysis_run_id: runId,
          status: 'pending'
        })
      }

      // Low internal linking in cluster
      if (cluster.link_score < 50 && cluster.pillar_page_id) {
        recommendations.push({
          site_id: this.siteId,
          page_id: cluster.pillar_page_id,
          category: 'link',
          subcategory: 'topic_cluster',
          priority: 'medium',
          title: `Improve cluster linking: ${cluster.cluster_name}`,
          description: `Link score: ${cluster.link_score}/100. Add internal links between cluster pages.`,
          suggested_value: JSON.stringify(cluster.ai_link_suggestions?.slice(0, 5)),
          effort: 'quick',
          ai_model: process.env.SEO_AI_MODEL || 'gpt-4o',
          analysis_run_id: runId,
          status: 'pending'
        })
      }

      // Missing cluster content
      for (const gap of (cluster.ai_content_gaps || []).slice(0, 3)) {
        recommendations.push({
          site_id: this.siteId,
          category: 'content',
          subcategory: 'cluster_content',
          priority: 'medium',
          title: `Create cluster content: ${gap.title || gap}`,
          description: `Missing topic in ${cluster.cluster_name} cluster.`,
          suggested_value: gap.target_keyword || gap,
          supporting_data: { cluster: cluster.cluster_name, clusterId: cluster.id },
          effort: 'medium',
          ai_model: process.env.SEO_AI_MODEL || 'gpt-4o',
          analysis_run_id: runId,
          status: 'pending'
        })
      }
    }

    if (recommendations.length > 0) {
      await this.supabase.from('seo_ai_recommendations').insert(recommendations)
    }

    return { count: recommendations.length }
  }

  /**
   * Calculate health score
   */
  _calculateHealthScore(pages, existingRecs, criticalIssues) {
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

  // ═══════════════════════════════════════════════════════════════════════════════
  // FULL BACKGROUND ANALYSIS METHODS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Analyze competitor with GSC data context (for background worker)
   * @param {string} competitorDomain - Domain to analyze
   * @param {Object} options - Analysis options
   * @param {Array} options.ourKeywords - Our keywords from GSC
   * @param {Function} options.onProgress - Progress callback
   */
  async analyzeCompetitorFull(competitorDomain, options = {}) {
    const { ourKeywords = [], onProgress } = options

    onProgress?.({ step: 'loading', message: 'Loading site context...' })

    // Load site and knowledge
    const { data: site } = await this.supabase
      .from('seo_sites')
      .select('*, org:organizations(domain, name)')
      .eq('id', this.siteId)
      .single()

    const { data: knowledge } = await this.supabase
      .from('seo_knowledge_base')
      .select('*')
      .eq('site_id', this.siteId)
      .single()

    const ourDomain = site?.org?.domain || site?.domain || 'unknown'

    onProgress?.({ step: 'analyzing', message: 'Running AI competitive analysis...' })

    // Use Signal for AI analysis
    const analysis = await this.signal.invoke('seo', 'analyze_competitor_full', {
      our_domain: ourDomain,
      our_industry: knowledge?.industry || 'Unknown',
      our_services: knowledge?.services || [],
      our_service_areas: knowledge?.service_areas || [],
      our_keywords: ourKeywords.slice(0, 30).map(k => ({
        keyword: k.keyword,
        position: k.position?.toFixed?.(1) || k.position,
        clicks: k.clicks
      })),
      competitor_domain: competitorDomain
    }, {
      trackAction: true,
      additionalContext: {
        tool_prompt: `Analyze this competitor for SEO comparison.

OUR BUSINESS:
- Domain: ${ourDomain}
- Industry: ${knowledge?.industry || 'Unknown'}
- Services: ${knowledge?.services?.join(', ') || 'Unknown'}
- Service Areas: ${knowledge?.service_areas?.join(', ') || 'Unknown'}

OUR TOP KEYWORDS (from Google Search Console):
${ourKeywords.slice(0, 30).map(k => `- "${k.keyword}" (Position: ${k.position?.toFixed?.(1) || k.position}, Clicks: ${k.clicks})`).join('\n')}

COMPETITOR DOMAIN: ${competitorDomain}

Analyze the competitive landscape and provide:
1. POSITIONING ANALYSIS - How does this competitor position themselves? Market segments? Competitive advantage?
2. KEYWORD OPPORTUNITIES - 10-15 keywords we should target (gaps where competitor likely ranks)
3. CONTENT GAPS - What content should we create to compete better?
4. DIFFERENTIATION STRATEGY - How can we differentiate in search?

Return as JSON with: competitor_name, competitor_positioning, threat_level (high|medium|low), 
overlap_assessment, keyword_opportunities (array with keyword, difficulty, priority, rationale),
content_gaps (array with topic, content_type, priority), differentiation_strategies (array), quick_wins (array)`
      }
    })

    onProgress?.({ step: 'storing', message: 'Saving analysis results...' })

    // Store competitor data
    const competitorData = {
      site_id: this.siteId,
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

    // Upsert competitor data
    const { data: existing } = await this.supabase
      .from('seo_competitor_analysis')
      .select('id')
      .eq('site_id', this.siteId)
      .eq('domain', competitorData.domain)
      .single()

    if (existing) {
      await this.supabase
        .from('seo_competitor_analysis')
        .update(competitorData)
        .eq('id', existing.id)
    } else {
      competitorData.created_at = new Date().toISOString()
      await this.supabase
        .from('seo_competitor_analysis')
        .insert(competitorData)
    }

    return {
      success: true,
      competitor: competitorData,
      keywordsAnalyzed: ourKeywords.length,
      opportunities: analysis.keyword_opportunities?.length || 0
    }
  }

  /**
   * Generate comprehensive content brief with GSC context (for background worker)
   * @param {string} targetKeyword - Primary keyword to target
   * @param {Object} options - Brief generation options
   * @param {string} options.contentType - Type of content (blog, service_page, etc)
   * @param {string} options.additionalContext - Additional instructions
   * @param {Array} options.relatedKeywords - Related keywords from GSC
   * @param {Object} options.existingRankingData - Current ranking data if we already rank
   * @param {Function} options.onProgress - Progress callback
   */
  async generateContentBriefFull(targetKeyword, options = {}) {
    const {
      contentType = 'blog',
      additionalContext = '',
      relatedKeywords = [],
      existingRankingData = null,
      onProgress
    } = options

    onProgress?.({ step: 'loading', message: 'Loading site context...' })

    // Load site and knowledge
    const { data: site } = await this.supabase
      .from('seo_sites')
      .select('*, org:organizations(domain, name)')
      .eq('id', this.siteId)
      .single()

    const { data: knowledge } = await this.supabase
      .from('seo_knowledge_base')
      .select('*')
      .eq('site_id', this.siteId)
      .single()

    const { data: existingPages } = await this.supabase
      .from('seo_pages')
      .select('url, title, h1')
      .eq('site_id', this.siteId)
      .limit(50)

    const domain = site?.org?.domain || site?.domain

    onProgress?.({ step: 'generating', message: 'Generating content brief...' })

    const contentTypeDescriptions = {
      blog: 'an informative blog post that educates and engages readers',
      service_page: 'a service page that converts visitors into leads',
      landing_page: 'a focused landing page optimized for conversions',
      guide: 'a comprehensive guide that establishes authority',
      case_study: 'a case study that showcases results and builds trust'
    }

    // Use Signal for AI generation
    const brief = await this.signal.invoke('seo', 'generate_content_brief_full', {
      target_keyword: targetKeyword,
      content_type: contentType,
      business_context: {
        name: knowledge?.business_name || site?.org?.name || domain,
        industry: knowledge?.industry,
        services: knowledge?.services,
        service_areas: knowledge?.service_areas,
        target_audience: knowledge?.target_audience,
        usps: knowledge?.unique_selling_points
      },
      related_keywords: relatedKeywords.slice(0, 15),
      existing_pages: existingPages?.slice(0, 10),
      existing_ranking: existingRankingData
    }, {
      trackAction: true,
      additionalContext: {
        tool_prompt: `Generate a comprehensive SEO content brief for creating ${contentTypeDescriptions[contentType]}.

BUSINESS CONTEXT:
- Business: ${knowledge?.business_name || site?.org?.name || domain}
- Industry: ${knowledge?.industry || 'Not specified'}
- Services: ${knowledge?.services?.join(', ') || 'Not specified'}
- Service Areas: ${knowledge?.service_areas?.join(', ') || 'Not specified'}
- Target Audience: ${knowledge?.target_audience || 'Not specified'}
- USPs: ${knowledge?.unique_selling_points?.join('; ') || 'Not specified'}

TARGET KEYWORD: "${targetKeyword}"

${existingRankingData ? `CURRENT RANKING:
We already rank #${existingRankingData.position?.toFixed?.(0) || existingRankingData.position} for this keyword at: ${existingRankingData.url}
This brief should help improve/update that content.` : 'We do not currently rank for this keyword.'}

RELATED KEYWORDS FROM GSC (consider incorporating):
${relatedKeywords.slice(0, 15).map(k => `- "${k.keyword}" (${k.impressions} impressions, position ${k.position?.toFixed?.(1) || k.position})`).join('\n')}

EXISTING PAGES FOR INTERNAL LINKING:
${existingPages?.slice(0, 10).map(p => `- ${p.title || p.url}`).join('\n') || 'None available'}

${additionalContext ? `ADDITIONAL CONTEXT:\n${additionalContext}` : ''}

Create a detailed content brief with:
1. Optimized title tag (60 chars max)
2. Meta description (160 chars max)
3. H1 heading and target word count
4. Search intent analysis
5. Suggested outline with H2/H3 structure
6. Secondary keywords, LSI keywords
7. Internal linking suggestions
8. CTA recommendations
9. FAQ section suggestions for featured snippets
10. Content differentiation strategies

Return as JSON with: title_tag, meta_description, h1, target_word_count, search_intent, 
intent_analysis, outline (array with type, text, key_points, target_words), 
primary_keyword, secondary_keywords, lsi_keywords, internal_links, cta_suggestions, 
faq_suggestions, differentiation_notes, competitor_gap_opportunities`
      }
    })

    onProgress?.({ step: 'storing', message: 'Saving content brief...' })

    // Store the brief
    const briefData = {
      site_id: this.siteId,
      target_keyword: targetKeyword,
      content_type: contentType,
      status: 'draft',
      title_tag: brief.title_tag,
      meta_description: brief.meta_description,
      h1: brief.h1,
      target_word_count: brief.target_word_count,
      search_intent: brief.search_intent,
      intent_analysis: brief.intent_analysis,
      outline: brief.outline,
      primary_keyword: brief.primary_keyword,
      secondary_keywords: brief.secondary_keywords,
      lsi_keywords: brief.lsi_keywords,
      internal_links: brief.internal_links,
      cta_suggestions: brief.cta_suggestions,
      faq_suggestions: brief.faq_suggestions,
      differentiation_notes: brief.differentiation_notes,
      competitor_gap_opportunities: brief.competitor_gap_opportunities,
      related_keywords_from_gsc: relatedKeywords.slice(0, 15),
      existing_ranking: existingRankingData,
      ai_model: process.env.SEO_AI_MODEL || 'gpt-4o',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: savedBrief, error: saveError } = await this.supabase
      .from('seo_content_briefs')
      .insert(briefData)
      .select()
      .single()

    if (saveError) {
      throw new Error(`Failed to save brief: ${saveError.message}`)
    }

    return {
      success: true,
      brief: savedBrief,
      relatedKeywordsFound: relatedKeywords.length,
      hasExistingRanking: !!existingRankingData
    }
  }

  /**
   * Analyze internal linking structure with page crawling (for background worker)
   * @param {Object} options - Analysis options
   * @param {boolean} options.crawlLinks - Whether to crawl pages for link data
   * @param {number} options.maxPages - Max pages to analyze
   * @param {Function} options.onProgress - Progress callback
   */
  async analyzeInternalLinksFull(options = {}) {
    const { crawlLinks = true, maxPages = 75, onProgress } = options

    onProgress?.({ step: 'loading', message: 'Loading site data...' })

    // Load site and pages
    const { data: site } = await this.supabase
      .from('seo_sites')
      .select('*, org:organizations(domain)')
      .eq('id', this.siteId)
      .single()

    const { data: pages } = await this.supabase
      .from('seo_pages')
      .select('*')
      .eq('site_id', this.siteId)
      .order('clicks_28d', { ascending: false, nullsFirst: false })
      .limit(100)

    const { data: knowledge } = await this.supabase
      .from('seo_knowledge_base')
      .select('content_pillars, primary_services')
      .eq('site_id', this.siteId)
      .single()

    const domain = site?.org?.domain || site?.domain

    onProgress?.({ step: 'crawling', message: `Crawling ${Math.min(pages?.length || 0, maxPages)} pages for links...` })

    // Crawl pages for link data if requested
    if (crawlLinks && pages?.length > 0) {
      const { load } = await import('cheerio')
      const linkMap = new Map()

      // Initialize all pages
      pages.forEach(p => {
        linkMap.set(p.url, { inLinks: [], outLinks: [] })
      })

      const pagesToCrawl = pages.slice(0, maxPages)
      let crawled = 0

      for (const page of pagesToCrawl) {
        try {
          const response = await fetch(page.url, {
            headers: { 'User-Agent': 'UptradeSEOBot/1.0' },
            signal: AbortSignal.timeout(10000)
          })

          if (!response.ok) continue

          const html = await response.text()
          const $ = load(html)

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

          crawled++
          if (crawled % 10 === 0) {
            onProgress?.({ step: 'crawling', message: `Crawled ${crawled}/${pagesToCrawl.length} pages...` })
          }
        } catch (e) {
          // Continue on crawl errors
        }
      }

      // Update database with link counts
      onProgress?.({ step: 'updating', message: 'Updating link counts...' })
      for (const page of pages) {
        const pageData = linkMap.get(page.url)
        if (pageData) {
          await this.supabase
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
    const { data: updatedPages } = await this.supabase
      .from('seo_pages')
      .select('*')
      .eq('site_id', this.siteId)
      .order('clicks_28d', { ascending: false, nullsFirst: false })
      .limit(100)

    onProgress?.({ step: 'analyzing', message: 'Running AI analysis...' })

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

    // Use Signal for AI analysis
    const analysis = await this.signal.invoke('seo', 'analyze_internal_links', {
      site_structure: {
        content_pillars: contentPillars,
        services
      },
      pages: topPages
    }, {
      trackAction: true,
      additionalContext: {
        tool_prompt: `Analyze this site's internal linking structure and provide strategic recommendations.

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

**IMPORTANT: You must return your response as valid JSON.**

Return as JSON object with these fields:
- assessment (string: overall health)
- score (number: 0-100)
- criticalIssues (array with: issue, affectedPages, recommendation)
- linkingOpportunities (array with: fromPage, toPage, suggestedAnchor, reason, priority)
- hubPageRecommendations (array with: page, role, shouldLinkTo, reason)
- orphanPageFixes (array with: orphanPage, linkFrom, suggestedAnchors)
- topicClusterStrategy (object with clusters array containing: pillarPage, clusterPages, missingLinks)`
      }
    })

    onProgress?.({ step: 'storing', message: 'Saving recommendations...' })

    // Store recommendations
    const recommendations = []

    // Add critical issues as recommendations
    analysis.criticalIssues?.forEach(issue => {
      recommendations.push({
        site_id: this.siteId,
        category: 'link',
        subcategory: 'internal',
        priority: 'high',
        title: issue.issue,
        description: issue.recommendation,
        supporting_data: { affectedPages: issue.affectedPages },
        auto_fixable: false,
        status: 'pending',
        ai_model: process.env.SEO_AI_MODEL || 'gpt-4o',
        created_at: new Date().toISOString()
      })
    })

    // Add high priority linking opportunities
    analysis.linkingOpportunities?.filter(o => o.priority === 'high').forEach(opp => {
      recommendations.push({
        site_id: this.siteId,
        category: 'link',
        subcategory: 'internal',
        priority: 'medium',
        title: `Add internal link from ${opp.fromPage} to ${opp.toPage}`,
        description: opp.reason,
        current_value: opp.fromPage,
        suggested_value: `Link to ${opp.toPage} with anchor: "${opp.suggestedAnchor}"`,
        auto_fixable: false,
        status: 'pending',
        ai_model: process.env.SEO_AI_MODEL || 'gpt-4o',
        created_at: new Date().toISOString()
      })
    })

    // Save recommendations
    if (recommendations.length > 0) {
      await this.supabase.from('seo_ai_recommendations').insert(recommendations)
    }

    // Identify orphan pages
    const orphanPages = (updatedPages || []).filter(p =>
      (p.internal_links_in || 0) === 0 &&
      !p.url.includes('sitemap') &&
      !p.url.includes('privacy') &&
      !p.url.includes('terms')
    )

    return {
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
  }

  /**
   * Generate optimization summary for auto-optimize runs
   * @param {Object} results - Results from optimization modules
   * @param {Object} site - Site data
   */
  async generateOptimizationSummary(results, site) {
    try {
      const response = await this.signal.invoke('seo', 'generate_optimization_summary', {
        domain: site?.domain || 'site',
        modules: results.modules,
        total_recommendations: results.totalRecommendations,
        auto_applied: results.autoApplied,
        alerts: results.alerts
      }, {
        additionalContext: {
          tool_prompt: `Summarize this SEO optimization run for ${site?.domain || 'site'}:

Results:
${JSON.stringify(results.modules, null, 2)}

Total Recommendations: ${results.totalRecommendations}
Auto-Applied: ${results.autoApplied}
Alerts Generated: ${results.alerts}

Provide a brief executive summary (2-3 sentences) highlighting:
1. Key findings
2. Most important actions needed
3. Overall site health trend

Return as JSON:
{
  "summary": "Executive summary text",
  "healthTrend": "improving|stable|declining",
  "topPriority": "Most important action"
}`
        }
      })

      return response

    } catch (error) {
      console.error('[SEOSkill] Summary generation error:', error)
      return { summary: 'Optimization completed. Review recommendations for details.' }
    }
  }

  /**
   * Generate AI summary for scheduled analysis runs
   * @param {Object} results - Analysis results by module
   * @param {Object} site - Site data
   */
  async generateAnalysisSummary(results, site) {
    try {
      const response = await this.signal.invoke('seo', 'generate_analysis_summary', {
        domain: site?.domain || 'site',
        results
      }, {
        additionalContext: {
          tool_prompt: `SEO Analysis for ${site?.domain || 'site'}:
${JSON.stringify(results, null, 2)}

Provide a brief summary with top priority action. Be concise - 2-3 sentences max.

Return plain text summary.`
        }
      })

      return typeof response === 'string' ? response : response.summary || 'Analysis complete. Review dashboard for details.'

    } catch (error) {
      console.error('[SEOSkill] Analysis summary error:', error)
      return 'Analysis complete. Review dashboard for details.'
    }
  }

  /**
   * Run AI Brain comprehensive analysis (for orchestrators)
   * @param {Object} knowledge - Site knowledge base data
   * @param {Object} options - Analysis options
   */
  async runAIBrainAnalysis(knowledge, options = {}) {
    const { maxPages = 50 } = options

    // Get pages that need analysis
    const { data: pages } = await this.supabase
      .from('seo_pages')
      .select('*')
      .eq('site_id', this.siteId)
      .order('clicks_28d', { ascending: false, nullsFirst: false })
      .limit(maxPages)

    if (!pages?.length) {
      return { status: 'no_pages', recommendationsGenerated: 0 }
    }

    // Analyze pages and generate recommendations
    const result = await this.signal.invoke('seo', 'brain_analysis', {
      knowledge_context: knowledge ? {
        business_name: knowledge.business_name,
        industry: knowledge.industry,
        services: knowledge.primary_services?.join(', ')
      } : null,
      pages: pages.slice(0, 20).map(p => ({
        url: p.url,
        title: p.title || 'Missing',
        clicks: p.clicks_28d || 0,
        position: p.avg_position?.toFixed?.(1) || 'N/A',
        has_meta: !!p.meta_description,
        has_h1: !!p.h1
      }))
    }, {
      additionalContext: {
        tool_prompt: `Analyze these pages for SEO optimization opportunities:

SITE CONTEXT:
${knowledge ? `
Business: ${knowledge.business_name}
Industry: ${knowledge.industry}
Services: ${knowledge.primary_services?.join(', ')}
` : 'No site knowledge available'}

TOP PAGES (${pages.length}):
${pages.slice(0, 20).map(p => `
- ${p.url}
  Title: ${p.title || 'Missing'}
  Clicks: ${p.clicks_28d || 0}
  Position: ${p.avg_position?.toFixed?.(1) || 'N/A'}
  Meta: ${p.meta_description ? 'Yes' : 'Missing'}
  H1: ${p.h1 ? 'Yes' : 'Missing'}
`).join('\n')}

Generate prioritized SEO recommendations. Focus on:
1. Missing or weak title tags
2. Missing meta descriptions
3. Striking distance keywords (position 4-20)
4. Content gaps
5. Technical issues

Return as JSON:
{
  "recommendations": [
    {
      "pageUrl": "url",
      "category": "title|meta|content|technical|keyword",
      "priority": "critical|high|medium|low",
      "title": "Brief title",
      "description": "Detailed explanation",
      "currentValue": "What exists now",
      "suggestedValue": "What to change to",
      "autoFixable": true/false,
      "impactScore": 1-10
    }
  ]
}`
      }
    })

    const recommendations = result.recommendations || []

    // Save recommendations to database
    for (const rec of recommendations) {
      const page = pages.find(p => p.url === rec.pageUrl)

      await this.supabase
        .from('seo_ai_recommendations')
        .insert({
          site_id: this.siteId,
          page_id: page?.id,
          category: rec.category,
          priority: rec.priority,
          title: rec.title,
          description: rec.description,
          current_value: rec.currentValue,
          suggested_value: rec.suggestedValue,
          auto_fixable: rec.autoFixable || false,
          impact_score: rec.impactScore,
          status: 'pending',
          ai_model: process.env.SEO_AI_MODEL || 'gpt-4o',
          created_at: new Date().toISOString()
        })
    }

    return {
      status: 'completed',
      pagesAnalyzed: pages.length,
      recommendationsGenerated: recommendations.length
    }
  }

  /**
   * Generate AI recommendations from technical audit results
   * @param {Object} auditResults - Audit results with issues, warnings, passed, metrics, score
   * @param {Object} site - Site data with domain
   */
  async generateTechnicalAuditRecommendations(auditResults, site) {
    try {
      const result = await this.signal.invoke('seo', 'generate_technical_audit_recommendations', {
        domain: site?.domain,
        audit_score: auditResults.score,
        issues: auditResults.issues,
        warnings: auditResults.warnings,
        passed: auditResults.passed,
        metrics: auditResults.metrics
      }, {
        additionalContext: {
          tool_prompt: `Analyze this technical SEO audit and provide prioritized recommendations.

SITE: ${site?.domain}

AUDIT SCORE: ${auditResults.score}/100

CRITICAL ISSUES (${auditResults.issues?.length || 0}):
${auditResults.issues?.map(i => `- ${i.message || i} (${i.severity || 'medium'})`).join('\n') || 'None'}

WARNINGS (${auditResults.warnings?.length || 0}):
${auditResults.warnings?.map(w => `- ${w.message || w} (${w.severity || 'low'})`).join('\n') || 'None'}

PASSED CHECKS (${auditResults.passed?.length || 0}):
${auditResults.passed?.map(p => `- ${typeof p === 'string' ? p : p.message}`).join('\n') || 'None'}

METRICS:
${JSON.stringify(auditResults.metrics, null, 2)}

Provide the top 5 prioritized recommendations in JSON format:
{
  "recommendations": [
    {
      "title": "Brief title",
      "description": "Detailed explanation",
      "currentIssue": "What's wrong",
      "solution": "How to fix it",
      "priority": "critical|high|medium|low",
      "impactScore": 1-10,
      "category": "core_web_vitals|crawlability|indexability|security|content|structure"
    }
  ]
}`
        }
      })

      return result.recommendations || []

    } catch (error) {
      console.error('[SEOSkill] Technical audit recommendations error:', error)
      return []
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SYNC FUNCTION METHODS (Content Decay, Backlink Gap, Competitor, Content Brief)
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Generate content refresh recommendations for decaying pages
   * Used by seo-content-decay.js
   * @param {Array} decayingPages - Pages with decay metrics
   * @param {Object} site - Site data with domain and org name
   */
  async generateContentRefreshRecommendations(decayingPages, site) {
    try {
      const result = await this.signal.invoke('seo', 'generate_content_refresh_recommendations', {
        domain: site?.domain,
        pages: decayingPages.map(p => ({
          url: p.url,
          title: p.title,
          severity: p.severity,
          metrics: p.metrics,
          decayFactors: p.decayFactors
        }))
      }, {
        additionalContext: {
          tool_prompt: `Analyze these decaying content pages and provide specific refresh recommendations.

SITE: ${site?.domain}
INDUSTRY: ${site?.org?.name || 'Unknown'}

DECAYING PAGES:
${decayingPages.map((p, i) => `
${i + 1}. ${p.url}
   Title: ${p.title}
   Severity: ${p.severity}
   Clicks: ${p.metrics.earlierClicks} → ${p.metrics.recentClicks} (${p.metrics.clicksChange}%)
   Position: ${p.metrics.earlierPosition || 'N/A'} → ${p.metrics.recentPosition || 'N/A'}
   Decay Factors: ${p.decayFactors.join(', ')}
`).join('\n')}

For each page, provide a specific refresh strategy:
1. Why is it likely decaying? (content freshness, competition, search intent shift, etc.)
2. What specific updates would help recover rankings?
3. Priority level for refresh

Return as JSON:
{
  "recommendations": [
    {
      "pageUrl": "url",
      "title": "page title",
      "pageId": "id",
      "severity": "critical|high|medium",
      "likelyDecayCause": "explanation",
      "recommendation": "detailed recommendation",
      "refreshStrategy": "specific steps to take",
      "estimatedEffort": "hours",
      "potentialImpact": "expected traffic recovery"
    }
  ]
}`
        }
      })

      // Merge with original page data
      return (result.recommendations || []).map(rec => {
        const original = decayingPages.find(p => p.url === rec.pageUrl)
        return {
          ...rec,
          pageId: original?.pageId,
          metrics: original?.metrics
        }
      })

    } catch (error) {
      console.error('[SEOSkill] Content refresh recommendations error:', error)
      return []
    }
  }

  /**
   * Suggest backlink sources based on industry and competitors
   * Used by seo-backlink-gap.js
   * @param {Object} site - Site data with domain
   * @param {Array} competitors - Array of competitor domains
   * @param {Object} knowledge - Site knowledge with industry, business_type, services
   */
  async suggestBacklinkSources(site, competitors, knowledge) {
    try {
      const result = await this.signal.invoke('seo', 'suggest_backlink_sources', {
        domain: site?.domain,
        competitors,
        industry: knowledge?.industry,
        businessType: knowledge?.business_type,
        services: knowledge?.primary_services
      }, {
        additionalContext: {
          tool_prompt: `You are a link building expert. Suggest potential backlink sources based on the industry and competitors.

Think about:
1. Industry directories and listings
2. Resource pages that link to similar companies
3. Guest posting opportunities
4. Industry publications and blogs
5. Local business directories
6. Professional associations
7. Tool/resource aggregators

Domain: ${site?.domain}
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
      })

      return result.sources || []

    } catch (error) {
      console.error('[SEOSkill] Backlink sources error:', error)
      return []
    }
  }

  /**
   * Analyze a potential backlink source for opportunity assessment
   * Used by seo-backlink-gap.js
   * @param {Object} source - Source data to analyze
   * @param {string} ourDomain - Our domain
   * @param {Array} competitors - Competitor domains
   * @param {Object} knowledge - Site knowledge
   */
  async analyzeBacklinkSource(source, ourDomain, competitors, knowledge) {
    try {
      const result = await this.signal.invoke('seo', 'analyze_backlink_source', {
        source,
        ourDomain,
        competitors,
        industry: knowledge?.industry
      }, {
        additionalContext: {
          tool_prompt: `You are analyzing a potential backlink source. Assess if it's a good opportunity for outreach.

Analyze this backlink source:

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
      })

      return result

    } catch (error) {
      console.error('[SEOSkill] Backlink analysis error:', error)
      return { isOpportunity: false }
    }
  }

  /**
   * Analyze a competitor for SEO comparison (sync version)
   * Used by seo-competitor-analyze.js for synchronous requests
   * @param {string} competitorDomain - Domain to analyze
   * @param {Object} options - Analysis options
   * @param {Array} options.ourKeywords - Our GSC keywords with position, clicks
   * @param {Object} options.knowledge - Site knowledge with industry, services, service_areas
   * @param {string} options.ourDomain - Our domain for comparison
   */
  async analyzeCompetitorSync(competitorDomain, options = {}) {
    const { ourKeywords = [], knowledge = {}, ourDomain = '' } = options

    try {
      const result = await this.signal.invoke('seo', 'analyze_competitor_sync', {
        competitorDomain,
        ourDomain,
        ourKeywords: ourKeywords.slice(0, 30),
        industry: knowledge?.industry,
        services: knowledge?.services,
        serviceAreas: knowledge?.service_areas
      }, {
        additionalContext: {
          tool_prompt: `Analyze this competitor for SEO comparison.

OUR BUSINESS:
- Domain: ${ourDomain}
- Industry: ${knowledge?.industry || 'Unknown'}
- Services: ${knowledge?.services?.join(', ') || 'Unknown'}
- Service Areas: ${knowledge?.service_areas?.join(', ') || 'Unknown'}

OUR TOP KEYWORDS (from Google Search Console):
${ourKeywords.slice(0, 30).map(k => `- "${k.keyword}" (Position: ${k.position?.toFixed(1) || 'N/A'}, Clicks: ${k.clicks})`).join('\n')}

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
        }
      })

      return result

    } catch (error) {
      console.error('[SEOSkill] Competitor analysis error:', error)
      return {
        competitor_name: competitorDomain,
        error: 'Failed to analyze'
      }
    }
  }

  /**
   * Generate a content brief for a target keyword (sync version)
   * Used by seo-content-brief.js for synchronous requests
   * @param {string} targetKeyword - Primary keyword to target
   * @param {Object} options - Brief generation options
   * @param {string} options.contentType - blog, service_page, landing_page, guide, case_study
   * @param {Object} options.knowledge - Site knowledge base
   * @param {Array} options.relatedKeywords - Related keywords from GSC
   * @param {Object} options.existingPageData - If we already rank for this keyword
   * @param {Array} options.existingPages - Existing site pages for internal linking
   * @param {string} options.additionalContext - Extra context from user
   */
  async generateContentBriefSync(targetKeyword, options = {}) {
    const {
      contentType = 'blog',
      knowledge = {},
      relatedKeywords = [],
      existingPageData = null,
      existingPages = [],
      additionalContext = ''
    } = options

    const contentTypeDescriptions = {
      blog: 'an informative blog post that educates and engages readers',
      service_page: 'a service page that converts visitors into leads',
      landing_page: 'a focused landing page optimized for conversions',
      guide: 'a comprehensive guide that establishes authority',
      case_study: 'a case study that showcases results and builds trust'
    }

    try {
      const result = await this.signal.invoke('seo', 'generate_content_brief_sync', {
        targetKeyword,
        contentType,
        businessName: knowledge?.business_name,
        industry: knowledge?.industry,
        services: knowledge?.services,
        serviceAreas: knowledge?.service_areas,
        targetAudience: knowledge?.target_audience,
        usps: knowledge?.unique_selling_points,
        relatedKeywords: relatedKeywords.slice(0, 15),
        existingPageData,
        existingPages: existingPages?.slice(0, 10)
      }, {
        additionalContext: {
          tool_prompt: `Generate a comprehensive SEO content brief for creating ${contentTypeDescriptions[contentType]}.

BUSINESS CONTEXT:
- Business: ${knowledge?.business_name || 'Unknown'}
- Industry: ${knowledge?.industry || 'Not specified'}
- Services: ${knowledge?.services?.join(', ') || 'Not specified'}
- Service Areas: ${knowledge?.service_areas?.join(', ') || 'Not specified'}
- Target Audience: ${knowledge?.target_audience || 'Not specified'}
- USPs: ${knowledge?.unique_selling_points?.join('; ') || 'Not specified'}

TARGET KEYWORD: "${targetKeyword}"

${existingPageData ? `CURRENT RANKING:
We already rank #${existingPageData.position?.toFixed(0) || 'N/A'} for this keyword at: ${existingPageData.url}
This brief should help improve/update that content.` : 'We do not currently rank for this keyword.'}

RELATED KEYWORDS FROM GSC (consider incorporating):
${relatedKeywords.slice(0, 15).map(k => `- "${k.keyword}" (${k.impressions} impressions, position ${k.position?.toFixed(1) || 'N/A'})`).join('\n')}

EXISTING PAGES FOR INTERNAL LINKING:
${existingPages?.slice(0, 10).map(p => `- ${p.title || p.url}`).join('\n') || 'None available'}

${additionalContext ? `ADDITIONAL CONTEXT:\n${additionalContext}` : ''}

Create a detailed content brief with:
1. Optimized title tag (60 chars max)
2. Meta description (160 chars max)
3. H1 heading
4. Target word count
5. Search intent analysis
6. Suggested outline with H2/H3 structure
7. Key points to cover for each section
8. Secondary keywords to include naturally
9. Internal linking suggestions
10. Call-to-action recommendations
11. FAQ section suggestions (for featured snippet opportunities)
12. Content differentiation strategies

Return as JSON:
{
  "title_tag": "SEO-optimized title",
  "meta_description": "Compelling meta description",
  "h1": "Main heading",
  "target_word_count": 1500,
  "search_intent": "informational|transactional|navigational|commercial",
  "intent_analysis": "Brief explanation of searcher intent",
  "outline": [
    {
      "type": "h2",
      "text": "Section heading",
      "key_points": ["Point 1", "Point 2"],
      "target_words": 200
    },
    {
      "type": "h3",
      "text": "Subsection heading",
      "key_points": ["Point 1"],
      "target_words": 150
    }
  ],
  "primary_keyword": "target keyword",
  "secondary_keywords": ["keyword 1", "keyword 2"],
  "lsi_keywords": ["related term 1", "related term 2"],
  "internal_links": [
    {
      "anchor_text": "suggested anchor",
      "target_url": "URL to link to",
      "context": "Where in content to place"
    }
  ],
  "cta_suggestions": [
    {
      "type": "primary|secondary",
      "text": "CTA text",
      "placement": "Where to place"
    }
  ],
  "faq_suggestions": [
    {
      "question": "FAQ question",
      "answer_points": ["Key point 1", "Key point 2"]
    }
  ],
  "differentiation_notes": "How to make this content stand out",
  "competitor_gap_opportunities": "Content gaps to exploit"
}`
        }
      })

      return result

    } catch (error) {
      console.error('[SEOSkill] Content brief error:', error)
      return null
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // BLOG BRAIN METHODS (Topic recommendations, blog analysis, content generation)
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Generate blog topic recommendations based on SEO intelligence
   * Used by seo-ai-blog-brain.js
   * @param {Object} seoContext - Context with knowledge, keywords, gaps, competitors, recentPosts
   * @param {Object} options - Options like category focus
   */
  async generateBlogTopicRecommendations(seoContext, options = {}) {
    const { knowledge, keywords, gaps, competitors, recentPosts } = seoContext

    const existingTopics = recentPosts?.map(p => p.title).join('\n') || 'None'
    const keywordOpportunities = (keywords || [])
      .filter(k => k.opportunity_score > 50)
      .slice(0, 20)
      .map(k => `${k.keyword} (vol: ${k.search_volume_monthly}, pos: ${k.current_position || 'not ranking'})`)
      .join('\n')
    
    const gapTopics = (gaps || [])
      .slice(0, 10)
      .map(g => `${g.topic}: ${g.ai_reasoning}`)
      .join('\n')

    const competitorInsights = (competitors || [])
      .flatMap(c => (c.keyword_gap_data || []).slice(0, 5))
      .map(k => k.keyword)
      .join(', ')

    try {
      const result = await this.signal.invoke('seo', 'generate_blog_topic_recommendations', {
        businessName: knowledge?.business_name,
        industry: knowledge?.industry,
        services: knowledge?.primary_services,
        targetAudience: knowledge?.target_personas,
        keywordCount: keywords?.length || 0,
        category: options.category
      }, {
        additionalContext: {
          tool_prompt: `Based on this SEO intelligence, recommend 10 blog post topics that would drive organic traffic.

## BUSINESS CONTEXT
${knowledge?.business_name ? `Business: ${knowledge.business_name}` : ''}
${knowledge?.industry ? `Industry: ${knowledge.industry}` : ''}
${knowledge?.primary_services ? `Services: ${JSON.stringify(knowledge.primary_services)}` : ''}
${knowledge?.target_personas ? `Target Audience: ${JSON.stringify(knowledge.target_personas)}` : ''}

## KEYWORD OPPORTUNITIES
${keywordOpportunities || 'No keyword data available'}

## CONTENT GAPS IDENTIFIED
${gapTopics || 'No gaps identified'}

## COMPETITOR KEYWORDS WE DON'T RANK FOR
${competitorInsights || 'No competitor data'}

## RECENTLY PUBLISHED (avoid duplicates)
${existingTopics || 'No recent posts'}

## CATEGORY FOCUS
${options.category ? `Focus on: ${options.category}` : 'Any relevant category'}

Generate 10 topic recommendations. For each topic provide:
1. Title (compelling, keyword-rich, 50-60 chars)
2. Primary keyword to target
3. Search intent (informational, commercial, transactional)
4. Estimated traffic potential (low/medium/high)
5. Content angle (what makes this piece unique)
6. Related services to link
7. Why this topic matters now

Return as JSON:
{
  "topics": [
    {
      "title": "Topic title",
      "primaryKeyword": "keyword",
      "searchIntent": "informational|commercial|transactional",
      "trafficPotential": "low|medium|high",
      "contentAngle": "unique angle",
      "relatedServices": ["service1", "service2"],
      "whyNow": "reasoning"
    }
  ]
}`
        }
      })

      return result

    } catch (error) {
      console.error('[SEOSkill] Blog topic recommendations error:', error)
      return { topics: [] }
    }
  }

  /**
   * Analyze and optimize a blog post
   * Used by seo-ai-blog-brain.js
   * @param {Object} post - Blog post data with title, content, meta fields
   * @param {Object} seoContext - Context with knowledge, keywords
   * @param {string} writingGuidelines - Style guidelines for the analysis
   */
  async analyzeBlogPost(post, seoContext, writingGuidelines = '') {
    const { knowledge, keywords } = seoContext

    // Find relevant keywords for this post's topic
    const relevantKeywords = (keywords || [])
      .filter(k => {
        const postText = `${post.title} ${post.content || ''}`.toLowerCase()
        return postText.includes(k.keyword?.toLowerCase() || '')
      })
      .slice(0, 10)

    try {
      const result = await this.signal.invoke('seo', 'analyze_blog_post', {
        postTitle: post.title,
        postMetaTitle: post.meta_title,
        postMetaDescription: post.meta_description,
        focusKeyphrase: post.focus_keyphrase,
        wordCount: post.content?.split(/\s+/).length || 0
      }, {
        additionalContext: {
          tool_prompt: `Analyze this blog post and provide specific optimization recommendations.

## CURRENT POST
Title: ${post.title}
Meta Title: ${post.meta_title}
Meta Description: ${post.meta_description}
Focus Keyphrase: ${post.focus_keyphrase}
Word Count: ${post.content?.split(/\s+/).length || 0}

Content:
${post.content?.substring(0, 4000) || 'No content'}

## RELEVANT KEYWORDS WE COULD TARGET
${relevantKeywords.map(k => `- ${k.keyword} (vol: ${k.search_volume_monthly}, intent: ${k.intent})`).join('\n') || 'None'}

## BUSINESS CONTEXT
${knowledge?.brand_voice_description || 'Professional and approachable'}

## CRITICAL STYLE CHECKS
1. Does it use em dashes (—)? These must be removed and replaced with commas, periods, or parentheses.
2. Is the tone conversational like teaching a friend, or stiff and formal?
3. Are there credible sources cited with specific data?
4. Are paragraphs short (2-3 sentences)?
5. Does it have a compelling hook, not a generic opener?

${writingGuidelines ? `## WRITING GUIDELINES\n${writingGuidelines}` : ''}

Provide:
1. SEO Score (0-100)
2. Content Quality Score (0-100)
3. Style Compliance Score (0-100) - based on our writing guidelines
4. Specific issues found (with line references if possible)
5. Optimized title (if current is suboptimal)
6. Optimized meta description
7. Better focus keyphrase recommendation
8. Content additions or improvements needed
9. Internal linking opportunities
10. FAQ questions to add

Return as JSON:
{
  "seoScore": 75,
  "contentQualityScore": 80,
  "styleComplianceScore": 70,
  "issues": [{"issue": "description", "severity": "high|medium|low"}],
  "optimizedTitle": "Better title",
  "optimizedMetaDescription": "Better description",
  "recommendedKeyphrase": "better keyphrase",
  "contentImprovements": ["improvement 1", "improvement 2"],
  "internalLinks": [{"anchor": "text", "targetUrl": "url", "context": "where to place"}],
  "faqSuggestions": [{"question": "Q?", "answerPoints": ["point1", "point2"]}]
}`
        }
      })

      return result

    } catch (error) {
      console.error('[SEOSkill] Blog analysis error:', error)
      return null
    }
  }

  /**
   * Generate optimized content for a blog post section
   * Used by seo-ai-blog-brain.js
   * @param {Object} options - Generation options
   * @param {string} options.instruction - What to generate
   * @param {string} options.existingContent - Content to improve
   * @param {string} options.targetKeyword - Keyword to target
   * @param {string} options.section - Section focus
   * @param {Object} seoContext - Context with knowledge
   * @param {string} writingGuidelines - Style guidelines
   */
  async generateBlogContent(options, seoContext, writingGuidelines = '') {
    const { knowledge } = seoContext

    try {
      const result = await this.signal.invoke('seo', 'generate_blog_content', {
        instruction: options.instruction,
        targetKeyword: options.targetKeyword,
        section: options.section
      }, {
        additionalContext: {
          tool_prompt: `${options.instruction}

## CONTEXT
${options.existingContent ? `Existing content to improve:\n${options.existingContent}` : ''}
${options.targetKeyword ? `Target keyword: ${options.targetKeyword}` : ''}
${options.section ? `Section focus: ${options.section}` : ''}

## BUSINESS VOICE
${knowledge?.brand_voice_description || 'Professional, approachable, educational'}
${knowledge?.terminology ? `Use terms: ${JSON.stringify(knowledge.terminology)}` : ''}

${writingGuidelines ? `## WRITING GUIDELINES\n${writingGuidelines}` : ''}

Remember: Write like teaching a smart friend. No em dashes. Cite sources. Be conversational.

Return the generated content as plain text.`
        }
      })

      return result?.content || result

    } catch (error) {
      console.error('[SEOSkill] Blog content generation error:', error)
      return null
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export function createSEOSkill(supabase, orgId, siteId, options = {}) {
  return new SEOSkill(supabase, orgId, siteId, options)
}

export default SEOSkill
