/**
 * EngagementMetrics - Detailed user engagement analytics
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  Loader2, 
  Timer, 
  MousePointerClick,
  ArrowUpDown,
  Target,
  Zap,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'

function MetricRow({ icon: Icon, label, value, subValue, percentage, color = 'blue' }) {
  const colorClasses = {
    blue: 'text-blue-500 bg-blue-500/10',
    violet: 'text-violet-500 bg-violet-500/10',
    green: 'text-green-500 bg-green-500/10',
    amber: 'text-amber-500 bg-amber-500/10',
    pink: 'text-pink-500 bg-pink-500/10'
  }

  return (
    <div className="flex items-center gap-3 py-3">
      <div className={cn('p-2 rounded-lg', colorClasses[color])}>
        <Icon className="h-4 w-4" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-[var(--text-secondary)]">{label}</span>
          <div className="text-right">
            <span className="text-sm font-semibold text-[var(--text-primary)]">{value}</span>
            {subValue && (
              <span className="text-xs text-[var(--text-tertiary)] ml-1.5">{subValue}</span>
            )}
          </div>
        </div>
        {typeof percentage === 'number' && (
          <Progress value={percentage} className="h-1.5" />
        )}
      </div>
    </div>
  )
}

export function EngagementMetrics({ 
  data = null, 
  isLoading = false,
  formatDuration = (s) => {
    if (!s) return '0s'
    const mins = Math.floor(s / 60)
    const secs = Math.floor(s % 60)
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-80">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
        </CardContent>
      </Card>
    )
  }

  // Extract engagement metrics from data
  const avgSessionDuration = data?.avgSessionDuration || data?.sessionDuration || 0
  const pagesPerSession = data?.pagesPerSession || data?.avgPagesPerSession || 0
  const bounceRate = data?.bounceRate || 0
  const engagementRate = data?.engagementRate || (100 - bounceRate)
  const scrollDepth = data?.avgScrollDepth || 65
  const timeOnPage = data?.avgTimeOnPage || avgSessionDuration * 0.7

  const metrics = [
    {
      icon: Timer,
      label: 'Avg. Session Duration',
      value: formatDuration(avgSessionDuration),
      subValue: null,
      percentage: Math.min((avgSessionDuration / 300) * 100, 100), // 5 min = 100%
      color: 'blue'
    },
    {
      icon: ArrowUpDown,
      label: 'Pages per Session',
      value: pagesPerSession.toFixed(1),
      subValue: 'pages',
      percentage: Math.min((pagesPerSession / 5) * 100, 100), // 5 pages = 100%
      color: 'violet'
    },
    {
      icon: Target,
      label: 'Engagement Rate',
      value: `${engagementRate.toFixed(1)}%`,
      subValue: null,
      percentage: engagementRate,
      color: 'green'
    },
    {
      icon: MousePointerClick,
      label: 'Avg. Scroll Depth',
      value: `${scrollDepth.toFixed(0)}%`,
      subValue: null,
      percentage: scrollDepth,
      color: 'pink'
    },
    {
      icon: Clock,
      label: 'Avg. Time on Page',
      value: formatDuration(timeOnPage),
      subValue: null,
      percentage: Math.min((timeOnPage / 180) * 100, 100), // 3 min = 100%
      color: 'amber'
    }
  ]

  // Calculate engagement score (0-100)
  const engagementScore = Math.round(
    (Math.min(avgSessionDuration / 180, 1) * 25) + // Up to 25 points for 3+ min sessions
    (Math.min(pagesPerSession / 3, 1) * 25) +      // Up to 25 points for 3+ pages
    ((engagementRate / 100) * 25) +                 // Up to 25 points for engagement
    ((scrollDepth / 100) * 25)                      // Up to 25 points for scroll depth
  )

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Engagement Metrics
            </CardTitle>
            <CardDescription>How users interact with your content</CardDescription>
          </div>
          
          <div className="text-right">
            <p className="text-xs text-[var(--text-tertiary)]">Engagement Score</p>
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "text-2xl font-bold",
                engagementScore >= 75 ? 'text-green-500' :
                engagementScore >= 50 ? 'text-amber-500' :
                'text-red-500'
              )}>
                {engagementScore}
              </span>
              <span className="text-sm text-[var(--text-tertiary)]">/ 100</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="divide-y divide-[var(--glass-border)]">
          {metrics.map((metric, index) => (
            <MetricRow key={index} {...metric} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default EngagementMetrics
