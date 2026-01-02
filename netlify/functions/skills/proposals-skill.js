// DEPRECATED: This skill wrapper is no longer used.
/**
 * Signal Proposals Skill
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * The Proposals skill provides AI-powered proposal generation and refinement.
 * Uses MDX components for rich, conversion-optimized proposals.
 * 
 * Available Tools:
 * - draft_proposal: Generate a complete proposal from brief
 * - edit_section: Revise a specific section with instructions
 * - clarify_request: Ask clarifying questions about vague requests
 * - suggest_pricing: Generate pricing recommendations
 * - close_probability: Estimate likelihood of acceptance
 * - refine_with_chat: Iterative refinement via conversation
 * 
 * Usage:
 *   import { ProposalsSkill } from './skills/proposals-skill.js'
 *   const proposals = new ProposalsSkill(supabase, orgId, { userId })
 *   const draft = await proposals.draftProposal(brief)
 */

import { Signal, createModuleEcho } from '../utils/signal.js'
import {
  PROPOSAL_STYLE,
  PROPOSAL_COMPONENTS,
  PROPOSAL_COMPONENT_NAMES,
  PROPOSAL_OUTPUT_SCHEMA
} from '../utils/proposal-blocks.js'

// ═══════════════════════════════════════════════════════════════════════════════
// PROPOSALS SKILL PROMPTS
// ═══════════════════════════════════════════════════════════════════════════════

const PROPOSALS_SYSTEM_PROMPT = `${PROPOSAL_STYLE}

You are Signal Proposals, an expert sales copywriter and proposal specialist.

Your role is to help create ultra-high-converting proposals that close deals fast using MDX components.

When creating proposals:
1. Always use the MDX components listed above - never plain markdown
2. Lead with transformation, not features
3. Include specific numbers and metrics when possible
4. Create urgency with deadlines and limited availability
5. Stack value before revealing price
6. Always include risk reversal / guarantee language
7. End with strong call-to-action

IMPORTANT: You learn from outcomes. Track which proposals convert and at what rate.
Winning patterns are reinforced. Adjust approach based on industry and client type.`

const TOOL_PROMPTS = {
  draft_proposal: `Generate a complete proposal using the MDX components and structure guidelines.
Create compelling, conversion-focused content with:
- ExecutiveSummary hook
- Problem/opportunity analysis
- Solution with ValueStack and ProcessSteps
- PricingSection with clear tiers
- Timeline with phases
- Urgency and guarantee elements
- Strong CTASection close

Output JSON matching PROPOSAL_OUTPUT_SCHEMA with full mdxContent.`,

  edit_section: `Revise the specified section of an existing proposal.
Maintain the same MDX components and style.
Apply the user's feedback to improve the section.
Return only the updated section content.`,

  clarify_request: `The proposal request is missing key information.
Generate 3-5 clarifying questions to gather what's needed:
- Budget range or constraints
- Timeline expectations
- Specific deliverables requested
- Decision maker details
- Competitive situation

Output JSON with: questions[], priority_info[], optional_info[].`,

  suggest_pricing: `Analyze the project scope and suggest pricing.
Consider:
- Scope of work and deliverables
- Industry standard rates
- Client budget signals
- Value delivered vs. cost
- Competitive positioning

Output JSON with: 
- recommended_price
- pricing_rationale
- value_stack (items with perceived values)
- alternative_tiers[]
- discount_triggers[]`,

  close_probability: `Estimate the probability this proposal will be accepted.
Analyze:
- Fit with client's expressed needs
- Budget alignment
- Timeline feasibility
- Competitive factors
- Relationship strength

Output JSON with:
- probability (0-100)
- confidence (low/medium/high)
- positive_factors[]
- risk_factors[]
- recommended_actions[]`,

  refine_with_chat: `Refine the existing proposal based on the user's feedback.
Apply requested changes while maintaining:
- MDX component structure
- Conversion optimization
- Brand voice consistency

Return updated sections or full proposal as requested.`
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROPOSALS SKILL CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class ProposalsSkill {
  constructor(supabase, orgId, options = {}) {
    this.supabase = supabase
    this.orgId = orgId
    this.userId = options.userId
    this.contactId = options.contactId
    this.signal = new Signal(supabase, orgId, { 
      userId: options.userId
    })
    this.echo = createModuleEcho(supabase, orgId, 'proposals', { 
      userId: options.userId
    })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DATA LOADING
  // ─────────────────────────────────────────────────────────────────────────────

  async loadContactData(contactId) {
    const { data: contact } = await this.supabase
      .from('contacts')
      .select(`
        id, name, email, company, role, industry, pipeline_stage,
        projects(id, name, status, budget_cents),
        proposals(id, title, status, total_amount_cents, created_at)
      `)
      .eq('id', contactId)
      .single()
    
    return contact
  }

  async loadProposalHistory(contactId) {
    const { data: proposals } = await this.supabase
      .from('proposals')
      .select('id, title, status, total_amount_cents, created_at, accepted_at')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    return proposals || []
  }

  async loadWinningPatterns() {
    // Load patterns from successful proposals for learning
    const { data: patterns } = await this.supabase
      .from('signal_patterns')
      .select('pattern, confidence, success_rate')
      .eq('module', 'proposals')
      .eq('org_id', this.orgId)
      .gte('success_rate', 0.6)
      .order('confidence', { ascending: false })
      .limit(20)
    
    return patterns || []
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: DRAFT PROPOSAL
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Draft a proposal from form data (used by proposals-create-ai-background)
   * This is the comprehensive method that handles all form fields
   */
  async draftProposalFromForm(formData) {
    const {
      contactId,
      proposalType,
      pricing,
      clientInfo,
      projectInfo,
      auditResults
    } = formData

    // Extract nested fields
    const clientName = clientInfo?.name || formData.clientName
    const clientCompany = clientInfo?.company || formData.clientCompany
    const projectType = proposalType || formData.projectType
    const budget = pricing?.totalPrice || pricing?.basePrice || formData.budget
    const timeline = projectInfo?.timeline || formData.timeline
    const goals = projectInfo?.goals || formData.goals
    const challenges = projectInfo?.challenges || formData.challenges
    const notes = projectInfo?.notes || formData.notes

    // Load context in parallel
    const [contact, history, patterns] = await Promise.all([
      contactId ? this.loadContactData(contactId) : null,
      contactId ? this.loadProposalHistory(contactId) : [],
      this.loadWinningPatterns()
    ])

    // Format audit context
    let auditContext = ''
    const auditData = auditResults || formData.auditData
    if (auditData) {
      auditContext = this._formatAuditContext(auditData)
    }

    // Format add-ons
    let addOnsContext = ''
    if (pricing?.addOns?.length) {
      const oneTimeAddOns = pricing.addOns.filter(a => !a.isRecurring)
      const recurringAddOns = pricing.addOns.filter(a => a.isRecurring)
      
      if (oneTimeAddOns.length > 0) {
        addOnsContext += `\nONE-TIME ADD-ONS SELECTED:\n${oneTimeAddOns.map(a => `- ${a.name}: $${a.price}`).join('\n')}`
      }
      if (recurringAddOns.length > 0) {
        addOnsContext += `\nMONTHLY RETAINER/SERVICE FEES (NOT included in project price - billed separately):\n${recurringAddOns.map(a => `- ${a.name}: $${a.price}/month`).join('\n')}`
        addOnsContext += `\n\nNOTE: Include a section about the ongoing monthly services in the proposal.`
      }
    }

    // Build comprehensive prompt
    const userPrompt = `Create an ultra-high-converting business proposal:

CLIENT INFORMATION:
- Name: ${clientName}
- Company: ${clientCompany || 'Not specified'}
- Industry: ${clientInfo?.industry || 'Not specified'}
- Brand Name: ${clientInfo?.brandName || clientCompany || 'Not specified'}
- Goals: ${goals || 'Not specified'}
- Challenges: ${challenges || 'Not specified'}

PROJECT DETAILS:
- Type: ${projectType}
- Website URL: ${projectInfo?.websiteUrl || 'Not specified'}
- Budget/Price: $${budget || 'To be discussed'}
- Timeline: ${timeline || 'Standard timeline'}
- Start Date: ${projectInfo?.startDate || 'Flexible'}
- Additional Context: ${projectInfo?.context || 'None'}
- Notes: ${notes || 'None'}
${auditContext}
${addOnsContext}
${pricing?.paymentTerms ? `\nPAYMENT TERMS: ${pricing.paymentTerms}` : ''}
${pricing?.customTerms ? `\nCUSTOM TERMS: ${pricing.customTerms}` : ''}

${patterns.length > 0 ? `WINNING PATTERNS TO APPLY:
${patterns.map(p => `- ${p.pattern} (${Math.round(p.success_rate * 100)}% success)`).join('\n')}` : ''}

Generate a complete, conversion-optimized proposal using our CUSTOM MDX COMPONENTS.
CRITICAL: Use the EXACT pricing provided ($${budget}).
Return ONLY valid JSON matching this schema:
${JSON.stringify(PROPOSAL_OUTPUT_SCHEMA, null, 2)}`

    // Call Signal
    const result = await this.signal.invoke({
      module: 'proposals',
      tool: 'draft_proposal',
      systemPrompt: PROPOSALS_SYSTEM_PROMPT,
      userPrompt,
      responseFormat: { type: 'json_object' },
      additionalContext: {
        componentNames: PROPOSAL_COMPONENT_NAMES,
        outputSchema: PROPOSAL_OUTPUT_SCHEMA
      }
    })

    // Log to Echo
    await this.echo.log({
      action: 'draft_proposal_from_form',
      input: { formData: { projectType, clientName, budget } },
      output: { title: result?.title },
      contactId
    })

    return result
  }

  /**
   * Format audit data into context string for AI
   */
  _formatAuditContext(auditData) {
    const { performance, seo, accessibility, bestPractices, grade, coreWebVitals, opportunities, seoDetails } = auditData
    
    let context = `
WEBSITE AUDIT RESULTS (Grade: ${grade || 'N/A'}):
Scores:
- Overall Performance: ${performance || 'N/A'}/100 (Mobile: ${auditData.performanceMobile || 'N/A'})
- SEO Score: ${seo || 'N/A'}/100
- Accessibility: ${accessibility || 'N/A'}/100
- Best Practices: ${bestPractices || 'N/A'}/100`

    if (coreWebVitals) {
      context += `

Core Web Vitals:
- LCP: Mobile ${coreWebVitals.lcp?.mobile || 'N/A'}, Desktop ${coreWebVitals.lcp?.desktop || 'N/A'} ${coreWebVitals.lcp?.score < 50 ? '⚠️ NEEDS IMPROVEMENT' : ''}
- CLS: Mobile ${coreWebVitals.cls?.mobile || 'N/A'}, Desktop ${coreWebVitals.cls?.desktop || 'N/A'}
- TBT: Mobile ${coreWebVitals.tbt?.mobile || 'N/A'}, Desktop ${coreWebVitals.tbt?.desktop || 'N/A'}
- Speed Index: Mobile ${coreWebVitals.speedIndex?.mobile || 'N/A'}, Desktop ${coreWebVitals.speedIndex?.desktop || 'N/A'}`
    }

    if (opportunities?.length > 0) {
      context += `\n\nTOP IMPROVEMENT OPPORTUNITIES:`
      opportunities.forEach((opp, i) => {
        context += `\n${i + 1}. ${opp.title}${opp.savings ? ` - Potential savings: ${opp.savings}` : ''}`
      })
    }

    if (seoDetails) {
      context += `

SEO AUDIT DETAILS:
- Page Title: "${seoDetails.title || 'MISSING'}" (${seoDetails.titleLength || 0} chars)
- Meta Description: ${seoDetails.metaDescriptionLength || 0} chars ${!seoDetails.metaDescription ? '⚠️ MISSING' : ''}
- H1 Tag: ${seoDetails.hasH1 ? 'Yes' : '⚠️ MISSING'}
- HTTPS: ${seoDetails.isHttps ? '✓ Secure' : '⚠️ NOT SECURE'}`
    }

    context += `

USE THIS AUDIT DATA TO:
- Emphasize specific pain points in the proposal
- Justify the investment with data-driven improvements
- Create urgency around fixing critical issues`

    return context
  }

  /**
   * Simple draft proposal (for API/quick use)
   */
  async draftProposal(brief) {
    const {
      contactId,
      projectType,
      services,
      budget,
      timeline,
      goals,
      challenges,
      competitorInfo,
      auditData
    } = brief

    // Load context
    const [contact, history, patterns] = await Promise.all([
      contactId ? this.loadContactData(contactId) : null,
      contactId ? this.loadProposalHistory(contactId) : [],
      this.loadWinningPatterns()
    ])

    // Build context
    const context = {
      contact,
      history,
      winningPatterns: patterns,
      auditData,
      projectType,
      services,
      budget,
      timeline,
      goals,
      challenges,
      competitorInfo
    }

    // Call Signal
    const result = await this.signal.invoke({
      module: 'proposals',
      tool: 'draft_proposal',
      systemPrompt: PROPOSALS_SYSTEM_PROMPT,
      userPrompt: `Generate a complete proposal for:

PROJECT TYPE: ${projectType || 'Not specified'}
SERVICES: ${services?.join(', ') || 'Not specified'}
BUDGET: ${budget || 'Not specified'}
TIMELINE: ${timeline || 'Not specified'}
GOALS: ${goals || 'Not specified'}
CHALLENGES: ${challenges || 'Not specified'}

${contact ? `CLIENT INFO:
- Name: ${contact.name}
- Company: ${contact.company}
- Industry: ${contact.industry}
- Stage: ${contact.pipeline_stage}` : ''}

${auditData ? `AUDIT DATA:
${JSON.stringify(auditData, null, 2)}` : ''}

${competitorInfo ? `COMPETITOR INFO: ${competitorInfo}` : ''}

${patterns.length > 0 ? `WINNING PATTERNS TO APPLY:
${patterns.map(p => `- ${p.pattern} (${Math.round(p.success_rate * 100)}% success)`).join('\n')}` : ''}

${TOOL_PROMPTS.draft_proposal}`,
      responseFormat: { type: 'json_object' },
      additionalContext: {
        componentNames: PROPOSAL_COMPONENT_NAMES,
        outputSchema: PROPOSAL_OUTPUT_SCHEMA
      }
    })

    // Log to Echo
    await this.echo.log({
      action: 'draft_proposal',
      input: { brief },
      output: result,
      contactId
    })

    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: EDIT SECTION
  // ─────────────────────────────────────────────────────────────────────────────

  async editSection(proposalId, sectionName, existingContent, instructions) {
    const result = await this.signal.invoke({
      module: 'proposals',
      tool: 'edit_section',
      systemPrompt: PROPOSALS_SYSTEM_PROMPT,
      userPrompt: `Edit the "${sectionName}" section of this proposal.

CURRENT CONTENT:
${existingContent}

INSTRUCTIONS:
${instructions}

${TOOL_PROMPTS.edit_section}`,
      additionalContext: {
        proposalId,
        sectionName
      }
    })

    await this.echo.log({
      action: 'edit_section',
      input: { proposalId, sectionName, instructions },
      output: result
    })

    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: EDIT PROPOSAL FROM INSTRUCTION (for background edit function)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Edit a proposal based on user instruction
   * Returns structured updates for content, price, payment terms, timeline
   */
  async editProposalFromInstruction(currentContent, instruction, currentSettings = {}) {
    const { paymentTerms, timeline, totalAmount } = currentSettings

    const paymentTermsMap = {
      '50-50': '50% upfront, 50% on completion',
      '100-upfront': '100% upfront',
      '25-25-25-25': '25% quarterly milestones',
      'monthly': 'Monthly billing'
    }

    const editPrompt = `You are a proposal editor. Make the requested changes.

Current proposal content (MDX format):
${currentContent || 'No content provided'}

Current proposal DATABASE settings:
- Payment Terms: ${paymentTermsMap[paymentTerms] || paymentTerms || '50-50'}
- Timeline: ${(timeline || '6-weeks').replace('-', ' ')}
- Total Price: $${totalAmount || '0'}

INSTRUCTIONS:
1. If the user wants changes, make them and return ALL updated values
2. Keep the same MDX structure and formatting
3. Include structured fields when changing settings

PAYMENT TERMS VALUES (use exact string):
- "50-50" = 50% upfront, 50% on completion
- "100-upfront" = 100% upfront
- "25-25-25-25" = 25% quarterly milestones  
- "monthly" = Monthly billing

RESPONSE FORMAT:
{
  "message": "Brief description of what you changed",
  "updatedContent": "Full updated MDX content (if content changed)",
  "updatedPrice": 5000,
  "updatedPaymentTerms": "50-50",
  "updatedTimeline": "8-weeks"
}`

    const result = await this.signal.invoke({
      module: 'proposals',
      tool: 'edit_proposal',
      systemPrompt: editPrompt,
      userPrompt: instruction,
      responseFormat: { type: 'json_object' }
    })

    await this.echo.log({
      action: 'edit_proposal_from_instruction',
      input: { instruction, currentSettings },
      output: result
    })

    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: CLARIFY REQUEST
  // ─────────────────────────────────────────────────────────────────────────────

  async clarifyRequest(vagueRequest) {
    const result = await this.signal.invoke({
      module: 'proposals',
      tool: 'clarify_request',
      systemPrompt: PROPOSALS_SYSTEM_PROMPT,
      userPrompt: `The user wants a proposal but the request is vague:

"${vagueRequest}"

${TOOL_PROMPTS.clarify_request}`,
      responseFormat: { type: 'json_object' }
    })

    await this.echo.log({
      action: 'clarify_request',
      input: { vagueRequest },
      output: result
    })

    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: SUGGEST PRICING
  // ─────────────────────────────────────────────────────────────────────────────

  async suggestPricing(scope) {
    const { services, deliverables, timeline, clientBudget, industry } = scope

    const result = await this.signal.invoke({
      module: 'proposals',
      tool: 'suggest_pricing',
      systemPrompt: PROPOSALS_SYSTEM_PROMPT,
      userPrompt: `Suggest pricing for this project scope:

SERVICES: ${services?.join(', ') || 'Not specified'}
DELIVERABLES: ${deliverables?.join(', ') || 'Not specified'}
TIMELINE: ${timeline || 'Not specified'}
CLIENT BUDGET SIGNAL: ${clientBudget || 'Unknown'}
INDUSTRY: ${industry || 'Not specified'}

${TOOL_PROMPTS.suggest_pricing}`,
      responseFormat: { type: 'json_object' }
    })

    await this.echo.log({
      action: 'suggest_pricing',
      input: scope,
      output: result
    })

    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: CLOSE PROBABILITY
  // ─────────────────────────────────────────────────────────────────────────────

  async closeProbability(proposalContext) {
    const { proposalId, contactId, totalAmount, competitorCount, daysOpen } = proposalContext

    const contact = contactId ? await this.loadContactData(contactId) : null

    const result = await this.signal.invoke({
      module: 'proposals',
      tool: 'close_probability',
      systemPrompt: PROPOSALS_SYSTEM_PROMPT,
      userPrompt: `Estimate the probability of this proposal being accepted:

PROPOSAL AMOUNT: $${totalAmount ? (totalAmount / 100).toLocaleString() : 'Unknown'}
DAYS OPEN: ${daysOpen || 'Unknown'}
COMPETITOR COUNT: ${competitorCount || 'Unknown'}

${contact ? `CLIENT:
- Name: ${contact.name}
- Company: ${contact.company}
- Stage: ${contact.pipeline_stage}
- Previous Proposals: ${contact.proposals?.length || 0}
- Accepted Before: ${contact.proposals?.filter(p => p.status === 'accepted').length || 0}` : ''}

${TOOL_PROMPTS.close_probability}`,
      responseFormat: { type: 'json_object' }
    })

    await this.echo.log({
      action: 'close_probability',
      input: proposalContext,
      output: result
    })

    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOOL: REFINE WITH CHAT
  // ─────────────────────────────────────────────────────────────────────────────

  async refineWithChat(proposalId, existingContent, userMessage, chatHistory = []) {
    const result = await this.signal.invoke({
      module: 'proposals',
      tool: 'refine_with_chat',
      systemPrompt: PROPOSALS_SYSTEM_PROMPT,
      userPrompt: `Refine this proposal based on user feedback.

CURRENT PROPOSAL:
${existingContent}

${chatHistory.length > 0 ? `PREVIOUS CONVERSATION:
${chatHistory.map(m => `${m.role}: ${m.content}`).join('\n')}` : ''}

USER REQUEST:
${userMessage}

${TOOL_PROMPTS.refine_with_chat}`,
      additionalContext: {
        proposalId,
        isRefinement: true
      }
    })

    await this.echo.log({
      action: 'refine_with_chat',
      input: { proposalId, userMessage },
      output: result
    })

    return result
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PATTERN LEARNING
  // ─────────────────────────────────────────────────────────────────────────────

  async recordOutcome(proposalId, outcome) {
    // outcome: 'accepted' | 'declined' | 'no_response'
    const { data: proposal } = await this.supabase
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .single()

    if (!proposal) return

    // Extract patterns from successful proposals
    if (outcome === 'accepted') {
      await this.signal.memory.store(
        `proposal_${proposal.id}`,
        {
          projectType: proposal.project_type,
          services: proposal.services,
          totalAmount: proposal.total_amount_cents,
          industry: proposal.industry,
          components: proposal.components_used,
          convertedIn: this.daysBetween(proposal.created_at, proposal.accepted_at)
        },
        { success: true }
      )
    }
  }

  daysBetween(start, end) {
    const startDate = new Date(start)
    const endDate = new Date(end)
    return Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default ProposalsSkill
