import { create } from 'zustand'
import api from './api'

const useProjectsStore = create((set, get) => ({
  projects: [],
  currentProject: null,
  proposals: [],
  currentProposal: null,
  isLoading: false,
  error: null,

  // Clear error
  clearError: () => set({ error: null }),

  // Fetch all projects
  fetchProjects: async () => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.get('/.netlify/functions/projects-list')
      set({ 
        projects: response.data.projects || [],
        isLoading: false 
      })
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch projects'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Fetch single project
  fetchProject: async (projectId) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.get(`/.netlify/functions/projects-get/${projectId}`)
      set({ 
        currentProject: response.data.project,
        isLoading: false 
      })
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch project'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Create new project
  createProject: async (projectData) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.post('/.netlify/functions/projects-create', projectData)
      
      // Add new project to the list
      set(state => ({ 
        projects: [...state.projects, response.data.project],
        isLoading: false 
      }))
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to create project'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Update project
  updateProject: async (projectId, projectData) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.put(`/.netlify/functions/projects-update/${projectId}`, projectData)
      
      // Update project in the list
      set(state => ({
        projects: state.projects.map(p => 
          p.id === projectId ? response.data.project : p
        ),
        currentProject: state.currentProject?.id === projectId 
          ? response.data.project 
          : state.currentProject,
        isLoading: false
      }))
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to update project'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Fetch project proposals
  fetchProposals: async (projectId) => {
    set({ isLoading: true, error: null })
    
    try {
      const params = projectId ? `?projectId=${projectId}` : ''
      const response = await api.get(`/.netlify/functions/proposals-list${params}`)
      set({ 
        proposals: response.data.proposals || [],
        isLoading: false 
      })
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch proposals'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Create new proposal
  createProposal: async (proposalData) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.post('/.netlify/functions/proposals-create', proposalData)
      
      // Add new proposal to the list
      set(state => ({ 
        proposals: [response.data.proposal, ...state.proposals],
        isLoading: false 
      }))
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to create proposal'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Fetch single proposal
  fetchProposal: async (proposalId) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.get(`/.netlify/functions/proposals-get/${proposalId}`)
      set({ 
        currentProposal: response.data.proposal,
        isLoading: false 
      })
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch proposal'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Update proposal
  updateProposal: async (proposalId, proposalData) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.put(`/.netlify/functions/proposals-update/${proposalId}`, proposalData)
      
      // Update proposal in the list
      set(state => ({
        proposals: state.proposals.map(p => 
          p.id === proposalId ? response.data.proposal : p
        ),
        currentProposal: state.currentProposal?.id === proposalId 
          ? response.data.proposal 
          : state.currentProposal,
        isLoading: false
      }))
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to update proposal'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Approve proposal (client acceptance)
  approveProposal: async (proposalId) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.post(`/.netlify/functions/proposals-accept/${proposalId}`)
      
      // Update proposal in the list
      set(state => ({
        proposals: state.proposals.map(p => 
          p.id === proposalId ? { ...p, status: 'accepted', signedAt: new Date() } : p
        ),
        currentProposal: state.currentProposal?.id === proposalId 
          ? { ...state.currentProposal, status: 'accepted', signedAt: new Date() }
          : state.currentProposal,
        isLoading: false
      }))
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to approve proposal'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Clear current project
  clearCurrentProject: () => set({ currentProject: null }),

  // Clear current proposal
  clearCurrentProposal: () => set({ currentProposal: null }),

  // Clear all data (for logout)
  clearAll: () => set({
    projects: [],
    currentProject: null,
    proposals: [],
    currentProposal: null,
    error: null
  })
}))

export default useProjectsStore
