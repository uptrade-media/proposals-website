/**
 * Signal API Client
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * HTTP client for calling the Signal AI NestJS API.
 * Replaces the internal Signal implementation with API calls.
 * 
 * Migration: This wraps the Signal API to maintain the same interface as the
 * internal Signal class, enabling gradual cutover.
 * 
 * Usage:
 *   import { SignalAPIClient } from './utils/signal-api-client.js'
 *   const signal = new SignalAPIClient(orgId, { userId, siteId })
 *   const result = await signal.invoke('seo', 'analyze_page', { url: '...' })
 */

import axios from 'axios'

const SIGNAL_API_URL = process.env.SIGNAL_API_URL || 'http://localhost:3001'
const SIGNAL_API_KEY = process.env.SIGNAL_API_KEY || 'development'

export class SignalAPIClient {
  constructor(orgId, options = {}) {
    this.orgId = orgId
    this.userId = options.userId
    this.siteId = options.siteId
    this.tenantId = options.tenantId
    this.conversationId = options.conversationId
    
    // Create axios instance with auth
    this.client = axios.create({
      baseURL: SIGNAL_API_URL,
      timeout: 60000, // AI requests can take time
      headers: {
        'X-API-Key': SIGNAL_API_KEY,
        'X-Organization-Id': orgId,
        'X-Tenant-Id': this.tenantId || this.siteId,
        'Content-Type': 'application/json'
      }
    })
  }

  /**
   * Invoke a skill with a specific tool
   * 
   * Supports two calling conventions (for backward compatibility):
   * 1. New format: invoke(skillKey, tool, params, options)
   * 2. Legacy format: invoke({ module, tool, systemPrompt, userPrompt, responseFormat, temperature })
   */
  async invoke(skillKeyOrConfig, tool, params = {}, options = {}) {
    const startTime = Date.now()
    
    // Handle legacy object format
    let skillKey = skillKeyOrConfig
    let actualTool = tool
    let actualParams = params
    let actualOptions = options
    
    if (typeof skillKeyOrConfig === 'object' && skillKeyOrConfig !== null) {
      // Legacy format: invoke({ module, tool, systemPrompt, userPrompt, ... })
      const config = skillKeyOrConfig
      skillKey = config.module || 'seo'
      actualTool = config.tool || 'analyze'
      
      // Build params from legacy fields
      actualParams = config.params || {}
      
      // For chat tool, pass the userPrompt as the message
      if (actualTool === 'chat' && config.userPrompt) {
        actualParams.message = config.userPrompt
      }
      
      actualOptions = {
        trackAction: config.trackAction || false,
        temperature: config.temperature,
        responseFormat: config.responseFormat,
        systemPrompt: config.systemPrompt,
        userPrompt: config.userPrompt
      }
      
      console.log(`[SignalAPI] Legacy invoke converted: ${skillKey}.${actualTool}`)
    }

    try {
      // Call Signal API
      const response = await this.client.post(`/skills/${skillKey}/${actualTool}`, {
        params: actualParams,
        context: {
          org_id: this.orgId,
          tenant_id: this.tenantId,
          site_id: this.siteId,
          user_id: this.userId,
          conversation_id: this.conversationId
        },
        options: actualOptions
      })

      console.log(`[SignalAPI] ${skillKey}.${actualTool} completed in ${Date.now() - startTime}ms`)
      return response.data

    } catch (error) {
      console.error(`[SignalAPI] Error calling ${skillKey}.${actualTool}:`, error.response?.data || error.message)
      throw new Error(error.response?.data?.message || error.message)
    }
  }

  /**
   * Chat with Echo (conversational interface)
   */
  async chat(message, conversationId = null, skillKey = null) {
    try {
      const response = await this.client.post('/echo/chat', {
        message,
        conversationId: conversationId || this.conversationId,
        skillKey, // Optional: lock to specific skill (module echo)
        context: {
          org_id: this.orgId,
          tenant_id: this.tenantId,
          user_id: this.userId
        }
      })

      return response.data
    } catch (error) {
      console.error('[SignalAPI] Echo chat error:', error.response?.data || error.message)
      throw new Error(error.response?.data?.message || error.message)
    }
  }

  /**
   * Stream Echo responses (SSE)
   */
  async *streamChat(message, conversationId = null, skillKey = null) {
    const response = await this.client.post('/echo/stream', {
      message,
      conversationId: conversationId || this.conversationId,
      skillKey,
      context: {
        org_id: this.orgId,
        tenant_id: this.tenantId,
        user_id: this.userId
      }
    }, {
      responseType: 'stream'
    })

    for await (const chunk of response.data) {
      const lines = chunk.toString().split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6))
          yield data
        }
      }
    }
  }

  /**
   * Load skill definition
   */
  async loadSkill(skillKey) {
    try {
      const response = await this.client.get(`/skills/${skillKey}`)
      return response.data
    } catch (error) {
      throw new Error(`Skill not found: ${skillKey}`)
    }
  }

  /**
   * Route a request to the appropriate skill
   */
  async route(userMessage) {
    try {
      const response = await this.client.post('/skills/route', {
        message: userMessage,
        context: {
          org_id: this.orgId,
          tenant_id: this.tenantId
        }
      })
      return response.data.skill
    } catch (error) {
      return 'support' // Default fallback
    }
  }

  /**
   * Load memory for a skill
   */
  async loadMemory(skillKey) {
    try {
      const response = await this.client.get(`/memory/${skillKey}`, {
        params: {
          org_id: this.orgId,
          tenant_id: this.tenantId
        }
      })
      return response.data.memories || []
    } catch (error) {
      console.error(`[SignalAPI] Failed to load memory for ${skillKey}:`, error.message)
      return []
    }
  }

  /**
   * Store memory
   */
  async remember(skillKey, type, key, value) {
    try {
      await this.client.post(`/memory/${skillKey}`, {
        type,
        key,
        value,
        org_id: this.orgId,
        tenant_id: this.tenantId
      })
    } catch (error) {
      console.error(`[SignalAPI] Failed to store memory:`, error.message)
    }
  }

  /**
   * Forget memory
   */
  async forget(skillKey, type, key) {
    try {
      await this.client.delete(`/memory/${skillKey}`, {
        params: { type, key, org_id: this.orgId, tenant_id: this.tenantId }
      })
    } catch (error) {
      console.error(`[SignalAPI] Failed to forget memory:`, error.message)
    }
  }

  /**
   * Load learned patterns
   */
  async loadPatterns(skillKey) {
    try {
      const response = await this.client.get(`/patterns/${skillKey}`, {
        params: {
          org_id: this.orgId,
          tenant_id: this.tenantId
        }
      })
      return response.data.patterns || []
    } catch (error) {
      console.error(`[SignalAPI] Failed to load patterns for ${skillKey}:`, error.message)
      return []
    }
  }

  /**
   * Learn pattern from successful action
   */
  async learnPattern(skillKey, type, key, data) {
    try {
      await this.client.post(`/patterns/${skillKey}`, {
        type,
        key,
        data,
        org_id: this.orgId,
        tenant_id: this.tenantId
      })
    } catch (error) {
      console.error(`[SignalAPI] Failed to record pattern:`, error.message)
    }
  }

  /**
   * Track an action for outcome measurement
   */
  async trackAction(skillKey, action) {
    try {
      const response = await this.client.post('/actions', {
        skill_key: skillKey,
        action_type: action.type,
        action_target: action.target,
        action_data: action,
        org_id: this.orgId,
        tenant_id: this.tenantId
      })
      return response.data.action
    } catch (error) {
      console.error(`[SignalAPI] Failed to track action:`, error.message)
      return null
    }
  }

  /**
   * Record outcome for a tracked action
   */
  async recordOutcome(actionId, outcome) {
    try {
      await this.client.put(`/actions/${actionId}/outcome`, {
        outcome_data: outcome,
        outcome_score: outcome.score || 0
      })
    } catch (error) {
      console.error(`[SignalAPI] Failed to record outcome:`, error.message)
    }
  }

  /**
   * Log event to Signal audit log
   */
  async log(eventType, data) {
    try {
      await this.client.post('/audit', {
        event_type: eventType,
        org_id: this.orgId,
        tenant_id: this.tenantId,
        user_id: this.userId,
        ...data
      })
    } catch (error) {
      // Don't throw - logging failures shouldn't break operations
      console.error(`[SignalAPI] Failed to log event:`, error.message)
    }
  }
}

/**
 * Create Echo instance (global, auto-routes)
 */
export function createGlobalEcho(orgId, options = {}) {
  return new SignalAPIClient(orgId, options)
}

/**
 * Create Echo instance (module-specific, locked to skill)
 */
export function createModuleEcho(orgId, skillKey, options = {}) {
  const client = new SignalAPIClient(orgId, options)
  client.lockedSkill = skillKey
  
  // Override chat to use locked skill
  const originalChat = client.chat.bind(client)
  client.chat = async (message, conversationId = null) => {
    return originalChat(message, conversationId, skillKey)
  }
  
  return client
}

// Default export for backward compatibility
export default SignalAPIClient
