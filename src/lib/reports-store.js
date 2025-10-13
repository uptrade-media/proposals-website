import { create } from 'zustand'
import axios from 'axios'

const useReportsStore = create((set, get) => ({
  overviewReport: null,
  projectReport: null,
  financialReport: null,
  activityReport: null,
  isLoading: false,
  error: null,

  // Clear error
  clearError: () => set({ error: null }),

  // Fetch overview report (dashboard metrics)
  fetchOverviewReport: async (period = 30) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await axios.get(`/.netlify/functions/reports-dashboard?period=${period}`)
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
      const response = await axios.get('/.netlify/functions/reports-projects')
      
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
      const response = await axios.get(`/.netlify/functions/reports-revenue?period=${period}&groupBy=${groupBy}`)
      
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
      const response = await axios.get(`/.netlify/functions/reports-dashboard?period=${period}`)
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

  // Get status color for charts
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
    error: null
  })
}))

export default useReportsStore
