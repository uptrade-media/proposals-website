import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Home, 
  FileText, 
  MessageSquare, 
  DollarSign, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X,
  User,
  Users,
  FolderOpen,
  Shield,
  Mail,
  LineChart,
  BookOpen,
  Briefcase,
  Send,
  Trophy,
  Building2,
  ClipboardList,
  ShoppingCart,
  Search
} from 'lucide-react'
import useAuthStore, { useOrgFeatures } from '@/lib/auth-store'
import useReportsStore from '@/lib/reports-store'
import useMessagesStore from '@/lib/messages-store'
import useBillingStore from '@/lib/billing-store'
import useNotificationStore from '@/lib/notification-store'
import OrgSwitcher from './OrgSwitcher'

const Sidebar = ({ 
  activeSection, 
  onSectionChange, 
  isMobile = false,
  isCollapsed: propIsCollapsed,
  onToggleCollapse
}) => {
  // Use prop-controlled state if provided, otherwise internal state
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const isCollapsed = propIsCollapsed !== undefined ? propIsCollapsed : internalCollapsed
  const toggleCollapse = onToggleCollapse || (() => setInternalCollapsed(!internalCollapsed))
  const navigate = useNavigate()
  const { user, logout, isSuperAdmin, currentOrg } = useAuthStore()
  const { hasFeatureRaw } = useOrgFeatures()
  const { getUnreadAuditsCount } = useReportsStore()
  const { unreadCount: unreadMessages, fetchUnreadCount: fetchUnreadMessages } = useMessagesStore()
  const { invoices } = useBillingStore()
  const { newLeadsCount, fetchNewLeadsCount } = useNotificationStore()
  
  // Check user roles - super admins get full access to everything
  const isAdmin = user?.role === 'admin' || isSuperAdmin
  const isSalesRep = user?.teamRole === 'sales_rep' && !isSuperAdmin
  const isManager = user?.teamRole === 'manager' || isSuperAdmin
  
  // Check if viewing as a project-based tenant (e.g., GWA)
  const isProjectTenant = currentOrg?.isProjectTenant === true
  const tenantName = currentOrg?.name || 'Tenant'
  const tenantFeatures = currentOrg?.features || []
  
  // Debug: Log tenant features when viewing as project tenant
  if (isProjectTenant && tenantFeatures) {
    console.log('[Sidebar] Project Tenant Features:', tenantFeatures, 'Type:', Array.isArray(tenantFeatures) ? 'array' : typeof tenantFeatures)
  }
  
  // Helper to check if tenant has a specific feature
  const tenantHasFeature = (feature) => {
    const has = Array.isArray(tenantFeatures) ? tenantFeatures.includes(feature) : tenantFeatures?.[feature] === true
    if (isProjectTenant) {
      console.log('[Sidebar] tenantHasFeature:', feature, '=', has)
    }
    return has
  }
  
  // Check if viewing as a different tenant
  // If user.org_id exists and differs from current org, they're viewing a tenant
  // If user.org_id doesn't exist (admin in main portal), they're NOT viewing a tenant
  const isViewingTenant = currentOrg && user?.org_id && currentOrg.id !== user.org_id
  
  // Feature check: For admin portal (not viewing tenant), show admin tools by default
  // But respect if they're explicitly disabled (feature flag set to false)
  const hasFeature = (featureKey) => {
    const rawValue = hasFeatureRaw(featureKey)
    
    // If viewing a tenant, use their feature flags
    if (isViewingTenant) {
      return rawValue
    }
    
    // For admin portal: admin tools default to true unless explicitly set to false
    const adminTools = ['seo', 'ecommerce', 'blog', 'portfolio', 'email', 'team', 'team_metrics', 'forms']
    if (isAdmin && adminTools.includes(featureKey)) {
      // If feature is undefined (not set), default to true for admin tools
      // If feature is explicitly false, respect that
      return rawValue !== false
    }
    
    // All other features use normal checking
    return rawValue
  }

  // Fetch notification counts on mount
  useEffect(() => {
    fetchUnreadMessages()
    if (user?.role === 'admin') {
      fetchNewLeadsCount()
    }
  }, [user])

  const unreadAudits = getUnreadAuditsCount()
  
  // Calculate unpaid invoices count (pending or overdue)
  const unpaidInvoicesCount = invoices.filter(inv => 
    inv.status === 'pending' || inv.status === 'overdue'
  ).length

  // Base navigation items available to everyone
  const baseNavigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, badge: null, route: null },
    // Only show Audits if NOT viewing a project tenant
    ...(!isProjectTenant ? [{ id: 'audits', label: 'Audits', icon: LineChart, badge: unreadAudits > 0 ? unreadAudits.toString() : null, route: null }] : []),
    { id: 'proposals', label: 'Proposals', icon: Send, badge: null, route: null },
  ]

  // Sales rep sees a simplified navigation (their assigned clients only)
  const salesRepItems = isSalesRep ? [
    { id: 'clients', label: 'My Clients', icon: Users, badge: null, route: null },
  ] : []

  // Full navigation for admins and managers (not sales reps)
  // Respects feature flags - items only show if feature is enabled (or user is super admin)
  // For project tenants: show core Uptrade services (Files, Messages, Billing)
  const fullNavigationItems = !isSalesRep ? [
    // Projects: Only show for admin, or when NOT a project tenant
    ...(isAdmin || !isProjectTenant ? [{ id: 'projects', label: 'Projects', icon: FileText, badge: null, route: null }] : []),
    // For project tenants, always show Files, Messages, Billing (Uptrade services to them)
    ...(isProjectTenant || hasFeature('files') ? [{ id: 'files', label: 'Files', icon: FolderOpen, badge: null, route: null }] : []),
    ...(isProjectTenant || hasFeature('messages') ? [{ id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages > 0 ? unreadMessages.toString() : null, route: null }] : []),
    ...(isProjectTenant || hasFeature('billing') ? [{ id: 'billing', label: 'Billing', icon: DollarSign, badge: unpaidInvoicesCount > 0 ? unpaidInvoicesCount.toString() : null, route: null }] : []),
  ] : []

  // Admin-only navigation items when NOT in tenant context
  // These are Uptrade's internal admin tools
  const adminItems = (isAdmin && !isProjectTenant) ? [
    { id: 'clients', label: 'Clients', icon: Users, badge: newLeadsCount > 0 ? newLeadsCount.toString() : null, route: null },
    ...(hasFeature('seo') ? [{ id: 'seo', label: 'SEO', icon: Search, badge: null, route: null }] : []),
    ...(hasFeature('ecommerce') ? [{ id: 'ecommerce', label: 'Ecommerce', icon: ShoppingCart, badge: null, route: null }] : []),
    ...(hasFeature('team') ? [{ id: 'team', label: 'Team', icon: Shield, badge: null, route: null }] : []),
    ...(hasFeature('team_metrics') ? [{ id: 'team-metrics', label: 'Team Metrics', icon: Trophy, badge: null, route: null }] : []),
    ...(hasFeature('forms') ? [{ id: 'forms', label: 'Forms', icon: ClipboardList, badge: null, route: null }] : []),
    ...(hasFeature('blog') ? [{ id: 'blog', label: 'Blog', icon: BookOpen, badge: null, route: null }] : []),
    ...(hasFeature('portfolio') ? [{ id: 'portfolio', label: 'Portfolio', icon: Briefcase, badge: null, route: null }] : []),
    ...(hasFeature('email') ? [{ id: 'email', label: 'Email Manager', icon: Mail, badge: null, route: null }] : []),
    ...(hasFeature('analytics') ? [{ id: 'analytics', label: 'Analytics', icon: BarChart3, badge: null, route: null }] : []),
  ] : []
  
  // Super admin items (tenant management is now in Projects tab)
  const superAdminItems = isSuperAdmin ? [
    // Tenants management moved to Projects tab - completed projects convert to tenants
  ] : []

  // Manager gets team access but not blog/portfolio/email - respects feature flags
  const managerItems = (isManager && !isAdmin && !isProjectTenant) ? [
    { id: 'clients', label: 'Clients', icon: Users, badge: newLeadsCount > 0 ? newLeadsCount.toString() : null, route: null },
    ...(hasFeature('team') ? [{ id: 'team', label: 'Team', icon: Shield, badge: null, route: null }] : []),
    ...(hasFeature('team_metrics') ? [{ id: 'team-metrics', label: 'Team Metrics', icon: Trophy, badge: null, route: null }] : []),
  ] : []

  // Tenant-specific items (when viewing a project tenant like GWA)
  // These are the modules that the TENANT manages for their own business
  const tenantModuleItems = isProjectTenant ? [
    // Separator marker - handled in render
    { id: 'tenant-divider', label: `${tenantName}'s Modules`, isDivider: true },
    // Core tenant modules - always show Clients for their CRM
    ...(tenantHasFeature('clients') || true ? [{ id: 'tenant-clients', label: 'Clients', icon: Users, badge: null, route: null }] : []),
    ...(tenantHasFeature('seo') ? [{ id: 'seo', label: 'SEO', icon: Search, badge: null, route: null }] : []),
    ...(tenantHasFeature('ecommerce') ? [{ id: 'ecommerce', label: 'Ecommerce', icon: ShoppingCart, badge: null, route: null }] : []),
    ...(tenantHasFeature('forms') ? [{ id: 'forms', label: 'Forms', icon: ClipboardList, badge: null, route: null }] : []),
    ...(tenantHasFeature('email') ? [{ id: 'email', label: 'Email Manager', icon: Mail, badge: null, route: null }] : []),
    ...(tenantHasFeature('blog') ? [{ id: 'blog', label: 'Blog', icon: BookOpen, badge: null, route: null }] : []),
    ...(tenantHasFeature('analytics') ? [{ id: 'analytics', label: 'Analytics', icon: BarChart3, badge: null, route: null }] : []),
  ] : []

  // Combine navigation items based on role
  const allNavigationItems = [
    ...baseNavigationItems,
    ...salesRepItems,
    ...fullNavigationItems,
    ...managerItems,
    ...adminItems,
    ...superAdminItems,
    ...tenantModuleItems,
  ]

  const handleNavigation = (item) => {
    if (item.route) {
      navigate(item.route)
    } else {
      onSectionChange(item.id)
    }
  }

  const handleLogout = async () => {
    await logout()
    // Auth store handles redirect to /login
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header - Org Switcher or Logo */}
      <div className="p-4 border-b border-[var(--glass-border)]">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <>
              {/* Show OrgSwitcher for super admins or when multi-tenant is enabled */}
              {(isSuperAdmin || currentOrg) ? (
                <OrgSwitcher 
                  collapsed={false}
                  onManageTenants={() => onSectionChange('projects')}
                />
              ) : (
                <div className="flex items-center space-x-3">
                  <img 
                    src="/favicon.svg" 
                    alt="Uptrade Media" 
                    className="w-8 h-8"
                  />
                  <div>
                    <h2 className="font-semibold text-sm text-[var(--text-primary)]">Uptrade Media</h2>
                    <p className="text-xs text-[var(--text-tertiary)]">Client Portal</p>
                  </div>
                </div>
              )}
            </>
          )}
          {isCollapsed && (isSuperAdmin || currentOrg) && (
            <OrgSwitcher 
              collapsed={true}
              onManageTenants={() => onSectionChange('projects')}
            />
          )}
          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]"
            >
              {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* User Info */}
      {!isCollapsed && (
        <div className="p-4 border-b border-[var(--glass-border)] bg-[var(--glass-bg-inset)]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[var(--surface-secondary)] rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-[var(--text-tertiary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate text-[var(--text-primary)]">
                {user?.name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email}
              </p>
              <p className="text-xs text-[var(--text-secondary)] truncate">{user?.email}</p>
              {user?.teamRole && (
                <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0 capitalize border-[var(--glass-border)] text-[var(--text-tertiary)]">
                  {user.teamRole === 'sales_rep' ? 'Sales Rep' : user.teamRole}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {allNavigationItems.map((item) => {
          // Handle divider items (tenant module separator)
          if (item.isDivider) {
            if (isCollapsed) {
              return (
                <div key={item.id} className="py-2">
                  <Separator className="bg-[var(--glass-border)]" />
                </div>
              )
            }
            return (
              <div key={item.id} className="pt-4 pb-2">
                <Separator className="bg-[var(--glass-border)] mb-2" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)] px-3">
                  {item.label}
                </span>
              </div>
            )
          }
          
          const Icon = item.icon
          const isActive = activeSection === item.id
          
          return (
            <Button
              key={item.id}
              variant={isActive ? "secondary" : "ghost"}
              className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start px-3'} ${
                isActive 
                  ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]'
              }`}
              onClick={() => handleNavigation(item)}
            >
              <Icon className={`h-4 w-4 ${isCollapsed ? '' : 'mr-3'}`} />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <Badge variant="default" className="ml-auto bg-[var(--brand-primary)] text-white border-0">
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </Button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--glass-border)] space-y-1">
        <Button
          variant="ghost"
          className={`w-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)] ${isCollapsed ? 'justify-center px-2' : 'justify-start px-3'}`}
          onClick={() => onSectionChange('settings')}
        >
          <Settings className={`h-4 w-4 ${isCollapsed ? '' : 'mr-3'}`} />
          {!isCollapsed && 'Settings'}
        </Button>
        
        <Button
          variant="ghost"
          className={`w-full text-[var(--accent-red)] hover:text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 ${isCollapsed ? 'justify-center px-2' : 'justify-start px-3'}`}
          onClick={handleLogout}
        >
          <LogOut className={`h-4 w-4 ${isCollapsed ? '' : 'mr-3'}`} />
          {!isCollapsed && 'Logout'}
        </Button>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[var(--blur-sm)]">
        <div className="fixed left-0 top-0 h-full w-64 bg-[var(--glass-bg)] backdrop-blur-[var(--blur-xl)] border-r border-[var(--glass-border)] shadow-[var(--shadow-lg)]">
          {sidebarContent}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-[var(--glass-bg)] backdrop-blur-[var(--blur-xl)] border-r border-[var(--glass-border)] transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {sidebarContent}
    </div>
  )
}

export default Sidebar
