import { useState, useEffect, lazy, Suspense } from 'react'
import { useSearchParams, useLocation, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import TopHeader from './TopHeader'
import GlobalCommandPalette from './GlobalCommandPalette'
import UptradeLoading from './UptradeLoading'
import useAuthStore from '@/lib/auth-store'
import useMessagesStore from '@/lib/messages-store'
import usePageContextStore from '@/lib/page-context-store'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Lazy load all section components for better code splitting
const Dashboard = lazy(() => import('./Dashboard'))
const RepDashboard = lazy(() => import('./RepDashboard'))
const TeamMetrics = lazy(() => import('./TeamMetrics'))
// Analytics Module - new sidebar-based layout with per-page views
const AnalyticsModuleWrapper = lazy(() => import('./analytics/AnalyticsModuleWrapper'))
const Proposals = lazy(() => import('./Proposals'))
const FilesDrive = lazy(() => import('./FilesDrive'))
const Messages = lazy(() => import('./Messages'))
const Billing = lazy(() => import('./Billing'))
// CRM Dashboard - unified for all org types (isAgency layer handles capability filtering)
const CRMDashboard = lazy(() => import('./crm/CRMDashboard'))
const TeamTab = lazy(() => import('./crm/TeamTab'))
const TeamModule = lazy(() => import('./team/TeamModule'))
const Outreach = lazy(() => import('@/pages/Outreach'))
const BlogManagement = lazy(() => import('./BlogManagement'))
const PortfolioManagement = lazy(() => import('./PortfolioManagement'))
const Audits = lazy(() => import('@/pages/Audits'))
const ProposalEditor = lazy(() => import('./ProposalEditor'))
import ChatBubbleManager from './ChatBubbleManager'
const FormsManager = lazy(() => import('./forms/FormsManager'))
const TenantSales = lazy(() => import('./tenant/TenantSales'))
// Sales Prospecting Module
const SalesDashboard = lazy(() => import('./sales/SalesDashboard'))
// SEO Module - Motion-inspired layout
const SEOModule = lazy(() => import('../pages/seo/SEOModule'))
// Ecommerce Module (legacy)
const EcommerceModuleWrapper = lazy(() => import('./ecommerce/EcommerceModuleWrapper'))
// Commerce Module (unified products, services, classes, events, sales)
const CommerceModuleWrapper = lazy(() => import('./commerce/CommerceModuleWrapper'))
// Engage Module
const EngageModuleDashboard = lazy(() => import('./engage/EngageModuleDashboard'))
// Reputation Module
const ReputationModuleDashboard = lazy(() => import('./reputation/ReputationModuleDashboard'))
// Broadcast Module
const BroadcastModuleDashboard = lazy(() => import('./broadcast/BroadcastModuleDashboard'))
// Affiliates Module - affiliate tracking
const AffiliatesModule = lazy(() => import('./affiliates/AffiliatesModule'))
// Sync Module - calendar and scheduling
const SyncModuleDashboard = lazy(() => import('./sync/SyncModule'))
// Signal Module (v2)
const SignalModule = lazy(() => import('./signal/SignalModule'))
// Customers Module - post-sale customer management
const CustomersModuleWrapper = lazy(() => import('./customers/CustomersModuleWrapper'))
// Projects V2 Module - Three-view system
const ProjectsV2 = lazy(() => import('./projects/ProjectsV2'))
const Settings = lazy(() => import('./Settings'))
// Tenants management moved to Projects.jsx

const MainLayout = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  
  // Determine section from URL path for sidebar highlighting
  const getSectionFromPath = () => {
    const path = location.pathname
    if (path === '/') return 'dashboard'
    // Extract first segment after /
    const segment = path.split('/')[1]
    return segment || 'dashboard'
  }
  
  const [activeSection, setActiveSection] = useState(() => getSectionFromPath())
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(56)
  const [sidebarMode, setSidebarMode] = useState('hover')
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const { user, isLoading } = useAuthStore()
  
  // Get messaging methods for global initialization
  const { prefetchAll, subscribeToMessages, unsubscribeFromMessages, realtimeConnected } = useMessagesStore()

  // Sync activeSection with URL path for sidebar highlighting
  useEffect(() => {
    const pathSection = getSectionFromPath()
    if (pathSection !== activeSection) {
      setActiveSection(pathSection)
    }
  }, [location.pathname])

  // Handle sidebar section change - navigates to the route
  const handleSectionChange = (section) => {
    setActiveSection(section)
    // Navigate to the section's base route
    navigate(`/${section === 'dashboard' ? '' : section}`)
  }

  // Handle sidebar expansion state changes
  const handleSidebarExpandedChange = (isExpanded, mode) => {
    setSidebarMode(mode)
    setSidebarWidth(mode === 'expanded' ? 240 : 56)
  }

  // Update page context when section changes (for Echo awareness)
  useEffect(() => {
    if (activeSection) {
      const moduleMap = {
        'dashboard': 'dashboard',
        'analytics': 'analytics',
        'seo': 'seo',
        'engage': 'engage',
        'outreach': 'email',
        'email': 'email',
        'messages': 'messages',
        'proposals': 'proposals',
        'billing': 'billing',
        'clients': 'crm',
        'prospects': 'crm',
        'crm': 'crm',
        'team': 'team',
        'sales': 'sales',
        'settings': 'settings',
        'files': 'files',
        'blog': 'content',
        'portfolio': 'content',
        'signal': 'signal',
        'broadcast': 'broadcast',
        'affiliates': 'affiliates',
        'ecommerce': 'commerce',
        'commerce': 'commerce',
        'forms': 'forms',
        'sync': 'sync',
        'projects': 'projects',
      }
      const module = moduleMap[activeSection] || activeSection
      usePageContextStore.getState().setModule(module)
    }
  }, [activeSection])

  // Initialize messaging system on app mount
  useEffect(() => {
    if (!user?.id || !user?.org_id || isLoading) return
    
    console.log('[MainLayout] Initializing messaging system for user:', user.email)
    prefetchAll()
    
    if (!realtimeConnected) {
      subscribeToMessages(user.id, user.org_id, user.name || 'User')
    }
    
    return () => {
      unsubscribeFromMessages()
    }
  }, [user?.id, user?.org_id, isLoading])

  // Navigation function for child components
  const navigateTo = (section, data = null) => {
    handleSectionChange(section)
  }

  // Check if user is a sales rep
  const isSalesRep = user?.teamRole === 'sales_rep'
  
  // Modules that use full height (have their own sidebars/scrolling)
  const fullHeightModules = ['broadcast', 'affiliates', 'commerce', 'seo', 'crm', 'sync', 'analytics', 'projects', 'engage', 'reputation', 'customers', 'signal', 'forms', 'team', 'messages', 'files']
  const isFullHeight = fullHeightModules.includes(activeSection)

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--surface-primary)]/80 backdrop-blur-[var(--blur-sm)]">
        <UptradeLoading />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Header - Always persistent */}
      <TopHeader 
        onNavigate={navigateTo}
        onOpenSearch={() => setCommandPaletteOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile Sidebar Toggle */}
        <div className="lg:hidden fixed top-14 left-4 z-50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="shadow-md bg-card"
          >
            {isMobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Desktop Sidebar - Always persistent */}
        <div className="hidden lg:block relative">
          <div className="h-full flex-shrink-0 transition-all duration-150" style={{ width: sidebarWidth }} />
          <aside className="absolute inset-y-0 left-0 z-20">
            <Sidebar
              activeSection={activeSection}
              onSectionChange={handleSectionChange}
              isCollapsed={true}
              minimal={true}
              onExpandedChange={handleSidebarExpandedChange}
            />
          </aside>
        </div>

        {/* Mobile Sidebar */}
        {isMobileSidebarOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <aside className="lg:hidden fixed inset-y-0 left-0 w-64 bg-card border-r border-border/50 shadow-xl z-[101] overflow-y-auto">
              <Sidebar
                activeSection={activeSection}
                onSectionChange={(section) => {
                  handleSectionChange(section)
                  setIsMobileSidebarOpen(false)
                }}
                isMobile={true}
              />
            </aside>
          </>
        )}

        {/* Main Content - Uses React Router for nested routes */}
        <main className={`flex-1 ${isFullHeight ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          }>
            <div className={isFullHeight ? 'h-full' : 'p-6 lg:p-8'}>
              <Routes>
                {/* Dashboard */}
                <Route index element={isSalesRep ? <RepDashboard onNavigate={navigateTo} /> : <Dashboard onNavigate={navigateTo} />} />
                <Route path="dashboard" element={isSalesRep ? <RepDashboard onNavigate={navigateTo} /> : <Dashboard onNavigate={navigateTo} />} />
                
                {/* SEO Module - supports nested routes like /seo/dashboard, /seo/keywords, etc */}
                <Route path="seo/*" element={<SEOModule />} />
                
                {/* Analytics Module */}
                <Route path="analytics/*" element={<AnalyticsModuleWrapper onNavigate={navigateTo} />} />
                
                {/* Projects */}
                <Route path="projects/*" element={<ProjectsV2 onNavigate={navigateTo} />} />
                
                {/* CRM - all variations route to same component */}
                <Route path="crm/*" element={<CRMDashboard />} />
                <Route path="clients/*" element={<CRMDashboard />} />
                <Route path="prospects/*" element={<CRMDashboard />} />
                
                {/* Commerce Module */}
                <Route path="commerce/*" element={<CommerceModuleWrapper onNavigate={navigateTo} />} />
                <Route path="ecommerce/*" element={<EcommerceModuleWrapper onNavigate={navigateTo} />} />
                
                {/* Engage Module */}
                <Route path="engage/*" element={<EngageModuleDashboard onNavigate={navigateTo} />} />
                
                {/* Sync Module */}
                <Route path="sync/*" element={<SyncModuleDashboard onNavigate={navigateTo} />} />
                
                {/* Signal AI */}
                <Route path="signal/*" element={<SignalModule onNavigate={navigateTo} />} />
                
                {/* Reputation */}
                <Route path="reputation/*" element={<ReputationModuleDashboard onNavigate={navigateTo} />} />
                
                {/* Broadcast */}
                <Route path="broadcast/*" element={<BroadcastModuleDashboard onNavigate={navigateTo} />} />
                
                {/* Affiliates */}
                <Route path="affiliates/*" element={<AffiliatesModule onNavigate={navigateTo} />} />
                
                {/* Customers */}
                <Route path="customers/*" element={<CustomersModuleWrapper onNavigate={navigateTo} />} />
                
                {/* Team */}
                <Route path="team/*" element={<TeamModule />} />
                <Route path="users/*" element={<TeamModule />} />
                <Route path="team-metrics" element={<TeamMetrics />} />
                
                {/* Forms */}
                <Route path="forms/*" element={<FormsManager />} />
                
                {/* Simple pages */}
                <Route path="audits" element={<Audits />} />
                <Route path="proposals" element={<Proposals onNavigate={navigateTo} />} />
                <Route path="files/*" element={<FilesDrive />} />
                <Route path="messages/*" element={<Messages />} />
                <Route path="billing" element={<Billing />} />
                <Route path="email/*" element={<Outreach />} />
                <Route path="blog" element={<BlogManagement />} />
                <Route path="portfolio" element={<PortfolioManagement />} />
                <Route path="my-sales" element={<TenantSales />} />
                <Route path="sales/*" element={<SalesDashboard />} />
                <Route path="settings" element={<Settings />} />
                
                {/* Proposal Editor (special case) */}
                <Route path="proposal-editor/:proposalId?" element={<ProposalEditor onBack={() => navigateTo('proposals')} />} />
                
                {/* Catch-all - redirect to dashboard instead of rendering it */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </Suspense>
        </main>
      </div>

      {/* Floating Chat Bubble */}
      <Suspense fallback={null}>
        <ChatBubbleManager hidden={activeSection === 'messages'} />
      </Suspense>

      {/* Global Command Palette */}
      <GlobalCommandPalette 
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onNavigate={navigateTo}
      />
    </div>
  )
}

export default MainLayout
