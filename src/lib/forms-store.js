/**
 * Forms Store
 * Zustand store for managing forms and form submissions
 */

import { create } from 'zustand'
import { formsApi } from './portal-api'
import useAuthStore from './auth-store'

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
      // Auto-include projectId from auth store if not explicitly provided
      const { currentProject } = useAuthStore.getState()
      const params = { ...options }
      if (currentProject?.id && !params.projectId) {
        params.projectId = currentProject.id
      }
      const response = await formsApi.list(params)
      const forms = response.data?.forms || response.data || []
      set({ forms, isLoading: false })
      return forms
    } catch (error) {
      console.error('Error fetching forms:', error)
      set({ error: error.message, isLoading: false })
      return []
    }
  },

  fetchForm: async (formId) => {
    set({ isLoading: true, error: null })
    try {
      const response = await formsApi.get(formId)
      const form = response.data?.form || response.data
      set({ currentForm: form, isLoading: false })
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
      const response = await formsApi.create(formData)
      const newForm = response.data?.form || response.data
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

  updateForm: async (formId, formData) => {
    set({ isLoading: true, error: null })
    try {
      const response = await formsApi.update(formId, formData)
      const updatedForm = response.data?.form || response.data
      set(state => ({
        forms: state.forms.map(f => f.id === formId ? updatedForm : f),
        currentForm: state.currentForm?.id === formId ? updatedForm : state.currentForm,
        isLoading: false
      }))
      return updatedForm
    } catch (error) {
      console.error('Error updating form:', error)
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  deleteForm: async (formId) => {
    set({ isLoading: true, error: null })
    try {
      await formsApi.delete(formId)
      set(state => ({
        forms: state.forms.filter(f => f.id !== formId),
        currentForm: state.currentForm?.id === formId ? null : state.currentForm,
        isLoading: false
      }))
    } catch (error) {
      console.error('Error deleting form:', error)
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  // Submissions actions
  fetchSubmissions: async (options = {}) => {
    const { filters, pagination } = get()
    set({ isLoadingSubmissions: true, error: null })
    
    try {
      // Auto-include projectId from auth store if not explicitly provided
      const { currentProject } = useAuthStore.getState()
      
      const params = {
        // Project filtering
        projectId: options.projectId || (currentProject?.id || undefined),
        // Tenant filtering for "My Sales" view
        tenantId: options.tenantId,
        // Apply filters
        formId: options.formId || filters.formId,
        status: (options.status || filters.status) !== 'all' ? (options.status || filters.status) : undefined,
        search: options.search || filters.search || undefined,
        // Pagination
        page: options.page || pagination.page,
        limit: options.limit || pagination.limit,
        sortBy: options.sortBy || 'created_at',
        sortOrder: options.sortOrder || 'desc'
      }

      const response = await formsApi.listSubmissions(params)
      const data = response.data || response
      
      set({ 
        submissions: data.submissions || [], 
        pagination: data.pagination || pagination,
        isLoadingSubmissions: false 
      })
      
      return data
    } catch (error) {
      console.error('Error fetching submissions:', error)
      set({ error: error.message, isLoadingSubmissions: false })
      return { submissions: [], pagination: {} }
    }
  },

  fetchSubmission: async (submissionId) => {
    set({ isLoadingSubmissions: true, error: null })
    try {
      const response = await formsApi.getSubmission(submissionId)
      const submission = response.data || response
      set({ currentSubmission: submission, isLoadingSubmissions: false })
      return submission
    } catch (error) {
      console.error('Error fetching submission:', error)
      set({ error: error.message, isLoadingSubmissions: false })
      return null
    }
  },

  updateSubmission: async (submissionId, updates) => {
    try {
      const response = await formsApi.updateSubmission(submissionId, updates)
      const updatedSubmission = response.data?.submission || response.data
      
      // Update in local state
      set(state => ({
        submissions: state.submissions.map(s => 
          s.id === submissionId ? { ...s, ...updatedSubmission } : s
        ),
        currentSubmission: state.currentSubmission?.submission?.id === submissionId
          ? { ...state.currentSubmission, submission: updatedSubmission }
          : state.currentSubmission
      }))
      
      return updatedSubmission
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
