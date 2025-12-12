import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ProposalTemplate from './ProposalTemplate'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/lib/toast'
import { EmptyState } from './EmptyState'
import { ConfirmDialog } from './ConfirmDialog'
import { 
  Plus, 
  Calendar, 
  DollarSign, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Eye,
  Edit,
  Loader2,
  Send,
  Trash2,
  Sparkles
} from 'lucide-react'
import useProjectsStore from '@/lib/projects-store'
import useAuthStore from '@/lib/auth-store'
import api from '@/lib/api'
import { ProjectSkeleton } from './skeletons/ProjectSkeleton'
import ProposalAIDialog from './ProposalAIDialog'
import EditProposalDialog from './EditProposalDialog'
import { ChevronDown, ChevronUp, BarChart2, MousePointer, Timer, TrendingUp, Activity } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'

// Proposal Row component for consistent display (Admin view) with expandable analytics
function ProposalRow({ proposal, onView, onEdit, onDelete, showSignedDate = false }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [analytics, setAnalytics] = useState(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)

  const getStatusBadge = (status) => {
    switch (status) {
      case 'signed':
      case 'accepted':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Signed</Badge>
      case 'sent':
        return <Badge variant="outline" className="border-blue-200 text-blue-600">Sent</Badge>
      case 'viewed':
        return <Badge variant="outline" className="border-purple-200 text-purple-600">Viewed</Badge>
      case 'draft':
        return <Badge variant="outline">Draft</Badge>
      case 'declined':
        return <Badge variant="outline" className="border-red-200 text-red-600">Declined</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return '0s'
    if (seconds < 60) return `${Math.round(seconds)}s`
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }

  const formatDateTime = (dateStr) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const fetchAnalytics = async () => {
    if (analytics || loadingAnalytics) return
    setLoadingAnalytics(true)
    try {
      const response = await api.get(`/.netlify/functions/proposals-analytics?id=${proposal.id}`)
      setAnalytics(response.data.analytics)
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
    } finally {
      setLoadingAnalytics(false)
    }
  }

  const handleToggle = () => {
    if (!isExpanded && !analytics) {
      fetchAnalytics()
    }
    setIsExpanded(!isExpanded)
  }

  // Don't show analytics toggle for drafts
  const showAnalytics = proposal.status !== 'draft'

  return (
    <Collapsible open={isExpanded} onOpenChange={handleToggle}>
      <div className="border border-[var(--glass-border)] rounded-xl bg-[var(--glass-bg)] backdrop-blur-sm hover:bg-[var(--surface-secondary)] transition-colors overflow-hidden">
        {/* Main Row */}
        <div className="flex items-center justify-between p-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-[var(--text-primary)] truncate">{proposal.title}</h4>
              {getStatusBadge(proposal.status)}
              {showAnalytics && analytics?.summary?.engagementScore > 0 && (
                <Badge variant="outline" className="border-amber-200 text-amber-600 gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {analytics.summary.engagementScore}%
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-[var(--text-secondary)] truncate">
                {proposal.contact?.name || proposal.client_name || 'Unknown client'}
                {(proposal.contact?.email || proposal.client_email) && (
                  <span className="text-[var(--text-tertiary)]"> ({proposal.contact?.email || proposal.client_email})</span>
                )}
              </p>
              {proposal.totalAmount && (
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  ${proposal.totalAmount.toLocaleString()}
                </span>
              )}
            </div>
            {showSignedDate && proposal.signedAt && (
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Signed on {formatDate(proposal.signedAt)}
                {proposal.fullyExecutedAt && (
                  <span className="text-[var(--text-tertiary)]"> • Fully executed {formatDate(proposal.fullyExecutedAt)}</span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            {showAnalytics && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-[var(--text-secondary)]">
                  <BarChart2 className="w-3.5 h-3.5 mr-1" />
                  Analytics
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
                </Button>
              </CollapsibleTrigger>
            )}
            <Button variant="outline" size="sm" onClick={onView}>
              <Eye className="w-3 h-3 mr-1" />
              View
            </Button>
            {!['signed', 'accepted'].includes(proposal.status) && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Button>
            )}
            {!['signed', 'accepted'].includes(proposal.status) && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Expandable Analytics Panel */}
        <CollapsibleContent>
          <div className="border-t border-[var(--glass-border)] bg-[var(--surface-secondary)]/50 px-4 py-3">
            {loadingAnalytics ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-[var(--text-tertiary)]" />
                <span className="ml-2 text-sm text-[var(--text-secondary)]">Loading analytics...</span>
              </div>
            ) : analytics ? (
              <div className="space-y-4">
                {/* Summary Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[var(--glass-bg)] rounded-lg p-3 border border-[var(--glass-border)]">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs mb-1">
                      <Eye className="w-3.5 h-3.5" />
                      Total Views
                    </div>
                    <p className="text-xl font-semibold text-[var(--text-primary)]">
                      {analytics.summary.totalViews}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {analytics.summary.uniqueViewDays} unique day{analytics.summary.uniqueViewDays !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="bg-[var(--glass-bg)] rounded-lg p-3 border border-[var(--glass-border)]">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs mb-1">
                      <Timer className="w-3.5 h-3.5" />
                      Time Spent
                    </div>
                    <p className="text-xl font-semibold text-[var(--text-primary)]">
                      {formatTime(analytics.summary.totalTimeSpent)}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      Total viewing time
                    </p>
                  </div>

                  <div className="bg-[var(--glass-bg)] rounded-lg p-3 border border-[var(--glass-border)]">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs mb-1">
                      <MousePointer className="w-3.5 h-3.5" />
                      Scroll Depth
                    </div>
                    <p className="text-xl font-semibold text-[var(--text-primary)]">
                      {analytics.summary.maxScrollDepth}%
                    </p>
                    <Progress value={analytics.summary.maxScrollDepth} className="h-1.5 mt-1" />
                  </div>

                  <div className="bg-[var(--glass-bg)] rounded-lg p-3 border border-[var(--glass-border)]">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs mb-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Engagement
                    </div>
                    <p className="text-xl font-semibold text-[var(--text-primary)]">
                      {analytics.summary.engagementScore}%
                    </p>
                    <Progress 
                      value={analytics.summary.engagementScore} 
                      className={`h-1.5 mt-1 ${
                        analytics.summary.engagementScore >= 70 ? '[&>div]:bg-emerald-500' :
                        analytics.summary.engagementScore >= 40 ? '[&>div]:bg-amber-500' :
                        '[&>div]:bg-red-500'
                      }`} 
                    />
                  </div>
                </div>

                {/* Timeline / Activity */}
                {analytics.timeline.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" />
                      Recent Activity
                    </h5>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {analytics.timeline.slice(0, 8).map((event, i) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-[var(--glass-bg)] rounded px-2 py-1.5">
                          <span className="text-[var(--text-secondary)] capitalize">
                            {event.action.replace(/_/g, ' ')}
                            {event.metadata?.section && (
                              <span className="text-[var(--text-tertiary)]"> - {event.metadata.section}</span>
                            )}
                            {event.metadata?.scrollDepth && (
                              <span className="text-[var(--text-tertiary)]"> ({event.metadata.scrollDepth}%)</span>
                            )}
                          </span>
                          <span className="text-[var(--text-tertiary)]">
                            {formatDateTime(event.timestamp)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* First View / Last Activity */}
                <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)] pt-1 border-t border-[var(--glass-border)]">
                  {analytics.summary.firstView && (
                    <span>First viewed: {formatDateTime(analytics.summary.firstView)}</span>
                  )}
                  {analytics.summary.lastActivity && (
                    <span>Last activity: {formatDateTime(analytics.summary.lastActivity)}</span>
                  )}
                  {analytics.summary.signatureStarted && (
                    <Badge variant="outline" className="border-amber-200 text-amber-600 text-xs">
                      Signature started
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-[var(--text-secondary)]">
                <BarChart2 className="w-8 h-8 mx-auto mb-2 text-[var(--text-tertiary)]" />
                <p className="text-sm">No analytics data yet</p>
                <p className="text-xs text-[var(--text-tertiary)]">Client hasn't viewed this proposal</p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// Client Proposal Row - Simpler version for clients
function ClientProposalRow({ proposal, onView, showSignedDate = false }) {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'signed':
      case 'accepted':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Signed</Badge>
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Ready for Review</Badge>
      case 'viewed':
        return <Badge className="bg-purple-100 text-purple-700 border-purple-200">In Review</Badge>
      case 'draft':
        return <Badge variant="outline">Draft</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  return (
    <div className="flex items-center justify-between p-4 border border-[var(--glass-border)] rounded-xl bg-[var(--glass-bg)] backdrop-blur-sm hover:bg-[var(--surface-secondary)] transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-[var(--text-primary)] truncate">{proposal.title}</h4>
          {getStatusBadge(proposal.status)}
        </div>
        <div className="flex items-center gap-3 mt-1">
          {proposal.totalAmount && (
            <span className="text-sm font-medium text-[var(--text-primary)]">
              ${proposal.totalAmount.toLocaleString()}
            </span>
          )}
          {proposal.createdAt && (
            <span className="text-sm text-[var(--text-secondary)]">
              Sent {formatDate(proposal.createdAt)}
            </span>
          )}
        </div>
        {showSignedDate && proposal.signedAt && (
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            You signed on {formatDate(proposal.signedAt)}
            {proposal.fullyExecutedAt && (
              <span className="text-[var(--text-tertiary)]"> • Contract executed {formatDate(proposal.fullyExecutedAt)}</span>
            )}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 ml-4">
        <Button 
          variant={['sent', 'viewed'].includes(proposal.status) ? 'default' : 'outline'} 
          size="sm" 
          onClick={onView}
          className={['sent', 'viewed'].includes(proposal.status) ? 'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]' : ''}
        >
          <Eye className="w-3 h-3 mr-1" />
          {['sent', 'viewed'].includes(proposal.status) ? 'Review & Sign' : 'View'}
        </Button>
      </div>
    </div>
  )
}

const Projects = ({ onNavigate }) => {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const { 
    projects, 
    fetchProjects, 
    createProject, 
    updateProject,
    deleteProject,
    isLoading, 
    error, 
    clearError 
  } = useProjectsStore()
  
  const hasFetchedRef = useRef(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [viewingProposal, setViewingProposal] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'planning',
    budget: '',
    start_date: '',
    end_date: ''
  })

  // Admin-specific state
  const [proposals, setProposals] = useState([])
  const [clients, setClients] = useState([])
  const [editingProposal, setEditingProposal] = useState(null)
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, title: '' })
  const [deleteProposalDialog, setDeleteProposalDialog] = useState({ open: false, id: null, title: '' })
  const [showAIProposalDialog, setShowAIProposalDialog] = useState(false)

  // Fetch data only once on mount
  useEffect(() => {
    if (hasFetchedRef.current) return
    
    console.log('[Projects] Fetching initial data')
    hasFetchedRef.current = true
    
    fetchProjects()
    // Both admin and client need proposals now
    fetchProposals()
    if (isAdmin) {
      fetchClients()
    }
  }, []) // Empty dependency array - only run once

  const fetchProposals = async () => {
    try {
      const response = await api.get('/.netlify/functions/proposals-list')
      setProposals(response.data.proposals || [])
    } catch (err) {
      console.error('Failed to fetch proposals:', err)
    }
  }

  const fetchClients = async () => {
    try {
      const response = await api.get('/.netlify/functions/admin-clients-list')
      setClients(response.data.clients || [])
    } catch (err) {
      console.error('Failed to fetch clients:', err)
    }
  }

  const handleDeleteProposal = async () => {
    if (!deleteProposalDialog.id) return

    try {
      const response = await api.delete(`/.netlify/functions/proposals-delete?id=${deleteProposalDialog.id}`)
      
      if (response.data.success) {
        toast.success('Proposal deleted successfully!')
        fetchProposals()
      }
    } catch (err) {
      console.error('Failed to delete proposal:', err)
      const errorMessage = err.response?.data?.error || 'Failed to delete proposal'
      toast.error(errorMessage)
    } finally {
      setDeleteProposalDialog({ open: false, id: null, title: '' })
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-[var(--accent-success)]/20 text-[var(--accent-success)] border-[var(--accent-success)]/30'
      case 'in_progress':
        return 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border-[var(--brand-primary)]/30'
      case 'review':
        return 'bg-[var(--accent-warning)]/20 text-[var(--accent-warning)] border-[var(--accent-warning)]/30'
      case 'planning':
        return 'bg-[var(--surface-tertiary)] text-[var(--text-secondary)] border-[var(--glass-border)]'
      case 'on_hold':
        return 'bg-[var(--accent-error)]/20 text-[var(--accent-error)] border-[var(--accent-error)]/30'
      default:
        return 'bg-[var(--surface-tertiary)] text-[var(--text-secondary)] border-[var(--glass-border)]'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />
      case 'in_progress':
        return <Clock className="w-4 h-4" />
      case 'review':
        return <AlertCircle className="w-4 h-4" />
      case 'on_hold':
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    if (error) {
      clearError()
    }
  }

  const resetForm = () => {
    setFormData({
      contactId: '',
      title: '',
      description: '',
      status: 'planning',
      budget: '',
      start_date: '',
      end_date: ''
    })
  }

  const handleCreateProject = async (e) => {
    e.preventDefault()
    
    const projectData = {
      ...formData,
      budget: formData.budget ? parseFloat(formData.budget) : null
    }
    
    const result = await createProject(projectData)
    
    if (result.success) {
      toast.success('Project created successfully!')
      setIsCreateDialogOpen(false)
      resetForm()
    }
  }

  const handleEditProject = async (e) => {
    e.preventDefault()
    
    if (!selectedProject) return
    
    const projectData = {
      ...formData,
      budget: formData.budget ? parseFloat(formData.budget) : null
    }
    
    const result = await updateProject(selectedProject.id, projectData)
    
    if (result.success) {
      toast.success('Project updated successfully!')
      setIsEditDialogOpen(false)
      setSelectedProject(null)
      resetForm()
    }
  }

  const handleDeleteProject = async (projectId) => {
    const result = await deleteProject(projectId)
    if (result.success) {
      toast.success('Project deleted successfully!')
    } else {
      toast.error(result.error || 'Failed to delete project')
    }
  }

  const openEditDialog = (project) => {
    setSelectedProject(project)
    setFormData({
      title: project.title || '',
      description: project.description || '',
      status: project.status || 'planning',
      budget: project.budget ? project.budget.toString() : '',
      start_date: project.start_date || '',
      end_date: project.end_date || ''
    })
    setIsEditDialogOpen(true)
  }

  const canCreateProject = user?.role === 'admin' || user?.role === 'client_admin'

  // Navigate to proposal editor using MainLayout navigation
  const handleViewProposal = (proposalId) => {
    if (onNavigate) {
      onNavigate('proposal-editor', { proposalId })
    } else {
      // Fallback to inline view if onNavigate not available
      setViewingProposal(proposalId)
    }
  }

  // If viewing a proposal inline (fallback), show the proposal template
  if (viewingProposal) {
    const proposal = proposals.find(p => p.id === viewingProposal)
    return (
      <ProposalTemplate 
        proposal={proposal}
        proposalId={viewingProposal} 
        onBack={() => setViewingProposal(null)} 
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Projects</h1>
          <p className="text-[var(--text-secondary)]">Manage your projects and track progress</p>
        </div>
        {canCreateProject && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="glass-primary">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Add a new project to track progress and manage proposals.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateProject} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="contactId">Client *</Label>
                  <Select
                    value={formData.contactId}
                    onValueChange={(value) => handleFormChange('contactId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} ({client.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="title">Project Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleFormChange('title', e.target.value)}
                    placeholder="Enter project title"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    placeholder="Project description"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => handleFormChange('start_date', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => handleFormChange('end_date', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget ($)</Label>
                  <Input
                    id="budget"
                    type="number"
                    step="0.01"
                    value={formData.budget}
                    onChange={(e) => handleFormChange('budget', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isLoading || !formData.contactId || !formData.title}
                    variant="glass-primary"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Project'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Success/Error Messages removed - now using toast notifications */}

      {/* Admin View with Tabs */}
      {isAdmin ? (
        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="proposals">Proposals</TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-6">
            {/* Projects Grid for Admin */}
            {isLoading && projects.length === 0 ? (
              <div className="space-y-4">
                <ProjectSkeleton />
                <ProjectSkeleton />
                <ProjectSkeleton />
              </div>
            ) : projects.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No projects yet"
                description="Create your first project to get started with managing proposals and tracking progress."
                actionLabel="Create First Project"
                onAction={() => setIsCreateDialogOpen(true)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <Card key={project.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{project.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {project.description || 'No description provided'}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(project.status)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(project.status)}
                            <span className="capitalize">{project.status.replace('_', ' ')}</span>
                          </div>
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center text-[var(--text-secondary)]">
                          <FileText className="w-4 h-4 mr-2" />
                          {project.proposals_count || 0} Proposals
                        </div>
                        <div className="flex items-center text-[var(--text-secondary)]">
                          <FileText className="w-4 h-4 mr-2" />
                          {project.files_count || 0} Files
                        </div>
                        {project.start_date && (
                          <div className="flex items-center text-[var(--text-secondary)]">
                            <Calendar className="w-4 h-4 mr-2" />
                            {new Date(project.start_date).toLocaleDateString()}
                          </div>
                        )}
                        {project.budget && (
                          <div className="flex items-center text-[var(--text-secondary)]">
                            <DollarSign className="w-4 h-4 mr-2" />
                            ${project.budget.toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => openEditDialog(project)}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteDialog({ open: true, id: project.id, title: project.title })}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="proposals" className="space-y-6">
            {/* Admin Proposal Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Manage Proposals</CardTitle>
                    <CardDescription>Create and send proposals to clients</CardDescription>
                  </div>
                  <ProposalAIDialog 
                    clients={clients}
                    onNavigate={onNavigate}
                    open={showAIProposalDialog}
                    onOpenChange={setShowAIProposalDialog}
                    onSuccess={(proposal) => {
                      setProposals([proposal, ...proposals])
                      toast.success(`Proposal "${proposal.title}" generated!`)
                    }}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {/* Sub-tabs for Active vs Signed */}
                <Tabs defaultValue="active" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="active" className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Active
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {proposals.filter(p => !['signed', 'accepted', 'declined'].includes(p.status)).length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="signed" className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Signed
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-emerald-100 text-emerald-700">
                        {proposals.filter(p => ['signed', 'accepted'].includes(p.status)).length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="declined" className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Declined
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {proposals.filter(p => p.status === 'declined').length}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>

                  {/* Active Proposals */}
                  <TabsContent value="active" className="space-y-2 mt-0">
                    {proposals.filter(p => !['signed', 'accepted', 'declined'].includes(p.status)).length === 0 ? (
                      <EmptyState
                        icon={Send}
                        title="No active proposals"
                        description="Create your first proposal to send to clients."
                        actionLabel="Create Proposal"
                        onAction={() => setShowAIProposalDialog(true)}
                      />
                    ) : (
                      proposals.filter(p => !['signed', 'accepted', 'declined'].includes(p.status)).map((proposal) => (
                        <ProposalRow 
                          key={proposal.id} 
                          proposal={proposal}
                          onView={() => handleViewProposal(proposal.id)}
                          onEdit={() => setEditingProposal(proposal)}
                          onDelete={() => setDeleteProposalDialog({ open: true, id: proposal.id, title: proposal.title })}
                        />
                      ))
                    )}
                  </TabsContent>

                  {/* Signed/Accepted Proposals */}
                  <TabsContent value="signed" className="space-y-2 mt-0">
                    {proposals.filter(p => ['signed', 'accepted'].includes(p.status)).length === 0 ? (
                      <div className="text-center py-8 text-[var(--text-secondary)]">
                        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
                        <p className="font-medium">No signed proposals yet</p>
                        <p className="text-sm">Proposals will appear here once clients sign them.</p>
                      </div>
                    ) : (
                      proposals.filter(p => ['signed', 'accepted'].includes(p.status)).map((proposal) => (
                        <ProposalRow 
                          key={proposal.id} 
                          proposal={proposal}
                          onView={() => handleViewProposal(proposal.id)}
                          onEdit={() => setEditingProposal(proposal)}
                          onDelete={() => setDeleteProposalDialog({ open: true, id: proposal.id, title: proposal.title })}
                          showSignedDate
                        />
                      ))
                    )}
                  </TabsContent>

                  {/* Declined Proposals */}
                  <TabsContent value="declined" className="space-y-2 mt-0">
                    {proposals.filter(p => p.status === 'declined').length === 0 ? (
                      <div className="text-center py-8 text-[var(--text-secondary)]">
                        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
                        <p className="font-medium">No declined proposals</p>
                        <p className="text-sm">Proposals that clients decline will appear here.</p>
                      </div>
                    ) : (
                      proposals.filter(p => p.status === 'declined').map((proposal) => (
                        <ProposalRow 
                          key={proposal.id} 
                          proposal={proposal}
                          onView={() => handleViewProposal(proposal.id)}
                          onEdit={() => setEditingProposal(proposal)}
                          onDelete={() => setDeleteProposalDialog({ open: true, id: proposal.id, title: proposal.title })}
                        />
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Edit Proposal Dialog */}
            {editingProposal && (
              <EditProposalDialog
                proposal={editingProposal}
                isOpen={!!editingProposal}
                onClose={() => setEditingProposal(null)}
                onSuccess={(updated) => {
                  setProposals(proposals.map(p => p.id === updated.id ? updated : p))
                  setEditingProposal(null)
                  toast.success('Proposal updated!')
                }}
              />
            )}
          </TabsContent>
        </Tabs>
      ) : (
        /* Client View - Projects & Proposals Tabs */
        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList>
            <TabsTrigger value="projects" className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Projects
              {projects.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {projects.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="proposals" className="flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" />
              Proposals
              {proposals.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {proposals.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Projects Tab Content */}
          <TabsContent value="projects" className="space-y-6">
            {isLoading && projects.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
              </div>
            ) : projects.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
                  <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No projects yet</h3>
                  <p className="text-[var(--text-secondary)] text-center mb-4">
                    No projects have been created for your account yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <Card key={project.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{project.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {project.description || 'No description provided'}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(project.status)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(project.status)}
                            <span className="capitalize">{project.status.replace('_', ' ')}</span>
                          </div>
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center text-[var(--text-secondary)]">
                          <FileText className="w-4 h-4 mr-2" />
                          {project.proposals_count || 0} Proposals
                        </div>
                        <div className="flex items-center text-[var(--text-secondary)]">
                          <FileText className="w-4 h-4 mr-2" />
                          {project.files_count || 0} Files
                        </div>
                        {project.start_date && (
                          <div className="flex items-center text-[var(--text-secondary)]">
                            <Calendar className="w-4 h-4 mr-2" />
                            {new Date(project.start_date).toLocaleDateString()}
                          </div>
                        )}
                        {project.budget && (
                          <div className="flex items-center text-[var(--text-secondary)]">
                            <DollarSign className="w-4 h-4 mr-2" />
                            ${parseFloat(project.budget).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                        {project.proposals_count > 0 && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewProposal(project.proposal_id || project.id)}
                            className="border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            View Proposal
                          </Button>
                        )}
                        {canCreateProject && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditDialog(project)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteDialog({ open: true, id: project.id, title: project.title })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Proposals Tab Content */}
          <TabsContent value="proposals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Proposals</CardTitle>
                <CardDescription>View proposals sent to you and their status</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Sub-tabs for Pending vs Signed */}
                <Tabs defaultValue="pending" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="pending" className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Pending Review
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {proposals.filter(p => ['sent', 'viewed', 'draft'].includes(p.status)).length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="signed" className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Signed
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-emerald-100 text-emerald-700">
                        {proposals.filter(p => ['signed', 'accepted'].includes(p.status)).length}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>

                  {/* Pending Proposals */}
                  <TabsContent value="pending" className="space-y-2 mt-0">
                    {proposals.filter(p => ['sent', 'viewed', 'draft'].includes(p.status)).length === 0 ? (
                      <div className="text-center py-8 text-[var(--text-secondary)]">
                        <Send className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
                        <p className="font-medium">No pending proposals</p>
                        <p className="text-sm">When we send you a new proposal, it will appear here.</p>
                      </div>
                    ) : (
                      proposals.filter(p => ['sent', 'viewed', 'draft'].includes(p.status)).map((proposal) => (
                        <ClientProposalRow 
                          key={proposal.id} 
                          proposal={proposal}
                          onView={() => handleViewProposal(proposal.id)}
                        />
                      ))
                    )}
                  </TabsContent>

                  {/* Signed Proposals */}
                  <TabsContent value="signed" className="space-y-2 mt-0">
                    {proposals.filter(p => ['signed', 'accepted'].includes(p.status)).length === 0 ? (
                      <div className="text-center py-8 text-[var(--text-secondary)]">
                        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
                        <p className="font-medium">No signed proposals yet</p>
                        <p className="text-sm">Proposals you've signed will appear here.</p>
                      </div>
                    ) : (
                      proposals.filter(p => ['signed', 'accepted'].includes(p.status)).map((proposal) => (
                        <ClientProposalRow 
                          key={proposal.id} 
                          proposal={proposal}
                          onView={() => handleViewProposal(proposal.id)}
                          showSignedDate
                        />
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update project details and status.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditProject} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="edit_title">Project Title *</Label>
              <Input
                id="edit_title"
                value={formData.title}
                onChange={(e) => handleFormChange('title', e.target.value)}
                placeholder="Enter project title"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                placeholder="Project description"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit_status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleFormChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_start_date">Start Date</Label>
                <Input
                  id="edit_start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleFormChange('start_date', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit_end_date">End Date</Label>
                <Input
                  id="edit_end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleFormChange('end_date', e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit_budget">Budget ($)</Label>
              <Input
                id="edit_budget"
                type="number"
                step="0.01"
                value={formData.budget}
                onChange={(e) => handleFormChange('budget', e.target.value)}
                placeholder="0.00"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsEditDialogOpen(false)
                  setSelectedProject(null)
                  resetForm()
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || !formData.title}
                variant="glass-primary"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Project'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Project Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: null, title: '' })}
        title="Delete Project"
        description={`Are you sure you want to delete "${deleteDialog.title}"? This action cannot be undone and will permanently delete all associated data.`}
        confirmText="Delete Project"
        onConfirm={() => handleDeleteProject(deleteDialog.id)}
      />

      {/* Confirm Delete Proposal Dialog */}
      <ConfirmDialog
        open={deleteProposalDialog.open}
        onOpenChange={(open) => setDeleteProposalDialog({ open, id: null, title: '' })}
        title="Delete Proposal"
        description={`Are you sure you want to delete "${deleteProposalDialog.title}"? This action cannot be undone. Note: Signed or executed proposals cannot be deleted.`}
        confirmText="Delete Proposal"
        onConfirm={handleDeleteProposal}
      />
    </div>
  )
}

export default Projects
