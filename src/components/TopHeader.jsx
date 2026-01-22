// src/components/TopHeader.jsx
// Supabase-style top header bar with org/project switchers, search, help, and user menu
import { useState } from 'react'
import { 
  Search, 
  HelpCircle, 
  ChevronDown, 
  Check, 
  LogOut, 
  Settings, 
  Sun, 
  Moon, 
  Monitor,
  User,
  Building2,
  FolderOpen,
  Sparkles,
  Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import ContactAvatar from '@/components/ui/ContactAvatar'
import useAuthStore from '@/lib/auth-store'
import useThemeStore from '@/lib/theme-store'
import { cn } from '@/lib/utils'

// Detect if user is on Windows
const isWindows = typeof navigator !== 'undefined' && /Win/i.test(navigator.platform)
const modKey = isWindows ? 'Ctrl' : '⌘'

// ============================================================================
// ORG SWITCHER DROPDOWN
// ============================================================================
function OrgSwitcherDropdown() {
  const { 
    currentOrg, 
    availableOrgs, 
    isSuperAdmin, 
    switchOrganization,
    fetchAllOrganizations,
    exitProjectView,
    currentProject,
    isLoading 
  } = useAuthStore()
  
  const [allOrgs, setAllOrgs] = useState([])
  const [loadingOrgs, setLoadingOrgs] = useState(false)

  const loadAllOrgs = async () => {
    if (loadingOrgs || allOrgs.length > 0) return
    setLoadingOrgs(true)
    const orgsWithProjects = await fetchAllOrganizations()
    setAllOrgs(orgsWithProjects || [])
    setLoadingOrgs(false)
  }

  const handleSwitchOrg = async (org) => {
    await switchOrganization(org.id)
  }
  
  // Handle clicking org name to go back to org dashboard
  const handleOrgClick = async () => {
    if (currentProject) {
      await exitProjectView()
    }
  }

  // Use available orgs or fetched orgs
  const orgsToShow = isSuperAdmin ? allOrgs : (availableOrgs || [])

  return (
    <div className="flex items-center gap-1">
      {/* Org name - clickable to go to org dashboard */}
      <button 
        onClick={handleOrgClick}
        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted/50 transition-colors"
        disabled={isLoading}
      >
        <span className="text-sm max-w-[150px] truncate">{currentOrg?.name || 'Select Org'}</span>
        {isSuperAdmin && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
            PRO
          </Badge>
        )}
      </button>
      
      {/* Dropdown toggle */}
      <DropdownMenu onOpenChange={(open) => open && isSuperAdmin && loadAllOrgs()}>
        <DropdownMenuTrigger asChild>
          <button 
            className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted/50 transition-colors border border-border/50"
            disabled={isLoading}
          >
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <div className="px-2 py-1.5">
            <Input 
              placeholder="Find organization..." 
              className="h-8 text-sm"
            />
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">Organizations</DropdownMenuLabel>
          {orgsToShow.length === 0 && (
            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
              {loadingOrgs ? 'Loading...' : 'No organizations'}
            </div>
          )}
          {orgsToShow.map((org) => (
            <DropdownMenuItem 
              key={org.id}
              onClick={() => handleSwitchOrg(org)}
              className="flex items-center justify-between"
            >
              <span className="truncate">{org.name}</span>
              {currentOrg?.id === org.id && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
          {isSuperAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-muted-foreground">
                <Plus className="h-4 w-4 mr-2" />
                New organization
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// ============================================================================
// PROJECT SWITCHER DROPDOWN
// ============================================================================
function ProjectSwitcherDropdown({ onNavigateToProjects }) {
  const { 
    currentProject, 
    availableProjects,
    switchProject,
    isLoading 
  } = useAuthStore()

  const handleSwitchProject = async (project) => {
    await switchProject(project.id)
  }

  // Environment badge based on project status
  const getEnvironmentBadge = (project) => {
    if (project.status === 'active') return 'PRODUCTION'
    if (project.status === 'in_progress') return 'IN PROGRESS'
    return null
  }
  
  // Don't show project switcher if no project is selected (at org level)
  if (!currentProject) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/50 transition-colors"
          disabled={isLoading}
        >
          <span className="text-sm max-w-[150px] truncate">{currentProject?.name || currentProject?.title || 'Project'}</span>
          {currentProject && getEnvironmentBadge(currentProject) && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-muted">
              {getEnvironmentBadge(currentProject)}
            </Badge>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Projects</DropdownMenuLabel>
        {(!availableProjects || availableProjects.length === 0) && (
          <div className="px-2 py-4 text-sm text-muted-foreground text-center">
            No projects available
          </div>
        )}
        {availableProjects?.map((project) => (
          <DropdownMenuItem 
            key={project.id}
            onClick={() => handleSwitchProject(project)}
            className="flex items-center justify-between"
          >
            <span className="truncate">{project.name || project.title}</span>
            {currentProject?.id === project.id && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onNavigateToProjects} className="text-muted-foreground">
          <FolderOpen className="h-4 w-4 mr-2" />
          View all projects
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ============================================================================
// USER MENU DROPDOWN
// ============================================================================
function UserMenuDropdown({ onNavigate }) {
  const { user, logout } = useAuthStore()
  const { theme, setTheme } = useThemeStore()

  const handleLogout = async () => {
    await logout()
  }

  const themeOptions = [
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'system', label: 'System', icon: Monitor },
  ]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center justify-center w-8 h-8 rounded-full overflow-hidden hover:ring-2 hover:ring-primary/20 transition-all">
          <ContactAvatar 
            contact={user}
            size="sm"
            className="w-8 h-8"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* User info */}
        <div className="px-2 py-2 border-b border-border/50">
          <p className="text-sm font-medium truncate">{user?.name || user?.email}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>

        <DropdownMenuItem onClick={() => onNavigate?.('settings')}>
          <Settings className="h-4 w-4 mr-2" />
          Account preferences
        </DropdownMenuItem>
        
        <DropdownMenuItem>
          <Sparkles className="h-4 w-4 mr-2" />
          Feature previews
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Theme selection */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          {themeOptions.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value} className="pl-8">
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ============================================================================
// PROJECT SECTION (separator + switcher)
// ============================================================================
function ProjectSection({ onNavigateToProjects }) {
  const { currentProject } = useAuthStore()
  
  // Don't show anything if no project is selected (at org level)
  if (!currentProject) {
    return null
  }
  
  return (
    <>
      {/* Separator */}
      <span className="text-muted-foreground/30 mx-1">/</span>
      {/* Project Switcher */}
      <ProjectSwitcherDropdown onNavigateToProjects={onNavigateToProjects} />
    </>
  )
}

// ============================================================================
// MAIN TOP HEADER COMPONENT
// ============================================================================
export default function TopHeader({ onNavigate, onOpenSearch }) {
  return (
    <TooltipProvider>
      <header className="h-12 flex items-center justify-between border-b border-border/50 bg-card/80 backdrop-blur-sm">
        {/* Left section: Logo + Org + Project */}
        <div className="flex items-center">
          {/* Uptrade Logo - aligned with sidebar icons (56px = w-14) */}
          <a href="/" className="w-14 flex items-center justify-center hover:bg-muted/50 transition-colors h-12">
            <img 
              src="/favicon.svg" 
              alt="Uptrade" 
              className="w-5 h-5"
            />
          </a>

          {/* Separator */}
          <span className="text-muted-foreground/30">/</span>

          {/* Org Switcher */}
          <OrgSwitcherDropdown />

          {/* Project Section (separator + switcher) - only shown when project is selected */}
          <ProjectSection onNavigateToProjects={() => onNavigate?.('projects')} />
        </div>

        {/* Right section: Search + Help + User */}
        <div className="flex items-center gap-2 pr-4">
          {/* Search Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 text-muted-foreground hover:text-foreground min-w-[200px]"
                onClick={onOpenSearch}
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline flex-1 text-left">Search...</span>
                <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  {modKey}K
                </kbd>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Search ({modKey}K)</TooltipContent>
          </Tooltip>

          {/* Help Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Help & support</TooltipContent>
          </Tooltip>

          {/* User Menu */}
          <UserMenuDropdown onNavigate={onNavigate} />
        </div>
      </header>
    </TooltipProvider>
  )
}
