// Projects.jsx - World-class internal project tracking and tenant management
import { useState, useEffect, useRef, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
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
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit,
  Loader2,
  Trash2,
  Building2,
  ExternalLink,
  Copy,
  Check,
  Globe,
  Users,
  Target,
  TrendingUp,
  MoreVertical,
  Rocket,
  Zap,
  BarChart3,
  Mail,
  Search as SearchIcon,
  PenTool,
  ArrowRight,
  LogIn,
  ArrowLeft,
  LayoutDashboard
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import useProjectsStore from '@/lib/projects-store'
import useAuthStore from '@/lib/auth-store'
import api from '@/lib/api'

// Project status configuration
const STATUS_CONFIG = {
  planning: { 
    label: 'Planning', 
    color: 'bg-slate-500/20 text-slate-600 border-slate-500/30',
    icon: Target,
    progress: 10
  },
  discovery: { 
    label: 'Discovery', 
    color: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
    icon: SearchIcon,
    progress: 20
  },
  design: { 
    label: 'Design', 
    color: 'bg-pink-500/20 text-pink-600 border-pink-500/30',
    icon: PenTool,
    progress: 40
  },
  development: { 
    label: 'Development', 
    color: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
    icon: Zap,
    progress: 60
  },
  review: { 
    label: 'Review', 
    color: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
    icon: Eye,
    progress: 80
  },
  launch: { 
    label: 'Launch Ready', 
    color: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
    icon: Rocket,
    progress: 95
  },
  completed: { 
    label: 'Completed', 
    color: 'bg-green-500/20 text-green-600 border-green-500/30',
    icon: CheckCircle2,
    progress: 100
  },
  on_hold: { 
    label: 'On Hold', 
    color: 'bg-red-500/20 text-red-600 border-red-500/30',
    icon: AlertCircle,
    progress: 0
  }
}

// Tenant modules configuration
const TENANT_MODULES = [
  { 
    key: 'analytics', 
    label: 'Website Analytics', 
    description: 'Track visitors, sessions, page views, and user behavior',
    icon: BarChart3,
    recommended: true
  },
  { 
    key: 'blog', 
    label: 'Blog Manager', 
    description: 'Create and manage blog posts with SEO optimization',
    icon: FileText,
    recommended: false
  },
  { 
    key: 'crm', 
    label: 'Lead Management', 
    description: 'Simple CRM for tracking leads and contacts',
    icon: Users,
    recommended: true
  },
  { 
    key: 'email_campaigns', 
    label: 'Email Campaigns', 
    description: 'Send newsletters and marketing emails',
    icon: Mail,
    recommended: false
  },
  { 
    key: 'seo', 
    label: 'SEO Manager', 
    description: 'Search rankings, audits, and optimization tools',
    icon: TrendingUp,
    recommended: true
  },
]

const Projects = ({ onNavigate }) => {
  const { user, isSuperAdmin, currentOrg, switchOrganization } = useAuthStore()
  const isAdmin = user?.role === 'admin' || isSuperAdmin
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
  
  // View state
  const [activeTab, setActiveTab] = useState('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [enteringTenant, setEnteringTenant] = useState(null) // Track which tenant we're entering
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [convertDialogOpen, setConvertDialogOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState({ open: false, project: null })
  
  // Selected project for operations
  const [selectedProject, setSelectedProject] = useState(null)
  
  // Form state
  const [formData, setFormData] = useState({
    contactId: '',
    title: '',
    description: '',
    status: 'planning',
    budget: '',
    start_date: '',
    end_date: ''
  })
  
  // Tenant conversion state
  const [tenantForm, setTenantForm] = useState({
    domain: '',
    modules: {
      analytics: true,
      blog: false,
      crm: true,
      email_campaigns: false,
      seo: true
    },
    themeColor: '#4bbf39'
  })
  const [tenantSaving, setTenantSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  // Clients for dropdown
  const [clients, setClients] = useState([])

  // Fetch data
  useEffect(() => {
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    fetchProjects()
    if (isAdmin) fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const response = await api.get('/.netlify/functions/admin-clients-list')
      setClients(response.data.clients || [])
    } catch (err) {
      console.error('Failed to fetch clients:', err)
    }
  }

  // Computed project lists
  const { activeProjects, completedProjects, tenants, stats } = useMemo(() => {
    const active = projects.filter(p => p.status !== 'completed' && p.status !== 'on_hold')
    const onHold = projects.filter(p => p.status === 'on_hold')
    const completed = projects.filter(p => p.status === 'completed' && !p.is_tenant)
    const tenantList = projects.filter(p => p.is_tenant)
    
    // Filter by search
    const filterBySearch = (list) => {
      if (!searchQuery) return list
      const q = searchQuery.toLowerCase()
      return list.filter(p => 
        p.title?.toLowerCase().includes(q) || 
        p.client_name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      )
    }

    return {
      activeProjects: filterBySearch(active),
      completedProjects: filterBySearch(completed),
      tenants: filterBySearch(tenantList),
      stats: {
        total: projects.length,
        active: active.length,
        onHold: onHold.length,
        completed: completed.length,
        tenants: tenantList.length,
        totalRevenue: projects.reduce((sum, p) => sum + (parseFloat(p.budget) || 0), 0)
      }
    }
  }, [projects, searchQuery])

  // Helpers
  const getDaysUntilDeadline = (endDate) => {
    if (!endDate) return null
    const end = new Date(endDate)
    const now = new Date()
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
    return diff
  }

  const getDeadlineStatus = (endDate) => {
    const days = getDaysUntilDeadline(endDate)
    if (days === null) return null
    if (days < 0) return { label: `${Math.abs(days)}d overdue`, color: 'text-red-600 bg-red-100' }
    if (days === 0) return { label: 'Due today', color: 'text-amber-600 bg-amber-100' }
    if (days <= 7) return { label: `${days}d left`, color: 'text-amber-600 bg-amber-100' }
    return { label: `${days}d left`, color: 'text-slate-600 bg-slate-100' }
  }

  const formatCurrency = (amount) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount)
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Form handlers
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

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) clearError()
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
      setCreateDialogOpen(false)
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
      toast.success('Project updated!')
      setEditDialogOpen(false)
      setSelectedProject(null)
      resetForm()
    }
  }

  const handleDeleteProject = async () => {
    if (!deleteDialog.project) return
    const result = await deleteProject(deleteDialog.project.id)
    if (result.success) {
      toast.success('Project deleted!')
      setDeleteDialog({ open: false, project: null })
    } else {
      toast.error(result.error || 'Failed to delete')
    }
  }

  const openEditDialog = (project) => {
    setSelectedProject(project)
    setFormData({
      contactId: project.contact_id || '',
      title: project.title || '',
      description: project.description || '',
      status: project.status || 'planning',
      budget: project.budget ? project.budget.toString() : '',
      start_date: project.start_date || '',
      end_date: project.end_date || ''
    })
    setEditDialogOpen(true)
  }

  const openDetailsDialog = (project) => {
    setSelectedProject(project)
    setDetailsDialogOpen(true)
  }

  // Tenant conversion
  const openConvertDialog = (project) => {
    setSelectedProject(project)
    setTenantForm({
      domain: project.tenant_domain || '',
      modules: project.tenant_modules || {
        analytics: true,
        blog: false,
        crm: true,
        email_campaigns: false,
        seo: true
      },
      themeColor: project.tenant_theme_color || '#4bbf39'
    })
    setConvertDialogOpen(true)
  }

  const handleConvertToTenant = async () => {
    if (!selectedProject) return
    setTenantSaving(true)
    try {
      const result = await updateProject(selectedProject.id, {
        is_tenant: true,
        tenant_domain: tenantForm.domain,
        tenant_modules: tenantForm.modules,
        tenant_theme_color: tenantForm.themeColor,
        tenant_created_at: new Date().toISOString()
      })
      if (result.success) {
        toast.success('🎉 Project converted to tenant!')
        setConvertDialogOpen(false)
        setSelectedProject(null)
        setActiveTab('tenants')
      } else {
        toast.error(result.error || 'Conversion failed')
      }
    } catch (err) {
      toast.error('Failed to convert project')
    } finally {
      setTenantSaving(false)
    }
  }

  const generateTrackingScript = (project) => {
    return `<!-- Uptrade Portal Analytics -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['UPT']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  })(window,document,'script','upt','https://portal.uptrademedia.com/t.js');
  upt('init', '${project.id}');
</script>`
  }

  const copyTrackingScript = (project) => {
    navigator.clipboard.writeText(generateTrackingScript(project))
    setCopied(true)
    toast.success('Tracking script copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  // Enter a tenant's dashboard context
  const enterTenantDashboard = async (project) => {
    if (!project.is_tenant) {
      toast.error('This project is not a web app yet')
      return
    }
    
    setEnteringTenant(project.id)
    
    try {
      // Switch to the project-based tenant context
      const result = await switchOrganization(null, { projectId: project.id })
      
      if (result.success) {
        // The page will reload automatically after org switch
        // and user will be taken to dashboard
        toast.success(`Entering ${project.title} dashboard...`)
      } else {
        // If org switch fails, just navigate to dashboard with project context
        toast.info(`Viewing ${project.title}`)
        if (onNavigate) {
          onNavigate('dashboard', { tenantId: project.id, tenantName: project.title })
        }
      }
    } catch (err) {
      console.error('Error entering tenant dashboard:', err)
      // Fallback: just navigate with context
      toast.error('Failed to switch context. ' + (err.message || ''))
      if (onNavigate) {
        onNavigate('dashboard', { tenantId: project.id, tenantName: project.title })
      }
    } finally {
      setEnteringTenant(null)
    }
  }

  // Project Card Component
  const ProjectCard = ({ project, showTenantActions = false }) => {
    const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning
    const StatusIcon = statusConfig.icon
    const deadlineStatus = getDeadlineStatus(project.end_date)

    return (
      <Card className="group hover:shadow-lg transition-all duration-200 border-[var(--glass-border)]">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {project.is_tenant && (
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
                {project.client_name || project.contacts?.name || 'No client assigned'}
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {project.is_tenant && (
                  <>
                    <DropdownMenuItem onClick={() => enterTenantDashboard(project)}>
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Enter Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => openDetailsDialog(project)}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openEditDialog(project)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Project
                </DropdownMenuItem>
                {project.status === 'completed' && !project.is_tenant && (
                  <DropdownMenuItem onClick={() => openConvertDialog(project)}>
                    <Building2 className="w-4 h-4 mr-2" />
                    Convert to Web App
                  </DropdownMenuItem>
                )}
                {project.is_tenant && (
                  <>
                    <DropdownMenuItem onClick={() => copyTrackingScript(project)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Tracking Script
                    </DropdownMenuItem>
                    {project.tenant_domain && (
                      <DropdownMenuItem onClick={() => window.open(`https://${project.tenant_domain}`, '_blank')}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Visit Website
                      </DropdownMenuItem>
                    )}
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600"
                  onClick={() => setDeleteDialog({ open: true, project })}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <Badge className={statusConfig.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusConfig.label}
              </Badge>
              <span className="text-[var(--text-secondary)]">{statusConfig.progress}%</span>
            </div>
            <Progress value={statusConfig.progress} className="h-2" />
          </div>

          {/* Quick Stats */}
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

          {/* Tenant Modules (for tenants only) */}
          {project.is_tenant && project.tenant_modules && (
            <div className="flex flex-wrap gap-1">
              {Object.entries(project.tenant_modules)
                .filter(([_, enabled]) => enabled)
                .map(([key]) => {
                  const module = TENANT_MODULES.find(m => m.key === key)
                  if (!module) return null
                  const ModuleIcon = module.icon
                  return (
                    <Badge key={key} variant="secondary" className="text-xs">
                      <ModuleIcon className="w-3 h-3 mr-1" />
                      {module.label}
                    </Badge>
                  )
                })
              }
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {/* For web apps (tenants) - primary action is Enter Dashboard */}
            {project.is_tenant ? (
              <>
                <Button 
                  variant="glass-primary" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => enterTenantDashboard(project)}
                  disabled={enteringTenant === project.id}
                >
                  {enteringTenant === project.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                  )}
                  Enter Dashboard
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => openDetailsDialog(project)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                {project.tenant_domain && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(`https://${project.tenant_domain}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => openDetailsDialog(project)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Details
                </Button>
                {project.status === 'completed' && (
                  <Button 
                    variant="glass-primary" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => openConvertDialog(project)}
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    Make Web App
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Stats Cards
  const StatsCard = ({ icon: Icon, label, value, color = 'brand' }) => (
    <Card className="border-[var(--glass-border)]">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-3 rounded-lg ${color === 'brand' ? 'bg-[var(--brand-primary)]/10' : `bg-${color}-500/10`}`}>
          <Icon className={`w-5 h-5 ${color === 'brand' ? 'text-[var(--brand-primary)]' : `text-${color}-600`}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
          <p className="text-sm text-[var(--text-secondary)]">{label}</p>
        </div>
      </CardContent>
    </Card>
  )

  if (!isAdmin) {
    // Client view - simplified
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
            icon={FileText}
            title="No projects yet"
            description="No projects have been created for your account yet."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Projects & Web Apps</h1>
          <p className="text-[var(--text-secondary)]">Track projects and enter web app dashboards to manage analytics, blog, CRM, and more</p>
        </div>
        <Button variant="glass-primary" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard icon={Target} label="Active Projects" value={stats.active} />
        <StatsCard icon={CheckCircle2} label="Completed" value={stats.completed} />
        <StatsCard icon={Building2} label="Web Apps" value={stats.tenants} color="emerald" />
        <StatsCard icon={DollarSign} label="Total Revenue" value={formatCurrency(stats.totalRevenue)} color="green" />
      </div>

      {/* Search */}
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
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Active ({activeProjects.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Completed ({completedProjects.length})
          </TabsTrigger>
          <TabsTrigger value="tenants" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Web Apps ({tenants.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {isLoading && activeProjects.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
            </div>
          ) : activeProjects.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No active projects"
              description="Create a new project to get started."
              actionLabel="Create Project"
              onAction={() => setCreateDialogOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {completedProjects.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No completed projects"
              description="Completed projects will appear here and can be converted to web apps."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tenants" className="mt-6">
          {tenants.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No web apps yet"
              description="Convert completed projects to create web apps with their own analytics and tools. Click 'Enter Dashboard' to manage each app."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tenants.map((project) => (
                <ProjectCard key={project.id} project={project} showTenantActions />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Project Dialog */}
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
                  value={formData.start_date}
                  onChange={(e) => handleFormChange('start_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleFormChange('end_date', e.target.value)}
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

      {/* Edit Project Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update project details and status</DialogDescription>
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
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="w-4 h-4" />
                        {config.label}
                      </div>
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
                  value={formData.start_date}
                  onChange={(e) => handleFormChange('start_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleFormChange('end_date', e.target.value)}
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

      {/* Convert to Tenant Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              Convert to Tenant Portal
            </DialogTitle>
            <DialogDescription>
              Set up {selectedProject?.title} as a tenant with their own portal access
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Domain */}
            <div className="space-y-2">
              <Label>Client Website Domain</Label>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[var(--text-tertiary)]" />
                <Input
                  value={tenantForm.domain}
                  onChange={(e) => setTenantForm(prev => ({ ...prev, domain: e.target.value }))}
                  placeholder="example.com"
                />
              </div>
              <p className="text-xs text-[var(--text-tertiary)]">
                The domain where the tracking script will be installed
              </p>
            </div>

            <Separator />

            {/* Module Selection */}
            <div className="space-y-4">
              <Label>Portal Modules</Label>
              <p className="text-sm text-[var(--text-secondary)]">
                Select which features this client can access in their portal
              </p>
              
              <div className="space-y-3">
                {TENANT_MODULES.map((module) => {
                  const ModuleIcon = module.icon
                  return (
                    <div 
                      key={module.key}
                      className={`flex items-start gap-4 p-3 rounded-lg border transition-colors ${
                        tenantForm.modules[module.key] 
                          ? 'border-emerald-200 bg-emerald-50/50' 
                          : 'border-[var(--glass-border)]'
                      }`}
                    >
                      <Switch
                        checked={tenantForm.modules[module.key]}
                        onCheckedChange={(checked) => 
                          setTenantForm(prev => ({
                            ...prev,
                            modules: { ...prev.modules, [module.key]: checked }
                          }))
                        }
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <ModuleIcon className="w-4 h-4 text-[var(--text-secondary)]" />
                          <span className="font-medium">{module.label}</span>
                          {module.recommended && (
                            <Badge variant="secondary" className="text-xs">Recommended</Badge>
                          )}
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                          {module.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <Separator />

            {/* Theme Color */}
            <div className="space-y-2">
              <Label>Brand Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={tenantForm.themeColor}
                  onChange={(e) => setTenantForm(prev => ({ ...prev, themeColor: e.target.value }))}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={tenantForm.themeColor}
                  onChange={(e) => setTenantForm(prev => ({ ...prev, themeColor: e.target.value }))}
                  className="w-28"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="glass-primary" 
              onClick={handleConvertToTenant}
              disabled={tenantSaving}
            >
              {tenantSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Rocket className="w-4 h-4 mr-2" />
              )}
              Create Tenant Portal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedProject?.title}</DialogTitle>
            <DialogDescription>
              {selectedProject?.client_name || 'No client assigned'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedProject && (
            <div className="space-y-6">
              {/* Status & Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className={STATUS_CONFIG[selectedProject.status]?.color}>
                    {STATUS_CONFIG[selectedProject.status]?.label}
                  </Badge>
                  <span className="text-sm text-[var(--text-secondary)]">
                    {STATUS_CONFIG[selectedProject.status]?.progress}% complete
                  </span>
                </div>
                <Progress value={STATUS_CONFIG[selectedProject.status]?.progress || 0} className="h-2" />
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[var(--text-tertiary)]">Budget</Label>
                  <p className="font-medium">{formatCurrency(selectedProject.budget)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[var(--text-tertiary)]">Timeline</Label>
                  <p className="font-medium">
                    {formatDate(selectedProject.start_date)} → {formatDate(selectedProject.end_date)}
                  </p>
                </div>
              </div>

              {/* Description */}
              {selectedProject.description && (
                <div className="space-y-1">
                  <Label className="text-[var(--text-tertiary)]">Description</Label>
                  <p className="text-[var(--text-secondary)]">{selectedProject.description}</p>
                </div>
              )}

              {/* Tenant Info */}
              {selectedProject.is_tenant && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Tenant Portal
                    </h4>
                    
                    {selectedProject.tenant_domain && (
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-[var(--text-tertiary)]" />
                        <a 
                          href={`https://${selectedProject.tenant_domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--brand-primary)] hover:underline"
                        >
                          {selectedProject.tenant_domain}
                        </a>
                      </div>
                    )}

                    {/* Enabled Modules */}
                    <div className="flex flex-wrap gap-2">
                      {selectedProject.tenant_modules && Object.entries(selectedProject.tenant_modules)
                        .filter(([_, enabled]) => enabled)
                        .map(([key]) => {
                          const module = TENANT_MODULES.find(m => m.key === key)
                          if (!module) return null
                          const ModuleIcon = module.icon
                          return (
                            <Badge key={key} variant="secondary">
                              <ModuleIcon className="w-3 h-3 mr-1" />
                              {module.label}
                            </Badge>
                          )
                        })
                      }
                    </div>

                    {/* Tracking Script */}
                    <div className="space-y-2">
                      <Label>Tracking Script</Label>
                      <div className="relative">
                        <pre className="p-3 bg-[var(--surface-secondary)] rounded-lg text-xs overflow-x-auto">
                          {generateTrackingScript(selectedProject)}
                        </pre>
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => copyTrackingScript(selectedProject)}
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Close
            </Button>
            <Button variant="glass-primary" onClick={() => {
              setDetailsDialogOpen(false)
              openEditDialog(selectedProject)
            }}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

export default Projects
