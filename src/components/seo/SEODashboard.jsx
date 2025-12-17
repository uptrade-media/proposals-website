// src/components/seo/SEODashboard.jsx
// SEO Command Center - Shows SEO data for the current tenant's domain
// No "add site" - each org with SEO feature enabled automatically tracks their domain
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Globe, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  FileText,
  Target,
  RefreshCw,
  ExternalLink,
  Loader2,
  Zap,
  ArrowLeft,
  Link2,
  Settings,
  Search,
  MousePointerClick,
  Eye,
  BarChart3,
  Brain
} from 'lucide-react'
import { useSeoStore } from '@/lib/seo-store'
import useAuthStore from '@/lib/auth-store'

// Sub-views
import SEOPagesList from './SEOPagesList'
import SEOPageDetail from './SEOPageDetail'
import SEOOpportunities from './SEOOpportunities'
import SEOAIInsights from './SEOAIInsights'

export default function SEODashboard({ onNavigate }) {
  const { currentOrg } = useAuthStore()
  const { 
    currentSite,
    pages,
    opportunities,
    sitesLoading,
    pagesLoading,
    opportunitiesLoading,
    sitesError,
    fetchSiteForOrg,
    fetchPages,
    fetchOpportunities,
    crawlSitemap,
    detectOpportunities,
    selectPage,
    clearCurrentPage,
    currentPage,
    // GSC data
    gscOverview,
    gscQueries,
    gscLoading,
    gscError,
    fetchGscOverview,
    fetchGscQueries
  } = useSeoStore()

  // Internal view state
  const [view, setView] = useState('overview') // 'overview' | 'pages' | 'page-detail' | 'opportunities' | 'ai-insights'
  const [crawling, setCrawling] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // Fetch site data for current org on mount
  useEffect(() => {
    if (currentOrg?.id) {
      fetchSiteForOrg(currentOrg.id)
    }
  }, [currentOrg?.id])

  // Fetch pages, opportunities, and GSC data when site is loaded
  useEffect(() => {
    if (currentSite?.id) {
      fetchPages(currentSite.id, { limit: 10 })
      fetchOpportunities(currentSite.id, { limit: 10, status: 'open' })
    }
    // Also fetch GSC data using the org domain
    if (currentOrg?.domain) {
      fetchGscOverview(currentOrg.domain)
      fetchGscQueries(currentOrg.domain, { limit: 20 })
    }
  }, [currentSite?.id, currentOrg?.domain])

  const handleCrawlSitemap = async () => {
    if (!currentSite?.id) return
    setCrawling(true)
    try {
      await crawlSitemap(currentSite.id)
      await fetchPages(currentSite.id, { limit: 10 })
    } finally {
      setCrawling(false)
    }
  }

  const handleDetectOpportunities = async () => {
    if (!currentSite?.id) return
    setDetecting(true)
    try {
      await detectOpportunities(currentSite.id)
      await fetchOpportunities(currentSite.id, { limit: 10, status: 'open' })
    } finally {
      setDetecting(false)
    }
  }

  const handleSyncGsc = async () => {
    if (!currentOrg?.domain) return
    setSyncing(true)
    try {
      await fetchGscOverview(currentOrg.domain)
      await fetchGscQueries(currentOrg.domain, { limit: 20 })
    } finally {
      setSyncing(false)
    }
  }

  const handleSelectPage = async (pageId) => {
    await selectPage(pageId)
    setView('page-detail')
  }

  const handleBack = () => {
    if (view === 'page-detail') {
      clearCurrentPage()
      setView('pages')
    } else if (view === 'pages' || view === 'opportunities' || view === 'ai-insights') {
      setView('overview')
    }
  }

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '-'
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatPercent = (num) => {
    if (num === null || num === undefined) return '-'
    return `${num.toFixed(1)}%`
  }

  const getChangeIndicator = (current, previous, inverse = false) => {
    if (!previous || current === previous) return null
    const isPositive = inverse ? current < previous : current > previous
    const change = Math.abs(((current - previous) / previous) * 100).toFixed(1)
    
    return (
      <span className={`flex items-center gap-1 text-xs ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {change}%
      </span>
    )
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    }
  }

  const getHealthBadge = (score) => {
    if (score === null || score === undefined) return null
    if (score >= 80) return <Badge className="bg-green-500/20 text-green-400">{score}</Badge>
    if (score >= 60) return <Badge className="bg-yellow-500/20 text-yellow-400">{score}</Badge>
    return <Badge className="bg-red-500/20 text-red-400">{score}</Badge>
  }

  // Loading state
  if (sitesLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)] mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Loading SEO data...</p>
        </div>
      </div>
    )
  }

  // Error or no org domain configured
  if (!currentOrg?.domain) {
    return (
      <div className="p-6">
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-400" />
            <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">
              No Domain Configured
            </h3>
            <p className="text-[var(--text-secondary)] mb-4 max-w-md mx-auto">
              To use the SEO module, configure a domain for {currentOrg?.name || 'this organization'} in the organization settings.
            </p>
            <Button variant="outline" onClick={() => onNavigate?.('settings')}>
              <Settings className="h-4 w-4 mr-2" />
              Configure Domain
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // No site created yet - offer to initialize
  if (!currentSite && !sitesLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">SEO Command Center</h1>
          <p className="text-[var(--text-secondary)]">
            Track and optimize SEO for {currentOrg.domain}
          </p>
        </div>
        
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Globe className="h-12 w-12 mx-auto mb-4 text-[var(--accent-primary)]" />
            <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">
              Initialize SEO Tracking
            </h3>
            <p className="text-[var(--text-secondary)] mb-4 max-w-md mx-auto">
              Start tracking SEO performance for <strong>{currentOrg.domain}</strong>. 
              We'll crawl your sitemap and analyze your pages.
            </p>
            <Button onClick={() => fetchSiteForOrg(currentOrg.id, true)}>
              <Zap className="h-4 w-4 mr-2" />
              Initialize SEO Tracking
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render sub-views
  if (view === 'pages') {
    return (
      <div className="p-6">
        <Button variant="ghost" size="sm" onClick={handleBack} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Overview
        </Button>
        <SEOPagesList site={currentSite} onSelectPage={handleSelectPage} />
      </div>
    )
  }

  if (view === 'page-detail' && currentPage) {
    return (
      <div className="p-6">
        <Button variant="ghost" size="sm" onClick={handleBack} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Pages
        </Button>
        <SEOPageDetail page={currentPage} site={currentSite} />
      </div>
    )
  }

  if (view === 'opportunities') {
    return (
      <div className="p-6">
        <Button variant="ghost" size="sm" onClick={handleBack} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Overview
        </Button>
        <SEOOpportunities site={currentSite} onSelectPage={handleSelectPage} />
      </div>
    )
  }

  if (view === 'ai-insights') {
    return (
      <div className="p-6">
        <Button variant="ghost" size="sm" onClick={handleBack} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Overview
        </Button>
        <SEOAIInsights site={currentSite} onSelectPage={handleSelectPage} />
      </div>
    )
  }

  // Main overview
  const topPages = pages.slice(0, 5)
  const openOpportunities = opportunities.filter(o => o.status === 'open').slice(0, 5)
  
  // GSC metrics from overview (fallback to site data)
  const gscMetrics = gscOverview?.metrics || {}
  const gscTrend = gscOverview?.trend || []
  const hasGscData = gscOverview && !gscError

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">SEO Command Center</h1>
          <div className="flex items-center gap-2 mt-1">
            <Globe className="h-4 w-4 text-[var(--accent-primary)]" />
            <a 
              href={`https://${currentOrg.domain}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[var(--text-secondary)] hover:text-[var(--accent-primary)] flex items-center gap-1"
            >
              {currentOrg.domain}
              <ExternalLink className="h-3 w-3" />
            </a>
            {gscOverview?.period && (
              <span className="text-xs text-[var(--text-tertiary)] ml-2">
                {gscOverview.period.start} — {gscOverview.period.end}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setView('ai-insights')}
            className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
          >
            <Brain className="h-4 w-4 mr-2" />
            AI Insights
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSyncGsc}
            disabled={syncing || gscLoading}
          >
            {syncing || gscLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <BarChart3 className="h-4 w-4 mr-2" />
            )}
            Sync GSC
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleCrawlSitemap}
            disabled={crawling}
          >
            {crawling ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Crawl Sitemap
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDetectOpportunities}
            disabled={detecting}
          >
            {detecting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Detect Issues
          </Button>
        </div>
      </div>

      {/* GSC Error Banner */}
      {gscError && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              <div>
                <p className="text-sm font-medium text-yellow-400">Google Search Console Error</p>
                <p className="text-xs text-[var(--text-tertiary)]">{gscError}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats from GSC */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={gscLoading ? 'animate-pulse' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <MousePointerClick className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-[var(--text-tertiary)]">Clicks (28d)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-[var(--text-primary)]">
                {formatNumber(hasGscData ? gscMetrics.clicks?.value : currentSite?.total_clicks_28d)}
              </span>
              {hasGscData && gscMetrics.clicks?.change !== undefined && (
                <span className={`flex items-center gap-1 text-xs ${gscMetrics.clicks.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {gscMetrics.clicks.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(gscMetrics.clicks.change).toFixed(1)}%
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className={gscLoading ? 'animate-pulse' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-[var(--text-tertiary)]">Impressions (28d)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-[var(--text-primary)]">
                {formatNumber(hasGscData ? gscMetrics.impressions?.value : currentSite?.total_impressions_28d)}
              </span>
              {hasGscData && gscMetrics.impressions?.change !== undefined && (
                <span className={`flex items-center gap-1 text-xs ${gscMetrics.impressions.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {gscMetrics.impressions.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(gscMetrics.impressions.change).toFixed(1)}%
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className={gscLoading ? 'animate-pulse' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-orange-400" />
              <span className="text-sm text-[var(--text-tertiary)]">Avg Position</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-[var(--text-primary)]">
                {hasGscData ? gscMetrics.position?.value?.toFixed(1) : (currentSite?.avg_position_28d?.toFixed(1) || '-')}
              </span>
              {hasGscData && gscMetrics.position?.change !== undefined && (
                <span className={`flex items-center gap-1 text-xs ${gscMetrics.position.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {gscMetrics.position.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(gscMetrics.position.change).toFixed(1)}%
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className={gscLoading ? 'animate-pulse' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-green-400" />
              <span className="text-sm text-[var(--text-tertiary)]">CTR</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-[var(--text-primary)]">
                {hasGscData ? `${(gscMetrics.ctr?.value * 100)?.toFixed(1)}%` : formatPercent(currentSite?.avg_ctr_28d)}
              </span>
              {hasGscData && gscMetrics.ctr?.change !== undefined && (
                <span className={`flex items-center gap-1 text-xs ${gscMetrics.ctr.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {gscMetrics.ctr.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(gscMetrics.ctr.change).toFixed(1)}%
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Click Trend Sparkline */}
      {hasGscData && gscTrend.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Click Trend (Last 28 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-16 flex items-end gap-[2px]">
              {gscTrend.map((day, i) => {
                const maxClicks = Math.max(...gscTrend.map(d => d.clicks))
                const height = maxClicks > 0 ? (day.clicks / maxClicks) * 100 : 0
                return (
                  <div 
                    key={day.date}
                    className="flex-1 bg-[var(--accent-primary)] rounded-t opacity-60 hover:opacity-100 transition-opacity"
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${day.date}: ${day.clicks} clicks`}
                  />
                )
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-[var(--text-tertiary)]">
              <span>{gscTrend[0]?.date}</span>
              <span>{gscTrend[gscTrend.length - 1]?.date}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Queries from GSC */}
      {hasGscData && gscQueries.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4" />
                Top Search Queries
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                From Google Search Console
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--text-tertiary)] border-b border-[var(--glass-border)]">
                    <th className="pb-2 font-medium">Query</th>
                    <th className="pb-2 font-medium text-right">Clicks</th>
                    <th className="pb-2 font-medium text-right">Impressions</th>
                    <th className="pb-2 font-medium text-right">Position</th>
                    <th className="pb-2 font-medium text-right">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {gscQueries.slice(0, 10).map((query, i) => (
                    <tr key={i} className="border-b border-[var(--glass-border)]/50 hover:bg-[var(--glass-bg)]">
                      <td className="py-2 text-[var(--text-primary)]">{query.query}</td>
                      <td className="py-2 text-right text-[var(--text-secondary)]">{query.clicks}</td>
                      <td className="py-2 text-right text-[var(--text-secondary)]">{formatNumber(query.impressions)}</td>
                      <td className="py-2 text-right">
                        <span className={query.position <= 10 ? 'text-green-400' : query.position <= 20 ? 'text-yellow-400' : 'text-[var(--text-tertiary)]'}>
                          {query.position?.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-2 text-right text-[var(--text-secondary)]">
                        {(query.ctr * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Pages Tracked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--text-primary)]">
              {pages.length || 0}
            </div>
            <div className="flex items-center gap-2 mt-2 text-sm">
              <span className="text-green-400">{currentSite?.pages_indexed || 0} indexed</span>
              <span className="text-[var(--text-tertiary)]">•</span>
              <span className="text-red-400">{currentSite?.pages_not_indexed || 0} not indexed</span>
            </div>
            <Button 
              variant="link" 
              size="sm" 
              className="px-0 mt-2"
              onClick={() => setView('pages')}
            >
              View All Pages →
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Open Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--text-primary)]">
              {openOpportunities.length}
            </div>
            <div className="flex items-center gap-2 mt-2 text-sm">
              <span className="text-red-400">
                {opportunities.filter(o => o.priority === 'critical').length} critical
              </span>
              <span className="text-[var(--text-tertiary)]">•</span>
              <span className="text-orange-400">
                {opportunities.filter(o => o.priority === 'high').length} high
              </span>
            </div>
            <Button 
              variant="link" 
              size="sm" 
              className="px-0 mt-2"
              onClick={() => setView('opportunities')}
            >
              View All Opportunities →
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Google Search Console
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentSite?.gsc_connected_at ? (
              <>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
                <p className="text-xs text-[var(--text-tertiary)] mt-2">
                  Last sync: {currentSite.gsc_last_sync_at 
                    ? new Date(currentSite.gsc_last_sync_at).toLocaleDateString()
                    : 'Never'}
                </p>
              </>
            ) : (
              <>
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Not Connected
                </Badge>
                <Button variant="link" size="sm" className="px-0 mt-2">
                  Connect GSC →
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Pages & Recent Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Top Pages</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setView('pages')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {pagesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--text-tertiary)]" />
              </div>
            ) : topPages.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-tertiary)]">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No pages crawled yet</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={handleCrawlSitemap}
                  disabled={crawling}
                >
                  {crawling ? 'Crawling...' : 'Crawl Sitemap'}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {topPages.map((page) => (
                  <div 
                    key={page.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--glass-bg)] hover:bg-[var(--surface-elevated)] cursor-pointer transition-colors"
                    onClick={() => handleSelectPage(page.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {page.title || page.path}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)] truncate">
                        {page.path}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <p className="text-[var(--text-primary)]">{page.clicks_28d || 0}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">clicks</p>
                      </div>
                      {getHealthBadge(page.seo_health_score)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Opportunities */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Opportunities</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setView('opportunities')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {opportunitiesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--text-tertiary)]" />
              </div>
            ) : openOpportunities.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-tertiary)]">
                <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No opportunities detected</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={handleDetectOpportunities}
                  disabled={detecting}
                >
                  {detecting ? 'Detecting...' : 'Detect Opportunities'}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {openOpportunities.map((opp) => (
                  <div 
                    key={opp.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--glass-bg)] hover:bg-[var(--surface-elevated)] cursor-pointer transition-colors"
                    onClick={() => opp.page_id && handleSelectPage(opp.page_id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {opp.title}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)] truncate">
                        {opp.description}
                      </p>
                    </div>
                    <Badge className={getPriorityColor(opp.priority)}>
                      {opp.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
