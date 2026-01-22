/**
 * Unified Team Store - Manages both Uptrade internal team and organization/project users
 * 
 * Handles:
 * - Uptrade internal team (sales reps, managers, devs)
 * - Organization members (org-level and project-level access)
 * - Project members (individual project assignments)
 */

import { create } from 'zustand'
import { adminApi, messagesApi, projectsApi } from '../../lib/portal-api'

const useTeamStore = create((set, get) => ({
  // ============================================================================
  // STATE
  // ============================================================================
  
  // Uptrade internal team
  teamMembers: [],
  teamSummary: null,
  
  // Organization members
  orgMembers: [],
  
  // Uptrade team members assigned to organization's projects
  assignedUptradeTeam: [],
  
  // Project members (keyed by projectId)
  projectMembers: {},
  
  // Available projects (for assignment UI)
  projects: [],
  
  // UI state
  loading: false,
  error: null,

  // ============================================================================
  // UPTRADE TEAM METHODS
  // ============================================================================

  /**
   * Fetch all Uptrade internal team members with metrics
   */
  fetchTeamMembers: async () => {
    set({ loading: true, error: null })
    try {
      const response = await adminApi.listTeamMembers()
      set({ 
        teamMembers: response.data.teamMembers || response.data.team || [],
        teamSummary: response.data.summary || null,
        loading: false 
      })
      return response.data
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * Create a new Uptrade team member
   */
  createTeamMember: async (memberData) => {
    set({ loading: true, error: null })
    try {
      const response = await adminApi.createTeamMember(memberData)
      const newMember = response.data.teamMember
      
      set(state => ({
        teamMembers: [...state.teamMembers, newMember],
        teamSummary: state.teamSummary ? {
          ...state.teamSummary,
          totalMembers: state.teamSummary.totalMembers + 1
        } : null,
        loading: false
      }))
      
      return response.data
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * Update an Uptrade team member
   */
  updateTeamMember: async (id, updates) => {
    set({ loading: true, error: null })
    try {
      const response = await adminApi.updateTeamMember(id, updates)
      const updatedMember = response.data.teamMember
      
      set(state => ({
        teamMembers: state.teamMembers.map(m => 
          m.id === id ? { ...m, ...updatedMember } : m
        ),
        loading: false
      }))
      
      return response.data
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * Resend invite to a pending team member
   */
  resendTeamInvite: async (id) => {
    try {
      const response = await adminApi.resendInvite(id)
      return response.data
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message
      set({ error: errorMessage })
      throw error
    }
  },

  /**
   * Set team member status (active/inactive)
   */
  setTeamMemberStatus: async (id, status) => {
    return get().updateTeamMember(id, { teamStatus: status })
  },

  /**
   * Get team members by role
   */
  getTeamByRole: (role) => {
    return get().teamMembers.filter(m => m.teamRole === role)
  },

  /**
   * Get active team members only
   */
  getActiveTeamMembers: () => {
    return get().teamMembers.filter(m => m.teamStatus === 'active')
  },

  // ============================================================================
  // ORGANIZATION MEMBER METHODS
  // ============================================================================

  /**
   * Fetch organization members with project assignments
   */
  fetchOrgMembers: async (organizationId) => {
    if (!organizationId) return

    set({ loading: true, error: null })
    try {
      const res = await adminApi.listOrgMembers(organizationId)
      set({ orgMembers: res.data.members || [], loading: false })
      return res.data.members
    } catch (error) {
      console.error('[team-store] Error fetching org members:', error)
      set({ error: error.message, loading: false })
      throw error
    }
  },

  /**
   * Add user to organization
   */
  addOrgMember: async (organizationId, { email, name, role = 'member', accessLevel = 'organization', projectIds = [] }) => {
    try {
      const res = await adminApi.addOrgMember(organizationId, {
        email,
        name,
        role,
        accessLevel,
        projectIds
      })
      
      // Refresh members list
      await get().fetchOrgMembers(organizationId)
      
      return res.data
    } catch (error) {
      console.error('[team-store] Error adding org member:', error)
      throw error
    }
  },

  /**
   * Update organization member (role, access level, projects)
   */
  updateOrgMember: async (organizationId, contactId, updates) => {
    try {
      const res = await adminApi.updateOrgMember(organizationId, contactId, updates)
      
      // Refresh members list
      await get().fetchOrgMembers(organizationId)
      
      return res.data
    } catch (error) {
      console.error('[team-store] Error updating org member:', error)
      throw error
    }
  },

  /**
   * Remove user from organization
   */
  removeOrgMember: async (organizationId, contactId) => {
    try {
      await adminApi.removeOrgMember(organizationId, contactId)
      
      set(state => ({
        orgMembers: state.orgMembers.filter(m => m.contact?.id !== contactId)
      }))
      
      return true
    } catch (error) {
      console.error('[team-store] Error removing org member:', error)
      throw error
    }
  },

  /**
   * Check if user has org-level access
   */
  hasOrgAccess: (contactId) => {
    const member = get().orgMembers.find(m => m.contact?.id === contactId)
    return member?.access_level === 'organization'
  },

  /**
   * Fetch Uptrade team members assigned to organization's projects
   */
  fetchAssignedUptradeTeam: async (organizationId) => {
    if (!organizationId) return []
    
    try {
      // Use the messages contacts endpoint which already has this logic
      const res = await messagesApi.getContacts()
      
      // Filter to only uptrade_team contacts
      const uptradeTeam = (res.data.contacts || []).filter(c => c.contactType === 'uptrade_team')
      set({ assignedUptradeTeam: uptradeTeam })
      return uptradeTeam
    } catch (error) {
      console.error('[team-store] Error fetching assigned Uptrade team:', error)
      return []
    }
  },

  // ============================================================================
  // PROJECT MEMBER METHODS
  // ============================================================================

  /**
   * Fetch project members
   */
  fetchProjectMembers: async (projectId) => {
    if (!projectId) return

    set({ loading: true, error: null })
    try {
      const res = await adminApi.listProjectMembers(projectId)
      set(state => ({
        projectMembers: {
          ...state.projectMembers,
          [projectId]: res.data.members || []
        },
        loading: false
      }))
      return res.data.members
    } catch (error) {
      console.error('[team-store] Error fetching project members:', error)
      set({ error: error.message, loading: false })
      throw error
    }
  },

  /**
   * Add user to project
   */
  addProjectMember: async (projectId, contactId, role = 'member') => {
    try {
      const res = await adminApi.addProjectMember(projectId, contactId, role)
      
      await get().fetchProjectMembers(projectId)
      return res.data
    } catch (error) {
      console.error('[team-store] Error adding project member:', error)
      throw error
    }
  },

  /**
   * Update project member role
   */
  updateProjectMember: async (projectId, contactId, role) => {
    try {
      const res = await adminApi.updateProjectMember(projectId, contactId, role)
      
      await get().fetchProjectMembers(projectId)
      return res.data
    } catch (error) {
      console.error('[team-store] Error updating project member:', error)
      throw error
    }
  },

  /**
   * Remove user from project
   */
  removeProjectMember: async (projectId, contactId) => {
    try {
      await adminApi.removeProjectMember(projectId, contactId)
      
      set(state => ({
        projectMembers: {
          ...state.projectMembers,
          [projectId]: (state.projectMembers[projectId] || []).filter(m => m.contact?.id !== contactId)
        }
      }))
      
      return true
    } catch (error) {
      console.error('[team-store] Error removing project member:', error)
      throw error
    }
  },

  /**
   * Assign Uptrade employee to project
   */
  assignUptradeEmployee: async (projectId, contactId) => {
    return get().addProjectMember(projectId, contactId, 'uptrade_assigned')
  },

  /**
   * Get members for a specific project
   */
  getProjectMembers: (projectId) => {
    return get().projectMembers[projectId] || []
  },

  // ============================================================================
  // PROJECTS HELPER
  // ============================================================================

  /**
   * Fetch projects for an organization (for assignment UI)
   */
  fetchProjects: async (organizationId) => {
    try {
      const res = await projectsApi.list()
      set({ projects: res.data.projects || [] })
      return res.data.projects
    } catch (error) {
      console.error('[team-store] Error fetching projects:', error)
      throw error
    }
  },

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Clear all state
   */
  reset: () => {
    set({
      teamMembers: [],
      teamSummary: null,
      orgMembers: [],
      assignedUptradeTeam: [],
      projectMembers: {},
      projects: [],
      loading: false,
      error: null
    })
  },

  /**
   * Clear error state
   */
  clearError: () => {
    set({ error: null })
  }
}))

export default useTeamStore
