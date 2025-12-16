// src/lib/team-store.js
// Zustand store for team management
import { create } from 'zustand'
import api from './api'

const useTeamStore = create((set, get) => ({
  // State
  teamMembers: [],
  summary: null,
  isLoading: false,
  error: null,
  
  // Fetch all team members
  fetchTeamMembers: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get('/.netlify/functions/admin-team-list')
      set({ 
        teamMembers: response.data.teamMembers || [],
        summary: response.data.summary || null,
        isLoading: false 
      })
      return response.data
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message
      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },
  
  // Create a new team member
  createTeamMember: async (memberData) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post('/.netlify/functions/admin-team-create', memberData)
      const newMember = response.data.teamMember
      
      // Add to local state
      set(state => ({
        teamMembers: [...state.teamMembers, newMember],
        summary: state.summary ? {
          ...state.summary,
          totalMembers: state.summary.totalMembers + 1,
          [memberData.teamRole === 'admin' ? 'admins' : 
           memberData.teamRole === 'manager' ? 'managers' : 'salesReps']: 
            (state.summary[memberData.teamRole === 'admin' ? 'admins' : 
             memberData.teamRole === 'manager' ? 'managers' : 'salesReps'] || 0) + 1
        } : null,
        isLoading: false
      }))
      
      return response.data
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message
      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },
  
  // Update a team member
  updateTeamMember: async (id, updates) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.put('/.netlify/functions/admin-team-update', { id, ...updates })
      const updatedMember = response.data.teamMember
      
      // Update local state
      set(state => ({
        teamMembers: state.teamMembers.map(m => 
          m.id === id ? { ...m, ...updatedMember } : m
        ),
        isLoading: false
      }))
      
      return response.data
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message
      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },
  
  // Resend invite to a pending team member
  resendInvite: async (id) => {
    try {
      const response = await api.put('/.netlify/functions/admin-team-update', { 
        id, 
        resendInvite: true 
      })
      return response.data
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message
      set({ error: errorMessage })
      throw error
    }
  },
  
  // Activate/deactivate a team member
  setTeamMemberStatus: async (id, status) => {
    return get().updateTeamMember(id, { teamStatus: status })
  },
  
  // Change team member role
  setTeamMemberRole: async (id, role) => {
    return get().updateTeamMember(id, { teamRole: role })
  },
  
  // Get team member by ID
  getTeamMember: (id) => {
    return get().teamMembers.find(m => m.id === id)
  },
  
  // Get team members by role
  getByRole: (role) => {
    return get().teamMembers.filter(m => m.teamRole === role)
  },
  
  // Get active team members
  getActiveMembers: () => {
    return get().teamMembers.filter(m => m.teamStatus === 'active')
  },
  
  // Get pending invites
  getPendingInvites: () => {
    return get().teamMembers.filter(m => m.teamStatus === 'pending')
  },
  
  // Clear store
  clear: () => {
    set({ teamMembers: [], summary: null, isLoading: false, error: null })
  }
}))

export default useTeamStore
