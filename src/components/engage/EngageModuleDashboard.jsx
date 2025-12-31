// src/components/engage/EngageModuleDashboard.jsx
// Main Engage Module dashboard - combines all engagement management components
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  MessageSquare,
  Bell,
  Megaphone,
  BarChart2,
  Settings,
  Inbox,
  ChevronRight,
  Sparkles,
  Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import useAuthStore from '@/lib/auth-store'
import api from '@/lib/api'

// Sub-components
import EngageElements from './EngageElements'
import EngageElementEditor from './EngageElementEditor'
import EngageAnalytics from './EngageAnalytics'
import EngageChatSettings from './EngageChatSettings'
import EngageChatInbox from './EngageChatInbox'

const TABS = [
  { id: 'overview', label: 'Overview', icon: Zap },
  { id: 'elements', label: 'Elements', icon: Megaphone },
  { id: 'chat', label: 'Chat Inbox', icon: Inbox },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function EngageModuleDashboard({ projectId: propProjectId, onNavigate }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [editingElement, setEditingElement] = useState(null)
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [loadingProjects, setLoadingProjects] = useState(false)
  const { currentProject, currentOrg } = useAuthStore()
  
  // Get project ID from props, current context, or selected
  const projectId = propProjectId || currentProject?.id || selectedProjectId
  const orgId = currentOrg?.id
  
  // Fetch projects if no project context
  useEffect(() => {
    if (!propProjectId && !currentProject?.id && orgId) {
      fetchProjects()
    }
  }, [propProjectId, currentProject?.id, orgId])
  
  const fetchProjects = async () => {
    try {
      setLoadingProjects(true)
      // Filter by current org to only show projects for this organization
      const { data } = await api.get(`/.netlify/functions/projects-list?organizationId=${orgId}`)
      const orgProjects = data.projects || []
      setProjects(orgProjects)
      // Auto-select first project belonging to this org
      if (orgProjects.length > 0) {
        setSelectedProjectId(orgProjects[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoadingProjects(false)
    }
  }

  // Handle element editing
  const handleEditElement = (element) => {
    setEditingElement(element)
    setActiveTab('editor')
  }

  const handleCloseEditor = () => {
    setEditingElement(null)
    setActiveTab('elements')
  }

  const handleCreateElement = () => {
    setEditingElement({ isNew: true })
    setActiveTab('editor')
  }
  
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
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-[var(--glass-border)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Engage</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Manage popups, nudges, banners, and chat for {currentProjectName}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Project Selector - show when no current project context */}
          {!currentProject?.id && projects.length > 0 && (
            <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-[200px]">
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
          
          {activeTab === 'elements' && (
            <Button onClick={handleCreateElement} className="gap-2">
              <Sparkles className="w-4 h-4" />
              Create Element
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-[var(--glass-border)] px-6">
        <nav className="flex gap-1 -mb-px">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                  isActive
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--glass-border)]"
                )}
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
                onSave={() => {
                  handleCloseEditor()
                }}
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

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <EngageChatSettings projectId={projectId} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Overview component
function EngageOverview({ projectId, onNavigate, onCreateElement }) {
  const stats = [
    { label: 'Active Elements', value: '3', icon: Megaphone, color: 'text-blue-500' },
    { label: 'Total Impressions', value: '1,247', icon: BarChart2, color: 'text-green-500' },
    { label: 'Conversion Rate', value: '3.2%', icon: Zap, color: 'text-orange-500' },
    { label: 'Chat Conversations', value: '89', icon: MessageSquare, color: 'text-purple-500' },
  ]

  const quickActions = [
    { 
      label: 'Create Popup', 
      description: 'Create a new popup or modal',
      icon: MessageSquare,
      onClick: onCreateElement 
    },
    { 
      label: 'View Chat Inbox', 
      description: 'See visitor conversations',
      icon: Inbox,
      onClick: () => onNavigate('chat') 
    },
    { 
      label: 'Manage Elements', 
      description: 'Edit your popups, banners, and nudges',
      icon: Megaphone,
      onClick: () => onNavigate('elements') 
    },
    { 
      label: 'View Analytics', 
      description: 'See engagement performance',
      icon: BarChart2,
      onClick: () => onNavigate('analytics') 
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">{stat.label}</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{stat.value}</p>
                  </div>
                  <Icon className={cn("w-8 h-8", stat.color)} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>Common tasks to manage your engagement elements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  className="flex items-center gap-3 p-4 rounded-lg bg-[var(--surface-secondary)] hover:bg-[var(--glass-bg-hover)] transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[var(--accent)]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-[var(--text-primary)]">{action.label}</p>
                    <p className="text-sm text-[var(--text-secondary)]">{action.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors" />
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Getting Started */}
      <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
        <CardHeader>
          <CardTitle className="text-lg">Getting Started</CardTitle>
          <CardDescription>Set up engagement on your website</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--surface-secondary)]">
            <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm">
              1
            </div>
            <div>
              <p className="font-medium text-[var(--text-primary)]">Add the Engage script to your site</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Include our script in your website's head or before the closing body tag.
              </p>
              <pre className="mt-2 p-3 bg-[var(--surface-primary)] rounded-md text-xs overflow-x-auto">
                {`<script src="https://portal.uptrademedia.com/engage-widget.js" data-project="${projectId || 'YOUR_PROJECT_ID'}" async></script>`}
              </pre>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--surface-secondary)]">
            <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm">
              2
            </div>
            <div>
              <p className="font-medium text-[var(--text-primary)]">Create your first element</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Create a popup, banner, or nudge to engage your visitors.
              </p>
              <Button size="sm" className="mt-2" onClick={onCreateElement}>
                Create Element
              </Button>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--surface-secondary)]">
            <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm">
              3
            </div>
            <div>
              <p className="font-medium text-[var(--text-primary)]">Monitor performance</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Track impressions, clicks, and conversions in the Analytics tab.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
