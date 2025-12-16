/**
 * Forms Store
 * Zustand store for managing forms and form submissions
 */

import { create } from 'zustand'
import api from './api'

export const useFormsStore = create((set, get) => ({
  // State
  forms: [],
  currentForm: null,
  submissions: [],
  currentSubmission: null,
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasMore: false
  },
  filters: {
    formId: null,
    status: 'all',
    search: ''
  },
  isLoading: false,
  isLoadingSubmissions: false,
  error: null,

  // Forms actions
  fetchForms: async (options = {}) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (options.tenantId) params.append('tenant_id', options.tenantId)
      if (options.includeGlobal) params.append('include_global', 'true')

      const response = await api.get(`/.netlify/functions/forms-list?${params}`)
      set({ forms: response.data.forms, isLoading: false })
      return response.data.forms
    } catch (error) {
      console.error('Error fetching forms:', error)
      set({ error: error.message, isLoading: false })
      return []
    }
  },

  fetchForm: async (formId) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get(`/.netlify/functions/forms-get?id=${formId}`)
      set({ currentForm: response.data.form, isLoading: false })
      return response.data
    } catch (error) {
      console.error('Error fetching form:', error)
      set({ error: error.message, isLoading: false })
      return null
    }
  },

  createForm: async (formData) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post('/.netlify/functions/forms-create', formData)
      const newForm = response.data.form
      set(state => ({
        forms: [newForm, ...state.forms],
        isLoading: false
      }))
      return newForm
    } catch (error) {
      console.error('Error creating form:', error)
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  // Submissions actions
  fetchSubmissions: async (options = {}) => {
    const { filters, pagination } = get()
    set({ isLoadingSubmissions: true, error: null })
    
    try {
      const params = new URLSearchParams()
      
      // Tenant filtering for "My Sales" view
      if (options.tenantId) {
        params.append('tenant_id', options.tenantId)
      }
      
      // Apply filters
      if (options.formId || filters.formId) {
        params.append('form_id', options.formId || filters.formId)
      }
      if (options.status || filters.status !== 'all') {
        params.append('status', options.status || filters.status)
      }
      if (options.search || filters.search) {
        params.append('search', options.search || filters.search)
      }
      
      // Pagination
      params.append('page', options.page || pagination.page)
      params.append('limit', options.limit || pagination.limit)
      params.append('sort_by', options.sortBy || 'created_at')
      params.append('sort_order', options.sortOrder || 'desc')

      const response = await api.get(`/.netlify/functions/form-submissions-list?${params}`)
      
      set({ 
        submissions: response.data.submissions, 
        pagination: response.data.pagination,
        isLoadingSubmissions: false 
      })
      
      return response.data
    } catch (error) {
      console.error('Error fetching submissions:', error)
      set({ error: error.message, isLoadingSubmissions: false })
      return { submissions: [], pagination: {} }
    }
  },

  fetchSubmission: async (submissionId) => {
    set({ isLoadingSubmissions: true, error: null })
    try {
      const response = await api.get(`/.netlify/functions/form-submissions-get?id=${submissionId}`)
      set({ currentSubmission: response.data, isLoadingSubmissions: false })
      return response.data
    } catch (error) {
      console.error('Error fetching submission:', error)
      set({ error: error.message, isLoadingSubmissions: false })
      return null
    }
  },

  updateSubmission: async (submissionId, updates) => {
    try {
      const response = await api.put('/.netlify/functions/form-submissions-update', {
        id: submissionId,
        ...updates
      })
      
      // Update in local state
      set(state => ({
        submissions: state.submissions.map(s => 
          s.id === submissionId ? { ...s, ...response.data.submission } : s
        ),
        currentSubmission: state.currentSubmission?.submission?.id === submissionId
          ? { ...state.currentSubmission, submission: response.data.submission }
          : state.currentSubmission
      }))
      
      return response.data.submission
    } catch (error) {
      console.error('Error updating submission:', error)
      throw error
    }
  },

  // Filter actions
  setFilters: (newFilters) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters },
      pagination: { ...state.pagination, page: 1 }
    }))
  },

  setPage: (page) => {
    set(state => ({
      pagination: { ...state.pagination, page }
    }))
  },

  clearFilters: () => {
    set({
      filters: { formId: null, status: 'all', search: '' },
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0, hasMore: false }
    })
  },

  // Clear current selection
  clearCurrentSubmission: () => {
    set({ currentSubmission: null })
  },

  clearCurrentForm: () => {
    set({ currentForm: null })
  }
}))

export default useFormsStore
