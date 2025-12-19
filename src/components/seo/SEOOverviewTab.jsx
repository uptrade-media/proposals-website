// src/components/seo/SEOOverviewTab.jsx
// Command Center Overview Tab - Score ring, Signal banner, quick actions, health summary
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Globe, 
  TrendingUp, 
  TrendingDown,
  ExternalLink,
  RefreshCw,
  Zap,
  FileText,
  Target,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Search,
  MousePointerClick,
  Clock,
  Activity,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSeoStore, useSignalAccess, useSignalStatus } from '@/lib/seo-store'
import { SignalStatusBanner, SignalUpgradeCard } from './signal'
import SEOHealthScore from './SEOHealthScore'

// Circular score ring component
function ScoreRing({ score, label, size = 'lg', trend }) {
  const radius = size === 'lg' ? 58 : 40
  const stroke = size === 'lg' ? 8 : 6
  const circumference = 2 * Math.PI * radius
  const progress = score ? (score / 100) * circumference : 0
  const offset = circumference - progress

  const getColor = (score) => {
    if (score >= 80) return { stroke: '#10b981', text: 'text-emerald-400' }
    if (score >= 60) return { stroke: '#f59e0b', text: 'text-yellow-400' }
    if (score >= 40) return { stroke: '#f97316', text: 'text-orange-400' }
    return { stroke: '#ef4444', text: 'text-red-400' }
  }

  const colors = getColor(score)

  return (
    <div className="relative flex flex-col items-center">
      <svg 
        width={(radius + stroke) * 2} 
        height={(radius + stroke) * 2} 
        className="transform -rotate-90"
      >
        {/* Background ring */}
        <circle
          cx={radius + stroke}
          cy={radius + stroke}
          r={radius}
          stroke="var(--glass-border)"
          strokeWidth={stroke}
          fill="none"
        />
        {/* Progress ring */}
        <motion.circle
          cx={radius + stroke}
          cy={radius + stroke}
          r={radius}
          stroke={colors.stroke}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-bold', size === 'lg' ? 'text-4xl' : 'text-2xl', colors.text)}>
          {score ?? '--'}
        </span>
        {trend && (
          <span className={cn(
            'flex items-center gap-0.5 text-xs mt-1',
            trend > 0 ? 'text-emerald-400' : 'text-red-400'
          )}>
            {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      
      {/* Label */}
      <span className="text-sm text-[var(--text-secondary)] mt-2">{label}</span>
    </div>
  )
}

// Quick action card
function QuickActionCard({ icon: Icon, title, description, badge, onClick, variant = 'default' }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'w-full p-4 rounded-lg border text-left transition-colors',
        'bg-[var(--glass-bg)] border-[var(--glass-border)]',
        'hover:border-[var(--accent-primary)]/30',
        variant === 'warning' && 'border-yellow-500/30 bg-yellow-500/5',
        variant === 'success' && 'border-emerald-500/30 bg-emerald-500/5'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'flex items-center justify-center w-10 h-10 rounded-lg shrink-0',
          variant === 'warning' && 'bg-yellow-500/20',
          variant === 'success' && 'bg-emerald-500/20',
          variant === 'default' && 'bg-[var(--accent-primary)]/20'
        )}>
          <Icon className={cn(
            'h-5 w-5',
            variant === 'warning' && 'text-yellow-400',
            variant === 'success' && 'text-emerald-400',
            variant === 'default' && 'text-[var(--accent-primary)]'
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--text-primary)]">{title}</span>
            {badge && (
              <Badge variant="secondary" className="text-xs">
                {badge}
              </Badge>
            )}
          </div>
          <p className="text-sm text-[var(--text-tertiary)] mt-0.5 line-clamp-1">
            {description}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-[var(--text-tertiary)] shrink-0" />
      </div>
    </motion.button>
  )
}

// Metric card for GSC data
function MetricCard({ label, value, trend, icon: Icon }) {
  const formatNumber = (num) => {
    if (num === null || num === undefined) return '--'
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  return (
    <div className="p-4 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]">
      <div className="flex items-center gap-2 text-[var(--text-tertiary)] mb-2">
        <Icon className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-[var(--text-primary)]">
          {formatNumber(value)}
        </span>
        {trend !== undefined && trend !== 0 && (
          <span className={cn(
            'flex items-center gap-0.5 text-sm mb-0.5',
            trend > 0 ? 'text-emerald-400' : 'text-red-400'
          )}>
            {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )
}

export default function SEOOverviewTab({
  site,
  pages = [],
  opportunities = [],
  gscMetrics = {},
  cwvSummary,
  onViewChange,
  onSelectPage,
  onCrawlSitemap,
  onSyncGsc,
  onRunSetup,
  isCrawling = false,
  isSyncing = false
}) {
  const hasSignal = useSignalAccess()
  const signalStatus = useSignalStatus()
  const { signalLearning, fetchSignalLearning, applySignalAutoFixes } = useSeoStore()

  // Calculate health score
  const healthScore = site?.health_score ?? 75
  const contentScore = site?.content_score ?? 68
  const technicalScore = site?.technical_score ?? 82

  // Get priority issues
  const criticalIssues = opportunities.filter(o => o.priority === 'critical' && o.status === 'open')
  const openOpportunities = opportunities.filter(o => o.status === 'open')
  const contentOpportunities = openOpportunities.filter(o => o.type === 'content')
  const technicalIssues = openOpportunities.filter(o => o.type === 'technical')

  // Recent activity (last 7 days)
  const recentPagesUpdated = pages.filter(p => {
    const updated = new Date(p.updated_at)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return updated > weekAgo
  }).length

  return (
    <div className="space-y-6">
      {/* Signal Banner */}
      {hasSignal ? (
        <SignalStatusBanner
          siteDomain={site?.domain}
          analyzingDays={signalStatus?.daysSinceEnabled || 0}
          recommendationCount={signalLearning?.recommendations?.length || 0}
          winCount={signalLearning?.wins?.length || 0}
          latestInsight={signalLearning?.latestInsight}
          onViewMemory={() => onViewChange?.('signal-memory')}
          onApply={() => applySignalAutoFixes(site?.id, signalLearning?.autoFixableIds)}
        />
      ) : (
        <SignalUpgradeCard 
          variant="inline"
          onUpgrade={() => window.open('/pricing', '_blank')}
        />
      )}

      {/* Main Grid: Scores + Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Score Ring - Main */}
        <Card className="lg:col-span-1">
          <CardContent className="pt-6 flex flex-col items-center">
            <ScoreRing 
              score={healthScore} 
              label="Overall Health" 
              size="lg"
              trend={site?.health_score_trend}
            />
            
            <div className="grid grid-cols-2 gap-6 mt-6 w-full">
              <ScoreRing 
                score={contentScore} 
                label="Content" 
                size="sm"
                trend={site?.content_score_trend}
              />
              <ScoreRing 
                score={technicalScore} 
                label="Technical" 
                size="sm"
                trend={site?.technical_score_trend}
              />
            </div>

            <Button 
              variant="outline" 
              className="mt-6 w-full"
              onClick={() => onViewChange?.('health-report')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              View Full Report
            </Button>
          </CardContent>
        </Card>

        {/* GSC Metrics */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4 text-[var(--accent-primary)]" />
                Search Performance
                <span className="text-xs text-[var(--text-tertiary)] font-normal">Last 28 days</span>
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onSyncGsc}
                disabled={isSyncing}
              >
                <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard 
                label="Clicks"
                value={gscMetrics.clicks}
                trend={gscMetrics.clicksTrend}
                icon={MousePointerClick}
              />
              <MetricCard 
                label="Impressions"
                value={gscMetrics.impressions}
                trend={gscMetrics.impressionsTrend}
                icon={Activity}
              />
              <MetricCard 
                label="CTR"
                value={gscMetrics.ctr != null ? `${(Number(gscMetrics.ctr) * 100).toFixed(1)}%` : null}
                trend={gscMetrics.ctrTrend}
                icon={TrendingUp}
              />
              <MetricCard 
                label="Avg Position"
                value={gscMetrics.position != null ? Number(gscMetrics.position).toFixed(1) : null}
                trend={gscMetrics.positionTrend}
                icon={Target}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {criticalIssues.length > 0 && (
          <QuickActionCard
            icon={AlertTriangle}
            title="Critical Issues"
            description={`${criticalIssues.length} issue${criticalIssues.length > 1 ? 's' : ''} need immediate attention`}
            badge={criticalIssues.length}
            variant="warning"
            onClick={() => onViewChange?.('technical')}
          />
        )}
        
        {contentOpportunities.length > 0 && (
          <QuickActionCard
            icon={FileText}
            title="Content Opportunities"
            description={`${contentOpportunities.length} pages could be improved`}
            badge={contentOpportunities.length}
            onClick={() => onViewChange?.('content')}
          />
        )}

        <QuickActionCard
          icon={Target}
          title="Keyword Rankings"
          description="Track your keyword positions"
          badge={`${pages.length} pages`}
          onClick={() => onViewChange?.('keywords')}
        />

        <QuickActionCard
          icon={FileText}
          title="All Pages"
          description="View and edit page metadata"
          badge={pages.length}
          onClick={() => onViewChange?.('pages')}
        />

        {recentPagesUpdated > 0 && (
          <QuickActionCard
            icon={Clock}
            title="Recently Updated"
            description={`${recentPagesUpdated} pages updated this week`}
            variant="success"
            onClick={() => onViewChange?.('pages')}
          />
        )}

        <QuickActionCard
          icon={Zap}
          title="Run Full Scan"
          description="Crawl sitemap and detect issues"
          onClick={onCrawlSitemap}
        />

        {onRunSetup && (
          <QuickActionCard
            icon={Settings}
            title="Re-run Setup"
            description="Run the setup wizard again"
            onClick={onRunSetup}
          />
        )}
      </div>

      {/* Quick Stats Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-center">
            <div className="p-3 rounded-lg bg-[var(--surface-raised)]">
              <p className="text-2xl font-bold text-[var(--text-primary)]">{pages.length}</p>
              <p className="text-xs text-[var(--text-tertiary)]">Total Pages</p>
            </div>
            <div className="p-3 rounded-lg bg-[var(--surface-raised)]">
              <p className="text-2xl font-bold text-emerald-400">
                {pages.filter(p => p.seo_score >= 80).length}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">Optimized</p>
            </div>
            <div className="p-3 rounded-lg bg-[var(--surface-raised)]">
              <p className="text-2xl font-bold text-yellow-400">
                {pages.filter(p => p.seo_score >= 60 && p.seo_score < 80).length}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">Needs Work</p>
            </div>
            <div className="p-3 rounded-lg bg-[var(--surface-raised)]">
              <p className="text-2xl font-bold text-red-400">
                {pages.filter(p => p.seo_score < 60).length}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">Critical</p>
            </div>
            <div className="p-3 rounded-lg bg-[var(--surface-raised)]">
              <p className="text-2xl font-bold text-[var(--accent-primary)]">
                {openOpportunities.length}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">Opportunities</p>
            </div>
            <div className="p-3 rounded-lg bg-[var(--surface-raised)]">
              <p className="text-2xl font-bold text-purple-400">
                {technicalIssues.length}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">Tech Issues</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
