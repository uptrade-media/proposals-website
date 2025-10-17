import { useState } from 'react'
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
  LineChart
} from 'lucide-react'
import useAuthStore from '@/lib/auth-store'
import useReportsStore from '@/lib/reports-store'

const Sidebar = ({ activeSection, onSectionChange, isMobile = false }) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { getUnreadAuditsCount } = useReportsStore()

  const unreadAudits = getUnreadAuditsCount()

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, badge: null, route: null },
    { id: 'audits', label: 'Audits', icon: LineChart, badge: unreadAudits > 0 ? unreadAudits.toString() : null, route: null },
    { id: 'projects', label: 'Projects', icon: FileText, badge: '2', route: null },
    { id: 'files', label: 'Files', icon: FolderOpen, badge: null, route: null },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: '3', route: null },
    { id: 'billing', label: 'Billing', icon: DollarSign, badge: '1', route: null },
    { id: 'reports', label: 'Reports', icon: BarChart3, badge: null, route: null },
  ]

  // Admin-only navigation items
  const adminItems = user?.role === 'admin' ? [
    { id: 'admin', label: 'Admin Panel', icon: Shield, badge: null, route: null },
    { id: 'clients', label: 'Clients', icon: Users, badge: null, route: null },
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
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">UM</span>
              </div>
              <div>
                <h2 className="font-semibold text-sm">Uptrade Media</h2>
                <p className="text-xs text-gray-500">Client Portal</p>
              </div>
            </div>
          )}
          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1"
            >
              {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* User Info */}
      {!isCollapsed && (
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              {user?.company && (
                <p className="text-xs text-gray-400 truncate">{user.company.name}</p>
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
                  ? 'bg-[#4bbf39]/10 text-[#4bbf39] hover:bg-[#4bbf39]/20' 
                  : 'hover:bg-gray-100'
              }`}
              onClick={() => handleNavigation(item)}
            >
              <Icon className={`h-4 w-4 ${isCollapsed ? '' : 'mr-3'}`} />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="ml-auto bg-[#4bbf39] text-white">
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
      <div className="p-4 border-t space-y-1">
        <Button
          variant="ghost"
          className={`w-full justify-start ${isCollapsed ? 'px-2' : 'px-3'}`}
          onClick={() => onSectionChange('settings')}
        >
          <Settings className={`h-4 w-4 ${isCollapsed ? '' : 'mr-3'}`} />
          {!isCollapsed && 'Settings'}
        </Button>
        
        <Button
          variant="ghost"
          className={`w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 ${isCollapsed ? 'px-2' : 'px-3'}`}
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
      <div className="fixed inset-0 z-50 bg-black/50">
        <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg">
          {sidebarContent}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border-r transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {sidebarContent}
    </div>
  )
}

export default Sidebar
