/**
 * CRMAnalyticsDashboard - Analytics view matching CRM aesthetic
 * Shows pipeline metrics, conversion rates, velocity, and performance
 */
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  AreaChart,
  BarChart,
  DonutChart
} from '@tremor/react'
import { 
  Clock, 
  Target,
  DollarSign,
  Users,
  Calendar,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  Send,
  MessageSquare,
  CheckCheck,
  XCircle
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { crmApi } from '@/lib/portal-api'
import { useBrandColors } from '@/hooks/useBrandColors'
import { toast } from '@/lib/toast'

// Format currency
const formatCurrency = (value) => {
  if (!value) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

// Format percentage
const formatPercent = (value) => {
  if (!value && value !== 0) return '0%'
  return `${Math.round(value)}%`
}

// Pipeline stages for reference
const STAGE_CONFIG = {
  new_lead: { label: 'New Lead', color: '#3B82F6', icon: Sparkles },
  contacted: { label: 'Contacted', color: '#39bfb0', icon: PhoneCall },
  qualified: { label: 'Qualified', color: '#F59E0B', icon: CheckCircle2 },
  proposal_sent: { label: 'Proposal Sent', color: '#8B5CF6', icon: Send },
  negotiating: { label: 'Negotiating', color: '#F97316', icon: MessageSquare },
  closed_won: { label: 'Won', color: '#22C55E', icon: CheckCheck },
  closed_lost: { label: 'Lost', color: '#EF4444', icon: XCircle }
}

// KPI Card Component
function KPICard({ title, value, subtitle, subtitleValue, icon: Icon, color, trend }) {
  return (
    <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
      <div className="flex items-start justify-between mb-3">
        <div 
          className="p-2.5 rounded-lg"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        {trend !== undefined && (
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs font-medium gap-0.5",
              trend >= 0 ? "text-green-600 border-green-200 bg-green-50" : "text-red-600 border-red-200 bg-red-50"
            )}
          >
            {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend)}%
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-1">{title}</p>
      <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
      {subtitle && (
        <div className="flex justify-between mt-2 pt-2 border-t border-[var(--glass-border)]">
          <span className="text-xs text-muted-foreground">{subtitle}</span>
          <span className="text-xs font-semibold">{subtitleValue}</span>
        </div>
      )}
    </div>
  )
}

// Stage Progress Row
function StageProgressRow({ stage, count, total, conversionRate }) {
  const config = STAGE_CONFIG[stage] || { label: stage, color: '#6B7280', icon: Sparkles }
  const Icon = config.icon
  const percentage = total > 0 ? (count / total) * 100 : 0

  return (
    <div className="flex items-center gap-3 py-2">
      <div 
        className="p-1.5 rounded-lg flex-shrink-0"
        style={{ backgroundColor: `${config.color}15` }}
      >
        <Icon className="h-3.5 w-3.5" style={{ color: config.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium truncate">{config.label}</span>
          <span className="text-xs text-muted-foreground">{count}</span>
        </div>
        <Progress 
          value={percentage} 
          className="h-1.5"
        />
      </div>
      {conversionRate !== undefined && (
        <Badge 
          variant="outline" 
          className="text-[10px] h-5 ml-1"
          style={{ color: config.color, borderColor: `${config.color}30` }}
        >
          {formatPercent(conversionRate)}
        </Badge>
      )}
    </div>
  )
}

export default function CRMAnalyticsDashboard({ projectId, isAgency }) {
  const { primary: brandPrimary, rgba } = useBrandColors()
  const [isLoading, setIsLoading] = useState(true)
  const [analytics, setAnalytics] = useState({
    summary: {},
    velocity: {},
    stages: [],
    sources: [],
    timeline: [],
    deals: {}
  })

  useEffect(() => {
    if (projectId) {
      fetchAnalytics()
    }
  }, [projectId])

  const fetchAnalytics = async () => {
    setIsLoading(true)
    try {
      const [summaryRes, velocityRes] = await Promise.all([
        crmApi.getPipelineSummary({ projectId }),
        crmApi.getPipelineVelocity({ projectId })
      ])

      // Safely extract data with fallbacks
      const summaryData = summaryRes?.data || {}
      const velocityData = velocityRes?.data || {}

      setAnalytics({
        summary: summaryData,
        velocity: velocityData,
        stages: summaryData.byStage || [],
        sources: summaryData.bySource || [],
        timeline: velocityData.timeline || [],
        deals: summaryData.deals || {}
      })
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
      toast.error('Failed to load analytics')
      // Set empty state on error
      setAnalytics({
        summary: {},
        velocity: {},
        stages: [],
        sources: [],
        timeline: [],
        deals: {}
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: brandPrimary }} />
          <p className="text-sm text-[var(--text-tertiary)]">Loading analytics...</p>
        </div>
      </div>
    )
  }

  const { summary, velocity, stages, sources, timeline, deals } = analytics

  // Process stage data for the breakdown with safety checks
  const stageData = Object.entries(STAGE_CONFIG)
    .filter(([key]) => !['closed_won', 'closed_lost'].includes(key))
    .map(([key, config]) => ({
      stage: key,
      count: summary?.byStage?.[key] || 0,
      conversionRate: Array.isArray(stages) ? stages.find?.(s => s.key === key)?.conversionRate : undefined
    }))

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Pipeline Analytics</h2>
          <p className="text-sm text-muted-foreground">Performance metrics and insights</p>
        </div>
        <Badge variant="outline" className="text-xs">
          <Calendar className="h-3 w-3 mr-1" />
          Last 30 days
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Prospects"
          value={summary.total || 0}
          subtitle="Active"
          subtitleValue={summary.active || 0}
          icon={Users}
          color="#3B82F6"
          trend={summary.growthRate}
        />
        <KPICard
          title="Conversion Rate"
          value={formatPercent(summary.conversionRate)}
          subtitle="Won"
          subtitleValue={summary.won || 0}
          icon={Target}
          color="#22C55E"
          trend={summary.conversionTrend}
        />
        <KPICard
          title="Avg Time to Close"
          value={`${velocity.avgDaysToClose || 0}d`}
          subtitle="Fastest"
          subtitleValue={`${velocity.fastestDeal || 0}d`}
          icon={Clock}
          color="#F59E0B"
        />
        <KPICard
          title="Pipeline Value"
          value={formatCurrency(deals.totalValue)}
          subtitle="Weighted"
          subtitleValue={formatCurrency(deals.weightedValue)}
          icon={DollarSign}
          color="#8B5CF6"
        />
      </div>

      {/* Pipeline Breakdown & Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stage Breakdown */}
        <div className="rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">Pipeline Stages</h3>
              <p className="text-xs text-muted-foreground">Prospect distribution</p>
            </div>
            <Badge 
              className="text-xs"
              style={{ backgroundColor: rgba.primary10, color: brandPrimary, border: 'none' }}
            >
              {summary.total || 0} total
            </Badge>
          </div>
          <div className="space-y-1">
            {stageData.map(item => (
              <StageProgressRow
                key={item.stage}
                stage={item.stage}
                count={item.count}
                total={summary.total || 0}
                conversionRate={item.conversionRate}
              />
            ))}
          </div>
          {/* Won/Lost Summary */}
          <div className="mt-4 pt-4 border-t border-[var(--glass-border)] grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10">
              <CheckCheck className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-lg font-bold text-green-600">{summary.won || 0}</p>
                <p className="text-[10px] text-green-600/70">Closed Won</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10">
              <XCircle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-lg font-bold text-red-600">{summary.lost || 0}</p>
                <p className="text-[10px] text-red-600/70">Closed Lost</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stage Distribution Donut */}
        <div className="rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] p-4">
          <div className="mb-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Distribution</h3>
            <p className="text-xs text-muted-foreground">Visual breakdown by stage</p>
          </div>
          <DonutChart
            className="h-52"
            data={
              summary?.byStage 
                ? Object.entries(summary.byStage).map(([key, value]) => ({
                    name: STAGE_CONFIG[key]?.label || key,
                    value: value || 0
                  })).filter(d => d.value > 0)
                : []
            }
            category="value"
            index="name"
            colors={['blue', 'cyan', 'amber', 'violet', 'orange', 'green', 'red']}
            showAnimation
            showLabel
            valueFormatter={(v) => `${v}`}
          />
        </div>
      </div>

      {/* Timeline Chart */}
      {Array.isArray(timeline) && timeline.length > 0 && (
        <div className="rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] p-4">
          <div className="mb-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Pipeline Velocity</h3>
            <p className="text-xs text-muted-foreground">New prospects over time</p>
          </div>
          <AreaChart
            className="h-64"
            data={timeline}
            index="date"
            categories={['new', 'won', 'lost']}
            colors={['blue', 'emerald', 'rose']}
            showAnimation
            showLegend
            showGridLines={false}
            curveType="monotone"
          />
        </div>
      )}

      {/* Source Performance */}
      {Array.isArray(sources) && sources.length > 0 && (
        <div className="rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] p-4">
          <div className="mb-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Lead Sources</h3>
            <p className="text-xs text-muted-foreground">Performance by acquisition channel</p>
          </div>
          <BarChart
            className="h-56"
            data={sources}
            index="source"
            categories={['total', 'won']}
            colors={['blue', 'emerald']}
            showAnimation
            showLegend
            showGridLines={false}
          />
        </div>
      )}

      {/* Stage Duration */}
      {velocity?.byStage && Array.isArray(velocity.byStage) && velocity.byStage.length > 0 && (
        <div className="rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] p-4">
          <div className="mb-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Time in Each Stage</h3>
            <p className="text-xs text-muted-foreground">Average days per stage</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {velocity.byStage.map((s, i) => {
              const config = STAGE_CONFIG[s.key] || { label: s.label, color: '#6B7280' }
              return (
                <div 
                  key={i}
                  className="p-3 rounded-lg text-center"
                  style={{ backgroundColor: `${config.color}10` }}
                >
                  <p 
                    className="text-2xl font-bold"
                    style={{ color: config.color }}
                  >
                    {s.avgDays || 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{config.label}</p>
                  <p className="text-[10px] text-muted-foreground">days avg</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
