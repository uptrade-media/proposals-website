/**
 * MetricsGrid - Key metric cards with trends
 */
import { cn } from '@/lib/utils'
import { 
  Eye, 
  Users, 
  Clock, 
  Target, 
  TrendingUp, 
  TrendingDown,
  MousePointerClick,
  ArrowUpRight,
  Activity,
  Loader2
} from 'lucide-react'

// Map icon names to components
const iconMap = {
  eye: Eye,
  users: Users,
  clock: Clock,
  target: Target,
  activity: Activity,
  click: MousePointerClick
}

function MetricCard({ 
  label, 
  value, 
  change = null,
  trend = 'neutral',
  icon = 'eye',
  color = 'brand'
}) {
  const Icon = typeof icon === 'string' ? (iconMap[icon] || Eye) : icon
  
  const iconColors = {
    brand: 'text-[#39bfb0]',
    blue: 'text-blue-500',
    purple: 'text-purple-500',
    green: 'text-[#4bbf39]',
    orange: 'text-orange-500',
    pink: 'text-pink-500'
  }

  const isPositive = trend === 'up'
  const isNegative = trend === 'down'
  const trendColor = isPositive ? 'text-[#4bbf39]' : isNegative ? 'text-red-500' : 'text-[var(--text-tertiary)]'
  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : ArrowUpRight

  return (
    <div className="rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] p-5 hover:border-[var(--glass-border-hover)] transition-colors">
      <div className="flex flex-col items-center text-center">
        {/* Icon tile */}
        <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center mb-3">
          <Icon className={cn("h-5 w-5", iconColors[color])} />
        </div>
        
        {/* Label */}
        <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1">{label}</p>
        
        {/* Value */}
        <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
        
        {/* Change indicator */}
        {change !== null && (
          <div className="flex items-center gap-1.5 mt-2">
            <span className={cn("flex items-center gap-0.5 text-xs font-medium", trendColor)}>
              <TrendIcon className="h-3 w-3" />
              {typeof change === 'number' ? `${Math.abs(change).toFixed(1)}%` : change}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// Color assignments for different metric types
const metricColors = ['brand', 'blue', 'purple', 'green', 'orange', 'pink']

export function MetricsGrid({ 
  metrics = [],
  isLoading = false,
  columns = 4
}) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
  }

  if (isLoading) {
    return (
      <div className={cn("grid gap-4", gridCols[columns] || gridCols[4])}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] p-5 h-28 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--text-tertiary)]" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn("grid gap-4", gridCols[columns] || gridCols[4])}>
      {metrics.map((metric, index) => (
        <MetricCard
          key={index}
          label={metric.label}
          value={metric.value}
          change={metric.change}
          trend={metric.trend}
          icon={metric.icon}
          color={metricColors[index % metricColors.length]}
        />
      ))}
    </div>
  )
}

export default MetricsGrid
