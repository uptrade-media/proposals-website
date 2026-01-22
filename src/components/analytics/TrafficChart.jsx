/**
 * TrafficChart - Traffic trend line chart with views and sessions
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'
import { useBrandColors } from '@/hooks/useBrandColors'

// Format date for display
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Format large numbers
const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num?.toLocaleString() || '0'
}

// Custom tooltip
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  
  return (
    <div className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-lg p-3 shadow-xl">
      <p className="text-xs text-[var(--text-secondary)] mb-2 font-medium">
        {formatDate(label)}
      </p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div 
            className="w-2.5 h-2.5 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[var(--text-secondary)]">{entry.name}:</span>
          <span className="font-semibold text-[var(--text-primary)]">
            {formatNumber(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function TrafficChart({ 
  data = [], 
  isLoading = false,
  dateRange = 30,
  showSessions = true,
  title
}) {
  const { primary, secondary } = useBrandColors()
  
  // Calculate totals and trends
  const totalViews = data.reduce((sum, d) => sum + (d.views || 0), 0)
  const totalSessions = data.reduce((sum, d) => sum + (d.sessions || 0), 0)
  
  // Compare first half to second half for trend
  const midPoint = Math.floor(data.length / 2)
  const firstHalfViews = data.slice(0, midPoint).reduce((sum, d) => sum + (d.views || 0), 0)
  const secondHalfViews = data.slice(midPoint).reduce((sum, d) => sum + (d.views || 0), 0)
  const trend = firstHalfViews > 0 ? ((secondHalfViews - firstHalfViews) / firstHalfViews) * 100 : 0
  const isPositive = trend >= 0

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-80">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title || 'Traffic Overview'}</CardTitle>
            <CardDescription>Last {dateRange} days</CardDescription>
          </div>
          <div className="flex items-center gap-4 text-right">
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                {formatNumber(totalViews)}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">Total Views</p>
            </div>
            {trend !== 0 && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                isPositive 
                  ? 'bg-emerald-500/10 text-emerald-500' 
                  : 'bg-red-500/10 text-red-500'
              }`}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(trend).toFixed(1)}%
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={primary} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={primary} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="sessionsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={secondary} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={secondary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="var(--glass-border)" 
                vertical={false}
              />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                stroke="var(--text-tertiary)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tickFormatter={formatNumber}
                stroke="var(--text-tertiary)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => <span className="text-[var(--text-secondary)] text-xs">{value}</span>}
              />
              <Area
                type="monotone"
                dataKey="views"
                name="Page Views"
                stroke={primary}
                strokeWidth={2}
                fill="url(#viewsGradient)"
                dot={false}
                activeDot={{ r: 4, fill: primary, stroke: 'var(--glass-bg)', strokeWidth: 2 }}
              />
              {showSessions && (
                <Area
                  type="monotone"
                  dataKey="sessions"
                  name="Sessions"
                  stroke={secondary}
                  strokeWidth={2}
                  fill="url(#sessionsGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: secondary, stroke: 'var(--glass-bg)', strokeWidth: 2 }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-[var(--text-tertiary)]">
            No traffic data available
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default TrafficChart
