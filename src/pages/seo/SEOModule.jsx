// src/pages/seo/SEOModule.jsx
// Main SEO Module - Master navigation for all SEO features
import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useSeoStore } from '@/lib/seo-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  LayoutDashboard,
  Search,
  FileText,
  Link2,
  Target,
  TrendingDown,
  Users,
  Bell,
  Settings,
  Sparkles,
  Shield,
  MapPin,
  Code,
  Brain,
  RefreshCw,
  ChevronRight,
  PenLine
} from 'lucide-react'

// Import all SEO components
import SEODashboard from '@/components/seo/SEODashboard'
import SEOPagesList from '@/components/seo/SEOPagesList'
import SEOPageDetail from '@/components/seo/SEOPageDetail'
import SEOOpportunities from '@/components/seo/SEOOpportunities'
import SEOAIInsights from '@/components/seo/SEOAIInsights'
import SEOKeywordTracking from '@/components/seo/SEOKeywordTracking'
import SEOCompetitors from '@/components/seo/SEOCompetitors'
import SEOTechnicalAudit from '@/components/seo/SEOTechnicalAudit'
import SEOContentDecay from '@/components/seo/SEOContentDecay'
import SEOBacklinks from '@/components/seo/SEOBacklinks'
import SEOLocalSeo from '@/components/seo/SEOLocalSeo'
import SEOInternalLinks from '@/components/seo/SEOInternalLinks'
import SEOSchemaMarkup from '@/components/seo/SEOSchemaMarkup'
import SEOContentBriefs from '@/components/seo/SEOContentBriefs'
import SEOAlerts from '@/components/seo/SEOAlerts'
import SEOBlogBrain from '@/components/seo/SEOBlogBrain'
import SEOSetupGate from '@/components/seo/SEOSetupGate'

// Tab configuration
const TAB_CONFIG = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'ai-insights', label: 'AI Brain', icon: Brain },
  { id: 'blog-brain', label: 'Blog Brain', icon: PenLine },
  { id: 'pages', label: 'Pages', icon: FileText },
  { id: 'keywords', label: 'Keywords', icon: Target },
  { id: 'opportunities', label: 'Opportunities', icon: Sparkles },
  { id: 'technical', label: 'Technical', icon: Shield },
  { id: 'content-decay', label: 'Content Decay', icon: TrendingDown },
  { id: 'internal-links', label: 'Internal Links', icon: Link2 },
  { id: 'schema', label: 'Schema', icon: Code },
  { id: 'local-seo', label: 'Local SEO', icon: MapPin },
  { id: 'competitors', label: 'Competitors', icon: Users },
  { id: 'backlinks', label: 'Backlinks', icon: Link2 },
  { id: 'content-briefs', label: 'Content Briefs', icon: FileText },
  { id: 'alerts', label: 'Alerts', icon: Bell }
]

export default function SEOModule() {
  const { siteId, pageId, tab: urlTab } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  
  const { 
    sites, 
    currentSite, 
    fetchSites, 
    fetchSite,
    alertsStats,
    runAutoOptimize
  } = useSeoStore()
  
  const [activeTab, setActiveTab] = useState(urlTab || 'dashboard')
  const [isOptimizing, setIsOptimizing] = useState(false)

  // Load sites on mount
  useEffect(() => {
    fetchSites()
  }, [])

  // Load specific site when ID changes
  useEffect(() => {
    if (siteId) {
      fetchSite(siteId)
    }
  }, [siteId])

  // Sync tab with URL
  useEffect(() => {
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab)
    }
  }, [urlTab])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (siteId) {
      navigate(`/seo/${siteId}/${tab}`)
    }
  }

  const handleSiteChange = (newSiteId) => {
    navigate(`/seo/${newSiteId}/${activeTab}`)
  }

  const handleRunAutoOptimize = async () => {
    if (!currentSite?.id) return
    setIsOptimizing(true)
    try {
      await runAutoOptimize(currentSite.id)
    } catch (error) {
      console.error('Auto-optimize error:', error)
    }
    setIsOptimizing(false)
  }

  // If viewing a specific page
  if (pageId) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <span 
            className="cursor-pointer hover:text-foreground"
            onClick={() => navigate(`/seo/${siteId}/pages`)}
          >
            Pages
          </span>
          <ChevronRight className="h-4 w-4" />
          <span>Page Detail</span>
        </div>
        <SEOPageDetail siteId={siteId} pageId={pageId} />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SEO Module</h1>
          <p className="text-muted-foreground">
            AI-powered SEO optimization and monitoring
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Site Selector */}
          {sites?.length > 0 && (
            <Select 
              value={currentSite?.id || siteId} 
              onValueChange={handleSiteChange}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a site" />
              </SelectTrigger>
              <SelectContent>
                {sites.map(site => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.domain || site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Auto-Optimize Button */}
          {currentSite && (
            <Button 
              onClick={handleRunAutoOptimize}
              disabled={isOptimizing}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isOptimizing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Auto-Optimize
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Alert Badge */}
      {alertsStats?.active > 0 && (
        <div 
          className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg cursor-pointer hover:bg-yellow-100"
          onClick={() => handleTabChange('alerts')}
        >
          <Bell className="h-5 w-5 text-yellow-600" />
          <span className="font-medium text-yellow-800">
            {alertsStats.active} active alert{alertsStats.active > 1 ? 's' : ''} require attention
          </span>
          <ChevronRight className="h-4 w-4 text-yellow-600 ml-auto" />
        </div>
      )}

      {/* No Site Selected */}
      {!siteId && sites?.length > 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select a Site</h3>
            <p className="text-muted-foreground mb-4">
              Choose a site from the dropdown to view SEO data
            </p>
          </CardContent>
        </Card>
      )}

      {/* No Sites */}
      {sites?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Sites Connected</h3>
            <p className="text-muted-foreground mb-4">
              Connect your first site to start tracking SEO
            </p>
            <Button onClick={() => navigate('/seo/settings')}>
              Connect a Site
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {currentSite && (
        <SEOSetupGate siteId={currentSite.id}>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            {/* Tab Navigation - Scrollable */}
            <div className="border-b mb-6 overflow-x-auto">
              <TabsList className="inline-flex h-auto p-1 bg-transparent">
                {TAB_CONFIG.map(tab => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                  className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-muted rounded-lg whitespace-nowrap"
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {tab.id === 'alerts' && alertsStats?.active > 0 && (
                    <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {alertsStats.active}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Tab Content */}
          <TabsContent value="dashboard">
            <SEODashboard siteId={currentSite.id} />
          </TabsContent>

          <TabsContent value="ai-insights">
            <SEOAIInsights siteId={currentSite.id} />
          </TabsContent>

          <TabsContent value="blog-brain">
            <SEOBlogBrain siteId={currentSite.id} />
          </TabsContent>

          <TabsContent value="pages">
            <SEOPagesList siteId={currentSite.id} />
          </TabsContent>

          <TabsContent value="keywords">
            <SEOKeywordTracking siteId={currentSite.id} />
          </TabsContent>

          <TabsContent value="opportunities">
            <SEOOpportunities siteId={currentSite.id} />
          </TabsContent>

          <TabsContent value="technical">
            <SEOTechnicalAudit siteId={currentSite.id} />
          </TabsContent>

          <TabsContent value="content-decay">
            <SEOContentDecay siteId={currentSite.id} />
          </TabsContent>

          <TabsContent value="internal-links">
            <SEOInternalLinks siteId={currentSite.id} />
          </TabsContent>

          <TabsContent value="schema">
            <SEOSchemaMarkup siteId={currentSite.id} />
          </TabsContent>

          <TabsContent value="local-seo">
            <SEOLocalSeo siteId={currentSite.id} />
          </TabsContent>

          <TabsContent value="competitors">
            <SEOCompetitors siteId={currentSite.id} />
          </TabsContent>

          <TabsContent value="backlinks">
            <SEOBacklinks siteId={currentSite.id} />
          </TabsContent>

          <TabsContent value="content-briefs">
            <SEOContentBriefs siteId={currentSite.id} />
          </TabsContent>

          <TabsContent value="alerts">
            <SEOAlerts siteId={currentSite.id} />
          </TabsContent>
        </Tabs>
        </SEOSetupGate>
      )}
    </div>
  )
}
