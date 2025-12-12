import { useState, lazy, Suspense } from 'react'
import Sidebar from './Sidebar'
import UptradeLoading from './UptradeLoading'
import useAuthStore from '@/lib/auth-store'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Lazy load all section components for better code splitting
const Dashboard = lazy(() => import('./Dashboard'))
const Reports = lazy(() => import('./Reports'))
const Projects = lazy(() => import('./Projects'))
const FilesDrive = lazy(() => import('./FilesDrive'))
const Messages = lazy(() => import('./Messages'))
const Billing = lazy(() => import('./Billing'))
const ClientManagement = lazy(() => import('./ClientManagement'))
const EmailManager = lazy(() => import('@/pages/EmailManager'))
const BlogManagement = lazy(() => import('./BlogManagement'))
const PortfolioManagement = lazy(() => import('./PortfolioManagement'))
const Audits = lazy(() => import('@/pages/Audits'))
const ProposalEditor = lazy(() => import('./ProposalEditor'))

const MainLayout = () => {
  const [activeSection, setActiveSection] = useState('dashboard')
  const [activeSectionData, setActiveSectionData] = useState(null) // For passing data like proposalId
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const { user, isLoading } = useAuthStore()

  // Navigation function that can pass data
  const navigateTo = (section, data = null) => {
    setActiveSection(section)
    setActiveSectionData(data)
  }

  // Debug logging
  console.log('[MainLayout] Render', { activeSection, isLoading, hasUser: !!user, userEmail: user?.email })

  // No need to check auth here - App.jsx and Protected.jsx already handle it

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard onNavigate={navigateTo} />
      case 'audits':
        return <Audits />
      case 'reports':
        return <Reports />
      case 'projects':
        return <Projects onNavigate={navigateTo} />
      case 'files':
        return <FilesDrive />
      case 'messages':
        return <Messages />
      case 'billing':
        return <Billing />
      case 'clients':
        return <ClientManagement />
      case 'blog':
        return <BlogManagement />
      case 'portfolio':
        return <PortfolioManagement />
      case 'email':
        return <EmailManager />
      case 'proposal-editor':
        return (
          <ProposalEditor 
            proposalId={activeSectionData?.proposalId} 
            onBack={() => navigateTo('projects')} 
          />
        )
      default:
        return <Dashboard onNavigate={navigateTo} />
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--surface-primary)]/80 backdrop-blur-[var(--blur-sm)]">
        <UptradeLoading />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[var(--surface-primary)]">
      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="glass"
          size="sm"
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="shadow-[var(--shadow-md)]"
        >
          {isMobileSidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 bg-[var(--glass-bg)] backdrop-blur-[var(--blur-xl)] border-r border-[var(--glass-border)]">
        <Sidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
      </aside>

      {/* Mobile Sidebar */}
      {isMobileSidebarOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-[var(--blur-sm)] z-[100]"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <aside className="lg:hidden fixed inset-y-0 left-0 w-64 bg-[var(--glass-bg)] backdrop-blur-[var(--blur-xl)] border-r border-[var(--glass-border)] shadow-[var(--shadow-xl)] z-[101] overflow-y-auto">
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
        <div className="p-6 lg:p-8">
          <Suspense fallback={<UptradeLoading />}>
            {renderContent()}
          </Suspense>
        </div>
      </main>
    </div>
  )
}

export default MainLayout
