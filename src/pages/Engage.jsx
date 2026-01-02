// src/pages/Engage.jsx
// Main Engage module page - Live chat management

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Settings, BarChart3, Loader2, Zap } from 'lucide-react'
import EngageChatInbox from '@/components/engage/EngageChatInbox'
import EngageChatSettings from '@/components/engage/EngageChatSettings'
import EngageElements from '@/components/engage/EngageElements'
import EngageElementEditor from '@/components/engage/EngageElementEditor'
import EngageAnalytics from '@/components/engage/EngageAnalytics'
import useAuthStore from '@/lib/auth-store'
import api from '@/lib/api'

export default function Engage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(searchParams.get('project') || '')
  const [loading, setLoading] = useState(true)
  const [editingElementId, setEditingElementId] = useState(null)
  const activeTab = searchParams.get('tab') || 'inbox'
  const { user } = useAuthStore()

  // Listen for Echo navigation requests to open elements
  useEffect(() => {
    const handleOpenElement = (event) => {
      const { projectId, elementId } = event.detail
      // Update project if different
      if (projectId && projectId !== selectedProjectId) {
        setSelectedProjectId(projectId)
        setSearchParams({ tab: 'elements', project: projectId })
      }
      // Open the element editor
      if (elementId) {
        setEditingElementId(elementId)
      }
    }
    
    window.addEventListener('echo:openElement', handleOpenElement)
    return () => window.removeEventListener('echo:openElement', handleOpenElement)
  }, [selectedProjectId, setSearchParams])

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/.netlify/functions/projects-list')
      setProjects(data.projects || [])
      
      // Auto-select first project if none selected
      if (!selectedProjectId && data.projects?.length > 0) {
        setSelectedProjectId(data.projects[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (tab) => {
    setSearchParams({ tab, project: selectedProjectId })
  }

  const handleProjectChange = (projectId) => {
    setSelectedProjectId(projectId)
    setSearchParams({ tab: activeTab, project: projectId })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MessageCircle className="w-8 h-8 text-primary" />
            </div>
            Engage
          </h1>
          <p className="text-muted-foreground mt-2">
            Live chat and conversion optimization for your websites
          </p>
        </div>

        {/* Project Selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Project:</span>
          <Select value={selectedProjectId} onValueChange={handleProjectChange}>
            <SelectTrigger className="w-64">
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
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="inbox" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Chat Inbox
          </TabsTrigger>
          <TabsTrigger value="elements" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Elements
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Widget Settings
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-6">
          <EngageChatInbox projectId={selectedProjectId} />
        </TabsContent>

        <TabsContent value="elements" className="mt-6">
          {editingElementId ? (
            <EngageElementEditor 
              elementId={editingElementId} 
              onBack={() => setEditingElementId(null)}
            />
          ) : (
            <EngageElements 
              projectId={selectedProjectId}
              onEditElement={(id) => setEditingElementId(id)}
            />
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          {selectedProjectId ? (
            <EngageChatSettings projectId={selectedProjectId} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Select a project to configure chat settings
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <EngageAnalytics projectId={selectedProjectId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
