/**
 * TenantClients - Wrapper for CRM that shows the tenant's own clients
 * 
 * When viewing a project-based tenant (like GWA), this component
 * shows contacts that belong to that tenant's organization, not Uptrade's.
 */

import { CRMDashboard } from './crm'
import useAuthStore from '@/lib/auth-store'

export default function TenantClients() {
  const { currentOrg } = useAuthStore()
  
  // The currentOrg.id is the project ID when in tenant context
  // The X-Organization-Id header is automatically sent by the API interceptor
  // based on currentOrg, so CRMDashboard will fetch tenant-filtered data
  
  return (
    <div className="h-full">
      {/* Header showing tenant context */}
      <div className="mb-4 px-1">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          {currentOrg?.name || 'Tenant'} Clients
        </h2>
        <p className="text-sm text-[var(--text-tertiary)]">
          Manage leads and customers for {currentOrg?.name || 'this organization'}
        </p>
      </div>
      
      <CRMDashboard />
    </div>
  )
}
