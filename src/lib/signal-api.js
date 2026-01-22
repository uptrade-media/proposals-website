/**
 * Signal API Client
 * 
 * Direct connection to the Signal AI API for:
 * - Echo chat (SSE streaming)
 * - AI skills (SEO analysis, proposal generation, etc.)
 * - Knowledge base queries
 * - Any AI-powered features
 * 
 * For local dev:
 * - Frontend runs on :8888 (netlify dev) or :5173 (vite)
 * - Signal API runs on :3001
 * - Portal API runs on :3002
 * 
 * ARCHITECTURE NOTE:
 * - Signal API = AI brain (Echo, skills, knowledge, learning)
 * - Portal API = Business operations (CRUD, billing, files, etc.)
 * - Frontend calls Signal directly for AI features (speed + SSE streaming)
 * - Portal API can call Signal internally for AI-enhanced business logic
 */
import axios from 'axios'
import { supabase } from './supabase-auth'

// Signal API URL - AI brain for Echo, skills, knowledge
const SIGNAL_API_URL = import.meta.env.VITE_SIGNAL_API_URL || 'http://localhost:3001'

// Helper to get Signal API URL (used by SSE connections)
export function getSignalApiUrl() {
  return SIGNAL_API_URL
}

// Create axios instance for Signal API (non-streaming requests)
const signalApi = axios.create({
  baseURL: SIGNAL_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add request interceptor to attach Supabase session token
signalApi.interceptors.request.use(
  async (config) => {
    console.log('[Signal API Request]', config.method?.toUpperCase(), config.url)
    
    // Get Supabase session and add to Authorization header
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`
    }
    
    // Import auth store dynamically to avoid circular dependency
    const { default: useAuthStore } = await import('./auth-store')
    const state = useAuthStore.getState()
    
    // Add organization/project context headers
    if (state.currentOrg?.id) {
      config.headers['X-Organization-Id'] = state.currentOrg.id
    }
    
    if (state.currentProject?.id) {
      config.headers['X-Project-Id'] = state.currentProject.id
      if (state.currentProject.org_id) {
        config.headers['X-Tenant-Org-Id'] = state.currentProject.org_id
      }
    }
    
    return config
  },
  (error) => {
    console.error('[Signal API Request Error]', error)
    return Promise.reject(error)
  }
)

// Add response interceptor for error handling
signalApi.interceptors.response.use(
  (response) => {
    console.log('[Signal API Response]', response.config.method?.toUpperCase(), response.config.url, 'Status:', response.status)
    return response
  },
  async (error) => {
    console.error('[Signal API Error]', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message
    })
    
    // Handle 401 - session expired
    if (error.response?.status === 401) {
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()
      
      if (!session || refreshError) {
        console.log('[Signal API] Session expired')
        // Don't redirect - let the app handle it
      }
    }
    
    return Promise.reject(error)
  }
)

// ============================================================================
// Helper: Get auth headers for fetch/SSE requests
// ============================================================================

async function getAuthHeaders() {
  const headers = {
    'Content-Type': 'application/json'
  }
  
  // Get Supabase session token
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  
  // Get org/project context
  const { default: useAuthStore } = await import('./auth-store')
  const state = useAuthStore.getState()
  
  if (state.currentOrg?.id) {
    headers['X-Organization-Id'] = state.currentOrg.id
  }
  
  if (state.currentProject?.id) {
    headers['X-Project-Id'] = state.currentProject.id
    if (state.currentProject.org_id) {
      headers['X-Tenant-Org-Id'] = state.currentProject.org_id
    }
  }
  
  return headers
}

// ============================================================================
// Echo API - AI Chat (SSE Streaming)
// ============================================================================

export const echoApi = {
  /**
   * Stream a chat response from Echo via SSE
   * @param {Object} params - Chat parameters
   * @param {string} params.message - User's message
   * @param {string} params.conversationId - Optional conversation ID to continue
   * @param {string} params.skill - Optional skill to use (bypasses router)
   * @param {Object} callbacks - SSE event callbacks
   * @param {Function} callbacks.onToken - Called for each streamed token
   * @param {Function} callbacks.onComplete - Called when stream completes
   * @param {Function} callbacks.onError - Called on error
   * @param {Function} callbacks.onToolCall - Called when a tool is invoked
   * @returns {Promise<void>}
   */
  streamChat: async (params, { onToken, onComplete, onError, onToolCall }) => {
    const headers = await getAuthHeaders()
    
    try {
      const response = await fetch(`${SIGNAL_API_URL}/echo/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: params.message,
          conversationId: params.conversationId,
          skill: params.skill,
          pageContext: params.pageContext, // Pass page context for Echo awareness
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(errorData.error || errorData.message || `Request failed: ${response.status}`)
      }
      
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''
      let conversationId = params.conversationId
      
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          break
        }
        
        buffer += decoder.decode(value, { stream: true })
        
        // Process SSE events (data: {...}\n\n format)
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            
            if (data === '[DONE]') {
              onComplete?.({ response: fullContent, conversationId })
              return
            }
            
            try {
              const parsed = JSON.parse(data)
              
              switch (parsed.type) {
                case 'token':
                  fullContent += parsed.content || ''
                  onToken?.(parsed.content)
                  break
                  
                case 'tool_call':
                  onToolCall?.(parsed)
                  break
                  
                case 'metadata':
                  conversationId = parsed.conversationId || conversationId
                  break
                  
                case 'error':
                  onError?.(parsed.error)
                  return
                  
                default:
                  // Handle raw content chunks
                  if (parsed.content) {
                    fullContent += parsed.content
                    onToken?.(parsed.content)
                  }
              }
            } catch (parseError) {
              // If not JSON, treat as raw token
              if (data && data !== '') {
                fullContent += data
                onToken?.(data)
              }
            }
          }
        }
      }
      
      // Stream ended without [DONE]
      onComplete?.({ response: fullContent, conversationId })
      
    } catch (error) {
      console.error('[Echo Stream Error]', error)
      onError?.(error.message)
    }
  },
  
  /**
   * Send a message to Echo (non-streaming, for simple requests)
   * Use streamChat for better UX in most cases
   */
  chat: async (params) => {
    const response = await signalApi.post('/echo/chat', {
      message: params.message,
      conversationId: params.conversationId,
      skill: params.skill,
    })
    return response.data.data
  },
  
  /**
   * Send a message to a specific skill (bypasses router)
   */
  moduleChat: async (skill, params) => {
    const response = await signalApi.post(`/echo/module/${skill}`, {
      message: params.message,
      conversationId: params.conversationId,
    })
    return response.data.data
  },
  
  /**
   * List user's Echo conversations
   */
  listConversations: async (params = {}) => {
    const response = await signalApi.get('/echo/conversations', { params })
    return response.data.data
  },
  
  /**
   * Get a specific conversation with messages
   */
  getConversation: async (conversationId) => {
    const response = await signalApi.get(`/echo/conversation/${conversationId}`)
    return response.data.data
  },
  
  /**
   * Rate an Echo response (for learning)
   */
  rateResponse: async (params) => {
    const response = await signalApi.post('/echo/rate', {
      messageId: params.messageId,
      conversationId: params.conversationId,
      rating: params.rating,
      feedbackType: params.feedbackType,
      correction: params.correction,
      issueCategory: params.issueCategory,
    })
    return response.data.data
  },
  
  /**
   * Close/end a conversation
   */
  closeConversation: async (conversationId, reason) => {
    const response = await signalApi.put(`/echo/conversation/${conversationId}/close`, { reason })
    return response.data.data
  },
  
  /**
   * Get conversation summary
   */
  getConversationSummary: async (conversationId) => {
    const response = await signalApi.get(`/echo/conversation/${conversationId}/summary`)
    return response.data.data
  },
  
  /**
   * Invoke a skill tool directly (programmatic access)
   */
  invokeTool: async (params) => {
    const response = await signalApi.post('/echo/tool-invoke', {
      skill: params.skill,
      tool: params.tool,
      params: params.params,
      conversationId: params.conversationId,
      tenantId: params.tenantId,
    })
    return response.data.data
  },
}

// ============================================================================
// Skills API - Direct skill invocation
// ============================================================================

export const skillsApi = {
  /**
   * List available skills
   */
  listSkills: async () => {
    const response = await signalApi.get('/skills')
    return response.data.data
  },
  
  /**
   * Get skill definition
   */
  getSkill: async (skillKey) => {
    const response = await signalApi.get(`/skills/${skillKey}`)
    return response.data.data
  },
  
  /**
   * Invoke a skill tool
   */
  invoke: async (skillKey, tool, params) => {
    const response = await signalApi.post(`/skills/${skillKey}/${tool}`, params)
    return response.data.data
  },
}

// ============================================================================
// Knowledge API - RAG and knowledge base
// ============================================================================

export const knowledgeApi = {
  /**
   * Search knowledge base
   */
  search: async (query, params = {}) => {
    const response = await signalApi.post('/knowledge/search', { query, ...params })
    return response.data.data
  },
  
  /**
   * List knowledge chunks
   */
  list: async (params = {}) => {
    const response = await signalApi.get('/knowledge', { params })
    return response.data.data
  },
  
  /**
   * Add knowledge chunk
   */
  add: async (data) => {
    const response = await signalApi.post('/knowledge', data)
    return response.data.data
  },
  
  /**
   * Sync knowledge from website
   */
  sync: async (params) => {
    const response = await signalApi.post('/knowledge/sync', params)
    return response.data.data
  },
}

// ============================================================================
// FAQs API
// ============================================================================

export const faqsApi = {
  list: async (params = {}) => {
    const response = await signalApi.get('/faqs', { params })
    return response.data.data
  },
  
  create: async (data) => {
    const response = await signalApi.post('/faqs', data)
    return response.data.data
  },
  
  update: async (id, data) => {
    const response = await signalApi.put(`/faqs/${id}`, data)
    return response.data.data
  },
  
  delete: async (id) => {
    const response = await signalApi.delete(`/faqs/${id}`)
    return response.data.data
  },
  
  generate: async (params) => {
    const response = await signalApi.post('/faqs/generate', params)
    return response.data.data
  },
  
  /**
   * Get FAQ generation job status
   */
  getJobStatus: async (jobId) => {
    const response = await signalApi.get(`/faqs/jobs/${jobId}`)
    return response.data.data
  },
  
  approve: async (id) => {
    const response = await signalApi.post(`/faqs/${id}/approve`)
    return response.data.data
  },
}

// ============================================================================
// Profile API - Client profile extraction
// ============================================================================

export const profileApi = {
  /**
   * Extract profile from website content
   */
  extract: async (params) => {
    const response = await signalApi.post('/profile/extract', params)
    return response.data.data
  },
  
  /**
   * Sync profile with SEO knowledge base
   */
  sync: async (params) => {
    const response = await signalApi.post('/profile/sync', params)
    return response.data.data
  },
  
  /**
   * Get current profile
   */
  get: async (params = {}) => {
    const response = await signalApi.get('/profile', { params })
    return response.data.data
  },
}

// ============================================================================
// Config API - Signal configuration management
// ============================================================================

export const configApi = {
  /**
   * Get Signal config for a project
   */
  get: async (projectId) => {
    const response = await signalApi.get('/config', { params: { projectId } })
    return response.data.data
  },
  
  /**
   * Initialize Signal config (wizard step)
   */
  init: async (projectId) => {
    const response = await signalApi.put('/config', { 
      action: 'init',
      projectId
    })
    return response.data.data
  },
  
  /**
   * Update Signal config
   */
  update: async (config, projectId) => {
    const response = await signalApi.put('/config', { config, projectId })
    return response.data.data
  },
}

// ============================================================================
// Setup API - Signal setup and training
// ============================================================================

export const setupApi = {
  /**
   * Get setup status for a project
   */
  getStatus: async (projectId) => {
    const response = await signalApi.get('/setup/status', { params: { projectId } })
    return response.data
  },
  
  /**
   * Run auto-setup (extract profile, sync knowledge, generate FAQs)
   */
  autoSetup: async (projectId) => {
    const response = await signalApi.post('/setup/auto', { projectId })
    return response.data
  },
}

// ============================================================================
// Engage AI API (Signal-powered engagement analysis)
// ============================================================================

export const engageAiApi = {
  /**
   * Analyze A/B tests with Signal AI
   */
  analyzeTests: async (params = {}) => {
    const response = await signalApi.post('/skills/engage/analyze-tests', params)
    return response.data.data
  },
  
  /**
   * Analyze engagement metrics with Signal AI
   */
  analyzeEngagement: async (params = {}) => {
    const response = await signalApi.post('/skills/engage/analyze', params)
    return response.data.data
  },
  
  /**
   * Design element via Echo conversation
   */
  designElement: async (params) => {
    const response = await signalApi.post('/echo/chat', {
      message: params.message,
      context: {
        mode: 'designer',
        projectId: params.projectId
      }
    })
    return response.data.data || response.data
  },
}

// ============================================================================
// Forms AI API (Signal-powered form design)
// ============================================================================

export const formsAiApi = {
  /**
   * Get AI-suggested form fields based on form purpose
   */
  suggestFields: async (params) => {
    const response = await signalApi.post('/skills/forms/suggest-fields', {
      formPurpose: params.formPurpose,
      formType: params.formType,
      targetAudience: params.targetAudience,
      conversationHistory: params.conversationHistory,
      existingFields: params.existingFields,
    })
    return response.data
  },
  
  /**
   * Continue form design conversation
   */
  continueDesign: async (params) => {
    const response = await signalApi.post('/skills/forms/continue-design', {
      message: params.message,
      conversationHistory: params.conversationHistory,
      currentFields: params.currentFields,
      formType: params.formType,
    })
    return response.data
  },
  
  /**
   * Optimize form for conversions
   */
  optimizeForm: async (params) => {
    const response = await signalApi.post('/skills/forms/optimize', {
      fields: params.fields,
      formType: params.formType,
      conversionRate: params.conversionRate,
      abandonmentPoints: params.abandonmentPoints,
    })
    return response.data
  },
  
  /**
   * Stream form design conversation via Echo
   * Opens a mini-conversation for form design
   */
  streamDesign: async (params, { onToken, onComplete, onError }) => {
    const headers = await getAuthHeaders()
    
    try {
      const response = await fetch(`${SIGNAL_API_URL}/echo/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: params.message,
          conversationId: params.conversationId,
          skill: 'forms', // Route to forms skill
          pageContext: {
            pageType: 'form-builder',
            formType: params.formType,
            existingFields: params.existingFields,
          },
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(errorData.error || errorData.message || `Request failed: ${response.status}`)
      }
      
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''
      
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          break
        }
        
        buffer += decoder.decode(value, { stream: true })
        
        // Process SSE events
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            
            if (data === '[DONE]') {
              onComplete?.({ response: fullContent })
              return
            }
            
            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'token' && parsed.content) {
                fullContent += parsed.content
                onToken?.(parsed.content)
              }
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      }
      
      onComplete?.({ response: fullContent })
    } catch (error) {
      console.error('[Forms AI Stream Error]', error)
      onError?.(error)
    }
  },
}

// ============================================================================
// SEO AI API (Signal-powered SEO AI features)
// ============================================================================
// 
// These call the Signal API's SEO skill endpoints.
// All endpoints use POST with projectId in the request body.
// API pattern: POST /skills/seo/{action} with { projectId, ...params }
//

export const signalSeoApi = {
  // AI Brain - Training & Knowledge
  // POST /skills/seo/train
  trainSite: async (projectId) => {
    const response = await signalApi.post('/skills/seo/train', { projectId })
    return response.data.data
  },
  
  // POST /skills/seo/brain (no knowledge endpoint - use brain with quick analysis)
  getProjectKnowledge: async (projectId) => {
    const response = await signalApi.post('/skills/seo/brain', { 
      projectId,
      analysisType: 'quick'
    })
    return response.data.data
  },
  
  // POST /skills/seo/brain
  runAiBrain: async (projectId, options = {}) => {
    const response = await signalApi.post('/skills/seo/brain', { 
      projectId,
      ...options 
    })
    return response.data.data
  },
  
  // Signal AI - Learning & Auto-Fixes (via quick-wins endpoint)
  // POST /skills/seo/quick-wins
  getSignalLearning: async (projectId, params = {}) => {
    const response = await signalApi.post('/skills/seo/quick-wins', { 
      projectId,
      ...params 
    })
    return response.data.data
  },
  
  // No direct auto-fix endpoint - returns suggestions only
  applySignalAutoFixes: async (projectId, fixes) => {
    console.warn('applySignalAutoFixes: Signal API returns suggestions, apply via Portal API')
    return { applied: false, message: 'Use Portal API to apply fixes' }
  },
  
  // POST /skills/seo/quick-wins for page suggestions
  getSignalSuggestions: async (projectId, pageUrl, params = {}) => {
    const response = await signalApi.post('/skills/seo/quick-wins', { 
      projectId,
      pageUrl,
      ...params 
    })
    return response.data.data
  },
  
  // AI Recommendations via quick-wins
  // POST /skills/seo/quick-wins
  getAiRecommendations: async (projectId, params = {}) => {
    const response = await signalApi.post('/skills/seo/quick-wins', { 
      projectId,
      ...params 
    })
    return response.data.data
  },
  
  // Recommendations are managed via Portal API, not Signal
  applyRecommendation: async (projectId, recommendationId) => {
    console.warn('applyRecommendation: Use Portal API seoApi.applyRecommendation()')
    return { applied: false, message: 'Use Portal API seoApi methods' }
  },
  
  applyRecommendations: async (projectId, recommendationIds) => {
    console.warn('applyRecommendations: Use Portal API seoApi.applyRecommendations()')
    return { applied: false, message: 'Use Portal API seoApi methods' }
  },
  
  dismissRecommendation: async (projectId, recommendationId) => {
    console.warn('dismissRecommendation: Use Portal API seoApi.dismissRecommendation()')
    return { applied: false, message: 'Use Portal API seoApi methods' }
  },
  
  // AI Page Analysis
  // POST /skills/seo/analyze-page
  analyzePageWithAi: async (projectId, url, options = {}) => {
    const response = await signalApi.post('/skills/seo/analyze-page', { 
      projectId,
      url,
      ...options 
    })
    return response.data.data
  },
  
  // AI Content Brief Generation
  // POST /skills/seo/content-brief
  generateContentBrief: async (projectId, data) => {
    const response = await signalApi.post('/skills/seo/content-brief', { 
      projectId,
      targetKeyword: data.targetKeyword || data.keyword,
      contentType: data.contentType
    })
    return response.data.data
  },
  
  // Blog AI Brain
  // POST /skills/seo/blog-ideas
  trainBlogAiBrain: async (projectId, options = {}) => {
    // No separate training - blog-ideas returns fresh ideas
    const response = await signalApi.post('/skills/seo/blog-ideas', { 
      projectId,
      ...options 
    })
    return response.data.data
  },
  
  // POST /skills/seo/blog-ideas
  getBlogAiSuggestions: async (projectId, params = {}) => {
    const response = await signalApi.post('/skills/seo/blog-ideas', { 
      projectId,
      topic: params.topic,
      count: params.count
    })
    return response.data.data
  },
  
  // Competitor Analysis (AI-powered)
  // POST /skills/seo/competitor-analysis
  analyzeCompetitorWithAi: async (projectId, competitorUrl) => {
    const response = await signalApi.post('/skills/seo/competitor-analysis', { 
      projectId,
      competitorUrl 
    })
    return response.data.data
  },
  
  // GSC AI Suggestions - use quick-wins which analyzes GSC data
  generateGscFixSuggestions: async (projectId) => {
    const response = await signalApi.post('/skills/seo/quick-wins', { 
      projectId,
      focusAreas: ['gsc', 'search-console']
    })
    return response.data.data
  },
  
  // Additional Signal API endpoints
  
  // POST /skills/seo/keyword-recommendations
  getKeywordRecommendations: async (projectId, pageUrl = null) => {
    const response = await signalApi.post('/skills/seo/keyword-recommendations', { 
      projectId,
      pageUrl 
    })
    return response.data.data
  },
  
  // POST /skills/seo/technical-audit
  runTechnicalAudit: async (projectId) => {
    const response = await signalApi.post('/skills/seo/technical-audit', { projectId })
    return response.data.data
  },
  
  // POST /skills/seo/schema
  generateSchema: async (projectId, pageUrl, schemaType) => {
    const response = await signalApi.post('/skills/seo/schema', { 
      projectId,
      pageUrl,
      schemaType 
    })
    return response.data.data
  },
  
  // POST /skills/seo/topic-clusters
  generateTopicClusters: async (projectId, seedKeyword = null) => {
    const response = await signalApi.post('/skills/seo/topic-clusters', { 
      projectId,
      seedKeyword 
    })
    return response.data.data
  },
  
  // POST /skills/seo/internal-links
  analyzeInternalLinks: async (projectId, pageUrl = null) => {
    const response = await signalApi.post('/skills/seo/internal-links', { 
      projectId,
      pageUrl 
    })
    return response.data.data
  },
  
  // POST /skills/seo/serp-analyze
  analyzeSerpForKeyword: async (projectId, keyword) => {
    const response = await signalApi.post('/skills/seo/serp-analyze', { 
      projectId,
      keyword 
    })
    return response.data.data
  },

  // POST /skills/seo/local-seo
  analyzeLocalSeo: async (projectId) => {
    const response = await signalApi.post('/skills/seo/local-seo', { 
      projectId 
    })
    return response.data.data
  },
}

// ============================================================================
// CRM AI API - Prospect Insights & Automation (Requires Signal)
// ============================================================================

export const crmAiApi = {
  /**
   * Analyze a prospect and get AI insights
   * @param {string} prospectId - Prospect ID to analyze
   * @param {Object} options - Optional analysis options
   * @returns {Promise<Object>} AI analysis with lead score, next actions, tags
   */
  analyzeProspect: async (prospectId, options = {}) => {
    const response = await signalApi.post(`/crm/prospects/${prospectId}/analyze`, options)
    return response.data
  },

  /**
   * Get lead score for a prospect
   * @param {string} prospectId - Prospect ID
   * @returns {Promise<Object>} Lead score with factors
   */
  getLeadScore: async (prospectId) => {
    const response = await signalApi.get(`/crm/prospects/${prospectId}/lead-score`)
    return response.data
  },

  /**
   * Suggest next best action for a prospect
   * @param {string} prospectId - Prospect ID
   * @param {Object} context - Optional context for better suggestions
   * @returns {Promise<Object>} Suggested action with reasoning
   */
  suggestNextAction: async (prospectId, context = {}) => {
    const response = await signalApi.post(`/crm/prospects/${prospectId}/suggest-action`, context)
    return response.data
  },

  /**
   * Draft an email for a prospect
   * @param {string} prospectId - Prospect ID
   * @param {Object} options - Email options (type, purpose, tone)
   * @returns {Promise<Object>} Draft email with subject and body
   */
  draftEmail: async (prospectId, options = {}) => {
    const response = await signalApi.post(`/crm/prospects/${prospectId}/draft-email`, options)
    return response.data
  },

  /**
   * Summarize prospect interaction history
   * @param {string} prospectId - Prospect ID
   * @returns {Promise<Object>} Summary of all interactions
   */
  summarizeHistory: async (prospectId) => {
    const response = await signalApi.get(`/crm/prospects/${prospectId}/summary`)
    return response.data
  },

  /**
   * Get smart tag suggestions for a prospect
   * @param {string} prospectId - Prospect ID
   * @returns {Promise<Object>} Suggested tags with confidence scores
   */
  suggestTags: async (prospectId) => {
    const response = await signalApi.get(`/crm/prospects/${prospectId}/suggest-tags`)
    return response.data
  },

  /**
   * Get pipeline predictions for a prospect
   * @param {string} prospectId - Prospect ID
   * @returns {Promise<Object>} Stage prediction with probability and timeline
   */
  getPipelinePrediction: async (prospectId) => {
    const response = await signalApi.get(`/crm/prospects/${prospectId}/predict-pipeline`)
    return response.data
  },

  /**
   * Get dashboard AI insights for all prospects
   * @param {Object} options - Filter options
   * @returns {Promise<Object>} Dashboard-level insights and trends
   */
  getDashboardInsights: async (options = {}) => {
    const response = await signalApi.post('/crm/dashboard-insights', options)
    return response.data
  },
}

// ============================================================================
// Budget API - Token Budget & Usage Management
// ============================================================================

// ============================================================================
// Sync API - AI-Powered Calendar & Planning (Requires Signal)
// ============================================================================

export const syncApi = {
  /**
   * Get calendar overview with availability
   * @param {string} date - Date in YYYY-MM-DD format (optional, defaults to today)
   * @returns {Promise<Object>} Calendar overview with events, availability, and AI insights
   */
  getCalendar: async (date) => {
    const params = date ? { date } : {}
    const response = await signalApi.get('/sync/calendar', { params })
    return response.data
  },

  /**
   * Get AI-powered meeting preparation
   * @param {string} eventId - Calendar event ID to prepare for
   * @param {Object} options - Optional prep options
   * @returns {Promise<Object>} Meeting prep with attendee context, talking points, insights
   */
  getMeetingPrep: async (eventId, options = {}) => {
    const response = await signalApi.post('/sync/meeting-prep', { eventId, ...options })
    return response.data
  },

  /**
   * Get AI-generated daily briefing
   * @param {Object} options - Optional briefing options
   * @returns {Promise<Object>} Daily briefing with priorities, prep notes, recommendations
   */
  getDailyBriefing: async (options = {}) => {
    const response = await signalApi.post('/sync/daily-briefing', options)
    return response.data
  },

  /**
   * Get focus time recommendations
   * @param {Object} options - Optional focus options
   * @returns {Promise<Object>} Focus time recommendations and available slots
   */
  getFocusTime: async (options = {}) => {
    const response = await signalApi.post('/sync/focus-time', options)
    return response.data
  },

  /**
   * AI-powered task scheduling
   * @param {Object} task - Task to schedule
   * @param {string} task.title - Task title
   * @param {number} task.estimatedMinutes - Estimated duration
   * @param {string} task.priority - Priority level
   * @param {string} task.deadline - Optional deadline
   * @returns {Promise<Object>} Scheduling recommendation with time slot and reasoning
   */
  scheduleTask: async (task) => {
    const response = await signalApi.post('/sync/schedule-task', task)
    return response.data
  },

  /**
   * Block focus time on calendar
   * @param {Object} slot - Time slot to block
   * @param {string} slot.start - Start time ISO string
   * @param {string} slot.end - End time ISO string
   * @param {string} slot.title - Block title
   * @returns {Promise<Object>} Created calendar block
   */
  blockFocusTime: async (slot) => {
    const response = await signalApi.post('/sync/focus-time/block', slot)
    return response.data
  },
}

// ============================================================================
// Budget API - Token Budget & Usage Management
// ============================================================================

export const budgetApi = {
  /**
   * Get budget status for an organization
   * @param {string} orgId - Organization ID
   * @returns {Promise<Object>} Budget status including isWithinBudget, tokensUsed, etc.
   */
  getOrgBudget: async (orgId) => {
    const response = await signalApi.get(`/budget/org/${orgId}`)
    return response.data
  },

  /**
   * Get detailed usage summary for an organization
   * @param {string} orgId - Organization ID
   * @param {number} days - Number of days to include (default 30)
   * @returns {Promise<Object>} Usage summary with breakdown by tier, method, project
   */
  getOrgUsage: async (orgId, days = 30) => {
    const response = await signalApi.get(`/budget/org/${orgId}/usage`, { params: { days } })
    return response.data
  },

  /**
   * Update budget configuration for an organization
   * @param {string} orgId - Organization ID
   * @param {Object} config - Budget configuration
   * @param {number|null} config.budgetTokens - Token limit (null = unlimited)
   * @param {number} config.alertThreshold - Alert threshold percentage (0-100)
   * @param {string} config.period - Budget period: 'monthly', 'weekly', 'daily'
   * @param {boolean} config.isRateLimited - Whether to enforce rate limiting
   * @returns {Promise<Object>} Updated budget status
   */
  updateOrgBudget: async (orgId, config) => {
    const response = await signalApi.post(`/budget/org/${orgId}`, config)
    return response.data
  },

  /**
   * Get usage summary for a specific project
   * @param {string} projectId - Project ID
   * @param {number} days - Number of days to include (default 30)
   * @returns {Promise<Object>} Project usage summary
   */
  getProjectUsage: async (projectId, days = 30) => {
    const response = await signalApi.get(`/budget/project/${projectId}`, { params: { days } })
    return response.data
  },

  /**
   * Get daily usage history for a project
   * @param {string} projectId - Project ID
   * @param {number} days - Number of days (default 30)
   * @returns {Promise<Object>} Daily usage history for charts
   */
  getProjectHistory: async (projectId, days = 30) => {
    const response = await signalApi.get(`/budget/project/${projectId}/history`, { params: { days } })
    return response.data
  },

  /**
   * Quick check if org can make AI calls
   * @param {string} orgId - Organization ID
   * @returns {Promise<boolean>} Whether the org can proceed with AI calls
   */
  canMakeCall: async (orgId) => {
    const response = await signalApi.get(`/budget/check/${orgId}`)
    return response.data.canProceed
  },
}

// ============================================================================
// Default Export
// ============================================================================

export default signalApi
export { signalApi }
