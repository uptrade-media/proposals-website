// DEPRECATED: This skill wrapper is no longer used.
/**
 * Signal Content Skill
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * The Content skill provides AI-powered blog and portfolio content generation.
 * Multi-tenant support for Uptrade Media and God's Workout Apparel.
 * 
 * Available Tools:
 * - generate_blog: Create a complete blog post
 * - edit_blog: Revise blog content with instructions
 * - generate_portfolio: Create portfolio case study content
 * - edit_portfolio: Revise portfolio content
 * - suggest_topics: Generate content topic ideas
 * - optimize_seo: Optimize content for SEO
 * 
 * Usage:
 *   import { ContentSkill } from './skills/content-skill.js'
 *   const content = new ContentSkill(supabase, orgId, { userId })
 *   const blog = await content.generateBlog(topic, options)
 */

import { Signal, createModuleEcho } from '../utils/signal.js'
import {
  UPTRADE_SERVICES,
  UPTRADE_WRITING_STYLE,
  GWA_WRITING_STYLE,
  BLOG_OUTPUT_SCHEMA,
  getTenantWritingStyle,
  findRelatedServices,
  buildServicesContext
} from '../utils/content-blocks.js'
import {
  PORTFOLIO_STYLE,
  PORTFOLIO_OUTPUT_SCHEMA,
  TECH_REGISTRY,
  VALID_TECH_NAMES,
  validateTechStack,
  validateIconName
} from '../utils/portfolio-blocks.js'

// ═══════════════════════════════════════════════════════════════════════════════
// CONTENT SKILL PROMPTS
// ═══════════════════════════════════════════════════════════════════════════════

const CONTENT_SYSTEM_PROMPT = `You are Signal Content, an expert content creator and strategist.

Your role is to create compelling, high-quality content that:
- Educates and informs the target audience
- Follows brand voice and style guidelines
- Optimizes for search engines naturally
- Includes relevant internal links and CTAs
- Provides actionable value in every piece

Content Types:
1. Blog posts - Educational, thought leadership, how-to guides
2. Portfolio case studies - Showcasing client success stories
3. Landing page copy - Conversion-focused content
4. Email sequences - Nurture and sales content

IMPORTANT: Adapt writing style based on the tenant (Uptrade vs GWA).
Use service callouts naturally, never forced.
Always cite sources for statistics and claims.`

const TOOL_PROMPTS = {
  generate_blog: `Generate a complete blog post with the specified writing style.
Include:
- Compelling hook that addresses reader's problem
- Clear promise of what they'll learn
- Well-structured sections with H2/H3 headers
- Data points and source citations
- Natural service callouts where relevant
- FAQ section if appropriate
- Key takeaways summary

Output JSON matching BLOG_OUTPUT_SCHEMA.`,

  edit_blog: `Revise the blog content based on feedback.
Maintain the same writing style and structure.
Apply requested changes while preserving SEO optimization.
Return the updated content.`,

  generate_portfolio: `Generate comprehensive portfolio case study content.
Include:
- Compelling subtitle and description
- KPIs with real metrics
- Services showcase with features
- Strategic approach phases
- Comprehensive results
- Technical innovations
- Challenges and solutions
- Tech stack (use EXACT names from TECH_REGISTRY)

Output JSON matching PORTFOLIO_OUTPUT_SCHEMA.`,

  edit_portfolio: `Revise the portfolio content based on feedback.
Maintain professional tone and results focus.
Apply changes while keeping technical accuracy.
Return updated sections.`,

  suggest_topics: `Generate content topic ideas based on:
- Current keyword opportunities
- Competitor content gaps
- Industry trends
- Business goals

Output JSON with:
- topics[] containing title, target_keyword, search_intent, priority
- content_calendar[] for recommended publishing schedule
- cluster_strategy for topic clustering`,

  optimize_seo: `Optimize the content for better search performance.
Analyze and improve:
- Title tag and meta description
- Header structure and keywords
- Internal linking opportunities
- Content depth and comprehensiveness
- Featured snippet optimization

Output JSON with:
- seo_score (0-100)
- improvements[]
- optimized_title
- optimized_meta
- suggested_headers[]
- keyword_density_report`
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTENT SKILL CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class ContentSkill {
  constructor(supabase, orgId, options = {}) {
    this.supabase = supabase
    this.orgId = orgId
    this.userId = options.userId
    this.signal = new Signal(supabase, orgId, { 
      userId: options.userId
    })
    this.echo = createModuleEcho(supabase, orgId, 'content', { 
      userId: options.userId
    })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DATA LOADING
  // ─────────────────────────────────────────────────────────────────────────────

  async loadOrgContext() {
    const { data: org } = await this.supabase
      .from('organizations')
      .select('id, name, slug, settings')
      .eq('id', this.orgId)
      .single()
    
    return org
  }

  async loadRecentContent(limit = 10) {
    const { data: posts } = await this.supabase
      .from('blog_posts')
      .select('id, title, slug, category, keywords, created_at')
      .eq('org_id', this.orgId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    return posts || []
  }

  async loadPortfolioItems(limit = 5) {
    const { data: items } = await this.supabase
      .from('portfolio_items')
      .select('id, title, slug, category, tech_stack')
      .eq('org_id', this.orgId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    return items || []
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: GENERATE BLOG
  // ─────────────────────────────────────────────────────────────────────────────

  async generateBlog(topic, options = {}) {
    const {
      category,
      keywords,
      targetLength,
      includeStats,
      includeExamples,
      tone
    } = options

    // Load context
    const [org, recentPosts] = await Promise.all([
      this.loadOrgContext(),
      this.loadRecentContent()
    ])

    // Get tenant-specific config
    const tenantConfig = getTenantWritingStyle(org)
    
    // Find related services for callouts
    let servicesContext = ''
    if (!tenantConfig.isGWA && tenantConfig.services) {
      const relatedServices = findRelatedServices(topic, category, keywords)
      if (relatedServices.length > 0) {
        servicesContext = `\nRELATED SERVICES TO FEATURE:
${relatedServices.map(s => `- ${s.title} (${s.url}): ${s.description} | CTA: "${s.cta}"`).join('\n')}

Include 2-3 natural callout sections using: <!-- SERVICE_CALLOUT: service-key -->`
      }
    }

    // Build content options
    const enhancements = []
    if (includeStats) enhancements.push('Include industry statistics with source citations')
    if (includeExamples) enhancements.push('Include real-world examples and mini case studies')

    const result = await this.signal.invoke({
      module: 'content',
      tool: 'generate_blog',
      systemPrompt: `${CONTENT_SYSTEM_PROMPT}\n\n${tenantConfig.writingStyle}`,
      userPrompt: `Generate a complete blog post about:

TOPIC: ${topic}
CATEGORY: ${category || 'General'}
KEYWORDS: ${keywords || 'Not specified'}
TARGET LENGTH: ${targetLength || '1500-2000 words'}
${tone ? `TONE: ${tone}` : ''}
${servicesContext}
${enhancements.length > 0 ? `\nCONTENT ENHANCEMENTS:\n${enhancements.map(e => `- ${e}`).join('\n')}` : ''}

RECENT POSTS (avoid overlap):
${recentPosts.map(p => `- ${p.title}`).slice(0, 5).join('\n')}

${TOOL_PROMPTS.generate_blog}`,
      responseFormat: { type: 'json_object' },
      additionalContext: {
        outputSchema: BLOG_OUTPUT_SCHEMA,
        isGWA: tenantConfig.isGWA
      }
    })

    if (this.echo && typeof this.echo.log === 'function') {
      await this.echo.log({
      action: 'generate_blog',
      input: { topic, options },
      output: result
    })
    }

    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: EDIT BLOG
  // ─────────────────────────────────────────────────────────────────────────────

  async editBlog(postId, existingContent, instructions) {
    const org = await this.loadOrgContext()
    const tenantConfig = getTenantWritingStyle(org)

    const result = await this.signal.invoke({
      module: 'content',
      tool: 'edit_blog',
      systemPrompt: `${CONTENT_SYSTEM_PROMPT}\n\n${tenantConfig.writingStyle}`,
      userPrompt: `Edit this blog post based on feedback:

CURRENT CONTENT:
${existingContent}

INSTRUCTIONS:
${instructions}

${TOOL_PROMPTS.edit_blog}`,
      additionalContext: {
        postId,
        isEdit: true
      }
    })

    if (this.echo && typeof this.echo.log === 'function') {
      await this.echo.log({
      action: 'edit_blog',
      input: { postId, instructions },
      output: result
    })
    }

    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: GENERATE PORTFOLIO
  // ─────────────────────────────────────────────────────────────────────────────

  async generatePortfolio(projectData) {
    const {
      companyName,
      websiteUrl,
      industry,
      location,
      category,
      servicesProvided,
      projectGoals,
      challengesSolved,
      targetAudience,
      projectTimeline,
      uniqueFeatures,
      clientTestimonial,
      metrics
    } = projectData

    const result = await this.signal.invoke({
      module: 'content',
      tool: 'generate_portfolio',
      systemPrompt: `${CONTENT_SYSTEM_PROMPT}\n\n${PORTFOLIO_STYLE}`,
      userPrompt: `Generate comprehensive portfolio case study content:

COMPANY: ${companyName}
WEBSITE: ${websiteUrl}
INDUSTRY: ${industry}
LOCATION: ${location}
CATEGORY: ${category || 'Web Design'}

SERVICES PROVIDED: ${servicesProvided?.join(', ') || 'Not specified'}
PROJECT GOALS: ${projectGoals || 'Not specified'}
CHALLENGES: ${challengesSolved || 'Not specified'}
TARGET AUDIENCE: ${targetAudience || 'Not specified'}
${projectTimeline ? `TIMELINE: ${projectTimeline}` : ''}
${uniqueFeatures ? `UNIQUE FEATURES: ${uniqueFeatures}` : ''}
${clientTestimonial ? `CLIENT QUOTE: "${clientTestimonial}"` : ''}

${metrics ? `METRICS:
- Traffic Increase: ${metrics.trafficIncrease || 'N/A'}%
- Conversion Increase: ${metrics.conversionIncrease || 'N/A'}%
- Revenue Impact: ${metrics.revenueIncrease || 'N/A'}
- Ranking Position: #${metrics.rankingPosition || 'N/A'}
- Performance Score: ${metrics.performanceScore || 'N/A'}/100` : ''}

VALID TECH STACK NAMES (use these exactly):
${Object.entries(TECH_REGISTRY).map(([cat, techs]) => `${cat}: ${techs.join(', ')}`).join('\n')}

${TOOL_PROMPTS.generate_portfolio}`,
      responseFormat: { type: 'json_object' },
      additionalContext: {
        outputSchema: PORTFOLIO_OUTPUT_SCHEMA,
        validTechNames: VALID_TECH_NAMES
      }
    })

    // Validate tech stack in result
    if (result.tech_stack) {
      result.tech_stack = validateTechStack(result.tech_stack)
    }

    if (this.echo && typeof this.echo.log === 'function') {
      await this.echo.log({
      action: 'generate_portfolio',
      input: { projectData },
      output: result
    })
    }

    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: EDIT PORTFOLIO
  // ─────────────────────────────────────────────────────────────────────────────

  async editPortfolio(itemId, existingContent, instructions) {
    const result = await this.signal.invoke({
      module: 'content',
      tool: 'edit_portfolio',
      systemPrompt: `${CONTENT_SYSTEM_PROMPT}\n\n${PORTFOLIO_STYLE}`,
      userPrompt: `Edit this portfolio case study:

CURRENT CONTENT:
${JSON.stringify(existingContent, null, 2)}

INSTRUCTIONS:
${instructions}

${TOOL_PROMPTS.edit_portfolio}`,
      additionalContext: {
        itemId,
        isEdit: true
      }
    })

    if (this.echo && typeof this.echo.log === 'function') {
      await this.echo.log({
      action: 'edit_portfolio',
      input: { itemId, instructions },
      output: result
    })
    }

    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: SUGGEST TOPICS
  // ─────────────────────────────────────────────────────────────────────────────

  async suggestTopics(context = {}) {
    const { industry, goals, competitorUrls, existingContent } = context

    const recentPosts = await this.loadRecentContent(20)

    const result = await this.signal.invoke({
      module: 'content',
      tool: 'suggest_topics',
      systemPrompt: CONTENT_SYSTEM_PROMPT,
      userPrompt: `Suggest content topics based on:

${industry ? `INDUSTRY: ${industry}` : ''}
${goals ? `CONTENT GOALS: ${goals}` : ''}
${competitorUrls ? `COMPETITORS: ${competitorUrls.join(', ')}` : ''}

EXISTING CONTENT (avoid overlap):
${recentPosts.map(p => `- ${p.title} (${p.category})`).join('\n')}

${TOOL_PROMPTS.suggest_topics}`,
      responseFormat: { type: 'json_object' }
    })

    if (this.echo && typeof this.echo.log === 'function') {
      await this.echo.log({
      action: 'suggest_topics',
      input: context,
      output: result
    })
    }

    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: SUGGEST TOPICS WITH SEO CONTEXT
  // Uses SEOSkill to provide keyword opportunities and content gaps
  // ─────────────────────────────────────────────────────────────────────────────

  async suggestTopicsWithSeoContext(siteId, options = {}) {
    const { category, maxTopics = 10 } = options

    // Load SEO context from seo_* tables
    const [keywords, gaps, competitors, recentPosts, knowledge] = await Promise.all([
      this.supabase
        .from('seo_keyword_universe')
        .select('keyword, search_volume_monthly, current_position, intent, opportunity_score')
        .eq('site_id', siteId)
        .order('opportunity_score', { ascending: false })
        .limit(50)
        .then(r => r.data || []),
      this.supabase
        .from('seo_content_gaps')
        .select('*')
        .eq('site_id', siteId)
        .eq('status', 'identified')
        .order('ai_importance_score', { ascending: false })
        .limit(20)
        .then(r => r.data || []),
      this.supabase
        .from('seo_competitor_analysis')
        .select('competitor_domain, keyword_gap_data')
        .eq('site_id', siteId)
        .eq('is_primary', true)
        .limit(3)
        .then(r => r.data || []),
      this.loadRecentContent(20),
      this.supabase
        .from('seo_knowledge_base')
        .select('*')
        .eq('site_id', siteId)
        .single()
        .then(r => r.data)
    ])

    const existingTopics = recentPosts.map(p => p.title).join('\n')
    const keywordOpportunities = keywords
      .filter(k => k.opportunity_score > 50)
      .slice(0, 20)
      .map(k => `${k.keyword} (vol: ${k.search_volume_monthly}, pos: ${k.current_position || 'not ranking'})`)
      .join('\n')
    const gapTopics = gaps.slice(0, 10).map(g => `${g.topic}: ${g.ai_reasoning}`).join('\n')
    const competitorKeywords = competitors.flatMap(c => (c.keyword_gap_data || []).slice(0, 5).map(k => k.keyword)).join(', ')
    const easyWins = keywords.filter(k => k.opportunity_score > 70).slice(0, 10)

    const result = await this.signal.invoke('content', 'suggest_topics_seo', {
      maxTopics,
      knowledge,
      competitors,
      gaps,
      easyWins
    }, {
      trackAction: true,
      additionalContext: {
        tool_prompt: `Based on this SEO intelligence, recommend ${maxTopics} blog post topics.

## BUSINESS CONTEXT
${knowledge?.business_name ? `Business: ${knowledge.business_name}` : 'Business: Uptrade Media (digital marketing agency)'}
${knowledge?.industry ? `Industry: ${knowledge.industry}` : 'Industry: Digital Marketing & Web Design'}
${knowledge?.primary_services ? `Services: ${JSON.stringify(knowledge.primary_services)}` : ''}

## KEYWORD OPPORTUNITIES
${keywordOpportunities || 'No keyword data available - recommend general industry topics'}

## CONTENT GAPS IDENTIFIED
${gapTopics || 'No gaps identified'}

## COMPETITOR KEYWORDS WE DON'T RANK FOR
${competitorKeywords || 'No competitor data'}

## RECENTLY PUBLISHED (avoid duplicates)
${existingTopics || 'No recent posts'}

${category ? `## FOCUS ON CATEGORY: ${category}` : ''}

Generate ${maxTopics} topic recommendations. **Return valid JSON** with "topics" array containing objects with:
- title (compelling, keyword-rich, 50-60 chars)
- primary_keyword
- search_intent (informational/commercial/transactional)
- traffic_potential (low/medium/high)
- content_angle
- related_services (array of service keys from: seo, ad-management, content-marketing, web-design, branding, video-production, ai-automation)
- reasoning`
      }
    })

    if (this.echo && typeof this.echo.log === 'function') {
      await this.echo.log({
      action: 'suggest_topics_seo',
      input: { siteId, options },
      output: result,
      metadata: {
        keywordCount: keywords.length,
        gapsCount: gaps.length,
        recentPostsCount: recentPosts.length
      }
    })
    }

    return {
      topics: result.topics || [],
      seoContext: {
        keywordCount: keywords.length,
        gapsCount: gaps.length,
        recentPostsCount: recentPosts.length
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: ANALYZE AND OPTIMIZE BLOG POST
  // Full SEO analysis with keyword context from seo_* tables
  // ─────────────────────────────────────────────────────────────────────────────

  async analyzeBlogPost(postId, siteId = null) {
    // Load the post
    const { data: post, error } = await this.supabase
      .from('blog_posts')
      .select('*')
      .eq('id', postId)
      .single()

    if (error || !post) {
      throw new Error('Blog post not found')
    }

    // Load SEO context if siteId provided
    let seoContext = { keywords: [], knowledge: null }
    if (siteId) {
      const [keywords, knowledge] = await Promise.all([
        this.supabase
          .from('seo_keyword_universe')
          .select('keyword, search_volume_monthly, current_position, intent')
          .eq('site_id', siteId)
          .order('search_volume_monthly', { ascending: false })
          .limit(100)
          .then(r => r.data || []),
        this.supabase
          .from('seo_knowledge_base')
          .select('*')
          .eq('site_id', siteId)
          .single()
          .then(r => r.data)
      ])
      seoContext = { keywords, knowledge }
    }

    // Find relevant keywords from post content
    const relevantKeywords = seoContext.keywords
      .filter(k => {
        const postText = `${post.title} ${post.content}`.toLowerCase()
        return postText.includes(k.keyword.toLowerCase())
      })
      .slice(0, 10)

    const result = await this.signal.invoke({
      module: 'content',
      tool: 'analyze_blog_post',
      systemPrompt: CONTENT_SYSTEM_PROMPT + `\n\n## CRITICAL STYLE CHECKS
1. Does it use em dashes (—)? Must be replaced with commas/periods/parentheses
2. Is the tone conversational or stiff?
3. Are credible sources cited?
4. Are paragraphs short (2-3 sentences)?
5. Does it have a compelling hook?`,
      userPrompt: `Analyze this blog post and provide optimization recommendations.

## CURRENT POST
Title: ${post.title}
Meta Title: ${post.meta_title || post.title}
Meta Description: ${post.meta_description || ''}
Focus Keyphrase: ${post.focus_keyphrase || 'none set'}
Word Count: ${post.content?.split(/\\s+/).length || 0}

Content:
${post.content?.substring(0, 8000)}${post.content?.length > 8000 ? '...[truncated]' : ''}

## RELEVANT KEYWORDS WE COULD TARGET
${relevantKeywords.map(k => `- ${k.keyword} (vol: ${k.search_volume_monthly}, intent: ${k.intent})`).join('\n') || 'No keyword data'}

## UPTRADE SERVICES FOR INTERNAL LINKING
${Object.entries(UPTRADE_SERVICES).map(([key, s]) => `- ${key}: ${s.title} (${s.url})`).join('\n')}

Return JSON with:
- seo_score (0-100)
- content_score (0-100)
- style_score (0-100)
- issues (array of {type, description, severity})
- optimized_title (improved version)
- optimized_meta_description (150-160 chars)
- recommended_focus_keyphrase
- content_improvements (array of specific changes)
- internal_links (array of {service_key, anchor_text, reasoning})
- faq_suggestions (array of Q&A pairs to add)
- em_dash_count (number found)
- source_citations_needed (array of claims that need sources)`,
      responseFormat: { type: 'json_object' },
      additionalContext: {
        postId,
        hasKeywordData: relevantKeywords.length > 0
      }
    })

    if (this.echo && typeof this.echo.log === 'function') {
      await this.echo.log({
      action: 'analyze_blog_post',
      input: { postId, siteId },
      output: result,
      metadata: {
        postTitle: post.title,
        wordCount: post.content?.split(/\s+/).length || 0,
        relevantKeywords: relevantKeywords.length
      }
    })
    }

    return {
      post: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        status: post.status
      },
      analysis: result,
      services: UPTRADE_SERVICES
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: BATCH OPTIMIZE POSTS (em-dash removal, etc.)
  // ─────────────────────────────────────────────────────────────────────────────

  async batchOptimizePosts(options = {}) {
    const { status, limit = 50 } = options

    // Get posts to optimize
    let query = this.supabase
      .from('blog_posts')
      .select('id, title, slug, content, content_html, updated_at')

    if (status) {
      query = query.eq('status', status)
    }
    if (limit) {
      query = query.limit(limit)
    }

    const { data: posts, error } = await query.order('updated_at', { ascending: true })

    if (error || !posts?.length) {
      return {
        totalProcessed: 0,
        optimized: 0,
        unchanged: 0,
        errors: 0,
        details: []
      }
    }

    const results = []

    for (const post of posts) {
      try {
        let content = post.content || ''
        let contentHtml = post.content_html || ''

        // Remove em dashes
        const emDashCount = (content.match(/—/g) || []).length
        content = content
          .replace(/\s—\s/g, ', ')
          .replace(/—([^—]+)—/g, '($1)')
          .replace(/—/g, ', ')
          .replace(/,\s*,/g, ',')
          .replace(/\s{2,}/g, ' ')

        contentHtml = contentHtml
          .replace(/\s—\s/g, ', ')
          .replace(/—([^—]+)—/g, '($1)')
          .replace(/—/g, ', ')
          .replace(/,\s*,/g, ',')

        if (emDashCount > 0) {
          await this.supabase
            .from('blog_posts')
            .update({
              content,
              content_html: contentHtml,
              updated_at: new Date().toISOString()
            })
            .eq('id', post.id)

          results.push({
            id: post.id,
            title: post.title,
            status: 'optimized',
            changes: { emDashesRemoved: emDashCount }
          })
        } else {
          results.push({
            id: post.id,
            title: post.title,
            status: 'no_changes',
            changes: {}
          })
        }
      } catch (err) {
        results.push({
          id: post.id,
          title: post.title,
          status: 'error',
          error: err.message
        })
      }
    }

    if (this.echo && typeof this.echo.log === 'function') {
      await this.echo.log({
      action: 'batch_optimize_posts',
      input: options,
      output: {
        totalProcessed: posts.length,
        optimized: results.filter(r => r.status === 'optimized').length
      }
    })
    }

    return {
      totalProcessed: posts.length,
      optimized: results.filter(r => r.status === 'optimized').length,
      unchanged: results.filter(r => r.status === 'no_changes').length,
      errors: results.filter(r => r.status === 'error').length,
      details: results
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: OPTIMIZE SEO
  // ─────────────────────────────────────────────────────────────────────────────

  async optimizeSeo(content, options = {}) {
    const { targetKeyword, currentUrl, competitors } = options

    const result = await this.signal.invoke({
      module: 'content',
      tool: 'optimize_seo',
      systemPrompt: CONTENT_SYSTEM_PROMPT,
      userPrompt: `Optimize this content for SEO:

${targetKeyword ? `TARGET KEYWORD: ${targetKeyword}` : ''}
${currentUrl ? `CURRENT URL: ${currentUrl}` : ''}
${competitors ? `COMPETITORS: ${competitors.join(', ')}` : ''}

CONTENT:
${typeof content === 'string' ? content : JSON.stringify(content, null, 2)}

${TOOL_PROMPTS.optimize_seo}`,
      responseFormat: { type: 'json_object' }
    })

    if (this.echo && typeof this.echo.log === 'function') {
      await this.echo.log({
      action: 'optimize_seo',
      input: { contentLength: content?.length, options },
      output: result
    })
    }

    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: REGENERATE PORTFOLIO BLOCK
  // ─────────────────────────────────────────────────────────────────────────────

  async regeneratePortfolioBlock(blockId, projectData) {
    const blockPrompts = {
      services_showcase: `Generate a services_showcase array for ${projectData.companyName}. 
Services provided: ${projectData.servicesProvided?.join(', ') || 'web design'}.
Each service should have: icon (Lucide icon name), title, description (1-2 sentences), and features array (3-4 items).
Return 3-4 services as JSON array.`,
      
      strategic_approach: `Generate a strategic_approach array for ${projectData.companyName}'s ${projectData.category || 'web design'} project.
Include 3-4 phases, each with: phase (name), description (2-3 sentences), icon (Lucide icon name), timeline, and deliverables array.
Return as JSON array.`,
      
      comprehensive_results: `Generate a comprehensive_results array for ${projectData.companyName}.
Known metrics: ${projectData.metrics?.trafficIncrease ? `Traffic +${projectData.metrics.trafficIncrease}%` : ''} ${projectData.metrics?.conversionIncrease ? `Conversions +${projectData.metrics.conversionIncrease}%` : ''} ${projectData.metrics?.rankingPosition ? `Ranking #${projectData.metrics.rankingPosition}` : ''}.
Each result should have: icon, metric (with + or - or #), label, description.
Return 4-6 results as JSON array.`,
      
      technical_innovations: `Generate a technical_innovations array for ${projectData.companyName}'s ${projectData.servicesProvided?.join(', ') || 'web'} project.
Each innovation should have: icon, title, description, metrics array (3 items).
Return 3-5 innovations as JSON array.`,
      
      challenges: `Generate a challenges array for ${projectData.companyName}.
Original challenges: ${projectData.challengesSolved || 'Not specified'}.
Each item should have: title (short name like "Slow Page Load Times"), description (the problem 1-2 sentences), solution (how we fixed it 1-2 sentences), icon ("performance", "design", "seo", or "conversion").
Return 3-4 challenges as JSON array.`,
      
      tech_stack: `Generate a tech_stack array for ${projectData.companyName}'s ${projectData.servicesProvided?.join(', ') || 'web design'} project.

VALID TECH STACK NAMES (use these exactly):
${Object.entries(TECH_REGISTRY).map(([cat, techs]) => `${cat}: ${techs.join(', ')}`).join('\n')}

Each item: { name: "Exact Name", category: "frontend|backend|database|infrastructure|platform|analytics|seo|other" }
Return 6-10 relevant technologies as JSON array.`,
      
      content: `Generate markdown case study content for ${projectData.companyName}.
Include sections: ## Project Overview (2-3 paragraphs), ## The Challenge (describe problems), ## Our Approach (strategic solution), ## Key Features (bullet points), ## Results (measurable outcomes).
Goals: ${projectData.projectGoals || 'Not specified'}.
Challenges: ${projectData.challengesSolved || 'Not specified'}.
Return as a markdown string.`
    }

    const prompt = blockPrompts[blockId] || `Generate the ${blockId} block for ${projectData.companyName}.`

    const result = await this.signal.invoke({
      module: 'content',
      tool: 'regenerate_portfolio_block',
      systemPrompt: `${CONTENT_SYSTEM_PROMPT}\n\n${PORTFOLIO_STYLE}`,
      userPrompt: `${prompt}\n\nReturn ONLY valid JSON (array or object as appropriate). No markdown fences.`,
      responseFormat: { type: 'json_object' },
      additionalContext: {
        blockId,
        validTechNames: VALID_TECH_NAMES
      }
    })

    // Handle if result is wrapped in a key
    let blockContent = result
    if (result[blockId]) blockContent = result[blockId]
    else if (result.data) blockContent = result.data
    else if (result.content) blockContent = result.content

    // Validate tech stack if that's the block
    if (blockId === 'tech_stack' && Array.isArray(blockContent)) {
      blockContent = validateTechStack(blockContent)
    }

    if (this.echo && typeof this.echo.log === 'function') {
      await this.echo.log({
      action: 'regenerate_portfolio_block',
      input: { blockId, companyName: projectData.companyName },
      output: blockContent
    })
    }

    return blockContent
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: REFINE PORTFOLIO WITH CHAT
  // ─────────────────────────────────────────────────────────────────────────────

  async refinePortfolioWithChat(chatMessage, existingContent, projectData) {
    const result = await this.signal.invoke({
      module: 'content',
      tool: 'refine_portfolio_chat',
      systemPrompt: `${CONTENT_SYSTEM_PROMPT}\n\n${PORTFOLIO_STYLE}`,
      userPrompt: `The user wants to modify the portfolio content for ${projectData.companyName}.

Current content (partial):
- Subtitle: "${existingContent.subtitle || 'Not set'}"
- Services: ${existingContent.services_showcase?.length || 0} items
- Results: ${existingContent.comprehensive_results?.length || 0} items

User's request: "${chatMessage}"

Based on the user's request, determine what changes to make. Return a JSON object with:
1. "message": A friendly response explaining what you changed
2. Any updated blocks that need to change (use the same structure as the original)

For example, if user says "make the results more impressive", update comprehensive_results.
If user says "add more technical details", update technical_innovations.
If user says "change the subtitle", update subtitle.

Return ONLY valid JSON. Include only the fields that need to change, plus "message".`,
      responseFormat: { type: 'json_object' },
      additionalContext: {
        validTechNames: VALID_TECH_NAMES
      }
    })

    const { message, ...updates } = result

    // Validate tech stack if it was updated
    if (updates.tech_stack) {
      updates.tech_stack = validateTechStack(updates.tech_stack)
    }

    if (this.echo && typeof this.echo.log === 'function') {
      await this.echo.log({
      action: 'refine_portfolio_chat',
      input: { chatMessage, companyName: projectData.companyName },
      output: { message, updatedBlocks: Object.keys(updates) }
    })
    }

    return {
      content: updates,
      message: message || 'I\'ve made the requested changes.'
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: GENERATE BLOG SECTION
  // Creates optimized content for a specific section (intro, section, conclusion)
  // ─────────────────────────────────────────────────────────────────────────────

  async generateBlogSection(options = {}, siteId = null) {
    const {
      instruction,
      existingContent,
      targetKeyword,
      section
    } = options

    // Load org and SEO context
    const [org, knowledge] = await Promise.all([
      this.loadOrgContext(),
      siteId ? this.supabase
        .from('seo_knowledge_base')
        .select('*')
        .eq('site_id', siteId)
        .single()
        .then(r => r.data) : null
    ])

    const tenantConfig = getTenantWritingStyle(org)

    const result = await this.signal.invoke({
      module: 'content',
      tool: 'generate_blog_section',
      systemPrompt: `${CONTENT_SYSTEM_PROMPT}\n\n${tenantConfig.writingStyle}`,
      userPrompt: `${instruction || 'Generate compelling blog content'}

## CONTEXT
${existingContent ? `Existing content to improve or expand:\n${existingContent}` : ''}
${targetKeyword ? `Target keyword: ${targetKeyword}` : ''}
${section ? `Section focus: ${section}` : ''}

## BUSINESS VOICE
${knowledge?.brand_voice_description || 'Professional, approachable, educational'}
${knowledge?.terminology ? `Use terms: ${JSON.stringify(knowledge.terminology)}` : ''}

## CRITICAL WRITING RULES
- Write like teaching a smart friend
- NO em dashes (—) - use commas, periods, or parentheses
- Cite sources with specific data when making claims
- Keep paragraphs short (2-3 sentences)
- Be conversational but authoritative

Generate the requested content. Return plain text (not JSON) unless the instruction specifically requests structured data.`,
      additionalContext: {
        section,
        hasKeyword: !!targetKeyword
      }
    })

    if (this.echo && typeof this.echo.log === 'function') {
      await this.echo.log({
      action: 'generate_blog_section',
      input: { section, targetKeyword, hasExisting: !!existingContent },
      output: typeof result === 'string' ? result.substring(0, 200) : result
    })
    }

    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPER: GET WRITING GUIDELINES
  // Returns the blog writing guidelines for UI display
  // ─────────────────────────────────────────────────────────────────────────────

  getWritingGuidelines() {
    return {
      guidelines: UPTRADE_WRITING_STYLE,
      services: UPTRADE_SERVICES,
      components: {
        serviceCallout: '<!-- SERVICE_CALLOUT: service-key -->',
        faq: 'H2 "Frequently Asked Questions" with Q&A format',
        keyTakeaways: 'Bullet points under H2 "Key Takeaways"'
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: OPTIMIZE BLOG POST (Full AI optimization)
  // ─────────────────────────────────────────────────────────────────────────────

  async optimizeBlogPost(post, options = {}) {
    const org = await this.loadOrgContext()
    const tenantConfig = getTenantWritingStyle(org)

    const result = await this.signal.invoke({
      module: 'content',
      tool: 'optimize_blog',
      systemPrompt: `${CONTENT_SYSTEM_PROMPT}\n\n${tenantConfig.writingStyle}`,
      userPrompt: `Optimize this blog post for better engagement and SEO while maintaining the core message.

CURRENT CONTENT:
${post.content}

OPTIMIZATION GOALS:
1. Remove ALL em dashes (—) and replace with appropriate punctuation (commas, periods, parentheses)
2. Improve the opening hook if it starts generically
3. Make the tone more conversational (like teaching a friend)
4. Break up any paragraphs longer than 3 sentences
5. Add natural transition phrases between sections
6. Ensure the conclusion has a clear, actionable takeaway

CONSTRAINTS:
- Keep the same overall structure and topics
- Maintain approximately the same word count
- Don't add fictional statistics or sources
- Keep existing source citations intact

Return JSON with:
{
  "optimizedContent": "The full optimized content in Markdown format",
  "changes": {
    "emDashesRemoved": true/false,
    "hookImproved": true/false,
    "paragraphsFixed": true/false
  }
}`,
      responseFormat: { type: 'json_object' },
      additionalContext: { postId: post.id }
    })

    if (this.echo && typeof this.echo.log === 'function') {
      await this.echo.log({
      action: 'optimize_blog_post',
      input: { postId: post.id, title: post.title },
      output: { changes: result.changes }
    })
    }

    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: GENERATE META DESCRIPTION
  // ─────────────────────────────────────────────────────────────────────────────

  async generateMetaDescription(post) {
    const result = await this.signal.invoke({
      module: 'content',
      tool: 'generate_meta',
      systemPrompt: CONTENT_SYSTEM_PROMPT,
      userPrompt: `Write a compelling meta description (150-160 characters) for this blog post. No em dashes. Make it click-worthy.

Title: ${post.title}
Topic: ${post.content?.substring(0, 500)}

Return ONLY the meta description text as a string, nothing else.`
    })

    if (this.echo && typeof this.echo.log === 'function') {
      await this.echo.log({
      action: 'generate_meta_description',
      input: { postId: post.id },
      output: result
    })
    }

    return typeof result === 'string' ? result : result.metaDescription || result.meta_description
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: ADD CITATIONS TO CONTENT
  // ─────────────────────────────────────────────────────────────────────────────

  async addCitations(content, category = null) {
    const result = await this.signal.invoke({
      module: 'content',
      tool: 'add_citations',
      systemPrompt: `You are a research editor adding credible citations to content. Only add realistic, verifiable sources from well-known industry publications, studies, and companies.`,
      userPrompt: `Add credible source citations to this blog post where claims are made.

CONTENT:
${content}

${category ? `CATEGORY: ${category}` : ''}

INSTRUCTIONS:
1. Identify statements that make claims about statistics, research, or industry facts
2. Add realistic, credible citations from well-known sources in this industry
3. Format citations naturally, e.g., "According to HubSpot's 2024 State of Marketing Report..."
4. For statistics, add the source in parentheses or inline
5. Don't add citations to obvious common knowledge
6. Don't make up fake studies or statistics

Return the content with citations added in Markdown format.`
    })

    if (this.echo && typeof this.echo.log === 'function') {
      await this.echo.log({
      action: 'add_citations',
      input: { contentLength: content?.length, category },
      output: { citedContentLength: result?.length }
    })
    }

    return result
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default ContentSkill
