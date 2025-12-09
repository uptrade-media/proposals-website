import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown,
  Minus,
  Eye,
  Users,
  Clock,
  MousePointer,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  BarChart3,
  Activity,
  Target,
  ExternalLink,
  Loader2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight
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

  // Fetch data on mount
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

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchAllAnalytics()
    setIsRefreshing(false)
  }

  const handleDateRangeChange = (value) => {
    setDateRange(parseInt(value))
  }

  // Get device icon
  const getDeviceIcon = (device) => {
    switch (device?.toLowerCase()) {
      case 'mobile': return <Smartphone className="h-4 w-4" />
      case 'tablet': return <Tablet className="h-4 w-4" />
      default: return <Monitor className="h-4 w-4" />
    }
  }

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatNumber(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Loading state
  if (isLoading && !overview) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
        <span className="ml-3 text-[var(--text-secondary)]">Loading analytics...</span>
      </div>
    )
  }

  // Error state
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
  const dailyTrend = overview?.dailyTrend || pageViewsByDay || []

  // Calculate device totals
  const totalDevices = (deviceBreakdown.desktop || 0) + (deviceBreakdown.mobile || 0) + (deviceBreakdown.tablet || 0)
  const deviceData = [
    { name: 'Desktop', value: deviceBreakdown.desktop || 0, color: '#4bbf39' },
    { name: 'Mobile', value: deviceBreakdown.mobile || 0, color: '#3b82f6' },
    { name: 'Tablet', value: deviceBreakdown.tablet || 0, color: '#f59e0b' }
  ].filter(d => d.value > 0)

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
            {dailyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value)
                      return `${date.getMonth() + 1}/${date.getDate()}`
                    }}
                  />
                  <YAxis 
                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                    tickFormatter={formatNumber}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="views" 
                    stroke="#4bbf39" 
                    fill="#4bbf39" 
                    fillOpacity={0.2}
                    name="Page Views"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-[var(--text-tertiary)]">
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
                <ResponsiveContainer width="50%" height={250}>
                  <PieChart>
                    <Pie
                      data={deviceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {deviceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3">
                  {deviceData.map((device, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: device.color }}
                        />
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
              <div className="h-[250px] flex items-center justify-center text-[var(--text-tertiary)]">
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
      {pageViewsByHour && pageViewsByHour.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Traffic by Hour</CardTitle>
            <CardDescription>When visitors are most active</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={pageViewsByHour}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                  interval={2}
                />
                <YAxis 
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                  tickFormatter={formatNumber}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="views" 
                  fill="#4bbf39" 
                  radius={[2, 2, 0, 0]}
                  name="Page Views"
                />
              </BarChart>
            </ResponsiveContainer>
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
