/**
 * WebVitalsCard - Core Web Vitals performance metrics
 * Shows LCP, FID/INP, CLS, FCP, TTFB scores
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Loader2, 
  Gauge, 
  Clock, 
  LayoutGrid,
  Zap,
  Server,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Web Vitals thresholds (based on Google's standards)
const thresholds = {
  LCP: { good: 2500, needsImprovement: 4000 },   // Largest Contentful Paint (ms)
  FID: { good: 100, needsImprovement: 300 },      // First Input Delay (ms)
  INP: { good: 200, needsImprovement: 500 },      // Interaction to Next Paint (ms)
  CLS: { good: 0.1, needsImprovement: 0.25 },     // Cumulative Layout Shift
  FCP: { good: 1800, needsImprovement: 3000 },    // First Contentful Paint (ms)
  TTFB: { good: 800, needsImprovement: 1800 }     // Time to First Byte (ms)
}

// Get rating based on value
function getRating(metric, value) {
  const t = thresholds[metric]
  if (!t) return 'neutral'
  if (value <= t.good) return 'good'
  if (value <= t.needsImprovement) return 'needs-improvement'
  return 'poor'
}

// Format value based on metric type
function formatValue(metric, value) {
  if (value === null || value === undefined) return '--'
  
  if (metric === 'CLS') {
    return value.toFixed(3)
  }
  
  // Time-based metrics
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}s`
  }
  return `${Math.round(value)}ms`
}

// Metric icons
const metricIcons = {
  LCP: LayoutGrid,
  FID: Zap,
  INP: Zap,
  CLS: LayoutGrid,
  FCP: Clock,
  TTFB: Server
}

// Metric descriptions
const metricDescriptions = {
  LCP: 'Largest Contentful Paint - Loading performance',
  FID: 'First Input Delay - Interactivity',
  INP: 'Interaction to Next Paint - Responsiveness',
  CLS: 'Cumulative Layout Shift - Visual stability',
  FCP: 'First Contentful Paint - Initial render',
  TTFB: 'Time to First Byte - Server response'
}

function VitalCard({ metric, value, previousValue = null }) {
  const Icon = metricIcons[metric] || Gauge
  const rating = getRating(metric, value)
  const formattedValue = formatValue(metric, value)
  
  // Calculate change if previous value exists
  let change = null
  let changeDirection = null
  if (previousValue !== null && value !== null) {
    const diff = ((value - previousValue) / previousValue) * 100
    change = Math.abs(diff).toFixed(1)
    // For web vitals, lower is better (except we want the trend to show improvement)
    changeDirection = diff < 0 ? 'improved' : diff > 0 ? 'worsened' : 'neutral'
  }

  const ratingColors = {
    'good': 'bg-green-500/20 text-green-500 border-green-500/30',
    'needs-improvement': 'bg-amber-500/20 text-amber-500 border-amber-500/30',
    'poor': 'bg-red-500/20 text-red-500 border-red-500/30',
    'neutral': 'bg-gray-500/20 text-gray-500 border-gray-500/30'
  }

  const ratingLabels = {
    'good': 'Good',
    'needs-improvement': 'Needs Work',
    'poor': 'Poor',
    'neutral': 'No Data'
  }

  return (
    <div className="p-4 rounded-xl bg-[var(--glass-bg-inset)] border border-[var(--glass-border)]">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-1.5 rounded-lg",
            rating === 'good' && "bg-green-500/20 text-green-500",
            rating === 'needs-improvement' && "bg-amber-500/20 text-amber-500",
            rating === 'poor' && "bg-red-500/20 text-red-500",
            rating === 'neutral' && "bg-gray-500/20 text-gray-500"
          )}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="font-semibold text-[var(--text-primary)]">{metric}</span>
        </div>
        <Badge 
          variant="outline" 
          className={cn("text-xs", ratingColors[rating])}
        >
          {ratingLabels[rating]}
        </Badge>
      </div>
      
      <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
        {formattedValue}
      </div>
      
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-[var(--text-tertiary)] truncate pr-2">
          {metricDescriptions[metric]}
        </p>
        
        {change !== null && (
          <span className={cn(
            "flex items-center gap-0.5 text-xs font-medium flex-shrink-0",
            changeDirection === 'improved' && "text-green-500",
            changeDirection === 'worsened' && "text-red-500",
            changeDirection === 'neutral' && "text-gray-500"
          )}>
            {changeDirection === 'improved' && <TrendingDown className="h-3 w-3" />}
            {changeDirection === 'worsened' && <TrendingUp className="h-3 w-3" />}
            {changeDirection === 'neutral' && <Minus className="h-3 w-3" />}
            {change}%
          </span>
        )}
      </div>
    </div>
  )
}

export function WebVitalsCard({ 
  data = null, 
  isLoading = false,
  previousData = null
}) {
  // Extract values from data
  const metrics = {
    LCP: data?.lcp ?? data?.LCP ?? null,
    FID: data?.fid ?? data?.FID ?? null,
    INP: data?.inp ?? data?.INP ?? null,
    CLS: data?.cls ?? data?.CLS ?? null,
    FCP: data?.fcp ?? data?.FCP ?? null,
    TTFB: data?.ttfb ?? data?.TTFB ?? null
  }

  const prevMetrics = previousData ? {
    LCP: previousData?.lcp ?? previousData?.LCP ?? null,
    FID: previousData?.fid ?? previousData?.FID ?? null,
    INP: previousData?.inp ?? previousData?.INP ?? null,
    CLS: previousData?.cls ?? previousData?.CLS ?? null,
    FCP: previousData?.fcp ?? previousData?.FCP ?? null,
    TTFB: previousData?.ttfb ?? previousData?.TTFB ?? null
  } : {}

  // Calculate overall score (weighted average)
  const hasData = Object.values(metrics).some(v => v !== null)
  let overallScore = null
  if (hasData) {
    let totalWeight = 0
    let weightedSum = 0
    
    const weights = { LCP: 25, FID: 15, INP: 15, CLS: 25, FCP: 10, TTFB: 10 }
    
    Object.entries(metrics).forEach(([key, value]) => {
      if (value !== null) {
        const rating = getRating(key, value)
        const score = rating === 'good' ? 100 : rating === 'needs-improvement' ? 50 : 0
        weightedSum += score * weights[key]
        totalWeight += weights[key]
      }
    })
    
    if (totalWeight > 0) {
      overallScore = Math.round(weightedSum / totalWeight)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-80">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Gauge className="h-5 w-5 text-blue-500" />
              Core Web Vitals
            </CardTitle>
            <CardDescription>Real user performance metrics</CardDescription>
          </div>
          
          {overallScore !== null && (
            <div className="text-right">
              <p className="text-xs text-[var(--text-tertiary)]">Performance Score</p>
              <p className={cn(
                "text-2xl font-bold",
                overallScore >= 90 ? "text-green-500" :
                overallScore >= 50 ? "text-amber-500" :
                "text-red-500"
              )}>
                {overallScore}
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {hasData ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(metrics).map(([key, value]) => (
              value !== null && (
                <VitalCard 
                  key={key} 
                  metric={key} 
                  value={value}
                  previousValue={prevMetrics[key]}
                />
              )
            ))}
          </div>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center text-[var(--text-tertiary)]">
            <Gauge className="h-12 w-12 mb-3 opacity-40" />
            <p>No Web Vitals data available</p>
            <p className="text-xs mt-1">Metrics are collected from real users</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default WebVitalsCard
