/**
 * Signal Engage Skill
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * The Engage skill provides AI-powered management of engagement elements:
 * popups, nudges, banners, toasts, and chat widget configuration.
 * 
 * Available Tools:
 * - create_element: Create a new popup, nudge, banner, or toast
 * - update_element: Update an existing element's content or settings
 * - pause_element: Temporarily disable an element
 * - resume_element: Re-enable a paused element
 * - delete_element: Remove an element
 * - get_element_stats: Get analytics for an element
 * - list_active_elements: List all currently active elements
 * - suggest_optimizations: AI suggestions based on performance data
 * 
 * Usage:
 *   import { EngageSkill } from './skills/engage-skill.js'
 *   const engage = new EngageSkill(supabase, orgId, projectId, { userId })
 *   const element = await engage.createElement({ type: 'popup', headline: '...' })
 */

import { Signal, createModuleEcho } from '../utils/signal.js'

// ═══════════════════════════════════════════════════════════════════════════════
// ENGAGE SKILL PROMPTS
// ═══════════════════════════════════════════════════════════════════════════════

const ENGAGE_SYSTEM_PROMPT = `You are Signal Engage, an expert in website conversion optimization and user engagement.

Your role is to help create and manage engagement elements:
- Popups: Modal dialogs for important announcements or lead capture
- Nudges: Small, subtle prompts that guide users
- Banners: Full-width announcements at top or bottom
- Toasts: Brief notification-style messages

When creating elements:
1. Consider the user intent and page context
2. Suggest appropriate trigger types (time, scroll, exit-intent)
3. Recommend targeting (device, traffic source, visitor type)
4. Craft compelling copy that matches brand voice
5. Set reasonable frequency caps to avoid annoyance

Best practices:
- Exit-intent popups work well for cart abandonment
- Nudges are great for subtle feature discovery
- Banners suit site-wide announcements
- Time delays of 5-15 seconds are usually optimal
- Always have a clear CTA

IMPORTANT: Always confirm element details before publishing.
Learn from click-through rates and conversion data to improve.`

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
Output JSON with: suggestions[] containing element_id, suggestion, expected_impact, priority.`
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

  async loadElements(filters = {}) {
    let query = this.supabase
      .from('engage_elements')
      .select('*')
      .eq('org_id', this.orgId)

    if (this.projectId) {
      query = query.eq('project_id', this.projectId)
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

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL IMPLEMENTATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a new engagement element
   */
  async createElement(params) {
    // Apply defaults for unspecified fields
    const elementData = {
      org_id: this.orgId,
      project_id: this.projectId,
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

    if (error) {
      throw new Error(`Failed to create element: ${error.message}`)
    }

    // Track this action
    await this.signal.trackAction('engage', {
      type: 'create_element',
      target: `engage_elements.${element.id}`,
      data: { element_type: element.element_type, name: element.name },
      confidence: 0.9,
      reasoning: 'User requested element creation via Echo'
    })

    return element
  }

  /**
   * Update an existing element
   */
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

    if (error) {
      throw new Error(`Failed to update element: ${error.message}`)
    }

    return element
  }

  /**
   * Pause an element
   */
  async pauseElement(elementId) {
    return this.updateElement(elementId, { is_active: false })
  }

  /**
   * Resume an element
   */
  async resumeElement(elementId) {
    return this.updateElement(elementId, { is_active: true })
  }

  /**
   * Delete an element
   */
  async deleteElement(elementId) {
    const { error } = await this.supabase
      .from('engage_elements')
      .delete()
      .eq('id', elementId)
      .eq('org_id', this.orgId)

    if (error) {
      throw new Error(`Failed to delete element: ${error.message}`)
    }

    return { success: true }
  }

  /**
   * Get element statistics
   */
  async getElementStats(elementId) {
    const element = await this.loadElement(elementId)
    if (!element) {
      throw new Error('Element not found')
    }

    const stats = await this.loadStats(elementId)

    // Calculate aggregates
    const totalImpressions = stats.reduce((sum, s) => sum + (s.impressions || 0), 0)
    const totalClicks = stats.reduce((sum, s) => sum + (s.clicks || 0), 0)
    const totalConversions = stats.reduce((sum, s) => sum + (s.conversions || 0), 0)

    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) : 0
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks * 100).toFixed(2) : 0

    // Calculate trend (compare last 7 days to previous 7 days)
    const last7 = stats.slice(-7)
    const prev7 = stats.slice(-14, -7)
    const last7Impressions = last7.reduce((sum, s) => sum + (s.impressions || 0), 0)
    const prev7Impressions = prev7.reduce((sum, s) => sum + (s.impressions || 0), 0)
    const trend = prev7Impressions > 0 
      ? ((last7Impressions - prev7Impressions) / prev7Impressions * 100).toFixed(1)
      : 0

    return {
      element,
      stats: {
        impressions: totalImpressions,
        clicks: totalClicks,
        conversions: totalConversions,
        ctr: parseFloat(ctr),
        conversion_rate: parseFloat(conversionRate),
        trend: parseFloat(trend),
        daily: stats
      }
    }
  }

  /**
   * Suggest optimizations based on performance
   */
  async suggestOptimizations() {
    const elements = await this.loadElements({ isActive: true })
    const suggestions = []

    for (const element of elements) {
      const stats = await this.loadStats(element.id, 14)
      const impressions = stats.reduce((sum, s) => sum + (s.impressions || 0), 0)
      const clicks = stats.reduce((sum, s) => sum + (s.clicks || 0), 0)
      const ctr = impressions > 0 ? clicks / impressions : 0

      // Low CTR suggestion
      if (ctr < 0.02 && impressions > 100) {
        suggestions.push({
          element_id: element.id,
          element_name: element.name,
          suggestion: 'Consider updating the headline or CTA text to be more compelling',
          expected_impact: '+50% CTR',
          priority: 'high',
          current_ctr: (ctr * 100).toFixed(2) + '%'
        })
      }

      // High performing - suggest A/B test
      if (ctr > 0.05 && impressions > 200) {
        suggestions.push({
          element_id: element.id,
          element_name: element.name,
          suggestion: 'This element is performing well. Consider A/B testing variations to optimize further.',
          expected_impact: '+20% potential improvement',
          priority: 'medium',
          current_ctr: (ctr * 100).toFixed(2) + '%'
        })
      }

      // Stale element - no recent impressions
      const hasRecentImpressions = stats.slice(-3).some(s => s.impressions > 0)
      if (!hasRecentImpressions && element.is_active) {
        suggestions.push({
          element_id: element.id,
          element_name: element.name,
          suggestion: 'This element has no recent impressions. Check targeting rules or consider archiving.',
          expected_impact: 'Clean up or fix targeting',
          priority: 'low'
        })
      }
    }

    return suggestions
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CHAT INTERFACE
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Chat with the Engage skill
   */
  async chat(message) {
    return this.echo.send(message)
  }

  /**
   * Execute a tool through Signal
   */
  async executeTool(tool, params = {}) {
    // Map tools to local methods
    switch (tool) {
      case 'create_element':
        return this.createElement(params)
      case 'update_element':
        return this.updateElement(params.id, params.updates)
      case 'pause_element':
        return this.pauseElement(params.id)
      case 'resume_element':
        return this.resumeElement(params.id)
      case 'delete_element':
        return this.deleteElement(params.id)
      case 'get_element_stats':
        return this.getElementStats(params.id)
      case 'list_active_elements':
        return this.loadElements({ isActive: true })
      case 'suggest_optimizations':
        return this.suggestOptimizations()
      default:
        throw new Error(`Unknown tool: ${tool}`)
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export function createEngageSkill(supabase, orgId, projectId, options = {}) {
  return new EngageSkill(supabase, orgId, projectId, options)
}

export default EngageSkill
