import { create } from 'zustand'
import api from './api'

// Use analytics-query to fetch from Portal's own database
const ANALYTICS_QUERY = '/.netlify/functions/analytics-query'

// Helper to build query URL with tenant ID
const buildQueryUrl = (endpoint, params = {}, tenantId = null) => {
  const allParams = { endpoint, ...params }
  if (tenantId) {
    allParams.tenantId = tenantId
  }
  const searchParams = new URLSearchParams(allParams)
  return `${ANALYTICS_QUERY}?${searchParams.toString()}`
}

const useSiteAnalyticsStore = create((set, get) => ({
  // State
  overview: null,
  pageViews: null,
  pageViewsByDay: null,
  pageViewsByHour: null,
  topPages: null,
  webVitals: null,
  sessions: null,
  scrollDepth: null,
  heatmap: null,
  isLoading: false,
  error: null,
  
  // Settings
  dateRange: 30, // days
  tenantId: null, // Tenant ID for filtering analytics

  // Actions
  setDateRange: (days) => set({ dateRange: days }),
  setTenantId: (tenantId) => set({ tenantId }),
  clearError: () => set({ error: null }),

  // Fetch overview dashboard data
  fetchOverview: async (days = null) => {
    const period = days || get().dateRange
    const tenantId = get().tenantId
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.get(buildQueryUrl('overview', { days: period }, tenantId))
      
      set({ overview: response.data, isLoading: false })
      return { success: true, data: response.data }
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
    const tenantId = get().tenantId
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.get(
        buildQueryUrl('page-views', { days: period, groupBy: 'path', limit }, tenantId)
      )
      
      set({ topPages: response.data.data, isLoading: false })
      return { success: true, data: response.data.data }
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
    const tenantId = get().tenantId
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.get(
        buildQueryUrl('page-views', { days: period, groupBy: 'day' }, tenantId)
      )
      
      set({ pageViewsByDay: response.data.data, isLoading: false })
      return { success: true, data: response.data.data }
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
    const tenantId = get().tenantId
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.get(
        buildQueryUrl('page-views', { days: period, groupBy: 'hour' }, tenantId)
      )
      
      set({ pageViewsByHour: response.data.data, isLoading: false })
      return { success: true, data: response.data.data }
    } catch (error) {
      console.error('[SiteAnalytics] Error fetching hourly page views:', error)
      set({ 
        isLoading: false, 
        error: error.message || 'Failed to fetch hourly page views'
      })
      return { success: false, error: error.message }
    }
  },

  // Fetch Web Vitals summary
  fetchWebVitals: async (days = null) => {
    const period = days || get().dateRange
    const tenantId = get().tenantId
    
    try {
      const response = await api.get(buildQueryUrl('web-vitals', { days: period }, tenantId))
      
      set({ webVitals: response.data })
      return { success: true, data: response.data }
    } catch (error) {
      console.warn('[SiteAnalytics] Error fetching web vitals:', error)
      return { success: false, data: null }
    }
  },

  // Fetch session breakdown (browser, OS, UTM, etc.)
  fetchSessions: async (days = null) => {
    const period = days || get().dateRange
    const tenantId = get().tenantId
    
    try {
      const response = await api.get(buildQueryUrl('sessions', { days: period }, tenantId))
      
      set({ sessions: response.data })
      return { success: true, data: response.data }
    } catch (error) {
      console.warn('[SiteAnalytics] Error fetching sessions:', error)
      return { success: false, data: null }
    }
  },

  // Fetch scroll depth data
  fetchScrollDepth: async (days = null) => {
    const period = days || get().dateRange
    const tenantId = get().tenantId
    
    try {
      const response = await api.get(buildQueryUrl('scroll-depth', { days: period }, tenantId))
      
      set({ scrollDepth: response.data })
      return { success: true, data: response.data }
    } catch (error) {
      console.warn('[SiteAnalytics] Error fetching scroll depth:', error)
      return { success: false, data: null }
    }
  },

  // Fetch heatmap click data
  fetchHeatmap: async (days = null) => {
    const period = days || get().dateRange
    const tenantId = get().tenantId
    
    try {
      const response = await api.get(buildQueryUrl('heatmap', { days: period }, tenantId))
      
      set({ heatmap: response.data })
      return { success: true, data: response.data }
    } catch (error) {
      console.warn('[SiteAnalytics] Error fetching heatmap:', error)
      return { success: false, data: null }
    }
  },

  // Fetch all analytics data at once
  fetchAllAnalytics: async (days = null) => {
    const period = days || get().dateRange
    const tenantId = get().tenantId
    set({ isLoading: true, error: null })
    
    try {
      // Fetch all data in parallel from Portal database using api module
      const [overviewRes, topPagesRes, dailyRes, hourlyRes, webVitalsRes, sessionsRes, scrollDepthRes, heatmapRes] = await Promise.allSettled([
        api.get(buildQueryUrl('overview', { days: period }, tenantId)),
        api.get(buildQueryUrl('page-views', { days: period, groupBy: 'path', limit: 20 }, tenantId)),
        api.get(buildQueryUrl('page-views', { days: period, groupBy: 'day' }, tenantId)),
        api.get(buildQueryUrl('page-views', { days: period, groupBy: 'hour' }, tenantId)),
        api.get(buildQueryUrl('web-vitals', { days: period }, tenantId)),
        api.get(buildQueryUrl('sessions', { days: period }, tenantId)),
        api.get(buildQueryUrl('scroll-depth', { days: period }, tenantId)),
        api.get(buildQueryUrl('heatmap', { days: period }, tenantId))
      ])

      // Extract data from settled promises
      const overview = overviewRes.status === 'fulfilled' ? overviewRes.value.data : null
      const topPages = topPagesRes.status === 'fulfilled' ? topPagesRes.value.data?.data || [] : []
      const pageViewsByDay = dailyRes.status === 'fulfilled' ? dailyRes.value.data?.data || [] : []
      const pageViewsByHour = hourlyRes.status === 'fulfilled' ? hourlyRes.value.data?.data || [] : []
      const webVitals = webVitalsRes.status === 'fulfilled' ? webVitalsRes.value.data : null
      const sessions = sessionsRes.status === 'fulfilled' ? sessionsRes.value.data : null
      const scrollDepth = scrollDepthRes.status === 'fulfilled' ? scrollDepthRes.value.data : null
      const heatmap = heatmapRes.status === 'fulfilled' ? heatmapRes.value.data : null
      
      set({ 
        overview,
        topPages,
        pageViewsByDay,
        pageViewsByHour,
        webVitals,
        sessions,
        scrollDepth,
        heatmap,
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
