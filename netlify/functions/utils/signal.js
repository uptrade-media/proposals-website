/**
 * Signal AI Core Service
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * The unified AI layer across all Uptrade Portal modules.
 * Signal routes requests to skills, manages shared memory, and tracks outcomes.
 * 
 * Architecture:
 * - Signal: The orchestrator (this file)
 * - Skills: Module-specific capabilities (seo, crm, proposals, etc.)
 * - Echo: The conversational interface (uses Signal under the hood)
 * - Memory: Shared context across skills
 * - Patterns: Learned behaviors from outcomes
 * 
 * Usage:
 *   import Signal from './utils/signal.js'
 *   const signal = new Signal(supabase, orgId)
 *   const result = await signal.invoke('seo', 'analyze_page', { url: '...' })
 */

import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const DEFAULT_MODEL = process.env.SIGNAL_MODEL || process.env.SEO_AI_MODEL || 'gpt-4o'

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNAL CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class Signal {
  constructor(supabase, orgId, options = {}) {
    this.supabase = supabase
    this.orgId = orgId
    this.userId = options.userId
    this.siteId = options.siteId
    this.conversationId = options.conversationId
    this.skills = new Map()
    this.memory = new Map()
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SKILL MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Load a skill definition from the database
   */
  async loadSkill(skillKey) {
    if (this.skills.has(skillKey)) {
      return this.skills.get(skillKey)
    }

    const { data: skill, error } = await this.supabase
      .from('signal_skills')
      .select('*')
      .eq('skill_key', skillKey)
      .eq('is_active', true)
      .single()

    if (error || !skill) {
      throw new Error(`Skill not found: ${skillKey}`)
    }

    this.skills.set(skillKey, skill)
    return skill
  }

  /**
   * Route a request to the appropriate skill
   */
  async route(userMessage) {
    const routerSkill = await this.loadSkill('router')
    
    const response = await openai.chat.completions.create({
      model: routerSkill.model || DEFAULT_MODEL,
      messages: [
        { role: 'system', content: routerSkill.system_prompt },
        { role: 'user', content: `Determine the best skill to handle this request. Available skills: seo, crm, proposals, content, billing, support. User request: "${userMessage}"` }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(response.choices[0].message.content)
    return result.skill || 'support' // Default to support if unclear
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // INVOCATION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Invoke a skill with a specific tool
   */
  async invoke(skillKey, tool, params = {}, options = {}) {
    const startTime = Date.now()
    const skill = await this.loadSkill(skillKey)

    // Validate tool is allowed
    const allowedTools = skill.allowed_tools || []
    if (!allowedTools.includes(tool) && tool !== 'chat') {
      throw new Error(`Tool '${tool}' not allowed for skill '${skillKey}'`)
    }

    // Load relevant memory
    const memory = await this.loadMemory(skillKey)

    // Load relevant patterns
    const patterns = await this.loadPatterns(skillKey)

    // Build context
    const context = {
      org_id: this.orgId,
      site_id: this.siteId,
      user_id: this.userId,
      tool,
      params,
      memory: memory.slice(0, 10), // Last 10 relevant memories
      patterns: patterns.slice(0, 5), // Top 5 relevant patterns
      ...options.additionalContext
    }

    // Execute based on tool type
    let result
    try {
      if (tool === 'chat') {
        result = await this.chat(skill, params.message, context)
      } else {
        result = await this.executeTool(skill, tool, context)
      }

      // Log successful invocation
      await this.log('invocation', {
        skill_key: skillKey,
        tool,
        success: true,
        duration_ms: Date.now() - startTime,
        tokens_used: result.usage?.total_tokens
      })

      // Track as action if it's actionable
      if (options.trackAction && result.action) {
        await this.trackAction(skillKey, result.action)
      }

      return result

    } catch (error) {
      // Log error
      await this.log('error', {
        skill_key: skillKey,
        tool,
        error_code: error.code || 'UNKNOWN',
        error_message: error.message,
        duration_ms: Date.now() - startTime
      })
      throw error
    }
  }

  /**
   * Execute a specific tool within a skill
   */
  async executeTool(skill, tool, context) {
    const toolDescriptions = skill.tool_descriptions || {}
    const toolPrompt = toolDescriptions[tool] || `Execute the ${tool} tool with the provided parameters.`

    const messages = [
      { role: 'system', content: skill.system_prompt },
      { role: 'system', content: `You are executing the "${tool}" tool. ${toolPrompt}` }
    ]

    // Add memory context
    if (context.memory?.length > 0) {
      messages.push({
        role: 'system',
        content: `Relevant context from memory:\n${context.memory.map(m => `- ${m.key}: ${JSON.stringify(m.value)}`).join('\n')}`
      })
    }

    // Add pattern context
    if (context.patterns?.length > 0) {
      messages.push({
        role: 'system',
        content: `Learned patterns to consider:\n${context.patterns.map(p => `- ${p.pattern_description} (${p.success_rate}% success rate)`).join('\n')}`
      })
    }

    // Add tool request
    messages.push({
      role: 'user',
      content: JSON.stringify(context.params)
    })

    const response = await openai.chat.completions.create({
      model: skill.model || DEFAULT_MODEL,
      messages,
      temperature: skill.temperature || 0.7,
      max_tokens: skill.max_tokens || 4000,
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(response.choices[0].message.content)
    
    return {
      ...result,
      usage: response.usage,
      model: response.model
    }
  }

  /**
   * Chat with a skill (conversational interface)
   */
  async chat(skill, message, context) {
    const messages = [
      { role: 'system', content: skill.system_prompt }
    ]

    // Load conversation history if we have a conversation
    if (this.conversationId) {
      const { data: history } = await this.supabase
        .from('signal_messages')
        .select('role, content')
        .eq('conversation_id', this.conversationId)
        .order('created_at', { ascending: true })
        .limit(20)

      if (history) {
        messages.push(...history.map(m => ({
          role: m.role === 'echo' ? 'assistant' : m.role,
          content: m.content
        })))
      }
    }

    // Add memory context
    if (context.memory?.length > 0) {
      messages.push({
        role: 'system',
        content: `Context from memory:\n${context.memory.map(m => `- ${m.key}: ${JSON.stringify(m.value)}`).join('\n')}`
      })
    }

    // Add user message
    messages.push({ role: 'user', content: message })

    const response = await openai.chat.completions.create({
      model: skill.model || DEFAULT_MODEL,
      messages,
      temperature: skill.temperature || 0.7,
      max_tokens: skill.max_tokens || 4000
    })

    const assistantMessage = response.choices[0].message.content

    // Save messages if we have a conversation
    if (this.conversationId) {
      await this.supabase.from('signal_messages').insert([
        { conversation_id: this.conversationId, role: 'user', content: message },
        { 
          conversation_id: this.conversationId, 
          role: 'echo', 
          content: assistantMessage,
          model: response.model,
          tokens_used: response.usage?.total_tokens
        }
      ])

      // Update conversation
      await this.supabase
        .from('signal_conversations')
        .update({ 
          message_count: this.supabase.raw('message_count + 2'),
          last_message_at: new Date().toISOString()
        })
        .eq('id', this.conversationId)
    }

    return {
      message: assistantMessage,
      usage: response.usage,
      model: response.model
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MEMORY MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Load relevant memory for a skill
   */
  async loadMemory(skillKey) {
    const { data: memories } = await this.supabase
      .from('signal_memory')
      .select('*')
      .eq('org_id', this.orgId)
      .or(`skill_key.eq.${skillKey},skill_key.is.null`)
      .order('importance', { ascending: false })
      .order('last_accessed_at', { ascending: false, nullsFirst: false })
      .limit(20)

    // Update access count
    if (memories?.length > 0) {
      const ids = memories.map(m => m.id)
      await this.supabase
        .from('signal_memory')
        .update({ 
          access_count: this.supabase.raw('access_count + 1'),
          last_accessed_at: new Date().toISOString()
        })
        .in('id', ids)
    }

    return memories || []
  }

  /**
   * Store a memory
   */
  async remember(skillKey, type, key, value, options = {}) {
    const { data, error } = await this.supabase
      .from('signal_memory')
      .upsert({
        org_id: this.orgId,
        site_id: this.siteId,
        skill_key: skillKey,
        memory_type: type,
        key,
        value,
        importance: options.importance || 0.5,
        expires_at: options.expiresAt,
        updated_at: new Date().toISOString()
      }, { onConflict: 'org_id,skill_key,memory_type,key' })
      .select()
      .single()

    return data
  }

  /**
   * Forget a memory
   */
  async forget(skillKey, type, key) {
    await this.supabase
      .from('signal_memory')
      .delete()
      .eq('org_id', this.orgId)
      .eq('skill_key', skillKey)
      .eq('memory_type', type)
      .eq('key', key)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PATTERN LEARNING
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Load relevant patterns for a skill
   */
  async loadPatterns(skillKey) {
    // Get org-specific patterns first, then global
    const { data: patterns } = await this.supabase
      .from('signal_patterns')
      .select('*')
      .eq('skill_key', skillKey)
      .eq('is_active', true)
      .or(`org_id.eq.${this.orgId},org_id.is.null`)
      .gte('confidence', 0.6)
      .order('confidence', { ascending: false })
      .order('success_rate', { ascending: false })
      .limit(10)

    return patterns || []
  }

  /**
   * Record a pattern from an outcome
   */
  async learnPattern(skillKey, patternType, patternKey, data) {
    const existing = await this.supabase
      .from('signal_patterns')
      .select('*')
      .eq('skill_key', skillKey)
      .eq('org_id', this.orgId)
      .eq('pattern_type', patternType)
      .eq('pattern_key', patternKey)
      .single()

    if (existing.data) {
      // Update existing pattern
      const pattern = existing.data
      const newSupporting = pattern.supporting_actions + 1
      const newSuccessRate = data.success 
        ? (pattern.success_rate * pattern.supporting_actions + 100) / newSupporting
        : (pattern.success_rate * pattern.supporting_actions) / newSupporting
      
      const examples = pattern.examples || []
      if (data.success) {
        examples.push(data.example)
        if (examples.length > 10) examples.shift()
      }

      await this.supabase
        .from('signal_patterns')
        .update({
          supporting_actions: newSupporting,
          success_rate: newSuccessRate,
          confidence: Math.min(0.95, 0.5 + (newSupporting * 0.02)),
          confidence_level: newSupporting >= 20 ? 'high' : newSupporting >= 10 ? 'medium' : 'low',
          examples,
          last_applied_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', pattern.id)

    } else {
      // Create new pattern
      await this.supabase
        .from('signal_patterns')
        .insert({
          skill_key: skillKey,
          org_id: this.orgId,
          pattern_type: patternType,
          pattern_key: patternKey,
          pattern_description: data.description,
          supporting_actions: 1,
          success_rate: data.success ? 100 : 0,
          pattern_data: data.patternData,
          examples: data.success ? [data.example] : [],
          confidence: 0.5,
          confidence_level: 'low'
        })
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ACTION TRACKING
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Track an action for outcome measurement
   */
  async trackAction(skillKey, action) {
    const { data } = await this.supabase
      .from('signal_actions')
      .insert({
        org_id: this.orgId,
        skill_key: skillKey,
        conversation_id: this.conversationId,
        action_type: action.type,
        action_target: action.target,
        action_data: action.data,
        confidence: action.confidence,
        reasoning: action.reasoning,
        status: 'pending'
      })
      .select()
      .single()

    return data
  }

  /**
   * Record action outcome
   */
  async recordOutcome(actionId, outcome) {
    await this.supabase
      .from('signal_actions')
      .update({
        outcome_measured: true,
        outcome_data: outcome.data,
        outcome_score: outcome.score,
        outcome_measured_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', actionId)

    // Get action details for pattern learning
    const { data: action } = await this.supabase
      .from('signal_actions')
      .select('*')
      .eq('id', actionId)
      .single()

    if (action) {
      await this.learnPattern(action.skill_key, 'action_outcome', action.action_type, {
        success: outcome.score > 15,
        description: `${action.action_type} on ${action.action_target}`,
        example: { action: action.action_data, outcome: outcome.data },
        patternData: { actionType: action.action_type, conditions: action.action_data }
      })
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LOGGING
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Log an event to the audit trail
   */
  async log(eventType, data) {
    await this.supabase
      .from('signal_audit_log')
      .insert({
        org_id: this.orgId,
        user_id: this.userId,
        skill_key: data.skill_key,
        conversation_id: this.conversationId,
        action_id: data.action_id,
        event_type: eventType,
        event_data: data,
        duration_ms: data.duration_ms,
        tokens_used: data.tokens_used,
        error_code: data.error_code,
        error_message: data.error_message
      })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ECHO - Conversational Interface
// ═══════════════════════════════════════════════════════════════════════════════

export class Echo {
  constructor(supabase, orgId, options = {}) {
    this.signal = new Signal(supabase, orgId, options)
    this.supabase = supabase
    this.orgId = orgId
    this.userId = options.userId
    this.contextType = options.contextType || 'global' // 'module' or 'global'
    this.contextId = options.contextId
    this.skillKey = options.skillKey // Pre-set skill for module Echo
  }

  /**
   * Start a new conversation
   */
  async startConversation(title = null) {
    const { data: conversation } = await this.supabase
      .from('signal_conversations')
      .insert({
        org_id: this.orgId,
        user_id: this.userId,
        skill_key: this.skillKey,
        context_type: this.contextType,
        context_id: this.contextId,
        title,
        status: 'active'
      })
      .select()
      .single()

    this.signal.conversationId = conversation.id
    return conversation
  }

  /**
   * Continue an existing conversation
   */
  async continueConversation(conversationId) {
    const { data: conversation } = await this.supabase
      .from('signal_conversations')
      .select('*')
      .eq('id', conversationId)
      .single()

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    this.signal.conversationId = conversationId
    this.skillKey = conversation.skill_key
    return conversation
  }

  /**
   * Send a message to Echo
   */
  async send(message) {
    // If no conversation, start one
    if (!this.signal.conversationId) {
      await this.startConversation()
    }

    // Route to appropriate skill if global Echo
    let skillKey = this.skillKey
    if (!skillKey || this.contextType === 'global') {
      skillKey = await this.signal.route(message)
    }

    // Invoke the skill's chat
    const result = await this.signal.invoke(skillKey, 'chat', { message })

    return {
      ...result,
      conversation_id: this.signal.conversationId,
      skill_key: skillKey
    }
  }

  /**
   * Execute an action through Echo
   */
  async do(action, params = {}) {
    if (!this.skillKey) {
      throw new Error('Module skill required for actions')
    }

    return await this.signal.invoke(this.skillKey, action, params, { trackAction: true })
  }

  /**
   * Get conversation summary
   */
  async summarize() {
    if (!this.signal.conversationId) return null

    const { data: messages } = await this.supabase
      .from('signal_messages')
      .select('role, content')
      .eq('conversation_id', this.signal.conversationId)
      .order('created_at', { ascending: true })

    if (!messages?.length) return null

    const skill = await this.signal.loadSkill('router')
    
    const response = await openai.chat.completions.create({
      model: skill.model || DEFAULT_MODEL,
      messages: [
        { role: 'system', content: 'Summarize this conversation in 2-3 sentences.' },
        { role: 'user', content: messages.map(m => `${m.role}: ${m.content}`).join('\n') }
      ],
      temperature: 0.3,
      max_tokens: 200
    })

    const summary = response.choices[0].message.content

    // Update conversation with summary
    await this.supabase
      .from('signal_conversations')
      .update({ summary })
      .eq('id', this.signal.conversationId)

    return summary
  }

  /**
   * Rate the last response
   */
  async rate(rating, feedback = null) {
    const { data: lastMessage } = await this.supabase
      .from('signal_messages')
      .select('id')
      .eq('conversation_id', this.signal.conversationId)
      .eq('role', 'echo')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (lastMessage) {
      await this.supabase
        .from('signal_messages')
        .update({ 
          rating, 
          feedback,
          was_helpful: rating >= 4
        })
        .eq('id', lastMessage.id)
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a module-scoped Echo instance
 */
export function createModuleEcho(supabase, orgId, skillKey, options = {}) {
  return new Echo(supabase, orgId, {
    ...options,
    skillKey,
    contextType: 'module'
  })
}

/**
 * Create a global Echo instance (router mode)
 */
export function createGlobalEcho(supabase, orgId, options = {}) {
  return new Echo(supabase, orgId, {
    ...options,
    contextType: 'global'
  })
}

export default Signal
