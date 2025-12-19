// src/components/seo/SEODashboardV2.jsx
// Redesigned SEO Dashboard - Uses new tab components with Signal integration
import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Globe, 
  AlertTriangle,
  RefreshCw,
  Zap,
  ArrowLeft,
  ExternalLink,
  Loader2,
  Settings
} from 'lucide-react'
import { useSeoStore, useSignalAccess, useSignalStatus } from '@/lib/seo-store'
import useAuthStore from '@/lib/auth-store'

// Navigation
import SEONavigation from './SEONavigation'

// Tab Components
import SEOOverviewTab from './SEOOverviewTab'
import SEOPagesTab from './SEOPagesTab'
import SEOKeywordsTab from './SEOKeywordsTab'
import SEOContentTab from './SEOContentTab'
import SEOTechnicalTab from './SEOTechnicalTab'
import SEOTrends from './SEOTrends'

// Detail Views
import SEOPageDetail from './SEOPageDetail'
import SEOHealthScore from './SEOHealthScore'

export default function SEODashboardV2({ onNavigate, onRunSetup }) {
  const { currentOrg } = useAuthStore()
  const hasSignal = useSignalAccess()
  const signalStatus = useSignalStatus()
  
  const { 
    currentSite,
    pages,
    opportunities,
    aiRecommendations,
    sitesLoading,
    pagesLoading,
    opportunitiesLoading,
    sitesError,
    fetchSiteForOrg,
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
    fetchCwvSummary,
    // Signal
    signalLearning,
    fetchSignalLearning
  } = useSeoStore()

  // View state
  const [view, setView] = useState('overview') // overview, pages, keywords, content, technical, reports
  const [subView, setSubView] = useState(null) // page-detail, health-report
  const [crawling, setCrawling] = useState(false)
  const [syncing, setSyncing] = useState(false)
  
  // Track if initial data has been fetched
  const lastOrgIdRef = useRef(null)
  const lastSiteIdRef = useRef(null)

  // Fetch site data for current org on mount
  useEffect(() => {
    if (currentOrg?.id && currentOrg.id !== lastOrgIdRef.current) {
      lastOrgIdRef.current = currentOrg.id
      if (!currentSite?.id || currentSite.org_id !== currentOrg.id) {
        fetchSiteForOrg(currentOrg.id)
      }
    }
  }, [currentOrg?.id])

  // Fetch pages, opportunities, and GSC data when site is loaded
  useEffect(() => {
    if (currentSite?.id && currentSite.id !== lastSiteIdRef.current) {
      lastSiteIdRef.current = currentSite.id
      
      fetchPages(currentSite.id, { limit: 100 })
      fetchOpportunities(currentSite.id, { limit: 50, status: 'open' })
      fetchAiRecommendations(currentSite.id)
      fetchCwvSummary(currentSite.id)
      
      // Fetch GSC data
      if (currentOrg?.domain) {
        fetchGscOverview(currentOrg.domain)
        fetchGscQueries(currentOrg.domain, { limit: 50 })
      }
      
      // Fetch Signal learning if enabled
      if (hasSignal) {
        fetchSignalLearning(currentSite.id)
      }
    }
  }, [currentSite?.id, hasSignal])

  // Handlers
  const handleCrawlSitemap = async () => {
    if (!currentSite?.id) return
    setCrawling(true)
    try {
      await crawlSitemap(currentSite.id)
      await fetchPages(currentSite.id, { limit: 100 })
    } finally {
      setCrawling(false)
    }
  }

  const handleSyncGsc = async () => {
    if (!currentOrg?.domain) return
    setSyncing(true)
    try {
      await fetchGscOverview(currentOrg.domain)
      await fetchGscQueries(currentOrg.domain, { limit: 50 })
    } finally {
      setSyncing(false)
    }
  }

  const handleSelectPage = async (pageId) => {
    await selectPage(pageId)
    setSubView('page-detail')
  }

  const handleViewChange = (newView) => {
    // Handle special sub-views
    if (newView === 'health-report' || newView === 'signal-memory') {
      setSubView(newView)
      return
    }
    
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

  // Prepare derived data
  const gscMetrics = gscOverview?.metrics || {}
  const opportunityCounts = {
    technical: opportunities.filter(o => o.type === 'technical').length,
    content: opportunities.filter(o => o.type === 'content').length
  }

  // Calculate content/thin pages
  const decayingPages = pages.filter(p => p.decay || (p.traffic_trend && p.traffic_trend < -20))
  const thinContentPages = pages.filter(p => (p.word_count || 0) < 300)

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

  // No domain configured
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

  // No site created yet
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
  if (subView === 'page-detail' && currentPage) {
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

  if (subView === 'health-report') {
    return (
      <div className="p-6">
        <Button variant="ghost" size="sm" onClick={handleBack} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Overview
        </Button>
        <SEOHealthScore 
          site={currentSite}
          pages={pages}
          opportunities={opportunities}
          gscMetrics={gscMetrics}
          cwvSummary={cwvSummary}
          detailed={true}
          onFixIssues={() => handleViewChange('technical')}
        />
      </div>
    )
  }

  // Render current view content
  const renderViewContent = () => {
    switch (view) {
      case 'pages':
        return (
          <SEOPagesTab
            site={currentSite}
            pages={pages}
            onSelectPage={handleSelectPage}
            onRefresh={() => fetchPages(currentSite.id, { limit: 100 })}
            isLoading={pagesLoading}
          />
        )
      
      case 'keywords':
        return (
          <SEOKeywordsTab
            siteId={currentSite?.id}
            gscQueries={gscQueries}
            trackedKeywords={[]} // TODO: wire to store
            opportunities={opportunities.filter(o => o.type === 'keyword')}
            onAddKeyword={() => console.log('Add keyword modal')}
            onViewKeyword={(kw) => console.log('View keyword:', kw)}
          />
        )
      
      case 'content':
        return (
          <SEOContentTab
            siteId={currentSite?.id}
            pages={pages}
            contentBriefs={[]} // TODO: wire to store
            decayingPages={decayingPages}
            thinContentPages={thinContentPages}
            onViewPage={(page) => handleSelectPage(page.id)}
            onOptimizePage={(page) => console.log('Optimize page:', page)}
            onCreateBrief={() => console.log('Create brief modal')}
            onViewBrief={(brief) => console.log('View brief:', brief)}
            onRefresh={() => fetchPages(currentSite.id, { limit: 100 })}
            isLoading={pagesLoading}
          />
        )
      
      case 'technical':
        return (
          <SEOTechnicalTab
            siteId={currentSite?.id}
            cwvSummary={cwvSummary}
            issues={opportunities.filter(o => o.type === 'technical')}
            schemaValidation={[]} // TODO: wire to store
            crawlStats={{
              totalPages: pages.length,
              pagesIndexed: pages.filter(p => p.indexed).length,
              pagesBlocked: pages.filter(p => p.blocked).length,
              pagesError: pages.filter(p => p.error).length,
              lastCrawl: currentSite?.last_crawl_at
            }}
            onRunAudit={() => fetchCwvSummary(currentSite.id)}
            onFixIssue={(issue) => console.log('Fix issue:', issue)}
            onViewSchema={(schema) => console.log('View schema:', schema)}
            isLoading={false}
          />
        )
      
      case 'reports':
        return (
          <SEOTrends site={currentSite} onViewDetails={handleViewChange} />
        )
      
      case 'overview':
      default:
        return (
          <SEOOverviewTab
            site={currentSite}
            pages={pages}
            opportunities={opportunities}
            gscMetrics={gscMetrics}
            cwvSummary={cwvSummary}
            onViewChange={handleViewChange}
            onSelectPage={handleSelectPage}
            onCrawlSitemap={handleCrawlSitemap}
            onSyncGsc={handleSyncGsc}
            onRunSetup={onRunSetup}
            isCrawling={crawling}
            isSyncing={syncing}
          />
        )
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">SEO Command Center</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <a 
              href={`https://${currentOrg.domain}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[var(--text-secondary)] hover:text-[var(--accent-primary)] flex items-center gap-1"
            >
              <Globe className="h-4 w-4 text-[var(--accent-primary)]" />
              {currentOrg.domain}
              <ExternalLink className="h-3 w-3" />
            </a>
            
            {/* GSC Status */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)]">
              <div className={`w-2 h-2 rounded-full ${syncing ? 'bg-yellow-400 animate-pulse' : gscOverview ? 'bg-green-400' : 'bg-gray-400'}`} />
              <span className="text-xs text-[var(--text-tertiary)]">
                {syncing ? 'Syncing...' : gscOverview ? 'GSC Connected' : 'GSC Not Connected'}
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-5 w-5 p-0"
                onClick={handleSyncGsc}
                disabled={syncing}
              >
                <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <SEONavigation 
        activeView={view} 
        onViewChange={handleViewChange} 
        alerts={opportunityCounts.technical} 
        opportunities={opportunityCounts.content} 
      />

      {/* View Content */}
      {renderViewContent()}
    </div>
  )
}
