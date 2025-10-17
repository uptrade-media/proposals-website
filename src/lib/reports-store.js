import { create } from 'zustand'
import api from './api'

const useReportsStore = create((set, get) => ({
  overviewReport: null,
  projectReport: null,
  financialReport: null,
  activityReport: null,
  lighthouseReport: null,
  lighthouseAudit: null,
  audits: [], // List of all audits
  currentAudit: null, // Currently viewing audit
  isLoading: false,
  error: null,

  // Clear error
  clearError: () => set({ error: null }),

  // Fetch overview report (dashboard metrics)
  fetchOverviewReport: async (period = 30) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.get(`/.netlify/functions/reports-dashboard?period=${period}`)
      set({ 
        overviewReport: response.data.metrics,
        isLoading: false 
      })
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch overview report'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Fetch project report
  fetchProjectReport: async () => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.get('/.netlify/functions/reports-projects')
      
      set({ 
        projectReport: response.data,
        isLoading: false 
      })
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch project report'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Fetch financial report (revenue analytics)
  fetchFinancialReport: async (period = 'year', groupBy = 'month') => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.get(`/.netlify/functions/reports-revenue?period=${period}&groupBy=${groupBy}`)
      
      set({ 
        financialReport: response.data,
        isLoading: false 
      })
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch financial report'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Fetch activity report (uses dashboard metrics for now)
  fetchActivityReport: async (period = 30) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.get(`/.netlify/functions/reports-dashboard?period=${period}`)
      set({ 
        activityReport: {
          recentProjectActivity: response.data.metrics.recentProjectActivity,
          recentMessages: response.data.metrics.recentMessages,
          unreadMessages: response.data.metrics.unreadMessages
        },
        isLoading: false 
      })
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch activity report'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Fetch Lighthouse report for a project
  fetchLighthouseReport: async (projectId) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.get(`/.netlify/functions/reports-lighthouse?projectId=${projectId}`)
      set({ 
        lighthouseReport: response.data,
        isLoading: false 
      })
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch Lighthouse report'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Fetch specific Lighthouse audit
  fetchLighthouseAudit: async (auditId) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.get(`/.netlify/functions/reports-lighthouse?auditId=${auditId}`)
      set({ 
        lighthouseAudit: response.data.audit,
        isLoading: false 
      })
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch Lighthouse audit'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Start a new Lighthouse audit
  startLighthouseAudit: async (projectId, targetUrl, deviceType = 'mobile') => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.post('/.netlify/functions/reports-lighthouse-run', {
        projectId,
        targetUrl,
        deviceType
      })
      
      set({ isLoading: false })
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to start Lighthouse audit'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // ===== AUDIT MANAGEMENT (HTML Reports) =====

  // Fetch all audits for the current user
  fetchAudits: async () => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.get('/.netlify/functions/audits-list')
      set({ 
        audits: response.data.audits || [],
        isLoading: false 
      })
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch audits'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Fetch a single audit by ID
  fetchAudit: async (auditId) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.get(`/.netlify/functions/audits-get?id=${auditId}`)
      set({ 
        currentAudit: response.data.audit,
        isLoading: false 
      })
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch audit'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Request a new audit
  requestAudit: async (targetUrl, projectId) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.post('/.netlify/functions/audits-request', {
        url: targetUrl,
        projectId
      })
      
      set({ isLoading: false })
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to request audit'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Get audit status badge
  getAuditStatusBadge: (status) => {
    const badges = {
      'pending': { text: 'Queued', color: 'gray' },
      'running': { text: 'Processing', color: 'blue' },
      'completed': { text: 'Complete', color: 'green' },
      'failed': { text: 'Failed', color: 'red' }
    }
    return badges[status] || { text: 'Unknown', color: 'gray' }
  },

  // Get unread audits count
  getUnreadAuditsCount: () => {
    const { audits } = get()
    return audits.filter(audit => 
      audit.status === 'completed' && !audit.viewedAt
    ).length
  },

  // Format currency
  formatCurrency: (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  },

  // Format percentage
  formatPercentage: (value) => {
    return `${value.toFixed(1)}%`
  },

  // Format file size
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },

  // Format lighthouse metric value
  formatLighthouseMetric: (value, unit) => {
    if (value === null || value === undefined) return '—'
    
    switch (unit) {
      case 'ms':
        return `${Math.round(value)}ms`
      case '%':
        return `${value.toFixed(1)}%`
      case 'unitless':
        return value.toFixed(3)
      case 'score':
        return `${Math.round(value)}/100`
      default:
        return `${value.toFixed(2)}`
    }
  },

  // Get score status (good, needs improvement, poor)
  getScoreStatus: (score) => {
    if (score >= 90) return 'good'
    if (score >= 50) return 'needs_improvement'
    return 'poor'
  },

  // Get score color
  getScoreColor: (score) => {
    if (score >= 90) return '#10b981' // green
    if (score >= 50) return '#f59e0b' // yellow
    return '#ef4444' // red
  },

  // Get metric status
  getMetricStatus: (metric, value) => {
    const thresholds = {
      lcp: { good: 2500, poor: 4000 }, // milliseconds
      fid: { good: 100, poor: 300 }, // milliseconds
      cls: { good: 0.1, poor: 0.25 }, // unitless
      fcp: { good: 1800, poor: 3000 }, // milliseconds
      tti: { good: 3800, poor: 7300 }, // milliseconds
      tbt: { good: 150, poor: 600 }, // milliseconds
      speedIndex: { good: 3400, poor: 5800 } // milliseconds
    }

    const threshold = thresholds[metric]
    if (!threshold) return null

    if (value <= threshold.good) return 'good'
    if (value > threshold.poor) return 'poor'
    return 'needs_improvement'
  },

  // Get status color
  getStatusColor: (status) => {
    const colors = {
      'completed': '#10b981', // green
      'in_progress': '#3b82f6', // blue
      'review': '#f59e0b', // yellow
      'planning': '#6b7280', // gray
      'on_hold': '#ef4444', // red
      'paid': '#10b981', // green
      'pending': '#f59e0b', // yellow
      'overdue': '#ef4444', // red
      'cancelled': '#6b7280' // gray
    }
    return colors[status] || '#6b7280'
  },

  // Get chart colors array
  getChartColors: () => [
    '#4bbf39', // Primary green
    '#39bfb0', // Primary teal
    '#3b82f6', // Blue
    '#f59e0b', // Yellow
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#f97316', // Orange
    '#ec4899'  // Pink
  ],

  // Calculate growth rate
  calculateGrowthRate: (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  },

  // Get trend direction
  getTrendDirection: (growthRate) => {
    if (growthRate > 0) return 'up'
    if (growthRate < 0) return 'down'
    return 'stable'
  },

  // Clear all data (for logout)
  clearAll: () => set({
    overviewReport: null,
    projectReport: null,
    financialReport: null,
    activityReport: null,
    lighthouseReport: null,
    lighthouseAudit: null,
    audits: [],
    currentAudit: null,
    error: null
  })
}))

export default useReportsStore
