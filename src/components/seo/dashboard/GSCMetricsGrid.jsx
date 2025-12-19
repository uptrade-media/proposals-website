// src/components/seo/dashboard/GSCMetricsGrid.jsx
// Quick stats cards showing clicks, impressions, position, and CTR from Google Search Console
import { Card, CardContent } from '@/components/ui/card'
import { 
  MousePointerClick, 
  Eye, 
  BarChart3, 
  Target,
  TrendingUp,
  TrendingDown
} from 'lucide-react'

function formatNumber(num) {
  if (num === null || num === undefined) return '-'
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

function formatPercent(num) {
  if (num === null || num === undefined) return '-'
  return `${num.toFixed(1)}%`
}

function ChangeIndicator({ value }) {
  if (value === undefined || value === null) return null
  const isPositive = value >= 0
  const Icon = isPositive ? TrendingUp : TrendingDown
  
  return (
    <span className={`flex items-center gap-1 text-xs ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(value).toFixed(1)}%
    </span>
  )
}

function MetricCard({ icon: Icon, iconColor, label, value, change, loading }) {
  return (
    <Card className={loading ? 'animate-pulse' : ''}>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <span className="text-sm text-[var(--text-tertiary)]">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-[var(--text-primary)]">
            {value}
          </span>
          <ChangeIndicator value={change} />
        </div>
      </CardContent>
    </Card>
  )
}

export default function GSCMetricsGrid({ 
  gscMetrics = {}, 
  site = {}, 
  hasGscData = false, 
  loading = false 
}) {
  const metrics = [
    {
      icon: MousePointerClick,
      iconColor: 'text-blue-400',
      label: 'Clicks (28d)',
      value: formatNumber(hasGscData ? gscMetrics.clicks?.value : site?.total_clicks_28d),
      change: hasGscData ? gscMetrics.clicks?.change : undefined
    },
    {
      icon: Eye,
      iconColor: 'text-purple-400',
      label: 'Impressions (28d)',
      value: formatNumber(hasGscData ? gscMetrics.impressions?.value : site?.total_impressions_28d),
      change: hasGscData ? gscMetrics.impressions?.change : undefined
    },
    {
      icon: BarChart3,
      iconColor: 'text-orange-400',
      label: 'Avg Position',
      value: hasGscData 
        ? gscMetrics.position?.value?.toFixed(1) 
        : (site?.avg_position_28d?.toFixed(1) || '-'),
      change: hasGscData ? gscMetrics.position?.change : undefined
    },
    {
      icon: Target,
      iconColor: 'text-green-400',
      label: 'CTR',
      value: hasGscData 
        ? `${(gscMetrics.ctr?.value * 100)?.toFixed(1)}%` 
        : formatPercent(site?.avg_ctr_28d),
      change: hasGscData ? gscMetrics.ctr?.change : undefined
    }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metrics.map((metric, i) => (
        <MetricCard key={i} {...metric} loading={loading} />
      ))}
    </div>
  )
}
