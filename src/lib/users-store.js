/**
 * Users Store - Manage organization and project members
 * 
 * Handles:
 * - Organization members (org-level and project-level access)
 * - Project members (individual project assignments)
 * - Invite flow
 */

import { create } from 'zustand'
import axios from 'axios'

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
      const res = await axios.get('/.netlify/functions/admin-org-members', {
        params: { organizationId }
      })
      set({ members: res.data.members || [], loading: false })
      return res.data.members
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
      const res = await axios.get('/.netlify/functions/admin-project-members', {
        params: { projectId }
      })
      set(state => ({
        projectMembers: {
          ...state.projectMembers,
          [projectId]: res.data.members || []
        },
        loading: false
      }))
      return res.data.members
    } catch (error) {
      console.error('[users-store] Error fetching project members:', error)
      set({ error: error.message, loading: false })
      throw error
    }
  },

  // Add user to organization
  addOrgMember: async (organizationId, { email, name, role = 'member', accessLevel = 'organization', projectIds = [] }) => {
    try {
      const res = await axios.post('/.netlify/functions/admin-org-members', {
        email,
        name,
        role,
        accessLevel,
        projectIds
      }, {
        params: { organizationId }
      })
      
      // Refresh members list
      await get().fetchOrgMembers(organizationId)
      
      return res.data
    } catch (error) {
      console.error('[users-store] Error adding org member:', error)
      throw error
    }
  },

  // Update organization member
  updateOrgMember: async (organizationId, contactId, updates) => {
    try {
      const res = await axios.put('/.netlify/functions/admin-org-members', {
        contactId,
        ...updates
      }, {
        params: { organizationId }
      })
      
      // Refresh members list
      await get().fetchOrgMembers(organizationId)
      
      return res.data
    } catch (error) {
      console.error('[users-store] Error updating org member:', error)
      throw error
    }
  },

  // Remove user from organization
  removeOrgMember: async (organizationId, contactId) => {
    try {
      await axios.delete('/.netlify/functions/admin-org-members', {
        params: { organizationId, contactId }
      })
      
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
      const res = await axios.post('/.netlify/functions/admin-project-members', {
        contactId,
        role
      }, {
        params: { projectId }
      })
      
      // Refresh project members
      await get().fetchProjectMembers(projectId)
      
      return res.data
    } catch (error) {
      console.error('[users-store] Error adding project member:', error)
      throw error
    }
  },

  // Update project member role
  updateProjectMember: async (projectId, contactId, role) => {
    try {
      const res = await axios.put('/.netlify/functions/admin-project-members', {
        contactId,
        role
      }, {
        params: { projectId }
      })
      
      // Refresh project members
      await get().fetchProjectMembers(projectId)
      
      return res.data
    } catch (error) {
      console.error('[users-store] Error updating project member:', error)
      throw error
    }
  },

  // Remove user from project
  removeProjectMember: async (projectId, contactId) => {
    try {
      await axios.delete('/.netlify/functions/admin-project-members', {
        params: { projectId, contactId }
      })
      
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
