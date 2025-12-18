// src/components/seo/SEOTrends.jsx
// Shows ranking history, CWV trends, and traffic patterns
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Gauge,
  Target,
  ChevronRight,
  Loader2,
  Calendar
} from 'lucide-react'
import { useSeoStore } from '@/lib/seo-store'
import { cn } from '@/lib/utils'

export default function SEOTrends({ site, onViewDetails }) {
  const { 
    rankingHistory,
    rankingTrends,
    rankingHistoryLoading,
    fetchRankingHistory,
    cwvSummary,
    cwvLoading,
    fetchCwvSummary
  } = useSeoStore()

  const [activeTab, setActiveTab] = useState('rankings')

  useEffect(() => {
    if (site?.id) {
      fetchRankingHistory(site.id, null, { limit: 30 })
      fetchCwvSummary(site.id)
    }
  }, [site?.id])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Performance Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="rankings" className="text-xs">
              <Target className="h-3 w-3 mr-1" />
              Rankings
            </TabsTrigger>
            <TabsTrigger value="vitals" className="text-xs">
              <Gauge className="h-3 w-3 mr-1" />
              Web Vitals
            </TabsTrigger>
            <TabsTrigger value="traffic" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              Traffic
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rankings" className="mt-0">
            <RankingsTrend 
              history={rankingHistory} 
              trends={rankingTrends}
              loading={rankingHistoryLoading}
              onViewDetails={() => onViewDetails?.('keywords')}
            />
          </TabsContent>

          <TabsContent value="vitals" className="mt-0">
            <WebVitalsTrend 
              summary={cwvSummary} 
              loading={cwvLoading}
              onViewDetails={() => onViewDetails?.('technical')}
            />
          </TabsContent>

          <TabsContent value="traffic" className="mt-0">
            <TrafficTrend 
              site={site}
              onViewDetails={() => onViewDetails?.('reports')}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// Rankings trend mini-component
function RankingsTrend({ history, trends, loading, onViewDetails }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-tertiary)]" />
      </div>
    )
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-6 text-[var(--text-tertiary)]">
        <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No ranking history yet</p>
        <p className="text-xs mt-1">Track keywords to see trends</p>
      </div>
    )
  }

  // Group by keyword
  const keywordGroups = {}
  history.forEach(h => {
    if (!keywordGroups[h.keyword]) {
      keywordGroups[h.keyword] = []
    }
    keywordGroups[h.keyword].push(h)
  })

  // Get top movers
  const topKeywords = Object.entries(keywordGroups)
    .map(([keyword, data]) => {
      const latest = data[0]?.position
      const oldest = data[data.length - 1]?.position
      return {
        keyword,
        position: latest,
        change: oldest && latest ? oldest - latest : 0,
        data: data.slice(0, 7).reverse()
      }
    })
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 4)

  return (
    <div className="space-y-3">
      {topKeywords.map((kw, i) => (
        <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--glass-bg)]">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
              {kw.keyword}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              Position: {kw.position?.toFixed(1) || 'N/A'}
            </p>
          </div>
          
          {/* Mini sparkline */}
          <div className="flex items-end gap-[2px] h-6 w-20">
            {kw.data.map((d, j) => {
              const maxPos = Math.max(...kw.data.map(x => x.position || 100))
              const height = d.position ? ((maxPos - d.position) / maxPos) * 100 : 0
              return (
                <div 
                  key={j}
                  className="flex-1 bg-[var(--accent-primary)] rounded-t opacity-60"
                  style={{ height: `${Math.max(height, 10)}%` }}
                />
              )
            })}
          </div>

          {/* Change indicator */}
          <div className={cn(
            'flex items-center gap-1 text-sm font-medium min-w-[60px] justify-end',
            kw.change > 0 ? 'text-green-400' : kw.change < 0 ? 'text-red-400' : 'text-[var(--text-tertiary)]'
          )}>
            {kw.change > 0 ? <TrendingUp className="h-4 w-4" /> : 
             kw.change < 0 ? <TrendingDown className="h-4 w-4" /> : 
             <Minus className="h-4 w-4" />}
            {kw.change !== 0 && Math.abs(kw.change).toFixed(1)}
          </div>
        </div>
      ))}

      <Button variant="ghost" size="sm" className="w-full" onClick={onViewDetails}>
        View all keywords <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  )
}

// Web Vitals trend mini-component
function WebVitalsTrend({ summary, loading, onViewDetails }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-tertiary)]" />
      </div>
    )
  }

  if (!summary || !summary.hasData) {
    return (
      <div className="text-center py-6 text-[var(--text-tertiary)]">
        <Gauge className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No Core Web Vitals data</p>
        <p className="text-xs mt-1">Run a performance check to get started</p>
      </div>
    )
  }

  const getVitalColor = (good, needsImprovement) => {
    const total = good + needsImprovement + 1
    const goodPercent = good / total
    if (goodPercent >= 0.75) return 'text-green-400'
    if (goodPercent >= 0.5) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <div className="text-center">
        <div className={cn(
          'text-4xl font-bold',
          summary.avgMobileScore >= 80 ? 'text-green-400' :
          summary.avgMobileScore >= 60 ? 'text-yellow-400' : 'text-red-400'
        )}>
          {summary.avgMobileScore}
        </div>
        <p className="text-xs text-[var(--text-tertiary)]">
          Avg Mobile Performance
        </p>
      </div>

      {/* Vitals breakdown */}
      <div className="grid grid-cols-3 gap-2">
        <VitalBadge 
          label="LCP" 
          good={summary.lcp?.good || 0}
          total={(summary.lcp?.good || 0) + (summary.lcp?.needsImprovement || 0) + (summary.lcp?.poor || 0)}
        />
        <VitalBadge 
          label="CLS" 
          good={summary.cls?.good || 0}
          total={(summary.cls?.good || 0) + (summary.cls?.needsImprovement || 0) + (summary.cls?.poor || 0)}
        />
        <VitalBadge 
          label="INP" 
          good={summary.inp?.good || 0}
          total={(summary.inp?.good || 0) + (summary.inp?.needsImprovement || 0) + (summary.inp?.poor || 0)}
        />
      </div>

      <Button variant="ghost" size="sm" className="w-full" onClick={onViewDetails}>
        View technical details <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  )
}

function VitalBadge({ label, good, total }) {
  const percent = total > 0 ? Math.round((good / total) * 100) : 0
  const color = percent >= 75 ? 'bg-green-500/20 text-green-400' :
                percent >= 50 ? 'bg-yellow-500/20 text-yellow-400' : 
                'bg-red-500/20 text-red-400'
  
  return (
    <div className={cn('p-2 rounded-lg text-center', color)}>
      <p className="text-lg font-bold">{percent}%</p>
      <p className="text-xs">{label} Good</p>
    </div>
  )
}

// Traffic trend mini-component  
function TrafficTrend({ site, onViewDetails }) {
  // Use site's stored metrics
  const clicksChange = site?.total_clicks_28d && site?.total_clicks_prev_28d
    ? ((site.total_clicks_28d - site.total_clicks_prev_28d) / site.total_clicks_prev_28d * 100)
    : null

  const impressionsChange = site?.total_impressions_28d && site?.total_impressions_prev_28d
    ? ((site.total_impressions_28d - site.total_impressions_prev_28d) / site.total_impressions_prev_28d * 100)
    : null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 rounded-lg bg-[var(--glass-bg)] text-center">
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {site?.total_clicks_28d?.toLocaleString() || '-'}
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">Clicks (28d)</p>
          {clicksChange !== null && (
            <p className={cn(
              'text-xs mt-1 flex items-center justify-center gap-1',
              clicksChange >= 0 ? 'text-green-400' : 'text-red-400'
            )}>
              {clicksChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(clicksChange).toFixed(1)}%
            </p>
          )}
        </div>

        <div className="p-3 rounded-lg bg-[var(--glass-bg)] text-center">
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {site?.total_impressions_28d?.toLocaleString() || '-'}
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">Impressions (28d)</p>
          {impressionsChange !== null && (
            <p className={cn(
              'text-xs mt-1 flex items-center justify-center gap-1',
              impressionsChange >= 0 ? 'text-green-400' : 'text-red-400'
            )}>
              {impressionsChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(impressionsChange).toFixed(1)}%
            </p>
          )}
        </div>
      </div>

      <div className="p-3 rounded-lg bg-[var(--glass-bg)] flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">Weekly Reports</p>
          <p className="text-xs text-[var(--text-tertiary)]">Get insights delivered to your inbox</p>
        </div>
        <Button size="sm" variant="outline" onClick={onViewDetails}>
          <Calendar className="h-4 w-4 mr-1" />
          Setup
        </Button>
      </div>
    </div>
  )
}
