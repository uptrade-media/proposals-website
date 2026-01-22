// src/pages/analytics/AnalyticsDashboard.jsx
// Analytics Dashboard with sidebar navigation and per-page views
// Uses internal state for view switching (no URL changes)

import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import useAuthStore from '@/lib/auth-store'
import useAnalyticsStore from '@/lib/analytics-store'
import useSiteAnalyticsStore from '@/lib/site-analytics-store'
import { useSignalAccess } from '@/lib/signal-access'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Sparkles,
  ChevronRight,
  ChevronDown,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Loader2,
  Brain,
  BarChart3,
  Calendar,
  Route,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Analytics from '@/components/Analytics'

// Lazy load view components for code splitting
const PageAnalyticsView = lazy(() => import('./views/PageAnalyticsView'))
const JourneysView = lazy(() => import('./views/JourneysView.tsx'))
const AIInsightsPanel = lazy(() => import('./components/AIInsightsPanel'))

// Loading fallback
function ViewLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
    </div>
  )
}

// Sidebar navigation item
function SidebarItem({ 
  icon: Icon, 
  label, 
  active, 
  onClick, 
  count, 
  collapsed,
  indent = 0
}) {
  const content = (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
        active 
          ? "bg-primary/10 text-primary font-medium" 
          : "hover:bg-muted text-foreground",
        indent > 0 && `ml-${indent * 4}`
      )}
      style={{ marginLeft: collapsed ? 0 : indent * 16 }}
    >
      {Icon && <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />}
      {!collapsed && (
        <>
          <span className="flex-1 text-left truncate">{label}</span>
          {count !== undefined && count > 0 && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-auto">
              {formatNumber(count)}
            </Badge>
          )}
        </>
      )}
    </button>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          <p>{label}</p>
          {count !== undefined && <p className="text-xs opacity-70">{formatNumber(count)} views</p>}
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
}

// Hierarchical page tree node
function PageTreeNode({ 
  node, 
  depth = 0, 
  selectedPath, 
  onSelect, 
  onToggle, 
  collapsed 
}) {
  const hasChildren = node.children && node.children.length > 0
  const isSelected = selectedPath === node.path
  
  return (
    <div>
      <div 
        className={cn(
          "flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-colors",
          "hover:bg-muted",
          isSelected && "bg-primary/10 text-primary"
        )}
        style={{ paddingLeft: collapsed ? 8 : 8 + depth * 16 }}
      >
        {hasChildren && !collapsed && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggle(node.path)
            }}
            className="p-0.5 hover:bg-muted rounded"
          >
            {node.isOpen 
              ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> 
              : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          </button>
        )}
        {!hasChildren && !collapsed && <div className="w-4" />}
        
        <button
          onClick={() => onSelect(node.path)}
          className={cn(
            "flex items-center gap-2 text-sm text-left truncate",
            collapsed ? "w-full justify-center" : "flex-1",
            isSelected ? "text-primary font-medium" : "text-foreground"
          )}
        >
          <FileText className={cn(
            "h-3.5 w-3.5 shrink-0",
            isSelected ? "text-primary" : "text-muted-foreground"
          )} />
          {!collapsed && (
            <>
              <span className="truncate">{node.name}</span>
              {node.views > 0 && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {formatNumber(node.views)}
                </span>
              )}
            </>
          )}
        </button>
      </div>
      
      {hasChildren && node.isOpen && !collapsed && (
        <div className="ml-2">
          {node.children.map(child => (
            <PageTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onToggle={onToggle}
              collapsed={collapsed}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Sidebar component
function AnalyticsSidebar({ collapsed, onToggle, signalEnabled, onSignalInsightsClick }) {
  const { 
    currentView, 
    selectedPath, 
    pageHierarchy,
    flatPages,
    hierarchyLoading,
    setCurrentView, 
    setSelectedPath,
    toggleNode,
    expandToPath
  } = useAnalyticsStore()
  
  // Use hierarchyLoading for page tree, not analytics isLoading
  const isLoadingPages = hierarchyLoading
  
  // Check if we have any pages (including just home page)
  const hasPages = flatPages.length > 0 || pageHierarchy.length > 0
  
  const handleHighlightsClick = () => {
    setCurrentView('highlights')
    setSelectedPath(null)
  }
  
  const handleJourneysClick = () => {
    setCurrentView('journeys')
    setSelectedPath(null)
  }
  
  const handlePageSelect = (path) => {
    setSelectedPath(path)
    setCurrentView('page')
    expandToPath(path)
  }

  return (
    <div className={cn(
      "h-full flex flex-col border-r border-[var(--glass-border)] bg-muted/30 transition-all duration-300",
      collapsed ? "w-14" : "w-52"
    )}>
      {/* Sidebar content */}
      <ScrollArea className="flex-1 p-2 pt-4">
        <TooltipProvider delayDuration={0}>
          {/* Highlights - Main overview */}
          <div className="mb-4">
            <SidebarItem
              icon={Sparkles}
              label="Highlights"
              active={currentView === 'highlights' && !selectedPath}
              onClick={handleHighlightsClick}
              collapsed={collapsed}
            />
            <SidebarItem
              icon={Route}
              label="Journeys"
              active={currentView === 'journeys'}
              onClick={handleJourneysClick}
              collapsed={collapsed}
            />
          </div>
          
          {/* Pages Section */}
          {!collapsed && (
            <div className="mb-2">
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Site Pages
              </div>
            </div>
          )}
          
          {/* Page Hierarchy Tree */}
          {isLoadingPages ? (
            <div className="space-y-2 px-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-7 w-full" />
              ))}
            </div>
          ) : hasPages ? (
            <div className="space-y-0.5">
              {/* Render page hierarchy (includes Home page) */}
              {pageHierarchy.map(node => (
                <PageTreeNode
                  key={node.path}
                  node={node}
                  selectedPath={selectedPath}
                  onSelect={handlePageSelect}
                  onToggle={toggleNode}
                  collapsed={collapsed}
                />
              ))}
            </div>
          ) : (
            !collapsed && (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                No page data yet
              </div>
            )
          )}
          
          {/* Signal AI Features */}
          {signalEnabled && (
            <div className="mt-6">
              {!collapsed && (
                <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-emerald-500" />
                  AI Features
                </div>
              )}
              <div className={cn(
                "mt-2 rounded-lg border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5",
                collapsed ? "p-1" : "p-2"
              )}>
                <SidebarItem
                  icon={Brain}
                  label="Signal Insights"
                  active={currentView === 'signal-insights'}
                  onClick={onSignalInsightsClick}
                  collapsed={collapsed}
                />
              </div>
            </div>
          )}
        </TooltipProvider>
      </ScrollArea>
    </div>
  )
}

// Main dashboard component
export default function AnalyticsDashboard() {
  const { currentProject } = useAuthStore()
  const { hasProjectSignal } = useSignalAccess()
  const { 
    currentView, 
    selectedPath, 
    sidebarCollapsed,
    setSidebarCollapsed,
    setCurrentView,
    fetchPageAnalytics,
    fetchAIInsights,
    aiInsights,
    aiInsightsLoading
  } = useAnalyticsStore()
  
  const { 
    overview,
    fetchAllAnalytics, 
    isLoading,
    dateRange,
    setDateRange 
  } = useSiteAnalyticsStore()
  
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [customDateRange, setCustomDateRange] = useState(null)
  const [isCustomRangeOpen, setIsCustomRangeOpen] = useState(false)
  
  // Check if this project has Signal enabled
  const signalEnabled = hasProjectSignal
  
  // Handle date range change
  const handleDateRangeChange = (value) => {
    if (value === 'custom') {
      setIsCustomRangeOpen(true)
      return
    }
    const days = parseInt(value, 10)
    setCustomDateRange(null)
    setDateRange(days)
    fetchAllAnalytics()
    if (selectedPath && currentProject?.id) {
      fetchPageAnalytics(currentProject.id, selectedPath, days)
    }
  }
  
  // Handle custom date range selection
  const handleCustomDateRangeSelect = (range) => {
    if (range?.from && range?.to) {
      setCustomDateRange(range)
      const days = Math.ceil((range.to - range.from) / (1000 * 60 * 60 * 24))
      setDateRange(days)
      setIsCustomRangeOpen(false)
      fetchAllAnalytics()
      if (selectedPath && currentProject?.id) {
        fetchPageAnalytics(currentProject.id, selectedPath, days)
      }
    }
  }
  
  // Format custom date range for display
  const getDateRangeLabel = () => {
    if (customDateRange?.from && customDateRange?.to) {
      const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }
      return `${formatDate(customDateRange.from)} - ${formatDate(customDateRange.to)}`
    }
    return null
  }
  
  // Fetch data when page is selected
  useEffect(() => {
    if (selectedPath && currentProject?.id) {
      fetchPageAnalytics(currentProject.id, selectedPath, dateRange)
    }
  }, [selectedPath, currentProject?.id, dateRange, fetchPageAnalytics])
  
  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchAllAnalytics()
    if (selectedPath && currentProject?.id) {
      await fetchPageAnalytics(currentProject.id, selectedPath, dateRange)
    }
    setIsRefreshing(false)
  }
  
  // Handle Signal Insights click from sidebar
  const handleSignalInsightsClick = async () => {
    setCurrentView('signal-insights')
    if (currentProject?.id) {
      await fetchAIInsights(currentProject.id, selectedPath)
    }
    setShowAIPanel(true)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Top Bar - Full width header */}
      <div className="flex-shrink-0 h-14 border-b flex items-center justify-between px-4 bg-card/50">
        {/* Left: Collapse + Branding + Date */}
        <div className="flex items-center gap-3">
          {/* Sidebar Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="h-8 w-8"
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
          
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-lg">Analytics</span>
            {signalEnabled && (
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] px-1.5 hidden sm:flex">
                <Sparkles className="h-3 w-3 mr-1" />
                AI
              </Badge>
            )}
          </div>
          
          {/* Date Range Selector */}
          <Popover open={isCustomRangeOpen} onOpenChange={setIsCustomRangeOpen}>
            <Select 
              value={customDateRange ? 'custom' : String(dateRange)} 
              onValueChange={handleDateRangeChange}
            >
              <SelectTrigger className="w-[180px] h-8 text-xs ml-2">
                <Calendar className="h-3 w-3 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Date range">
                  {getDateRangeLabel() || `Last ${dateRange} days`}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="custom">Custom range...</SelectItem>
              </SelectContent>
            </Select>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="range"
                selected={customDateRange}
                onSelect={handleCustomDateRangeSelect}
                numberOfMonths={2}
                defaultMonth={customDateRange?.from || new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Content area with sidebar */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <AnalyticsSidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          signalEnabled={signalEnabled}
          onSignalInsightsClick={handleSignalInsightsClick}
        />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
          {/* View Content - Scrollable */}
          <div className="flex-1 min-h-0 overflow-auto">
            <div className={cn(
              currentView === 'journeys' ? "h-full" : "p-6",
              showAIPanel && "pr-0"
            )}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentView + (selectedPath || '')}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className={currentView === 'journeys' ? "h-full" : ""}
                >
                  <Suspense fallback={<ViewLoader />}>
                    {currentView === 'highlights' ? (
                      <Analytics />
                    ) : currentView === 'journeys' ? (
                      <JourneysView />
                    ) : currentView === 'signal-insights' ? (
                      <div className="h-full">
                        <Suspense fallback={<ViewLoader />}>
                          <AIInsightsPanel 
                            path={selectedPath}
                            onClose={() => {
                              setCurrentView('highlights')
                              setShowAIPanel(false)
                            }}
                            fullPage
                          />
                        </Suspense>
                      </div>
                    ) : (
                      <PageAnalyticsView path={selectedPath} />
                    )}
                  </Suspense>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Utility functions
function formatNumber(num) {
  if (!num) return '0'
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

function formatPathForDisplay(path) {
  if (!path || path === '/') return 'Home'
  
  const segments = path.split('/').filter(Boolean)
  const lastSegment = segments[segments.length - 1]
  
  return lastSegment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}
