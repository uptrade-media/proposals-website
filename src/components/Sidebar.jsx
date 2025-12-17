import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  
  // Use raw feature check so super admins can also toggle modules on/off
  const hasFeature = hasFeatureRaw

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

  // Check user roles - super admins get full access to everything
  const isAdmin = user?.role === 'admin' || isSuperAdmin
  const isSalesRep = user?.teamRole === 'sales_rep' && !isSuperAdmin
  const isManager = user?.teamRole === 'manager' || isSuperAdmin

  // Base navigation items available to everyone
  const baseNavigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, badge: null, route: null },
    { id: 'audits', label: 'Audits', icon: LineChart, badge: unreadAudits > 0 ? unreadAudits.toString() : null, route: null },
    { id: 'proposals', label: 'Proposals', icon: Send, badge: null, route: null },
  ]

  // Sales rep sees a simplified navigation (their assigned clients only)
  const salesRepItems = isSalesRep ? [
    { id: 'clients', label: 'My Clients', icon: Users, badge: null, route: null },
  ] : []

  // Full navigation for admins and managers (not sales reps)
  // Respects feature flags - items only show if feature is enabled (or user is super admin)
  const fullNavigationItems = !isSalesRep ? [
    { id: 'projects', label: 'Projects', icon: FileText, badge: null, route: null },
    ...(hasFeature('files') ? [{ id: 'files', label: 'Files', icon: FolderOpen, badge: null, route: null }] : []),
    ...(hasFeature('messages') ? [{ id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages > 0 ? unreadMessages.toString() : null, route: null }] : []),
    ...(hasFeature('billing') ? [{ id: 'billing', label: 'Billing', icon: DollarSign, badge: unpaidInvoicesCount > 0 ? unpaidInvoicesCount.toString() : null, route: null }] : []),
    ...(hasFeature('analytics') ? [{ id: 'analytics', label: 'Analytics', icon: BarChart3, badge: null, route: null }] : []),
  ] : []

  // Admin-only navigation items - all respect feature flags
  const adminItems = isAdmin ? [
    { id: 'clients', label: 'Clients', icon: Users, badge: newLeadsCount > 0 ? newLeadsCount.toString() : null, route: null },
    ...(hasFeature('seo') ? [{ id: 'seo', label: 'SEO', icon: Search, badge: null, route: null }] : []),
    ...(hasFeature('team') ? [{ id: 'team', label: 'Team', icon: Shield, badge: null, route: null }] : []),
    ...(hasFeature('team_metrics') ? [{ id: 'team-metrics', label: 'Team Metrics', icon: Trophy, badge: null, route: null }] : []),
    ...(hasFeature('forms') ? [{ id: 'forms', label: 'Forms', icon: ClipboardList, badge: null, route: null }] : []),
    ...(hasFeature('blog') ? [{ id: 'blog', label: 'Blog', icon: BookOpen, badge: null, route: null }] : []),
    ...(hasFeature('portfolio') ? [{ id: 'portfolio', label: 'Portfolio', icon: Briefcase, badge: null, route: null }] : []),
    ...(hasFeature('email') ? [{ id: 'email', label: 'Email Manager', icon: Mail, badge: null, route: null }] : []),
  ] : []
  
  // Super admin items (tenant management is now in Projects tab)
  const superAdminItems = isSuperAdmin ? [
    // Tenants management moved to Projects tab - completed projects convert to tenants
  ] : []

  // Manager gets team access but not blog/portfolio/email - respects feature flags
  const managerItems = (isManager && !isAdmin) ? [
    { id: 'clients', label: 'Clients', icon: Users, badge: newLeadsCount > 0 ? newLeadsCount.toString() : null, route: null },
    ...(hasFeature('team') ? [{ id: 'team', label: 'Team', icon: Shield, badge: null, route: null }] : []),
    ...(hasFeature('team_metrics') ? [{ id: 'team-metrics', label: 'Team Metrics', icon: Trophy, badge: null, route: null }] : []),
  ] : []

  // Tenant-specific items (when viewing as a tenant/client organization)
  // This shows "My Sales" for clients who have their own websites with forms/customers
  const tenantItems = currentOrg ? [
    ...(hasFeature('my_sales') ? [{ id: 'my-sales', label: 'My Sales', icon: ShoppingCart, badge: null, route: null, divider: true }] : []),
  ] : []

  // Combine navigation items based on role
  const allNavigationItems = [
    ...baseNavigationItems,
    ...salesRepItems,
    ...fullNavigationItems,
    ...managerItems,
    ...adminItems,
    ...superAdminItems,
    ...tenantItems,
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
      <nav className="flex-1 p-4 space-y-1">
        {allNavigationItems.map((item) => {
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
