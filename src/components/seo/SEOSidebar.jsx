// src/components/seo/SEOSidebar.jsx
// Vertical sidebar navigation for SEO module with collapsible sections
// Updated to match Sync module styling with muted backgrounds
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useSignalAccess } from '@/lib/signal-access'
import { 
  LayoutDashboard,
  Search,
  FileText,
  Link2,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Bell,
  Settings,
  Sparkles,
  Shield,
  MapPin,
  Code,
  Brain,
  PenLine,
  ChevronDown,
  ChevronRight,
  Menu,
  Zap,
  Clock,
  CheckSquare,
  BarChart3,
  GitBranch,
  Layers,
  AlertCircle,
  Lock,
  Rocket,
  Users2,
  FileCheck,
  History,
  FileSearch
} from 'lucide-react'

// Navigation sections configuration
const NAV_SECTIONS = [
  {
    id: 'overview',
    label: 'Overview',
    defaultOpen: true,
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'SEO health & metrics' },
      { id: 'alerts', label: 'Alerts', icon: Bell, badge: 'alerts', description: 'Issues needing attention' },
      { id: 'history', label: 'History', icon: History, description: 'Change timeline' },
    ]
  },
  {
    id: 'content',
    label: 'Content & Pages',
    defaultOpen: true,
    items: [
      { id: 'pages', label: 'Pages', icon: FileText, description: 'All indexed pages' },
      { id: 'keywords', label: 'Keywords', icon: Target, description: 'Keyword rankings' },
      { id: 'opportunities', label: 'Opportunities', icon: Sparkles, description: 'Quick wins' },
      { id: 'content-decay', label: 'Content Decay', icon: TrendingDown, description: 'Aging content' },
    ]
  },
  {
    id: 'technical',
    label: 'Technical',
    defaultOpen: false,
    items: [
      { id: 'technical', label: 'Audit', icon: Shield, description: 'Technical issues' },
      { id: 'indexing', label: 'Indexing', icon: FileSearch, description: 'GSC index status' },
      { id: 'internal-links', label: 'Internal Links', icon: Link2, description: 'Link structure' },
      { id: 'schema', label: 'Schema', icon: Code, description: 'Structured data' },
      { id: 'backlinks', label: 'Backlinks', icon: GitBranch, description: 'External links' },
    ]
  },
  {
    id: 'local',
    label: 'Local & Competitors',
    defaultOpen: false,
    items: [
      { id: 'local-seo', label: 'Local SEO', icon: MapPin, description: 'Local visibility' },
      { id: 'competitors', label: 'Competitors', icon: Users, description: 'Competitor tracking' },
    ]
  },
  {
    id: 'ai',
    label: 'AI Tools',
    signal: true, // Requires Signal
    defaultOpen: true,
    items: [
      { id: 'ai-insights', label: 'AI Brain', icon: Brain, signal: true, description: 'AI-powered analysis' },
      { id: 'blog-brain', label: 'Blog Brain', icon: PenLine, signal: true, description: 'Content generation' },
      { id: 'content-briefs', label: 'Content Briefs', icon: FileCheck, signal: true, description: 'Writing briefs' },
    ]
  },
  {
    id: 'automation',
    label: 'Automation',
    signal: true,
    defaultOpen: false,
    items: [
      { id: 'sprints', label: 'Sprints', icon: Rocket, signal: true, description: 'Weekly SEO goals' },
      { id: 'autopilot', label: 'Autopilot', icon: Zap, signal: true, description: 'Auto-optimization' },
      { id: 'collaboration', label: 'Team', icon: Users2, signal: true, description: 'Tasks & approvals' },
    ]
  }
]

function NavItem({ item, isActive, onClick, isCollapsed, hasSignal, alertCount }) {
  const isLocked = item.signal && !hasSignal

  const content = (
    <button
      onClick={() => !isLocked && onClick(item.id)}
      disabled={isLocked}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
        isActive 
          ? "bg-primary/10 text-primary font-medium" 
          : "hover:bg-muted text-foreground",
        isLocked && "opacity-50 cursor-not-allowed"
      )}
    >
      <item.icon className={cn(
        "h-4 w-4 flex-shrink-0",
        isActive && "text-primary"
      )} />
      
      {!isCollapsed && (
        <>
          <span className="flex-1 text-left truncate">{item.label}</span>
          
          {/* Alert badge */}
          {item.badge === 'alerts' && alertCount > 0 && (
            <Badge 
              variant="destructive" 
              className="h-5 min-w-5 px-1.5 flex items-center justify-center text-xs"
            >
              {alertCount > 99 ? '99+' : alertCount}
            </Badge>
          )}
          
          {/* Signal lock indicator */}
          {isLocked && (
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </>
      )}
    </button>
  )

  if (isCollapsed) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            <span>{item.label}</span>
            {isLocked && <Lock className="h-3 w-3" />}
            {item.badge === 'alerts' && alertCount > 0 && (
              <Badge variant="destructive" className="h-5">
                {alertCount}
              </Badge>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return content
}

function NavSection({ section, activeTab, onTabChange, isCollapsed, hasSignal, alertCount, openSections, onToggleSection }) {
  const isOpen = openSections[section.id]
  const isLocked = section.signal && !hasSignal
  const hasActiveItem = section.items.some(item => item.id === activeTab)

  // In collapsed mode, show items directly without section headers
  if (isCollapsed) {
    return (
      <div className="space-y-1">
        {section.items.map(item => (
          <NavItem
            key={item.id}
            item={item}
            isActive={activeTab === item.id}
            onClick={onTabChange}
            isCollapsed={isCollapsed}
            hasSignal={hasSignal}
            alertCount={item.badge === 'alerts' ? alertCount : 0}
          />
        ))}
      </div>
    )
  }

  return (
    <Collapsible 
      open={isOpen} 
      onOpenChange={() => onToggleSection(section.id)}
      className="space-y-1"
    >
      <CollapsibleTrigger asChild>
        <button className={cn(
          "w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider",
          "text-muted-foreground hover:text-foreground transition-colors",
          hasActiveItem && "text-foreground"
        )}>
          {isOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <span className="flex-1 text-left">{section.label}</span>
          {isLocked && (
            <div className="flex items-center gap-1 text-[10px] font-medium text-violet-500 bg-violet-500/10 px-1.5 py-0.5 rounded">
              <Sparkles className="h-2.5 w-2.5" />
              Signal
            </div>
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-0.5 pl-2">
        {section.items.map(item => (
          <NavItem
            key={item.id}
            item={item}
            isActive={activeTab === item.id}
            onClick={onTabChange}
            isCollapsed={false}
            hasSignal={hasSignal}
            alertCount={item.badge === 'alerts' ? alertCount : 0}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

// Desktop sidebar component
function DesktopSidebar({ activeTab, onTabChange, alertCount, isCollapsed, onToggleCollapse, embedded }) {
  const { hasAccess: hasSignalAccess } = useSignalAccess()
  
  // Track which sections are open
  const [openSections, setOpenSections] = useState(() => {
    const initial = {}
    NAV_SECTIONS.forEach(section => {
      initial[section.id] = section.defaultOpen
    })
    return initial
  })

  const toggleSection = (sectionId) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  // Embedded mode - used inside SEOModule with motion animation
  if (embedded) {
    return (
      <ScrollArea className="h-full">
        <div className="px-2 py-3">
          <nav className="space-y-4">
            {NAV_SECTIONS.map(section => (
              <NavSection
                key={section.id}
                section={section}
                activeTab={activeTab}
                onTabChange={onTabChange}
                isCollapsed={false}
                hasSignal={hasSignalAccess}
                alertCount={alertCount}
                openSections={openSections}
                onToggleSection={toggleSection}
              />
            ))}
          </nav>
          
          {/* Signal upgrade prompt */}
          {!hasSignalAccess && (
            <div className="mt-6 p-3 rounded-lg bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                <span className="text-xs font-semibold text-violet-500">Upgrade to Signal</span>
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">
                Unlock AI-powered SEO automation
              </p>
              <Button size="sm" variant="outline" className="w-full h-7 text-xs border-violet-500/30 text-violet-500 hover:bg-violet-500/10">
                Learn More
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    )
  }

  return (
    <div 
      className={cn(
        "h-full flex flex-col border-r border-border/50",
        "bg-muted/30",
        "transition-all duration-300",
        isCollapsed ? "w-16" : "w-56"
      )}
    >
      {/* Collapse toggle */}
      <div className="p-2 border-b border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="w-full justify-center"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="space-y-4">
          {NAV_SECTIONS.map(section => (
            <NavSection
              key={section.id}
              section={section}
              activeTab={activeTab}
              onTabChange={onTabChange}
              isCollapsed={isCollapsed}
              hasSignal={hasSignalAccess}
              alertCount={alertCount}
              openSections={openSections}
              onToggleSection={toggleSection}
            />
          ))}
        </nav>
      </ScrollArea>

      {/* Signal upgrade prompt (when collapsed) */}
      {!hasSignalAccess && !isCollapsed && (
        <div className="p-3 border-t border-border/50">
          <div className="p-3 rounded-lg bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-violet-500" />
              <span className="text-xs font-semibold text-violet-500">Upgrade to Signal</span>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2">
              Unlock AI-powered SEO automation
            </p>
            <Button size="sm" variant="outline" className="w-full h-7 text-xs border-violet-500/30 text-violet-500 hover:bg-violet-500/10">
              Learn More
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Mobile sidebar (drawer)
function MobileSidebar({ activeTab, onTabChange, alertCount }) {
  const [open, setOpen] = useState(false)
  const { hasAccess: hasSignalAccess } = useSignalAccess()
  
  const [openSections, setOpenSections] = useState(() => {
    const initial = {}
    NAV_SECTIONS.forEach(section => {
      initial[section.id] = section.defaultOpen
    })
    return initial
  })

  const toggleSection = (sectionId) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  const handleTabChange = (tabId) => {
    onTabChange(tabId)
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-border/50">
            <h2 className="font-semibold">SEO Navigation</h2>
          </div>
          <ScrollArea className="flex-1 px-2 py-3">
            <nav className="space-y-4">
              {NAV_SECTIONS.map(section => (
                <NavSection
                  key={section.id}
                  section={section}
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                  isCollapsed={false}
                  hasSignal={hasSignalAccess}
                  alertCount={alertCount}
                  openSections={openSections}
                  onToggleSection={toggleSection}
                />
              ))}
            </nav>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Main exported component
export default function SEOSidebar({ 
  activeTab, 
  onTabChange, 
  alertCount = 0,
  isMobileOnly = false,
  embedded = false,
  className 
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  // If mobile-only mode, just return the mobile sidebar trigger
  if (isMobileOnly) {
    return (
      <MobileSidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        alertCount={alertCount}
      />
    )
  }

  return (
    <DesktopSidebar
      activeTab={activeTab}
      onTabChange={onTabChange}
      alertCount={alertCount}
      isCollapsed={isCollapsed}
      onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      embedded={embedded}
    />
  )
}

// Export config for use elsewhere
export { NAV_SECTIONS }
