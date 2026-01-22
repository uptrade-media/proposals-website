import { create } from 'zustand'
import { proposalsApi } from './portal-api'

export const useProposalsStore = create((set, get) => ({
  // State
  proposals: [],
  currentProposal: null,
  templates: [],
  isLoading: false,
  isCreating: false,
  error: null,
  filters: {
    status: '',
    search: '',
    sortBy: 'updated', // created, updated, title, validUntil
  },

  // ========== List Operations ==========
  fetchProposals: async () => {
    set({ isLoading: true, error: null })
    try {
      // Increase limit to 100 to ensure recent proposals are visible
      const response = await proposalsApi.list({ limit: 100 })
      set({ proposals: response.data?.proposals || response.data || [], isLoading: false })
      return { success: true }
    } catch (err) {
      const error = err.response?.data?.error || 'Failed to fetch proposals'
      set({ error, isLoading: false })
      return { success: false, error }
    }
  },

  fetchProposal: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const response = await proposalsApi.get(id)
      const proposal = response.data?.proposal || response.data
      set({ currentProposal: proposal, isLoading: false })
      return { success: true, proposal }
    } catch (err) {
      const error = err.response?.data?.error || 'Failed to fetch proposal'
      set({ error, isLoading: false })
      return { success: false, error }
    }
  },

  // Fetch proposal templates
  fetchTemplates: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await proposalsApi.listTemplates()
      const templates = response.data?.templates || response.data || []
      set({ templates, isLoading: false })
      return { success: true, templates }
    } catch (err) {
      const error = err.response?.data?.error || 'Failed to fetch templates'
      set({ error, templates: [], isLoading: false })
      return { success: false, error }
    }
  },

  // ========== CRUD Operations ==========
  createProposal: async (data) => {
    set({ isCreating: true, error: null })
    try {
      const response = await proposalsApi.create(data)
      const newProposal = response.data?.proposal || response.data
      set(state => ({
        proposals: [newProposal, ...state.proposals],
        currentProposal: newProposal,
        isCreating: false
      }))
      return { success: true, proposal: newProposal }
    } catch (err) {
      const error = err.response?.data?.error || 'Failed to create proposal'
      set({ error, isCreating: false })
      return { success: false, error }
    }
  },

  updateProposal: async (id, data) => {
    set({ isCreating: true, error: null })
    try {
      const response = await proposalsApi.update(id, data)
      const updated = response.data?.proposal || response.data
      set(state => ({
        proposals: state.proposals.map(p => p.id === id ? updated : p),
        currentProposal: state.currentProposal?.id === id ? updated : state.currentProposal,
        isCreating: false
      }))
      return { success: true, proposal: updated }
    } catch (err) {
      const error = err.response?.data?.error || 'Failed to update proposal'
      set({ error, isCreating: false })
      return { success: false, error }
    }
  },

  deleteProposal: async (id) => {
    set({ isCreating: true, error: null })
    try {
      await proposalsApi.delete(id)
      set(state => ({
        proposals: state.proposals.filter(p => p.id !== id),
        currentProposal: state.currentProposal?.id === id ? null : state.currentProposal,
        isCreating: false
      }))
      return { success: true }
    } catch (err) {
      const error = err.response?.data?.error || 'Failed to delete proposal'
      set({ error, isCreating: false })
      return { success: false, error }
    }
  },

  // ========== Lifecycle Operations ==========
  /**
   * Send proposal to one or more recipients
   * @param {string} id - Proposal ID
   * @param {Object} data - Send options
   * @param {string[]} data.recipients - Array of email addresses
   * @param {string} data.subject - Email subject line
   * @param {string} data.personalMessage - Personal message to include
   */
  sendProposal: async (id, data) => {
    set({ error: null })
    try {
      // Normalize recipients to always be an array
      const sendData = {
        ...data,
        recipients: Array.isArray(data.recipients) 
          ? data.recipients 
          : data.email 
            ? [data.email] 
            : data.recipients
      }
      const response = await proposalsApi.send(id, sendData)
      const updated = response.data?.proposal || response.data
      set(state => ({
        proposals: state.proposals.map(p => p.id === id ? updated : p),
        currentProposal: state.currentProposal?.id === id ? updated : state.currentProposal,
      }))
      return { 
        success: true, 
        proposal: updated,
        recipients: response.data?.recipients,
        successCount: response.data?.successCount,
        failedCount: response.data?.failedCount,
        message: response.data?.message
      }
    } catch (err) {
      const error = err.response?.data?.error || 'Failed to send proposal'
      set({ error })
      return { success: false, error }
    }
  },

  acceptProposal: async (id, data) => {
    set({ error: null })
    try {
      const response = await proposalsApi.accept(id, data)
      const updated = response.data?.proposal || response.data
      set(state => ({
        proposals: state.proposals.map(p => p.id === id ? updated : p),
        currentProposal: state.currentProposal?.id === id ? updated : state.currentProposal,
      }))
      return { success: true, proposal: updated }
    } catch (err) {
      const error = err.response?.data?.error || 'Failed to accept proposal'
      set({ error })
      return { success: false, error }
    }
  },

  declineProposal: async (id, reason) => {
    set({ error: null })
    try {
      const response = await proposalsApi.decline(id, { reason })
      const updated = response.data?.proposal || response.data
      set(state => ({
        proposals: state.proposals.map(p => p.id === id ? updated : p),
        currentProposal: state.currentProposal?.id === id ? updated : state.currentProposal,
      }))
      return { success: true, proposal: updated }
    } catch (err) {
      const error = err.response?.data?.error || 'Failed to decline proposal'
      set({ error })
      return { success: false, error }
    }
  },

  // ========== Activity & Tracking ==========
  trackProposalView: async (id) => {
    try {
      await proposalsApi.trackView(id)
      // Update local state if needed
      set(state => {
        if (state.currentProposal?.id === id) {
          return {
            currentProposal: {
              ...state.currentProposal,
              viewedAt: new Date().toISOString()
            }
          }
        }
        return state
      })
    } catch (err) {
      console.error('Failed to track proposal view:', err)
    }
  },

  // ========== UI Actions ==========
  setFilter: (filterName, value) => {
    set(state => ({
      filters: { ...state.filters, [filterName]: value }
    }))
  },

  clearError: () => set({ error: null }),
  clearCurrentProposal: () => set({ currentProposal: null })
}))

export default useProposalsStore
