/**
 * Projects Module - Redesigned
 * 
 * A comprehensive project management interface with:
 * - Project list with Kanban and table views
 * - Creative pipeline for design requests
 * - Task management
 * - Time tracking
 * - Approval workflows
 */
import { useEffect, useMemo, useState, useCallback } from 'react'
import { 
  Plus, Search as SearchIcon, MoreVertical, Calendar, DollarSign, Users, 
  Clock, CheckCircle2, Target, Building2, Globe, ExternalLink, Loader2,
  Edit, Eye, Trash2, LayoutDashboard, Copy, Check, AlertCircle,
  FolderKanban, ListTodo, Timer, ClipboardCheck, FileImage, Play, Pause,
  ChevronRight, Filter, ArrowUpDown, LayoutGrid, List, Settings2
} from 'lucide-react'
import { toast } from 'sonner'

// UI Components
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs'
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogDescription, DialogFooter 
} from './ui/dialog'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { 
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem 
} from './ui/select'
import { 
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator 
} from './ui/dropdown-menu'
import { Alert, AlertDescription } from './ui/alert'
import { Separator } from './ui/separator'
import { Switch } from './ui/switch'
import { Skeleton } from './ui/skeleton'

// Local components
import EmptyState from './EmptyState'
import ConfirmDialog from './ConfirmDialog'
import TenantSetupWizard from './TenantSetupWizard'
import { adminApi } from '@/lib/portal-api'

// Sub-components (to be created)
import ProjectDetailPanel from './projects/ProjectDetailPanel'
import TasksPanel from './projects/TasksPanel'
import TimeTrackingPanel from './projects/TimeTrackingPanel'
import CreativePipelinePanel from './projects/CreativePipelinePanel'
import ApprovalsPanel from './projects/ApprovalsPanel'
import TenantModulesDialog from './projects/TenantModulesDialog'

// Store
import useProjectsStore, { PROJECT_STATUS_CONFIG } from '../lib/projects-store'
import useAuthStore from '../lib/auth-store'

// Tenant module configuration - modules that can be toggled
// Note: analytics, forms, and messages are always enabled for tenants
const TENANT_MODULES = [
  { key: 'seo', label: 'SEO Tools', icon: Target, description: 'Search optimization and keyword tracking' },
  { key: 'blog', label: 'Blog/CMS', icon: Edit, description: 'Content management system' },
  { key: 'crm', label: 'CRM', icon: Users, description: 'Customer relationship management' },
  { key: 'engage', label: 'Engage', icon: Eye, description: 'Popups, nudges, and live chat' },
  { key: 'email_manager', label: 'Outreach', icon: Target, description: 'Email campaigns and SMS messaging' },
  { key: 'signal', label: 'Signal AI', icon: Target, description: 'AI assistant and knowledge base' },
]

// Format helpers
const formatCurrency = (amount) => {
  if (!amount) return '$0'
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatDate = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric',
  })
}

const getDeadlineStatus = (endDate) => {
  if (!endDate) return null
  const today = new Date()
  const deadline = new Date(endDate)
  const daysUntil = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24))
  
  if (daysUntil < 0) return { label: 'Overdue', color: 'bg-red-100 text-red-700' }
  if (daysUntil <= 3) return { label: `${daysUntil}d left`, color: 'bg-orange-100 text-orange-700' }
  if (daysUntil <= 7) return { label: `${daysUntil}d left`, color: 'bg-amber-100 text-amber-700' }
  return null
}

/**
 * Main Projects Component
 */
const Projects = ({ onNavigate }) => {
  const { user, isAdmin: authIsAdmin, currentOrg, currentProject, isSuperAdmin, switchOrganization } = useAuthStore()
  
  // Uptrade Media org should show admin view, client orgs show tenant view
  const isUptradeMediaOrg = currentOrg?.slug === 'uptrade-media' || currentOrg?.domain === 'uptrademedia.com' || currentOrg?.org_type === 'agency'
  const isInTenantContext = (!!currentProject && !isUptradeMediaOrg) || (!!currentOrg && !isUptradeMediaOrg)
  const isAdmin = (authIsAdmin || isSuperAdmin) && !isInTenantContext
  const { 
    projects, 
    currentProject: selectedProject,
    pendingApprovals,
    activeTimer,
    isLoading, 
    error,
    fetchProjects,
    fetchProject,
    createProject,
    updateProject,
    deleteProject,
    fetchPendingApprovals,
    setCurrentProject,
    clearError,
  } = useProjectsStore()

  // UI State
  const [activeTab, setActiveTab] = useState('projects')
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const [projectFilter, setProjectFilter] = useState('active') // 'active' | 'completed' | 'tenants' | 'all'
  const [searchQuery, setSearchQuery] = useState('')
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false)
  const [convertDialogOpen, setConvertDialogOpen] = useState(false)
  const [modulesDialogOpen, setModulesDialogOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState({ open: false, project: null })
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contactId: '',
    status: 'planning',
    budget: '',
    startDate: '',
    endDate: '',
  })
  
  // Clients list for dropdown
  const [clients, setClients] = useState([])
  
  // Load data on mount
  useEffect(() => {
    fetchProjects()
    if (isAdmin) {
      fetchPendingApprovals()
      loadClients()
    }
  }, [])
  
  // Load clients for admin
  const loadClients = async () => {
    try {
      const response = await adminApi.listClients()
      setClients(response.data.clients || response.data || [])
    } catch (err) {
      console.error('Failed to load clients:', err)
    }
  }
  
  // Computed: filtered projects
  const filteredProjects = useMemo(() => {
    let list = projects
    
    // Apply filter
    if (projectFilter === 'active') {
      // Show all in-progress projects, including tenant web apps
      list = list.filter(p => !['completed', 'on_hold'].includes(p.status))
    } else if (projectFilter === 'completed') {
      // Completed projects of any type
      list = list.filter(p => p.status === 'completed')
    } else if (projectFilter === 'tenants') {
      list = list.filter(p => p.domain)
    }
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      list = list.filter(p => 
        p.title?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.client_name?.toLowerCase().includes(query)
      )
    }
    
    return list
  }, [projects, projectFilter, searchQuery])
  
  // Computed: stats
  const stats = useMemo(() => ({
    // Count all projects; tenants also contribute to active/completed
    active: projects.filter(p => !['completed', 'on_hold'].includes(p.status)).length,
    completed: projects.filter(p => p.status === 'completed').length,
    tenants: projects.filter(p => p.domain).length,
    totalRevenue: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
  }), [projects])
  
  // Form handlers
  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }
  
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      contactId: '',
      status: 'planning',
      budget: '',
      startDate: '',
      endDate: '',
    })
    clearError()
  }
  
  // CRUD handlers
  const handleCreateProject = async (e) => {
    e.preventDefault()
    try {
      await createProject({
        title: formData.title,
        description: formData.description,
        contactId: formData.contactId,
        status: formData.status,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
      })
      toast.success('Project created successfully')
      setCreateDialogOpen(false)
      resetForm()
    } catch (err) {
      toast.error(err.message || 'Failed to create project')
    }
  }
  
  const handleEditProject = async (e) => {
    e.preventDefault()
    if (!selectedProject) return
    
    try {
      await updateProject(selectedProject.id, {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
      })
      toast.success('Project updated successfully')
      setEditDialogOpen(false)
      resetForm()
    } catch (err) {
      toast.error(err.message || 'Failed to update project')
    }
  }
  
  const handleDeleteProject = async () => {
    if (!deleteDialog.project) return
    
    try {
      await deleteProject(deleteDialog.project.id)
      toast.success('Project deleted')
      setDeleteDialog({ open: false, project: null })
    } catch (err) {
      toast.error(err.message || 'Failed to delete project')
    }
  }
  
  // Open dialogs
  const openEditDialog = (project) => {
    setCurrentProject(project)
    setFormData({
      title: project.title || '',
      description: project.description || '',
      contactId: project.contact_id || '',
      status: project.status || 'planning',
      budget: project.budget?.toString() || '',
      startDate: project.start_date?.split('T')[0] || '',
      endDate: project.end_date?.split('T')[0] || '',
    })
    setEditDialogOpen(true)
  }
  
  const openDetailsDrawer = async (project) => {
    setCurrentProject(project)
    setDetailsDrawerOpen(true)
    // Fetch full project details
    await fetchProject(project.id)
  }
  
  const openConvertDialog = (project) => {
    setCurrentProject(project)
    setConvertDialogOpen(true)
  }
  
  const openModulesDialog = (project) => {
    setCurrentProject(project)
    setModulesDialogOpen(true)
  }
  
  // Tenant navigation
  const enterTenantDashboard = async (project) => {
    if (!project.domain) {
      toast.error('This project is not a web app yet')
      return
    }
    
    try {
      const result = await switchOrganization(null, { projectId: project.id })
      if (result?.success) {
        toast.success(`Entering ${project.title} dashboard...`)
      }
    } catch (err) {
      toast.error('Failed to switch context')
      console.error(err)
    }
  }
  
  // Tenant wizard completion
  const handleTenantComplete = (result) => {
    toast.success(`🎉 ${result.organization?.name || 'Tenant'} created successfully!`)
    fetchProjects()
    setConvertDialogOpen(false)
    setProjectFilter('tenants')
  }

  // ============= Render =============
  
  // Client view (simplified)
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Your Projects</h1>
          <p className="text-[var(--text-secondary)]">View your active projects and progress</p>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="No projects have been created for your account yet."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                onViewDetails={() => openDetailsDrawer(project)}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Admin view (full features)
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Projects</h1>
          <p className="text-[var(--text-secondary)]">
            Manage projects, creative requests, tasks, and time tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTimer && (
            <Badge variant="secondary" className="gap-2 animate-pulse">
              <Timer className="w-3 h-3" />
              Timer Running
            </Badge>
          )}
          {pendingApprovals.length > 0 && (
            <Badge variant="destructive" className="gap-2">
              <ClipboardCheck className="w-3 h-3" />
              {pendingApprovals.length} Pending
            </Badge>
          )}
          <Button variant="glass-primary" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4" />
            <span className="hidden sm:inline">Projects</span>
          </TabsTrigger>
          <TabsTrigger value="creative" className="flex items-center gap-2">
            <FileImage className="w-4 h-4" />
            <span className="hidden sm:inline">Creative</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <ListTodo className="w-4 h-4" />
            <span className="hidden sm:inline">Tasks</span>
          </TabsTrigger>
          <TabsTrigger value="time" className="flex items-center gap-2">
            <Timer className="w-4 h-4" />
            <span className="hidden sm:inline">Time</span>
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex items-center gap-2 relative">
            <ClipboardCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Approvals</span>
            {pendingApprovals.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                {pendingApprovals.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Projects Tab */}
        <TabsContent value="projects" className="mt-6 space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard icon={Target} label="Active" value={stats.active} />
            <StatsCard icon={CheckCircle2} label="Completed" value={stats.completed} />
            <StatsCard icon={Building2} label="Web Apps" value={stats.tenants} color="emerald" />
            <StatsCard icon={DollarSign} label="Revenue" value={formatCurrency(stats.totalRevenue)} color="green" />
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="tenants">Web Apps</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex border rounded-md">
                <Button 
                  variant={viewMode === 'grid' ? 'default' : 'ghost'} 
                  size="icon"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button 
                  variant={viewMode === 'list' ? 'default' : 'ghost'} 
                  size="icon"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Projects Grid/List */}
          {isLoading && filteredProjects.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects found"
              description={searchQuery ? 'Try adjusting your search' : 'Create a new project to get started'}
              actionLabel="Create Project"
              onAction={() => setCreateDialogOpen(true)}
            />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <ProjectCard 
                  key={project.id} 
                  project={project}
                  onViewDetails={() => openDetailsDrawer(project)}
                  onEdit={() => openEditDialog(project)}
                  onDelete={() => setDeleteDialog({ open: true, project })}
                  onConvert={() => openConvertDialog(project)}
                  onEnterTenant={() => enterTenantDashboard(project)}
                  onManageModules={() => openModulesDialog(project)}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          ) : (
            <ProjectsTable 
              projects={filteredProjects}
              onViewDetails={openDetailsDrawer}
              onEdit={openEditDialog}
              onDelete={(p) => setDeleteDialog({ open: true, project: p })}
              onConvert={openConvertDialog}
              onEnterTenant={enterTenantDashboard}
              onManageModules={openModulesDialog}
            />
          )}
        </TabsContent>

        {/* Creative Pipeline Tab */}
        <TabsContent value="creative" className="mt-6">
          <CreativePipelinePanel projects={projects} />
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="mt-6">
          <TasksPanel projects={projects} />
        </TabsContent>

        {/* Time Tracking Tab */}
        <TabsContent value="time" className="mt-6">
          <TimeTrackingPanel projects={projects} />
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals" className="mt-6">
          <ApprovalsPanel projects={projects} />
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>Add a new project to track client work</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select value={formData.contactId} onValueChange={(v) => handleFormChange('contactId', v)}>
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
              <Label>Project Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => handleFormChange('title', e.target.value)}
                placeholder="e.g., Website Redesign"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                placeholder="Project details..."
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleFormChange('startDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleFormChange('endDate', e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Budget ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.budget}
                onChange={(e) => handleFormChange('budget', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="glass-primary" disabled={isLoading || !formData.contactId || !formData.title}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditProject} className="space-y-4">
            <div className="space-y-2">
              <Label>Project Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => handleFormChange('title', e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => handleFormChange('status', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROJECT_STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleFormChange('startDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleFormChange('endDate', e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Budget ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.budget}
                onChange={(e) => handleFormChange('budget', e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="glass-primary" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details Drawer/Panel */}
      <ProjectDetailPanel 
        open={detailsDrawerOpen}
        onOpenChange={setDetailsDrawerOpen}
        project={selectedProject}
        onEdit={() => {
          setDetailsDrawerOpen(false)
          openEditDialog(selectedProject)
        }}
      />

      {/* Tenant Wizard */}
      <TenantSetupWizard
        open={convertDialogOpen}
        onOpenChange={setConvertDialogOpen}
        project={selectedProject}
        onComplete={handleTenantComplete}
      />

      {/* Tenant Modules Dialog */}
      <TenantModulesDialog
        open={modulesDialogOpen}
        onOpenChange={setModulesDialogOpen}
        project={selectedProject}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, project: null })}
        title="Delete Project"
        description={`Are you sure you want to delete "${deleteDialog.project?.title}"? This cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleDeleteProject}
      />
    </div>
  )
}

// ============= Sub-Components =============

/**
 * Stats Card Component
 */
const StatsCard = ({ icon: Icon, label, value, color = 'brand' }) => (
  <Card className="border-[var(--glass-border)] bg-card">
    <CardContent className="p-4 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color === 'brand' ? 'bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)]' : `bg-gradient-to-br from-${color}-500 to-${color}-600`}`}>
        <Icon className={`w-5 h-5 text-white`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
        <p className="text-sm text-[var(--text-secondary)]">{label}</p>
      </div>
    </CardContent>
  </Card>
)

/**
 * Project Card Component
 */
const ProjectCard = ({ 
  project, 
  onViewDetails, 
  onEdit, 
  onDelete, 
  onConvert,
  onEnterTenant,
  onManageModules,
  isAdmin = false 
}) => {
  const statusConfig = PROJECT_STATUS_CONFIG[project.status] || PROJECT_STATUS_CONFIG.planning
  const deadlineStatus = getDeadlineStatus(project.end_date)
  const tenantUrl = project.domain
    ? (project.domain.startsWith('http') ? project.domain : `https://${project.domain}`)
    : null
  const showIframePreview = Boolean(project.domain && tenantUrl && project.status === 'completed')
  const showThumbnailPreview = Boolean(project.domain && tenantUrl && !showIframePreview)
  
  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-[var(--glass-border)] overflow-hidden">
      {/* Website preview for tenant projects */}
      {showIframePreview && (
        <div className="relative h-40 bg-[var(--surface-secondary)] overflow-hidden">
          <iframe
            src={tenantUrl}
            title={`${project.title} live preview`}
            loading="lazy"
            className="w-full h-full border-0 pointer-events-none"
            sandbox="allow-same-origin"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-primary)] via-transparent to-transparent" />
          <Badge variant="secondary" className="absolute top-2 right-2 text-xs bg-black/50 text-white border-0">
            <Globe className="w-3 h-3 mr-1" />
            {project.domain}
          </Badge>
          <Badge variant="outline" className="absolute top-2 left-2 text-xs bg-black/40 text-white border-0">
            Live preview
          </Badge>
        </div>
      )}

      {showThumbnailPreview && (
        <div className="relative h-32 bg-[var(--surface-secondary)] overflow-hidden">
          <img
            src={`https://image.thum.io/get/width/400/crop/300/${tenantUrl}`}
            alt={`${project.title} preview`}
            className="w-full h-full object-cover object-top opacity-90 group-hover:opacity-100 transition-opacity"
            loading="lazy"
            onError={(e) => e.target.style.display = 'none'}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-primary)] via-transparent to-transparent" />
          <Badge variant="secondary" className="absolute top-2 right-2 text-xs bg-black/50 text-white border-0">
            <Globe className="w-3 h-3 mr-1" />
            {project.domain}
          </Badge>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {project.domain && (
                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                  <Building2 className="w-3 h-3 mr-1" />
                  Web App
                </Badge>
              )}
              {deadlineStatus && (
                <Badge className={`text-xs ${deadlineStatus.color}`}>
                  {deadlineStatus.label}
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg truncate">{project.title}</CardTitle>
            <CardDescription className="mt-1 flex items-center gap-2">
              <Users className="w-3 h-3" />
              {project.client_name || project.contacts?.name || 'No client'}
            </CardDescription>
          </div>
          
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {project.domain && (
                  <>
                    <DropdownMenuItem onClick={onEnterTenant}>
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Enter Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onManageModules}>
                      <Settings2 className="w-4 h-4 mr-2" />
                      Manage Modules
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={onViewDetails}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                {project.status === 'completed' && !project.domain && (
                  <DropdownMenuItem onClick={onConvert}>
                    <Building2 className="w-4 h-4 mr-2" />
                    Convert to Web App
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600" onClick={onDelete}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
            <span className="text-[var(--text-secondary)]">{statusConfig.progress}%</span>
          </div>
          <Progress value={statusConfig.progress} className="h-2" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <DollarSign className="w-4 h-4" />
            <span className="font-medium text-[var(--text-primary)]">{formatCurrency(project.budget)}</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(project.end_date)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {project.domain ? (
            <>
              <Button variant="glass-primary" size="sm" className="flex-1" onClick={onEnterTenant}>
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Enter Dashboard
              </Button>
              <Button variant="outline" size="sm" onClick={onViewDetails}>
                <Eye className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" className="flex-1" onClick={onViewDetails}>
                <Eye className="w-4 h-4 mr-2" />
                Details
              </Button>
              {project.status === 'completed' && (
                <Button variant="glass-primary" size="sm" className="flex-1" onClick={onConvert}>
                  <Building2 className="w-4 h-4 mr-2" />
                  Web App
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Projects Table Component (list view)
 */
const ProjectsTable = ({ projects, onViewDetails, onEdit, onDelete, onConvert, onEnterTenant, onManageModules }) => {
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-[var(--surface-secondary)]">
          <tr>
            <th className="text-left p-3 font-medium text-sm">Project</th>
            <th className="text-left p-3 font-medium text-sm">Client</th>
            <th className="text-left p-3 font-medium text-sm">Status</th>
            <th className="text-left p-3 font-medium text-sm">Budget</th>
            <th className="text-left p-3 font-medium text-sm">Deadline</th>
            <th className="text-right p-3 font-medium text-sm">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--glass-border)]">
          {projects.map((project) => {
            const statusConfig = PROJECT_STATUS_CONFIG[project.status] || PROJECT_STATUS_CONFIG.planning
            return (
              <tr key={project.id} className="hover:bg-[var(--surface-secondary)]/50">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {project.domain && (
                      <Building2 className="w-4 h-4 text-emerald-600" />
                    )}
                    <span className="font-medium">{project.title}</span>
                  </div>
                </td>
                <td className="p-3 text-[var(--text-secondary)]">
                  {project.client_name || 'No client'}
                </td>
                <td className="p-3">
                  <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                </td>
                <td className="p-3">{formatCurrency(project.budget)}</td>
                <td className="p-3 text-[var(--text-secondary)]">{formatDate(project.end_date)}</td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onViewDetails(project)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onEdit(project)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    {project.domain && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => onManageModules(project)} title="Manage Modules">
                          <Settings2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onEnterTenant(project)} title="Enter Dashboard">
                          <LayoutDashboard className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default Projects
