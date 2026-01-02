// DEPRECATED: This skill wrapper is no longer used.
/**
 * Signal Engage Skill
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * The Engage skill provides AI-powered management of engagement elements:
 * popups, nudges, banners, toasts, and chat widget configuration.
 * 
 * Signal is the brain - this skill handles ALL Engage AI capabilities.
 * Echo (the conversational interface) delegates to this skill.
 * 
 * Available Tools:
 * 
 * ELEMENT MANAGEMENT:
 * - design_element: AI-powered element design based on purpose and brand
 * - create_element: Create a new popup, nudge, banner, or toast
 * - update_element: Update an existing element's content or settings
 * - live_edit: Apply immediate edits via conversation
 * - pause_element: Temporarily disable an element
 * - resume_element: Re-enable a paused element
 * - delete_element: Remove an element
 * - list_elements: List all engagement elements
 * 
 * ANALYTICS & PERFORMANCE:
 * - get_element_stats: Get analytics for an element
 * - analyze_performance: Analyze performance patterns
 * - suggest_optimizations: AI suggestions based on performance data
 * - learn_from_performance: Store successful patterns in Signal memory
 * 
 * A/B TESTING:
 * - create_ab_test: Create an A/B test for an element
 * - get_ab_test_results: Get A/B test performance data
 * - analyze_ab_test: AI analysis of A/B test with recommendations
 * - promote_winner: Promote winning variant and end test
 * 
 * NUDGES & PAGE CONTEXT:
 * - create_nudge: Create AI-powered contextual nudge
 * - optimize_nudge: Optimize nudge based on analytics
 * - get_page_context: Get page-specific knowledge from Signal
 * - suggest_page_nudge: AI-suggest nudge for specific page
 * 
 * COPY GENERATION:
 * - generate_copy: Generate compelling copy using AI
 * 
 * Usage:
 *   import { EngageSkill } from './skills/engage-skill.js'
 *   const engage = new EngageSkill(supabase, orgId, projectId, { userId })
 *   const element = await engage.executeTool('design_element', { purpose: '...' })
 */

import { Signal, createModuleEcho } from '../utils/signal.js'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ═══════════════════════════════════════════════════════════════════════════════
// ENGAGE TOOLS - OpenAI Function Calling Format
// ═══════════════════════════════════════════════════════════════════════════════

export const ENGAGE_TOOLS = [
  // ─────────────────────────────────────────────────────────────────────────────
  // ELEMENT MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'design_element',
      description: 'Design an on-brand popup, banner, nudge, or slide-in. Uses Signal knowledge to create contextual, brand-aligned elements. Automatically generates copy, layout, and styling.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID to design for' },
          elementType: { 
            type: 'string', 
            enum: ['popup', 'banner', 'nudge', 'slide-in', 'toast'],
            description: 'Type of element to create'
          },
          purpose: { 
            type: 'string', 
            description: 'Purpose/goal (e.g., "holiday sale", "email capture", "free consultation")'
          },
          offer: { 
            type: 'string', 
            description: 'Specific offer or discount (e.g., "20% off", "free ebook")'
          },
          targetPage: {
            type: 'string',
            description: 'Target page URL pattern (e.g., "/pricing", "/services/*")'
          },
          trigger: { 
            type: 'string', 
            enum: ['time', 'scroll', 'exit_intent', 'click'],
            description: 'When to show the element'
          },
          triggerValue: { 
            type: 'number', 
            description: 'Trigger value (seconds for time, percent for scroll)'
          },
          targetAudience: {
            type: 'string',
            description: 'Target audience (e.g., "all visitors", "first-time only", "returning")'
          }
        },
        required: ['projectId', 'elementType', 'purpose']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_elements',
      description: 'List all engagement elements (popups, banners, nudges) for a project.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID to list elements for' },
          includeInactive: { type: 'boolean', description: 'Include paused/inactive elements' },
          elementType: { type: 'string', enum: ['popup', 'banner', 'nudge', 'slide-in', 'toast'], description: 'Filter by type' }
        },
        required: ['projectId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'live_edit',
      description: 'Apply immediate edits to an element. Changes are saved instantly. Use for conversational editing like "change the headline to X" or "make the button red".',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID for the element' },
          elementId: { type: 'string', description: 'Element ID to edit' },
          headline: { type: 'string', description: 'New headline text' },
          body: { type: 'string', description: 'New body text' },
          ctaText: { type: 'string', description: 'New call-to-action button text' },
          ctaUrl: { type: 'string', description: 'New CTA link URL' },
          backgroundColor: { type: 'string', description: 'Background color (hex or CSS color)' },
          textColor: { type: 'string', description: 'Text color (hex or CSS color)' },
          primaryColor: { type: 'string', description: 'Primary/accent color for buttons' },
          position: { 
            type: 'string', 
            enum: ['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'top', 'bottom'],
            description: 'Where to display the element' 
          }
        },
        required: ['projectId', 'elementId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'toggle_element',
      description: 'Pause or resume an engagement element.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          elementId: { type: 'string', description: 'Element ID to toggle' },
          action: { type: 'string', enum: ['pause', 'resume'], description: 'Whether to pause or resume' }
        },
        required: ['projectId', 'elementId', 'action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'navigate_to_element',
      description: 'Navigate the user to view an element in the visual editor.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          elementId: { type: 'string', description: 'Element ID to view' }
        },
        required: ['projectId', 'elementId']
      }
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ANALYTICS & PERFORMANCE
  // ─────────────────────────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'get_element_stats',
      description: 'Get performance statistics for an engagement element (impressions, clicks, CTR, conversions).',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          elementId: { type: 'string', description: 'Element ID to get stats for' },
          timeframe: { type: 'string', enum: ['7d', '30d', '90d'], description: 'Time period for metrics' }
        },
        required: ['projectId', 'elementId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'analyze_performance',
      description: 'Analyze performance patterns across all elements. Identifies trends, issues, and opportunities.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID to analyze' },
          timeframe: { type: 'string', enum: ['7d', '30d', '90d'], description: 'Time period' }
        },
        required: ['projectId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'suggest_optimizations',
      description: 'Get AI-powered optimization suggestions based on performance data.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          elementId: { type: 'string', description: 'Optional: specific element ID' }
        },
        required: ['projectId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'learn_from_performance',
      description: 'Store successful patterns in Signal memory for future reference.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          elementId: { type: 'string', description: 'Element ID that performed well' },
          insight: { type: 'string', description: 'The pattern or insight learned' }
        },
        required: ['projectId', 'elementId', 'insight']
      }
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // A/B TESTING
  // ─────────────────────────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'create_ab_test',
      description: 'Create an A/B test for an element with a variant.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          elementId: { type: 'string', description: 'Element ID to test' },
          variantName: { type: 'string', description: 'Name for the variant (e.g., "Headline B")' },
          changes: {
            type: 'object',
            description: 'Changes for the variant (headline, body, ctaText, etc.)',
            properties: {
              headline: { type: 'string' },
              body: { type: 'string' },
              ctaText: { type: 'string' },
              ctaUrl: { type: 'string' },
              backgroundColor: { type: 'string' },
              primaryColor: { type: 'string' }
            }
          },
          trafficSplit: { type: 'number', description: 'Percentage for variant (default 50)' }
        },
        required: ['projectId', 'elementId', 'variantName', 'changes']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_ab_test_results',
      description: 'Get current A/B test results with statistical analysis.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          elementId: { type: 'string', description: 'Element ID with A/B test' }
        },
        required: ['projectId', 'elementId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'analyze_ab_test',
      description: 'AI analysis of A/B test with recommendations on winner and insights.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          elementId: { type: 'string', description: 'Element ID with A/B test' }
        },
        required: ['projectId', 'elementId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'promote_winner',
      description: 'Promote winning A/B test variant and end the test.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          elementId: { type: 'string', description: 'Element ID with A/B test' },
          variantId: { type: 'string', description: 'Variant ID to promote (optional - auto-selects winner)' }
        },
        required: ['projectId', 'elementId']
      }
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // NUDGES & PAGE CONTEXT
  // ─────────────────────────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'get_page_context',
      description: 'Get page-specific knowledge from Signal. Returns page content, purpose, and relevant business info for context-aware element creation.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          pageUrl: { type: 'string', description: 'Page URL or pattern (e.g., "/pricing", "/services/seo")' }
        },
        required: ['projectId', 'pageUrl']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'suggest_page_nudge',
      description: 'AI-suggest a contextual nudge for a specific page based on page content, visitor behavior, and business goals.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          pageUrl: { type: 'string', description: 'Page URL to suggest nudge for' },
          goal: { type: 'string', description: 'Optional goal (e.g., "increase consultations", "reduce bounce")' }
        },
        required: ['projectId', 'pageUrl']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_nudge',
      description: 'Create an AI-powered contextual nudge for a specific page or user action.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          pagePattern: { type: 'string', description: 'Page URL pattern to show nudge' },
          nudgeType: { type: 'string', enum: ['conversation_starter', 'help_offer', 'pro_tip', 'cta'], description: 'Type of nudge' },
          message: { type: 'string', description: 'Nudge message (if empty, AI generates based on page context)' },
          trigger: { type: 'string', enum: ['time', 'scroll', 'idle', 'exit_intent'], description: 'When to show' },
          triggerValue: { type: 'number', description: 'Trigger value (seconds or scroll %)' }
        },
        required: ['projectId', 'pagePattern', 'nudgeType']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'optimize_nudge',
      description: 'Optimize an existing nudge based on analytics performance.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          nudgeId: { type: 'string', description: 'Nudge ID to optimize' }
        },
        required: ['projectId', 'nudgeId']
      }
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // COPY GENERATION
  // ─────────────────────────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'generate_copy',
      description: 'Generate compelling copy for a popup/banner using AI. Returns headline, body, and CTA suggestions based on brand voice and goals.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID for brand context' },
          elementId: { type: 'string', description: 'Optional: element to generate copy for' },
          prompt: { type: 'string', description: 'What kind of copy to generate' },
          pageContext: { type: 'string', description: 'Optional: page context for relevance' }
        },
        required: ['projectId', 'prompt']
      }
    }
  }
]

// ═══════════════════════════════════════════════════════════════════════════════
// ENGAGE SKILL PROMPTS
// ═══════════════════════════════════════════════════════════════════════════════

const ENGAGE_SYSTEM_PROMPT = `You are Signal Engage, an expert AI system for website conversion optimization and user engagement.

You are the brain behind all Engage module AI features. Echo is your conversational interface - you provide the intelligence.

CAPABILITIES:
1. **Element Design**: Create on-brand popups, banners, nudges, and toasts
2. **A/B Testing**: Design variants, analyze results, promote winners
3. **Analytics Intelligence**: Learn from performance data, identify patterns
4. **Page-Contextual Nudges**: Use site knowledge to suggest relevant engagement
5. **Copy Generation**: Write compelling, brand-aligned messaging

KNOWLEDGE ACCESS:
- You have access to Signal's knowledge base for each client site
- This includes page content, services, pricing, FAQs, and business info
- Use this context to create highly relevant, specific elements

A/B TESTING EXPERTISE:
- Two-proportion z-test for statistical significance
- Recommend minimum sample size before declaring winners
- Learn patterns: "Headlines with numbers perform 23% better"
- Auto-suggest tests based on successful patterns

NUDGE CREATION:
- Page-specific context makes nudges relevant
- Types: Conversation Starter, Help Offer, Pro Tip, Call to Action
- Consider scroll depth, time on page, exit intent
- Match business goals to user journey stage

Best practices:
- Exit-intent popups: cart abandonment, lead capture
- Nudges: feature discovery, support offers, upsells
- Banners: announcements, time-sensitive offers
- Time delay 5-15 seconds is optimal
- Mobile-first: test smaller screens
- Frequency caps prevent annoyance

IMPORTANT: Use Signal memory to remember what works for each client.
Track outcomes and learn from every A/B test result.`

const TOOL_PROMPTS = {
  create_element: `Create a new engagement element based on user requirements.
Infer reasonable defaults for any unspecified settings.
Output JSON with: element_type, name, headline, body, cta_text, cta_url, 
trigger_type, trigger_config, position, page_patterns, device_targets, is_draft.`,

  update_element: `Update an existing element with the specified changes.
Only change the fields mentioned by the user.
Output JSON with: id, changes{}, reasoning.`,

  pause_element: `Pause the specified element(s).
Output JSON with: ids[], confirmation_message.`,

  resume_element: `Resume the specified element(s).
Output JSON with: ids[], confirmation_message.`,

  delete_element: `Delete the specified element(s). Require explicit confirmation.
Output JSON with: ids[], requires_confirmation, warning_message.`,

  get_element_stats: `Get performance statistics for the specified element.
Output JSON with: impressions, clicks, ctr, conversions, conversion_rate, trend.`,

  list_active_elements: `List all currently active engagement elements.
Output JSON with: elements[] containing id, name, type, status, impressions, ctr.`,

  suggest_optimizations: `Analyze element performance and suggest improvements.
Consider: low CTR elements, high-performing patterns, A/B test opportunities.
Output JSON with: suggestions[] containing element_id, suggestion, expected_impact, priority.`,

  // Live editing tools
  apply_live_edit: `Apply immediate edits to an element's content or style.
This is for conversational editing - the user says what to change and it happens instantly.
Output JSON with: element_id, edits{headline?, body?, cta_text?, backgroundColor?, textColor?, position?}.`,

  generate_copy: `Generate compelling popup/banner copy using AI.
Consider brand voice, business context, and conversion best practices.
Output JSON with: prompt (what kind of copy to generate), element_id (optional, if editing existing).`,

  preview_changes: `Show a preview of how an element would look with proposed changes.
Output JSON with: element_id, changes{} to preview before applying.`
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENGAGE SKILL CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class EngageSkill {
  constructor(supabase, orgId, projectId, options = {}) {
    this.supabase = supabase
    this.orgId = orgId
    this.projectId = projectId
    this.userId = options.userId
    this.signal = new Signal(supabase, orgId, { 
      userId: options.userId
    })
    this.echo = createModuleEcho(supabase, orgId, 'engage', { 
      userId: options.userId,
      contextId: projectId
    })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DATA LOADING
  // ─────────────────────────────────────────────────────────────────────────────

  async loadProject(projectId) {
    const { data: project } = await this.supabase
      .from('projects')
      .select('id, title, org_id, siteUrl')
      .eq('id', projectId || this.projectId)
      .eq('org_id', this.orgId)
      .single()
    return project
  }

  async loadElements(filters = {}) {
    let query = this.supabase
      .from('engage_elements')
      .select('*')
      .eq('org_id', this.orgId)

    if (filters.projectId || this.projectId) {
      query = query.eq('project_id', filters.projectId || this.projectId)
    }
    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive)
    }
    if (filters.type) {
      query = query.eq('element_type', filters.type)
    }

    query = query.order('created_at', { ascending: false })

    const { data: elements } = await query
    return elements || []
  }

  async loadElement(elementId) {
    const { data: element } = await this.supabase
      .from('engage_elements')
      .select(`
        *,
        engage_variants(*),
        engage_stats_daily(date, impressions, clicks, conversions)
      `)
      .eq('id', elementId)
      .eq('org_id', this.orgId)
      .single()

    return element
  }

  async loadStats(elementId, days = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data: stats } = await this.supabase
      .from('engage_stats_daily')
      .select('*')
      .eq('element_id', elementId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true })

    return stats || []
  }

  async loadSignalConfig() {
    const { data: config } = await this.supabase
      .from('signal_config')
      .select('design_system, profile_snapshot')
      .eq('org_id', this.orgId)
      .single()
    return config || {}
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SIGNAL KNOWLEDGE ACCESS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get page-specific knowledge from Signal
   * Uses the knowledge base to understand page content, purpose, and context
   */
  async getPageContext(params) {
    const { projectId, pageUrl } = params
    const project = await this.loadProject(projectId)
    if (!project) throw new Error('Project not found')

    // Search knowledge base for page-specific content
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: `Page content and purpose for ${pageUrl}`
    })

    const { data: chunks } = await this.supabase.rpc('match_signal_knowledge_filtered', {
      query_embedding: embeddingResponse.data[0].embedding,
      filter_project_id: projectId,
      filter_visibility: ['public', 'internal'],
      match_threshold: 0.65,
      match_count: 8
    })

    // Also get SEO data for the page if available
    const { data: seoPage } = await this.supabase
      .from('seo_pages')
      .select('id, url, title, meta_description, h1, content_preview, page_type')
      .eq('project_id', projectId)
      .ilike('url', `%${pageUrl}%`)
      .limit(1)
      .single()

    // Get any existing elements on this page
    const { data: existingElements } = await this.supabase
      .from('engage_elements')
      .select('id, name, element_type, headline, is_active')
      .eq('project_id', projectId)
      .contains('page_patterns', [pageUrl])

    return {
      project: { title: project.title, siteUrl: project.siteUrl },
      pageUrl,
      seoData: seoPage || null,
      knowledgeContext: chunks?.map(c => ({ type: c.content_type, content: c.content })) || [],
      existingElements: existingElements || [],
      summary: this._summarizePageContext(seoPage, chunks)
    }
  }

  _summarizePageContext(seoPage, chunks) {
    let summary = ''
    if (seoPage) {
      summary += `Page: ${seoPage.title || seoPage.url}\n`
      if (seoPage.meta_description) summary += `Description: ${seoPage.meta_description}\n`
      if (seoPage.page_type) summary += `Type: ${seoPage.page_type}\n`
    }
    if (chunks?.length) {
      summary += `\nRelevant knowledge:\n`
      chunks.slice(0, 3).forEach(c => {
        summary += `- [${c.content_type}] ${c.content.substring(0, 150)}...\n`
      })
    }
    return summary || 'No specific page context available'
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ELEMENT DESIGN (AI-POWERED)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * AI-powered element design using Signal knowledge
   */
  async designElement(params) {
    const { projectId, elementType, purpose, offer, targetPage, trigger, triggerValue, targetAudience } = params
    
    const project = await this.loadProject(projectId)
    if (!project) throw new Error('Project not found')

    const config = await this.loadSignalConfig()
    const designSystem = config.design_system || {}
    const profile = config.profile_snapshot || {}

    // Get page context if target page specified
    let pageContext = null
    if (targetPage) {
      pageContext = await this.getPageContext({ projectId, pageUrl: targetPage })
    }

    // Get learned patterns for this type
    const patterns = await this.signal.loadPatterns('engage')
    const relevantPatterns = patterns.filter(p => 
      p.pattern_data?.element_type === elementType || 
      p.pattern_type === 'ab_test_insight'
    )

    // Generate element design using AI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are Signal Engage designing a ${elementType} for a client website.

Brand: ${profile.businessName || project.title}
Brand Voice: ${designSystem.brandVoice || 'Professional and friendly'}
Primary Color: ${designSystem.primaryColor || '#3B82F6'}
${pageContext ? `\nPage Context:\n${pageContext.summary}` : ''}
${relevantPatterns.length ? `\nLearned Patterns (apply these):\n${relevantPatterns.map(p => `- ${p.pattern_description}`).join('\n')}` : ''}

Create a high-converting ${elementType} element. Return JSON only:
{
  "name": "descriptive name",
  "headline": "compelling headline (max 60 chars)",
  "body": "supporting message (max 150 chars)",
  "cta_text": "action text (max 25 chars)",
  "cta_url": "destination URL or null",
  "position": "center|top|bottom|bottom-right|etc",
  "trigger_config": { "delay_seconds": N or "scroll_percent": N },
  "appearance": { "backgroundColor": "#hex", "textColor": "#hex", "primaryColor": "#hex" }
}`
        },
        {
          role: 'user',
          content: `Design a ${elementType} for: ${purpose}${offer ? `. Offer: ${offer}` : ''}${targetAudience ? `. Audience: ${targetAudience}` : ''}`
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const design = JSON.parse(completion.choices[0].message.content)

    // Create the element
    const element = await this.createElement({
      ...design,
      element_type: elementType,
      project_id: projectId,
      trigger_type: trigger || 'time',
      trigger_config: design.trigger_config || { delay_seconds: triggerValue || 10 },
      page_patterns: targetPage ? [targetPage] : ['*'],
      is_draft: true
    })

    return {
      element,
      preview: { headline: design.headline, cta: design.cta_text, body: design.body },
      action: {
        type: 'openElement',
        projectId,
        elementId: element.id,
        elementName: element.name,
        label: 'View Element'
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ELEMENT CRUD
  // ─────────────────────────────────────────────────────────────────────────────

  async createElement(params) {
    const elementData = {
      org_id: this.orgId,
      project_id: params.project_id || this.projectId,
      name: params.name || `${params.element_type || 'popup'} - ${new Date().toLocaleDateString()}`,
      element_type: params.element_type || 'popup',
      headline: params.headline,
      body: params.body,
      cta_text: params.cta_text || 'Learn More',
      cta_url: params.cta_url,
      cta_action: params.cta_action || 'link',
      position: params.position || 'center',
      trigger_type: params.trigger_type || 'time',
      trigger_config: params.trigger_config || { delay_seconds: 5 },
      page_patterns: params.page_patterns || ['*'],
      device_targets: params.device_targets || ['desktop', 'mobile', 'tablet'],
      visitor_types: params.visitor_types || ['new', 'returning'],
      frequency_cap: params.frequency_cap || 'session',
      appearance: params.appearance || {},
      start_date: params.start_date,
      end_date: params.end_date,
      is_active: params.is_active !== false,
      is_draft: params.is_draft !== false,
      created_by: this.userId
    }

    const { data: element, error } = await this.supabase
      .from('engage_elements')
      .insert(elementData)
      .select()
      .single()

    if (error) throw new Error(`Failed to create element: ${error.message}`)

    await this.signal.trackAction('engage', {
      type: 'create_element',
      target: `engage_elements.${element.id}`,
      data: { element_type: element.element_type, name: element.name },
      confidence: 0.9,
      reasoning: 'Element created via EngageSkill'
    })

    return element
  }

  async updateElement(elementId, updates) {
    const { data: element, error } = await this.supabase
      .from('engage_elements')
      .update({
        ...updates,
        updated_by: this.userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', elementId)
      .eq('org_id', this.orgId)
      .select()
      .single()

    if (error) throw new Error(`Failed to update element: ${error.message}`)
    return element
  }

  async pauseElement(elementId) {
    return this.updateElement(elementId, { is_active: false })
  }

  async resumeElement(elementId) {
    return this.updateElement(elementId, { is_active: true })
  }

  async deleteElement(elementId) {
    const { error } = await this.supabase
      .from('engage_elements')
      .delete()
      .eq('id', elementId)
      .eq('org_id', this.orgId)

    if (error) throw new Error(`Failed to delete element: ${error.message}`)
    return { success: true }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LIVE EDITING
  // ─────────────────────────────────────────────────────────────────────────────

  async liveEdit(params) {
    const { projectId, elementId, headline, body, ctaText, ctaUrl, backgroundColor, textColor, primaryColor, position } = params

    const element = await this.loadElement(elementId)
    if (!element) throw new Error(`Element not found: ${elementId}`)

    const updates = {}
    const changes = []

    if (headline !== undefined) { updates.headline = headline; changes.push(`headline → "${headline}"`) }
    if (body !== undefined) { updates.body = body; changes.push(`body updated`) }
    if (ctaText !== undefined) { updates.cta_text = ctaText; changes.push(`CTA → "${ctaText}"`) }
    if (ctaUrl !== undefined) { updates.cta_url = ctaUrl; changes.push(`CTA URL updated`) }
    if (position !== undefined) { updates.position = position; changes.push(`position → ${position}`) }

    if (backgroundColor || textColor || primaryColor) {
      updates.appearance = {
        ...(element.appearance || {}),
        ...(backgroundColor && { backgroundColor }),
        ...(textColor && { textColor }),
        ...(primaryColor && { primaryColor })
      }
      if (backgroundColor) changes.push(`background → ${backgroundColor}`)
      if (textColor) changes.push(`text color → ${textColor}`)
      if (primaryColor) changes.push(`button color → ${primaryColor}`)
    }

    if (Object.keys(updates).length === 0) {
      return { result: 'No changes specified.', element }
    }

    const updated = await this.updateElement(elementId, updates)

    await this.signal.trackAction('engage', {
      type: 'live_edit',
      target: `engage_elements.${elementId}`,
      data: { changes },
      confidence: 0.95,
      reasoning: 'Live edit via Echo conversation'
    })

    return {
      result: `✅ Updated **${element.name}**:\n${changes.map(c => `• ${c}`).join('\n')}`,
      element: updated,
      changes
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ANALYTICS & PERFORMANCE
  // ─────────────────────────────────────────────────────────────────────────────

  async getElementStats(params) {
    const { elementId, timeframe = '30d' } = params
    const days = timeframe === '7d' ? 7 : timeframe === '90d' ? 90 : 30

    const element = await this.loadElement(elementId)
    if (!element) throw new Error('Element not found')

    const stats = await this.loadStats(elementId, days)

    const totalImpressions = stats.reduce((sum, s) => sum + (s.impressions || 0), 0)
    const totalClicks = stats.reduce((sum, s) => sum + (s.clicks || 0), 0)
    const totalConversions = stats.reduce((sum, s) => sum + (s.conversions || 0), 0)

    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) : 0
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks * 100).toFixed(2) : 0

    // Calculate trend
    const last7 = stats.slice(-7)
    const prev7 = stats.slice(-14, -7)
    const last7Impressions = last7.reduce((sum, s) => sum + (s.impressions || 0), 0)
    const prev7Impressions = prev7.reduce((sum, s) => sum + (s.impressions || 0), 0)
    const trend = prev7Impressions > 0 
      ? ((last7Impressions - prev7Impressions) / prev7Impressions * 100).toFixed(1)
      : 0

    return {
      element: { id: element.id, name: element.name, type: element.element_type },
      stats: {
        impressions: totalImpressions,
        clicks: totalClicks,
        conversions: totalConversions,
        ctr: parseFloat(ctr),
        conversion_rate: parseFloat(conversionRate),
        trend: parseFloat(trend)
      },
      daily: stats
    }
  }

  async analyzePerformance(params) {
    const { projectId, timeframe = '30d' } = params
    const days = timeframe === '7d' ? 7 : timeframe === '90d' ? 90 : 30

    const elements = await this.loadElements({ projectId, isActive: true })
    const analysis = []

    for (const element of elements.slice(0, 10)) {
      const stats = await this.loadStats(element.id, days)
      const impressions = stats.reduce((sum, s) => sum + (s.impressions || 0), 0)
      const clicks = stats.reduce((sum, s) => sum + (s.clicks || 0), 0)
      const ctr = impressions > 0 ? clicks / impressions : 0

      analysis.push({
        id: element.id,
        name: element.name,
        type: element.element_type,
        impressions,
        clicks,
        ctr: (ctr * 100).toFixed(2) + '%',
        performance: ctr > 0.05 ? 'high' : ctr > 0.02 ? 'medium' : 'low'
      })
    }

    // Sort by performance
    analysis.sort((a, b) => parseFloat(b.ctr) - parseFloat(a.ctr))

    return {
      projectId,
      timeframe,
      elements: analysis,
      summary: {
        total: analysis.length,
        highPerformers: analysis.filter(e => e.performance === 'high').length,
        needsOptimization: analysis.filter(e => e.performance === 'low').length
      }
    }
  }

  async suggestOptimizations(params) {
    const { projectId, elementId } = params
    const suggestions = []

    const elements = elementId 
      ? [await this.loadElement(elementId)]
      : await this.loadElements({ projectId, isActive: true })

    for (const element of elements.filter(Boolean)) {
      const stats = await this.loadStats(element.id, 14)
      const impressions = stats.reduce((sum, s) => sum + (s.impressions || 0), 0)
      const clicks = stats.reduce((sum, s) => sum + (s.clicks || 0), 0)
      const ctr = impressions > 0 ? clicks / impressions : 0

      if (ctr < 0.02 && impressions > 100) {
        suggestions.push({
          element_id: element.id,
          element_name: element.name,
          suggestion: 'Low CTR - Consider updating headline or CTA to be more compelling',
          expected_impact: '+50% CTR',
          priority: 'high',
          current_ctr: (ctr * 100).toFixed(2) + '%'
        })
      }

      if (ctr > 0.05 && impressions > 200) {
        suggestions.push({
          element_id: element.id,
          element_name: element.name,
          suggestion: 'High performer! Consider A/B testing variations to optimize further',
          expected_impact: '+20% potential',
          priority: 'medium',
          current_ctr: (ctr * 100).toFixed(2) + '%'
        })
      }

      const hasRecentImpressions = stats.slice(-3).some(s => s.impressions > 0)
      if (!hasRecentImpressions && element.is_active) {
        suggestions.push({
          element_id: element.id,
          element_name: element.name,
          suggestion: 'No recent impressions - Check targeting rules or consider archiving',
          expected_impact: 'Clean up',
          priority: 'low'
        })
      }
    }

    return { suggestions }
  }

  async learnFromPerformance(params) {
    const { projectId, elementId, insight } = params

    const element = await this.loadElement(elementId)
    if (!element) throw new Error('Element not found')

    const stats = await this.loadStats(elementId, 30)
    const impressions = stats.reduce((sum, s) => sum + (s.impressions || 0), 0)
    const clicks = stats.reduce((sum, s) => sum + (s.clicks || 0), 0)
    const ctr = impressions > 0 ? clicks / impressions : 0

    // Store in Signal memory
    await this.signal.remember('engage', 'performance_insight', `element_${elementId}`, {
      elementId,
      elementType: element.element_type,
      headline: element.headline,
      ctr,
      impressions,
      insight,
      learnedAt: new Date().toISOString()
    }, { importance: ctr > 0.05 ? 0.9 : 0.6 })

    // If high performer, learn as pattern
    if (ctr > 0.05 && impressions > 100) {
      await this.signal.learnPattern('engage', 'high_performer', element.element_type, {
        success: true,
        description: insight || `${element.element_type} with headline "${element.headline}" achieved ${(ctr * 100).toFixed(1)}% CTR`,
        example: { headline: element.headline, cta: element.cta_text, type: element.element_type },
        patternData: { ctr, impressions, element_type: element.element_type }
      })
    }

    return {
      result: `✅ Learned from ${element.name}: ${insight || 'Performance pattern recorded'}`,
      stored: true
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // A/B TESTING
  // ─────────────────────────────────────────────────────────────────────────────

  async createABTest(params) {
    const { projectId, elementId, variantName, changes, trafficSplit = 50 } = params

    const element = await this.loadElement(elementId)
    if (!element) throw new Error('Element not found')

    // Create variant
    const { data: variant, error } = await this.supabase
      .from('engage_variants')
      .insert({
        element_id: elementId,
        variant_name: variantName,
        headline: changes.headline || element.headline,
        body: changes.body || element.body,
        cta_text: changes.ctaText || element.cta_text,
        cta_url: changes.ctaUrl || element.cta_url,
        appearance: {
          ...(element.appearance || {}),
          ...(changes.backgroundColor && { backgroundColor: changes.backgroundColor }),
          ...(changes.primaryColor && { primaryColor: changes.primaryColor })
        },
        traffic_percentage: trafficSplit,
        is_active: true
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create variant: ${error.message}`)

    // Mark element as A/B test
    await this.updateElement(elementId, {
      is_ab_test: true,
      ab_test_status: 'running',
      ab_test_started_at: new Date().toISOString()
    })

    await this.signal.trackAction('engage', {
      type: 'create_ab_test',
      target: `engage_elements.${elementId}`,
      data: { variantId: variant.id, variantName, changes: Object.keys(changes) },
      confidence: 0.9,
      reasoning: 'A/B test created via EngageSkill'
    })

    return {
      result: `✅ A/B test created for "${element.name}"`,
      element,
      variant,
      test: { status: 'running', trafficSplit }
    }
  }

  async getABTestResults(params) {
    const { projectId, elementId } = params

    const element = await this.loadElement(elementId)
    if (!element) throw new Error('Element not found')
    if (!element.is_ab_test) throw new Error('Element is not running an A/B test')

    const variants = element.engage_variants || []
    
    // Get stats for control and variants
    const controlStats = await this.loadStats(elementId, 30)
    const controlImpressions = controlStats.reduce((sum, s) => sum + (s.impressions || 0), 0)
    const controlClicks = controlStats.reduce((sum, s) => sum + (s.clicks || 0), 0)
    const controlCTR = controlImpressions > 0 ? controlClicks / controlImpressions : 0

    const results = [{
      name: 'Control',
      isControl: true,
      impressions: controlImpressions,
      clicks: controlClicks,
      ctr: (controlCTR * 100).toFixed(2) + '%'
    }]

    for (const variant of variants) {
      // Get variant-specific stats
      const { data: variantStats } = await this.supabase
        .from('engage_stats_daily')
        .select('*')
        .eq('variant_id', variant.id)

      const vImpressions = variantStats?.reduce((sum, s) => sum + (s.impressions || 0), 0) || 0
      const vClicks = variantStats?.reduce((sum, s) => sum + (s.clicks || 0), 0) || 0
      const vCTR = vImpressions > 0 ? vClicks / vImpressions : 0

      results.push({
        id: variant.id,
        name: variant.variant_name,
        isControl: false,
        impressions: vImpressions,
        clicks: vClicks,
        ctr: (vCTR * 100).toFixed(2) + '%',
        lift: controlCTR > 0 ? (((vCTR - controlCTR) / controlCTR) * 100).toFixed(1) + '%' : 'N/A'
      })
    }

    return {
      element: { id: element.id, name: element.name },
      status: element.ab_test_status,
      startedAt: element.ab_test_started_at,
      results
    }
  }

  async analyzeABTest(params) {
    const { projectId, elementId } = params

    const testResults = await this.getABTestResults(params)
    const control = testResults.results.find(r => r.isControl)
    const variants = testResults.results.filter(r => !r.isControl)

    // Statistical analysis
    const analysis = {
      ...testResults,
      recommendation: null,
      confidence: 0,
      insights: []
    }

    for (const variant of variants) {
      const lift = parseFloat(variant.lift) || 0
      const totalSamples = control.impressions + variant.impressions

      // Simple confidence calculation
      if (totalSamples > 200 && Math.abs(lift) > 10) {
        analysis.confidence = Math.min(95, 50 + (totalSamples / 100) + Math.abs(lift))
      } else if (totalSamples > 100) {
        analysis.confidence = Math.min(80, 30 + (totalSamples / 50))
      }

      if (lift > 10 && analysis.confidence > 90) {
        analysis.recommendation = `Promote "${variant.name}" - ${lift}% improvement with ${analysis.confidence.toFixed(0)}% confidence`
        analysis.winnerId = variant.id
      } else if (lift < -10 && analysis.confidence > 90) {
        analysis.recommendation = `Keep control - "${variant.name}" underperforms by ${Math.abs(lift)}%`
      } else if (totalSamples < 200) {
        analysis.recommendation = `Need more data - only ${totalSamples} total impressions. Aim for 500+`
      }

      // Generate insights
      if (variant.name.toLowerCase().includes('number') && lift > 0) {
        analysis.insights.push('Headlines with numbers tend to perform better')
      }
    }

    return analysis
  }

  async promoteWinner(params) {
    const { projectId, elementId, variantId } = params

    const element = await this.loadElement(elementId)
    if (!element) throw new Error('Element not found')

    let winner = variantId
    if (!winner) {
      // Auto-select winner from analysis
      const analysis = await this.analyzeABTest(params)
      winner = analysis.winnerId
    }

    if (!winner) {
      throw new Error('No clear winner to promote. Specify variantId or collect more data.')
    }

    const variant = element.engage_variants?.find(v => v.id === winner)
    if (!variant) throw new Error('Variant not found')

    // Apply variant changes to control
    await this.updateElement(elementId, {
      headline: variant.headline,
      body: variant.body,
      cta_text: variant.cta_text,
      cta_url: variant.cta_url,
      appearance: variant.appearance,
      is_ab_test: false,
      ab_test_status: 'completed',
      ab_test_winner_id: winner,
      ab_test_ended_at: new Date().toISOString()
    })

    // Deactivate variants
    await this.supabase
      .from('engage_variants')
      .update({ is_active: false })
      .eq('element_id', elementId)

    // Learn from this A/B test
    await this.signal.learnPattern('engage', 'ab_test_insight', `test_${elementId}`, {
      success: true,
      description: `Variant "${variant.variant_name}" won A/B test`,
      example: { headline: variant.headline, cta: variant.cta_text },
      patternData: { element_type: element.element_type }
    })

    return {
      result: `✅ Promoted "${variant.variant_name}" as winner and ended A/B test`,
      element: await this.loadElement(elementId)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // NUDGES
  // ─────────────────────────────────────────────────────────────────────────────

  async suggestPageNudge(params) {
    const { projectId, pageUrl, goal } = params

    const pageContext = await this.getPageContext({ projectId, pageUrl })
    const config = await this.loadSignalConfig()

    // Get learned patterns
    const patterns = await this.signal.loadPatterns('engage')
    const nudgePatterns = patterns.filter(p => p.pattern_data?.element_type === 'nudge')

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are Signal Engage suggesting contextual nudges.

Page Context:
${pageContext.summary}

${nudgePatterns.length ? `Learned Patterns:\n${nudgePatterns.map(p => `- ${p.pattern_description}`).join('\n')}` : ''}

Suggest a highly contextual nudge for this page. Return JSON:
{
  "nudgeType": "conversation_starter|help_offer|pro_tip|cta",
  "message": "The nudge message",
  "trigger": "time|scroll|idle|exit_intent",
  "triggerValue": 10,
  "reasoning": "Why this nudge fits this page"
}`
        },
        {
          role: 'user',
          content: `Suggest a nudge for ${pageUrl}${goal ? `. Goal: ${goal}` : ''}`
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const suggestion = JSON.parse(completion.choices[0].message.content)

    return {
      pageUrl,
      suggestion,
      pageContext: pageContext.summary
    }
  }

  async createNudge(params) {
    const { projectId, pagePattern, nudgeType, message, trigger = 'time', triggerValue = 10 } = params

    let nudgeMessage = message
    if (!nudgeMessage) {
      // Generate using AI
      const suggestion = await this.suggestPageNudge({ projectId, pageUrl: pagePattern })
      nudgeMessage = suggestion.suggestion.message
    }

    // Create as nudge element
    const element = await this.createElement({
      element_type: 'nudge',
      project_id: projectId,
      name: `${nudgeType} - ${pagePattern}`,
      headline: nudgeMessage,
      trigger_type: trigger,
      trigger_config: trigger === 'scroll' 
        ? { scroll_percent: triggerValue }
        : { delay_seconds: triggerValue },
      page_patterns: [pagePattern],
      is_draft: false,
      metadata: { nudgeType }
    })

    return {
      result: `✅ Created ${nudgeType} nudge for ${pagePattern}`,
      element
    }
  }

  async optimizeNudge(params) {
    const { projectId, nudgeId } = params

    const element = await this.loadElement(nudgeId)
    if (!element) throw new Error('Nudge not found')

    const stats = await this.loadStats(nudgeId, 30)
    const impressions = stats.reduce((sum, s) => sum + (s.impressions || 0), 0)
    const clicks = stats.reduce((sum, s) => sum + (s.clicks || 0), 0)
    const ctr = impressions > 0 ? clicks / impressions : 0

    const pageContext = await this.getPageContext({ 
      projectId: element.project_id, 
      pageUrl: element.page_patterns?.[0] || '/' 
    })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are optimizing a nudge based on performance data.

Current nudge: "${element.headline}"
Performance: ${impressions} impressions, ${(ctr * 100).toFixed(2)}% CTR
Page context: ${pageContext.summary}

Suggest an optimized version. Return JSON:
{
  "headline": "improved message",
  "trigger": "time|scroll|idle|exit_intent",
  "triggerValue": 10,
  "reasoning": "Why this should perform better"
}`
        },
        {
          role: 'user',
          content: `Optimize this nudge for better engagement`
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const optimization = JSON.parse(completion.choices[0].message.content)

    return {
      current: { headline: element.headline, ctr: (ctr * 100).toFixed(2) + '%' },
      suggested: optimization,
      applyCommand: `To apply: update nudge ${nudgeId} with headline "${optimization.headline}"`
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // COPY GENERATION
  // ─────────────────────────────────────────────────────────────────────────────

  async generateCopy(params) {
    const { projectId, elementId, prompt, pageContext } = params

    const element = elementId ? await this.loadElement(elementId) : null
    const config = await this.loadSignalConfig()
    const designSystem = config.design_system || {}
    const profile = config.profile_snapshot || {}

    let context = pageContext || ''
    if (!context && element?.page_patterns?.[0]) {
      const pc = await this.getPageContext({ projectId, pageUrl: element.page_patterns[0] })
      context = pc.summary
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a conversion copywriter for ${profile.businessName || 'a business'}.
Brand voice: ${designSystem.brandVoice || 'Professional and friendly'}
${context ? `\nPage context:\n${context}` : ''}

Generate compelling copy. Return JSON:
{
  "headline": "compelling headline (max 60 chars)",
  "body": "supporting message (max 150 chars)",
  "cta_text": "action text (max 25 chars)"
}`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' }
    })

    const copy = JSON.parse(completion.choices[0].message.content)

    return {
      ...copy,
      elementId,
      prompt
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL EXECUTOR
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Execute a tool - main entry point for Echo delegation
   */
  async executeTool(tool, params = {}) {
    switch (tool) {
      // Element management
      case 'design_element':
        return this.designElement(params)
      case 'list_elements':
        return this.listElements(params)
      case 'live_edit':
        return this.liveEdit(params)
      case 'toggle_element':
        return params.action === 'pause' 
          ? this.pauseElement(params.elementId)
          : this.resumeElement(params.elementId)
      case 'navigate_to_element':
        return this.navigateToElement(params)

      // Analytics
      case 'get_element_stats':
        return this.getElementStats(params)
      case 'analyze_performance':
        return this.analyzePerformance(params)
      case 'suggest_optimizations':
        return this.suggestOptimizations(params)
      case 'learn_from_performance':
        return this.learnFromPerformance(params)

      // A/B Testing
      case 'create_ab_test':
        return this.createABTest(params)
      case 'get_ab_test_results':
        return this.getABTestResults(params)
      case 'analyze_ab_test':
        return this.analyzeABTest(params)
      case 'promote_winner':
        return this.promoteWinner(params)

      // Nudges & Page Context
      case 'get_page_context':
        return this.getPageContext(params)
      case 'suggest_page_nudge':
        return this.suggestPageNudge(params)
      case 'create_nudge':
        return this.createNudge(params)
      case 'optimize_nudge':
        return this.optimizeNudge(params)

      // Copy
      case 'generate_copy':
        return this.generateCopy(params)

      // Legacy support
      case 'create_element':
        return this.createElement(params)
      case 'update_element':
        return this.updateElement(params.id, params.updates)
      case 'pause_element':
        return this.pauseElement(params.id || params.elementId)
      case 'resume_element':
        return this.resumeElement(params.id || params.elementId)
      case 'delete_element':
        return this.deleteElement(params.id || params.elementId)

      default:
        throw new Error(`Unknown tool: ${tool}`)
    }
  }

  /**
   * List elements with formatted output
   */
  async listElements(params) {
    const { projectId, includeInactive, elementType } = params
    const elements = await this.loadElements({ 
      projectId, 
      isActive: includeInactive ? undefined : true,
      type: elementType
    })

    if (!elements.length) {
      return { result: 'No engagement elements found.', elements: [] }
    }

    let result = `**Engagement Elements (${elements.length}):**\n\n`
    elements.forEach((e, i) => {
      const status = e.is_active ? '🟢' : '⏸️'
      result += `${i + 1}. ${status} **${e.name}** (${e.element_type})\n`
      result += `   ID: \`${e.id}\`\n`
      result += `   Headline: "${e.headline || 'No headline'}"\n\n`
    })

    return { result, elements }
  }

  /**
   * Navigate to element action
   */
  async navigateToElement(params) {
    const { projectId, elementId } = params
    return {
      result: `Opening element in visual editor...`,
      action: {
        type: 'openElement',
        projectId,
        elementId,
        label: 'View Element'
      }
    }
  }

  /**
   * Chat interface
   */
  async chat(message) {
    return this.echo.send(message)
  }

  /**
   * Get tools for OpenAI function calling
   */
  static getTools() {
    return ENGAGE_TOOLS
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export function createEngageSkill(supabase, orgId, projectId, options = {}) {
  return new EngageSkill(supabase, orgId, projectId, options)
}

export default EngageSkill
