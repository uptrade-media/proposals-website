/**
 * Signal CRM Skill
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * The CRM skill provides AI-powered contact management, lead scoring, and sales automation.
 * 
 * Available Tools:
 * - score_lead: Score a lead based on engagement and fit
 * - prioritize_followups: Rank contacts needing attention
 * - draft_email: Generate personalized outreach emails
 * - analyze_pipeline: Pipeline health and recommendations
 * - suggest_next_action: What to do next with a contact
 * - call_summary: Summarize a call recording/transcript
 * - task_extraction: Extract tasks from call notes
 * - predict_close: Predict deal close probability
 * 
 * Usage:
 *   import { CRMSkill } from './skills/crm-skill.js'
 *   const crm = new CRMSkill(signal, contactId)
 *   const score = await crm.scoreLead(contactId)
 */

import { Signal, createModuleEcho } from '../utils/signal.js'

// ═══════════════════════════════════════════════════════════════════════════════
// CRM SKILL PROMPTS
// ═══════════════════════════════════════════════════════════════════════════════

const CRM_SYSTEM_PROMPT = `You are Signal CRM, an expert sales strategist and relationship manager.

Your role is to help sales teams work smarter through:
- Lead scoring and prioritization
- Personalized outreach suggestions
- Pipeline analysis and forecasting
- Call summarization and task extraction
- Next best action recommendations

When making recommendations:
1. Consider the full contact history (calls, emails, deals)
2. Factor in deal size and stage
3. Be specific about timing ("follow up tomorrow" not "soon")
4. Personalize based on the prospect's industry and role
5. Learn from what's worked with similar prospects

Communication guidelines:
- Match the prospect's communication style
- Reference previous conversations
- Suggest value-add content when appropriate
- Flag deals at risk before they're lost

IMPORTANT: You learn from outcomes. Closed deals reinforce successful patterns.
Lost deals help refine lead scoring and outreach strategies.`

const TOOL_PROMPTS = {
  score_lead: `Score this lead based on engagement, fit, and behavior signals.
Consider: email opens, website visits, call responsiveness, budget indicators, timeline.
Output JSON with: score (0-100), fit_score, engagement_score, factors[], risks[], recommendations[].`,

  prioritize_followups: `Rank these contacts by follow-up priority.
Consider: last contact date, deal stage, engagement level, deal size, time sensitivity.
Output JSON with: prioritized_contacts[] containing id, priority (1-10), reason, suggested_action, deadline.`,

  draft_email: `Draft a personalized email for this contact.
Consider: relationship stage, previous interactions, their industry/role, current deal status.
Output JSON with: subject, body, call_to_action, personalization_notes, send_timing.`,

  analyze_pipeline: `Analyze the sales pipeline health.
Check: stage distribution, velocity, stuck deals, forecast accuracy, rep performance.
Output JSON with: health_score, at_risk_deals[], opportunities[], blockers[], recommendations[].`,

  suggest_next_action: `Suggest the best next action for this contact.
Consider: deal stage, last interaction, engagement level, competitor activity.
Output JSON with: action_type, description, timing, talking_points[], resources_to_share[].`,

  call_summary: `Summarize this call recording/transcript.
Extract: key discussion points, decisions made, concerns raised, next steps.
Output JSON with: summary, key_points[], decisions[], concerns[], next_steps[], sentiment.`,

  task_extraction: `Extract actionable tasks from call notes.
Identify: commitments made, follow-up items, research needed, internal actions.
Output JSON with: tasks[] containing description, owner, due_date, priority, related_to.`,

  predict_close: `Predict the probability of closing this deal.
Consider: engagement signals, timeline, budget confirmation, champion strength, competition.
Output JSON with: probability (0-100), confidence, positive_signals[], risks[], accelerators[].`
}

// ═══════════════════════════════════════════════════════════════════════════════
// CRM SKILL CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class CRMSkill {
  constructor(supabase, orgId, options = {}) {
    this.supabase = supabase
    this.orgId = orgId
    this.userId = options.userId
    this.signal = new Signal(supabase, orgId, { userId: options.userId })
    this.echo = createModuleEcho(supabase, orgId, 'crm', { userId: options.userId })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DATA LOADING
  // ─────────────────────────────────────────────────────────────────────────────

  async loadContact(contactId) {
    const { data: contact } = await this.supabase
      .from('contacts')
      .select(`
        *,
        call_logs(id, created_at, duration, summary, sentiment),
        email_tracking(id, sent_at, opened_at, clicked_at, subject),
        proposals(id, title, status, amount),
        projects(id, name, status)
      `)
      .eq('id', contactId)
      .eq('org_id', this.orgId)
      .single()

    return contact
  }

  async loadPipeline(stage = null) {
    let query = this.supabase
      .from('contacts')
      .select('*, proposals(*)')
      .eq('org_id', this.orgId)
      .not('stage', 'is', null)

    if (stage) {
      query = query.eq('stage', stage)
    }

    const { data: contacts } = await query.order('updated_at', { ascending: false })
    return contacts || []
  }

  async loadRecentActivity(contactId, limit = 20) {
    const activities = []

    // Get calls
    const { data: calls } = await this.supabase
      .from('call_logs')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (calls) {
      activities.push(...calls.map(c => ({ type: 'call', ...c })))
    }

    // Get emails
    const { data: emails } = await this.supabase
      .from('email_tracking')
      .select('*')
      .eq('contact_id', contactId)
      .order('sent_at', { ascending: false })
      .limit(limit)

    if (emails) {
      activities.push(...emails.map(e => ({ type: 'email', ...e })))
    }

    // Sort by date
    return activities.sort((a, b) => {
      const dateA = a.created_at || a.sent_at
      const dateB = b.created_at || b.sent_at
      return new Date(dateB) - new Date(dateA)
    }).slice(0, limit)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL IMPLEMENTATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  async scoreLead(contactId) {
    const [contact, activity] = await Promise.all([
      this.loadContact(contactId),
      this.loadRecentActivity(contactId)
    ])

    const result = await this.signal.invoke('crm', 'score_lead', {
      contact,
      activity,
      proposal_count: contact.proposals?.length || 0,
      total_proposal_value: contact.proposals?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
      calls_count: contact.call_logs?.length || 0,
      emails_opened: contact.email_tracking?.filter(e => e.opened_at)?.length || 0
    }, {
      trackAction: true,
      additionalContext: { tool_prompt: TOOL_PROMPTS.score_lead }
    })

    // Update contact with score
    if (result.score) {
      await this.supabase
        .from('contacts')
        .update({ 
          lead_score: result.score,
          lead_score_factors: result.factors,
          lead_score_updated_at: new Date().toISOString()
        })
        .eq('id', contactId)
    }

    return result
  }

  async prioritizeFollowups(options = {}) {
    const pipeline = await this.loadPipeline()
    
    // Filter to contacts needing follow-up
    const needsFollowup = pipeline.filter(c => {
      const lastContact = c.last_contact_at || c.updated_at
      const daysSince = (Date.now() - new Date(lastContact)) / (1000 * 60 * 60 * 24)
      return daysSince > 3 // More than 3 days since last contact
    })

    return await this.signal.invoke('crm', 'prioritize_followups', {
      contacts: needsFollowup,
      user_capacity: options.capacity || 10, // How many can they handle today
      ...options
    }, {
      additionalContext: { tool_prompt: TOOL_PROMPTS.prioritize_followups }
    })
  }

  async draftEmail(contactId, purpose, options = {}) {
    const [contact, activity] = await Promise.all([
      this.loadContact(contactId),
      this.loadRecentActivity(contactId, 5)
    ])

    const result = await this.signal.invoke('crm', 'draft_email', {
      contact,
      recent_activity: activity,
      purpose, // 'follow_up', 'proposal_review', 'check_in', 'intro'
      sender_name: options.senderName,
      tone: options.tone || 'professional'
    }, {
      trackAction: true,
      additionalContext: { tool_prompt: TOOL_PROMPTS.draft_email }
    })

    return result
  }

  async analyzePipeline() {
    const pipeline = await this.loadPipeline()
    
    // Group by stage
    const byStage = pipeline.reduce((acc, c) => {
      const stage = c.stage || 'unknown'
      if (!acc[stage]) acc[stage] = []
      acc[stage].push(c)
      return acc
    }, {})

    return await this.signal.invoke('crm', 'analyze_pipeline', {
      pipeline,
      by_stage: byStage,
      total_value: pipeline.reduce((sum, c) => 
        sum + (c.proposals?.reduce((s, p) => s + (p.amount || 0), 0) || 0), 0
      ),
      contact_count: pipeline.length
    }, {
      additionalContext: { tool_prompt: TOOL_PROMPTS.analyze_pipeline }
    })
  }

  async suggestNextAction(contactId) {
    const [contact, activity] = await Promise.all([
      this.loadContact(contactId),
      this.loadRecentActivity(contactId)
    ])

    return await this.signal.invoke('crm', 'suggest_next_action', {
      contact,
      recent_activity: activity,
      current_stage: contact.stage,
      proposals: contact.proposals,
      last_call: contact.call_logs?.[0]
    }, {
      trackAction: true,
      additionalContext: { tool_prompt: TOOL_PROMPTS.suggest_next_action }
    })
  }

  async summarizeCall(callId) {
    const { data: call } = await this.supabase
      .from('call_logs')
      .select('*, contacts(*)')
      .eq('id', callId)
      .single()

    if (!call) throw new Error('Call not found')

    const result = await this.signal.invoke('crm', 'call_summary', {
      call,
      contact: call.contacts,
      transcript: call.transcript,
      duration: call.duration
    }, {
      additionalContext: { tool_prompt: TOOL_PROMPTS.call_summary }
    })

    // Update call with summary
    await this.supabase
      .from('call_logs')
      .update({
        summary: result.summary,
        key_points: result.key_points,
        sentiment: result.sentiment,
        next_steps: result.next_steps
      })
      .eq('id', callId)

    return result
  }

  async extractTasks(callId) {
    const { data: call } = await this.supabase
      .from('call_logs')
      .select('*, contacts(*)')
      .eq('id', callId)
      .single()

    if (!call) throw new Error('Call not found')

    const result = await this.signal.invoke('crm', 'task_extraction', {
      call,
      contact: call.contacts,
      transcript: call.transcript,
      notes: call.notes
    }, {
      additionalContext: { tool_prompt: TOOL_PROMPTS.task_extraction }
    })

    // Create tasks in database
    if (result.tasks?.length > 0) {
      await this.supabase
        .from('call_tasks')
        .insert(result.tasks.map(t => ({
          call_id: callId,
          contact_id: call.contact_id,
          description: t.description,
          due_date: t.due_date,
          priority: t.priority,
          assigned_to: t.owner || this.userId,
          status: 'pending'
        })))
    }

    return result
  }

  async predictClose(contactId) {
    const [contact, activity] = await Promise.all([
      this.loadContact(contactId),
      this.loadRecentActivity(contactId)
    ])

    const proposals = contact.proposals?.filter(p => p.status === 'pending') || []

    return await this.signal.invoke('crm', 'predict_close', {
      contact,
      active_proposals: proposals,
      activity_history: activity,
      total_deal_value: proposals.reduce((sum, p) => sum + (p.amount || 0), 0),
      days_in_pipeline: contact.created_at 
        ? Math.floor((Date.now() - new Date(contact.created_at)) / (1000 * 60 * 60 * 24))
        : 0
    }, {
      trackAction: true,
      additionalContext: { tool_prompt: TOOL_PROMPTS.predict_close }
    })
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

export function createCRMSkill(supabase, orgId, options = {}) {
  return new CRMSkill(supabase, orgId, options)
}

export default CRMSkill
