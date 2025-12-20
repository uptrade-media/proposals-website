/**
 * OrgSwitcher.jsx - Two-tier organization/project switcher
 * 
 * Structure:
 * - Main dropdown shows projects within current organization
 * - Admin overlay shows organization switch + "Return to Admin" option
 * 
 * For regular users: Shows projects they have access to
 * For admins: Can switch orgs and view any project
 */
import { useState, useEffect } from 'react'
import { 
  Building2, 
  ChevronDown, 
  Check, 
  Settings, 
  ArrowLeft,
  FolderOpen,
  Globe,
  Layers
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import useAuthStore from '@/lib/auth-store'

const OrgSwitcher = ({ onManageTenants, collapsed = false }) => {
  const { 
    currentOrg, 
    currentProject,
    availableOrgs, 
    availableProjects,
    isSuperAdmin, 
    switchOrganization,
    switchProject,
    exitProjectView,
    fetchAllOrganizations,
    isLoading 
  } = useAuthStore()
  
  const [allOrgs, setAllOrgs] = useState([])
  const [orgProjects, setOrgProjects] = useState({}) // projectsByOrgId
  const [loadingOrgs, setLoadingOrgs] = useState(false)

  // Super admins can see all organizations
  useEffect(() => {
    if (isSuperAdmin) {
      loadAllOrgs()
    }
  }, [isSuperAdmin])

  const loadAllOrgs = async () => {
    setLoadingOrgs(true)
    const orgs = await fetchAllOrganizations()
    
    // Separate organizations and projects
    const realOrgs = []
    const projectMap = {}
    
    orgs?.forEach(item => {
      if (item.isProjectTenant) {
        // This is a project - group by org_id or put in 'unassigned'
        const orgId = item.organization_id || item.org_id || 'unassigned'
        if (!projectMap[orgId]) projectMap[orgId] = []
        projectMap[orgId].push(item)
      } else {
        // This is an organization
        realOrgs.push(item)
      }
    })
    
    setAllOrgs(realOrgs)
    setOrgProjects(projectMap)
    setLoadingOrgs(false)
  }

  const handleSwitchOrg = async (org) => {
    console.log('[OrgSwitcher] Switching to org:', org.name)
    await switchOrganization(org.id)
  }

  const handleSwitchProject = async (project) => {
    console.log('[OrgSwitcher] Switching to project:', project.name || project.title)
    const projectId = project.projectId || project.id
    await switchProject(projectId)
  }

  const handleExitProject = async () => {
    console.log('[OrgSwitcher] Exiting project view')
    await exitProjectView()
  }

  // Determine what to display
  const isInProject = !!currentProject
  const displayName = isInProject 
    ? currentProject.name 
    : currentOrg?.name || 'Select Organization'
  const displayDomain = isInProject
    ? currentProject.domain
    : currentOrg?.domain
  const displayColor = isInProject
    ? currentProject.theme?.primaryColor || '#4bbf39'
    : currentOrg?.theme?.primaryColor || '#4bbf39'

  // Get projects for current org (for non-super-admin users)
  const currentOrgProjects = availableProjects?.length > 0 
    ? availableProjects 
    : (currentOrg?.id ? orgProjects[currentOrg.id] : []) || []

  // If no org context yet, show nothing
  if (!currentOrg && !isSuperAdmin) {
    return null
  }

  // Collapsed mode - just show icon
  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-center p-2"
            disabled={isLoading}
          >
            {isInProject ? (
              <Globe className="h-5 w-5 text-[var(--text-secondary)]" />
            ) : (
              <Building2 className="h-5 w-5 text-[var(--text-secondary)]" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <SwitcherDropdownContent 
            currentOrg={currentOrg}
            currentProject={currentProject}
            isInProject={isInProject}
            allOrgs={allOrgs}
            currentOrgProjects={currentOrgProjects}
            orgProjects={orgProjects}
            isSuperAdmin={isSuperAdmin}
            loadingOrgs={loadingOrgs}
            handleSwitchOrg={handleSwitchOrg}
            handleSwitchProject={handleSwitchProject}
            handleExitProject={handleExitProject}
            onManageTenants={onManageTenants}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-between px-3 py-2 h-auto"
          disabled={isLoading}
        >
          <div className="flex items-center gap-2 min-w-0">
            {/* Icon: Globe for project, Building for org */}
            <div 
              className="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: displayColor }}
            >
              {isInProject ? (
                <Globe className="h-4 w-4" />
              ) : (
                displayName?.charAt(0) || 'U'
              )}
            </div>
            <div className="flex flex-col items-start min-w-0">
              <span className="text-sm font-medium truncate text-[var(--text-primary)]">
                {displayName}
              </span>
              {displayDomain && (
                <span className="text-xs text-[var(--text-tertiary)] truncate">
                  {displayDomain}
                </span>
              )}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-[var(--text-secondary)] shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <SwitcherDropdownContent 
          currentOrg={currentOrg}
          currentProject={currentProject}
          isInProject={isInProject}
          allOrgs={allOrgs}
          currentOrgProjects={currentOrgProjects}
          orgProjects={orgProjects}
          isSuperAdmin={isSuperAdmin}
          loadingOrgs={loadingOrgs}
          handleSwitchOrg={handleSwitchOrg}
          handleSwitchProject={handleSwitchProject}
          handleExitProject={handleExitProject}
          onManageTenants={onManageTenants}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Dropdown content - handles all the switching logic
const SwitcherDropdownContent = ({ 
  currentOrg,
  currentProject,
  isInProject,
  allOrgs,
  currentOrgProjects,
  orgProjects,
  isSuperAdmin, 
  loadingOrgs, 
  handleSwitchOrg,
  handleSwitchProject,
  handleExitProject,
  onManageTenants 
}) => {
  return (
    <>
      {/* If currently in a project, show "Return to Organization" option */}
      {isInProject && (
        <>
          <DropdownMenuItem 
            onClick={handleExitProject}
            className="cursor-pointer bg-[var(--glass-bg-hover)]"
          >
            <ArrowLeft className="h-4 w-4 mr-2 text-[var(--text-secondary)]" />
            <div className="flex flex-col">
              <span className="text-sm">Return to Organization</span>
              <span className="text-xs text-[var(--text-tertiary)]">
                {currentOrg?.name || 'Organization Dashboard'}
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </>
      )}

      {/* Projects within current org */}
      {currentOrgProjects.length > 0 && (
        <>
          <DropdownMenuLabel className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
            <FolderOpen className="h-3 w-3" />
            {currentOrg?.name ? `${currentOrg.name}'s Projects` : 'Projects'}
          </DropdownMenuLabel>
          
          {currentOrgProjects.map((project) => (
            <DropdownMenuItem
              key={project.id}
              onClick={() => handleSwitchProject(project)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div 
                  className="w-5 h-5 rounded flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: project.theme?.primaryColor || project.tenant_theme_color || '#4bbf39' }}
                >
                  <Globe className="h-3 w-3" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm truncate">{project.name || project.title}</div>
                  {(project.domain || project.tenant_domain) && (
                    <div className="text-xs text-[var(--text-tertiary)] truncate">
                      {project.domain || project.tenant_domain}
                    </div>
                  )}
                </div>
              </div>
              {currentProject?.id === project.id && (
                <Check className="h-4 w-4 text-[var(--accent-primary)] shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
        </>
      )}

      {/* Super admin: Organization switching */}
      {isSuperAdmin && (
        <>
          <DropdownMenuLabel className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
            <Layers className="h-3 w-3" />
            Switch Organization
          </DropdownMenuLabel>
          
          {loadingOrgs ? (
            <div className="p-2 text-center text-sm text-[var(--text-secondary)]">
              Loading...
            </div>
          ) : allOrgs.length === 0 ? (
            <div className="p-2 text-center text-sm text-[var(--text-secondary)]">
              No organizations found
            </div>
          ) : (
            allOrgs.map((org) => {
              const projectsForOrg = orgProjects[org.id] || []
              
              if (projectsForOrg.length > 0) {
                // Org has projects - show submenu
                return (
                  <DropdownMenuSub key={org.id}>
                    <DropdownMenuSubTrigger className="cursor-pointer">
                      <div className="flex items-center gap-2 min-w-0">
                        <div 
                          className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                          style={{ backgroundColor: org.theme?.primaryColor || '#4bbf39' }}
                        >
                          {org.name?.charAt(0) || '?'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm truncate">{org.name}</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="ml-auto text-[9px] px-1 py-0">
                        {projectsForOrg.length}
                      </Badge>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent className="w-56">
                        <DropdownMenuItem 
                          onClick={() => handleSwitchOrg(org)}
                          className="cursor-pointer"
                        >
                          <Building2 className="h-4 w-4 mr-2 text-[var(--text-secondary)]" />
                          Organization Dashboard
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs text-[var(--text-tertiary)]">
                          Projects
                        </DropdownMenuLabel>
                        {projectsForOrg.map(project => (
                          <DropdownMenuItem 
                            key={project.id}
                            onClick={() => handleSwitchProject(project)}
                            className="cursor-pointer"
                          >
                            <Globe className="h-4 w-4 mr-2 text-[var(--text-tertiary)]" />
                            <span className="truncate">{project.name || project.title}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                )
              }
              
              // Org without projects - simple item
              return (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => handleSwitchOrg(org)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div 
                      className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: org.theme?.primaryColor || '#4bbf39' }}
                    >
                      {org.name?.charAt(0) || '?'}
                    </div>
                    <div className="text-sm truncate">{org.name}</div>
                  </div>
                  {currentOrg?.id === org.id && !isInProject && (
                    <Check className="h-4 w-4 text-[var(--accent-primary)] shrink-0" />
                  )}
                </DropdownMenuItem>
              )
            })
          )}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={onManageTenants}
            className="cursor-pointer"
          >
            <Settings className="h-4 w-4 mr-2" />
            Manage Projects & Web Apps
          </DropdownMenuItem>
        </>
      )}
    </>
  )
}

export default OrgSwitcher
