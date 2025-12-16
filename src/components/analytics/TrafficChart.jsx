/**
 * TrafficChart - Main traffic trend visualization
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AreaChart } from '@tremor/react'
import { TrendingUp, Loader2 } from 'lucide-react'

export function TrafficChart({ 
  data = [], 
  isLoading = false,
  height = 'h-80'
}) {
  // Format data for Tremor
  const chartData = data.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
    'Page Views': d.views || 0,
    'Unique Visitors': d.uniqueVisitors || Math.floor((d.views || 0) * 0.7)
  }))

  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardContent className="flex items-center justify-center h-80">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-full overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#39bfb0]" />
              Traffic Trend
            </CardTitle>
            <CardDescription>
              Daily page views and unique visitors
            </CardDescription>
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#39bfb0]" />
              <span className="text-xs text-[var(--text-secondary)]">Page Views</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-xs text-[var(--text-secondary)]">Unique Visitors</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {chartData.length > 0 ? (
          <AreaChart
            className={height}
            data={chartData}
            index="date"
            categories={['Page Views', 'Unique Visitors']}
            colors={['emerald', 'blue']}
            showLegend={false}
            showGridLines={true}
            curveType="monotone"
            showAnimation={true}
            valueFormatter={(v) => v.toLocaleString()}
          />
        ) : (
          <div className={`${height} flex items-center justify-center text-[var(--text-tertiary)]`}>
            No traffic data available for this period
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default TrafficChart
