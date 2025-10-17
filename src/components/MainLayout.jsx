import { useState, useEffect, useRef } from 'react'
import Sidebar from './Sidebar'
import Dashboard from './Dashboard'
import Reports from './Reports'
import Projects from './Projects'
import Files from './Files'
import Messages from './Messages'
import Billing from './Billing'
import ClientManagement from './ClientManagement'
import EmailManager from '@/pages/EmailManager'
import UptradeLoading from './UptradeLoading'
import useAuthStore from '@/lib/auth-store'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const MainLayout = () => {
  const [activeSection, setActiveSection] = useState('dashboard')
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const { user, isLoading } = useAuthStore()

  // Debug logging
  console.log('[MainLayout] Render', { activeSection, isLoading, hasUser: !!user, userEmail: user?.email })

  // No need to check auth here - App.jsx and Protected.jsx already handle it

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveSection} />
      case 'reports':
        return <Reports />
      case 'projects':
        return <Projects />
      case 'files':
        return <Files />
      case 'messages':
        return <Messages />
      case 'billing':
        return <Billing />
      case 'clients':
        return <ClientManagement />
      case 'email':
        return <EmailManager />
      default:
        return <Dashboard onNavigate={setActiveSection} />
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <UptradeLoading />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="bg-white shadow-md"
        >
          {isMobileSidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 bg-white border-r">
        <Sidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
      </aside>

      {/* Mobile Sidebar */}
      {isMobileSidebarOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-[100]"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <aside className="lg:hidden fixed inset-y-0 left-0 w-64 bg-white border-r shadow-xl z-[101] overflow-y-auto">
            <Sidebar
              activeSection={activeSection}
              onSectionChange={(section) => {
                setActiveSection(section)
                setIsMobileSidebarOpen(false)
              }}
              isMobile={true}
            />
          </aside>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 lg:p-8 max-w-7xl">
          {renderContent()}
        </div>
      </main>
    </div>
  )
}

export default MainLayout
