// OrgSwitcher.jsx - Organization switcher dropdown for multi-tenant portal
import { useState, useEffect } from 'react'
import { Building2, ChevronDown, Check, Plus, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import useAuthStore, { useOrgFeatures } from '@/lib/auth-store'

const OrgSwitcher = ({ onManageTenants, collapsed = false }) => {
  const { 
    currentOrg, 
    availableOrgs, 
    isSuperAdmin, 
    switchOrganization, 
    fetchAllOrganizations,
    isLoading 
  } = useAuthStore()
  
  const [allOrgs, setAllOrgs] = useState([])
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
    setAllOrgs(orgs)
    setLoadingOrgs(false)
  }

  const handleSwitch = async (org) => {
    if (org.id === currentOrg?.id) return
    await switchOrganization(org.id)
  }

  // If no org context yet (before migration), show nothing
  if (!currentOrg && !isSuperAdmin) {
    return null
  }

  // Determine which orgs to show
  const displayOrgs = isSuperAdmin ? allOrgs : availableOrgs

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
            <Building2 className="h-5 w-5 text-[var(--text-secondary)]" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <OrgDropdownContent 
            currentOrg={currentOrg}
            displayOrgs={displayOrgs}
            isSuperAdmin={isSuperAdmin}
            loadingOrgs={loadingOrgs}
            handleSwitch={handleSwitch}
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
            {currentOrg?.theme?.logoUrl ? (
              <img 
                src={currentOrg.theme.logoUrl} 
                alt={currentOrg.name} 
                className="w-6 h-6 rounded object-cover"
              />
            ) : (
              <div 
                className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: currentOrg?.theme?.primaryColor || '#4bbf39' }}
              >
                {currentOrg?.name?.charAt(0) || 'U'}
              </div>
            )}
            <div className="flex flex-col items-start min-w-0">
              <span className="text-sm font-medium truncate text-[var(--text-primary)]">
                {currentOrg?.name || 'Select Organization'}
              </span>
              {currentOrg?.domain && (
                <span className="text-xs text-[var(--text-tertiary)] truncate">
                  {currentOrg.domain}
                </span>
              )}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-[var(--text-secondary)] shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <OrgDropdownContent 
          currentOrg={currentOrg}
          displayOrgs={displayOrgs}
          isSuperAdmin={isSuperAdmin}
          loadingOrgs={loadingOrgs}
          handleSwitch={handleSwitch}
          onManageTenants={onManageTenants}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Separated dropdown content for reuse
const OrgDropdownContent = ({ 
  currentOrg, 
  displayOrgs, 
  isSuperAdmin, 
  loadingOrgs, 
  handleSwitch, 
  onManageTenants 
}) => {
  return (
    <>
      <DropdownMenuLabel className="text-xs text-[var(--text-tertiary)]">
        {isSuperAdmin ? 'All Organizations' : 'Your Organizations'}
      </DropdownMenuLabel>
      
      {loadingOrgs ? (
        <div className="p-2 text-center text-sm text-[var(--text-secondary)]">
          Loading...
        </div>
      ) : displayOrgs.length === 0 ? (
        <div className="p-2 text-center text-sm text-[var(--text-secondary)]">
          No organizations found
        </div>
      ) : (
        displayOrgs.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleSwitch(org)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div 
                className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                style={{ backgroundColor: org.theme?.primaryColor || '#4bbf39' }}
              >
                {org.name?.charAt(0) || '?'}
              </div>
              <div className="min-w-0">
                <div className="text-sm truncate">{org.name}</div>
                {org.domain && (
                  <div className="text-xs text-[var(--text-tertiary)] truncate">{org.domain}</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {org.status === 'suspended' && (
                <Badge variant="destructive" className="text-[9px] px-1 py-0">
                  Suspended
                </Badge>
              )}
              {org.plan !== 'free' && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize">
                  {org.plan}
                </Badge>
              )}
              {currentOrg?.id === org.id && (
                <Check className="h-4 w-4 text-[var(--accent-primary)]" />
              )}
            </div>
          </DropdownMenuItem>
        ))
      )}
      
      {isSuperAdmin && (
        <>
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
