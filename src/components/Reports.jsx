import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  BarChart3, 
  PieChart as PieChartIcon,
  Activity,
  DollarSign,
  FileText,
  MessageSquare,
  Users,
  Calendar,
  Loader2,
  Download,
  RefreshCw
} from 'lucide-react'
import useReportsStore from '@/lib/reports-store'
import useAuthStore from '@/lib/auth-store'
import LighthouseReport from '@/components/LighthouseReport'

const Reports = () => {
  const { user } = useAuthStore()
  const { 
    overviewReport,
    projectReport,
    financialReport,
    activityReport,
    fetchOverviewReport,
    fetchProjectReport,
    fetchFinancialReport,
    fetchActivityReport,
    formatCurrency,
    formatPercentage,
    formatFileSize,
    getStatusColor,
    getChartColors,
    calculateGrowthRate,
    getTrendDirection,
    isLoading, 
    error, 
    clearError 
  } = useReportsStore()
  
  const hasFetchedRef = useRef(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [dateFilters, setDateFilters] = useState({
    start_date: '',
    end_date: ''
  })
  const [activityDays, setActivityDays] = useState(30)

  // Fetch initial data only once
  useEffect(() => {
    if (hasFetchedRef.current) return
    
    console.log('[Reports] Fetching initial data')
    hasFetchedRef.current = true
    fetchOverviewReport()
    fetchActivityReport(activityDays)
  }, [])
  
  // Refetch activity report when days change
  useEffect(() => {
    if (hasFetchedRef.current && activityDays) {
      console.log('[Reports] Refetching activity report for', activityDays, 'days')
      fetchActivityReport(activityDays)
    }
  }, [activityDays])

  const handleDateFilterChange = (field, value) => {
    setDateFilters(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const applyFilters = () => {
    if (activeTab === 'projects') {
      fetchProjectReport(dateFilters)
    } else if (activeTab === 'financial') {
      fetchFinancialReport(dateFilters)
    }
  }

  const resetFilters = () => {
    setDateFilters({ start_date: '', end_date: '' })
    if (activeTab === 'projects') {
      fetchProjectReport()
    } else if (activeTab === 'financial') {
      fetchFinancialReport()
    }
  }

  const chartColors = getChartColors()

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes('Revenue') || entry.name.includes('Amount') 
                ? formatCurrency(entry.value) 
                : entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-gray-600">Insights and analytics for your business</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => {
              fetchOverviewReport()
              fetchActivityReport(activityDays)
              if (activeTab === 'projects') fetchProjectReport(dateFilters)
              if (activeTab === 'financial') fetchFinancialReport(dateFilters)
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="lighthouse">Lighthouse</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {isLoading && !overviewReport ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#4bbf39]" />
            </div>
          ) : overviewReport ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Projects</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {overviewReport.summary.total_projects}
                        </p>
                        <p className="text-xs text-gray-500">
                          {overviewReport.summary.active_projects} active
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(overviewReport.summary.total_revenue)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(overviewReport.summary.pending_revenue)} pending
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Messages</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {overviewReport.summary.total_messages}
                        </p>
                        <p className="text-xs text-gray-500">
                          {overviewReport.summary.recent_messages} recent
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <MessageSquare className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Files</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {overviewReport.summary.total_files}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(overviewReport.summary.total_file_size)}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Project Status Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Project Status Distribution</CardTitle>
                    <CardDescription>Current project status breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={overviewReport.charts.project_status_distribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }) => `${name} (${percentage}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {overviewReport.charts.project_status_distribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Revenue Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Trend</CardTitle>
                    <CardDescription>Monthly revenue over the last 6 months</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={overviewReport.charts.revenue_trend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month_name" />
                        <YAxis tickFormatter={formatCurrency} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#4bbf39" 
                          fill="#4bbf39" 
                          fillOpacity={0.3}
                          name="Revenue"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Project Creation Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Project Creation Trend</CardTitle>
                  <CardDescription>New projects created over the last 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={overviewReport.charts.project_trend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month_name" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" fill="#39bfb0" name="New Projects" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No data available</h3>
                <p className="text-gray-500 text-center">
                  Unable to load overview report. Please try refreshing.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          {/* Date Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={dateFilters.start_date}
                    onChange={(e) => handleDateFilterChange('start_date', e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={dateFilters.end_date}
                    onChange={(e) => handleDateFilterChange('end_date', e.target.value)}
                  />
                </div>
                <div className="flex space-x-2 pt-6">
                  <Button onClick={applyFilters} disabled={isLoading}>
                    Apply Filters
                  </Button>
                  <Button variant="outline" onClick={resetFilters}>
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Load project report on tab change */}
          {activeTab === 'projects' && !projectReport && (
            <div className="text-center py-8">
              <Button 
                onClick={() => fetchProjectReport(dateFilters)}
                disabled={isLoading}
                className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] hover:from-[#3da832] hover:to-[#2da89a]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load Project Report'
                )}
              </Button>
            </div>
          )}

          {projectReport && (
            <>
              {/* Project Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">
                        {projectReport.summary.total_projects}
                      </p>
                      <p className="text-sm text-gray-600">Total Projects</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(projectReport.summary.total_budget)}
                      </p>
                      <p className="text-sm text-gray-600">Total Budget</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {Object.values(projectReport.summary.avg_duration_by_status).length > 0
                          ? Math.round(Object.values(projectReport.summary.avg_duration_by_status).reduce((a, b) => a + b, 0) / Object.values(projectReport.summary.avg_duration_by_status).length)
                          : 0
                        }
                      </p>
                      <p className="text-sm text-gray-600">Avg Duration (days)</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Project Status Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Project Status Summary</CardTitle>
                  <CardDescription>Distribution of projects by status</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={Object.entries(projectReport.summary.status_summary).map(([status, count]) => ({ status, count }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#4bbf39" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          {/* Date Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Label htmlFor="financial_start_date">Start Date</Label>
                  <Input
                    id="financial_start_date"
                    type="date"
                    value={dateFilters.start_date}
                    onChange={(e) => handleDateFilterChange('start_date', e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="financial_end_date">End Date</Label>
                  <Input
                    id="financial_end_date"
                    type="date"
                    value={dateFilters.end_date}
                    onChange={(e) => handleDateFilterChange('end_date', e.target.value)}
                  />
                </div>
                <div className="flex space-x-2 pt-6">
                  <Button onClick={applyFilters} disabled={isLoading}>
                    Apply Filters
                  </Button>
                  <Button variant="outline" onClick={resetFilters}>
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Load financial report on tab change */}
          {activeTab === 'financial' && !financialReport && (
            <div className="text-center py-8">
              <Button 
                onClick={() => fetchFinancialReport(dateFilters)}
                disabled={isLoading}
                className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] hover:from-[#3da832] hover:to-[#2da89a]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load Financial Report'
                )}
              </Button>
            </div>
          )}

          {financialReport && (
            <>
              {/* Financial Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(financialReport.summary.total_revenue)}
                      </p>
                      <p className="text-sm text-gray-600">Total Revenue</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(financialReport.summary.avg_invoice_value)}
                      </p>
                      <p className="text-sm text-gray-600">Avg Invoice</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-600">
                        {formatCurrency(financialReport.summary.overdue_amount)}
                      </p>
                      <p className="text-sm text-gray-600">Overdue Amount</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {financialReport.summary.avg_payment_days}
                      </p>
                      <p className="text-sm text-gray-600">Avg Payment Days</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Revenue Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Revenue Trend</CardTitle>
                  <CardDescription>Revenue breakdown by month</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={financialReport.breakdown.monthly_revenue}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month_name" />
                      <YAxis tickFormatter={formatCurrency} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#4bbf39" 
                        strokeWidth={2}
                        name="Revenue"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          {/* Activity Period Selector */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <Label htmlFor="activity_days">Time Period</Label>
                <Select 
                  value={activityDays.toString()} 
                  onValueChange={(value) => setActivityDays(parseInt(value))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {activityReport && (
            <>
              {/* Activity Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">New Projects</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {activityReport.summary.new_projects}
                        </p>
                      </div>
                      <FileText className="w-8 h-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">New Messages</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {activityReport.summary.new_messages}
                        </p>
                      </div>
                      <MessageSquare className="w-8 h-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">New Files</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {activityReport.summary.new_files}
                        </p>
                      </div>
                      <FileText className="w-8 h-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Activity</p>
                        <p className="text-2xl font-bold text-green-600">
                          {activityReport.summary.total_activity}
                        </p>
                      </div>
                      <Activity className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Daily Activity Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Daily Activity</CardTitle>
                  <CardDescription>Activity breakdown over the selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={activityReport.daily_activity}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date_name" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="projects" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="Projects" />
                      <Area type="monotone" dataKey="messages" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" name="Messages" />
                      <Area type="monotone" dataKey="files" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Files" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Most Active Users (Admin only) */}
              {user?.role === 'admin' && activityReport.user_activity.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Most Active Users</CardTitle>
                    <CardDescription>Top users by activity in the selected period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {activityReport.user_activity.map((user, index) => (
                        <div key={user.user_id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] rounded-full flex items-center justify-center text-white font-medium">
                              {user.user_name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{user.user_name}</p>
                              <p className="text-sm text-gray-500">{user.user_email}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{user.total_activity} activities</p>
                            <p className="text-sm text-gray-500">
                              {user.messages} messages, {user.files} files
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="lighthouse" className="space-y-6">
          <LighthouseReport projectId={null} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Reports
