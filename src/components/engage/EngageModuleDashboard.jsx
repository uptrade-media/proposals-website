// src/components/engage/EngageModuleDashboard.jsx
// Main Engage Module dashboard - Visual engagement builder
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  MessageSquare,
  Bell,
  Megaphone,
  BarChart2,
  Inbox,
  ChevronRight,
  Sparkles,
  Loader2,
  Plus,
  Eye,
  MousePointerClick,
  Target,
  ExternalLink,
  Layers,
  PanelTop,
  Layout
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import useAuthStore from '@/lib/auth-store'
import { useBrandColors } from '@/hooks/useBrandColors'
import { projectsApi, engageApi } from '@/lib/portal-api'

// Sub-components
import EngageElements from './EngageElements'
import EngageElementEditor from './EngageElementEditor'
import EngageAnalytics from './EngageAnalytics'
import EngageChatInbox from './EngageChatInbox'
import { EngageVisualEditor } from './visual-editor'
import NudgeManager from './NudgeManager'

const TABS = [
  { id: 'overview', label: 'Overview', icon: Zap },
  { id: 'elements', label: 'Elements', icon: Layers },
  { id: 'nudges', label: 'Nudges', icon: Sparkles },
  { id: 'chat', label: 'Chat Inbox', icon: Inbox },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
]

export default function EngageModuleDashboard({ projectId: propProjectId, onNavigate }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [editingElement, setEditingElement] = useState(null)
  const [useVisualEditor, setUseVisualEditor] = useState(true)
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [stats, setStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const { currentProject, currentOrg } = useAuthStore()
  const brandColors = useBrandColors()
  
  // Get project ID from props, current context, or selected
  const projectId = propProjectId || currentProject?.id || selectedProjectId
  const orgId = currentOrg?.id
  
  // Get site URL for visual editor preview
  // The domain field comes from projects.domain
  const projectDomain = currentProject?.domain || projects.find(p => p.id === projectId)?.domain
  const siteUrl = projectDomain ? (projectDomain.startsWith('http') ? projectDomain : `https://${projectDomain}`) : null
  
  // Fetch projects if no project context
  useEffect(() => {
    if (!propProjectId && !currentProject?.id && orgId) {
      fetchProjects()
    }
  }, [propProjectId, currentProject?.id, orgId])

  // Fetch stats when project changes
  useEffect(() => {
    if (projectId) {
      fetchStats()
    }
  }, [projectId])
  
  const fetchProjects = async () => {
    try {
      setLoadingProjects(true)
      const { data } = await projectsApi.list({ organizationId: orgId })
      const orgProjects = data.projects || []
      setProjects(orgProjects)
      if (orgProjects.length > 0) {
        setSelectedProjectId(orgProjects[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoadingProjects(false)
    }
  }

  const fetchStats = async () => {
    try {
      setLoadingStats(true)
      const { data } = await engageApi.getAnalyticsOverview({ projectId, days: 30 })
      setStats(data.data || data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      // Use fallback stats
      setStats({
        totalImpressions: 0,
        totalClicks: 0,
        conversionRate: 0,
        activeElements: 0
      })
    } finally {
      setLoadingStats(false)
    }
  }

  // Handle element editing
  const handleEditElement = useCallback((elementOrId, visual = true) => {
    // Support both element object and element ID
    const element = typeof elementOrId === 'string' 
      ? { id: elementOrId } 
      : elementOrId
    setEditingElement(element)
    setUseVisualEditor(visual)
    setActiveTab(visual ? 'visual-editor' : 'editor')
  }, [])

  const handleCloseEditor = useCallback(() => {
    setEditingElement(null)
    setActiveTab('elements')
    fetchStats() // Refresh stats after editing
  }, [])

  const handleCreateElement = useCallback((useVisual = true) => {
    setEditingElement({ isNew: true })
    setUseVisualEditor(useVisual)
    setActiveTab(useVisual ? 'visual-editor' : 'editor')
  }, [])
  
  // Loading state
  if (loadingProjects) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--text-tertiary)]" />
      </div>
    )
  }
  
  // Get current project name for display
  const currentProjectName = currentProject?.title || 
    projects.find(p => p.id === selectedProjectId)?.title ||
    currentOrg?.name || 
    'your site'

  return (
    <div className="flex flex-col h-full">
      {/* Header with brand accent */}
      <div 
        className="relative p-6 border-b border-[var(--glass-border)] overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${brandColors.rgba.primary10} 0%, transparent 50%)`
        }}
      >
        {/* Subtle glow effect */}
        <div 
          className="absolute top-0 left-0 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: brandColors.primary }}
        />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
              style={{ 
                background: `linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.primaryDark} 100%)` 
              }}
            >
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Engage</h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Create popups, nudges, and banners for {currentProjectName}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Project Selector */}
            {!currentProject?.id && projects.length > 0 && (
              <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-[200px] bg-[var(--glass-bg)] border-[var(--glass-border)]">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {activeTab === 'overview' && (
              <Button 
                onClick={() => handleCreateElement(true)} 
                className="gap-2"
                style={{ 
                  backgroundColor: brandColors.primary,
                  color: 'white'
                }}
              >
                <Plus className="w-4 h-4" />
                Create Element
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-[var(--glass-border)] px-6 bg-[var(--surface-secondary)]/50">
        <nav className="flex gap-1 -mb-px">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200",
                  isActive
                    ? "text-[var(--text-primary)]"
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--glass-border)]"
                )}
                style={{
                  borderBottomColor: isActive ? brandColors.primary : 'transparent'
                }}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <EngageOverview 
                projectId={projectId}
                stats={stats}
                loadingStats={loadingStats}
                brandColors={brandColors}
                onNavigate={setActiveTab}
                onCreateElement={handleCreateElement}
              />
            </motion.div>
          )}

          {activeTab === 'elements' && (
            <motion.div
              key="elements"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <EngageElements 
                projectId={projectId} 
                onEditElement={handleEditElement}
              />
            </motion.div>
          )}

          {activeTab === 'nudges' && (
            <motion.div
              key="nudges"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <NudgeManager 
                projectId={projectId}
                orgId={orgId}
                signalEnabled={currentOrg?.features?.signalEnabled === true}
                tenantFeatures={{
                  abTesting: currentOrg?.subscription?.tier !== 'free',
                  unlimitedVariants: currentOrg?.subscription?.tier === 'enterprise',
                }}
              />
            </motion.div>
          )}

          {activeTab === 'editor' && (
            <motion.div
              key="editor"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <EngageElementEditor 
                projectId={projectId}
                element={editingElement}
                onClose={handleCloseEditor}
                onSave={handleCloseEditor}
              />
            </motion.div>
          )}

          {activeTab === 'visual-editor' && (
            <motion.div
              key="visual-editor"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full -m-6"
            >
              <EngageVisualEditor 
                projectId={projectId}
                elementId={editingElement?.id}
                element={editingElement?.isNew ? null : editingElement}
                siteUrl={siteUrl}
                onClose={handleCloseEditor}
                onSave={handleCloseEditor}
              />
            </motion.div>
          )}

          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <EngageChatInbox projectId={projectId} />
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <EngageAnalytics projectId={projectId} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Overview component with brand-colored cards
function EngageOverview({ projectId, stats, loadingStats, brandColors, onNavigate, onCreateElement }) {
  const statCards = [
    { 
      label: 'Active Elements', 
      value: stats?.activeElements || 0, 
      icon: Layers, 
      color: brandColors.primary,
      trend: null
    },
    { 
      label: 'Total Impressions', 
      value: formatNumber(stats?.totalImpressions || 0), 
      icon: Eye, 
      color: brandColors.secondary,
      trend: stats?.impressionsTrend
    },
    { 
      label: 'Total Clicks', 
      value: formatNumber(stats?.totalClicks || 0), 
      icon: MousePointerClick, 
      color: brandColors.accent,
      trend: stats?.clicksTrend
    },
    { 
      label: 'Conversion Rate', 
      value: `${(stats?.conversionRate || 0).toFixed(1)}%`, 
      icon: Target, 
      color: '#10B981',
      trend: stats?.conversionTrend
    },
  ]

  const elementTypes = [
    { 
      type: 'popup',
      label: 'Popup', 
      description: 'Modal dialogs that capture attention',
      icon: MessageSquare,
      color: brandColors.primary
    },
    { 
      type: 'banner',
      label: 'Banner', 
      description: 'Top or bottom announcement bars',
      icon: PanelTop,
      color: brandColors.secondary
    },
    { 
      type: 'nudge',
      label: 'Nudge', 
      description: 'Subtle corner prompts',
      icon: Sparkles,
      color: brandColors.accent
    },
    { 
      type: 'toast',
      label: 'Toast', 
      description: 'Notification-style messages',
      icon: Bell,
      color: '#F59E0B'
    },
  ]

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card 
              key={stat.label} 
              className="bg-card border-[var(--glass-border)] hover:border-opacity-60 transition-all duration-200"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-[var(--text-secondary)] mb-1">{stat.label}</p>
                    {loadingStats ? (
                      <div className="h-8 w-16 bg-[var(--surface-secondary)] rounded animate-pulse" />
                    ) : (
                      <p className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</p>
                    )}
                    {stat.trend !== null && stat.trend !== undefined && (
                      <p className={cn(
                        "text-xs mt-1",
                        stat.trend >= 0 ? "text-emerald-500" : "text-red-500"
                      )}>
                        {stat.trend >= 0 ? '↑' : '↓'} {Math.abs(stat.trend)}% vs last period
                      </p>
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] flex items-center justify-center">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Create New Element Section */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="w-5 h-5" style={{ color: brandColors.primary }} />
            Create New Element
          </CardTitle>
          <CardDescription>Choose an element type to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {elementTypes.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.type}
                  onClick={() => onCreateElement(true)}
                  className="group relative p-5 rounded-xl text-left transition-all duration-200 hover:scale-[1.02] bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)] border border-transparent hover:border-[var(--glass-border)]"
                  style={{
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div 
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                    style={{ 
                      backgroundColor: `${item.color}15`,
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: item.color }} />
                  </div>
                  <h3 className="font-semibold text-[var(--text-primary)] mb-1">{item.label}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{item.description}</p>
                  <ChevronRight 
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manage Elements Card */}
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="w-5 h-5" style={{ color: brandColors.primary }} />
              Your Elements
            </CardTitle>
            <CardDescription>Manage your active popups, banners, and nudges</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              onClick={() => onNavigate('elements')}
              className="w-full flex items-center gap-3 p-4 rounded-lg bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)] transition-colors text-left group"
            >
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${brandColors.primary}15` }}
              >
                <Layout className="w-5 h-5" style={{ color: brandColors.primary }} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-[var(--text-primary)]">View All Elements</p>
                <p className="text-sm text-[var(--text-secondary)]">Edit, duplicate, or manage your elements</p>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors" />
            </button>
            
            <button
              onClick={() => onNavigate('analytics')}
              className="w-full flex items-center gap-3 p-4 rounded-lg bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)] transition-colors text-left group"
            >
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${brandColors.secondary}15` }}
              >
                <BarChart2 className="w-5 h-5" style={{ color: brandColors.secondary }} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-[var(--text-primary)]">View Analytics</p>
                <p className="text-sm text-[var(--text-secondary)]">Track impressions, clicks, and conversions</p>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors" />
            </button>
          </CardContent>
        </Card>

        {/* Chat & Nudges Card */}
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5" style={{ color: brandColors.accent }} />
              Conversations & Nudges
            </CardTitle>
            <CardDescription>Monitor chat and configure smart nudges</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              onClick={() => onNavigate('chat')}
              className="w-full flex items-center gap-3 p-4 rounded-lg bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)] transition-colors text-left group"
            >
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${brandColors.accent}15` }}
              >
                <Inbox className="w-5 h-5" style={{ color: brandColors.accent }} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-[var(--text-primary)]">Chat Inbox</p>
                <p className="text-sm text-[var(--text-secondary)]">See visitor conversations</p>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors" />
            </button>
            
            <button
              onClick={() => onNavigate('nudges')}
              className="w-full flex items-center gap-3 p-4 rounded-lg bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)] transition-colors text-left group"
            >
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#8B5CF615' }}
              >
                <Sparkles className="w-5 h-5 text-purple-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-[var(--text-primary)]">Smart Nudges</p>
                <p className="text-sm text-[var(--text-secondary)]">Configure contextual prompts</p>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors" />
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Installation Notice - only show if no elements exist */}
      {stats?.activeElements === 0 && (
        <Card className="bg-gradient-to-br from-[var(--surface-secondary)] to-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${brandColors.primary}15` }}
              >
                <ExternalLink className="w-6 h-6" style={{ color: brandColors.primary }} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--text-primary)] mb-1">Install Engage on your site</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-3">
                  Add the Engage widget to your website using the Site Kit package, then create your first element.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => window.open('https://www.npmjs.com/package/@uptrade/site-kit', '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Site Kit Docs
                  </Button>
                  <Button
                    size="sm"
                    className="gap-2"
                    style={{ backgroundColor: brandColors.primary }}
                    onClick={() => onCreateElement(true)}
                  >
                    <Plus className="w-4 h-4" />
                    Create First Element
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Helper function
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num?.toString() || '0'
}
