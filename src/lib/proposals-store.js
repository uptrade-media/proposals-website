import { create } from 'zustand'
import api from './api'

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
      const response = await api.get('/.netlify/functions/proposals-list')
      set({ proposals: response.data.proposals || [], isLoading: false })
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
      const response = await api.get(`/.netlify/functions/proposals-get?id=${id}`)
      set({ currentProposal: response.data.proposal, isLoading: false })
      return { success: true, proposal: response.data.proposal }
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
      const response = await api.get('/.netlify/functions/proposal-templates-list')
      set({ templates: response.data.templates || [], isLoading: false })
      return { success: true, templates: response.data.templates }
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
      const response = await api.post('/.netlify/functions/proposals-create', data)
      const newProposal = response.data.proposal
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
      const response = await api.put(`/.netlify/functions/proposals-update?id=${id}`, data)
      const updated = response.data.proposal
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
      await api.delete(`/.netlify/functions/proposals-delete?id=${id}`)
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
  sendProposal: async (id, data) => {
    set({ error: null })
    try {
      const response = await api.post(`/.netlify/functions/proposals-send?id=${id}`, data)
      const updated = response.data.proposal
      set(state => ({
        proposals: state.proposals.map(p => p.id === id ? updated : p),
        currentProposal: state.currentProposal?.id === id ? updated : state.currentProposal,
      }))
      return { success: true, proposal: updated }
    } catch (err) {
      const error = err.response?.data?.error || 'Failed to send proposal'
      set({ error })
      return { success: false, error }
    }
  },

  acceptProposal: async (id, data) => {
    set({ error: null })
    try {
      const response = await api.post(`/.netlify/functions/proposals-accept?id=${id}`, data)
      const updated = response.data.proposal
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
      const response = await api.post(`/.netlify/functions/proposals-decline?id=${id}`, { reason })
      const updated = response.data.proposal
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
      await api.post(`/.netlify/functions/proposals-track-view?id=${id}`, {})
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
