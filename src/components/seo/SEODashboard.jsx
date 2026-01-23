// src/components/seo/SEODashboard.jsx
// SEO Command Center - Shows SEO data for the current tenant's domain
// No "add site" - each org with SEO feature enabled automatically tracks their domain
import { useState, useEffect, useRef, useCallback } from 'react'
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
  Shield,
  Calendar,
  Clock
} from 'lucide-react'
import SignalIcon from '@/components/ui/SignalIcon'
import { useSeoStore } from '@/lib/seo-store'
import useAuthStore from '@/lib/auth-store'

// Sub-views
import SEOPagesList from './SEOPagesList'
import SEOPageDetail from './SEOPageDetail'
import SEOOpportunities from './SEOOpportunities'
import SEOAIInsights from './SEOAIInsights'
import SEOKeywordTracking from './SEOKeywordTracking'
import SEOTechnicalAudit from './SEOTechnicalAudit'
import SEOContentDecay from './SEOContentDecay'
import SEOLocalSeo from './SEOLocalSeo'
import SEOBacklinks from './SEOBacklinks'
import SEOCompetitors from './SEOCompetitors'

// New dashboard components
import SEOHealthScore from './SEOHealthScore'
import SEOQuickWins from './SEOQuickWins'
import SEONavigation from './SEONavigation'
import SEOTrends from './SEOTrends'
import SEOQuickActionsBar from './SEOQuickActionsBar'
import { SEOCommandPalette } from './SEOCommandPalette'

export default function SEODashboard({ onNavigate }) {
  const { currentOrg, currentProject: authProject } = useAuthStore()
  const { 
    currentProject: seoProject,
    pages,
    opportunities,
    aiRecommendations,
    projectsLoading,
    pagesLoading,
    opportunitiesLoading,
    projectsError,
    fetchProjectForOrg,
    fetchPages,
    fetchOpportunities,
    fetchAiRecommendations,
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
    fetchGscQueries,
    // CWV
    cwvSummary,
    fetchCwvSummary
  } = useSeoStore()

  // Use SEO project if available, otherwise fall back to auth project
  const currentProject = seoProject || authProject

  // Internal view state - now aligned with navigation
  const [view, setView] = useState('overview') // overview, pages, keywords, content, technical, reports
  const [subView, setSubView] = useState(null) // page-detail, etc.
  const [crawling, setCrawling] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [lastScan, setLastScan] = useState(null)
  
  // Track if initial data has been fetched to prevent loops
  const hasFetchedRef = useRef(false)
  const lastProjectIdRef = useRef(null)
  const lastSiteIdRef = useRef(null)

  // Fetch site data for current project on mount (only once per project)
  // Note: In the new architecture, projectId === projectId for SEO
  useEffect(() => {
    const projectId = authProject?.id
    if (projectId && projectId !== lastProjectIdRef.current) {
      lastProjectIdRef.current = projectId
      // Only fetch if we don't already have data for this project
      if (!seoProject?.id || seoProject.id !== projectId) {
        fetchProjectForOrg(projectId)
      }
    }
  }, [authProject?.id])

  // Fetch pages, opportunities, and GSC data when site is loaded (only once per site)
  useEffect(() => {
    if (currentProject?.id && currentProject.id !== lastSiteIdRef.current) {
      lastSiteIdRef.current = currentProject.id
      hasFetchedRef.current = true
      
      fetchPages(currentProject.id, { limit: 50 })
      fetchOpportunities(currentProject.id, { limit: 20, status: 'open' })
      fetchAiRecommendations(currentProject.id)
      fetchCwvSummary(currentProject.id)
      setLastScan(currentProject.gsc_last_sync_at || currentProject.updated_at)
      
      // Also fetch GSC data using the site domain - pass projectId explicitly
      const siteDomain = currentProject.domain || currentProject?.tenant_domain || currentOrg?.domain
      if (siteDomain) {
        fetchGscOverview(currentProject.id, siteDomain)
        fetchGscQueries(currentProject.id, siteDomain, { limit: 20 })
      }
    }
  }, [currentProject?.id])

  const handleCrawlSitemap = async () => {
    if (!currentProject?.id) return
    setCrawling(true)
    try {
      await crawlSitemap(currentProject.id)
      await fetchPages(currentProject.id, { limit: 50 })
      setLastScan(new Date().toISOString())
    } finally {
      setCrawling(false)
    }
  }

  const handleDetectOpportunities = async () => {
    if (!currentProject?.id) return
    setDetecting(true)
    try {
      await detectOpportunities(currentProject.id)
      await fetchOpportunities(currentProject.id, { limit: 20, status: 'open' })
    } finally {
      setDetecting(false)
    }
  }

  const handleSyncGsc = useCallback(async () => {
    const siteDomain = currentProject?.domain || currentProject?.tenant_domain || currentOrg?.domain
    if (!siteDomain) return
    setSyncing(true)
    try {
      await fetchGscOverview(siteDomain)
      await fetchGscQueries(siteDomain, { limit: 20 })
      setLastScan(new Date().toISOString())
    } finally {
      setSyncing(false)
    }
  }, [currentProject?.domain, currentProject?.tenant_domain, currentOrg?.domain, fetchGscOverview, fetchGscQueries])

  const handleSelectPage = async (pageId) => {
    await selectPage(pageId)
    setSubView('page-detail')
  }

  const handleViewChange = (newView) => {
    setView(newView)
    setSubView(null)
    clearCurrentPage()
  }

  const handleBack = () => {
    if (subView) {
      setSubView(null)
      clearCurrentPage()
    } else {
      setView('overview')
    }
  }

  // Command palette action handler
  const handleCommandAction = useCallback(async (action) => {
    switch (action) {
      case 'syncGsc':
        handleSyncGsc()
        break
      case 'exportReport':
        // TODO: Implement PDF export in Tier 3
        console.log('Export report - coming soon')
        break
      case 'quickWins':
        setView('content')
        break
      case 'aiAnalyze':
        if (currentProject?.id) {
          await fetchAiRecommendations(currentProject.id)
          setView('content')
        }
        break
      case 'priorityQueue':
        setView('opportunities')
        break
    }
  }, [currentProject?.id, fetchAiRecommendations, handleSyncGsc])

  const handleFixIssues = (issues) => {
    // Navigate to AI insights with issues pre-selected
    setView('content')
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

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
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

  // Prepare derived data that's used across multiple views (must be before any returns)
  const opportunityCounts = {
    technical: opportunities.filter(o => o.type === 'technical').length,
    content: opportunities.filter(o => o.type === 'content').length
  }
  const gscMetrics = gscOverview?.metrics || {}
  const gscTrend = gscOverview?.trend || []
  const hasGscData = gscOverview && !gscError

  // Loading state
  if (projectsLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading SEO data...</p>
        </div>
      </div>
    )
  }

  // No project selected
  if (!currentProject?.id) {
    return (
      <div className="p-6">
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-blue-400" />
            <h3 className="text-lg font-semibold mb-2 text-foreground">
              Select a Project
            </h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Select a project from the sidebar to view SEO data and analytics.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Get domain from project or org
  const domain = currentProject?.domain || currentOrg?.domain

  // Error or no domain configured
  if (!domain) {
    return (
      <div className="p-6">
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-400" />
            <h3 className="text-lg font-semibold mb-2 text-foreground">
              No Domain Configured
            </h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
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
  if (!currentProject && !projectsLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">SEO Command Center</h1>
          <p className="text-muted-foreground">
            Track and optimize SEO for {domain}
          </p>
        </div>
        
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Globe className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-2 text-foreground">
              Initialize SEO Tracking
            </h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Start tracking SEO performance for <strong>{domain}</strong>. 
              We'll crawl your sitemap and analyze your pages.
            </p>
            <Button onClick={() => currentProject?.id && fetchProjectForOrg(currentProject.id, true)}>
              <Zap className="h-4 w-4 mr-2" />
              Initialize SEO Tracking
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render sub-views (detail views)
  if (subView === 'page-detail' && currentPage) {
    return (
      <div className="p-6">
        <Button variant="ghost" size="sm" onClick={handleBack} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Pages
        </Button>
        <SEOPageDetail page={currentPage} site={currentProject} />
      </div>
    )
  }

  // Render tab views
  if (view === 'pages') {
    return (
      <div className="p-6 space-y-6">
        <SEONavigation activeView={view} onViewChange={handleViewChange} alerts={opportunityCounts.technical} opportunities={opportunityCounts.content} />
        <SEOPagesList site={currentProject} onSelectPage={handleSelectPage} />
      </div>
    )
  }

  if (view === 'keywords') {
    return (
      <div className="p-6 space-y-6">
        <SEONavigation activeView={view} onViewChange={handleViewChange} alerts={opportunityCounts.technical} opportunities={opportunityCounts.content} />
        <SEOKeywordTracking projectId={currentProject?.id} gscQueries={gscQueries} />
      </div>
    )
  }

  if (view === 'content') {
    return (
      <div className="p-6 space-y-6">
        <SEONavigation activeView={view} onViewChange={handleViewChange} alerts={opportunityCounts.technical} opportunities={opportunityCounts.content} />
        <SEOContentDecay projectId={currentProject?.id} />
      </div>
    )
  }

  if (view === 'health-report') {
    return (
      <div className="p-6 space-y-6">
        <Button variant="ghost" size="sm" onClick={handleBack} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <SEOHealthScore 
          site={currentProject}
          pages={pages}
          opportunities={opportunities}
          gscMetrics={gscMetrics}
          cwvSummary={cwvSummary}
          detailed={true}
          onFixIssues={handleFixIssues}
        />
      </div>
    )
  }

  if (view === 'technical') {
    return (
      <div className="p-6 space-y-6">
        <SEONavigation activeView={view} onViewChange={handleViewChange} alerts={opportunityCounts.technical} opportunities={opportunityCounts.content} />
        <SEOTechnicalAudit 
          projectId={currentProject?.id} 
          pages={pages}
          cwvSummary={cwvSummary}
        />
      </div>
    )
  }

  if (view === 'local') {
    return (
      <div className="p-6 space-y-6">
        <SEONavigation activeView={view} onViewChange={handleViewChange} alerts={opportunityCounts.technical} opportunities={opportunityCounts.content} />
        <SEOLocalSeo projectId={currentProject?.id} />
      </div>
    )
  }

  if (view === 'backlinks') {
    return (
      <div className="p-6 space-y-6">
        <SEONavigation activeView={view} onViewChange={handleViewChange} alerts={opportunityCounts.technical} opportunities={opportunityCounts.content} />
        <SEOBacklinks projectId={currentProject?.id} />
      </div>
    )
  }

  if (view === 'competitors') {
    return (
      <div className="p-6 space-y-6">
        <SEONavigation activeView={view} onViewChange={handleViewChange} alerts={opportunityCounts.technical} opportunities={opportunityCounts.content} />
        <SEOCompetitors site={currentProject} />
      </div>
    )
  }

  if (view === 'reports') {
    return (
      <div className="p-6 space-y-6">
        <SEONavigation activeView={view} onViewChange={handleViewChange} alerts={opportunityCounts.technical} opportunities={opportunityCounts.content} />
        <SEOTrends site={currentProject} onViewDetails={handleViewChange} />
      </div>
    )
  }

  // Legacy views for backwards compatibility
  if (view === 'opportunities') {
    return (
      <div className="p-6">
        <Button variant="ghost" size="sm" onClick={handleBack} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Overview
        </Button>
        <SEOOpportunities site={currentProject} onSelectPage={handleSelectPage} />
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
        <SEOOpportunities site={currentProject} onSelectPage={handleSelectPage} />
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
        <SEOAIInsights site={currentProject} onSelectPage={handleSelectPage} />
      </div>
    )
  }

  // Main overview
  const topPages = pages.slice(0, 5)
  const openOpportunities = opportunities.filter(o => o.status === 'open').slice(0, 5)

  return (
    <div className="p-6 space-y-6">
      {/* Header with Status */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">SEO Command Center</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <a 
              href={`https://${domain}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              <Globe className="h-4 w-4 text-primary" />
              {domain}
              <ExternalLink className="h-3 w-3" />
            </a>
            
            {/* GSC Sync Status Indicator */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/30 border border-border/50">
              <div className={`w-2 h-2 rounded-full ${syncing ? 'bg-yellow-400 animate-pulse' : hasGscData ? 'bg-green-400' : 'bg-gray-400'}`} />
              <span className="text-xs text-muted-foreground">
                {syncing ? 'Syncing...' : hasGscData ? 'GSC Connected' : 'GSC Not Connected'}
              </span>
              {currentProject?.gsc_last_sync_at && !syncing && (
                <span className="text-xs text-muted-foreground border-l border-border/50 pl-2 ml-1">
                  {formatRelativeTime(currentProject.gsc_last_sync_at)}
                </span>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                className="h-5 w-5 p-0 ml-1"
                onClick={handleSyncGsc}
                disabled={syncing}
              >
                <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={async () => {
              setCrawling(true)
              setSyncing(true)
              setDetecting(true)
              try {
                await Promise.all([
                  handleCrawlSitemap(),
                  handleSyncGsc(),
                  handleDetectOpportunities()
                ])
              } finally {
                setCrawling(false)
                setSyncing(false)
                setDetecting(false)
              }
            }}
            disabled={crawling || syncing || detecting}
          >
            {(crawling || syncing || detecting) ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Scan Now
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setView('ai-insights')}
            className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
          >
            <SignalIcon className="h-4 w-4 mr-2" />
            Signal Insights
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
                <p className="text-xs text-muted-foreground">
                  {typeof gscError === 'string' ? gscError : gscError?.message || 'Unknown error'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions Bar */}
      <SEOQuickActionsBar 
        projectId={currentProject?.id}
        domain={domain}
        onActionComplete={(action, msg) => console.log('[SEO] Action complete:', action, msg)}
      />

      {/* Health Score - Full Width */}
      <SEOHealthScore 
        site={currentProject}
        pages={pages}
        opportunities={opportunities}
        gscMetrics={gscMetrics}
        cwvSummary={cwvSummary}
        onViewDetails={() => handleViewChange('health-report')}
        onFixIssues={handleFixIssues}
      />
      
      {/* Quick Wins */}
      <SEOQuickWins 
        site={currentProject}
        onViewAll={() => setView('ai-insights')}
      />

      {/* Quick Stats from GSC */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={gscLoading ? 'animate-pulse' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <MousePointerClick className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-muted-foreground">Clicks (28d)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">
                {formatNumber(hasGscData ? gscMetrics.clicks?.value : currentProject?.total_clicks_28d)}
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
              <span className="text-sm text-muted-foreground">Impressions (28d)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">
                {formatNumber(hasGscData ? gscMetrics.impressions?.value : currentProject?.total_impressions_28d)}
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
              <span className="text-sm text-muted-foreground">Avg Position</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">
                {hasGscData ? gscMetrics.position?.value?.toFixed(1) : (currentProject?.avg_position_28d?.toFixed(1) || '-')}
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
              <span className="text-sm text-muted-foreground">CTR</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">
                {hasGscData ? `${(gscMetrics.ctr?.value * 100)?.toFixed(1)}%` : formatPercent(currentProject?.avg_ctr_28d)}
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
                    className="flex-1 bg-primary rounded-t opacity-60 hover:opacity-100 transition-opacity"
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${day.date}: ${day.clicks} clicks`}
                  />
                )
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
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
                  <tr className="text-left text-muted-foreground border-b border-border/50">
                    <th className="pb-2 font-medium">Query</th>
                    <th className="pb-2 font-medium text-right">Clicks</th>
                    <th className="pb-2 font-medium text-right">Impressions</th>
                    <th className="pb-2 font-medium text-right">Position</th>
                    <th className="pb-2 font-medium text-right">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {gscQueries.slice(0, 10).map((query, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 text-foreground">{query.query}</td>
                      <td className="py-2 text-right text-muted-foreground">{query.clicks}</td>
                      <td className="py-2 text-right text-muted-foreground">{formatNumber(query.impressions)}</td>
                      <td className="py-2 text-right">
                        <span className={query.position <= 10 ? 'text-green-400' : query.position <= 20 ? 'text-yellow-400' : 'text-muted-foreground'}>
                          {query.position?.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-2 text-right text-muted-foreground">
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
            <div className="text-3xl font-bold text-foreground">
              {pages.length || 0}
            </div>
            <div className="flex items-center gap-2 mt-2 text-sm">
              <span className="text-green-400">{currentProject?.pages_indexed || 0} indexed</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-red-400">{currentProject?.pages_not_indexed || 0} not indexed</span>
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
            <div className="text-3xl font-bold text-foreground">
              {openOpportunities.length}
            </div>
            <div className="flex items-center gap-2 mt-2 text-sm">
              <span className="text-red-400">
                {opportunities.filter(o => o.priority === 'critical').length} critical
              </span>
              <span className="text-muted-foreground">•</span>
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
            {(currentProject?.gscConnected || currentProject?.gsc_connected_at) ? (
              <>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">
                  Last sync: {(currentProject.lastSyncAt || currentProject.gsc_last_sync_at)
                    ? new Date(currentProject.lastSyncAt || currentProject.gsc_last_sync_at).toLocaleDateString()
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
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : topPages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
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
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleSelectPage(page.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {page.title || page.path}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {page.path}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <p className="text-foreground">{page.clicks_28d || 0}</p>
                        <p className="text-xs text-muted-foreground">clicks</p>
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
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : openOpportunities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
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
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => opp.page_id && handleSelectPage(opp.page_id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {opp.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
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
