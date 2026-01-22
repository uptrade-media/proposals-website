import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AreaChart, BarChart, DonutChart } from '@tremor/react'
import { 
  Eye,
  Users,
  Clock,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  Target,
  ExternalLink,
  Loader2,
  RefreshCw
} from 'lucide-react'
import useSiteAnalyticsStore from '@/lib/site-analytics-store'

const COLORS = ['#4bbf39', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

const SiteAnalytics = () => {
  const { 
    overview,
    topPages,
    pageViewsByDay,
    pageViewsByHour,
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

  useEffect(() => {
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    fetchAllAnalytics()
  }, [])

  useEffect(() => {
    if (hasFetchedRef.current) {
      fetchAllAnalytics()
    }
  }, [dateRange])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchAllAnalytics()
    setIsRefreshing(false)
  }

  const handleDateRangeChange = (value) => {
    setDateRange(parseInt(value))
  }

  const getDeviceIcon = (device) => {
    switch (device?.toLowerCase()) {
      case 'mobile': return <Smartphone className="h-4 w-4" />
      case 'tablet': return <Tablet className="h-4 w-4" />
      default: return <Monitor className="h-4 w-4" />
    }
  }

  if (isLoading && !overview) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
        <span className="ml-3 text-[var(--text-secondary)]">Loading analytics...</span>
      </div>
    )
  }

  if (error && !overview) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => { clearError(); fetchAllAnalytics(); }}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  const summary = overview?.summary || {}
  const deviceBreakdown = overview?.deviceBreakdown || {}
  const topReferrers = overview?.topReferrers || []
  const topEvents = overview?.topEvents || []
  // API returns dailyPageViews with { date, count } format
  const dailyTrend = overview?.dailyPageViews || overview?.dailyTrend || pageViewsByDay || []

  // Format data for Tremor charts - handle count field from API
  const trendData = dailyTrend.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    'Page Views': d.views || d.count || 0
  }))

  const totalDevices = (deviceBreakdown.desktop || 0) + (deviceBreakdown.mobile || 0) + (deviceBreakdown.tablet || 0)
  const deviceData = [
    { name: 'Desktop', value: deviceBreakdown.desktop || 0 },
    { name: 'Mobile', value: deviceBreakdown.mobile || 0 },
    { name: 'Tablet', value: deviceBreakdown.tablet || 0 }
  ].filter(d => d.value > 0)

  const hourlyData = (pageViewsByHour || []).map(h => ({
    hour: h.label,
    'Page Views': h.views || 0
  }))

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Site Analytics</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Traffic and engagement data from uptrademedia.com
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange.toString()} onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--text-secondary)]">Page Views</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {formatNumber(summary.pageViews)}
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {formatNumber(summary.uniqueSessions)} unique sessions
                </p>
              </div>
              <div className="w-12 h-12 bg-[var(--brand-primary)]/20 rounded-xl flex items-center justify-center">
                <Eye className="w-6 h-6 text-[var(--brand-primary)]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--text-secondary)]">Total Sessions</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {formatNumber(summary.totalSessions)}
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {(summary.avgPagesPerSession || 0).toFixed(1)} pages/session
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--text-secondary)]">Avg. Duration</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {formatDuration(summary.avgSessionDuration)}
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  per session
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--text-secondary)]">Conversions</p>
                <p className="text-2xl font-bold text-[var(--accent-success)]">
                  {formatNumber(summary.conversions)}
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {(summary.conversionRate || 0).toFixed(2)}% rate
                </p>
              </div>
              <div className="w-12 h-12 bg-[var(--accent-success)]/20 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-[var(--accent-success)]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Traffic Trend</CardTitle>
            <CardDescription>Daily page views over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <AreaChart
                className="h-72"
                data={trendData}
                index="date"
                categories={['Page Views']}
                colors={['emerald']}
                showLegend={false}
                showGridLines={true}
                curveType="monotone"
              />
            ) : (
              <div className="h-72 flex items-center justify-center text-[var(--text-tertiary)]">
                No trend data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Device Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Device Breakdown</CardTitle>
            <CardDescription>Sessions by device type</CardDescription>
          </CardHeader>
          <CardContent>
            {deviceData.length > 0 ? (
              <div className="flex items-center gap-6">
                <DonutChart
                  className="h-52 w-52"
                  data={deviceData}
                  category="value"
                  index="name"
                  colors={['emerald', 'blue', 'amber']}
                  showLabel={false}
                />
                <div className="flex-1 space-y-3">
                  {deviceData.map((device, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(device.name)}
                        <span className="text-sm text-[var(--text-primary)]">{device.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {formatNumber(device.value)}
                        </span>
                        <span className="text-xs text-[var(--text-tertiary)] ml-2">
                          ({formatPercent(device.value, totalDevices)})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-52 flex items-center justify-center text-[var(--text-tertiary)]">
                No device data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Pages</CardTitle>
            <CardDescription>Most visited pages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(overview?.topPages || topPages || []).slice(0, 10).map((page, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between py-2 border-b border-[var(--border-primary)] last:border-0"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-sm font-medium text-[var(--text-tertiary)] w-6">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {page.path || page.title || '/'}
                      </p>
                      {page.title && page.path && (
                        <p className="text-xs text-[var(--text-tertiary)] truncate">
                          {page.title}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-medium text-[var(--text-primary)] ml-3">
                    {formatNumber(page.views)}
                  </span>
                </div>
              ))}
              {(!overview?.topPages && !topPages) && (
                <div className="py-8 text-center text-[var(--text-tertiary)]">
                  No page data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Referrers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Traffic Sources</CardTitle>
            <CardDescription>Where visitors come from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topReferrers.slice(0, 10).map((referrer, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between py-2 border-b border-[var(--border-primary)] last:border-0"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Globe className="w-4 h-4 text-[var(--text-tertiary)]" />
                    <span className="text-sm text-[var(--text-primary)] truncate">
                      {referrer.referrer || 'Direct'}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-[var(--text-primary)] ml-3">
                    {formatNumber(referrer.count)}
                  </span>
                </div>
              ))}
              {topReferrers.length === 0 && (
                <div className="py-8 text-center text-[var(--text-tertiary)]">
                  No referrer data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events Section */}
      {topEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Events</CardTitle>
            <CardDescription>Most triggered events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {topEvents.slice(0, 12).map((event, index) => (
                <div 
                  key={index}
                  className="p-4 bg-[var(--bg-secondary)] rounded-lg text-center"
                >
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    {formatNumber(event.count)}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] truncate">
                    {event.name.replace(/_/g, ' ')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hourly Distribution */}
      {hourlyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Traffic by Hour</CardTitle>
            <CardDescription>When visitors are most active</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              className="h-48"
              data={hourlyData}
              index="hour"
              categories={['Page Views']}
              colors={['emerald']}
              showLegend={false}
            />
          </CardContent>
        </Card>
      )}

      {/* Link to full analytics */}
      <div className="text-center pt-4">
        <Button 
          variant="outline" 
          onClick={() => window.open('https://uptrademedia.com/admin/analytics', '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          View Full Analytics Dashboard
        </Button>
      </div>
    </div>
  )
}

export default SiteAnalytics
