/**
 * ProjectsV2 - Full-Screen Projects Module (Sync-inspired 3-column layout)
 * 
 * Layout per design doc:
 * - LEFT SIDEBAR (240px): Task navigation, views, filters, quick stats
 * - CENTER: Main content with tabs (Overview, Tasks, Creative, Connections, Settings)
 * - RIGHT SIDEBAR (280px): Org/Project navigator with project tiles
 * 
 * Features:
 * - Collapsible sidebars with smooth animations
 * - Admin: All orgs/projects via adminApi.listTenants()
 * - Org-level: Project tiles for all org projects
 * - Standard: Personal tasks view
 */
import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, Settings, RefreshCw, Search, ChevronLeft, ChevronRight,
  LayoutDashboard, ListTodo, Palette, Link2, Settings2,
  Building2, ChevronDown, FolderKanban, Star, MoreVertical,
  PanelLeftClose, PanelRightClose, Eye, EyeOff, Users, Camera,
  Check, ExternalLink, Globe, Globe2, Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// UI Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Local Components
import { UptradeTaskNavigation, UserTaskNavigation } from './TaskNavigation'
import UptradeTasksPanel from './UptradeTasksPanel'
import UserTasksPanel from './UserTasksPanel'
import { TaskDetailDrawer } from './TaskDetailDrawer'
import { DeliverablesPanel } from './DeliverablesPanel'
import { DeliverableDetailDrawer } from './DeliverableDetailDrawer'
import ProjectOverviewPanel from './ProjectOverviewPanel'
import ProjectSettingsPanel from './ProjectSettingsPanel'
import ConnectionWizard from './ConnectionWizard'
import OrgSettingsModal from './OrgSettingsModal'
import NewProjectModal from './NewProjectModal'
import SiteNavigation from './site/SiteNavigation'
import SiteManagementPanel from './site/SiteManagementPanel'
import { useSiteManagementStore, SITE_VIEWS } from '@/lib/site-management-store'

// Stores & API
import useAuthStore from '@/lib/auth-store'
import useProjectsStore from '@/lib/projects-store'
import { adminApi, portalApi } from '@/lib/portal-api'
import {
  useUptradeTasksStore,
  useUserTasksStore,
  useDeliverablesStore,
} from '@/lib/projects-v2-store'

// Constants
const UPTRADE_ORG_SLUGS = ['uptrade-media']
const UPTRADE_ORG_TYPES = ['agency']

// Screenshot service - using our own Portal API
// Returns API URL for fetching screenshot metadata
function getScreenshotApiUrl(domain, width = 280, height = 180) {
  if (!domain) return null
  // Clean domain
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  // Use Portal API screenshot endpoint
  const apiUrl = import.meta.env.VITE_PORTAL_API_URL || 'https://api.uptrademedia.com'
  return `${apiUrl}/screenshots?domain=${encodeURIComponent(cleanDomain)}&width=${width}&height=${height}`
}

// Custom hook to fetch screenshot URL from our API
function useScreenshotUrl(domain, width = 280, height = 180) {
  const [url, setUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchScreenshot = useCallback((force = false) => {
    if (!domain) {
      setUrl(null)
      return
    }

    // Clean domain
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
    const apiUrl = import.meta.env.VITE_PORTAL_API_URL || 'https://api.uptrademedia.com'
    const fullUrl = `${apiUrl}/screenshots?domain=${encodeURIComponent(cleanDomain)}&width=${width}&height=${height}${force ? '&force=true' : ''}`

    setLoading(true)
    setError(false)

    fetch(fullUrl)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.url) {
          // Add cache buster for force refresh
          setUrl(force ? `${data.url}?t=${Date.now()}` : data.url)
        } else {
          setError(true)
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [domain, width, height])

  useEffect(() => {
    fetchScreenshot(false)
  }, [domain, width, height, refreshKey])

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
    fetchScreenshot(true)
  }, [fetchScreenshot])

  return { url, loading, error, refresh }
}

// View determination helper
function getProjectsView(user, currentOrg) {
  if (user?.role === 'admin' || user?.isSuperAdmin) {
    return 'uptrade-admin'
  }
  if (
    UPTRADE_ORG_SLUGS.includes(currentOrg?.slug) ||
    UPTRADE_ORG_TYPES.includes(currentOrg?.org_type)
  ) {
    return 'uptrade-admin'
  }
  if (user?.accessLevel === 'org' || user?.role === 'org_admin') {
    return 'org-level'
  }
  return 'standard'
}

// ============================================================================
// PROJECT TILE COMPONENT (for right sidebar)
// ============================================================================
function ProjectTile({ 
  project, 
  isActive, 
  isFavorite, 
  onSelect, 
  onToggleFavorite,
  onOpenSettings,
  compact = false 
}) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Use hook to fetch screenshot URL from our API (desktop viewport: 1280x800)
  const { url: screenshotUrl, loading: screenshotLoading, error: screenshotError, refresh: refreshScreenshot } = useScreenshotUrl(project.domain, 1280, 800)
  
  const handleRefreshScreenshot = async (e) => {
    e.stopPropagation()
    setIsRefreshing(true)
    setImageLoaded(false)
    refreshScreenshot()
    // Give visual feedback
    setTimeout(() => setIsRefreshing(false), 2000)
    toast.success('Refreshing screenshot...')
  }
  
  // Brand colors for gradient accent bar
  const brandPrimary = project.brand_primary || project.theme_color || '#4bbf39'
  const brandSecondary = project.brand_secondary || brandPrimary

  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-card overflow-hidden cursor-pointer transition-all",
        "hover:shadow-md hover:border-primary/30",
        isActive && "ring-2 ring-primary border-primary"
      )}
      onClick={() => onSelect(project)}
    >
      {/* Screenshot Preview - Taller for better website preview */}
      <div className="relative h-32 bg-muted overflow-hidden">
        {screenshotUrl && !screenshotError ? (
          <>
            {(!imageLoaded || screenshotLoading) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            <img
              src={screenshotUrl}
              alt={project.title}
              className={cn(
                "w-full h-full object-cover object-top transition-opacity",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => setImageLoaded(true)}
              onError={() => {}} // Error handled by hook
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <Globe className="h-8 w-8 text-muted-foreground/50" />
          </div>
        )}
        
        {/* Brand color gradient accent bar */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-1"
          style={{ background: `linear-gradient(90deg, ${brandPrimary} 0%, ${brandSecondary} 100%)` }}
        />
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        
        {/* Favorite button */}
        <button
          className={cn(
            "absolute top-2 right-2 p-1.5 rounded-full transition-all",
            "bg-black/20 hover:bg-black/40 backdrop-blur-sm",
            isFavorite && "bg-yellow-500/80 hover:bg-yellow-500"
          )}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite(project.id)
          }}
        >
          <Star className={cn(
            "h-3.5 w-3.5",
            isFavorite ? "fill-white text-white" : "text-white"
          )} />
        </button>
      </div>
      
      {/* Project Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{project.title}</h4>
            {project.domain && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {project.domain}
              </p>
            )}
          </div>
          
          {/* Settings menu */}
          {onOpenSettings && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation()
                  onOpenSettings(project)
                }}>
                  <Settings className="h-4 w-4 mr-2" />
                  Project Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation()
                  if (project.domain) {
                    window.open(`https://${project.domain}`, '_blank')
                  }
                }}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Visit Website
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleRefreshScreenshot}
                  disabled={isRefreshing || !project.domain}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {isRefreshing ? 'Refreshing...' : 'Refresh Screenshot'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        {/* Status indicator */}
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
            {project.status || 'Active'}
          </Badge>
          {isActive && (
            <Badge variant="default" className="h-5 text-[10px] px-1.5">
              <Check className="h-2.5 w-2.5 mr-0.5" />
              Selected
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ProjectsV2({ onNavigate }) {
  const { user, currentOrg, currentProject, isSuperAdmin } = useAuthStore()
  
  // Determine view type
  const viewType = useMemo(() => getProjectsView(user, currentOrg), [user, currentOrg])
  
  // Projects store (for non-admin views)
  const { 
    projects: storeProjects, 
    isLoading: projectsLoading,
    fetchProjects,
  } = useProjectsStore()

  // Admin data (all orgs and projects)
  const [adminOrgs, setAdminOrgs] = useState([])
  const [adminProjects, setAdminProjects] = useState([])
  const [adminLoading, setAdminLoading] = useState(false)

  // Task stores
  const uptradeTasksStore = useUptradeTasksStore()
  const userTasksStore = useUserTasksStore()
  const deliverablesStore = useDeliverablesStore()
  
  // Site management store
  const siteManagementStore = useSiteManagementStore()

  // UI State
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [taskViewMode, setTaskViewMode] = useState('list')
  const [selectedTask, setSelectedTask] = useState(null)
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false)
  const [selectedDeliverable, setSelectedDeliverable] = useState(null)
  const [isDeliverableDrawerOpen, setIsDeliverableDrawerOpen] = useState(false)
  const [showLeftSidebar, setShowLeftSidebar] = useState(true)
  const [showRightSidebar, setShowRightSidebar] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Auto-manage sidebars based on active tab
  useEffect(() => {
    if (activeTab === 'tasks' || activeTab === 'website') {
      setShowLeftSidebar(true)
      // On Website tab, collapse right sidebar for more space
      if (activeTab === 'website') {
        setShowRightSidebar(false)
      }
    } else {
      setShowLeftSidebar(false)
      // When leaving website or tasks view, reopen right sidebar
      setShowRightSidebar(true)
    }
  }, [activeTab])
  
  // Initialize site management store when project changes
  useEffect(() => {
    if (selectedProject?.id && activeTab === 'website') {
      siteManagementStore.setProject(selectedProject.id)
    }
  }, [selectedProject?.id, activeTab])

  // Org settings modal
  const [orgSettingsOpen, setOrgSettingsOpen] = useState(false)
  const [orgForSettings, setOrgForSettings] = useState(null)

  // New project modal
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [newProjectOrgId, setNewProjectOrgId] = useState(null)

  // Task navigation state
  const [activeTaskView, setActiveTaskView] = useState('all')
  const [activeTaskStatus, setActiveTaskStatus] = useState(null)
  const [activeTaskModule, setActiveTaskModule] = useState(null)
  const [activeUserCategory, setActiveUserCategory] = useState(null)

  // Expanded orgs in right sidebar
  const [expandedOrgs, setExpandedOrgs] = useState(new Set())

  // Favorites (stored in localStorage for persistence)
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('project-favorites') || '[]')
    } catch {
      return []
    }
  })

  // Team members for task assignment
  const [teamMembers, setTeamMembers] = useState([])

  // Fetch full project details
  const fetchProjectDetails = useCallback(async (projectId) => {
    try {
      const response = await portalApi.get(`/projects/${projectId}`)
      return response.data
    } catch (error) {
      console.error('Failed to fetch project details:', error)
      toast.error('Failed to load project details')
      return null
    }
  }, [])

  // Handle project selection - fetch full details
  const handleSelectProject = useCallback(async (project) => {
    if (!project) {
      setSelectedProject(null)
      return
    }
    
    // Fetch full project details including logo_url and settings
    const fullProject = await fetchProjectDetails(project.id)
    if (fullProject) {
      setSelectedProject(fullProject)
    } else {
      // Fallback to basic project data if fetch fails
      setSelectedProject(project)
    }
  }, [fetchProjectDetails])

  // Load admin data (all orgs and projects)
  const loadAdminData = useCallback(async () => {
    if (viewType !== 'uptrade-admin') return
    
    setAdminLoading(true)
    try {
      const response = await adminApi.listTenants()
      // Response is { organizations: [{ ...org, projects: [...] }], total: number }
      const payload = response?.data || response
      
      // The admin API returns organizations with nested projects arrays
      const orgsWithProjects = payload.organizations || payload.tenants || []
      
      // Extract orgs (without the nested projects array)
      const orgs = orgsWithProjects.map(({ projects, ...org }) => org)
      
      // Flatten all projects from all orgs
      const projects = orgsWithProjects.flatMap(org => 
        (org.projects || []).map(project => ({
          ...project,
          title: project.title || project.name,
          org_id: project.org_id || org.id, // Ensure org_id is set
        }))
      )
      
      setAdminOrgs(orgs)
      setAdminProjects(projects)
      
      // Auto-expand first org if none selected
      if (orgs.length > 0 && expandedOrgs.size === 0) {
        setExpandedOrgs(new Set([orgs[0].id]))
      }
    } catch (error) {
      console.error('Failed to load admin data:', error)
      toast.error('Failed to load organizations')
    } finally {
      setAdminLoading(false)
    }
  }, [viewType])

  // Initialize
  useEffect(() => {
    if (viewType === 'uptrade-admin') {
      loadAdminData()
    } else {
      fetchProjects()
    }
    
    // Load user task categories for non-admin
    if (viewType !== 'uptrade-admin') {
      userTasksStore.fetchCategories()
    }
  }, [viewType, loadAdminData, fetchProjects])

  // Get effective projects list
  const projects = useMemo(() => {
    if (viewType === 'uptrade-admin') {
      return adminProjects
    }
    return storeProjects
  }, [viewType, adminProjects, storeProjects])

  // Get effective organizations
  const organizations = useMemo(() => {
    if (viewType === 'uptrade-admin') {
      return adminOrgs
    }
    // For org-level users, create a single org entry from currentOrg
    if (currentOrg) {
      return [{
        id: currentOrg.id,
        name: currentOrg.name,
        slug: currentOrg.slug,
      }]
    }
    return []
  }, [viewType, adminOrgs, currentOrg])

  // Projects grouped by org
  const projectsByOrg = useMemo(() => {
    const grouped = {}
    projects.forEach(project => {
      const orgId = project.org_id || 'unassigned'
      if (!grouped[orgId]) {
        grouped[orgId] = []
      }
      grouped[orgId].push(project)
    })
    return grouped
  }, [projects])

  // Filtered data based on search
  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) {
      return { organizations, projectsByOrg }
    }
    
    // Filter orgs and projects
    const matchingProjectOrgIds = new Set()
    const filteredProjects = {}
    
    Object.entries(projectsByOrg).forEach(([orgId, orgProjects]) => {
      const matches = orgProjects.filter(p => 
        p.title?.toLowerCase().includes(query) ||
        p.domain?.toLowerCase().includes(query)
      )
      if (matches.length > 0) {
        filteredProjects[orgId] = matches
        matchingProjectOrgIds.add(orgId)
      }
    })
    
    const filteredOrgs = organizations.filter(org => 
      org.name?.toLowerCase().includes(query) ||
      matchingProjectOrgIds.has(org.id)
    )
    
    return {
      organizations: filteredOrgs,
      projectsByOrg: filteredProjects,
    }
  }, [organizations, projectsByOrg, searchQuery])

  // Load data when project changes
  useEffect(() => {
    if (!selectedProject?.id) return

    if (viewType === 'uptrade-admin') {
      uptradeTasksStore.fetchTasks(selectedProject.id)
      uptradeTasksStore.fetchStats(selectedProject.id)
      deliverablesStore.fetchDeliverables(selectedProject.id)
      deliverablesStore.fetchStats(selectedProject.id)
    }

    deliverablesStore.fetchPendingApprovals(selectedProject.id)
  }, [selectedProject?.id, viewType])

  // Load user tasks for non-admin views
  useEffect(() => {
    if (viewType !== 'uptrade-admin') {
      userTasksStore.fetchTasks()
      userTasksStore.fetchStats()
    }
  }, [viewType])

  // Toggle favorite
  const handleToggleFavorite = useCallback((projectId) => {
    setFavorites(prev => {
      const next = prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
      localStorage.setItem('project-favorites', JSON.stringify(next))
      return next
    })
  }, [])

  // Toggle org expansion
  const toggleOrg = useCallback((orgId) => {
    setExpandedOrgs(prev => {
      const next = new Set(prev)
      if (next.has(orgId)) {
        next.delete(orgId)
      } else {
        next.add(orgId)
      }
      return next
    })
  }, [])

  // Open org settings
  const handleOpenOrgSettings = useCallback((org) => {
    setOrgForSettings(org)
    setOrgSettingsOpen(true)
  }, [])

  // Task handlers
  const handleTaskCreate = useCallback(async (data) => {
    if (!selectedProject?.id) return
    await uptradeTasksStore.createTask(selectedProject.id, data)
    uptradeTasksStore.fetchStats(selectedProject.id)
  }, [selectedProject?.id])

  const handleTaskUpdate = useCallback(async (taskId, data) => {
    if (!selectedProject?.id) return
    await uptradeTasksStore.updateTask(selectedProject.id, taskId, data)
  }, [selectedProject?.id])

  const handleTaskComplete = useCallback(async (taskId) => {
    if (!selectedProject?.id) return
    await uptradeTasksStore.completeTask(selectedProject.id, taskId)
    uptradeTasksStore.fetchStats(selectedProject.id)
    toast.success('Task completed!')
  }, [selectedProject?.id])

  const handleTaskDelete = useCallback(async (taskId) => {
    if (!selectedProject?.id) return
    await uptradeTasksStore.deleteTask(selectedProject.id, taskId)
    uptradeTasksStore.fetchStats(selectedProject.id)
    toast.success('Task deleted')
  }, [selectedProject?.id])

  const handleTaskSelect = useCallback((task) => {
    setSelectedTask(task)
    setIsTaskDrawerOpen(true)
  }, [])

  const handleTaskSave = useCallback(async (data) => {
    if (!selectedProject?.id) return
    if (selectedTask?.id) {
      await handleTaskUpdate(selectedTask.id, data)
    } else {
      await handleTaskCreate(data)
    }
  }, [selectedProject?.id, selectedTask?.id, handleTaskCreate, handleTaskUpdate])

  // Checklist handlers
  const handleAddChecklistItem = useCallback(async (taskId, title) => {
    if (!selectedProject?.id) return
    await uptradeTasksStore.addChecklistItem(selectedProject.id, taskId, title)
  }, [selectedProject?.id])

  const handleToggleChecklistItem = useCallback(async (taskId, itemId) => {
    if (!selectedProject?.id) return
    await uptradeTasksStore.toggleChecklistItem(selectedProject.id, taskId, itemId)
  }, [selectedProject?.id])

  const handleRemoveChecklistItem = useCallback(async (taskId, itemId) => {
    if (!selectedProject?.id) return
    await uptradeTasksStore.removeChecklistItem(selectedProject.id, taskId, itemId)
  }, [selectedProject?.id])

  // Deliverable handlers
  const handleDeliverableCreate = useCallback(async (data) => {
    if (!selectedProject?.id) return
    await deliverablesStore.createDeliverable(selectedProject.id, data)
  }, [selectedProject?.id])

  const handleDeliverableSelect = useCallback((deliverable) => {
    setSelectedDeliverable(deliverable)
    setIsDeliverableDrawerOpen(true)
  }, [])

  const handleDeliverableDelete = useCallback(async (deliverableId) => {
    if (!selectedProject?.id) return
    await deliverablesStore.deleteDeliverable(selectedProject.id, deliverableId)
    toast.success('Deliverable deleted')
  }, [selectedProject?.id])

  const handleSubmitForReview = useCallback(async (deliverableId) => {
    if (!selectedProject?.id) return
    await deliverablesStore.submitForReview(selectedProject.id, deliverableId)
    toast.success('Submitted for review')
  }, [selectedProject?.id])

  const handleApprove = useCallback(async (deliverableId, message) => {
    if (!selectedProject?.id) return
    await deliverablesStore.approve(selectedProject.id, deliverableId, message)
  }, [selectedProject?.id])

  const handleRequestChanges = useCallback(async (deliverableId, feedback) => {
    if (!selectedProject?.id) return
    await deliverablesStore.requestChanges(selectedProject.id, deliverableId, feedback)
  }, [selectedProject?.id])

  const handleDeliver = useCallback(async (deliverableId) => {
    if (!selectedProject?.id) return
    await deliverablesStore.deliver(selectedProject.id, deliverableId)
    toast.success('Delivered to client')
  }, [selectedProject?.id])

  // Loading state
  const isLoading = viewType === 'uptrade-admin' ? adminLoading : projectsLoading

  if (isLoading && projects.length === 0) {
    return (
      <div className="h-full flex">
        <div className="w-60 border-r p-4 space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-[400px] w-full" />
        </div>
        <div className="w-72 border-l p-4 space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="h-full w-full flex flex-col bg-background overflow-hidden">
        {/* ===== TOP HEADER BAR ===== */}
        <div className="flex-shrink-0 h-14 border-b flex items-center justify-between px-4 bg-card/50">
          {/* Left: Toggle + Title */}
          <div className="flex items-center gap-3">
            {/* Toggle Left Sidebar */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={() => setShowLeftSidebar(!showLeftSidebar)}
                >
                  <PanelLeftClose className={cn("h-4 w-4 transition-transform", !showLeftSidebar && "rotate-180")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showLeftSidebar ? 'Hide sidebar' : 'Show sidebar'}</TooltipContent>
            </Tooltip>
            
            {/* Logo + Title */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                <FolderKanban className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-lg hidden lg:inline">Projects</span>
            </div>
            
            {/* Selected project indicator */}
            {selectedProject && (
              <div className="flex items-center gap-2 ml-2 px-3 py-1 bg-primary/10 rounded-md">
                <div 
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: selectedProject.brand_primary || selectedProject.theme_color || '#4bbf39' }}
                />
                <span className="font-medium text-sm">{selectedProject.title}</span>
              </div>
            )}
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Refresh */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => viewType === 'uptrade-admin' ? loadAdminData() : fetchProjects()}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1.5", isLoading && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            
            {/* New Task (admin) */}
            {viewType === 'uptrade-admin' && selectedProject && (
              <Button size="sm" onClick={() => handleTaskSelect(null)}>
                <Plus className="h-4 w-4 mr-1.5" />
                New Task
              </Button>
            )}
            
            {/* Toggle Right Sidebar */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={() => setShowRightSidebar(!showRightSidebar)}
                >
                  <PanelRightClose className={cn("h-4 w-4 transition-transform", !showRightSidebar && "rotate-180")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showRightSidebar ? 'Hide sidebar' : 'Show sidebar'}</TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        {/* ===== MAIN CONTENT AREA (3-column) ===== */}
        <div className="flex-1 flex overflow-hidden min-w-0">
          
          {/* ===== LEFT SIDEBAR: Task Navigation / Site Navigation ===== */}
          <AnimatePresence>
            {showLeftSidebar && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="border-r overflow-hidden bg-muted/30"
                style={{ flexShrink: 0, width: 240 }}
              >
                <ScrollArea className="h-full">
                  {activeTab === 'website' ? (
                    // Site Navigation for Website tab
                    <SiteNavigation
                      activeView={siteManagementStore.activeView}
                      stats={siteManagementStore.stats}
                      onViewChange={(view) => siteManagementStore.setActiveView(view)}
                      onRefresh={() => {
                        siteManagementStore.fetchStats()
                        siteManagementStore.fetchActiveViewData()
                      }}
                      isRefreshing={siteManagementStore.loadingView !== null}
                    />
                  ) : (
                  <div className="p-4 space-y-4">
                    {/* Task Navigation */}
                    {viewType === 'uptrade-admin' ? (
                      <UptradeTaskNavigation
                        stats={uptradeTasksStore.stats}
                        activeView={activeTaskView}
                        activeStatus={activeTaskStatus}
                        activeModule={activeTaskModule}
                        enabledModules={selectedProject?.features || []}
                        onViewChange={(view) => {
                          setActiveTaskView(view)
                          setActiveTaskStatus(null)
                          setActiveTaskModule(null)
                          // Auto-switch to tasks tab when clicking nav item
                          if (activeTab !== 'tasks') {
                            setActiveTab('tasks')
                          }
                        }}
                        onStatusChange={(status) => {
                          setActiveTaskStatus(status === activeTaskStatus ? null : status)
                          setActiveTaskView('all')
                          setActiveTaskModule(null)
                          // Auto-switch to tasks tab when clicking nav item
                          if (activeTab !== 'tasks') {
                            setActiveTab('tasks')
                          }
                        }}
                        onModuleChange={(module) => {
                          setActiveTaskModule(module === activeTaskModule ? null : module)
                          setActiveTaskView('all')
                          setActiveTaskStatus(null)
                          // Auto-switch to tasks tab when clicking nav item
                          if (activeTab !== 'tasks') {
                            setActiveTab('tasks')
                          }
                        }}
                      />
                    ) : (
                      <UserTaskNavigation
                        stats={userTasksStore.stats}
                        categories={userTasksStore.categories}
                        activeView={activeTaskView}
                        activeCategory={activeUserCategory}
                        onViewChange={(view) => {
                          setActiveTaskView(view)
                          setActiveUserCategory(null)
                        }}
                        onCategoryChange={(categoryId) => {
                          setActiveUserCategory(categoryId === activeUserCategory ? null : categoryId)
                          setActiveTaskView('all')
                        }}
                        onAddCategory={() => {}}
                      />
                    )}
                    
                    <Separator />
                    
                    {/* Quick Stats */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Quick Stats
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 rounded-md bg-background border">
                          <p className="text-xs text-muted-foreground">Due Today</p>
                          <p className="text-lg font-semibold">
                            {(viewType === 'uptrade-admin' ? uptradeTasksStore.stats : userTasksStore.stats)?.dueToday || 0}
                          </p>
                        </div>
                        <div className="p-2 rounded-md bg-background border">
                          <p className="text-xs text-muted-foreground">Overdue</p>
                          <p className="text-lg font-semibold text-destructive">
                            {(viewType === 'uptrade-admin' ? uptradeTasksStore.stats : userTasksStore.stats)?.overdue || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  )}
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* ===== CENTER: Main Content with Tabs ===== */}
          <div className="flex-1 overflow-hidden flex flex-col" style={{ minWidth: 0 }}>
            {/* Tabs Header */}
            <div className="border-b shrink-0 bg-background/50">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="h-11 px-4 bg-transparent">
                  <TabsTrigger value="overview" className="gap-1.5">
                    <LayoutDashboard className="h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="gap-1.5">
                    <ListTodo className="h-4 w-4" />
                    {viewType === 'uptrade-admin' ? 'Tasks' : 'My Tasks'}
                  </TabsTrigger>
                  <TabsTrigger value="creative" className="gap-1.5">
                    <Palette className="h-4 w-4" />
                    Creative
                  </TabsTrigger>
                  {viewType !== 'standard' && (
                    <TabsTrigger value="connections" className="gap-1.5">
                      <Link2 className="h-4 w-4" />
                      Connections
                    </TabsTrigger>
                  )}
                  {viewType === 'uptrade-admin' && selectedProject?.domain && (
                    <TabsTrigger value="website" className="gap-1.5">
                      <Globe2 className="h-4 w-4" />
                      Website
                    </TabsTrigger>
                  )}
                  {viewType === 'uptrade-admin' && selectedProject && (
                    <TabsTrigger value="settings" className="gap-1.5">
                      <Settings2 className="h-4 w-4" />
                      Settings
                    </TabsTrigger>
                  )}
                </TabsList>
              </Tabs>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              <Tabs value={activeTab} className="h-full">
                <TabsContent value="overview" className="h-full m-0">
                  {selectedProject ? (
                    <ProjectOverviewPanel 
                      project={selectedProject}
                      isAdmin={viewType === 'uptrade-admin'}
                      onNavigateToTasks={() => setActiveTab('tasks')}
                      onNavigateToCreative={() => setActiveTab('creative')}
                      onNavigateToConnections={() => setActiveTab('connections')}
                      onViewDeliverable={(d) => handleDeliverableSelect(d)}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">Select a Project</p>
                        <p className="text-sm">Choose a project from the right sidebar to view details</p>
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="tasks" className="h-full m-0">
                  {viewType === 'uptrade-admin' ? (
                    selectedProject ? (
                      <UptradeTasksPanel
                        tasks={uptradeTasksStore.tasks}
                        teamMembers={teamMembers}
                        projectId={selectedProject.id}
                        viewMode={taskViewMode}
                        onViewModeChange={setTaskViewMode}
                        onTaskCreate={handleTaskCreate}
                        onTaskUpdate={handleTaskUpdate}
                        onTaskComplete={handleTaskComplete}
                        onTaskDelete={handleTaskDelete}
                        onTaskSelect={handleTaskSelect}
                        isLoading={uptradeTasksStore.isLoading}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <p>Select a project to view tasks</p>
                      </div>
                    )
                  ) : (
                    <UserTasksPanel
                      activeView={activeTaskView}
                      activeCategoryId={activeUserCategory}
                      showCompleted={false}
                    />
                  )}
                </TabsContent>
                
                <TabsContent value="creative" className="h-full m-0">
                  {selectedProject ? (
                    <DeliverablesPanel
                      deliverables={deliverablesStore.deliverables}
                      pendingApprovals={deliverablesStore.pendingApprovals}
                      stats={deliverablesStore.stats}
                      projectId={selectedProject.id}
                      isAdmin={viewType === 'uptrade-admin'}
                      onDeliverableCreate={handleDeliverableCreate}
                      onDeliverableSelect={handleDeliverableSelect}
                      onDeliverableDelete={handleDeliverableDelete}
                      onSubmitForReview={handleSubmitForReview}
                      onApprove={handleApprove}
                      onRequestChanges={handleRequestChanges}
                      onDeliver={handleDeliver}
                      isLoading={deliverablesStore.isLoading}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <p>Select a project to view deliverables</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="connections" className="h-full m-0 overflow-auto">
                  {selectedProject ? (
                    <ConnectionWizard
                      projectId={selectedProject.id}
                      connections={selectedProject.connections || []}
                      onConnectionChange={() => {
                        viewType === 'uptrade-admin' ? loadAdminData() : fetchProjects()
                      }}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <p>Select a project to manage connections</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="settings" className="h-full m-0 overflow-auto">
                  {selectedProject && (
                    <ProjectSettingsPanel
                      project={selectedProject}
                      isAdmin={viewType === 'uptrade-admin'}
                      onProjectUpdate={(updatedProject) => {
                        handleSelectProject(updatedProject)
                        viewType === 'uptrade-admin' ? loadAdminData() : fetchProjects()
                      }}
                    />
                  )}
                </TabsContent>
                
                <TabsContent value="website" className="h-full m-0 overflow-auto">
                  {selectedProject ? (
                    <SiteManagementPanel 
                      project={selectedProject}
                      activeView={siteManagementStore.activeView}
                      data={{
                        pages: siteManagementStore.pages,
                        images: siteManagementStore.images,
                        redirects: siteManagementStore.redirects,
                        faqs: siteManagementStore.faqs,
                        content: siteManagementStore.content,
                        links: siteManagementStore.links,
                        scripts: siteManagementStore.scripts,
                        schema: siteManagementStore.schema,
                      }}
                      isLoading={siteManagementStore.loadingView !== null}
                      onRefresh={() => siteManagementStore.fetchActiveViewData()}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Globe2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">Select a Project</p>
                        <p className="text-sm">Choose a project with a domain to manage its website</p>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
          
          {/* ===== RIGHT SIDEBAR: Org/Project Navigator ===== */}
          <AnimatePresence>
            {showRightSidebar && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 360, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="border-l bg-muted/30 h-full shrink-0 overflow-hidden"
              >
                <div className="h-full w-full flex flex-col overflow-hidden">
                  {/* Search */}
                  <div className="p-3 border-b shrink-0">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search orgs/projects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 bg-background"
                      />
                    </div>
                  </div>
                  
                <ScrollArea className="flex-1 w-full overflow-hidden">
                  <div className="p-3 space-y-3 overflow-hidden">
                    {/* Favorites Section */}
                    {favorites.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            Favorites
                          </p>
                          <div className="space-y-2">
                            {projects
                              .filter(p => favorites.includes(p.id))
                              .slice(0, 3)
                              .map((project) => (
                                <ProjectTile
                                  key={project.id}
                                  project={project}
                                  isActive={project.id === selectedProject?.id}
                                  isFavorite={true}
                                  onSelect={(p) => {
                                    handleSelectProject(p)
                                    const org = organizations.find(o => o.id === p.org_id)
                                    if (org) setSelectedOrg(org)
                                  }}
                                  onToggleFavorite={handleToggleFavorite}
                                  onOpenSettings={(p) => {
                                    handleSelectProject(p)
                                    setActiveTab('settings')
                                  }}
                                  compact
                                />
                              ))
                            }
                          </div>
                          <Separator />
                        </div>
                      )}
                      
                      {/* Organizations & Projects */}
                      {viewType === 'uptrade-admin' && (
                        <div className="space-y-2 overflow-hidden">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Organizations
                          </p>
                          
                          {filteredData.organizations.map((org) => {
                            const orgProjects = filteredData.projectsByOrg[org.id] || []
                            const isExpanded = expandedOrgs.has(org.id)

                            return (
                              <Collapsible
                                key={org.id}
                                open={isExpanded}
                                onOpenChange={() => toggleOrg(org.id)}
                                className="overflow-hidden"
                              >
                                <div className="flex items-center gap-1 min-w-0 overflow-hidden w-full pr-1">
                                  <CollapsibleTrigger asChild>
                                    <button
                                      className={cn(
                                        "flex-1 flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-muted transition-colors text-left min-w-0 overflow-hidden",
                                        selectedOrg?.id === org.id && "bg-primary/10 font-medium"
                                      )}
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                      )}
                                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                                      <span className="truncate min-w-0 flex-1">{org.name}</span>
                                      <Badge variant="secondary" className="h-5 px-1.5 text-xs shrink-0">
                                        {orgProjects.length}
                                      </Badge>
                                    </button>
                                  </CollapsibleTrigger>
                                  
                                  {/* Org settings menu */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                                        <MoreVertical className="h-3.5 w-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleOpenOrgSettings(org)}>
                                        <Settings className="h-4 w-4 mr-2" />
                                        Organization Settings
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>

                                <CollapsibleContent>
                                  <div className="pl-2 pr-2.5 pt-2 space-y-2">
                                    {orgProjects.map((project) => (
                                      <ProjectTile
                                        key={project.id}
                                        project={project}
                                        isActive={project.id === selectedProject?.id}
                                        isFavorite={favorites.includes(project.id)}
                                        onSelect={(p) => {
                                          handleSelectProject(p)
                                          setSelectedOrg(org)
                                        }}
                                        onToggleFavorite={handleToggleFavorite}
                                        onOpenSettings={(p) => {
                                          handleSelectProject(p)
                                          setActiveTab('settings')
                                        }}
                                      />
                                    ))}

                                    {orgProjects.length === 0 && (
                                      <p className="text-xs text-muted-foreground italic px-2 py-2">
                                        No projects in this organization
                                      </p>
                                    )}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            )
                          })}
                          
                          {filteredData.organizations.length === 0 && (
                            <div className="text-center py-6 text-muted-foreground">
                              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No organizations found</p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* For non-admin: Just show projects */}
                      {viewType !== 'uptrade-admin' && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Your Projects
                          </p>
                          {projects.map((project) => (
                            <ProjectTile
                              key={project.id}
                              project={project}
                              isActive={project.id === selectedProject?.id}
                              isFavorite={favorites.includes(project.id)}
                              onSelect={(p) => handleSelectProject(p)}
                              onToggleFavorite={handleToggleFavorite}
                              onOpenSettings={viewType === 'org-level' ? (p) => {
                                handleSelectProject(p)
                                setActiveTab('settings')
                              } : undefined}
                            />
                          ))}
                        </div>
                      )}
                      
                      {/* New Project Button */}
                      <Separator />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-center"
                        onClick={() => {
                          // For org-level users, preselect their org
                          if (viewType === 'org-level' && currentOrg?.id) {
                            setNewProjectOrgId(currentOrg.id)
                          } else {
                            setNewProjectOrgId(null)
                          }
                          setNewProjectOpen(true)
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        New Project
                      </Button>
                    </div>
                  </ScrollArea>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* ===== MODALS & DRAWERS ===== */}
        
        {/* Org Settings Modal */}
        <OrgSettingsModal
          organization={orgForSettings}
          open={orgSettingsOpen}
          onOpenChange={setOrgSettingsOpen}
          onSettingsSaved={() => {
            loadAdminData()
          }}
        />
        
        {/* New Project Modal */}
        <NewProjectModal
          open={newProjectOpen}
          onOpenChange={setNewProjectOpen}
          isAdmin={viewType === 'uptrade-admin'}
          preselectedOrgId={newProjectOrgId}
          onProjectCreated={(newProject) => {
            // Refresh data and select the new project
            if (viewType === 'uptrade-admin') {
              loadAdminData()
            } else {
              fetchProjects()
            }
            handleSelectProject(newProject)
            setActiveTab('overview')
          }}
        />
        
        {/* Task Detail Drawer */}
        <TaskDetailDrawer
          task={selectedTask}
          isOpen={isTaskDrawerOpen}
          onClose={() => {
            setIsTaskDrawerOpen(false)
            setSelectedTask(null)
          }}
          teamMembers={teamMembers}
          onSave={handleTaskSave}
          onComplete={handleTaskComplete}
          onDelete={(taskId) => {
            handleTaskDelete(taskId)
            setIsTaskDrawerOpen(false)
            setSelectedTask(null)
          }}
          onAddChecklistItem={handleAddChecklistItem}
          onToggleChecklistItem={handleToggleChecklistItem}
          onRemoveChecklistItem={handleRemoveChecklistItem}
          isNew={!selectedTask?.id}
          enabledModules={selectedProject?.features || []}
        />

        {/* Deliverable Detail Drawer */}
        <DeliverableDetailDrawer
          deliverable={selectedDeliverable}
          isOpen={isDeliverableDrawerOpen}
          onClose={() => {
            setIsDeliverableDrawerOpen(false)
            setSelectedDeliverable(null)
          }}
          isAdmin={viewType === 'uptrade-admin'}
          onApprove={(message) => handleApprove(selectedDeliverable?.id, message)}
          onRequestChanges={(feedback) => handleRequestChanges(selectedDeliverable?.id, feedback)}
          onDeliver={() => handleDeliver(selectedDeliverable?.id)}
          onSubmitForReview={() => handleSubmitForReview(selectedDeliverable?.id)}
          onEdit={handleDeliverableSelect}
          onDelete={handleDeliverableDelete}
        />
      </div>
    </TooltipProvider>
  )
}
