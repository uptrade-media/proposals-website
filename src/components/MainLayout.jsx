import { useState, lazy, Suspense } from 'react'
import Sidebar from './Sidebar'
import UptradeLoading from './UptradeLoading'
import useAuthStore from '@/lib/auth-store'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Lazy load all section components for better code splitting
const Dashboard = lazy(() => import('./Dashboard'))
const RepDashboard = lazy(() => import('./RepDashboard'))
const TeamMetrics = lazy(() => import('./TeamMetrics'))
const Analytics = lazy(() => import('./Analytics'))
const Projects = lazy(() => import('./Projects'))
const Proposals = lazy(() => import('./Proposals'))
const FilesDrive = lazy(() => import('./FilesDrive'))
const Messages = lazy(() => import('./MessagesNew'))
const Billing = lazy(() => import('./Billing'))
const ClientManagement = lazy(() => import('./ClientManagement'))
const TeamTab = lazy(() => import('./crm/TeamTab'))
const EmailManager = lazy(() => import('@/pages/EmailManager'))
const BlogManagement = lazy(() => import('./BlogManagement'))
const PortfolioManagement = lazy(() => import('./PortfolioManagement'))
const Audits = lazy(() => import('@/pages/Audits'))
const ProposalEditor = lazy(() => import('./ProposalEditor'))
const ChatBubble = lazy(() => import('./ChatBubble'))
const FormsManager = lazy(() => import('./forms/FormsManager'))
const TenantSales = lazy(() => import('./tenant/TenantSales'))
// SEO Module sections
const SEODashboard = lazy(() => import('./seo/SEODashboard'))
const Settings = lazy(() => import('./Settings'))
// Tenants management moved to Projects.jsx

const MainLayout = () => {
  const [activeSection, setActiveSection] = useState('dashboard')
  const [activeSectionData, setActiveSectionData] = useState(null) // For passing data like proposalId
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const { user, isLoading } = useAuthStore()

  // Navigation function that can pass data
  const navigateTo = (section, data = null) => {
    setActiveSection(section)
    setActiveSectionData(data)
  }

  // Check if user is a sales rep (not admin or manager)
  const isSalesRep = user?.teamRole === 'sales_rep'

  // Debug logging
  console.log('[MainLayout] Render', { activeSection, isLoading, hasUser: !!user, userEmail: user?.email, teamRole: user?.teamRole, isSalesRep })

  // No need to check auth here - App.jsx and Protected.jsx already handle it

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        // Sales reps see their personal dashboard, admins/managers see full dashboard
        return isSalesRep ? <RepDashboard onNavigate={navigateTo} /> : <Dashboard onNavigate={navigateTo} />
      case 'audits':
        return <Audits />
      case 'analytics':
        return <Analytics />
      case 'projects':
        return <Projects onNavigate={navigateTo} />
      case 'proposals':
        return <Proposals onNavigate={navigateTo} />
      case 'files':
        return <FilesDrive />
      case 'messages':
        return <Messages />
      case 'billing':
        return <Billing />
      case 'clients':
        return <ClientManagement />
      case 'team':
        return <TeamTab />
      case 'team-metrics':
        return <TeamMetrics />
      case 'blog':
        return <BlogManagement />
      case 'portfolio':
        return <PortfolioManagement />
      case 'email':
        return <EmailManager />
      case 'forms':
        return <FormsManager />
      case 'my-sales':
        return <TenantSales />
      case 'seo':
        return <SEODashboard onNavigate={navigateTo} />
      case 'settings':
        return <Settings />
      case 'proposal-editor':
        return (
          <ProposalEditor 
            proposalId={activeSectionData?.proposalId} 
            onBack={() => navigateTo('proposals')} 
          />
        )
      // tenants case removed - now handled in Projects.jsx
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
      <aside className={`hidden lg:flex flex-col bg-[var(--glass-bg)] backdrop-blur-[var(--blur-xl)] border-r border-[var(--glass-border)] transition-all duration-300 ${isSidebarCollapsed ? 'w-16' : 'w-64'}`}>
        <Sidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
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

      {/* Floating Chat Bubble - Hidden on messages and proposal editor pages */}
      {activeSection !== 'messages' && activeSection !== 'proposal-editor' && (
        <Suspense fallback={null}>
          <ChatBubble />
        </Suspense>
      )}
    </div>
  )
}

export default MainLayout
