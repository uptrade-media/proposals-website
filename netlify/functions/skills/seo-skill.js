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
  // CONVERSATIONAL (via Echo)
  // ─────────────────────────────────────────────────────────────────────────────

  async chat(message) {
    return await this.echo.send(message)
  }

  async startConversation(title) {
    return await this.echo.startConversation(title)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export function createSEOSkill(supabase, orgId, siteId, options = {}) {
  return new SEOSkill(supabase, orgId, siteId, options)
}

export default SEOSkill
