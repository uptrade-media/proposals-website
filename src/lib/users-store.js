/**
 * Users Store - Manage organization and project members
 * 
 * Handles:
 * - Organization members (org-level and project-level access)
 * - Project members (individual project assignments)
 * - Invite flow
 */

import { create } from 'zustand'
import { adminApi } from './portal-api'

const useUsersStore = create((set, get) => ({
  // State
  members: [],
  projectMembers: {},  // Keyed by projectId
  projects: [],
  loading: false,
  error: null,

  // Fetch organization members
  fetchOrgMembers: async (organizationId) => {
    if (!organizationId) return

    set({ loading: true, error: null })
    try {
      const response = await adminApi.listOrgMembers(organizationId)
      const data = response.data || response
      const members = data.members || data || []
      
      set({ members, loading: false })
      return members
    } catch (error) {
      console.error('[users-store] Error fetching org members:', error)
      set({ error: error.message, loading: false })
      throw error
    }
  },

  // Fetch project members
  fetchProjectMembers: async (projectId) => {
    if (!projectId) return

    set({ loading: true, error: null })
    try {
      const response = await adminApi.listProjectMembers(projectId)
      const data = response.data || response
      const members = data.members || data || []
      
      set(state => ({
        projectMembers: {
          ...state.projectMembers,
          [projectId]: members
        },
        loading: false
      }))
      return members
    } catch (error) {
      console.error('[users-store] Error fetching project members:', error)
      set({ error: error.message, loading: false })
      throw error
    }
  },

  // Add user to organization
  addOrgMember: async (organizationId, { email, name, role = 'member', accessLevel = 'organization', projectIds = [] }) => {
    try {
      const response = await adminApi.addOrgMember(organizationId, {
        email,
        name,
        role,
        accessLevel,
        projectIds
      })
      
      // Refresh members list
      await get().fetchOrgMembers(organizationId)
      
      return response.data || response
    } catch (error) {
      console.error('[users-store] Error adding org member:', error)
      throw error
    }
  },

  // Update organization member
  updateOrgMember: async (organizationId, contactId, updates) => {
    try {
      const response = await adminApi.updateOrgMember(organizationId, contactId, updates)
      
      // Refresh members list
      await get().fetchOrgMembers(organizationId)
      
      return response.data || response
    } catch (error) {
      console.error('[users-store] Error updating org member:', error)
      throw error
    }
  },

  // Remove user from organization
  removeOrgMember: async (organizationId, contactId) => {
    try {
      await adminApi.removeOrgMember(organizationId, contactId)
      
      // Update local state
      set(state => ({
        members: state.members.filter(m => m.contact?.id !== contactId)
      }))
      
      return true
    } catch (error) {
      console.error('[users-store] Error removing org member:', error)
      throw error
    }
  },

  // Add user to project
  addProjectMember: async (projectId, contactId, role = 'member') => {
    try {
      const response = await adminApi.addProjectMember(projectId, contactId, role)
      
      // Refresh project members
      await get().fetchProjectMembers(projectId)
      
      return response.data || response
    } catch (error) {
      console.error('[users-store] Error adding project member:', error)
      throw error
    }
  },

  // Update project member role
  updateProjectMember: async (projectId, contactId, role) => {
    try {
      const response = await adminApi.updateProjectMember(projectId, contactId, role)
      
      // Refresh project members
      await get().fetchProjectMembers(projectId)
      
      return response.data || response
    } catch (error) {
      console.error('[users-store] Error updating project member:', error)
      throw error
    }
  },

  // Remove user from project
  removeProjectMember: async (projectId, contactId) => {
    try {
      await adminApi.removeProjectMember(projectId, contactId)
      
      // Update local state
      set(state => ({
        projectMembers: {
          ...state.projectMembers,
          [projectId]: (state.projectMembers[projectId] || []).filter(m => m.contact?.id !== contactId)
        }
      }))
      
      return true
    } catch (error) {
      console.error('[users-store] Error removing project member:', error)
      throw error
    }
  },

  // Assign Uptrade employee to project
  assignUptradeEmployee: async (projectId, contactId) => {
    return get().addProjectMember(projectId, contactId, 'uptrade_assigned')
  },

  // Get members for a specific project
  getProjectMembers: (projectId) => {
    return get().projectMembers[projectId] || []
  },

  // Check if user has org-level access
  hasOrgAccess: (contactId) => {
    const { members } = get()
    const member = members.find(m => m.contact?.id === contactId)
    return member?.access_level === 'organization'
  },

  // Clear state
  reset: () => {
    set({
      members: [],
      projectMembers: {},
      projects: [],
      loading: false,
      error: null
    })
  }
}))

export default useUsersStore
