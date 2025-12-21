/**
 * Signal Email Skill
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * The Email skill provides AI-powered email creation, optimization, and A/B testing.
 * Integrates with GrapesJS visual editor for real-time design improvements.
 * 
 * Available Tools:
 * - draft_email: Create email content from conversation
 * - create_template: Generate full email template with HTML
 * - optimize_template: Improve existing template based on performance
 * - suggest_subject_lines: Generate A/B test variants for subject lines
 * - analyze_performance: Get insights from email metrics
 * - get_patterns: Retrieve learned patterns from past campaigns
 * - generate_blocks: Create GrapesJS-compatible email blocks
 * - suggest_send_time: Recommend optimal send time
 * 
 * Usage:
 *   import { EmailSkill } from './skills/email-skill.js'
 *   const email = new EmailSkill(supabase, orgId, { userId })
 *   const draft = await email.draftEmail(purpose, context)
 */

import { Signal, createModuleEcho } from '../utils/signal.js'

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL SKILL PROMPTS
// ═══════════════════════════════════════════════════════════════════════════════

const EMAIL_SYSTEM_PROMPT = `You are Signal's email expert for Uptrade Media, a Cincinnati-based digital marketing agency.

Your role is to create compelling, high-converting emails that:
- Get opened (craft irresistible subject lines)
- Get read (concise, scannable copy)
- Get clicked (clear, action-oriented CTAs)
- Stay out of spam (follow deliverability best practices)

WRITING STYLE:
- Professional yet warm and approachable
- Never salesy or pushy - we're trusted partners, not vendors
- Conversational but efficient
- Use first names, be personal
- Short paragraphs (2-3 sentences max)
- One clear CTA per email

EMAIL BEST PRACTICES:
1. Subject lines: 40-60 chars, use power words, create curiosity
2. Preview text: Extend subject line, add value
3. Opening: Hook with relevance, not "I hope this finds you well"
4. Body: Problem → Solution → Value → CTA
5. CTAs: Action verbs, specific outcomes ("See Your Results" not "Click Here")
6. Images: Use sparingly, alt text always
7. Mobile: 600px max width, 14px+ font size

DELIVERABILITY:
- Avoid spam triggers (FREE, URGENT, ACT NOW)
- Balance text-to-image ratio (80/20)
- Include unsubscribe link
- Use proper authentication (SPF/DKIM/DMARC handled by Resend)

BRAND VOICE:
- Uptrade Media: Confident but humble, data-driven, results-focused
- Use "we" for team, avoid "I" unless personal outreach
- Reference specific data points when available
- Be encouraging but honest about improvements needed`

const TOOL_PROMPTS = {
  draft_email: `Draft an email based on the user's request and context.

Return JSON:
{
  "subject": "Subject line (40-60 chars)",
  "preview_text": "Preview text that complements subject",
  "body_html": "Full HTML email body with inline styles",
  "body_text": "Plain text version",
  "merge_fields": ["first_name", "company", etc],
  "cta": { "text": "CTA button text", "url": "{{link}}" },
  "tone": "formal|casual|urgent|friendly",
  "estimated_read_time": "30 seconds"
}`,

  create_template: `Create a complete email template with GrapesJS-compatible HTML.

The template must:
- Use tables for layout (email client compatibility)
- Include inline CSS styles
- Be responsive (max-width: 600px)
- Include merge field placeholders: {{first_name}}, {{company}}, etc.
- Have clear section markers for GrapesJS blocks

Return JSON:
{
  "name": "Template name",
  "category": "onboarding|follow-up|report|promotion|sequence",
  "subject": "Default subject line",
  "preview_text": "Default preview text",
  "html": "Full email HTML with inline styles",
  "blocks": [
    { "id": "header", "html": "...", "category": "Layout" },
    { "id": "content", "html": "...", "category": "Content" },
    { "id": "cta", "html": "...", "category": "Content" },
    { "id": "footer", "html": "...", "category": "Layout" }
  ],
  "merge_fields": ["first_name", "company", "project_name"],
  "suggested_use_cases": ["New client onboarding", "etc"]
}`,

  optimize_template: `Analyze and optimize an email template based on performance data.

Consider:
- Open rate (subject line, preview text, sender name)
- Click rate (CTA text, placement, design)
- Engagement patterns (time-on-email, scroll depth)
- Device performance (mobile vs desktop)
- A/B test history

Return JSON:
{
  "current_score": 0-100,
  "issues": [
    { "element": "subject", "issue": "Too generic", "severity": "high" }
  ],
  "improvements": [
    { 
      "element": "subject", 
      "current": "Current text",
      "suggested": "Improved text",
      "predicted_impact": "+15% open rate",
      "confidence": 0.8
    }
  ],
  "optimized_html": "Updated HTML if body changes suggested",
  "a_b_recommendations": ["Test emoji in subject", "etc"]
}`,

  suggest_subject_lines: `Generate subject line variants for A/B testing.

Based on:
- Industry best practices
- Organization's past performance patterns
- Email purpose and content
- Target audience

Return JSON:
{
  "variants": [
    {
      "text": "Subject line text",
      "type": "curiosity|benefit|urgency|personalized|question",
      "predicted_open_rate": "45%",
      "reasoning": "Why this works",
      "test_priority": 1-5
    }
  ],
  "control": { "text": "Current subject", "baseline_rate": "35%" },
  "recommended_test_size": 100,
  "recommended_winner_metric": "open_rate"
}`,

  analyze_performance: `Analyze email campaign performance and provide insights.

Return JSON:
{
  "summary": {
    "total_sent": 1000,
    "open_rate": "42%",
    "click_rate": "8%",
    "performance_grade": "B+"
  },
  "benchmarks": {
    "industry_open_rate": "21%",
    "org_avg_open_rate": "38%",
    "comparison": "+4% vs org average"
  },
  "insights": [
    { "finding": "Specific insight", "impact": "high", "actionable": true }
  ],
  "top_performers": [
    { "element": "Subject line", "value": "...", "metric": "52% open rate" }
  ],
  "recommendations": [
    { "action": "What to do", "expected_improvement": "+10%" }
  ]
}`,

  get_patterns: `Retrieve learned patterns from past email performance.

Return JSON:
{
  "positive_patterns": [
    {
      "pattern": "Subject lines with emojis",
      "impact": "+23% open rate",
      "sample_size": 150,
      "confidence": 0.85,
      "examples": ["🎉 Your results are in!", "📈 Traffic update"]
    }
  ],
  "negative_patterns": [
    {
      "pattern": "All caps subjects",
      "impact": "-35% open rate",
      "sample_size": 45,
      "confidence": 0.92,
      "avoid": true
    }
  ],
  "optimal_send_times": [
    { "day": "Tuesday", "time": "10:00 AM", "open_rate": "48%" }
  ],
  "cta_performance": [
    { "text": "See Your Results", "ctr": "12%", "uses": 25 }
  ]
}`,

  generate_blocks: `Generate GrapesJS-compatible email blocks for the visual editor.

Return array of blocks:
[
  {
    "id": "unique-block-id",
    "label": "Block Label",
    "category": "Layout|Content|Social|Commerce",
    "content": "HTML with inline styles, table-based layout",
    "attributes": { "class": "gjs-block-..." },
    "media": "<svg>icon</svg>",
    "description": "What this block is for"
  }
]`,

  suggest_send_time: `Recommend optimal send time based on recipient data.

Return JSON:
{
  "recommended_time": {
    "datetime": "2025-01-15T10:00:00-05:00",
    "day": "Tuesday",
    "time": "10:00 AM EST",
    "reasoning": "Based on past engagement, Tuesdays at 10am have 23% higher open rates"
  },
  "alternatives": [
    { "datetime": "...", "day": "Wednesday", "time": "2:00 PM", "predicted_open_rate": "40%" }
  ],
  "avoid": [
    { "period": "Monday mornings", "reason": "Inbox competition" }
  ],
  "recipient_timezone_distribution": {
    "EST": 65,
    "CST": 20,
    "PST": 15
  }
}`
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL BLOCK TEMPLATES (for GrapesJS integration)
// ═══════════════════════════════════════════════════════════════════════════════

const EMAIL_BLOCK_TEMPLATES = {
  header: `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #3b82f6;">
    <tr>
      <td style="padding: 20px; text-align: center;">
        <img src="{{logo_url}}" alt="{{company_name}}" style="max-width: 150px; height: auto;" />
      </td>
    </tr>
  </table>`,
  
  hero: `<table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="padding: 40px 20px; text-align: center; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);">
        <h1 style="margin: 0 0 16px 0; font-family: Arial, sans-serif; font-size: 32px; font-weight: bold; color: #ffffff;">
          {{headline}}
        </h1>
        <p style="margin: 0 0 24px 0; font-family: Arial, sans-serif; font-size: 18px; color: #e0e7ff;">
          {{subheadline}}
        </p>
        <a href="{{cta_url}}" style="display: inline-block; padding: 14px 32px; background-color: #ffffff; color: #3b82f6; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 6px;">
          {{cta_text}}
        </a>
      </td>
    </tr>
  </table>`,
  
  text_section: `<table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="padding: 20px 40px; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333;">
        <p style="margin: 0 0 16px 0;">{{content}}</p>
      </td>
    </tr>
  </table>`,
  
  stats_row: `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc;">
    <tr>
      <td style="padding: 30px 20px; text-align: center;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="33%" style="text-align: center; padding: 10px;">
              <div style="font-family: Arial, sans-serif; font-size: 32px; font-weight: bold; color: #3b82f6;">{{stat1_value}}</div>
              <div style="font-family: Arial, sans-serif; font-size: 14px; color: #64748b;">{{stat1_label}}</div>
            </td>
            <td width="33%" style="text-align: center; padding: 10px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
              <div style="font-family: Arial, sans-serif; font-size: 32px; font-weight: bold; color: #10b981;">{{stat2_value}}</div>
              <div style="font-family: Arial, sans-serif; font-size: 14px; color: #64748b;">{{stat2_label}}</div>
            </td>
            <td width="33%" style="text-align: center; padding: 10px;">
              <div style="font-family: Arial, sans-serif; font-size: 32px; font-weight: bold; color: #8b5cf6;">{{stat3_value}}</div>
              <div style="font-family: Arial, sans-serif; font-size: 14px; color: #64748b;">{{stat3_label}}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`,
  
  cta_button: `<table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="padding: 20px 40px; text-align: center;">
        <a href="{{cta_url}}" style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: #ffffff; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 6px;">
          {{cta_text}}
        </a>
      </td>
    </tr>
  </table>`,
  
  footer: `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #1e293b;">
    <tr>
      <td style="padding: 30px 20px; text-align: center; font-family: Arial, sans-serif; font-size: 12px; color: #94a3b8;">
        <p style="margin: 0 0 8px 0;">© {{year}} {{company_name}}. All rights reserved.</p>
        <p style="margin: 0 0 8px 0;">{{address}}</p>
        <p style="margin: 0;">
          <a href="{{unsubscribe_url}}" style="color: #94a3b8; text-decoration: underline;">Unsubscribe</a>
          &nbsp;|&nbsp;
          <a href="{{preferences_url}}" style="color: #94a3b8; text-decoration: underline;">Email Preferences</a>
        </p>
      </td>
    </tr>
  </table>`
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL SKILL CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class EmailSkill {
  constructor(supabase, orgId, options = {}) {
    this.supabase = supabase
    this.orgId = orgId
    this.userId = options.userId
    this.signal = new Signal(supabase, orgId, { 
      userId: options.userId
    })
    this.echo = createModuleEcho(supabase, orgId, 'email', { 
      userId: options.userId
    })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DATA LOADING
  // ─────────────────────────────────────────────────────────────────────────────

  async loadOrgContext() {
    const { data: org } = await this.supabase
      .from('organizations')
      .select('id, name, slug, branding, settings')
      .eq('id', this.orgId)
      .single()
    
    return org || { id: this.orgId, name: 'Uptrade Media' }
  }

  async loadRecentTemplates(limit = 10) {
    const { data: templates } = await this.supabase
      .from('email_templates')
      .select('id, name, category, subject, total_sends, avg_open_rate, avg_click_rate')
      .eq('org_id', this.orgId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(limit)
    
    return templates || []
  }

  async loadEmailPatterns(patternType = 'all') {
    let query = this.supabase
      .from('email_patterns')
      .select('*')
      .or(`org_id.eq.${this.orgId},org_id.is.null`) // Org-specific + global patterns
      .order('confidence', { ascending: false })
    
    if (patternType !== 'all') {
      query = query.eq('pattern_type', patternType)
    }
    
    const { data: patterns } = await query.limit(50)
    return patterns || []
  }

  async loadCampaignPerformance(days = 30) {
    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - days)
    
    const { data: campaigns } = await this.supabase
      .from('email_campaigns')
      .select('id, name, subject, sent_at, total_sent, opens, clicks, status')
      .eq('org_id', this.orgId)
      .gte('sent_at', sinceDate.toISOString())
      .order('sent_at', { ascending: false })
    
    return campaigns || []
  }

  async loadRecipientContext(contactId) {
    if (!contactId) return null
    
    const { data: contact } = await this.supabase
      .from('contacts')
      .select(`
        id, name, email, company, role,
        projects(id, name, status),
        invoices(id, status, total_amount_cents)
      `)
      .eq('id', contactId)
      .single()
    
    return contact
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: DRAFT EMAIL
  // ─────────────────────────────────────────────────────────────────────────────

  async draftEmail(purpose, context = {}) {
    const { recipientId, recipientEmail, recipientName, projectId, tone = 'friendly' } = context

    // Load relevant context
    const [org, recipient, patterns] = await Promise.all([
      this.loadOrgContext(),
      recipientId ? this.loadRecipientContext(recipientId) : null,
      this.loadEmailPatterns('subject')
    ])

    // Build context for AI
    const recipientContext = recipient 
      ? `Recipient: ${recipient.name} (${recipient.email}), Company: ${recipient.company || 'N/A'}, Active Projects: ${recipient.projects?.length || 0}`
      : recipientEmail 
        ? `Recipient: ${recipientName || 'Unknown'} (${recipientEmail})`
        : 'No specific recipient - creating template'

    const patternContext = patterns.length > 0
      ? `Top performing patterns:\n${patterns.slice(0, 5).map(p => `- ${p.pattern_key}: ${p.avg_impact_percent}% ${p.impact_metric}`).join('\n')}`
      : ''

    const result = await this.signal.invoke({
      module: 'email',
      tool: 'draft_email',
      systemPrompt: EMAIL_SYSTEM_PROMPT,
      userPrompt: `Draft an email for the following purpose:

PURPOSE: ${purpose}

CONTEXT:
- Organization: ${org.name}
- ${recipientContext}
- Tone: ${tone}
${projectId ? `- Related to project ID: ${projectId}` : ''}

${patternContext}

${TOOL_PROMPTS.draft_email}`,
      responseFormat: { type: 'json_object' }
    })

    await this.echo.log({
      action: 'draft_email',
      input: { purpose, tone, recipientId },
      output: { subject: result.subject }
    })

    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: CREATE TEMPLATE
  // ─────────────────────────────────────────────────────────────────────────────

  async createTemplate(templatePurpose, options = {}) {
    const { category = 'general', includeBlocks = true } = options

    const org = await this.loadOrgContext()
    
    // Get block templates for reference
    const blockContext = includeBlocks 
      ? `Available block templates for GrapesJS:\n${Object.keys(EMAIL_BLOCK_TEMPLATES).join(', ')}`
      : ''

    const result = await this.signal.invoke({
      module: 'email',
      tool: 'create_template',
      systemPrompt: EMAIL_SYSTEM_PROMPT,
      userPrompt: `Create an email template for:

PURPOSE: ${templatePurpose}
CATEGORY: ${category}
ORGANIZATION: ${org.name}

${blockContext}

Requirements:
- Use table-based layout for email client compatibility
- Include inline CSS (no external stylesheets)
- Make it responsive (max-width: 600px)
- Include standard merge fields
- Structure HTML for GrapesJS block extraction

${TOOL_PROMPTS.create_template}`,
      responseFormat: { type: 'json_object' }
    })

    await this.echo.log({
      action: 'create_template',
      input: { templatePurpose, category },
      output: { name: result.name, blockCount: result.blocks?.length }
    })

    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: OPTIMIZE TEMPLATE
  // ─────────────────────────────────────────────────────────────────────────────

  async optimizeTemplate(templateId, options = {}) {
    const { focusArea = 'all' } = options

    // Load template and performance data
    const [{ data: template }, patterns, recentCampaigns] = await Promise.all([
      this.supabase
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .single(),
      this.loadEmailPatterns(),
      this.loadCampaignPerformance(90)
    ])

    if (!template) {
      throw new Error('Template not found')
    }

    // Calculate template-specific metrics
    const templateCampaigns = recentCampaigns.filter(c => c.template_id === templateId)
    const avgOpenRate = templateCampaigns.length > 0
      ? templateCampaigns.reduce((sum, c) => sum + (c.opens / c.total_sent), 0) / templateCampaigns.length
      : null
    const avgClickRate = templateCampaigns.length > 0
      ? templateCampaigns.reduce((sum, c) => sum + (c.clicks / c.total_sent), 0) / templateCampaigns.length
      : null

    const performanceContext = avgOpenRate !== null
      ? `Current performance:\n- Open rate: ${(avgOpenRate * 100).toFixed(1)}%\n- Click rate: ${(avgClickRate * 100).toFixed(1)}%\n- Sends: ${templateCampaigns.reduce((s, c) => s + c.total_sent, 0)}`
      : 'No performance data yet - optimizing based on best practices'

    const patternContext = patterns.length > 0
      ? `Learned patterns:\n${patterns.slice(0, 10).map(p => 
          `- ${p.positive_pattern ? '✓' : '✗'} ${p.pattern_key}: ${p.avg_impact_percent > 0 ? '+' : ''}${p.avg_impact_percent}% ${p.impact_metric}`
        ).join('\n')}`
      : ''

    const result = await this.signal.invoke({
      module: 'email',
      tool: 'optimize_template',
      systemPrompt: EMAIL_SYSTEM_PROMPT,
      userPrompt: `Optimize this email template:

TEMPLATE: ${template.name}
CATEGORY: ${template.category}
SUBJECT: ${template.subject}
PREVIEW: ${template.preview_text || 'Not set'}

CURRENT HTML:
${template.body_html || template.html || 'No HTML body'}

${performanceContext}

${patternContext}

FOCUS AREA: ${focusArea}

${TOOL_PROMPTS.optimize_template}`,
      responseFormat: { type: 'json_object' }
    })

    await this.echo.log({
      action: 'optimize_template',
      input: { templateId, focusArea },
      output: { 
        currentScore: result.current_score,
        improvementsCount: result.improvements?.length 
      }
    })

    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: SUGGEST SUBJECT LINES
  // ─────────────────────────────────────────────────────────────────────────────

  async suggestSubjectLines(emailContent, options = {}) {
    const { currentSubject, numberOfVariants = 5, purpose = 'general' } = options

    const [patterns, recentCampaigns] = await Promise.all([
      this.loadEmailPatterns('subject'),
      this.loadCampaignPerformance(60)
    ])

    // Find top performing subject lines
    const topSubjects = recentCampaigns
      .filter(c => c.total_sent > 50)
      .sort((a, b) => (b.opens / b.total_sent) - (a.opens / a.total_sent))
      .slice(0, 5)
      .map(c => ({ subject: c.subject, openRate: ((c.opens / c.total_sent) * 100).toFixed(1) + '%' }))

    const result = await this.signal.invoke({
      module: 'email',
      tool: 'suggest_subject_lines',
      systemPrompt: EMAIL_SYSTEM_PROMPT,
      userPrompt: `Generate ${numberOfVariants} subject line variants for A/B testing.

${currentSubject ? `CURRENT SUBJECT (Control): ${currentSubject}` : ''}

EMAIL PURPOSE: ${purpose}

EMAIL CONTENT SUMMARY:
${typeof emailContent === 'string' ? emailContent.substring(0, 500) : JSON.stringify(emailContent).substring(0, 500)}

TOP PERFORMING SUBJECTS FROM RECENT CAMPAIGNS:
${topSubjects.map(s => `- "${s.subject}" (${s.openRate} open rate)`).join('\n') || 'No data yet'}

LEARNED PATTERNS:
${patterns.slice(0, 5).map(p => `- ${p.pattern_key}: ${p.avg_impact_percent > 0 ? '+' : ''}${p.avg_impact_percent}% impact`).join('\n') || 'No patterns yet'}

${TOOL_PROMPTS.suggest_subject_lines}`,
      responseFormat: { type: 'json_object' }
    })

    await this.echo.log({
      action: 'suggest_subject_lines',
      input: { currentSubject, numberOfVariants },
      output: { variantsGenerated: result.variants?.length }
    })

    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: ANALYZE PERFORMANCE
  // ─────────────────────────────────────────────────────────────────────────────

  async analyzePerformance(options = {}) {
    const { days = 30, campaignId = null, templateId = null } = options

    const campaigns = await this.loadCampaignPerformance(days)
    
    let filteredCampaigns = campaigns
    if (campaignId) {
      filteredCampaigns = campaigns.filter(c => c.id === campaignId)
    } else if (templateId) {
      filteredCampaigns = campaigns.filter(c => c.template_id === templateId)
    }

    if (filteredCampaigns.length === 0) {
      return {
        summary: { total_sent: 0, open_rate: '0%', click_rate: '0%', performance_grade: 'N/A' },
        benchmarks: { industry_open_rate: '21%', org_avg_open_rate: 'N/A' },
        insights: [{ finding: 'No campaign data for this period', impact: 'low', actionable: false }],
        recommendations: [{ action: 'Send your first campaign to start gathering data', expected_improvement: 'Baseline establishment' }]
      }
    }

    // Calculate metrics
    const totalSent = filteredCampaigns.reduce((s, c) => s + (c.total_sent || 0), 0)
    const totalOpens = filteredCampaigns.reduce((s, c) => s + (c.opens || 0), 0)
    const totalClicks = filteredCampaigns.reduce((s, c) => s + (c.clicks || 0), 0)

    const metricsContext = `
Campaign Data (last ${days} days):
- Total campaigns: ${filteredCampaigns.length}
- Total sent: ${totalSent}
- Total opens: ${totalOpens} (${((totalOpens / totalSent) * 100).toFixed(1)}%)
- Total clicks: ${totalClicks} (${((totalClicks / totalSent) * 100).toFixed(1)}%)

Individual campaigns:
${filteredCampaigns.map(c => 
  `- "${c.subject}": ${c.total_sent} sent, ${((c.opens / c.total_sent) * 100).toFixed(1)}% open, ${((c.clicks / c.total_sent) * 100).toFixed(1)}% click`
).join('\n')}`

    const result = await this.signal.invoke({
      module: 'email',
      tool: 'analyze_performance',
      systemPrompt: EMAIL_SYSTEM_PROMPT,
      userPrompt: `Analyze email performance and provide insights.

${metricsContext}

Industry benchmarks:
- Average email open rate: 21%
- Average click rate: 2.5%

${TOOL_PROMPTS.analyze_performance}`,
      responseFormat: { type: 'json_object' }
    })

    await this.echo.log({
      action: 'analyze_performance',
      input: { days, campaignId, templateId },
      output: { grade: result.summary?.performance_grade }
    })

    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: GET PATTERNS
  // ─────────────────────────────────────────────────────────────────────────────

  async getPatterns(patternType = 'all') {
    const patterns = await this.loadEmailPatterns(patternType)
    
    if (patterns.length === 0) {
      // Generate initial patterns from campaign data
      const campaigns = await this.loadCampaignPerformance(90)
      
      if (campaigns.length < 10) {
        return {
          positive_patterns: [],
          negative_patterns: [],
          optimal_send_times: [{ day: 'Tuesday', time: '10:00 AM', open_rate: 'Industry average' }],
          cta_performance: [],
          message: 'Not enough data to generate patterns. Keep sending campaigns to build your pattern library.'
        }
      }

      // Let AI analyze and extract patterns
      const result = await this.signal.invoke({
        module: 'email',
        tool: 'get_patterns',
        systemPrompt: EMAIL_SYSTEM_PROMPT,
        userPrompt: `Extract email patterns from this campaign data:

${campaigns.map(c => 
  `Subject: "${c.subject}" | Sent: ${c.sent_at} | Opens: ${((c.opens / c.total_sent) * 100).toFixed(1)}% | Clicks: ${((c.clicks / c.total_sent) * 100).toFixed(1)}%`
).join('\n')}

${TOOL_PROMPTS.get_patterns}`,
        responseFormat: { type: 'json_object' }
      })

      return result
    }

    // Format existing patterns
    const positivePatterns = patterns.filter(p => p.positive_pattern)
    const negativePatterns = patterns.filter(p => p.negative_pattern)

    return {
      positive_patterns: positivePatterns.map(p => ({
        pattern: p.pattern_key,
        impact: `${p.avg_impact_percent > 0 ? '+' : ''}${p.avg_impact_percent}% ${p.impact_metric}`,
        sample_size: p.sample_size,
        confidence: p.confidence,
        examples: p.examples || []
      })),
      negative_patterns: negativePatterns.map(p => ({
        pattern: p.pattern_key,
        impact: `${p.avg_impact_percent}% ${p.impact_metric}`,
        sample_size: p.sample_size,
        confidence: p.confidence,
        avoid: true
      })),
      optimal_send_times: [], // Would need time-based analysis
      cta_performance: [] // Would need CTA-specific tracking
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: GENERATE GRAPESJS BLOCKS
  // ─────────────────────────────────────────────────────────────────────────────

  async generateBlocks(purpose, options = {}) {
    const { blockTypes = ['header', 'content', 'cta', 'footer'], style = 'modern' } = options

    const result = await this.signal.invoke({
      module: 'email',
      tool: 'generate_blocks',
      systemPrompt: EMAIL_SYSTEM_PROMPT,
      userPrompt: `Generate email blocks for GrapesJS visual editor.

PURPOSE: ${purpose}
BLOCK TYPES NEEDED: ${blockTypes.join(', ')}
STYLE: ${style}

Requirements:
- Use table-based layout (email client compatibility)
- Inline CSS only
- Include data-gjs-type attributes for GrapesJS
- Use merge field placeholders: {{first_name}}, {{company}}, etc.
- Each block should be self-contained and draggable

Reference block templates:
${Object.entries(EMAIL_BLOCK_TEMPLATES).map(([name, html]) => 
  `${name}:\n${html.substring(0, 200)}...`
).join('\n\n')}

${TOOL_PROMPTS.generate_blocks}`,
      responseFormat: { type: 'json_object' }
    })

    await this.echo.log({
      action: 'generate_blocks',
      input: { purpose, blockTypes },
      output: { blocksGenerated: result.length }
    })

    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: SUGGEST SEND TIME
  // ─────────────────────────────────────────────────────────────────────────────

  async suggestSendTime(options = {}) {
    const { recipientId, audience = 'general' } = options

    const campaigns = await this.loadCampaignPerformance(90)
    
    // Analyze send time performance
    const timePerformance = {}
    campaigns.forEach(c => {
      if (!c.sent_at || !c.total_sent) return
      const date = new Date(c.sent_at)
      const day = date.toLocaleDateString('en-US', { weekday: 'long' })
      const hour = date.getHours()
      const key = `${day}-${hour}`
      
      if (!timePerformance[key]) {
        timePerformance[key] = { day, hour, totalSent: 0, totalOpens: 0 }
      }
      timePerformance[key].totalSent += c.total_sent
      timePerformance[key].totalOpens += c.opens || 0
    })

    const timeData = Object.values(timePerformance)
      .filter(t => t.totalSent > 20)
      .map(t => ({
        ...t,
        openRate: ((t.totalOpens / t.totalSent) * 100).toFixed(1) + '%'
      }))
      .sort((a, b) => (b.totalOpens / b.totalSent) - (a.totalOpens / a.totalSent))

    const result = await this.signal.invoke({
      module: 'email',
      tool: 'suggest_send_time',
      systemPrompt: EMAIL_SYSTEM_PROMPT,
      userPrompt: `Recommend optimal send time for this email.

AUDIENCE: ${audience}
${recipientId ? `RECIPIENT: Loading context...` : 'BULK SEND'}

HISTORICAL PERFORMANCE BY DAY/TIME:
${timeData.slice(0, 10).map(t => 
  `${t.day} ${t.hour}:00 - ${t.openRate} open rate (${t.totalSent} sends)`
).join('\n') || 'No time-based data available yet'}

${TOOL_PROMPTS.suggest_send_time}`,
      responseFormat: { type: 'json_object' }
    })

    await this.echo.log({
      action: 'suggest_send_time',
      input: { audience, hasRecipient: !!recipientId },
      output: { recommendedTime: result.recommended_time?.time }
    })

    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CONVENIENCE: QUICK DRAFT FOR ECHO
  // ─────────────────────────────────────────────────────────────────────────────

  async quickDraftForEcho(message, context = {}) {
    // Parse Echo message to understand intent
    const draft = await this.draftEmail(message, {
      ...context,
      tone: context.tone || 'friendly'
    })

    // Format for Echo response
    return {
      type: 'email_draft',
      content: draft,
      actions: [
        { label: 'Edit Draft', action: 'edit' },
        { label: 'Add Image', action: 'add_image' },
        { label: 'Preview', action: 'preview' },
        { label: 'Schedule Send', action: 'schedule' }
      ],
      metadata: {
        estimatedReadTime: draft.estimated_read_time,
        mergeFields: draft.merge_fields
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CONVENIENCE: FULL TEMPLATE CREATION FLOW
  // ─────────────────────────────────────────────────────────────────────────────

  async createFullTemplate(name, purpose, options = {}) {
    // 1. Generate template content
    const template = await this.createTemplate(purpose, options)
    
    // 2. Generate subject line variants
    const subjectVariants = await this.suggestSubjectLines(template.html, {
      currentSubject: template.subject,
      numberOfVariants: 3,
      purpose
    })
    
    // 3. Suggest optimal send time
    const sendTime = await this.suggestSendTime({ audience: options.audience || 'general' })
    
    return {
      template: {
        ...template,
        name: name || template.name
      },
      subjectVariants: subjectVariants.variants,
      recommendedSendTime: sendTime.recommended_time,
      readyForSave: true
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPER: GET BLOCK TEMPLATES
  // Returns predefined block templates for GrapesJS initialization
  // ─────────────────────────────────────────────────────────────────────────────

  getBlockTemplates() {
    return EMAIL_BLOCK_TEMPLATES
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPER: RECORD PATTERN
  // Called when email performance data is available
  // ─────────────────────────────────────────────────────────────────────────────

  async recordPattern(patternData) {
    const { patternType, patternKey, isPositive, impact, metric, sampleSize, examples } = patternData

    const existingPattern = await this.supabase
      .from('email_patterns')
      .select('id, sample_size, avg_impact_percent')
      .eq('org_id', this.orgId)
      .eq('pattern_key', patternKey)
      .single()

    if (existingPattern.data) {
      // Update existing pattern with new data
      const newSampleSize = existingPattern.data.sample_size + sampleSize
      const newImpact = (
        (existingPattern.data.avg_impact_percent * existingPattern.data.sample_size) +
        (impact * sampleSize)
      ) / newSampleSize

      await this.supabase
        .from('email_patterns')
        .update({
          sample_size: newSampleSize,
          avg_impact_percent: newImpact,
          confidence: Math.min(0.95, 0.5 + (newSampleSize / 200)),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPattern.data.id)
    } else {
      // Create new pattern
      await this.supabase
        .from('email_patterns')
        .insert({
          org_id: this.orgId,
          pattern_type: patternType,
          pattern_key: patternKey,
          positive_pattern: isPositive ? { effect: `${impact}%` } : null,
          negative_pattern: !isPositive ? { effect: `${impact}%` } : null,
          sample_size: sampleSize,
          avg_impact_percent: impact,
          impact_metric: metric,
          confidence: Math.min(0.95, 0.5 + (sampleSize / 200)),
          examples: examples || []
        })
    }

    await this.echo.log({
      action: 'record_pattern',
      input: { patternType, patternKey, isPositive },
      output: { impact, sampleSize }
    })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default EmailSkill
