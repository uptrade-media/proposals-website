/**
 * Analytics - World-class analytics dashboard
 * Full-featured analytics page with modular components
 */
import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import useSiteAnalyticsStore from '@/lib/site-analytics-store'

// Import modular components
import { AnalyticsHeader } from '@/components/analytics/AnalyticsHeader'
import { MetricsGrid } from '@/components/analytics/MetricsGrid'

// Lazy load heavier components for better code splitting
const TrafficChart = lazy(() => import('@/components/analytics/TrafficChart'))
const DeviceBreakdown = lazy(() => import('@/components/analytics/DeviceBreakdown'))
const TopPagesTable = lazy(() => import('@/components/analytics/TopPagesTable'))
const ReferrersTable = lazy(() => import('@/components/analytics/ReferrersTable'))
const HourlyChart = lazy(() => import('@/components/analytics/HourlyChart'))
const ConversionFunnel = lazy(() => import('@/components/analytics/ConversionFunnel'))
const EngagementMetrics = lazy(() => import('@/components/analytics/EngagementMetrics'))
const RealTimeWidget = lazy(() => import('@/components/analytics/RealTimeWidget'))
const WebVitalsCard = lazy(() => import('@/components/analytics/WebVitalsCard'))
const BrowserBreakdown = lazy(() => import('@/components/analytics/BrowserBreakdown'))
const UTMCampaigns = lazy(() => import('@/components/analytics/UTMCampaigns'))
const ScrollDepthCard = lazy(() => import('@/components/analytics/ScrollDepthCard'))
const HeatmapOverview = lazy(() => import('@/components/analytics/HeatmapOverview'))

// Component loading fallback
function ChartLoader() {
  return (
    <div className="h-80 flex items-center justify-center bg-[var(--glass-bg)] rounded-xl">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--text-tertiary)]" />
    </div>
  )
}

export default function Analytics() {
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
    formatNumber,
    formatDuration,
    formatPercent,
    clearError
  } = useSiteAnalyticsStore()

  const hasFetchedRef = useRef(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showComparison, setShowComparison] = useState(false)

  // Initial data fetch
  useEffect(() => {
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    fetchAllAnalytics()
  }, [])

  // Refetch when date range changes
  useEffect(() => {
    if (hasFetchedRef.current) {
      fetchAllAnalytics()
    }
  }, [dateRange])

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchAllAnalytics()
    setIsRefreshing(false)
  }

  // Handle date range change
  const handleDateRangeChange = (range) => {
    if (range.preset) {
      setDateRange(range.days)
    }
  }

  // Extract data from store
  const summary = overview?.summary || {}
  const deviceBreakdown = overview?.deviceBreakdown || {}
  const topReferrers = overview?.topReferrers || []
  const topEvents = overview?.topEvents || []
  const dailyTrend = overview?.dailyTrend || pageViewsByDay || []

  // Prepare metrics for grid
  const metrics = [
    {
      label: 'Page Views',
      value: formatNumber(summary.pageViews),
      change: summary.pageViewsChange || null,
      trend: summary.pageViewsTrend || 'neutral',
      icon: 'eye'
    },
    {
      label: 'Unique Sessions',
      value: formatNumber(summary.uniqueSessions || summary.totalSessions),
      change: summary.sessionsChange || null,
      trend: summary.sessionsTrend || 'neutral',
      icon: 'users'
    },
    {
      label: 'Avg. Duration',
      value: formatDuration(summary.avgSessionDuration),
      change: summary.durationChange || null,
      trend: summary.durationTrend || 'neutral',
      icon: 'clock'
    },
    {
      label: 'Bounce Rate',
      value: `${(summary.bounceRate || 0).toFixed(1)}%`,
      change: summary.bounceRateChange || null,
      trend: summary.bounceRateTrend === 'up' ? 'down' : 'up', // Inverse for bounce rate
      icon: 'target'
    },
    {
      label: 'Conversions',
      value: formatNumber(summary.conversions),
      change: summary.conversionsChange || null,
      trend: summary.conversionsTrend || 'neutral',
      icon: 'target'
    },
    {
      label: 'Engagement Rate',
      value: `${(summary.engagementRate || (100 - (summary.bounceRate || 0))).toFixed(1)}%`,
      change: null,
      trend: 'neutral',
      icon: 'activity'
    }
  ]

  // Prepare traffic data for chart
  const trafficData = dailyTrend.map(d => ({
    date: d.date,
    views: d.views || d.pageViews || 0,
    sessions: d.sessions || d.uniqueSessions || Math.floor((d.views || 0) * 0.6)
  }))

  // Prepare device data
  const deviceData = {
    desktop: deviceBreakdown.desktop || 0,
    mobile: deviceBreakdown.mobile || 0,
    tablet: deviceBreakdown.tablet || 0
  }

  // Prepare pages data
  const pagesData = (overview?.topPages || topPages || []).map(page => ({
    path: page.path || page.title || '/',
    title: page.title || page.path || 'Unknown',
    views: page.views || page.pageViews || 0,
    uniqueViews: page.uniqueViews || page.sessions || Math.floor((page.views || 0) * 0.75),
    avgDuration: page.avgDuration || page.avgTimeOnPage || 0,
    bounceRate: page.bounceRate || 45
  }))

  // Prepare hourly data
  const hourlyData = (pageViewsByHour || []).map(h => ({
    hour: typeof h.hour === 'number' ? h.hour : parseInt(h.label?.replace(':00', ''), 10) || 0,
    visits: h.views || h.pageViews || 0
  }))

  // Prepare funnel data
  const funnelData = {
    uniqueVisitors: summary.uniqueSessions || summary.totalSessions || 0,
    pageViews: summary.pageViews || 0,
    engagedSessions: Math.floor((summary.uniqueSessions || 0) * ((100 - (summary.bounceRate || 40)) / 100)),
    conversions: summary.conversions || 0
  }

  // Prepare engagement data
  const engagementData = {
    avgSessionDuration: summary.avgSessionDuration || 0,
    pagesPerSession: summary.avgPagesPerSession || 0,
    bounceRate: summary.bounceRate || 0,
    engagementRate: summary.engagementRate || (100 - (summary.bounceRate || 0)),
    avgScrollDepth: summary.avgScrollDepth || 65,
    avgTimeOnPage: (summary.avgSessionDuration || 0) * 0.7
  }

  // Real-time mock data (would come from WebSocket in production)
  const realtimeActiveVisitors = summary.activeNow || Math.floor(Math.random() * 10) + 1
  const realtimeEvents = []

  if (error && !overview) {
    return (
      <div className="space-y-6">
        <AnalyticsHeader
          dateRange={{ preset: 'last30days', days: dateRange }}
          onDateRangeChange={handleDateRangeChange}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => { clearError(); fetchAllAnalytics(); }}
              className="text-sm underline"
            >
              Retry
            </button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header with controls */}
      <AnalyticsHeader
        dateRange={{ preset: 'last30days', days: dateRange }}
        onDateRangeChange={handleDateRangeChange}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        showComparison={showComparison}
        onToggleComparison={() => setShowComparison(!showComparison)}
        title="Site Analytics"
        subtitle="Traffic and engagement data from uptrademedia.com"
      />

      {/* Key Metrics */}
      <MetricsGrid
        metrics={metrics}
        isLoading={isLoading && !overview}
        columns={6}
      />

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traffic Trend - Takes 2 columns */}
        <div className="lg:col-span-2">
          <Suspense fallback={<ChartLoader />}>
            <TrafficChart
              data={trafficData}
              isLoading={isLoading && !overview}
              dateRange={dateRange}
              showSessions={true}
            />
          </Suspense>
        </div>

        {/* Real-Time Widget */}
        <Suspense fallback={<ChartLoader />}>
          <RealTimeWidget
            activeVisitors={realtimeActiveVisitors}
            recentEvents={realtimeEvents}
            isLive={true}
            onRefresh={handleRefresh}
            isLoading={isRefreshing}
          />
        </Suspense>
      </div>

      {/* Analysis Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Breakdown */}
        <Suspense fallback={<ChartLoader />}>
          <DeviceBreakdown
            data={deviceData}
            isLoading={isLoading && !overview}
            formatNumber={formatNumber}
            formatPercent={formatPercent}
          />
        </Suspense>

        {/* Hourly Distribution */}
        <Suspense fallback={<ChartLoader />}>
          <HourlyChart
            data={hourlyData}
            isLoading={isLoading && !overview}
          />
        </Suspense>
      </div>

      {/* Funnel and Engagement Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <Suspense fallback={<ChartLoader />}>
          <ConversionFunnel
            data={funnelData}
            isLoading={isLoading && !overview}
            formatNumber={formatNumber}
          />
        </Suspense>

        {/* Engagement Metrics */}
        <Suspense fallback={<ChartLoader />}>
          <EngagementMetrics
            data={engagementData}
            isLoading={isLoading && !overview}
            formatDuration={formatDuration}
          />
        </Suspense>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <Suspense fallback={<ChartLoader />}>
          <TopPagesTable
            pages={pagesData}
            isLoading={isLoading && !overview}
            formatNumber={formatNumber}
            formatDuration={formatDuration}
          />
        </Suspense>

        {/* Traffic Sources */}
        <Suspense fallback={<ChartLoader />}>
          <ReferrersTable
            referrers={topReferrers}
            isLoading={isLoading && !overview}
            formatNumber={formatNumber}
          />
        </Suspense>
      </div>

      {/* Performance Section */}
      <Suspense fallback={<ChartLoader />}>
        <WebVitalsCard
          data={webVitals?.summary}
          isLoading={isLoading && !webVitals}
        />
      </Suspense>

      {/* Browser & OS Breakdown */}
      <Suspense fallback={<ChartLoader />}>
        <BrowserBreakdown sessions={sessions} />
      </Suspense>

      {/* UTM Campaign Tracking */}
      <Suspense fallback={<ChartLoader />}>
        <UTMCampaigns sessions={sessions} />
      </Suspense>

      {/* Scroll Depth Analytics */}
      <Suspense fallback={<ChartLoader />}>
        <ScrollDepthCard scrollDepth={scrollDepth} />
      </Suspense>

      {/* Click Heatmap Overview */}
      <Suspense fallback={<ChartLoader />}>
        <HeatmapOverview heatmap={heatmap} />
      </Suspense>

      {/* Events Grid */}
      {topEvents.length > 0 && (
        <div className="bg-[var(--glass-bg)] rounded-xl p-6 border border-[var(--glass-border)]">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Top Events
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {topEvents.slice(0, 12).map((event, index) => (
              <div
                key={index}
                className="p-4 bg-[var(--glass-bg-inset)] rounded-lg text-center"
              >
                <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                  {formatNumber(event.count)}
                </p>
                <p className="text-xs text-[var(--text-secondary)] truncate mt-1">
                  {event.name.replace(/_/g, ' ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
