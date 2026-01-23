// src/pages/seo/SEOModule.jsx
// Main SEO Module - Motion-inspired layout with collapsible sidebar
// Matches Sync module styling with muted backgrounds

import { useState, useEffect, lazy, Suspense } from 'react'
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSeoStore } from '@/lib/seo-store'
import useAuthStore from '@/lib/auth-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import SignalIcon from '@/components/ui/SignalIcon'
import { 
  Search,
  Settings,
  RefreshCw,
  ChevronRight,
  PanelLeftClose,
  Sparkles,
  Target
} from 'lucide-react'
import { useSignalAccess } from '@/lib/signal-access'

// Import SEO Sidebar content (nav sections)
import SEOSidebar, { NAV_SECTIONS } from '@/components/seo/SEOSidebar'

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
import SEOManagedFAQs from '@/components/seo/SEOManagedFAQs'
import SEOContentBriefs from '@/components/seo/SEOContentBriefs'
import SEOAlerts from '@/components/seo/SEOAlerts'
import SEOSetupGate from '@/components/seo/SEOSetupGate'
import SEOChangeHistory from '@/components/seo/SEOChangeHistory'
import SEOIndexingIssues from '@/components/seo/SEOIndexingIssues'
import { SEOClientReportButton } from '@/components/seo/SEOClientReport'

// Lazy load future features
const SEOSprints = lazy(() => import('@/components/seo/SEOSprints').catch(() => ({ default: () => <ComingSoon feature="Sprints" /> })))
const SEOAutopilot = lazy(() => import('@/components/seo/SEOAutopilot').catch(() => ({ default: () => <ComingSoon feature="Autopilot" /> })))
const SEOCollaboration = lazy(() => import('@/components/seo/SEOCollaboration').catch(() => ({ default: () => <ComingSoon feature="Team Collaboration" /> })))

// Coming soon placeholder
function ComingSoon({ feature }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 py-12 text-center">
      <SignalIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">{feature} Coming Soon</h3>
      <p className="text-muted-foreground">This feature is currently in development.</p>
    </div>
  )
}

// Loading fallback
function TabLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}

// Tab component mapping - not used anymore with React Router
// Keeping for reference during migration
const TAB_COMPONENTS_OLD = {
  'dashboard': SEODashboard,
  'alerts': SEOAlerts,
  'history': SEOChangeHistory,
  'pages': SEOPagesList,
  'keywords': SEOKeywordTracking,
  'opportunities': SEOOpportunities,
  'content-decay': SEOContentDecay,
  'technical': SEOTechnicalAudit,
  'indexing': SEOIndexingIssues,
  'internal-links': SEOInternalLinks,
  'schema': SEOSchemaMarkup,
  'backlinks': SEOBacklinks,
  'local-seo': SEOLocalSeo,
  'competitors': SEOCompetitors,
  'ai-insights': SEOAIInsights,
  'content-briefs': SEOContentBriefs,
  'sprints': SEOSprints,
  'autopilot': SEOAutopilot,
  'collaboration': SEOCollaboration,
}

// Components that need Suspense (lazy loaded)
const LAZY_TABS = ['sprints', 'autopilot', 'collaboration']

export default function SEOModule() {
  const navigate = useNavigate()
  const location = useLocation()
  const { hasAccess: hasSignalAccess } = useSignalAccess()
  const { currentProject: authCurrentProject } = useAuthStore()
  
  const { 
    projects, 
    currentProject, 
    fetchProjects, 
    fetchProject,
    alertsStats,
    runAutoOptimize
  } = useSeoStore()
  
  // Always use current project from auth store
  const projectId = authCurrentProject?.id
  
  // Get active tab from current route path
  const pathSegments = location.pathname.split('/').filter(Boolean)
  const activeTab = pathSegments[1] || 'dashboard' // /seo/keywords -> 'keywords'
  
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)

  // Load sites on mount
  useEffect(() => {
    fetchProjects()
  }, [])

  // Load specific project when ID changes
  useEffect(() => {
    if (projectId) {
      fetchProject(projectId)
    }
  }, [projectId, fetchProject])

  const handleTabChange = (tab) => {
    // Navigate to proper route
    navigate(`/seo/${tab}`)
  }

  const handleProjectChange = (newProjectId) => {
    // Project changes happen at auth store level
    // Just refresh the SEO data
    if (newProjectId) {
      fetchProject(newProjectId)
    }
  }

  const handleRunAutoOptimize = async () => {
    if (!currentProject?.id) return
    setIsOptimizing(true)
    try {
      await runAutoOptimize(currentProject.id)
    } catch (error) {
      console.error('Auto-optimize error:', error)
    }
    setIsOptimizing(false)
  }

  return (
    <TooltipProvider>
      <div className="h-[calc(100vh-8rem)] flex flex-col bg-background overflow-hidden">
        {/* ===== TOP HEADER BAR ===== */}
        <div className="flex-shrink-0 h-14 border-b flex items-center justify-between px-4 bg-card/50">
          {/* Left: Branding + Toggle */}
          <div className="flex items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={() => setShowSidebar(!showSidebar)}
                >
                  <PanelLeftClose className={cn("h-4 w-4 transition-transform", !showSidebar && "rotate-180")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showSidebar ? 'Hide sidebar' : 'Show sidebar'}</TooltipContent>
            </Tooltip>
            
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-sm">
                <Target className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-lg hidden lg:inline">SEO</span>
              {hasSignalAccess && (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] px-1.5 hidden sm:flex">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI
                </Badge>
              )}
            </div>
            
            <span className="text-sm text-muted-foreground hidden md:inline">
              AI-powered optimization & monitoring
            </span>
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Site Selector */}
            {projects?.length > 0 && (
              <Select 
                value={currentProject?.id || projectId} 
                onValueChange={handleProjectChange}
              >
                <SelectTrigger className="w-56 bg-background border-border/50">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.domain || project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Auto-Optimize Button */}
            {currentProject && (
              <Button 
                onClick={handleRunAutoOptimize}
                disabled={isOptimizing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isOptimizing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <SignalIcon className="mr-2 h-4 w-4" />
                    Auto-Optimize
                  </>
                )}
              </Button>
            )}

            {/* Generate Report Button */}
            {projectId && (
              <SEOClientReportButton 
                projectId={projectId} 
                variant="outline"
              />
            )}
          </div>
        </div>
        
        {/* ===== MAIN CONTENT AREA ===== */}
        <div className="flex-1 flex overflow-hidden">
          {/* ===== LEFT SIDEBAR ===== */}
          <AnimatePresence>
            {showSidebar && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 240, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="flex-shrink-0 border-r overflow-hidden bg-muted/30"
              >
                <SEOSidebar
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                  alertCount={alertsStats?.active || 0}
                  embedded
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* ===== MAIN CONTENT - React Router Routes ===== */}
          <div className="flex-1 overflow-auto">
            <div className="p-6 space-y-6">
              {/* No Domain Configured */}
              {!projectId && !authCurrentProject?.domain && (
                <div className="rounded-lg border border-border/50 bg-muted/30 py-12 text-center">
                  <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Domain Configured</h3>
                  <p className="text-muted-foreground mb-4">
                    Add a domain to your project settings to start tracking SEO
                  </p>
                  <Button 
                    onClick={() => navigate('/settings')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Configure Domain
                  </Button>
                </div>
              )}

              {/* Routes - Show when we have a projectId */}
              {projectId && (
                <SEOSetupGate projectId={projectId}>
                  <Routes>
                    {/* Default route */}
                    <Route index element={<Navigate to="dashboard" replace />} />
                    
                    {/* All SEO views */}
                    <Route path="dashboard" element={<SEODashboard projectId={projectId} />} />
                    <Route path="alerts" element={<SEOAlerts projectId={projectId} />} />
                    <Route path="history" element={<SEOChangeHistory projectId={projectId} />} />
                    <Route path="pages" element={<SEOPagesList projectId={projectId} />} />
                    <Route path="pages/:pageId" element={<SEOPageDetail projectId={projectId} />} />
                    <Route path="keywords" element={<SEOKeywordTracking projectId={projectId} />} />
                    <Route path="opportunities" element={<SEOOpportunities projectId={projectId} />} />
                    <Route path="content-decay" element={<SEOContentDecay projectId={projectId} />} />
                    <Route path="technical" element={<SEOTechnicalAudit projectId={projectId} />} />
                    <Route path="indexing" element={<SEOIndexingIssues projectId={projectId} />} />
                    <Route path="internal-links" element={<SEOInternalLinks projectId={projectId} />} />
                    <Route path="schema" element={<SEOSchemaMarkup projectId={projectId} />} />
                    <Route path="faqs" element={<SEOManagedFAQs projectId={projectId} />} />
                    <Route path="backlinks" element={<SEOBacklinks projectId={projectId} />} />
                    <Route path="local-seo" element={<SEOLocalSeo projectId={projectId} />} />
                    <Route path="competitors" element={<SEOCompetitors projectId={projectId} />} />
                    <Route path="ai-insights" element={<SEOAIInsights projectId={projectId} />} />
                    <Route path="content-briefs" element={<SEOContentBriefs projectId={projectId} />} />
                    
                    {/* Lazy loaded routes */}
                    <Route 
                      path="sprints" 
                      element={
                        <Suspense fallback={<TabLoading />}>
                          <SEOSprints projectId={projectId} />
                        </Suspense>
                      } 
                    />
                    <Route 
                      path="autopilot" 
                      element={
                        <Suspense fallback={<TabLoading />}>
                          <SEOAutopilot projectId={projectId} />
                        </Suspense>
                      } 
                    />
                    <Route 
                      path="collaboration" 
                      element={
                        <Suspense fallback={<TabLoading />}>
                          <SEOCollaboration projectId={projectId} />
                        </Suspense>
                      } 
                    />
                    
                    {/* Catch unknown routes */}
                    <Route path="*" element={<Navigate to="dashboard" replace />} />
                  </Routes>
                </SEOSetupGate>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
