/**
 * Projects Store
 * 
 * Zustand store for Projects module with full Portal API integration.
 * Manages projects, creative requests, tasks, time entries, and approvals.
 */
import { create } from 'zustand'
import portalApi from './portal-api'

// Status configurations for projects
export const PROJECT_STATUS_CONFIG = {
  planning: { label: 'Planning', color: 'bg-slate-100 text-slate-700', progress: 10 },
  discovery: { label: 'Discovery', color: 'bg-purple-100 text-purple-700', progress: 20 },
  design: { label: 'Design', color: 'bg-blue-100 text-blue-700', progress: 40 },
  development: { label: 'Development', color: 'bg-amber-100 text-amber-700', progress: 60 },
  review: { label: 'Review', color: 'bg-orange-100 text-orange-700', progress: 80 },
  launch: { label: 'Launch', color: 'bg-cyan-100 text-cyan-700', progress: 90 },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', progress: 100 },
  on_hold: { label: 'On Hold', color: 'bg-gray-100 text-gray-500', progress: 0 },
}

// Status configurations for creative requests
export const CREATIVE_STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700' },
  review: { label: 'In Review', color: 'bg-purple-100 text-purple-700' },
  revision: { label: 'Needs Revision', color: 'bg-orange-100 text-orange-700' },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
}

// Status configurations for tasks
export const TASK_STATUS_CONFIG = {
  todo: { label: 'To Do', color: 'bg-slate-100 text-slate-700' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  blocked: { label: 'Blocked', color: 'bg-red-100 text-red-700' },
  done: { label: 'Done', color: 'bg-emerald-100 text-emerald-700' },
}

// Creative request types
export const CREATIVE_REQUEST_TYPES = [
  { value: 'logo', label: 'Logo Design' },
  { value: 'branding', label: 'Branding Package' },
  { value: 'website_design', label: 'Website Design' },
  { value: 'landing_page', label: 'Landing Page' },
  { value: 'social_graphics', label: 'Social Graphics' },
  { value: 'print_design', label: 'Print Design' },
  { value: 'illustration', label: 'Illustration' },
  { value: 'video', label: 'Video/Animation' },
  { value: 'other', label: 'Other' },
]

const useProjectsStore = create((set, get) => ({
  // ============= State =============
  
  // Projects
  projects: [],
  currentProject: null,
  
  // Creative Requests
  creativeRequests: [],
  currentCreativeRequest: null,
  
  // Tasks
  tasks: [],
  currentTask: null,
  
  // Time Entries
  timeEntries: [],
  activeTimer: null,
  
  // Approvals
  pendingApprovals: [],
  
  // UI State
  isLoading: false,
  error: null,
  
  // ============= Projects Actions =============
  
  fetchProjects: async (filters = {}) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.contactId) params.append('contactId', filters.contactId)
      if (filters.isTenant !== undefined) params.append('isTenant', String(filters.isTenant))
      if (filters.search) params.append('search', filters.search)
      
      const queryString = params.toString()
      const url = queryString ? `/projects?${queryString}` : '/projects'
      
      const response = await portalApi.get(url)
      // API returns { projects: [...], total: number } - extract the array
      const projectsArray = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.projects || [])
      set({ projects: projectsArray, isLoading: false })
      return projectsArray
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch projects'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  fetchProject: async (projectId) => {
    set({ isLoading: true, error: null })
    try {
      const response = await portalApi.get(`/projects/${projectId}`)
      set({ currentProject: response.data, isLoading: false })
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch project'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  createProject: async (projectData) => {
    set({ isLoading: true, error: null })
    try {
      const response = await portalApi.post('/projects', projectData)
      const newProject = response.data
      set(state => ({
        projects: [...state.projects, newProject],
        isLoading: false
      }))
      return newProject
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to create project'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  updateProject: async (projectId, updates) => {
    set({ isLoading: true, error: null })
    try {
      const response = await portalApi.put(`/projects/${projectId}`, updates)
      const updatedProject = response.data
      set(state => ({
        projects: state.projects.map(p => p.id === projectId ? updatedProject : p),
        currentProject: state.currentProject?.id === projectId ? updatedProject : state.currentProject,
        isLoading: false
      }))
      return updatedProject
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to update project'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  deleteProject: async (projectId) => {
    set({ isLoading: true, error: null })
    try {
      await portalApi.delete(`/projects/${projectId}`)
      set(state => ({
        projects: state.projects.filter(p => p.id !== projectId),
        currentProject: state.currentProject?.id === projectId ? null : state.currentProject,
        isLoading: false
      }))
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to delete project'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  convertToTenant: async (projectId, tenantData) => {
    set({ isLoading: true, error: null })
    try {
      const response = await portalApi.post(`/projects/${projectId}/convert-to-tenant`, tenantData)
      const updatedProject = response.data
      set(state => ({
        projects: state.projects.map(p => p.id === projectId ? updatedProject : p),
        currentProject: state.currentProject?.id === projectId ? updatedProject : state.currentProject,
        isLoading: false
      }))
      return updatedProject
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to convert to tenant'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  // ============= Creative Requests Actions =============
  
  fetchCreativeRequests: async (projectId, filters = {}) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.type) params.append('type', filters.type)
      
      const queryString = params.toString()
      const url = queryString 
        ? `/projects/${projectId}/creative-requests?${queryString}`
        : `/projects/${projectId}/creative-requests`
      
      const response = await portalApi.get(url)
      set({ creativeRequests: response.data, isLoading: false })
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch creative requests'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  createCreativeRequest: async (projectId, requestData) => {
    set({ isLoading: true, error: null })
    try {
      const response = await portalApi.post(`/projects/${projectId}/creative-requests`, requestData)
      const newRequest = response.data
      set(state => ({
        creativeRequests: [...state.creativeRequests, newRequest],
        isLoading: false
      }))
      return newRequest
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to create creative request'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  updateCreativeRequest: async (projectId, requestId, updates) => {
    set({ isLoading: true, error: null })
    try {
      const response = await portalApi.put(`/projects/${projectId}/creative-requests/${requestId}`, updates)
      const updated = response.data
      set(state => ({
        creativeRequests: state.creativeRequests.map(r => r.id === requestId ? updated : r),
        currentCreativeRequest: state.currentCreativeRequest?.id === requestId ? updated : state.currentCreativeRequest,
        isLoading: false
      }))
      return updated
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to update creative request'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  uploadCreativeVersion: async (projectId, requestId, versionData) => {
    set({ isLoading: true, error: null })
    try {
      const response = await portalApi.post(
        `/projects/${projectId}/creative-requests/${requestId}/versions`,
        versionData
      )
      await get().fetchCreativeRequests(projectId)
      set({ isLoading: false })
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to upload version'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  // ============= Tasks Actions =============
  
  fetchTasks: async (projectId, filters = {}) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.assigneeId) params.append('assigneeId', filters.assigneeId)
      
      const queryString = params.toString()
      const url = queryString 
        ? `/projects/${projectId}/tasks?${queryString}`
        : `/projects/${projectId}/tasks`
      
      const response = await portalApi.get(url)
      set({ tasks: response.data, isLoading: false })
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch tasks'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  createTask: async (projectId, taskData) => {
    set({ isLoading: true, error: null })
    try {
      const response = await portalApi.post(`/projects/${projectId}/tasks`, taskData)
      const newTask = response.data
      set(state => ({
        tasks: [...state.tasks, newTask],
        isLoading: false
      }))
      return newTask
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to create task'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  updateTask: async (projectId, taskId, updates) => {
    set({ isLoading: true, error: null })
    try {
      const response = await portalApi.put(`/projects/${projectId}/tasks/${taskId}`, updates)
      const updated = response.data
      set(state => ({
        tasks: state.tasks.map(t => t.id === taskId ? updated : t),
        currentTask: state.currentTask?.id === taskId ? updated : state.currentTask,
        isLoading: false
      }))
      return updated
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to update task'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  deleteTask: async (projectId, taskId) => {
    set({ isLoading: true, error: null })
    try {
      await portalApi.delete(`/projects/${projectId}/tasks/${taskId}`)
      set(state => ({
        tasks: state.tasks.filter(t => t.id !== taskId),
        currentTask: state.currentTask?.id === taskId ? null : state.currentTask,
        isLoading: false
      }))
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to delete task'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  toggleTaskComplete: async (projectId, taskId) => {
    const task = get().tasks.find(t => t.id === taskId)
    if (!task) return
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    return get().updateTask(projectId, taskId, { status: newStatus })
  },
  
  reorderTasks: async (projectId, taskOrders) => {
    set({ isLoading: true, error: null })
    try {
      await portalApi.put(`/projects/${projectId}/tasks/reorder`, { taskOrders })
      await get().fetchTasks(projectId)
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to reorder tasks'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  // ============= Time Entries Actions =============
  
  fetchTimeEntries: async (projectId, filters = {}) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (filters.userId) params.append('userId', filters.userId)
      if (filters.taskId) params.append('taskId', filters.taskId)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      
      const queryString = params.toString()
      const url = queryString 
        ? `/projects/${projectId}/time-entries?${queryString}`
        : `/projects/${projectId}/time-entries`
      
      const response = await portalApi.get(url)
      set({ timeEntries: response.data, isLoading: false })
      
      const active = response.data.find(e => e.isRunning)
      set({ activeTimer: active || null })
      
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch time entries'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  createTimeEntry: async (projectId, entryData) => {
    set({ isLoading: true, error: null })
    try {
      const response = await portalApi.post(`/projects/${projectId}/time-entries`, entryData)
      const newEntry = response.data
      set(state => ({
        timeEntries: [...state.timeEntries, newEntry],
        isLoading: false
      }))
      return newEntry
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to create time entry'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  startTimer: async (projectId, timerData = {}) => {
    set({ isLoading: true, error: null })
    try {
      const response = await portalApi.post(`/projects/${projectId}/time-entries/start`, timerData)
      const timer = response.data
      set(state => ({
        timeEntries: [...state.timeEntries, timer],
        activeTimer: timer,
        isLoading: false
      }))
      return timer
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to start timer'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  stopTimer: async (projectId, entryId, notes = '') => {
    set({ isLoading: true, error: null })
    try {
      const response = await portalApi.put(`/projects/${projectId}/time-entries/${entryId}/stop`, { notes })
      const stoppedEntry = response.data
      set(state => ({
        timeEntries: state.timeEntries.map(e => e.id === entryId ? stoppedEntry : e),
        activeTimer: null,
        isLoading: false
      }))
      return stoppedEntry
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to stop timer'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  updateTimeEntry: async (projectId, entryId, updates) => {
    set({ isLoading: true, error: null })
    try {
      const response = await portalApi.put(`/projects/${projectId}/time-entries/${entryId}`, updates)
      const updated = response.data
      set(state => ({
        timeEntries: state.timeEntries.map(e => e.id === entryId ? updated : e),
        isLoading: false
      }))
      return updated
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to update time entry'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  deleteTimeEntry: async (projectId, entryId) => {
    set({ isLoading: true, error: null })
    try {
      await portalApi.delete(`/projects/${projectId}/time-entries/${entryId}`)
      set(state => ({
        timeEntries: state.timeEntries.filter(e => e.id !== entryId),
        activeTimer: state.activeTimer?.id === entryId ? null : state.activeTimer,
        isLoading: false
      }))
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to delete time entry'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  getTimeSummary: (projectId) => {
    const entries = get().timeEntries.filter(e => e.projectId === projectId && !e.isRunning)
    const totalMinutes = entries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0)
    const totalBillable = entries
      .filter(e => e.isBillable)
      .reduce((sum, e) => sum + (e.durationMinutes || 0), 0)
    
    return {
      totalMinutes,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      billableMinutes: totalBillable,
      billableHours: Math.round(totalBillable / 60 * 10) / 10,
      entriesCount: entries.length,
    }
  },
  
  // ============= Approvals Actions =============
  
  fetchPendingApprovals: async (filters = {}) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (filters.type) params.append('type', filters.type)
      if (filters.projectId) params.append('projectId', filters.projectId)
      
      const queryString = params.toString()
      const url = queryString ? `/approvals/pending?${queryString}` : '/approvals/pending'
      
      const response = await portalApi.get(url)
      set({ pendingApprovals: response.data, isLoading: false })
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch approvals'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  approveItem: async (approvalId, notes = '') => {
    set({ isLoading: true, error: null })
    try {
      const response = await portalApi.put(`/approvals/${approvalId}/approve`, { notes })
      set(state => ({
        pendingApprovals: state.pendingApprovals.filter(a => a.id !== approvalId),
        isLoading: false
      }))
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to approve'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  rejectItem: async (approvalId, reason) => {
    set({ isLoading: true, error: null })
    try {
      const response = await portalApi.put(`/approvals/${approvalId}/reject`, { reason })
      set(state => ({
        pendingApprovals: state.pendingApprovals.filter(a => a.id !== approvalId),
        isLoading: false
      }))
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to reject'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  requestChanges: async (approvalId, feedback) => {
    set({ isLoading: true, error: null })
    try {
      const response = await portalApi.put(`/approvals/${approvalId}/request-changes`, { feedback })
      set(state => ({
        pendingApprovals: state.pendingApprovals.filter(a => a.id !== approvalId),
        isLoading: false
      }))
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to request changes'
      set({ error: message, isLoading: false })
      throw error
    }
  },
  
  // ============= Project Members Actions =============
  
  fetchProjectMembers: async (projectId) => {
    try {
      const response = await portalApi.get(`/projects/${projectId}/members`)
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch members'
      throw new Error(message)
    }
  },
  
  addProjectMember: async (projectId, userId, role = 'member') => {
    try {
      const response = await portalApi.post(`/projects/${projectId}/members`, { userId, role })
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to add member'
      throw new Error(message)
    }
  },
  
  removeProjectMember: async (projectId, userId) => {
    try {
      await portalApi.delete(`/projects/${projectId}/members/${userId}`)
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to remove member'
      throw new Error(message)
    }
  },
  
  // ============= Helper Actions =============
  
  setCurrentProject: (project) => set({ currentProject: project }),
  setCurrentCreativeRequest: (request) => set({ currentCreativeRequest: request }),
  setCurrentTask: (task) => set({ currentTask: task }),
  clearError: () => set({ error: null }),
  
  clearAll: () => set({
    projects: [],
    currentProject: null,
    creativeRequests: [],
    currentCreativeRequest: null,
    tasks: [],
    currentTask: null,
    timeEntries: [],
    activeTimer: null,
    pendingApprovals: [],
    isLoading: false,
    error: null,
  }),
}))

export default useProjectsStore
