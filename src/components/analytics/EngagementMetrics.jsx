/**
 * EngagementMetrics - Key engagement statistics with visual indicators
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Clock, Layers, ArrowDownRight, Activity, MousePointer, Timer } from 'lucide-react'
import { useBrandColors } from '@/hooks/useBrandColors'

const defaultFormatDuration = (seconds) => {
  if (!seconds) return '0s'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}m ${secs}s`
}

export function EngagementMetrics({ 
  data = {}, 
  isLoading = false,
  formatDuration = defaultFormatDuration 
}) {
  const { primary, secondary } = useBrandColors()
  
  const metrics = [
    {
      label: 'Avg. Session Duration',
      value: formatDuration(data.avgSessionDuration || 0),
      icon: Clock,
      description: 'Time spent per session',
      color: primary,
      percentage: Math.min(100, ((data.avgSessionDuration || 0) / 300) * 100) // 5 min = 100%
    },
    {
      label: 'Pages per Session',
      value: (data.pagesPerSession || 0).toFixed(1),
      icon: Layers,
      description: 'Average pages viewed',
      color: secondary,
      percentage: Math.min(100, ((data.pagesPerSession || 0) / 5) * 100) // 5 pages = 100%
    },
    {
      label: 'Bounce Rate',
      value: `${(data.bounceRate || 0).toFixed(1)}%`,
      icon: ArrowDownRight,
      description: 'Single page visits',
      color: data.bounceRate > 50 ? '#ef4444' : data.bounceRate > 30 ? '#f59e0b' : '#22c55e',
      percentage: data.bounceRate || 0,
      inverse: true // Lower is better
    },
    {
      label: 'Engagement Rate',
      value: `${(data.engagementRate || 0).toFixed(1)}%`,
      icon: Activity,
      description: 'Active user sessions',
      color: data.engagementRate > 70 ? '#22c55e' : data.engagementRate > 40 ? '#f59e0b' : '#ef4444',
      percentage: data.engagementRate || 0
    },
    {
      label: 'Avg. Scroll Depth',
      value: `${(data.avgScrollDepth || 0).toFixed(0)}%`,
      icon: MousePointer,
      description: 'Content consumed',
      color: primary,
      percentage: data.avgScrollDepth || 0
    },
    {
      label: 'Avg. Time on Page',
      value: formatDuration(data.avgTimeOnPage || 0),
      icon: Timer,
      description: 'Per page duration',
      color: secondary,
      percentage: Math.min(100, ((data.avgTimeOnPage || 0) / 180) * 100) // 3 min = 100%
    }
  ]

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-72">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Engagement Metrics</CardTitle>
        <CardDescription>How users interact with your content</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((metric) => {
            const Icon = metric.icon
            
            return (
              <div 
                key={metric.label}
                className="p-3 rounded-lg bg-[var(--glass-bg-inset)] border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${metric.color}15` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: metric.color }} />
                  </div>
                  <span className="text-lg font-bold text-[var(--text-primary)] tabular-nums">
                    {metric.value}
                  </span>
                </div>
                
                <p className="text-xs font-medium text-[var(--text-primary)] mb-1">
                  {metric.label}
                </p>
                <p className="text-xs text-[var(--text-tertiary)] mb-2">
                  {metric.description}
                </p>
                
                {/* Progress bar */}
                <div className="h-1.5 bg-[var(--glass-border)] rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${metric.percentage}%`,
                      backgroundColor: metric.color
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default EngagementMetrics
