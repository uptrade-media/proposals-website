/**
 * TenantDashboard - Dashboard router for project-based tenants
 * 
 * At ORG level (no project selected):
 * - Shows OrgDashboard with multi-project analytics and overview
 * 
 * At PROJECT level (project selected):
 * - Shows ProjectDashboard with real data, charts, and module widgets
 */

import useAuthStore from '@/lib/auth-store'
import OrgDashboard from './OrgDashboard'
import ProjectDashboard from './dashboard/ProjectDashboard'

export default function TenantDashboard({ onNavigate }) {
  const { currentOrg, currentProject } = useAuthStore()
  
  // Two-tier: Check if we're in a specific project or just the organization
  const isInProject = !!currentProject

  // ORG-LEVEL VIEW: Show OrgDashboard when no project is selected
  if (!isInProject) {
    return <OrgDashboard onNavigate={onNavigate} />
  }

  // PROJECT-LEVEL VIEW: Show the new world-class ProjectDashboard
  return <ProjectDashboard onNavigate={onNavigate} />
}

