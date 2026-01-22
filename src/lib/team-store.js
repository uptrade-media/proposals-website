// src/lib/team-store.js
// Zustand store for team management
import { create } from 'zustand'
import { adminApi } from './portal-api'

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
      const response = await adminApi.listTeamMembers()
      const data = response.data || response
      
      set({ 
        teamMembers: data.teamMembers || data.members || data || [],
        summary: data.summary || null,
        isLoading: false 
      })
      return data
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
      const response = await adminApi.createTeamMember(memberData)
      const data = response.data || response
      const newMember = data.teamMember || data.member || data
      
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
      
      return data
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
      const response = await adminApi.updateTeamMember(id, updates)
      const data = response.data || response
      const updatedMember = data.teamMember || data.member || data
      
      // Update local state
      set(state => ({
        teamMembers: state.teamMembers.map(m => 
          m.id === id ? { ...m, ...updatedMember } : m
        ),
        isLoading: false
      }))
      
      return data
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message
      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },
  
  // Resend invite to a pending team member
  resendInvite: async (id) => {
    try {
      const response = await adminApi.resendInvite(id)
      return response.data || response
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
