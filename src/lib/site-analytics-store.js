import { create } from 'zustand'

// Use proxy to avoid CORS issues with main site API
const ANALYTICS_PROXY = '/.netlify/functions/analytics-proxy'

// Helper to build proxy URL
const buildProxyUrl = (endpoint, params = {}) => {
  const searchParams = new URLSearchParams({ endpoint, ...params })
  return `${ANALYTICS_PROXY}?${searchParams.toString()}`
}

const useSiteAnalyticsStore = create((set, get) => ({
  // State
  overview: null,
  pageViews: null,
  pageViewsByDay: null,
  pageViewsByHour: null,
  topPages: null,
  isLoading: false,
  error: null,
  
  // Settings
  dateRange: 30, // days

  // Actions
  setDateRange: (days) => set({ dateRange: days }),
  clearError: () => set({ error: null }),

  // Fetch overview dashboard data
  fetchOverview: async (days = null) => {
    const period = days || get().dateRange
    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch(buildProxyUrl('overview', { days: period }))
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }
      
      const data = await response.json()
      set({ overview: data, isLoading: false })
      return { success: true, data }
    } catch (error) {
      console.error('[SiteAnalytics] Error fetching overview:', error)
      set({ 
        isLoading: false, 
        error: error.message || 'Failed to fetch analytics overview'
      })
      return { success: false, error: error.message }
    }
  },

  // Fetch page views grouped by path (top pages)
  fetchTopPages: async (days = null, limit = 20) => {
    const period = days || get().dateRange
    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch(
        buildProxyUrl('page-views', { days: period, groupBy: 'path', limit })
      )
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }
      
      const data = await response.json()
      set({ topPages: data.data, isLoading: false })
      return { success: true, data: data.data }
    } catch (error) {
      console.error('[SiteAnalytics] Error fetching top pages:', error)
      set({ 
        isLoading: false, 
        error: error.message || 'Failed to fetch top pages'
      })
      return { success: false, error: error.message }
    }
  },

  // Fetch page views grouped by day (for trend chart)
  fetchPageViewsByDay: async (days = null) => {
    const period = days || get().dateRange
    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch(
        buildProxyUrl('page-views', { days: period, groupBy: 'day' })
      )
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }
      
      const data = await response.json()
      set({ pageViewsByDay: data.data, isLoading: false })
      return { success: true, data: data.data }
    } catch (error) {
      console.error('[SiteAnalytics] Error fetching daily page views:', error)
      set({ 
        isLoading: false, 
        error: error.message || 'Failed to fetch daily page views'
      })
      return { success: false, error: error.message }
    }
  },

  // Fetch page views grouped by hour (for time distribution)
  fetchPageViewsByHour: async (days = null) => {
    const period = days || get().dateRange
    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch(
        buildProxyUrl('page-views', { days: period, groupBy: 'hour' })
      )
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }
      
      const data = await response.json()
      set({ pageViewsByHour: data.data, isLoading: false })
      return { success: true, data: data.data }
    } catch (error) {
      console.error('[SiteAnalytics] Error fetching hourly page views:', error)
      set({ 
        isLoading: false, 
        error: error.message || 'Failed to fetch hourly page views'
      })
      return { success: false, error: error.message }
    }
  },

  // Fetch all analytics data at once
  fetchAllAnalytics: async (days = null) => {
    const period = days || get().dateRange
    set({ isLoading: true, error: null })
    
    try {
      // Fetch all data in parallel via proxy
      const [overviewRes, topPagesRes, dailyRes, hourlyRes] = await Promise.all([
        fetch(buildProxyUrl('overview', { days: period })),
        fetch(buildProxyUrl('page-views', { days: period, groupBy: 'path', limit: 20 })),
        fetch(buildProxyUrl('page-views', { days: period, groupBy: 'day' })),
        fetch(buildProxyUrl('page-views', { days: period, groupBy: 'hour' }))
      ])

      // Check for errors
      if (!overviewRes.ok) throw new Error(`Overview API returned ${overviewRes.status}`)
      
      const overview = await overviewRes.json()
      const topPages = topPagesRes.ok ? (await topPagesRes.json()).data : []
      const pageViewsByDay = dailyRes.ok ? (await dailyRes.json()).data : []
      const pageViewsByHour = hourlyRes.ok ? (await hourlyRes.json()).data : []
      
      set({ 
        overview,
        topPages,
        pageViewsByDay,
        pageViewsByHour,
        isLoading: false 
      })
      
      return { success: true }
    } catch (error) {
      console.error('[SiteAnalytics] Error fetching all analytics:', error)
      set({ 
        isLoading: false, 
        error: error.message || 'Failed to fetch analytics data'
      })
      return { success: false, error: error.message }
    }
  },

  // Helper functions
  formatNumber: (num) => {
    if (num === null || num === undefined) return '0'
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toLocaleString()
  },

  formatDuration: (seconds) => {
    if (!seconds) return '0s'
    if (seconds < 60) return `${Math.round(seconds)}s`
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}m ${secs}s`
  },

  formatPercent: (value, total) => {
    if (!total || total === 0) return '0%'
    return ((value / total) * 100).toFixed(1) + '%'
  },

  getChangeIndicator: (current, previous) => {
    if (!previous || previous === 0) return { change: 0, direction: 'neutral' }
    const change = ((current - previous) / previous) * 100
    return {
      change: Math.abs(change).toFixed(1),
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
    }
  }
}))

export default useSiteAnalyticsStore
