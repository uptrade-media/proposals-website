/**
 * useAnalytics Hook
 * Manages analytics data fetching, subscriptions, and state
 * Used by both Analytics.jsx (site-wide) and AnalyticsPageView.jsx (per-page)
 */
import { useState, useEffect, useRef, useMemo } from 'react'
import useSiteAnalyticsStore from '@/lib/site-analytics-store'
import useAuthStore from '@/lib/auth-store'
import {
  transformTrafficData,
  transformDeviceData,
  transformPagesData,
  transformHourlyData,
  buildFunnelData,
  buildEngagementData,
  getDailyTrend
} from '@/lib/analytics/transformers'
import { buildMetrics, buildPageMetrics } from '@/lib/analytics/metrics'

/**
 * @param {Object} options
 * @param {string} [options.path] - Optional path filter for per-page analytics
 * @returns {Object} Analytics data, loading states, and handlers
 */
export function useAnalytics({ path = null } = {}) {
  const { currentOrg, currentProject } = useAuthStore()
  const projectName = currentProject?.name || 'Your Site'
  const projectDomain = currentProject?.domain

  const {
    overview,
    topPages,
    pageViewsByDay,
    pageViewsByHour,
    webVitals,
    sessions,
    scrollDepth,
    heatmap,
    isLoading,
    error,
    dateRange,
    setDateRange,
    fetchAllAnalytics,
    fetchPageAnalytics,
    setProjectId,
    formatNumber,
    formatDuration,
    formatPercent,
    clearError,
    subscribeToAnalytics,
    unsubscribeFromAnalytics,
    realtimeConnected,
    lastUpdated,
    realtimeData,
    fetchRealtime
  } = useSiteAnalyticsStore()

  const hasFetchedRef = useRef(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [projectReady, setProjectReady] = useState(false)

  // Set project ID for analytics filtering
  useEffect(() => {
    if (currentProject?.id && setProjectId) {
      setProjectId(currentProject.id)
      setProjectReady(true)
    } else if (!currentProject && setProjectId) {
      setProjectId(null)
      setProjectReady(true)
    }
  }, [currentProject?.id, setProjectId])

  // Initial data fetch - wait for project to be ready
  useEffect(() => {
    if (!projectReady) return
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    
    if (path) {
      // Fetch page-specific analytics
      fetchPageAnalytics?.(path) ?? fetchAllAnalytics({ path })
    } else {
      fetchAllAnalytics()
    }
  }, [projectReady, path])

  // Refetch when date range changes
  useEffect(() => {
    if (hasFetchedRef.current) {
      if (path) {
        fetchPageAnalytics?.(path) ?? fetchAllAnalytics({ path })
      } else {
        fetchAllAnalytics()
      }
    }
  }, [dateRange, path])

  // Subscribe to realtime analytics updates
  useEffect(() => {
    if (!projectReady) return
    
    const projectId = currentProject?.id || null
    subscribeToAnalytics(projectId)
    
    return () => {
      unsubscribeFromAnalytics()
    }
  }, [projectReady, currentProject?.id])

  // Poll realtime analytics for active visitors
  useEffect(() => {
    if (!projectReady) return
    const projectId = currentProject?.id || null
    if (!projectId) return

    fetchRealtime(projectId)
    const interval = setInterval(() => {
      fetchRealtime(projectId)
    }, 15000)

    return () => clearInterval(interval)
  }, [projectReady, currentProject?.id, fetchRealtime])

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    if (path) {
      await (fetchPageAnalytics?.(path) ?? fetchAllAnalytics({ path }))
    } else {
      await fetchAllAnalytics()
    }
    const projectId = currentProject?.id || null
    if (projectId) {
      await fetchRealtime(projectId)
    }
    setIsRefreshing(false)
  }

  // Handle date range change
  const handleDateRangeChange = (range) => {
    if (range.preset) {
      setDateRange(range.days)
    }
  }

  // Extract and memoize transformed data
  const summary = overview?.summary || {}
  const dailyTrend = getDailyTrend(overview, pageViewsByDay)
  const topReferrers = overview?.topReferrers || []
  const topEvents = overview?.topEvents || []

  // Memoized transformed data
  const trafficData = useMemo(() => transformTrafficData(dailyTrend), [dailyTrend])
  const deviceData = useMemo(() => transformDeviceData(overview?.deviceBreakdown), [overview?.deviceBreakdown])
  const pagesData = useMemo(() => transformPagesData(topPages), [topPages])
  const hourlyData = useMemo(() => transformHourlyData(pageViewsByHour), [pageViewsByHour])
  const funnelData = useMemo(() => buildFunnelData(summary), [summary])
  const engagementData = useMemo(() => buildEngagementData(summary), [summary])

  // Build metrics based on whether we're viewing a specific page
  const metrics = useMemo(() => {
    if (path) {
      // Find the specific page data if available
      const pageData = pagesData.find(p => p.path === path) || {}
      return buildPageMetrics(summary, pageData, formatNumber, formatDuration)
    }
    return buildMetrics(summary, formatNumber, formatDuration)
  }, [summary, path, pagesData, formatNumber, formatDuration])

  // Realtime data
  const realtimeActiveVisitors = realtimeData?.activeVisitors ?? summary.activeNow ?? 0
  const realtimeEvents = realtimeData?.recentEvents || []

  return {
    // Project info
    projectName,
    projectDomain,
    currentProject,
    
    // State
    isLoading: isLoading && !overview,
    isRefreshing,
    error,
    dateRange,
    projectReady,
    
    // Raw data
    overview,
    webVitals,
    sessions,
    scrollDepth,
    heatmap,
    topReferrers,
    topEvents,
    
    // Transformed data
    trafficData,
    deviceData,
    pagesData,
    hourlyData,
    funnelData,
    engagementData,
    metrics,
    
    // Realtime
    realtimeActiveVisitors,
    realtimeEvents,
    realtimeConnected,
    lastUpdated,
    
    // Handlers
    handleRefresh,
    handleDateRangeChange,
    setDateRange,
    clearError,
    fetchAllAnalytics,
    
    // Formatters
    formatNumber,
    formatDuration,
    formatPercent
  }
}

export default useAnalytics
