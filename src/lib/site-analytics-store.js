import { create } from 'zustand'
import { analyticsApi } from './portal-api'
import { supabase } from './supabase-auth'

/**
 * Site Analytics Store - Zustand store for site analytics
 * 
 * Uses Portal API exclusively (NestJS backend)
 */

// Realtime subscription reference (kept outside store to persist across re-renders)
let analyticsRealtimeSubscription = null

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
  
  // Realtime state
  realtimeConnected: false,
  lastUpdated: null,
  realtimeData: null,
  realtimeError: null,
  
  // Settings
  dateRange: 30, // days
  projectId: null, // Project ID for filtering analytics

  // Actions
  setDateRange: (days) => set({ dateRange: days }),
  setProjectId: (projectId) => set({ projectId }),
  clearError: () => set({ error: null }),

  // Fetch overview dashboard data
  fetchOverview: async (days = null) => {
    const period = days || get().dateRange
    const projectId = get().projectId
    set({ isLoading: true, error: null })
    
    try {
      const response = await analyticsApi.getOverview({ days: period, projectId })
      const data = response.data || response
      
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
    const projectId = get().projectId
    set({ isLoading: true, error: null })
    
    try {
      const response = await analyticsApi.getPageViews({ days: period, groupBy: 'path', limit, projectId })
      const data = response.data || response
      const topPages = data.data || data || []
      
      set({ topPages, isLoading: false })
      return { success: true, data: topPages }
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
    const projectId = get().projectId
    set({ isLoading: true, error: null })
    
    try {
      const response = await analyticsApi.getPageViews({ days: period, groupBy: 'day', projectId })
      const data = response.data || response
      const pageViewsByDay = data.data || data || []
      
      set({ pageViewsByDay, isLoading: false })
      return { success: true, data: pageViewsByDay }
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
    const projectId = get().projectId
    set({ isLoading: true, error: null })
    
    try {
      const response = await analyticsApi.getPageViews({ days: period, groupBy: 'hour', projectId })
      const data = response.data || response
      const pageViewsByHour = data.data || data || []
      
      set({ pageViewsByHour, isLoading: false })
      return { success: true, data: pageViewsByHour }
    } catch (error) {
      console.error('[SiteAnalytics] Error fetching hourly page views:', error)
      set({ 
        isLoading: false, 
        error: error.message || 'Failed to fetch hourly page views'
      })
      return { success: false, error: error.message }
    }
  },

  // Fetch realtime analytics (active visitors, recent activity)
  fetchRealtime: async (projectIdOverride = null) => {
    const projectId = projectIdOverride || get().projectId

    if (!projectId) {
      const error = 'project_required'
      set({ realtimeError: error })
      return { success: false, error }
    }

    try {
      const response = await analyticsApi.getRealtime({ projectId })
      const rawData = response.data || response

      // Transform activeSessions to recentEvents format for RealTimeWidget
      const recentEvents = (rawData.activeSessions || []).map((session, index) => ({
        id: session.sessionId || index,
        page: session.currentPage || session.lastPage || '/',
        title: session.currentPage || 'Page View',
        device: session.deviceType || 'desktop',
        browser: session.browser,
        country: session.country,
        timestamp: session.startedAt || new Date().toISOString(),
      }))

      const data = {
        ...rawData,
        recentEvents,
      }

      set({
        realtimeData: data,
        realtimeError: null,
        lastUpdated: new Date().toISOString()
      })

      return { success: true, data }
    } catch (error) {
      console.error('[SiteAnalytics] Error fetching realtime:', error)
      set({
        realtimeError: error.message || 'Failed to fetch realtime analytics'
      })
      return { success: false, error: error.message }
    }
  },

  // Fetch Web Vitals summary
  fetchWebVitals: async (days = null) => {
    const period = days || get().dateRange
    const projectId = get().projectId
    
    try {
      const response = await analyticsApi.getWebVitals({ days: period, projectId })
      const data = response.data || response
      
      set({ webVitals: data })
      return { success: true, data }
    } catch (error) {
      console.warn('[SiteAnalytics] Error fetching web vitals:', error)
      return { success: false, data: null }
    }
  },

  // Fetch session breakdown (browser, OS, UTM, etc.)
  fetchSessions: async (days = null) => {
    const period = days || get().dateRange
    const projectId = get().projectId
    
    try {
      const response = await analyticsApi.getSessions({ days: period, projectId })
      const data = response.data || response
      
      set({ sessions: data })
      return { success: true, data }
    } catch (error) {
      console.warn('[SiteAnalytics] Error fetching sessions:', error)
      return { success: false, data: null }
    }
  },

  // Fetch scroll depth data
  fetchScrollDepth: async (days = null) => {
    const period = days || get().dateRange
    const projectId = get().projectId
    
    try {
      const response = await analyticsApi.getScrollDepth({ days: period, projectId })
      const data = response.data || response
      
      set({ scrollDepth: data })
      return { success: true, data }
    } catch (error) {
      console.warn('[SiteAnalytics] Error fetching scroll depth:', error)
      return { success: false, data: null }
    }
  },

  // Fetch heatmap click data
  fetchHeatmap: async (days = null) => {
    const period = days || get().dateRange
    const projectId = get().projectId
    
    try {
      const response = await analyticsApi.getHeatmap({ days: period, projectId })
      const data = response.data || response
      
      set({ heatmap: data })
      return { success: true, data }
    } catch (error) {
      console.warn('[SiteAnalytics] Error fetching heatmap:', error)
      return { success: false, data: null }
    }
  },

  // Fetch all analytics data at once
  fetchAllAnalytics: async (days = null) => {
    const period = days || get().dateRange
    const projectId = get().projectId
    set({ isLoading: true, error: null })
    
    try {
      // Fetch all data in parallel from Portal API
      const [overviewRes, topPagesRes, dailyRes, hourlyRes, webVitalsRes, sessionsRes, scrollDepthRes, heatmapRes] = await Promise.allSettled([
        analyticsApi.getOverview({ days: period, projectId }),
        analyticsApi.getPageViews({ days: period, groupBy: 'path', limit: 20, projectId }),
        analyticsApi.getPageViews({ days: period, groupBy: 'day', projectId }),
        analyticsApi.getPageViews({ days: period, groupBy: 'hour', projectId }),
        analyticsApi.getWebVitals({ days: period, projectId }),
        analyticsApi.getSessions({ days: period, projectId }),
        analyticsApi.getScrollDepth({ days: period, projectId }),
        analyticsApi.getHeatmap({ days: period, projectId })
      ])

      // Extract data from settled promises
      const overviewData = overviewRes.status === 'fulfilled' ? (overviewRes.value.data || overviewRes.value) : null
      const topPagesData = topPagesRes.status === 'fulfilled' ? (topPagesRes.value.data || topPagesRes.value) : null
      const dailyData = dailyRes.status === 'fulfilled' ? (dailyRes.value.data || dailyRes.value) : null
      const hourlyData = hourlyRes.status === 'fulfilled' ? (hourlyRes.value.data || hourlyRes.value) : null
      const webVitalsData = webVitalsRes.status === 'fulfilled' ? (webVitalsRes.value.data || webVitalsRes.value) : null
      const sessionsData = sessionsRes.status === 'fulfilled' ? (sessionsRes.value.data || sessionsRes.value) : null
      const scrollDepthData = scrollDepthRes.status === 'fulfilled' ? (scrollDepthRes.value.data || scrollDepthRes.value) : null
      const heatmapData = heatmapRes.status === 'fulfilled' ? (heatmapRes.value.data || heatmapRes.value) : null

      const overview = overviewData
      const topPages = topPagesData?.data || topPagesData || []
      const pageViewsByDay = dailyData?.data || dailyData || []
      const pageViewsByHour = hourlyData?.data || hourlyData || []
      const webVitals = webVitalsData
      const scrollDepth = scrollDepthData
      const heatmap = heatmapData
      
      // Normalize sessions data to match component expectations
      const sessions = sessionsData ? {
        ...sessionsData,
        // Transform browsers: { browser, count } -> { name, count }
        browsers: (sessionsData.browsers || []).map(b => ({ 
          name: b.browser || b.name, 
          count: b.count,
          percentage: b.percentage
        })),
        // Transform operatingSystems: { os, count } -> { name, count }
        operatingSystems: (sessionsData.operatingSystems || []).map(o => ({ 
          name: o.os || o.name, 
          count: o.count,
          percentage: o.percentage
        })),
        // Transform utmSources: { source, count } -> { name, count }
        utmSources: (sessionsData.utmSources || []).map(s => ({ 
          name: s.source || s.name, 
          count: s.count,
          percentage: s.percentage
        })),
        // Transform utmCampaigns: { campaign, count } -> { name, count }
        utmCampaigns: (sessionsData.utmCampaigns || []).map(c => ({ 
          name: c.campaign || c.name, 
          count: c.count,
          percentage: c.percentage
        })),
        // Transform utmMediums: { medium, count } -> { name, count }
        utmMediums: (sessionsData.utmMediums || []).map(m => ({ 
          name: m.medium || m.name, 
          count: m.count,
          percentage: m.percentage
        })),
        // Add summary for component convenience
        summary: {
          totalSessions: sessionsData.totalSessions,
          avgPagesPerSession: sessionsData.avgPagesPerSession
        }
      } : null
      
      console.log('[SiteAnalytics] Fetch complete:', {
        projectId,
        overviewStatus: overviewRes.status,
        overviewHasSummary: !!overview?.summary,
        pageViewsCount: topPages?.length,
        daysSampleCount: pageViewsByDay?.length,
        errors: [overviewRes, topPagesRes, dailyRes].filter(r => r.status === 'rejected').map(r => r.reason?.message)
      })
      
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

  // Fetch analytics for a specific page path
  // Note: For single-page sites, this returns the same data as fetchAllAnalytics
  // The Portal API currently returns site-wide data (path filtering not fully implemented)
  fetchPageAnalytics: async (path, days = null) => {
    if (!path) {
      console.warn('[SiteAnalytics] fetchPageAnalytics called without path')
      return get().fetchAllAnalytics(days)
    }
    
    const period = days || get().dateRange
    const projectId = get().projectId
    set({ isLoading: true, error: null })
    
    try {
      // Fetch all data in parallel - include sessions and topPages for complete view
      // Path filter is passed but API may return site-wide data (which is correct for single-page sites)
      const [overviewRes, topPagesRes, dailyRes, hourlyRes, webVitalsRes, sessionsRes, scrollDepthRes, heatmapRes] = await Promise.allSettled([
        analyticsApi.getOverview({ days: period, projectId }),
        analyticsApi.getPageViews({ days: period, groupBy: 'path', limit: 20, projectId }),
        analyticsApi.getPageViews({ days: period, groupBy: 'day', projectId }),
        analyticsApi.getPageViews({ days: period, groupBy: 'hour', projectId }),
        analyticsApi.getWebVitals({ days: period, projectId, path }),
        analyticsApi.getSessions({ days: period, projectId }),
        analyticsApi.getScrollDepth({ days: period, projectId, path }),
        analyticsApi.getHeatmap({ days: period, projectId, path })
      ])

      // Extract data from settled promises
      const overviewData = overviewRes.status === 'fulfilled' ? (overviewRes.value.data || overviewRes.value) : null
      const topPagesData = topPagesRes.status === 'fulfilled' ? (topPagesRes.value.data || topPagesRes.value) : null
      const dailyData = dailyRes.status === 'fulfilled' ? (dailyRes.value.data || dailyRes.value) : null
      const hourlyData = hourlyRes.status === 'fulfilled' ? (hourlyRes.value.data || hourlyRes.value) : null
      const webVitalsData = webVitalsRes.status === 'fulfilled' ? (webVitalsRes.value.data || webVitalsRes.value) : null
      const sessionsData = sessionsRes.status === 'fulfilled' ? (sessionsRes.value.data || sessionsRes.value) : null
      const scrollDepthData = scrollDepthRes.status === 'fulfilled' ? (scrollDepthRes.value.data || scrollDepthRes.value) : null
      const heatmapData = heatmapRes.status === 'fulfilled' ? (heatmapRes.value.data || heatmapRes.value) : null

      const overview = overviewData
      const topPages = topPagesData?.data || topPagesData || []
      const pageViewsByDay = dailyData?.data || dailyData || []
      const pageViewsByHour = hourlyData?.data || hourlyData || []
      const webVitals = webVitalsData
      const scrollDepth = scrollDepthData
      const heatmap = heatmapData
      
      // Normalize sessions data to match component expectations
      const sessions = sessionsData ? {
        ...sessionsData,
        browsers: (sessionsData.browsers || []).map(b => ({ 
          name: b.browser || b.name, 
          count: b.count,
          percentage: b.percentage
        })),
        operatingSystems: (sessionsData.operatingSystems || []).map(o => ({ 
          name: o.os || o.name, 
          count: o.count,
          percentage: o.percentage
        })),
      } : null
      
      console.log('[SiteAnalytics] Page analytics fetch complete:', {
        path,
        projectId,
        overviewStatus: overviewRes.status,
        hasData: !!overview?.summary,
        pageViews: overview?.summary?.pageViews,
        errors: [overviewRes, dailyRes, hourlyRes].filter(r => r.status === 'rejected').map(r => r.reason?.message)
      })
      
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
      console.error('[SiteAnalytics] Error fetching page analytics:', error)
      set({ 
        isLoading: false, 
        error: error.message || 'Failed to fetch page analytics'
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
  },

  // =====================================================
  // REALTIME SUBSCRIPTIONS
  // =====================================================

  /**
   * Subscribe to realtime analytics updates for live dashboard
   * Watches: analytics_page_views, analytics_events, analytics_sessions
   * 
   * @param {string} projectId - The tenant/project ID to filter analytics for
   */
  subscribeToAnalytics: async (projectId = null) => {
    const filterTenantId = projectId || get().projectId
    
    // Don't subscribe if already subscribed
    if (analyticsRealtimeSubscription) {
      console.log('[Analytics Realtime] Already subscribed')
      return
    }

    console.log('[Analytics Realtime] Subscribing for tenant:', filterTenantId || 'all')

    // Build filter for tenant-specific or all analytics
    const filter = filterTenantId ? `tenant_id=eq.${filterTenantId}` : undefined

    // Subscribe to multiple analytics tables
    analyticsRealtimeSubscription = supabase
      .channel('analytics-realtime')
      // Page views - increment counter and refresh metrics
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'analytics_page_views',
          ...(filter && { filter })
        },
        (payload) => {
          console.log('[Analytics Realtime] New page view:', payload.new.path)
          const state = get()
          
          // Update overview with new page view
          if (state.overview) {
            set({
              overview: {
                ...state.overview,
                pageViews: (state.overview.pageViews || 0) + 1,
                uniqueVisitors: state.overview.uniqueVisitors // Will be accurate on next fetch
              },
              lastUpdated: new Date().toISOString()
            })
          }

          // Update top pages if this page is in the list
          if (state.topPages && Array.isArray(state.topPages)) {
            const pagePath = payload.new.path
            const updatedTopPages = [...state.topPages]
            const existingIdx = updatedTopPages.findIndex(p => p.path === pagePath)
            
            if (existingIdx >= 0) {
              updatedTopPages[existingIdx] = {
                ...updatedTopPages[existingIdx],
                views: (updatedTopPages[existingIdx].views || 0) + 1
              }
            }
            
            set({ topPages: updatedTopPages })
          }
        }
      )
      // Events - track conversions and engagement
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'analytics_events',
          ...(filter && { filter })
        },
        (payload) => {
          console.log('[Analytics Realtime] New event:', payload.new.event_name)
          const state = get()
          
          // Update overview with new event
          if (state.overview) {
            set({
              overview: {
                ...state.overview,
                totalEvents: (state.overview.totalEvents || 0) + 1
              },
              lastUpdated: new Date().toISOString()
            })
          }
        }
      )
      // Sessions - track new visitors in real-time
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'analytics_sessions',
          ...(filter && { filter })
        },
        (payload) => {
          console.log('[Analytics Realtime] New session started')
          const state = get()
          
          // Update overview with new session
          if (state.overview) {
            set({
              overview: {
                ...state.overview,
                totalSessions: (state.overview.totalSessions || 0) + 1
              },
              lastUpdated: new Date().toISOString()
            })
          }
        }
      )
      // Session updates - track completed sessions with duration
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'analytics_sessions',
          ...(filter && { filter })
        },
        (payload) => {
          console.log('[Analytics Realtime] Session updated:', payload.new.id)
          // Session completed - could update avg session duration
          // For now, just mark as updated so UI knows data is fresh
          set({ lastUpdated: new Date().toISOString() })
        }
      )
      .subscribe((status) => {
        console.log('[Analytics Realtime] Subscription status:', status)
        set({ realtimeConnected: status === 'SUBSCRIBED' })
      })
  },

  /**
   * Unsubscribe from realtime analytics updates
   * Call this when leaving the analytics page or on unmount
   */
  unsubscribeFromAnalytics: async () => {
    if (analyticsRealtimeSubscription) {
      console.log('[Analytics Realtime] Unsubscribing')
      await supabase.removeChannel(analyticsRealtimeSubscription)
      analyticsRealtimeSubscription = null
    }
    set({ realtimeConnected: false })
  },

  /**
   * Refresh all analytics data (manual refresh or after realtime updates pile up)
   * Useful for getting accurate aggregates after many realtime updates
   */
  refreshAnalytics: async () => {
    console.log('[Analytics] Manual refresh triggered')
    return get().fetchAllAnalytics()
  }
}))

export default useSiteAnalyticsStore
