/**
 * TeamModule - Unified Team & User Management Module
 * 
 * Context-aware module that adapts its view:
 * 
 * 1. UPTRADE ADMIN (no org context):
 *    - Manage internal Uptrade team
 *    - View organizations and their users
 * 
 * 2. ORGANIZATION VIEW (org context):
 *    - Manage organization users
 *    - Assign access levels (org vs project)
 * 
 * 3. PROJECT VIEW (project context):
 *    - View project team members
 *    - See assigned Uptrade employees
 */
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Building2, Users, FolderOpen } from 'lucide-react'
import useAuthStore from '@/lib/auth-store'
import UptradeTeamPanel from './panels/UptradeTeamPanel'
import OrganizationUsersPanel from './panels/OrganizationUsersPanel'
import AllOrganizationsPanel from './panels/AllOrganizationsPanel'
import ProjectTeamPanel from './panels/ProjectTeamPanel'

export default function TeamModule() {
  const { user, currentOrg, currentProject, isSuperAdmin, accessLevel } = useAuthStore()
  const [activeView, setActiveView] = useState('organizations')

  // Determine context
  // Show admin view ONLY if:
  // 1. User is a super admin (isSuperAdmin=true) AND
  // 2. They haven't selected a specific org/project (viewing global admin interface)
  const isGlobalAdminView = isSuperAdmin && !currentOrg && !currentProject
  const isProjectContext = !!currentProject
  const isOrgContext = !!currentOrg && !currentProject
  
  // Get IDs for non-admin views
  const organizationId = currentOrg?.id || currentProject?.organization_id
  const organizationName = currentOrg?.name || 'Organization'
  
  // Determine if user can manage (org-level access) or only view (project-level access)
  const canManage = isSuperAdmin || accessLevel === 'organization'

  // ADMIN VIEW - Show Organizations + Uptrade Team tabs ONLY when viewing global admin interface
  // If an admin has selected a specific org, show them that org's view instead
  if (isGlobalAdminView) {
    return (
      <div className="p-6 space-y-6">
        <Tabs value={activeView} onValueChange={setActiveView}>
          <TabsList className="mb-6">
            <TabsTrigger value="organizations" className="gap-2">
              <Building2 className="h-4 w-4" />
              Organizations
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              Uptrade Team
            </TabsTrigger>
          </TabsList>

          <TabsContent value="organizations">
            <AllOrganizationsPanel />
          </TabsContent>

          <TabsContent value="team">
            <UptradeTeamPanel />
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  // PROJECT VIEW (non-admin) - Show org team, can view but limited manage
  if (isProjectContext) {
    return (
      <div className="p-6">
        <OrganizationUsersPanel 
          organizationId={organizationId}
          organizationName={organizationName}
          canManage={canManage}
        />
      </div>
    )
  }

  // ORGANIZATION VIEW (non-admin) - Show org users
  if (isOrgContext) {
    return (
      <div className="p-6">
        <OrganizationUsersPanel 
          organizationId={organizationId}
          organizationName={organizationName}
          canManage={canManage}
        />
      </div>
    )
  }

  // Fallback - shouldn't happen
  return (
    <div className="p-6 text-center py-12 text-[var(--text-tertiary)]">
      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>No context available. Select an organization or project.</p>
    </div>
  )
}
