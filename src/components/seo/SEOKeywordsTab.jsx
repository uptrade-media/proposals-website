// src/components/seo/SEOKeywordsTab.jsx
// Keywords tab - tracking, opportunities, GSC integration, keyword groups
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Target, 
  TrendingUp, 
  TrendingDown,
  Plus,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  BarChart3,
  Globe,
  Eye,
  MousePointerClick,
  Sparkles,
  Filter,
  Tag,
  ExternalLink
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useSeoStore, useSignalAccess } from '@/lib/seo-store'
import { SignalUpgradeCard } from './signal'

// Position indicator
function PositionBadge({ position, change }) {
  const getColor = (pos) => {
    if (pos <= 3) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    if (pos <= 10) return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    if (pos <= 20) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }

  return (
    <div className="flex items-center gap-1.5">
      <Badge variant="outline" className={cn('font-mono text-xs', getColor(position))}>
        #{position?.toFixed(1) || '--'}
      </Badge>
      {change !== undefined && change !== 0 && (
        <span className={cn(
          'flex items-center text-xs',
          change > 0 ? 'text-red-400' : 'text-emerald-400'
        )}>
          {change > 0 ? (
            <TrendingDown className="h-3 w-3" />
          ) : (
            <TrendingUp className="h-3 w-3" />
          )}
          {Math.abs(change).toFixed(1)}
        </span>
      )}
    </div>
  )
}

// Keyword row component
function KeywordRow({ keyword, onViewDetails }) {
  const formatNumber = (num) => {
    if (num === null || num === undefined) return '--'
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="group border-b border-[var(--glass-border)] hover:bg-[var(--surface-raised)] transition-colors"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {keyword.query}
          </span>
          {keyword.branded && (
            <Badge variant="secondary" className="text-xs">Branded</Badge>
          )}
        </div>
        {keyword.page && (
          <a 
            href={keyword.page}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] flex items-center gap-1 mt-0.5"
          >
            {new URL(keyword.page).pathname}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        <PositionBadge 
          position={keyword.position} 
          change={keyword.positionChange} 
        />
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-sm text-[var(--text-primary)]">
          {formatNumber(keyword.impressions)}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-sm text-[var(--text-primary)]">
          {formatNumber(keyword.clicks)}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-sm text-[var(--text-primary)]">
          {keyword.ctr ? `${(keyword.ctr * 100).toFixed(1)}%` : '--'}
        </span>
      </td>
      <td className="px-4 py-3">
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-7 opacity-0 group-hover:opacity-100"
          onClick={() => onViewDetails(keyword)}
        >
          <BarChart3 className="h-4 w-4" />
        </Button>
      </td>
    </motion.tr>
  )
}

// Opportunity card
function OpportunityCard({ opportunity, hasSignal, onAction }) {
  return (
    <div className="p-4 rounded-lg border bg-[var(--glass-bg)] border-[var(--glass-border)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h4 className="font-medium text-[var(--text-primary)] mb-1">
            {opportunity.keyword}
          </h4>
          <p className="text-sm text-[var(--text-secondary)] mb-2">
            {opportunity.reason}
          </p>
          <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
            <span>Position: #{opportunity.position?.toFixed(1)}</span>
            <span>•</span>
            <span>Potential: {opportunity.potential}</span>
          </div>
        </div>
        {hasSignal ? (
          <Button size="sm" onClick={() => onAction(opportunity)}>
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            Optimize
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => onAction(opportunity)}>
            View
          </Button>
        )}
      </div>
    </div>
  )
}

export default function SEOKeywordsTab({
  siteId,
  gscQueries = [],
  trackedKeywords = [],
  opportunities = [],
  onAddKeyword,
  onViewKeyword
}) {
  const hasSignal = useSignalAccess()
  const { fetchGscQueries } = useSeoStore()
  
  const [activeTab, setActiveTab] = useState('ranking')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState('impressions')
  const [sortDir, setSortDir] = useState('desc')
  const [filterPosition, setFilterPosition] = useState('all')

  // Filter and sort queries
  const filteredQueries = useMemo(() => {
    let result = [...gscQueries]

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(k => k.query?.toLowerCase().includes(q))
    }

    // Position filter
    if (filterPosition !== 'all') {
      if (filterPosition === 'top3') result = result.filter(k => k.position <= 3)
      else if (filterPosition === 'top10') result = result.filter(k => k.position <= 10)
      else if (filterPosition === 'striking') result = result.filter(k => k.position > 10 && k.position <= 20)
      else if (filterPosition === 'opportunity') result = result.filter(k => k.position > 20)
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortField] ?? 0
      const bVal = b[sortField] ?? 0
      if (sortDir === 'asc') return aVal - bVal
      return bVal - aVal
    })

    return result
  }, [gscQueries, searchQuery, filterPosition, sortField, sortDir])

  // Stats
  const stats = useMemo(() => {
    const top3 = gscQueries.filter(k => k.position <= 3).length
    const top10 = gscQueries.filter(k => k.position <= 10).length
    const striking = gscQueries.filter(k => k.position > 10 && k.position <= 20).length
    return { top3, top10, striking, total: gscQueries.length }
  }, [gscQueries])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />
    return sortDir === 'asc' 
      ? <ChevronUp className="h-3 w-3 ml-1" />
      : <ChevronDown className="h-3 w-3 ml-1" />
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/20">
                <Target className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.top3}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Top 3</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/20">
                <BarChart3 className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.top10}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Top 10</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-yellow-500/20">
                <TrendingUp className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.striking}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Striking Distance</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-500/20">
                <Globe className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Total Keywords</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="ranking">Ranking Keywords</TabsTrigger>
          <TabsTrigger value="opportunities">
            Opportunities
            {opportunities.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {opportunities.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tracking">Tracked Keywords</TabsTrigger>
        </TabsList>

        {/* Ranking Keywords */}
        <TabsContent value="ranking" className="mt-4 space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search keywords..."
                className="pl-10 bg-[var(--glass-bg)] border-[var(--glass-border)]"
              />
            </div>

            <Select value={filterPosition} onValueChange={setFilterPosition}>
              <SelectTrigger className="w-[160px] bg-[var(--glass-bg)] border-[var(--glass-border)]">
                <SelectValue placeholder="Filter by position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                <SelectItem value="top3">Top 3</SelectItem>
                <SelectItem value="top10">Top 10</SelectItem>
                <SelectItem value="striking">Striking (11-20)</SelectItem>
                <SelectItem value="opportunity">Opportunity (20+)</SelectItem>
              </SelectContent>
            </Select>

            <span className="text-sm text-[var(--text-tertiary)]">
              {filteredQueries.length} keywords
            </span>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-[var(--glass-border)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--glass-bg)]">
                  <tr className="border-b border-[var(--glass-border)]">
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">
                      Keyword
                    </th>
                    <th 
                      className="px-4 py-3 text-center text-sm font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] w-28"
                      onClick={() => handleSort('position')}
                    >
                      <span className="flex items-center justify-center">
                        Position
                        <SortIcon field="position" />
                      </span>
                    </th>
                    <th 
                      className="px-4 py-3 text-center text-sm font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] w-28"
                      onClick={() => handleSort('impressions')}
                    >
                      <span className="flex items-center justify-center">
                        Impr.
                        <SortIcon field="impressions" />
                      </span>
                    </th>
                    <th 
                      className="px-4 py-3 text-center text-sm font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] w-24"
                      onClick={() => handleSort('clicks')}
                    >
                      <span className="flex items-center justify-center">
                        Clicks
                        <SortIcon field="clicks" />
                      </span>
                    </th>
                    <th 
                      className="px-4 py-3 text-center text-sm font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] w-20"
                      onClick={() => handleSort('ctr')}
                    >
                      <span className="flex items-center justify-center">
                        CTR
                        <SortIcon field="ctr" />
                      </span>
                    </th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filteredQueries.map((kw, idx) => (
                      <KeywordRow 
                        key={kw.query || idx}
                        keyword={kw}
                        onViewDetails={onViewKeyword}
                      />
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {filteredQueries.length === 0 && (
              <div className="py-12 text-center">
                <Target className="h-12 w-12 mx-auto text-[var(--text-tertiary)] mb-4" />
                <p className="text-[var(--text-secondary)]">
                  {searchQuery || filterPosition !== 'all' 
                    ? 'No keywords match your filters'
                    : 'No keyword data available'}
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Opportunities */}
        <TabsContent value="opportunities" className="mt-4 space-y-4">
          {!hasSignal && (
            <SignalUpgradeCard 
              feature="insights"
              variant="inline"
              onUpgrade={() => window.open('/pricing', '_blank')}
            />
          )}

          {opportunities.length > 0 ? (
            <div className="grid gap-4">
              {opportunities.map((opp, idx) => (
                <OpportunityCard 
                  key={opp.keyword || idx}
                  opportunity={opp}
                  hasSignal={hasSignal}
                  onAction={onViewKeyword}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <TrendingUp className="h-12 w-12 mx-auto text-[var(--text-tertiary)] mb-4" />
              <p className="text-[var(--text-secondary)]">
                No keyword opportunities detected yet
              </p>
              <p className="text-sm text-[var(--text-tertiary)] mt-1">
                Check back after more data is collected
              </p>
            </div>
          )}
        </TabsContent>

        {/* Tracked Keywords */}
        <TabsContent value="tracking" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-secondary)]">
              Track specific keywords to monitor their rankings over time
            </p>
            <Button size="sm" onClick={onAddKeyword}>
              <Plus className="h-4 w-4 mr-2" />
              Add Keyword
            </Button>
          </div>

          {trackedKeywords.length > 0 ? (
            <div className="rounded-lg border border-[var(--glass-border)] overflow-hidden">
              <table className="w-full">
                <thead className="bg-[var(--glass-bg)]">
                  <tr className="border-b border-[var(--glass-border)]">
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">
                      Keyword
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--text-secondary)]">
                      Current
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--text-secondary)]">
                      Target
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--text-secondary)]">
                      Change
                    </th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {trackedKeywords.map((kw) => (
                    <tr key={kw.id} className="border-b border-[var(--glass-border)] hover:bg-[var(--surface-raised)]">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {kw.keyword}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <PositionBadge position={kw.currentPosition} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className="font-mono">
                          #{kw.targetPosition}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <PositionBadge change={kw.change} />
                      </td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="ghost" className="h-7">
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center border border-dashed border-[var(--glass-border)] rounded-lg">
              <Tag className="h-12 w-12 mx-auto text-[var(--text-tertiary)] mb-4" />
              <p className="text-[var(--text-secondary)] mb-4">
                No keywords being tracked yet
              </p>
              <Button onClick={onAddKeyword}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Keyword
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
