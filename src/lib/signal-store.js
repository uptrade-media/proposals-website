/**
 * Signal Store
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Zustand store for Signal AI state management.
 * Handles:
 * - Echo interface (chat UI)
 * - Signal Module (knowledge base, FAQs, widget config)
 * - Conversations and learning suggestions
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

const API_BASE = '/.netlify/functions/api/signal'
const MODULE_BASE = '/.netlify/functions'

export const useSignalStore = create(
  persist(
    (set, get) => ({
      // ─────────────────────────────────────────────────────────────────────────
      // Echo UI State
      // ─────────────────────────────────────────────────────────────────────────
      
      // Echo UI state
      isEchoOpen: false,
      isEchoMinimized: false,
      echoSkill: null,
      echoContextId: null,

      // Conversations
      conversations: [],
      activeConversation: null,
      messages: [],

      // Skills
      skills: [],
      skillsLoaded: false,

      // Memory (cached)
      memories: [],

      // Loading states
      isLoading: false,
      isSending: false,
      error: null,
      
      // ─────────────────────────────────────────────────────────────────────────
      // Signal Module State (Knowledge Base, FAQs, Widget Config)
      // ─────────────────────────────────────────────────────────────────────────
      
      // Config state
      moduleConfig: null,
      moduleConfigLoading: false,
      moduleConfigError: null,
      
      // Knowledge base state
      knowledge: [],
      knowledgeLoading: false,
      knowledgePagination: { page: 1, total: 0, pages: 0 },
      knowledgeStats: { total: 0, byType: {} },
      
      // FAQs state
      faqs: [],
      faqsLoading: false,
      faqsPagination: { page: 1, total: 0, pages: 0 },
      faqsStats: { pending: 0, approved: 0, rejected: 0 },
      
      // Widget conversations state
      widgetConversations: [],
      widgetConversationsLoading: false,
      widgetConversationsPagination: { page: 1, total: 0, pages: 0 },
      widgetConversationsStats: { total: 0, byStatus: {}, leadsCreated: 0 },
      activeWidgetConversation: null,
      activeWidgetMessages: [],
      
      // Learning suggestions state
      suggestions: [],
      suggestionsLoading: false,
      suggestionsPagination: { page: 1, total: 0, pages: 0 },
      suggestionsStats: { byStatus: {}, byType: {} },

      // ─────────────────────────────────────────────────────────────────────────
      // Echo Actions
      // ─────────────────────────────────────────────────────────────────────────

      openEcho: (skill = null, contextId = null) => {
        set({ 
          isEchoOpen: true, 
          isEchoMinimized: false,
          echoSkill: skill,
          echoContextId: contextId
        })
      },

      closeEcho: () => {
        set({ isEchoOpen: false })
      },

      toggleEcho: () => {
        set(state => ({ isEchoOpen: !state.isEchoOpen }))
      },

      minimizeEcho: (minimized = true) => {
        set({ isEchoMinimized: minimized })
      },

      // ─────────────────────────────────────────────────────────────────────────
      // Conversation Actions
      // ─────────────────────────────────────────────────────────────────────────

      /**
       * Send a message to Echo
       */
      sendMessage: async (message, options = {}) => {
        const { echoSkill, echoContextId, activeConversation } = get()
        set({ isSending: true, error: null })

        // Add user message optimistically
        set(state => ({
          messages: [...state.messages, { role: 'user', content: message }]
        }))

        try {
          const endpoint = options.skill || echoSkill 
            ? `${API_BASE}/echo/module`
            : `${API_BASE}/echo/chat`

          const payload = {
            message,
            conversationId: activeConversation?.id,
            ...(options.skill || echoSkill ? {
              skill: options.skill || echoSkill,
              contextId: options.contextId || echoContextId
            } : {})
          }

          const res = await axios.post(endpoint, payload)
          const { message: response, conversation_id, skill } = res.data

          // Update active conversation
          if (conversation_id && !activeConversation) {
            set({ activeConversation: { id: conversation_id, skill_key: skill } })
          }

          // Add assistant message
          set(state => ({
            messages: [...state.messages, { 
              role: 'assistant', 
              content: response,
              skill
            }],
            isSending: false
          }))

          return res.data

        } catch (error) {
          console.error('Signal send error:', error)
          set(state => ({
            messages: [...state.messages, { 
              role: 'error', 
              content: 'Sorry, I encountered an error. Please try again.'
            }],
            error: error.message,
            isSending: false
          }))
          throw error
        }
      },

      /**
       * Load conversation list
       */
      fetchConversations: async (skill = null) => {
        set({ isLoading: true, error: null })

        try {
          const params = skill ? `?skill=${skill}` : ''
          const res = await axios.get(`${API_BASE}/conversations${params}`)
          set({ conversations: res.data.conversations, isLoading: false })
          return res.data.conversations
        } catch (error) {
          console.error('Failed to fetch conversations:', error)
          set({ error: error.message, isLoading: false })
          return []
        }
      },

      /**
       * Load a specific conversation
       */
      loadConversation: async (conversationId) => {
        set({ isLoading: true, error: null })

        try {
          const res = await axios.get(`${API_BASE}/conversation/${conversationId}`)
          const { conversation, messages } = res.data

          set({ 
            activeConversation: conversation,
            messages: messages.map(m => ({
              role: m.role === 'echo' ? 'assistant' : m.role,
              content: m.content,
              skill: m.skill_key
            })),
            isLoading: false
          })

          return res.data
        } catch (error) {
          console.error('Failed to load conversation:', error)
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      /**
       * Start a new conversation
       */
      startNewConversation: () => {
        set({ 
          activeConversation: null, 
          messages: [] 
        })
      },

      /**
       * Rate the last response
       */
      rateResponse: async (rating, feedback = null) => {
        const { activeConversation } = get()
        if (!activeConversation?.id) return

        try {
          await axios.post(`${API_BASE}/conversation/rate`, {
            conversationId: activeConversation.id,
            rating,
            feedback
          })
        } catch (error) {
          console.error('Failed to rate:', error)
        }
      },

      // ─────────────────────────────────────────────────────────────────────────
      // Skill Actions
      // ─────────────────────────────────────────────────────────────────────────

      /**
       * Fetch available skills
       */
      fetchSkills: async () => {
        if (get().skillsLoaded) return get().skills

        try {
          const res = await axios.get(`${API_BASE}/skills`)
          set({ skills: res.data.skills, skillsLoaded: true })
          return res.data.skills
        } catch (error) {
          console.error('Failed to fetch skills:', error)
          return []
        }
      },

      /**
       * Invoke a specific tool
       */
      invokeTool: async (skill, tool, params = {}) => {
        set({ isLoading: true, error: null })

        try {
          const res = await axios.post(`${API_BASE}/invoke/${skill}/${tool}`, params)
          set({ isLoading: false })
          return res.data
        } catch (error) {
          console.error('Tool invocation error:', error)
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      // ─────────────────────────────────────────────────────────────────────────
      // Memory Actions
      // ─────────────────────────────────────────────────────────────────────────

      /**
       * Fetch Signal memories
       */
      fetchMemories: async (skill = null, type = null) => {
        try {
          const params = new URLSearchParams()
          if (skill) params.append('skill', skill)
          if (type) params.append('type', type)

          const res = await axios.get(`${API_BASE}/memory?${params}`)
          set({ memories: res.data.memories })
          return res.data.memories
        } catch (error) {
          console.error('Failed to fetch memories:', error)
          return []
        }
      },

      // ─────────────────────────────────────────────────────────────────────────
      // Signal Module Config Actions
      // ─────────────────────────────────────────────────────────────────────────
      
      fetchModuleConfig: async (projectId) => {
        set({ moduleConfigLoading: true, moduleConfigError: null })
        try {
          const res = await axios.get(`${MODULE_BASE}/signal-config?projectId=${projectId}`)
          set({ 
            moduleConfig: res.data.config, 
            moduleConfigLoading: false 
          })
          return res.data
        } catch (error) {
          set({ moduleConfigLoading: false, moduleConfigError: error.message })
          throw error
        }
      },
      
      updateModuleConfig: async (projectId, updates) => {
        set({ moduleConfigLoading: true })
        try {
          const res = await axios.put(`${MODULE_BASE}/signal-config`, {
            projectId,
            config: updates
          })
          set({ moduleConfig: res.data.config, moduleConfigLoading: false })
          return res.data
        } catch (error) {
          set({ moduleConfigLoading: false, moduleConfigError: error.message })
          throw error
        }
      },
      
      enableSignal: async (projectId) => {
        return get().updateModuleConfig(projectId, { is_enabled: true })
      },
      
      disableSignal: async (projectId) => {
        return get().updateModuleConfig(projectId, { is_enabled: false })
      },
      
      // ─────────────────────────────────────────────────────────────────────────
      // Knowledge Base Actions
      // ─────────────────────────────────────────────────────────────────────────
      
      fetchKnowledge: async (projectId, options = {}) => {
        set({ knowledgeLoading: true })
        try {
          const params = new URLSearchParams({ projectId, ...options })
          const res = await axios.get(`${MODULE_BASE}/signal-knowledge?${params}`)
          set({ 
            knowledge: res.data.chunks,
            knowledgePagination: res.data.pagination,
            knowledgeStats: res.data.stats,
            knowledgeLoading: false
          })
          return res.data
        } catch (error) {
          set({ knowledgeLoading: false })
          throw error
        }
      },
      
      addKnowledge: async (projectId, entry) => {
        const res = await axios.post(`${MODULE_BASE}/signal-knowledge`, {
          projectId,
          ...entry
        })
        await get().fetchKnowledge(projectId)
        return res.data
      },
      
      updateKnowledge: async (projectId, id, updates) => {
        const res = await axios.put(`${MODULE_BASE}/signal-knowledge`, {
          projectId,
          id,
          ...updates
        })
        set(state => ({
          knowledge: state.knowledge.map(k => k.id === id ? res.data.chunk : k)
        }))
        return res.data
      },
      
      deleteKnowledge: async (id) => {
        await axios.delete(`${MODULE_BASE}/signal-knowledge?id=${id}`)
        set(state => ({
          knowledge: state.knowledge.filter(k => k.id !== id)
        }))
      },
      
      // ─────────────────────────────────────────────────────────────────────────
      // FAQ Actions
      // ─────────────────────────────────────────────────────────────────────────
      
      fetchFaqs: async (projectId, options = {}) => {
        set({ faqsLoading: true })
        try {
          const params = new URLSearchParams({ projectId, ...options })
          const res = await axios.get(`${MODULE_BASE}/signal-faqs?${params}`)
          set({ 
            faqs: res.data.faqs,
            faqsPagination: res.data.pagination,
            faqsStats: res.data.stats,
            faqsLoading: false
          })
          return res.data
        } catch (error) {
          set({ faqsLoading: false })
          throw error
        }
      },
      
      createFaq: async (projectId, faq) => {
        const res = await axios.post(`${MODULE_BASE}/signal-faqs`, {
          projectId,
          ...faq
        })
        await get().fetchFaqs(projectId)
        return res.data
      },
      
      updateFaq: async (projectId, id, updates) => {
        const res = await axios.put(`${MODULE_BASE}/signal-faqs`, {
          projectId,
          id,
          ...updates
        })
        set(state => ({
          faqs: state.faqs.map(f => f.id === id ? res.data.faq : f)
        }))
        return res.data
      },
      
      approveFaq: async (projectId, id) => {
        const res = await axios.post(`${MODULE_BASE}/signal-faqs?id=${id}&action=approve`, { projectId })
        set(state => ({
          faqs: state.faqs.map(f => f.id === id ? res.data.faq : f)
        }))
        return res.data
      },
      
      rejectFaq: async (projectId, id) => {
        const res = await axios.post(`${MODULE_BASE}/signal-faqs?id=${id}&action=reject`, { projectId })
        set(state => ({
          faqs: state.faqs.map(f => f.id === id ? res.data.faq : f)
        }))
        return res.data
      },
      
      deleteFaq: async (id) => {
        await axios.delete(`${MODULE_BASE}/signal-faqs?id=${id}`)
        set(state => ({
          faqs: state.faqs.filter(f => f.id !== id)
        }))
      },
      
      // ─────────────────────────────────────────────────────────────────────────
      // Widget Conversation Actions
      // ─────────────────────────────────────────────────────────────────────────
      
      fetchWidgetConversations: async (projectId, options = {}) => {
        set({ widgetConversationsLoading: true })
        try {
          const params = new URLSearchParams({ projectId, ...options })
          const res = await axios.get(`${MODULE_BASE}/signal-conversations?${params}`)
          set({ 
            widgetConversations: res.data.conversations,
            widgetConversationsPagination: res.data.pagination,
            widgetConversationsStats: res.data.stats,
            widgetConversationsLoading: false
          })
          return res.data
        } catch (error) {
          set({ widgetConversationsLoading: false })
          throw error
        }
      },
      
      fetchWidgetConversation: async (conversationId) => {
        set({ widgetConversationsLoading: true })
        try {
          const res = await axios.get(`${MODULE_BASE}/signal-conversations?id=${conversationId}`)
          set({ 
            activeWidgetConversation: res.data.conversation,
            activeWidgetMessages: res.data.messages,
            widgetConversationsLoading: false
          })
          return res.data
        } catch (error) {
          set({ widgetConversationsLoading: false })
          throw error
        }
      },
      
      closeWidgetConversation: async (conversationId) => {
        const res = await axios.put(`${MODULE_BASE}/signal-conversations`, {
          id: conversationId,
          status: 'closed'
        })
        set(state => ({
          widgetConversations: state.widgetConversations.map(c => 
            c.id === conversationId ? res.data.conversation : c
          ),
          activeWidgetConversation: state.activeWidgetConversation?.id === conversationId 
            ? res.data.conversation 
            : state.activeWidgetConversation
        }))
        return res.data
      },
      
      // ─────────────────────────────────────────────────────────────────────────
      // Learning Suggestions Actions
      // ─────────────────────────────────────────────────────────────────────────
      
      fetchSuggestions: async (projectId, options = {}) => {
        set({ suggestionsLoading: true })
        try {
          const params = new URLSearchParams({ projectId, ...options })
          const res = await axios.get(`${MODULE_BASE}/signal-learning?${params}`)
          set({ 
            suggestions: res.data.suggestions,
            suggestionsPagination: res.data.pagination,
            suggestionsStats: res.data.stats,
            suggestionsLoading: false
          })
          return res.data
        } catch (error) {
          set({ suggestionsLoading: false })
          throw error
        }
      },
      
      approveSuggestion: async (projectId, suggestionId) => {
        const res = await axios.post(
          `${MODULE_BASE}/signal-learning?id=${suggestionId}&action=approve`,
          { projectId }
        )
        set(state => ({
          suggestions: state.suggestions.map(s => 
            s.id === suggestionId ? res.data.suggestion : s
          )
        }))
        return res.data
      },
      
      applySuggestion: async (projectId, suggestionId) => {
        const res = await axios.post(
          `${MODULE_BASE}/signal-learning?id=${suggestionId}&action=apply`,
          { projectId }
        )
        set(state => ({
          suggestions: state.suggestions.map(s => 
            s.id === suggestionId ? res.data.suggestion : s
          )
        }))
        return res.data
      },
      
      rejectSuggestion: async (projectId, suggestionId, reason) => {
        const res = await axios.post(
          `${MODULE_BASE}/signal-learning?id=${suggestionId}&action=reject`,
          { projectId, reason }
        )
        set(state => ({
          suggestions: state.suggestions.map(s => 
            s.id === suggestionId ? res.data.suggestion : s
          )
        }))
        return res.data
      },
      
      deferSuggestion: async (projectId, suggestionId) => {
        const res = await axios.post(
          `${MODULE_BASE}/signal-learning?id=${suggestionId}&action=defer`,
          { projectId }
        )
        set(state => ({
          suggestions: state.suggestions.map(s => 
            s.id === suggestionId ? res.data.suggestion : s
          )
        }))
        return res.data
      },

      // ─────────────────────────────────────────────────────────────────────────
      // Reset
      // ─────────────────────────────────────────────────────────────────────────

      reset: () => {
        set({
          // Echo state
          conversations: [],
          activeConversation: null,
          messages: [],
          isEchoOpen: false,
          isEchoMinimized: false,
          echoSkill: null,
          echoContextId: null,
          error: null,
          // Module state
          moduleConfig: null,
          moduleConfigLoading: false,
          moduleConfigError: null,
          knowledge: [],
          knowledgeLoading: false,
          faqs: [],
          faqsLoading: false,
          widgetConversations: [],
          widgetConversationsLoading: false,
          activeWidgetConversation: null,
          activeWidgetMessages: [],
          suggestions: [],
          suggestionsLoading: false
        })
      }
    }),
    {
      name: 'signal-store',
      partialize: (state) => ({
        // Only persist UI preferences
        isEchoOpen: state.isEchoOpen,
        isEchoMinimized: state.isEchoMinimized
      })
    }
  )
)

// ═══════════════════════════════════════════════════════════════════════════════
// Selectors
// ═══════════════════════════════════════════════════════════════════════════════

// Echo selectors
export const selectIsEchoOpen = (state) => state.isEchoOpen
export const selectMessages = (state) => state.messages
export const selectActiveConversation = (state) => state.activeConversation
export const selectSkills = (state) => state.skills
export const selectIsSending = (state) => state.isSending

// Signal Module selectors
export const selectModuleConfig = (state) => state.moduleConfig
export const selectModuleConfigLoading = (state) => state.moduleConfigLoading
export const selectIsSignalEnabled = (state) => state.moduleConfig?.is_enabled || false
export const selectKnowledge = (state) => state.knowledge
export const selectKnowledgeStats = (state) => state.knowledgeStats
export const selectFaqs = (state) => state.faqs
export const selectFaqsStats = (state) => state.faqsStats
export const selectWidgetConversations = (state) => state.widgetConversations
export const selectWidgetConversationsStats = (state) => state.widgetConversationsStats
export const selectSuggestions = (state) => state.suggestions
export const selectSuggestionsStats = (state) => state.suggestionsStats

export default useSignalStore
