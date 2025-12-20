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
import ProjectTeamPanel from './panels/ProjectTeamPanel'

export default function TeamModule() {
  const { user, currentOrg, currentProject, isSuperAdmin, accessLevel } = useAuthStore()
  const [activeView, setActiveView] = useState('team')

  // Determine context
  const isUptradeAdmin = (user?.role === 'admin' || isSuperAdmin) && !currentOrg && !currentProject
  const isOrgContext = !!currentOrg && !currentProject
  const isProjectContext = !!currentProject
  
  // Get IDs
  const organizationId = currentOrg?.id || currentProject?.organization_id
  const organizationName = currentOrg?.name || 'Organization'
  const projectId = currentProject?.id
  const projectName = currentProject?.name || currentProject?.title
  
  // Determine if user can manage (org-level access) or only view (project-level access)
  const canManage = user?.role === 'admin' || isSuperAdmin || accessLevel === 'organization'

  // UPTRADE ADMIN VIEW - Show internal team with option to view org users
  if (isUptradeAdmin) {
    return (
      <div className="p-6 space-y-6">
        <Tabs value={activeView} onValueChange={setActiveView}>
          <TabsList className="mb-6">
            <TabsTrigger value="team" className="gap-2">
              <Building2 className="h-4 w-4" />
              Uptrade Team
            </TabsTrigger>
            <TabsTrigger value="organizations" className="gap-2">
              <Users className="h-4 w-4" />
              Organization Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="team">
            <UptradeTeamPanel />
          </TabsContent>

          <TabsContent value="organizations">
            <div className="text-center py-12 text-[var(--text-tertiary)]">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select an organization from the sidebar to manage its users</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  // PROJECT VIEW - Show org team (project-level users can view but not manage)
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

  // ORGANIZATION VIEW - Show org users (with tab to view internal team for admins)
  if (isOrgContext) {
    // Uptrade admins viewing an org can see both tabs
    if (user?.role === 'admin' || isSuperAdmin) {
      return (
        <div className="p-6 space-y-6">
          <Tabs value={activeView} onValueChange={setActiveView} defaultValue="users">
            <TabsList className="mb-6">
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                {organizationName} Team
              </TabsTrigger>
              <TabsTrigger value="team" className="gap-2">
                <Building2 className="h-4 w-4" />
                Uptrade Team
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <OrganizationUsersPanel 
                organizationId={organizationId}
                organizationName={organizationName}
                canManage={true}
              />
            </TabsContent>

            <TabsContent value="team">
              <UptradeTeamPanel />
            </TabsContent>
          </Tabs>
        </div>
      )
    }

    // Regular org users - can manage if org-level, view-only if project-level
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
