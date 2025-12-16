/**
 * TeamMetrics - Admin/Manager view of team performance
 * Shows aggregate stats, leaderboard, and individual member metrics
 */
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Trophy,
  TrendingUp,
  Users,
  BarChart3,
  FileText,
  DollarSign,
  Target,
  Award,
  Crown,
  Zap,
  RefreshCw,
  Loader2,
  Activity,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { GlassCard, GlassEmptyState } from '@/components/crm/ui'
import api from '@/lib/api'

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0)
}

// Aggregate Metric Card
function AggregateMetricCard({ label, value, icon: Icon, color = 'brand', change }) {
  const colorClasses = {
    brand: 'text-[var(--brand-primary)] bg-[var(--brand-primary)]/10',
    green: 'text-green-400 bg-green-400/10',
    blue: 'text-blue-400 bg-blue-400/10',
    purple: 'text-purple-400 bg-purple-400/10',
    orange: 'text-orange-400 bg-orange-400/10'
  }

  return (
    <GlassCard padding="md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-[var(--text-tertiary)]">{label}</p>
          <p className="text-3xl font-bold mt-1 text-[var(--text-primary)]">{value}</p>
          {change !== undefined && (
            <div className={cn(
              "flex items-center gap-1 mt-2 text-xs font-medium",
              change >= 0 ? 'text-green-400' : 'text-red-400'
            )}>
              <TrendingUp className="h-3 w-3" />
              <span>{change >= 0 ? '+' : ''}{change}%</span>
              <span className="text-[var(--text-tertiary)] font-normal">this month</span>
            </div>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", colorClasses[color])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </GlassCard>
  )
}

// Top Performer Card
function TopPerformerCard({ title, performer, icon: Icon, metric, color = 'brand' }) {
  const colorClasses = {
    brand: 'border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/5',
    gold: 'border-yellow-400/30 bg-yellow-400/5',
    green: 'border-green-400/30 bg-green-400/5',
    blue: 'border-blue-400/30 bg-blue-400/5'
  }

  if (!performer) {
    return (
      <GlassCard padding="md" className="opacity-50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--glass-bg-inset)]">
            <Icon className="h-5 w-5 text-[var(--text-tertiary)]" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-tertiary)]">{title}</p>
            <p className="text-sm font-medium text-[var(--text-secondary)]">No data yet</p>
          </div>
        </div>
      </GlassCard>
    )
  }

  return (
    <GlassCard padding="md" className={cn("border-2", colorClasses[color])}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[var(--glass-bg-inset)]">
          <Icon className="h-5 w-5 text-[var(--brand-primary)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--text-tertiary)]">{title}</p>
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {performer.name}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">{metric}</p>
        </div>
      </div>
    </GlassCard>
  )
}

// Pipeline Stage Bar
function PipelineStageBar({ label, count, total, color }) {
  const percentage = total > 0 ? (count / total) * 100 : 0
  
  return (
    <div className="flex items-center gap-3">
      <div className={cn("w-2 h-2 rounded-full", color)} />
      <span className="text-sm text-[var(--text-secondary)] flex-1">{label}</span>
      <span className="text-sm font-medium text-[var(--text-primary)] w-10 text-right">{count}</span>
      <div className="w-32">
        <Progress value={percentage} className="h-2" />
      </div>
      <span className="text-xs text-[var(--text-tertiary)] w-12 text-right">
        {percentage.toFixed(0)}%
      </span>
    </div>
  )
}

// Leaderboard Row
function LeaderboardRow({ rank, member, isExpanded, onToggle }) {
  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return <Crown className="h-5 w-5 text-yellow-400" />
      case 2: return <Trophy className="h-5 w-5 text-gray-400" />
      case 3: return <Award className="h-5 w-5 text-orange-400" />
      default: return <span className="text-sm font-medium text-[var(--text-tertiary)] w-5 text-center">{rank}</span>
    }
  }

  return (
    <div className="border-b border-[var(--glass-border)] last:border-0">
      <div 
        className="flex items-center gap-4 py-4 px-2 hover:bg-[var(--glass-bg-hover)] cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <div className="w-8 flex items-center justify-center">
          {getRankIcon(rank)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--text-primary)] truncate">{member.name}</p>
          <p className="text-xs text-[var(--text-tertiary)] truncate">{member.email}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-green-400">{formatCurrency(member.totalRevenue)}</p>
          <p className="text-xs text-[var(--text-tertiary)]">{member.acceptedProposals} deals</p>
        </div>
        <div className="text-right w-20">
          <p className="text-sm font-medium text-[var(--text-primary)]">{member.conversionRate}%</p>
          <p className="text-xs text-[var(--text-tertiary)]">conversion</p>
        </div>
        <div className="text-right w-20">
          <p className="text-sm font-medium text-[var(--text-primary)]">{member.thisMonthAudits}</p>
          <p className="text-xs text-[var(--text-tertiary)]">audits</p>
        </div>
        <div className="text-right w-20">
          <p className="text-sm font-medium text-[var(--text-primary)]">{member.thisMonthProposals}</p>
          <p className="text-xs text-[var(--text-tertiary)]">proposals</p>
        </div>
        <Button variant="ghost" size="sm" className="p-1">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      
      {isExpanded && (
        <div className="px-12 pb-4 space-y-3 bg-[var(--glass-bg-inset)]">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Assigned Clients</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">{member.assignedClients}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Pending Revenue</p>
              <p className="text-lg font-semibold text-orange-400">{formatCurrency(member.pendingRevenue || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Team Role</p>
              <Badge variant="outline" className="mt-1 capitalize">
                {member.role === 'sales_rep' ? 'Sales Rep' : member.role}
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Pipeline stages config
const PIPELINE_STAGES = [
  { key: 'new_lead', label: 'New Lead', color: 'bg-gray-400' },
  { key: 'contacted', label: 'Contacted', color: 'bg-blue-400' },
  { key: 'qualified', label: 'Qualified', color: 'bg-purple-400' },
  { key: 'proposal_sent', label: 'Proposal Sent', color: 'bg-orange-400' },
  { key: 'negotiating', label: 'Negotiating', color: 'bg-amber-400' },
  { key: 'won', label: 'Won', color: 'bg-green-400' },
  { key: 'lost', label: 'Lost', color: 'bg-red-400' }
]

// Main Component
export default function TeamMetrics() {
  const [metrics, setMetrics] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [expandedRows, setExpandedRows] = useState(new Set())

  const fetchMetrics = async () => {
    try {
      const response = await api.get('/.netlify/functions/team-metrics')
      setMetrics(response.data)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch team metrics:', err)
      setError(err.response?.data?.error || 'Failed to load team metrics')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [])

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchMetrics()
  }

  const toggleRow = (memberId) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(memberId)) {
        next.delete(memberId)
      } else {
        next.add(memberId)
      }
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    )
  }

  if (error) {
    return (
      <GlassEmptyState
        icon={Activity}
        title="Unable to load team metrics"
        description={error}
        action={
          <Button onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        }
      />
    )
  }

  const { aggregate, teamPipeline, leaderboard, topPerformers } = metrics || {}
  const totalPipeline = Object.values(teamPipeline || {}).reduce((sum, n) => sum + n, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Team Performance</h1>
          <p className="text-[var(--text-tertiary)]">
            Overview of team metrics and individual performance
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AggregateMetricCard
          label="Team Members"
          value={aggregate?.totalMembers || 0}
          icon={Users}
          color="blue"
        />
        <AggregateMetricCard
          label="Total Clients"
          value={aggregate?.totalClients || 0}
          icon={Users}
          color="purple"
        />
        <AggregateMetricCard
          label="Team Revenue"
          value={formatCurrency(aggregate?.totalRevenue)}
          icon={DollarSign}
          color="green"
        />
        <AggregateMetricCard
          label="Avg Conversion"
          value={`${aggregate?.averageConversion || 0}%`}
          icon={Target}
          color="orange"
        />
      </div>

      {/* This Month Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <GlassCard padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-tertiary)]">This Month</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                {aggregate?.thisMonthAudits || 0}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Audits Created</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-400/10">
              <BarChart3 className="h-5 w-5 text-purple-400" />
            </div>
          </div>
        </GlassCard>

        <GlassCard padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-tertiary)]">This Month</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                {aggregate?.thisMonthProposals || 0}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Proposals Sent</p>
            </div>
            <div className="p-3 rounded-xl bg-orange-400/10">
              <FileText className="h-5 w-5 text-orange-400" />
            </div>
          </div>
        </GlassCard>

        <GlassCard padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-tertiary)]">Pending Deals</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                {formatCurrency(aggregate?.pendingRevenue)}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">In Pipeline</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-400/10">
              <DollarSign className="h-5 w-5 text-blue-400" />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Top Performers */}
      <GlassCard padding="md">
        <h2 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-400" />
          Top Performers
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <TopPerformerCard
            title="Revenue Leader"
            performer={topPerformers?.byRevenue}
            icon={Crown}
            metric={topPerformers?.byRevenue ? formatCurrency(topPerformers.byRevenue.totalRevenue) : ''}
            color="gold"
          />
          <TopPerformerCard
            title="Best Conversion"
            performer={topPerformers?.byConversion}
            icon={Target}
            metric={topPerformers?.byConversion ? `${topPerformers.byConversion.conversionRate}%` : ''}
            color="green"
          />
          <TopPerformerCard
            title="Most Active"
            performer={topPerformers?.byActivity}
            icon={Zap}
            metric={topPerformers?.byActivity ? 
              `${topPerformers.byActivity.thisMonthAudits + topPerformers.byActivity.thisMonthProposals} activities` : ''}
            color="blue"
          />
        </div>
      </GlassCard>

      {/* Team Pipeline & Leaderboard Row */}
      <div className="grid md:grid-cols-5 gap-6">
        {/* Team Pipeline Distribution */}
        <GlassCard padding="md" className="md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Team Pipeline</h3>
            <span className="text-sm text-[var(--text-tertiary)]">
              {totalPipeline} total leads
            </span>
          </div>
          <div className="space-y-3">
            {PIPELINE_STAGES.map(stage => (
              <PipelineStageBar
                key={stage.key}
                label={stage.label}
                count={teamPipeline?.[stage.key] || 0}
                total={totalPipeline}
                color={stage.color}
              />
            ))}
          </div>
        </GlassCard>

        {/* Leaderboard */}
        <GlassCard padding="md" className="md:col-span-3">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            Leaderboard
          </h3>
          {leaderboard && leaderboard.length > 0 ? (
            <div className="space-y-0">
              {leaderboard.map((member, index) => (
                <LeaderboardRow
                  key={member.id}
                  rank={index + 1}
                  member={member}
                  isExpanded={expandedRows.has(member.id)}
                  onToggle={() => toggleRow(member.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-8 w-8 mx-auto text-[var(--text-tertiary)] opacity-50 mb-2" />
              <p className="text-sm text-[var(--text-tertiary)]">No team members yet</p>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
