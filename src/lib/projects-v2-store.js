/**
 * Projects V2 Store Extensions
 * 
 * Extended store for Projects Module V2:
 * - Uptrade Tasks (internal team tasks)
 * - User Tasks (personal tasks)
 * - Deliverables (creative deliverables with approval workflow)
 */
import { create } from 'zustand'
import portalApi from './portal-api'

// ============================================================================
// STATUS CONFIGURATIONS
// ============================================================================

export const UPTRADE_TASK_STATUS_CONFIG = {
  not_started: { label: 'Not Started', color: 'bg-slate-100 text-slate-700', icon: '○' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: '◐' },
  in_review: { label: 'In Review', color: 'bg-purple-100 text-purple-700', icon: '◉' },
  blocked: { label: 'Blocked', color: 'bg-red-100 text-red-700', icon: '●' },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: '✓' },
}

export const UPTRADE_TASK_PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
}

export const UPTRADE_TASK_MODULE_CONFIG = {
  seo: { label: 'SEO', color: 'bg-green-100 text-green-700', iconName: 'Search' },
  broadcast: { label: 'Broadcast', color: 'bg-purple-100 text-purple-700', iconName: 'Radio' },
  reputation: { label: 'Reputation', color: 'bg-yellow-100 text-yellow-700', iconName: 'Star' },
  engage: { label: 'Engage', color: 'bg-indigo-100 text-indigo-700', iconName: 'Zap' },
  commerce: { label: 'Commerce', color: 'bg-orange-100 text-orange-700', iconName: 'ShoppingCart' },
  blog: { label: 'Blog', color: 'bg-teal-100 text-teal-700', iconName: 'BookOpen' },
  prospects: { label: 'Prospects', color: 'bg-blue-100 text-blue-700', iconName: 'Users' },
  outreach: { label: 'Outreach', color: 'bg-pink-100 text-pink-700', iconName: 'Mail' },
  general: { label: 'General', color: 'bg-gray-100 text-gray-600', iconName: 'ListTodo' },
}

export const USER_TASK_PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700' },
}

export const DELIVERABLE_STATUS_CONFIG = {
  not_started: { label: 'Not Started', color: 'bg-slate-100 text-slate-700' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  pending_review: { label: 'Pending Review', color: 'bg-purple-100 text-purple-700' },
  needs_changes: { label: 'Needs Changes', color: 'bg-orange-100 text-orange-700' },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
  delivered: { label: 'Delivered', color: 'bg-cyan-100 text-cyan-700' },
}

export const DELIVERABLE_TYPE_CONFIG = {
  document: { label: 'Document', icon: '📄' },
  image: { label: 'Image', icon: '🖼️' },
  video: { label: 'Video', icon: '🎬' },
  audio: { label: 'Audio', icon: '🎵' },
  design: { label: 'Design', icon: '🎨' },
  code: { label: 'Code', icon: '💻' },
  presentation: { label: 'Presentation', icon: '📊' },
  spreadsheet: { label: 'Spreadsheet', icon: '📋' },
  other: { label: 'Other', icon: '📦' },
}

// ============================================================================
// UPTRADE TASKS STORE
// ============================================================================

export const useUptradeTasksStore = create((set, get) => ({
  // State
  tasks: [],
  currentTask: null,
  stats: null,
  isLoading: false,
  error: null,
  
  // Filters (persisted in UI)
  filters: {
    status: null,
    module: null,
    priority: null,
    assignedTo: null,
    search: '',
  },

  // ============= Actions =============
  
  setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),
  clearFilters: () => set({ filters: { status: null, module: null, priority: null, assignedTo: null, search: '' } }),
  
  fetchTasks: async (projectId, filters = {}) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      const mergedFilters = { ...get().filters, ...filters }
      
      if (mergedFilters.status) params.append('status', mergedFilters.status)
      if (mergedFilters.module) params.append('module', mergedFilters.module)
      if (mergedFilters.priority) params.append('priority', mergedFilters.priority)
      if (mergedFilters.assignedTo) params.append('assigned_to', mergedFilters.assignedTo)
      if (mergedFilters.search) params.append('search', mergedFilters.search)
      
      const queryString = params.toString()
      const url = queryString 
        ? `/projects/${projectId}/uptrade-tasks?${queryString}` 
        : `/projects/${projectId}/uptrade-tasks`
      
      const response = await portalApi.get(url)
      set({ tasks: response.data || [], isLoading: false })
      return response.data
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },
  
  fetchTask: async (projectId, taskId) => {
    set({ isLoading: true, error: null })
    try {
      const response = await portalApi.get(`/projects/${projectId}/uptrade-tasks/${taskId}`)
      set({ currentTask: response.data, isLoading: false })
      return response.data
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },
  
  fetchStats: async (projectId) => {
    try {
      const response = await portalApi.get(`/projects/${projectId}/uptrade-tasks/stats`)
      set({ stats: response.data })
      return response.data
    } catch (error) {
      console.error('Failed to fetch task stats:', error)
      throw error
    }
  },
  
  fetchUpcoming: async (projectId, limit = 10) => {
    try {
      const response = await portalApi.get(`/projects/${projectId}/uptrade-tasks/upcoming?limit=${limit}`)
      return response.data || []
    } catch (error) {
      console.error('Failed to fetch upcoming tasks:', error)
      throw error
    }
  },
  
  createTask: async (projectId, data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await portalApi.post(`/projects/${projectId}/uptrade-tasks`, data)
      // Add to local state
      set(state => ({ 
        tasks: [response.data, ...state.tasks], 
        isLoading: false 
      }))
      return response.data
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },
  
  updateTask: async (projectId, taskId, data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await portalApi.put(`/projects/${projectId}/uptrade-tasks/${taskId}`, data)
      // Update local state
      set(state => ({
        tasks: state.tasks.map(t => t.id === taskId ? response.data : t),
        currentTask: state.currentTask?.id === taskId ? response.data : state.currentTask,
        isLoading: false,
      }))
      return response.data
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },
  
  completeTask: async (projectId, taskId) => {
    try {
      const response = await portalApi.post(`/projects/${projectId}/uptrade-tasks/${taskId}/complete`)
      // Update local state
      set(state => ({
        tasks: state.tasks.map(t => t.id === taskId ? response.data : t),
        currentTask: state.currentTask?.id === taskId ? response.data : state.currentTask,
      }))
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  deleteTask: async (projectId, taskId) => {
    try {
      await portalApi.delete(`/projects/${projectId}/uptrade-tasks/${taskId}`)
      // Remove from local state
      set(state => ({
        tasks: state.tasks.filter(t => t.id !== taskId),
        currentTask: state.currentTask?.id === taskId ? null : state.currentTask,
      }))
    } catch (error) {
      throw error
    }
  },
  
  // Checklist operations
  addChecklistItem: async (projectId, taskId, title) => {
    try {
      const response = await portalApi.post(`/projects/${projectId}/uptrade-tasks/${taskId}/checklist`, { title })
      set(state => ({
        tasks: state.tasks.map(t => t.id === taskId ? response.data : t),
        currentTask: state.currentTask?.id === taskId ? response.data : state.currentTask,
      }))
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  toggleChecklistItem: async (projectId, taskId, itemId) => {
    try {
      const response = await portalApi.post(`/projects/${projectId}/uptrade-tasks/${taskId}/checklist/${itemId}/toggle`)
      set(state => ({
        tasks: state.tasks.map(t => t.id === taskId ? response.data : t),
        currentTask: state.currentTask?.id === taskId ? response.data : state.currentTask,
      }))
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  removeChecklistItem: async (projectId, taskId, itemId) => {
    try {
      await portalApi.delete(`/projects/${projectId}/uptrade-tasks/${taskId}/checklist/${itemId}`)
      // Refresh task to get updated checklist
      const response = await portalApi.get(`/projects/${projectId}/uptrade-tasks/${taskId}`)
      set(state => ({
        tasks: state.tasks.map(t => t.id === taskId ? response.data : t),
        currentTask: state.currentTask?.id === taskId ? response.data : state.currentTask,
      }))
    } catch (error) {
      throw error
    }
  },
  
  // Bulk operations
  bulkUpdateStatus: async (projectId, taskIds, status) => {
    try {
      await portalApi.post(`/projects/${projectId}/uptrade-tasks/bulk/status`, { task_ids: taskIds, status })
      // Refresh tasks
      await get().fetchTasks(projectId)
    } catch (error) {
      throw error
    }
  },
  
  bulkAssign: async (projectId, taskIds, assignedTo) => {
    try {
      await portalApi.post(`/projects/${projectId}/uptrade-tasks/bulk/assign`, { task_ids: taskIds, assigned_to: assignedTo })
      // Refresh tasks
      await get().fetchTasks(projectId)
    } catch (error) {
      throw error
    }
  },
  
  setCurrentTask: (task) => set({ currentTask: task }),
  clearError: () => set({ error: null }),
}))

// ============================================================================
// USER TASKS STORE (Personal Tasks)
// ============================================================================

export const useUserTasksStore = create((set, get) => ({
  // State
  tasks: [],
  categories: [],
  currentTask: null,
  stats: null,
  isLoading: false,
  error: null,
  
  // ============= Categories =============
  
  fetchCategories: async () => {
    try {
      const response = await portalApi.get('/user-tasks/categories')
      set({ categories: response.data || [] })
      return response.data
    } catch (error) {
      console.error('Failed to fetch categories:', error)
      throw error
    }
  },
  
  createCategory: async (data) => {
    try {
      const response = await portalApi.post('/user-tasks/categories', data)
      set(state => ({ categories: [...state.categories, response.data] }))
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  updateCategory: async (categoryId, data) => {
    try {
      const response = await portalApi.put(`/user-tasks/categories/${categoryId}`, data)
      set(state => ({
        categories: state.categories.map(c => c.id === categoryId ? response.data : c),
      }))
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  deleteCategory: async (categoryId) => {
    try {
      await portalApi.delete(`/user-tasks/categories/${categoryId}`)
      set(state => ({
        categories: state.categories.filter(c => c.id !== categoryId),
      }))
    } catch (error) {
      throw error
    }
  },
  
  reorderCategories: async (categoryIds) => {
    try {
      await portalApi.post('/user-tasks/categories/reorder', { category_ids: categoryIds })
      // Reorder local state
      const reordered = categoryIds.map(id => get().categories.find(c => c.id === id)).filter(Boolean)
      set({ categories: reordered })
    } catch (error) {
      throw error
    }
  },
  
  // ============= Tasks =============
  
  fetchTasks: async (filters = {}) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (filters.categoryId) params.append('category_id', filters.categoryId)
      if (filters.completed !== undefined) params.append('completed', String(filters.completed))
      if (filters.priority) params.append('priority', filters.priority)
      if (filters.overdue) params.append('overdue', 'true')
      if (filters.search) params.append('search', filters.search)
      if (filters.limit) params.append('limit', String(filters.limit))
      
      const queryString = params.toString()
      const url = queryString ? `/user-tasks?${queryString}` : '/user-tasks'
      
      const response = await portalApi.get(url)
      set({ tasks: response.data || [], isLoading: false })
      return response.data
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },
  
  fetchStats: async () => {
    try {
      const response = await portalApi.get('/user-tasks/stats')
      set({ stats: response.data })
      return response.data
    } catch (error) {
      console.error('Failed to fetch task stats:', error)
      throw error
    }
  },
  
  fetchUpcoming: async (limit = 10) => {
    try {
      const response = await portalApi.get(`/user-tasks/upcoming?limit=${limit}`)
      return response.data || []
    } catch (error) {
      console.error('Failed to fetch upcoming tasks:', error)
      throw error
    }
  },
  
  fetchToday: async () => {
    try {
      const response = await portalApi.get('/user-tasks/today')
      return response.data || []
    } catch (error) {
      console.error('Failed to fetch today tasks:', error)
      throw error
    }
  },
  
  fetchOverdue: async () => {
    try {
      const response = await portalApi.get('/user-tasks/overdue')
      return response.data || []
    } catch (error) {
      console.error('Failed to fetch overdue tasks:', error)
      throw error
    }
  },
  
  createTask: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await portalApi.post('/user-tasks', data)
      set(state => ({ 
        tasks: [response.data, ...state.tasks], 
        isLoading: false 
      }))
      return response.data
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },
  
  updateTask: async (taskId, data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await portalApi.put(`/user-tasks/${taskId}`, data)
      set(state => ({
        tasks: state.tasks.map(t => t.id === taskId ? response.data : t),
        currentTask: state.currentTask?.id === taskId ? response.data : state.currentTask,
        isLoading: false,
      }))
      return response.data
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },
  
  completeTask: async (taskId) => {
    try {
      const response = await portalApi.post(`/user-tasks/${taskId}/complete`)
      set(state => ({
        tasks: state.tasks.map(t => t.id === taskId ? response.data : t),
        currentTask: state.currentTask?.id === taskId ? response.data : state.currentTask,
      }))
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  uncompleteTask: async (taskId) => {
    try {
      const response = await portalApi.post(`/user-tasks/${taskId}/uncomplete`)
      set(state => ({
        tasks: state.tasks.map(t => t.id === taskId ? response.data : t),
        currentTask: state.currentTask?.id === taskId ? response.data : state.currentTask,
      }))
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  deleteTask: async (taskId) => {
    try {
      await portalApi.delete(`/user-tasks/${taskId}`)
      set(state => ({
        tasks: state.tasks.filter(t => t.id !== taskId),
        currentTask: state.currentTask?.id === taskId ? null : state.currentTask,
      }))
    } catch (error) {
      throw error
    }
  },
  
  moveToCategory: async (taskId, categoryId) => {
    try {
      const response = await portalApi.patch(`/user-tasks/${taskId}/move`, { category_id: categoryId })
      set(state => ({
        tasks: state.tasks.map(t => t.id === taskId ? response.data : t),
      }))
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  // Bulk operations
  bulkComplete: async (taskIds) => {
    try {
      await portalApi.post('/user-tasks/bulk/complete', { task_ids: taskIds })
      // Update local state
      set(state => ({
        tasks: state.tasks.map(t => 
          taskIds.includes(t.id) ? { ...t, completed: true, completed_at: new Date().toISOString() } : t
        ),
      }))
    } catch (error) {
      throw error
    }
  },
  
  bulkDelete: async (taskIds) => {
    try {
      await portalApi.post('/user-tasks/bulk/delete', { task_ids: taskIds })
      set(state => ({
        tasks: state.tasks.filter(t => !taskIds.includes(t.id)),
      }))
    } catch (error) {
      throw error
    }
  },
  
  setCurrentTask: (task) => set({ currentTask: task }),
  clearError: () => set({ error: null }),
}))

// ============================================================================
// DELIVERABLES STORE
// ============================================================================

export const useDeliverablesStore = create((set, get) => ({
  // State
  deliverables: [],
  pendingApprovals: [],
  currentDeliverable: null,
  stats: null,
  isLoading: false,
  error: null,
  
  // ============= Queries =============
  
  fetchDeliverables: async (projectId, filters = {}) => {
    set({ isLoading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (filters.type) params.append('type', filters.type)
      if (filters.status) params.append('status', filters.status)
      if (filters.taskId) params.append('task_id', filters.taskId)
      if (filters.search) params.append('search', filters.search)
      if (filters.limit) params.append('limit', String(filters.limit))
      if (filters.offset) params.append('offset', String(filters.offset))
      
      const queryString = params.toString()
      const url = queryString 
        ? `/projects/${projectId}/deliverables?${queryString}` 
        : `/projects/${projectId}/deliverables`
      
      const response = await portalApi.get(url)
      set({ deliverables: response.data || [], isLoading: false })
      return response.data
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },
  
  fetchDeliverable: async (projectId, deliverableId) => {
    set({ isLoading: true, error: null })
    try {
      const response = await portalApi.get(`/projects/${projectId}/deliverables/${deliverableId}`)
      set({ currentDeliverable: response.data, isLoading: false })
      return response.data
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },
  
  fetchStats: async (projectId) => {
    try {
      const response = await portalApi.get(`/projects/${projectId}/deliverables/stats`)
      set({ stats: response.data })
      return response.data
    } catch (error) {
      console.error('Failed to fetch deliverable stats:', error)
      throw error
    }
  },
  
  fetchPendingApprovals: async (projectId) => {
    try {
      const response = await portalApi.get(`/projects/${projectId}/deliverables/pending-approval`)
      set({ pendingApprovals: response.data || [] })
      return response.data
    } catch (error) {
      console.error('Failed to fetch pending approvals:', error)
      throw error
    }
  },
  
  fetchHistory: async (projectId, deliverableId) => {
    try {
      const response = await portalApi.get(`/projects/${projectId}/deliverables/${deliverableId}/history`)
      return response.data || []
    } catch (error) {
      console.error('Failed to fetch deliverable history:', error)
      throw error
    }
  },
  
  // ============= CRUD =============
  
  createDeliverable: async (projectId, data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await portalApi.post(`/projects/${projectId}/deliverables`, data)
      set(state => ({ 
        deliverables: [response.data, ...state.deliverables], 
        isLoading: false 
      }))
      return response.data
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },
  
  updateDeliverable: async (projectId, deliverableId, data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await portalApi.put(`/projects/${projectId}/deliverables/${deliverableId}`, data)
      set(state => ({
        deliverables: state.deliverables.map(d => d.id === deliverableId ? response.data : d),
        currentDeliverable: state.currentDeliverable?.id === deliverableId ? response.data : state.currentDeliverable,
        isLoading: false,
      }))
      return response.data
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },
  
  deleteDeliverable: async (projectId, deliverableId) => {
    try {
      await portalApi.delete(`/projects/${projectId}/deliverables/${deliverableId}`)
      set(state => ({
        deliverables: state.deliverables.filter(d => d.id !== deliverableId),
        currentDeliverable: state.currentDeliverable?.id === deliverableId ? null : state.currentDeliverable,
      }))
    } catch (error) {
      throw error
    }
  },
  
  // ============= Workflow Actions =============
  
  submitForReview: async (projectId, deliverableId, message) => {
    try {
      const response = await portalApi.post(`/projects/${projectId}/deliverables/${deliverableId}/submit`, { message })
      set(state => ({
        deliverables: state.deliverables.map(d => d.id === deliverableId ? response.data : d),
        currentDeliverable: state.currentDeliverable?.id === deliverableId ? response.data : state.currentDeliverable,
      }))
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  approve: async (projectId, deliverableId, message) => {
    try {
      const response = await portalApi.post(`/projects/${projectId}/deliverables/${deliverableId}/approve`, { message })
      set(state => ({
        deliverables: state.deliverables.map(d => d.id === deliverableId ? response.data : d),
        pendingApprovals: state.pendingApprovals.filter(d => d.id !== deliverableId),
        currentDeliverable: state.currentDeliverable?.id === deliverableId ? response.data : state.currentDeliverable,
      }))
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  requestChanges: async (projectId, deliverableId, feedback) => {
    try {
      const response = await portalApi.post(`/projects/${projectId}/deliverables/${deliverableId}/request-changes`, { feedback })
      set(state => ({
        deliverables: state.deliverables.map(d => d.id === deliverableId ? response.data : d),
        pendingApprovals: state.pendingApprovals.filter(d => d.id !== deliverableId),
        currentDeliverable: state.currentDeliverable?.id === deliverableId ? response.data : state.currentDeliverable,
      }))
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  deliver: async (projectId, deliverableId, deliveryNotes, finalFiles) => {
    try {
      const response = await portalApi.post(`/projects/${projectId}/deliverables/${deliverableId}/deliver`, {
        delivery_notes: deliveryNotes,
        final_files: finalFiles,
      })
      set(state => ({
        deliverables: state.deliverables.map(d => d.id === deliverableId ? response.data : d),
        currentDeliverable: state.currentDeliverable?.id === deliverableId ? response.data : state.currentDeliverable,
      }))
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  createRevision: async (projectId, deliverableId, revisionNotes, files) => {
    try {
      const response = await portalApi.post(`/projects/${projectId}/deliverables/${deliverableId}/revision`, {
        revision_notes: revisionNotes,
        files,
      })
      set(state => ({
        deliverables: state.deliverables.map(d => d.id === deliverableId ? response.data : d),
        currentDeliverable: state.currentDeliverable?.id === deliverableId ? response.data : state.currentDeliverable,
      }))
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  // ============= File Management =============
  
  addFiles: async (projectId, deliverableId, files) => {
    try {
      const response = await portalApi.post(`/projects/${projectId}/deliverables/${deliverableId}/files`, { files })
      set(state => ({
        deliverables: state.deliverables.map(d => d.id === deliverableId ? response.data : d),
        currentDeliverable: state.currentDeliverable?.id === deliverableId ? response.data : state.currentDeliverable,
      }))
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  removeFile: async (projectId, deliverableId, fileId) => {
    try {
      await portalApi.delete(`/projects/${projectId}/deliverables/${deliverableId}/files/${fileId}`)
      // Refresh deliverable to get updated files
      const response = await portalApi.get(`/projects/${projectId}/deliverables/${deliverableId}`)
      set(state => ({
        deliverables: state.deliverables.map(d => d.id === deliverableId ? response.data : d),
        currentDeliverable: state.currentDeliverable?.id === deliverableId ? response.data : state.currentDeliverable,
      }))
    } catch (error) {
      throw error
    }
  },
  
  setCurrentDeliverable: (deliverable) => set({ currentDeliverable: deliverable }),
  clearError: () => set({ error: null }),
}))

// Alias exports for convenience
export const statusConfig = UPTRADE_TASK_STATUS_CONFIG
export const priorityConfig = UPTRADE_TASK_PRIORITY_CONFIG
export const moduleConfig = UPTRADE_TASK_MODULE_CONFIG
export const deliverableStatusConfig = DELIVERABLE_STATUS_CONFIG
export const deliverableTypeConfig = DELIVERABLE_TYPE_CONFIG

export default {
  useUptradeTasksStore,
  useUserTasksStore,
  useDeliverablesStore,
}
