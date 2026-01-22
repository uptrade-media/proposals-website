// src/components/reputation/ReputationModuleDashboard.jsx
// Main Reputation Module dashboard - combines all reputation management components
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star,
  MessageSquare,
  Send,
  Settings,
  BarChart2,
  Loader2,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import useAuthStore from '@/lib/auth-store'
import { projectsApi } from '@/lib/portal-api'

// Sub-pages (lazy loaded from pages/reputation)
import ReputationDashboard from '@/pages/reputation/ReputationDashboard'
import ReviewInbox from '@/pages/reputation/ReviewInbox'
import Campaigns from '@/pages/reputation/Campaigns'
import ReputationSettings from '@/pages/reputation/ReputationSettings'

const TABS = [
  { id: 'overview', label: 'Overview', icon: Star },
  { id: 'reviews', label: 'Reviews', icon: MessageSquare },
  { id: 'campaigns', label: 'Campaigns', icon: Send },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function ReputationModuleDashboard({ projectId: propProjectId, onNavigate }) {
  const [activeTab, setActiveTab] = useState('overview')
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

  // Show project selector if no project in context
  if (!projectId) {
    return (
      <div className="flex-1 p-6 bg-[var(--surface-primary)]">
        <Card className="max-w-lg mx-auto mt-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Select a Project
            </CardTitle>
            <CardDescription>
              Choose a project to manage its reputation and reviews
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingProjects ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : projects.length > 0 ? (
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No projects found. Create a project to get started.
                </p>
                <Button className="mt-4" onClick={() => onNavigate?.('projects')}>
                  Go to Projects
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <ReputationDashboard projectId={projectId} onNavigate={onNavigate} onTabChange={setActiveTab} />
      case 'reviews':
        return <ReviewInbox projectId={projectId} onNavigate={onNavigate} />
      case 'campaigns':
        return <Campaigns projectId={projectId} onNavigate={onNavigate} />
      case 'analytics':
        // Reuse dashboard with analytics focus, or create dedicated analytics later
        return <ReputationAnalyticsTab projectId={projectId} />
      case 'settings':
        return <ReputationSettings projectId={projectId} onNavigate={onNavigate} />
      default:
        return <ReputationDashboard projectId={projectId} onNavigate={onNavigate} onTabChange={setActiveTab} />
    }
  }

  return (
    <div className="flex-1 overflow-auto bg-[var(--surface-primary)]">
      {/* Header */}
      <div className="border-b border-[var(--glass-border)] bg-[var(--surface-primary)]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Star className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
                  Reputation Management
                </h1>
                <p className="text-sm text-[var(--text-secondary)]">
                  Monitor reviews, manage responses, and build your online reputation
                </p>
              </div>
            </div>
            
            {/* Project selector if needed */}
            {!currentProject?.id && projects.length > 1 && (
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Tab Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-[var(--surface-secondary)]">
              {TABS.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2"
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// Simple analytics tab placeholder - can be enhanced later
function ReputationAnalyticsTab({ projectId }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Reputation Analytics
          </CardTitle>
          <CardDescription>
            Track your reputation metrics over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-[var(--surface-secondary)]">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-500">+12%</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Review Volume Growth
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[var(--surface-secondary)]">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-500">4.6</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Average Rating (30d)
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[var(--surface-secondary)]">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-500">89%</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Response Rate
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-8 text-center text-muted-foreground">
            <BarChart2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>Detailed analytics charts coming soon</p>
            <p className="text-sm">View trends, sentiment analysis, and competitive benchmarks</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
