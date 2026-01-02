// DEPRECATED: This skill wrapper is no longer used.
/**
 * Signal Support Skill
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * The Support skill provides AI-powered customer support and chat assistance.
 * Handles knowledge base queries, ticket routing, and conversational support.
 * 
 * Available Tools:
 * - answer_question: Answer using knowledge base
 * - route_ticket: Determine best routing for support request
 * - draft_reply: Generate support reply
 * - summarize_thread: Summarize a conversation thread
 * - detect_sentiment: Analyze customer sentiment
 * - escalate_check: Determine if escalation is needed
 * 
 * Usage:
 *   import { SupportSkill } from './skills/support-skill.js'
 *   const support = new SupportSkill(supabase, orgId, { userId })
 *   const answer = await support.answerQuestion(question, context)
 */

import { Signal, createModuleEcho } from '../utils/signal.js'

// ═══════════════════════════════════════════════════════════════════════════════
// SUPPORT SKILL PROMPTS
// ═══════════════════════════════════════════════════════════════════════════════

const SUPPORT_SYSTEM_PROMPT = `You are Signal Support, an expert customer support AI assistant.

Your role is to:
- Answer questions accurately using the knowledge base
- Maintain a helpful, friendly, and professional tone
- Escalate to humans when appropriate
- Provide clear, actionable responses
- Track sentiment and satisfaction

IMPORTANT GUIDELINES:
1. Never make up information - use only the provided context
2. If uncertain, say so and offer to connect with a human
3. Keep responses concise but complete
4. Use the customer's name when available
5. End with a clear next step or offer to help further

BRAND VOICE:
- Professional yet warm
- Solution-oriented
- Empathetic without being scripted
- Confident but not dismissive

ESCALATION TRIGGERS:
- Billing disputes or refund requests over $500
- Legal or compliance questions
- Threats or abusive language
- Technical issues beyond knowledge base
- Requests to speak with a human
- High frustration sentiment`

const TOOL_PROMPTS = {
  answer_question: `Answer the customer's question using the provided knowledge base context.
If the answer is in the context, provide a clear, helpful response.
If the answer is not in the context, acknowledge this and offer alternatives.
Never fabricate information.

Output JSON with:
- answer: The response text
- confidence: low/medium/high
- sources: Array of source IDs used
- suggested_followups: Related questions they might ask
- needs_human: Boolean if human should take over`,

  route_ticket: `Determine the best routing for this support request.
Analyze the content and customer context to decide:
- Priority level (urgent/high/medium/low)
- Department (billing/technical/sales/general)
- Agent skills needed
- Estimated complexity

Output JSON with:
- priority
- department
- required_skills[]
- complexity (simple/moderate/complex)
- routing_reason
- suggested_response_time`,

  draft_reply: `Generate a professional support reply.
Use the context to craft a personalized response.
Address their specific concerns.
Include next steps or resolution.

Return the reply text ready to send.`,

  summarize_thread: `Summarize this support conversation thread.
Capture:
- Main issue or request
- Key points discussed
- Current status
- Pending actions
- Customer sentiment

Output JSON with:
- summary (2-3 sentences)
- issue_type
- status (open/pending/resolved)
- action_items[]
- sentiment (positive/neutral/negative)`,

  detect_sentiment: `Analyze the customer's message for sentiment.
Consider:
- Overall tone
- Frustration indicators
- Satisfaction signals
- Urgency level

Output JSON with:
- sentiment (positive/neutral/negative)
- frustration_level (0-10)
- urgency (low/medium/high)
- key_emotions[]
- escalation_recommended (boolean)
- confidence`,

  escalate_check: `Determine if this conversation should be escalated to a human.
Check for:
- Escalation triggers (billing, legal, threats)
- Complexity beyond AI capability
- Customer explicitly requesting human
- High frustration levels
- Sensitive topics

Output JSON with:
- should_escalate (boolean)
- reason
- priority (normal/urgent/critical)
- suggested_department
- context_for_agent`
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUPPORT SKILL CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class SupportSkill {
  constructor(supabase, orgId, options = {}) {
    this.supabase = supabase
    this.orgId = orgId
    this.userId = options.userId
    this.signal = new Signal(supabase, orgId, { 
      userId: options.userId
    })
    this.echo = createModuleEcho(supabase, orgId, 'support', { 
      userId: options.userId
    })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DATA LOADING
  // ─────────────────────────────────────────────────────────────────────────────

  async loadKnowledgeBase(query) {
    // Search knowledge base for relevant articles
    // Using basic text search - could be enhanced with embeddings
    const { data: articles } = await this.supabase
      .from('knowledge_base')
      .select('id, title, content, category, keywords')
      .eq('org_id', this.orgId)
      .eq('status', 'published')
      .textSearch('search_vector', query.split(' ').join(' | '))
      .limit(5)
    
    return articles || []
  }

  async loadContactContext(contactId) {
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

  async loadThreadHistory(threadId, limit = 10) {
    const { data: messages } = await this.supabase
      .from('messages')
      .select('id, sender_type, content, created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .limit(limit)
    
    return messages || []
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: ANSWER QUESTION
  // ─────────────────────────────────────────────────────────────────────────────

  async answerQuestion(question, context = {}) {
    const { contactId, threadId, additionalContext } = context

    // Load relevant data
    const [kbArticles, contact, threadHistory] = await Promise.all([
      this.loadKnowledgeBase(question),
      contactId ? this.loadContactContext(contactId) : null,
      threadId ? this.loadThreadHistory(threadId) : []
    ])

    const result = await this.signal.invoke({
      module: 'support',
      tool: 'answer_question',
      systemPrompt: SUPPORT_SYSTEM_PROMPT,
      userPrompt: `Answer this customer question:

QUESTION: "${question}"

${contact ? `CUSTOMER:
- Name: ${contact.name}
- Company: ${contact.company}
- Active Projects: ${contact.projects?.length || 0}
- Open Invoices: ${contact.invoices?.filter(i => i.status === 'pending').length || 0}` : ''}

${threadHistory.length > 0 ? `CONVERSATION HISTORY:
${threadHistory.map(m => `[${m.sender_type}]: ${m.content}`).slice(-5).join('\n')}` : ''}

${kbArticles.length > 0 ? `KNOWLEDGE BASE CONTEXT:
${kbArticles.map(a => `--- ${a.title} ---\n${a.content}\n`).join('\n')}` : 'No relevant knowledge base articles found.'}

${additionalContext ? `ADDITIONAL CONTEXT: ${additionalContext}` : ''}

${TOOL_PROMPTS.answer_question}`,
      responseFormat: { type: 'json_object' }
    })

    await this.echo.log({
      action: 'answer_question',
      input: { question, contactId, threadId },
      output: result
    })

    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: ROUTE TICKET
  // ─────────────────────────────────────────────────────────────────────────────

  async routeTicket(ticket) {
    const { subject, content, contactId, category } = ticket

    const contact = contactId ? await this.loadContactContext(contactId) : null

    const result = await this.signal.invoke({
      module: 'support',
      tool: 'route_ticket',
      systemPrompt: SUPPORT_SYSTEM_PROMPT,
      userPrompt: `Route this support ticket:

SUBJECT: ${subject}
CONTENT: ${content}
${category ? `CATEGORY: ${category}` : ''}

${contact ? `CUSTOMER:
- Name: ${contact.name}
- Company: ${contact.company}
- Projects: ${contact.projects?.map(p => p.name).join(', ') || 'None'}
- Outstanding Invoices: $${contact.invoices?.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.total_amount_cents, 0) / 100 || 0}` : ''}

${TOOL_PROMPTS.route_ticket}`,
      responseFormat: { type: 'json_object' }
    })

    await this.echo.log({
      action: 'route_ticket',
      input: { subject, contactId },
      output: result
    })

    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: DRAFT REPLY
  // ─────────────────────────────────────────────────────────────────────────────

  async draftReply(context) {
    const { threadId, customerMessage, contactId, ticketType, resolution } = context

    const [contact, threadHistory] = await Promise.all([
      contactId ? this.loadContactContext(contactId) : null,
      threadId ? this.loadThreadHistory(threadId) : []
    ])

    const result = await this.signal.invoke({
      module: 'support',
      tool: 'draft_reply',
      systemPrompt: SUPPORT_SYSTEM_PROMPT,
      userPrompt: `Draft a support reply:

CUSTOMER MESSAGE: "${customerMessage}"

${contact ? `CUSTOMER NAME: ${contact.name}` : ''}
${ticketType ? `TICKET TYPE: ${ticketType}` : ''}
${resolution ? `RESOLUTION TO COMMUNICATE: ${resolution}` : ''}

${threadHistory.length > 0 ? `PREVIOUS CONVERSATION:
${threadHistory.map(m => `[${m.sender_type}]: ${m.content}`).slice(-5).join('\n')}` : ''}

${TOOL_PROMPTS.draft_reply}`
    })

    await this.echo.log({
      action: 'draft_reply',
      input: { threadId, contactId, ticketType },
      output: { replyLength: result?.length }
    })

    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: SUMMARIZE THREAD
  // ─────────────────────────────────────────────────────────────────────────────

  async summarizeThread(threadId) {
    const messages = await this.loadThreadHistory(threadId, 50)

    if (messages.length === 0) {
      return { summary: 'No messages in thread', status: 'empty' }
    }

    const result = await this.signal.invoke({
      module: 'support',
      tool: 'summarize_thread',
      systemPrompt: SUPPORT_SYSTEM_PROMPT,
      userPrompt: `Summarize this support conversation:

${messages.map(m => `[${m.sender_type}] (${new Date(m.created_at).toLocaleString()}): ${m.content}`).join('\n\n')}

${TOOL_PROMPTS.summarize_thread}`,
      responseFormat: { type: 'json_object' }
    })

    await this.echo.log({
      action: 'summarize_thread',
      input: { threadId, messageCount: messages.length },
      output: result
    })

    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: DETECT SENTIMENT
  // ─────────────────────────────────────────────────────────────────────────────

  async detectSentiment(message, context = {}) {
    const { previousMessages, contactId } = context

    const result = await this.signal.invoke({
      module: 'support',
      tool: 'detect_sentiment',
      systemPrompt: SUPPORT_SYSTEM_PROMPT,
      userPrompt: `Analyze sentiment in this customer message:

MESSAGE: "${message}"

${previousMessages?.length > 0 ? `PREVIOUS MESSAGES:
${previousMessages.slice(-3).map(m => `- ${m}`).join('\n')}` : ''}

${TOOL_PROMPTS.detect_sentiment}`,
      responseFormat: { type: 'json_object' }
    })

    await this.echo.log({
      action: 'detect_sentiment',
      input: { messageLength: message.length, contactId },
      output: result
    })

    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: ESCALATE CHECK
  // ─────────────────────────────────────────────────────────────────────────────

  async escalateCheck(context) {
    const { message, threadId, contactId, sentiment } = context

    const [contact, threadHistory] = await Promise.all([
      contactId ? this.loadContactContext(contactId) : null,
      threadId ? this.loadThreadHistory(threadId, 5) : []
    ])

    const result = await this.signal.invoke({
      module: 'support',
      tool: 'escalate_check',
      systemPrompt: SUPPORT_SYSTEM_PROMPT,
      userPrompt: `Determine if this conversation should be escalated:

CURRENT MESSAGE: "${message}"

${sentiment ? `DETECTED SENTIMENT:
- Sentiment: ${sentiment.sentiment}
- Frustration: ${sentiment.frustration_level}/10
- Urgency: ${sentiment.urgency}` : ''}

${contact ? `CUSTOMER:
- Name: ${contact.name}
- Company: ${contact.company}
- Total Invoices: $${contact.invoices?.reduce((sum, i) => sum + i.total_amount_cents, 0) / 100 || 0}` : ''}

${threadHistory.length > 0 ? `RECENT MESSAGES:
${threadHistory.map(m => `[${m.sender_type}]: ${m.content}`).join('\n')}` : ''}

ESCALATION TRIGGERS:
- Billing disputes or refund requests over $500
- Legal or compliance questions
- Threats or abusive language
- Technical issues beyond knowledge base
- Requests to speak with a human
- High frustration (8+/10)

${TOOL_PROMPTS.escalate_check}`,
      responseFormat: { type: 'json_object' }
    })

    await this.echo.log({
      action: 'escalate_check',
      input: { threadId, contactId, sentiment: sentiment?.sentiment },
      output: result
    })

    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CONVENIENCE: FULL MESSAGE PROCESSING
  // ─────────────────────────────────────────────────────────────────────────────

  async processMessage(message, context = {}) {
    const { contactId, threadId } = context

    // 1. Detect sentiment
    const sentiment = await this.detectSentiment(message, context)

    // 2. Check if escalation needed
    const escalation = await this.escalateCheck({
      message,
      threadId,
      contactId,
      sentiment
    })

    // 3. If not escalating, generate answer
    let answer = null
    if (!escalation.should_escalate) {
      answer = await this.answerQuestion(message, {
        contactId,
        threadId
      })
    }

    return {
      sentiment,
      escalation,
      answer,
      shouldEscalate: escalation.should_escalate,
      response: escalation.should_escalate 
        ? null 
        : answer?.answer
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: GENERATE PERSONALIZED AUDIT EMAIL MESSAGE
  // ─────────────────────────────────────────────────────────────────────────────

  async generateAuditEmailMessage(recipientName, audit) {
    const firstName = recipientName?.split(' ')[0] || 'there'
    
    // Helper to calculate grade
    const getGrade = (score) => {
      if (score >= 90) return 'A'
      if (score >= 80) return 'B'
      if (score >= 70) return 'C'
      if (score >= 60) return 'D'
      return 'F'
    }
    
    const grade = audit.summary?.grade || audit.summary?.metrics?.grade || 
                  getGrade(audit.score_overall || 0)
    
    const lowestScore = Math.min(
      audit.performance_score || 100,
      audit.seo_score || 100,
      audit.accessibility_score || 100,
      audit.score_security || 100
    )
    
    // Determine focus area
    let focusArea = 'maintaining their great scores'
    if (audit.performance_score < 50) focusArea = 'performance'
    else if (audit.seo_score < 50) focusArea = 'SEO'
    else if (audit.accessibility_score < 50) focusArea = 'accessibility'
    
    const result = await this.signal.invoke({
      module: 'support',
      tool: 'generate_audit_email',
      systemPrompt: `You are writing a personalized email message for Uptrade Media, a Cincinnati-based digital agency. 
The tone should be professional yet warm and approachable - never salesy or pushy.
Keep it concise (2-3 sentences max).
Reference specific findings from their audit naturally.
Be encouraging but honest about areas needing improvement.
Never use generic phrases like "I hope this finds you well."
Do NOT include any sign-off like "Best," or "[Your Name]" - just write the message content.
Do NOT wrap the message in quotes.`,
      userPrompt: `Write a brief personalized message for ${firstName} whose website ${audit.target_url} just received a grade of ${grade}.

Key metrics:
- Performance: ${audit.performance_score || 0}/100
- SEO: ${audit.seo_score || 0}/100
- Accessibility: ${audit.accessibility_score || 0}/100
- Security: ${audit.score_security || 0}/100

Focus on ${focusArea}.
Express genuine interest in helping them improve.`
    })

    await this.echo.log({
      action: 'generate_audit_email',
      input: { recipientName: firstName, targetUrl: audit.target_url, grade },
      output: { messageLength: result?.length }
    })

    // Return the result as a string, or a fallback if something went wrong
    if (typeof result === 'string' && result.length > 0) {
      return result.trim()
    }
    
    // Fallback message
    if (grade === 'A') {
      return `Great news, ${firstName}! Your website is performing exceptionally well. We've identified a few opportunities to make it even better.`
    } else if (lowestScore < 50) {
      return `Hi ${firstName}, we've completed your audit and found some important areas where your website could significantly improve. The good news? These are all fixable.`
    } else {
      return `Hi ${firstName}! Your website audit is ready. We've analyzed everything from performance to SEO, and have some actionable recommendations for you.`
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default SupportSkill
