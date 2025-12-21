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
  // TOOL: EXTRACT BUSINESS CONTEXT
  // ─────────────────────────────────────────────────────────────────────────────

  async extractBusinessContext(callData) {
    const result = await this.signal.invoke({
      module: 'crm',
      tool: 'extract_business_context',
      systemPrompt: CRM_SYSTEM_PROMPT,
      userPrompt: `Analyze this call data and extract any business information mentioned:

Phone Number: ${callData.phone_number}
Direction: ${callData.direction}
Transcript: ${callData.openphone_transcript || 'Not available'}
Summary: ${callData.openphone_summary || 'Not available'}
AI Analysis: ${callData.ai_summary || 'Not available'}

Extract:
1. Business name (if mentioned)
2. Industry/business type
3. Location/city (if mentioned)
4. Contact name and title
5. Any specific details about the business

Return JSON:
{
  "business_name": "Name or null",
  "industry": "Industry type or null",
  "location": "City, State or null",
  "contact_name": "Name or null",
  "contact_title": "Title or null",
  "business_details": "Any additional context",
  "confidence": 0.0-1.0
}`,
      responseFormat: { type: 'json_object' },
      temperature: 0.2
    })

    await this.echo.log({
      action: 'extract_business_context',
      input: { callId: callData.id, phoneNumber: callData.phone_number },
      output: result
    })

    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: ANALYZE WEBSITE
  // ─────────────────────────────────────────────────────────────────────────────

  async analyzeWebsite(websiteUrl, context = {}) {
    const result = await this.signal.invoke({
      module: 'crm',
      tool: 'analyze_website',
      systemPrompt: CRM_SYSTEM_PROMPT,
      userPrompt: `Analyze this website for sales intelligence:

URL: ${websiteUrl}
${context.pageContent ? `Page Content:\n${context.pageContent}` : ''}
${context.metaInfo ? `Meta Info: ${JSON.stringify(context.metaInfo)}` : ''}
${context.existingNotes ? `Existing Notes: ${context.existingNotes}` : ''}

Extract sales-relevant intelligence:
1. Company/business name
2. Industry and business type
3. Key products/services offered
4. Target audience
5. Company size indicators (team page, about us)
6. Technology stack hints
7. Pain points their messaging reveals
8. Opportunities for our services

Return JSON:
{
  "company_name": "Name",
  "industry": "Industry type",
  "business_type": "B2B/B2C/etc",
  "products_services": ["Service 1", "Service 2"],
  "target_audience": "Description",
  "company_size": "small/medium/large or estimate",
  "tech_indicators": ["Tech 1", "Tech 2"],
  "pain_points": ["Pain point 1", "Pain point 2"],
  "opportunities": ["Opportunity 1", "Opportunity 2"],
  "talking_points": ["Point 1", "Point 2"],
  "confidence": 0.0-1.0
}`,
      responseFormat: { type: 'json_object' },
      temperature: 0.3
    })

    await this.echo.log({
      action: 'analyze_website',
      input: { websiteUrl },
      output: result
    })

    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: ANALYZE CALL (OpenPhone integration)
  // ─────────────────────────────────────────────────────────────────────────────

  async analyzeCall(transcript, openphoneSummary) {
    if (!transcript && !openphoneSummary) {
      return null // Nothing to analyze
    }

    const result = await this.signal.invoke({
      module: 'crm',
      tool: 'analyze_call',
      systemPrompt: CRM_SYSTEM_PROMPT,
      userPrompt: `You are a CRM assistant analyzing a sales call. You have been provided:
1. OpenPhone's transcript: ${transcript ? 'Available' : 'Not available'}
2. OpenPhone's AI summary: ${openphoneSummary ? 'Available' : 'Not available'}

Your task is to provide ENHANCED CRM analysis in JSON format with these fields:

{
  "enhanced_summary": "2-3 sentence summary with key business details",
  "sentiment": "positive|neutral|negative|mixed",
  "conversation_type": "sales|support|discovery|closing|follow_up",
  "lead_quality_score": 0-100 (0-40 cold, 41-70 warm, 71-100 hot),
  "contact": {
    "name": "Full name if mentioned",
    "company": "Company name",
    "title": "Job title",
    "email": "Email if mentioned",
    "phone": "Phone if mentioned",
    "website": "Website if mentioned",
    "confidence": 0.00-1.00
  },
  "tasks": [
    {
      "title": "Action item title",
      "description": "Details",
      "task_type": "follow_up|send_proposal|schedule_meeting|research|technical",
      "priority": "low|medium|high|urgent",
      "due_date": "ISO 8601 date string",
      "confidence": 0.00-1.00,
      "reasoning": "Why this task is needed"
    }
  ],
  "topics": [
    {
      "topic": "pricing|timeline|features|objections|budget|competition",
      "relevance_score": 0.00-1.00,
      "sentiment": "positive|neutral|negative",
      "key_phrases": ["relevant quotes"]
    }
  ],
  "follow_up": {
    "type": "email|call|sms|meeting",
    "scheduled_for": "ISO 8601 date string",
    "suggested_subject": "Subject line for email",
    "suggested_message": "Draft message"
  }
}

INPUT DATA:
${transcript ? `Transcript: ${transcript}` : ''}
${openphoneSummary ? `OpenPhone Summary: ${openphoneSummary}` : ''}

Return ONLY valid JSON, no markdown.`,
      responseFormat: { type: 'json_object' },
      temperature: 0.3
    })

    await this.echo.log({
      action: 'analyze_call',
      input: { hasTranscript: !!transcript, hasSummary: !!openphoneSummary },
      output: result
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
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export function createCRMSkill(supabase, orgId, options = {}) {
  return new CRMSkill(supabase, orgId, options)
}

export default CRMSkill
