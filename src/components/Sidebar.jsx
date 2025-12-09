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
  Briefcase
} from 'lucide-react'
import useAuthStore from '@/lib/auth-store'
import useReportsStore from '@/lib/reports-store'
import useMessagesStore from '@/lib/messages-store'
import useBillingStore from '@/lib/billing-store'
import useNotificationStore from '@/lib/notification-store'

const Sidebar = ({ activeSection, onSectionChange, isMobile = false }) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { getUnreadAuditsCount } = useReportsStore()
  const { unreadCount: unreadMessages, fetchUnreadCount: fetchUnreadMessages } = useMessagesStore()
  const { invoices } = useBillingStore()
  const { newLeadsCount, fetchNewLeadsCount } = useNotificationStore()

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

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, badge: null, route: null },
    { id: 'audits', label: 'Audits', icon: LineChart, badge: unreadAudits > 0 ? unreadAudits.toString() : null, route: null },
    { id: 'projects', label: 'Projects', icon: FileText, badge: null, route: null },
    { id: 'files', label: 'Files', icon: FolderOpen, badge: null, route: null },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages > 0 ? unreadMessages.toString() : null, route: null },
    { id: 'billing', label: 'Billing', icon: DollarSign, badge: unpaidInvoicesCount > 0 ? unpaidInvoicesCount.toString() : null, route: null },
    { id: 'reports', label: 'Reports', icon: BarChart3, badge: null, route: null },
  ]

  // Admin-only navigation items
  const adminItems = user?.role === 'admin' ? [
    { id: 'clients', label: 'Clients', icon: Users, badge: newLeadsCount > 0 ? newLeadsCount.toString() : null, route: null },
    { id: 'blog', label: 'Blog', icon: BookOpen, badge: null, route: null },
    { id: 'portfolio', label: 'Portfolio', icon: Briefcase, badge: null, route: null },
    { id: 'email', label: 'Email Manager', icon: Mail, badge: null, route: null },
  ] : []

  // Combine navigation items
  const allNavigationItems = [...navigationItems, ...adminItems]

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
      {/* Header */}
      <div className="p-4 border-b border-[var(--glass-border)]">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
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
          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
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
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-[var(--text-secondary)] truncate">{user?.email}</p>
              {user?.company && (
                <p className="text-xs text-[var(--text-tertiary)] truncate">{user.company.name}</p>
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
              className={`w-full justify-start ${isCollapsed ? 'px-2' : 'px-3'} ${
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
          className={`w-full justify-start text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)] ${isCollapsed ? 'px-2' : 'px-3'}`}
          onClick={() => onSectionChange('settings')}
        >
          <Settings className={`h-4 w-4 ${isCollapsed ? '' : 'mr-3'}`} />
          {!isCollapsed && 'Settings'}
        </Button>
        
        <Button
          variant="ghost"
          className={`w-full justify-start text-[var(--accent-red)] hover:text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 ${isCollapsed ? 'px-2' : 'px-3'}`}
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
