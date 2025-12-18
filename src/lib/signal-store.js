/**
 * Signal Store
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Zustand store for Signal AI state management.
 * Handles conversations, skills, and Echo interface state.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

const API_BASE = '/.netlify/functions/api/signal'

export const useSignalStore = create(
  persist(
    (set, get) => ({
      // ─────────────────────────────────────────────────────────────────────────
      // State
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
      // Reset
      // ─────────────────────────────────────────────────────────────────────────

      reset: () => {
        set({
          conversations: [],
          activeConversation: null,
          messages: [],
          isEchoOpen: false,
          isEchoMinimized: false,
          echoSkill: null,
          echoContextId: null,
          error: null
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

export const selectIsEchoOpen = (state) => state.isEchoOpen
export const selectMessages = (state) => state.messages
export const selectActiveConversation = (state) => state.activeConversation
export const selectSkills = (state) => state.skills
export const selectIsSending = (state) => state.isSending

export default useSignalStore
