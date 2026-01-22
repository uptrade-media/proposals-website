/**
 * CRMDashboard - World-class, omni-industry unified CRM
 * 
 * 3-Column Layout (like Sync):
 * - Left Sidebar: Navigation, filters, quick actions
 * - Center: Main content (Pipeline Kanban or List view)
 * - Right Sidebar: Detail panel for selected prospect
 * 
 * Features:
 * - Form-based lead capture integration
 * - Gmail thread viewing (when connected)
 * - Sync calendar integration for meetings
 * - Optional Signal AI layer for insights
 * - Brand color theming via useBrandColors hook
 * 
 * Capability Layers:
 * - isAgency: OpenPhone calls, AI transcription, proposal references (Uptrade Media)
 * - signalEnabled: AI insights, smart scoring, automation suggestions
 * - All orgs: Pipeline, contacts, emails, forms, sync calendar
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Users,
  Search,
  RefreshCw,
  UserPlus,
  LayoutGrid,
  List,
  Loader2,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Mail,
  Calendar,
  FileText,
  Sparkles,
  Phone,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  TrendingUp,
  MoreVertical,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Tag,
  Settings,
  PanelLeftClose,
  PanelRightClose,
  Target,
  Zap,
  Star,
  Archive,
  Plus,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  UserCheck,
  DollarSign,
  Handshake,
  X,
  GripVertical,
  Sliders,
  BarChart3,
  ListTodo,
  Bell,
  Kanban
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/lib/toast'
import useAuthStore from '@/lib/auth-store'
import useDebounce from '@/hooks/useDebounce'
import { useBrandColors } from '@/hooks/useBrandColors'
import { crmApi } from '@/lib/portal-api'
import { useSignalAccess } from '@/lib/signal-access'
import SignalIcon from '@/components/ui/SignalIcon'

// Local components (some from prospects folder)
import ProspectDetailDrawer from '../prospects/ProspectDetailDrawer'
import AddProspectDialog from './AddProspectDialog'
import SignalProspectInsights from '../prospects/SignalProspectInsights'
import PipelineKanban from './PipelineKanban'
import PipelineSettingsDialog from './PipelineSettingsDialog'
import CRMAnalyticsDashboard from './CRMAnalyticsDashboard'
import CRMTasksManager from './CRMTasksManager'
import CRMRemindersManager from './CRMRemindersManager'
import CRMEmailHub from './CRMEmailHub'
import ProspectingDashboard from '../sales/ProspectingDashboard'
import SalesDashboard from '../sales/SalesDashboard'

// ============================================================================
// PIPELINE STAGES - Industry-agnostic terminology
// ============================================================================
export const PIPELINE_STAGES = {
  new_lead: {
    key: 'new_lead',
    label: 'New Lead',
    color: '#3B82F6',
    bgLight: 'rgba(59, 130, 246, 0.1)',
    textColor: '#2563EB',
    icon: Star,
    order: 1,
  },
  contacted: {
    key: 'contacted',
    label: 'Contacted',
    color: '#F59E0B',
    bgLight: 'rgba(245, 158, 11, 0.1)',
    textColor: '#D97706',
    icon: MessageSquare,
    order: 2,
  },
  qualified: {
    key: 'qualified',
    label: 'Qualified',
    color: '#8B5CF6',
    bgLight: 'rgba(139, 92, 246, 0.1)',
    textColor: '#7C3AED',
    icon: UserCheck,
    order: 3,
  },
  proposal_sent: {
    key: 'proposal_sent',
    label: 'Proposal Sent',
    color: '#F97316',
    bgLight: 'rgba(249, 115, 22, 0.1)',
    textColor: '#EA580C',
    icon: FileText,
    order: 4,
  },
  negotiating: {
    key: 'negotiating',
    label: 'Negotiating',
    color: '#06B6D4',
    bgLight: 'rgba(6, 182, 212, 0.1)',
    textColor: '#0891B2',
    icon: Handshake,
    order: 5,
  },
  closed_won: {
    key: 'closed_won',
    label: 'Closed Won',
    color: '#10B981',
    bgLight: 'rgba(16, 185, 129, 0.1)',
    textColor: '#059669',
    icon: CheckCircle2,
    order: 6,
  },
  closed_lost: {
    key: 'closed_lost',
    label: 'Closed Lost',
    color: '#EF4444',
    bgLight: 'rgba(239, 68, 68, 0.1)',
    textColor: '#DC2626',
    icon: XCircle,
    order: 7,
  },
}

// Active stages (exclude closed)
const ACTIVE_STAGES = ['new_lead', 'contacted', 'qualified', 'proposal_sent', 'negotiating']

// Format relative time
function formatRelativeTime(date) {
  if (!date) return 'Never'
  const now = new Date()
  const d = new Date(date)
  const diff = now - d
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

// ============================================================================
// PROSPECT CARD COMPONENT (for Kanban and List)
// ============================================================================
function ProspectCard({ 
  prospect, 
  isSelected, 
  onClick, 
  compact = false,
  brandColors,
  isDragging = false
}) {
  const stageConfig = PIPELINE_STAGES[prospect.pipeline_stage || 'new_lead']
  
  if (compact) {
    // List view - compact horizontal card
    return (
      <div
        onClick={() => onClick(prospect)}
        className={cn(
          'flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all border',
          'hover:shadow-sm hover:border-[var(--glass-border-hover)]',
          isSelected 
            ? 'border-2 shadow-md' 
            : 'border-[var(--glass-border)] bg-[var(--glass-bg)]',
          isDragging && 'opacity-50'
        )}
        style={isSelected ? { 
          borderColor: brandColors.primary,
          backgroundColor: brandColors.rgba.primary10 
        } : {}}
      >
        {/* Avatar */}
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0"
          style={{ backgroundColor: brandColors.primary }}
        >
          {prospect.name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-[var(--text-primary)] truncate">{prospect.name}</p>
            {prospect.lead_score >= 80 && (
              <Zap className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-[var(--text-tertiary)] truncate">
            {prospect.company || prospect.email}
          </p>
        </div>
        
        {/* Stage Badge */}
        <Badge 
          className="flex-shrink-0"
          style={{ 
            backgroundColor: stageConfig.bgLight,
            color: stageConfig.textColor,
            border: 'none'
          }}
        >
          {stageConfig.label}
        </Badge>
        
        {/* Source */}
        {prospect.source === 'form' && (
          <FileText className="h-4 w-4 text-[var(--text-tertiary)] flex-shrink-0" />
        )}
        
        {/* Time */}
        <span className="text-xs text-[var(--text-tertiary)] flex-shrink-0">
          {formatRelativeTime(prospect.created_at)}
        </span>
      </div>
    )
  }
  
  // Kanban view - vertical card
  return (
    <div
      onClick={() => onClick(prospect)}
      className={cn(
        'p-3 rounded-lg cursor-pointer transition-all border',
        'hover:shadow-md',
        isSelected 
          ? 'border-2 shadow-lg' 
          : 'border-[var(--glass-border)] bg-[var(--glass-bg)]',
        isDragging && 'shadow-xl rotate-2'
      )}
      style={isSelected ? { 
        borderColor: brandColors.primary,
        backgroundColor: brandColors.rgba.primary10 
      } : {}}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-white text-sm flex-shrink-0"
            style={{ backgroundColor: brandColors.primary }}
          >
            {prospect.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm text-[var(--text-primary)] truncate">
              {prospect.name}
            </p>
            {prospect.company && (
              <p className="text-xs text-[var(--text-tertiary)] truncate">
                {prospect.company}
              </p>
            )}
          </div>
        </div>
        {prospect.lead_score >= 80 && (
          <Tooltip>
            <TooltipTrigger>
              <Zap className="h-4 w-4 text-amber-500 flex-shrink-0" />
            </TooltipTrigger>
            <TooltipContent>High potential lead</TooltipContent>
          </Tooltip>
        )}
      </div>
      
      {/* Tags */}
      {prospect.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {prospect.tags.slice(0, 2).map((tag, i) => (
            <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
              {tag}
            </Badge>
          ))}
          {prospect.tags.length > 2 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              +{prospect.tags.length - 2}
            </Badge>
          )}
        </div>
      )}
      
      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
        <div className="flex items-center gap-2">
          {prospect.source === 'form' && (
            <Tooltip>
              <TooltipTrigger>
                <FileText className="h-3.5 w-3.5" />
              </TooltipTrigger>
              <TooltipContent>From form submission</TooltipContent>
            </Tooltip>
          )}
          <span>{formatRelativeTime(prospect.created_at)}</span>
        </div>
        {prospect.lead_score && (
          <span className="font-medium" style={{ color: brandColors.primary }}>
            {prospect.lead_score}%
          </span>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// PIPELINE COLUMN COMPONENT
// ============================================================================
function PipelineColumn({ 
  stage, 
  prospects, 
  selectedProspectId, 
  onProspectClick,
  onStageChange,
  brandColors,
  isActive
}) {
  const stageConfig = PIPELINE_STAGES[stage]
  const StageIcon = stageConfig.icon
  
  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault()
    e.currentTarget.classList.add('bg-[var(--glass-bg-hover)]')
  }
  
  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('bg-[var(--glass-bg-hover)]')
  }
  
  const handleDrop = (e) => {
    e.preventDefault()
    e.currentTarget.classList.remove('bg-[var(--glass-bg-hover)]')
    const prospectId = e.dataTransfer.getData('prospectId')
    if (prospectId) {
      onStageChange(prospectId, stage)
    }
  }
  
  return (
    <div 
      className={cn(
        'flex flex-col min-w-[280px] max-w-[320px] rounded-xl border transition-colors',
        isActive 
          ? 'border-2' 
          : 'border-[var(--glass-border)] bg-[var(--glass-bg)]'
      )}
      style={isActive ? { borderColor: brandColors.primary } : {}}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 border-b"
        style={{ borderColor: stageConfig.color + '30' }}
      >
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: stageConfig.bgLight }}
          >
            <StageIcon className="h-4 w-4" style={{ color: stageConfig.textColor }} />
          </div>
          <div>
            <p className="font-medium text-sm">{stageConfig.label}</p>
            <p className="text-xs text-[var(--text-tertiary)]">
              {prospects.length} {prospects.length === 1 ? 'lead' : 'leads'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Cards */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {prospects.map((prospect) => (
            <div
              key={prospect.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('prospectId', prospect.id)
              }}
            >
              <ProspectCard
                prospect={prospect}
                isSelected={selectedProspectId === prospect.id}
                onClick={onProspectClick}
                brandColors={brandColors}
              />
            </div>
          ))}
          {prospects.length === 0 && (
            <div className="text-center py-8 text-sm text-[var(--text-tertiary)]">
              No leads in this stage
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function CRMDashboard() {
  const { user, currentOrg, currentProject } = useAuthStore()
  const brandColors = useBrandColors()
  const { hasCurrentProjectSignal } = useSignalAccess()
  
  // Agency detection - agencies get extra features like calls, proposals, OpenPhone
  const isAgency = currentOrg?.org_type === 'agency' || 
                   currentOrg?.slug === 'uptrade-media' || 
                   currentOrg?.domain === 'uptrademedia.com'
  
  // Sidebar states
  const [showLeftSidebar, setShowLeftSidebar] = useState(true)
  const [showRightSidebar, setShowRightSidebar] = useState(false)
  const [rightSidebarExpanded, setRightSidebarExpanded] = useState(false) // Expanded mode for more space
  
  // View state
  const [viewMode, setViewMode] = useState('pipeline') // 'pipeline' | 'list' | 'analytics' | 'tasks' | 'reminders'
  const [showClosedDeals, setShowClosedDeals] = useState(false)
  
  // Data state
  const [prospects, setProspects] = useState([])
  const [tasks, setTasks] = useState([])
  const [reminders, setReminders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingTasks, setIsLoadingTasks] = useState(false)
  const [isLoadingReminders, setIsLoadingReminders] = useState(false)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [sourceFilter, setSourceFilter] = useState('all')
  const [stageFilters, setStageFilters] = useState([]) // Multi-select stages
  
  // Selected prospect(s)
  const [selectedProspect, setSelectedProspect] = useState(null)
  const [selectedProspects, setSelectedProspects] = useState([]) // For bulk actions
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false)
  
  // Dialogs
  const [isAddProspectOpen, setIsAddProspectOpen] = useState(false)
  const [isPipelineSettingsOpen, setIsPipelineSettingsOpen] = useState(false)
  
  // Signal AI enabled for this project
  const signalEnabled = hasCurrentProjectSignal

  // Extract primitive values for useEffect dependency to avoid array size warning
  const projectId = currentProject?.id
  const projectName = currentProject?.title || currentProject?.name
  const orgId = currentOrg?.id
  const orgName = currentOrg?.name
  const brandPrimary = brandColors.primary
  const brandSecondary = brandColors.secondary
  const brandColorSource = brandColors.colorSource

  // Debug: Log project context
  useEffect(() => {
    console.log('[CRM] Project Context:', { projectId, projectName, orgId, orgName })
    console.log('[CRM] Brand Colors:', { primary: brandPrimary, secondary: brandSecondary, colorSource: brandColorSource })
  }, [projectId, projectName, orgId, orgName, brandPrimary, brandSecondary, brandColorSource])
  
  // Computed stats
  const stats = useMemo(() => {
    const total = prospects.length
    const byStage = {}
    Object.keys(PIPELINE_STAGES).forEach(stage => {
      byStage[stage] = prospects.filter(p => p.pipeline_stage === stage).length
    })
    const fromForms = prospects.filter(p => p.source === 'form').length
    const activeCount = prospects.filter(p => ACTIVE_STAGES.includes(p.pipeline_stage)).length
    const conversionRate = total > 0 
      ? Math.round((byStage.closed_won / total) * 100) 
      : 0
    
    return { total, byStage, fromForms, activeCount, conversionRate }
  }, [prospects])

  // Fetch prospects - explicitly pass projectId like Forms does
  const fetchProspects = useCallback(async () => {
    if (!currentProject?.id) {
      console.log('[CRM] No project selected, skipping fetch')
      setProspects([])
      setIsLoading(false)
      return
    }
    
    setIsLoading(true)
    try {
      const params = {
        // CRITICAL: Explicitly pass projectId as query param (like Forms does)
        projectId: currentProject.id
      }
      
      if (debouncedSearch) params.search = debouncedSearch
      if (sourceFilter !== 'all') params.source = sourceFilter
      if (stageFilters.length > 0) params.stages = stageFilters.join(',')
      
      console.log('[CRM] Fetching prospects with params:', params)
      
      const response = await crmApi.listProspects(params)
      const fetchedProspects = response.data?.prospects || response.data?.data || []
      
      console.log('[CRM] Fetched', fetchedProspects.length, 'prospects')
      setProspects(fetchedProspects)
    } catch (err) {
      console.error('[CRM] Failed to fetch prospects:', err)
      toast.error('Failed to load prospects')
      setProspects([])
    } finally {
      setIsLoading(false)
    }
  }, [currentProject?.id, debouncedSearch, sourceFilter, stageFilters])

  // Auto-fetch on filter changes or project change
  useEffect(() => {
    fetchProspects()
  }, [fetchProspects])

  // Refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchProspects()
    setIsRefreshing(false)
    toast.success('Data refreshed')
  }

  // Handle stage change from drag & drop
  const handleUpdateStage = async (prospectId, newStage) => {
    try {
      await crmApi.updateProspect(prospectId, { pipelineStage: newStage })
      
      setProspects(prev => prev.map(p => 
        p.id === prospectId ? { ...p, pipeline_stage: newStage } : p
      ))
      
      if (selectedProspect?.id === prospectId) {
        setSelectedProspect(prev => ({ ...prev, pipeline_stage: newStage }))
      }
      
      toast.success('Stage updated')
    } catch (err) {
      console.error('Failed to update stage:', err)
      const errorMsg = err.response?.data?.message || 'Failed to update stage'
      toast.error(errorMsg)
    }
  }

  // Handle prospect click
  const handleProspectClick = (prospect) => {
    setSelectedProspect(prospect)
    setShowRightSidebar(true)
  }

  // Handle prospect added
  const handleProspectAdded = (newProspect) => {
    setProspects(prev => [newProspect, ...prev])
    toast.success('Prospect added')
  }

  // Filter prospects for display
  const filteredProspects = useMemo(() => {
    let result = prospects
    
    // Filter out closed if not showing
    if (!showClosedDeals) {
      result = result.filter(p => ACTIVE_STAGES.includes(p.pipeline_stage))
    }
    
    return result
  }, [prospects, showClosedDeals])

  // Group prospects by stage for pipeline view
  const prospectsByStage = useMemo(() => {
    const grouped = {}
    Object.keys(PIPELINE_STAGES).forEach(stage => {
      grouped[stage] = filteredProspects.filter(p => p.pipeline_stage === stage)
    })
    return grouped
  }, [filteredProspects])

  // Stages to show based on showClosedDeals
  const visibleStages = showClosedDeals 
    ? Object.keys(PIPELINE_STAGES)
    : ACTIVE_STAGES

  return (
    <TooltipProvider>
      <div className="h-[calc(100vh-120px)] flex flex-col bg-background overflow-hidden">
        {/* ===== TOP HEADER BAR ===== */}
        <div className="flex-shrink-0 h-14 border-b flex items-center justify-between px-4 bg-card/50">
          {/* Left: Branding + Navigation */}
          <div className="flex items-center gap-4">
            {/* Toggle Left Sidebar */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={() => setShowLeftSidebar(!showLeftSidebar)}
                >
                  <PanelLeftClose className={cn("h-4 w-4 transition-transform", !showLeftSidebar && "rotate-180")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showLeftSidebar ? 'Hide sidebar' : 'Show sidebar'}</TooltipContent>
            </Tooltip>
            
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
                style={{ background: `linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.secondary} 100%)` }}
              >
                <Users className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-lg hidden lg:inline">
                {isAgency ? 'CRM' : 'Prospects'}
              </span>
              {isAgency && (
                <Badge 
                  className="text-[10px] px-1.5 hidden sm:flex"
                  style={{ 
                    backgroundColor: brandColors.rgba.secondary10, 
                    color: brandColors.secondary,
                    border: `1px solid ${brandColors.rgba.secondary30}`
                  }}
                >
                  <Phone className="h-3 w-3 mr-1" />
                  Agency
                </Badge>
              )}
              {signalEnabled && (
                <Badge 
                  className="text-[10px] px-1.5 hidden sm:flex"
                  style={{ 
                    backgroundColor: brandColors.rgba.primary10, 
                    color: brandColors.primary,
                    border: `1px solid ${brandColors.rgba.primary30}`
                  }}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI
                </Badge>
              )}
            </div>
            
            {/* Stats Summary */}
            <div className="hidden md:flex items-center gap-4 ml-4 text-sm">
              <span className="text-[var(--text-tertiary)]">
                <span className="font-medium text-[var(--text-primary)]">{stats.activeCount}</span> active
              </span>
              <span className="text-[var(--text-tertiary)]">
                <span className="font-medium text-[var(--text-primary)]">{stats.fromForms}</span> from forms
              </span>
              {stats.conversionRate > 0 && (
                <span className="text-green-600">
                  <TrendingUp className="h-3.5 w-3.5 inline mr-1" />
                  {stats.conversionRate}% won
                </span>
              )}
            </div>
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search prospects..." 
                className="pl-8 h-8 w-[200px] text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Refresh */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
            
            {/* View Mode Toggle */}
            <div className="flex border rounded-md overflow-hidden">
              {[
                { id: 'pipeline', label: 'Pipeline', icon: LayoutGrid },
                { id: 'list', label: 'List', icon: List },
              ].map((mode) => (
                <Tooltip key={mode.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setViewMode(mode.id)}
                      className={cn(
                        "h-8 px-3 text-xs font-medium transition-colors flex items-center gap-1.5",
                        viewMode === mode.id 
                          ? "text-white" 
                          : "hover:bg-muted text-muted-foreground"
                      )}
                      style={viewMode === mode.id ? { backgroundColor: brandColors.primary } : {}}
                    >
                      <mode.icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{mode.label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{mode.label} view</TooltipContent>
                </Tooltip>
              ))}
            </div>
            
            {/* Pipeline Settings (only in pipeline view) */}
            {viewMode === 'pipeline' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={() => setIsPipelineSettingsOpen(true)}
                  >
                    <Sliders className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Configure pipeline</TooltipContent>
              </Tooltip>
            )}
            
            {/* Add Prospect */}
            <Button 
              size="sm" 
              className="gap-1.5"
              onClick={() => setIsAddProspectOpen(true)}
              style={{ backgroundColor: brandColors.primary, color: 'white' }}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Lead</span>
            </Button>
            
            {/* Toggle Right Sidebar */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={() => setShowRightSidebar(!showRightSidebar)}
                >
                  <PanelRightClose className={cn("h-4 w-4 transition-transform", !showRightSidebar && "rotate-180")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showRightSidebar ? 'Hide details' : 'Show details'}</TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        {/* ===== MAIN CONTENT AREA (3-Column Layout) ===== */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* ===== LEFT SIDEBAR ===== */}
          <AnimatePresence>
            {showLeftSidebar && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 240, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="flex-shrink-0 border-r overflow-hidden bg-muted/30"
              >
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-6">
                    
                    {/* Quick Stats */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overview</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-lg bg-background border">
                          <p className="text-2xl font-bold" style={{ color: brandColors.primary }}>
                            {stats.total}
                          </p>
                          <p className="text-xs text-muted-foreground">Total Leads</p>
                        </div>
                        <div className="p-3 rounded-lg bg-background border">
                          <p className="text-2xl font-bold text-green-600">
                            {stats.byStage.closed_won || 0}
                          </p>
                          <p className="text-xs text-muted-foreground">Won</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Stage Filters */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stages</p>
                      <div className="space-y-1">
                        {Object.entries(PIPELINE_STAGES).map(([key, config]) => {
                          const count = stats.byStage[key] || 0
                          const isHidden = !showClosedDeals && (key === 'closed_won' || key === 'closed_lost')
                          
                          if (isHidden) return null
                          
                          return (
                            <button
                              key={key}
                              onClick={() => {
                                setViewMode('pipeline')
                                setStageFilters([key])
                              }}
                              className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: config.color }}
                                />
                                <span>{config.label}</span>
                              </div>
                              <Badge variant="secondary" className="text-[10px] h-5 min-w-5 justify-center">
                                {count}
                              </Badge>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    
                    {/* Source Filter */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Source</p>
                      <Select value={sourceFilter} onValueChange={setSourceFilter}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="All Sources" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Sources</SelectItem>
                          <SelectItem value="form">Form Submission</SelectItem>
                          <SelectItem value="manual">Manual Entry</SelectItem>
                          <SelectItem value="import">Import</SelectItem>
                          <SelectItem value="referral">Referral</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Show Closed Toggle */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Display</p>
                      <label className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted cursor-pointer">
                        <Checkbox 
                          checked={showClosedDeals}
                          onCheckedChange={setShowClosedDeals}
                        />
                        <span className="text-sm">Show closed deals</span>
                      </label>
                    </div>
                    
                    {/* Current Project */}
                    {currentProject && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project</p>
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-muted/50">
                          <div 
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: brandColors.primary }}
                          />
                          <span className="text-sm font-medium truncate">
                            {currentProject.name || currentProject.title}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Signal Features */}
                    {signalEnabled && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <SignalIcon size={12} color={brandColors.primary} />
                          Signal
                        </p>
                        <div 
                          className="p-3 rounded-lg border space-y-1"
                          style={{ 
                            borderColor: brandColors.rgba.primary30,
                            backgroundColor: brandColors.rgba.primary10 
                          }}
                        >
                          <button className="w-full text-left px-2 py-1.5 rounded-md hover:bg-white/50 dark:hover:bg-black/20 transition-colors">
                            <div className="flex items-center gap-2" style={{ color: brandColors.primary }}>
                              <Target className="h-4 w-4" />
                              <span className="text-sm font-medium">Score Leads</span>
                            </div>
                          </button>
                          <button className="w-full text-left px-2 py-1.5 rounded-md hover:bg-white/50 dark:hover:bg-black/20 transition-colors">
                            <div className="flex items-center gap-2" style={{ color: brandColors.primary }}>
                              <Zap className="h-4 w-4" />
                              <span className="text-sm font-medium">Auto-Assign</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Agency-Only Features (OpenPhone, Calls, Proposals) */}
                    {/* View Switcher */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        View
                      </p>
                      <div className="space-y-1">
                        <button
                          onClick={() => setViewMode('pipeline')}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2",
                            viewMode === 'pipeline'
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-muted"
                          )}
                        >
                          <Kanban className="h-4 w-4" />
                          <span className="text-sm">Pipeline</span>
                        </button>
                        <button
                          onClick={() => setViewMode('list')}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2",
                            viewMode === 'list'
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-muted"
                          )}
                        >
                          <List className="h-4 w-4" />
                          <span className="text-sm">List View</span>
                        </button>
                        <button
                          onClick={() => setViewMode('analytics')}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2",
                            viewMode === 'analytics'
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-muted"
                          )}
                        >
                          <BarChart3 className="h-4 w-4" />
                          <span className="text-sm">Analytics</span>
                        </button>
                        <button
                          onClick={() => setViewMode('tasks')}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2",
                            viewMode === 'tasks'
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-muted"
                          )}
                        >
                          <ListTodo className="h-4 w-4" />
                          <span className="text-sm">Tasks</span>
                        </button>
                        <button
                          onClick={() => setViewMode('reminders')}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2",
                            viewMode === 'reminders'
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-muted"
                          )}
                        >
                          <Bell className="h-4 w-4" />
                          <span className="text-sm">Reminders</span>
                        </button>
                        <button
                          onClick={() => setViewMode('email')}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2",
                            viewMode === 'email'
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-muted"
                          )}
                        >
                          <Mail className="h-4 w-4" />
                          <span className="text-sm">Email</span>
                        </button>
                      </div>
                    </div>

                    {isAgency && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Phone className="h-3 w-3" />
                          Agency Tools
                        </p>
                        <div 
                          className="p-3 rounded-lg border space-y-1"
                          style={{ 
                            borderColor: brandColors.rgba.secondary30,
                            backgroundColor: brandColors.rgba.secondary10 
                          }}
                        >
                          <button 
                            className={cn(
                              "w-full text-left px-2 py-1.5 rounded-md transition-colors",
                              viewMode === 'radar'
                                ? "bg-background shadow-sm"
                                : "hover:bg-white/50 dark:hover:bg-black/20"
                            )}
                            onClick={() => setViewMode('radar')}
                          >
                            <div className="flex items-center gap-2" style={{ color: brandColors.secondary }}>
                              <Target className="h-4 w-4" />
                              <span className="text-sm font-medium">Radar</span>
                            </div>
                          </button>
                          <button 
                            className={cn(
                              "w-full text-left px-2 py-1.5 rounded-md transition-colors",
                              viewMode === 'prospecting'
                                ? "bg-background shadow-sm"
                                : "hover:bg-white/50 dark:hover:bg-black/20"
                            )}
                            onClick={() => setViewMode('prospecting')}
                          >
                            <div className="flex items-center gap-2" style={{ color: brandColors.secondary }}>
                              <Search className="h-4 w-4" />
                              <span className="text-sm font-medium">Prospecting</span>
                            </div>
                          </button>
                          <button className="w-full text-left px-2 py-1.5 rounded-md hover:bg-white/50 dark:hover:bg-black/20 transition-colors">
                            <div className="flex items-center gap-2" style={{ color: brandColors.secondary }}>
                              <Phone className="h-4 w-4" />
                              <span className="text-sm font-medium">Call Log</span>
                            </div>
                          </button>
                          <button className="w-full text-left px-2 py-1.5 rounded-md hover:bg-white/50 dark:hover:bg-black/20 transition-colors">
                            <div className="flex items-center gap-2" style={{ color: brandColors.secondary }}>
                              <FileText className="h-4 w-4" />
                              <span className="text-sm font-medium">Proposals</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* ===== CENTER CONTENT ===== */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin" style={{ color: brandColors.primary }} />
                  <p className="text-sm text-muted-foreground">Loading prospects...</p>
                </div>
              </div>
            ) : !currentProject ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: brandColors.rgba.primary10 }}
                  >
                    <AlertCircle className="h-8 w-8" style={{ color: brandColors.primary }} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Project Selected</h3>
                  <p className="text-sm text-muted-foreground">
                    Please select a project from the sidebar to view prospects.
                  </p>
                </div>
              </div>
            ) : filteredProspects.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: brandColors.rgba.primary10 }}
                  >
                    <Users className="h-8 w-8" style={{ color: brandColors.primary }} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No prospects yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {searchQuery || sourceFilter !== 'all' 
                      ? 'Try adjusting your filters' 
                      : 'Add your first prospect to get started'}
                  </p>
                  {!searchQuery && sourceFilter === 'all' && (
                    <Button 
                      onClick={() => setIsAddProspectOpen(true)}
                      style={{ backgroundColor: brandColors.primary, color: 'white' }}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add First Lead
                    </Button>
                  )}
                </div>
              </div>
            ) : viewMode === 'analytics' ? (
              // Analytics View
              <div className="flex-1 overflow-auto">
                <CRMAnalyticsDashboard 
                  projectId={currentProject?.id}
                  brandColors={brandColors}
                />
              </div>
            ) : viewMode === 'tasks' ? (
              // Tasks View - Full featured tasks manager with Sync integration
              <CRMTasksManager 
                projectId={currentProject?.id}
                brandColors={brandColors}
              />
            ) : viewMode === 'reminders' ? (
              // Reminders View - Full featured reminders manager with Sync integration
              <CRMRemindersManager 
                projectId={currentProject?.id}
                brandColors={brandColors}
              />
            ) : viewMode === 'email' ? (
              // Email View - Gmail inbox integration
              <CRMEmailHub 
                brandColors={brandColors}
              />
            ) : viewMode === 'radar' ? (
              // Radar View - Signal AI Prospecting via Places API
              <ProspectingDashboard />
            ) : viewMode === 'prospecting' ? (
              // Prospecting View - Chrome extension target companies
              <SalesDashboard title="Prospecting" fetchParams={{ source: 'extension' }} />
            ) : viewMode === 'pipeline' ? (
              // Pipeline/Kanban View - Fill vertical space
              <div className="flex-1 min-h-0 p-4">
                <PipelineKanban
                  prospects={filteredProspects}
                  selectedProspects={selectedProspects}
                  isLoading={isLoading}
                  showClosedDeals={showClosedDeals}
                  onToggleClosedDeals={() => setShowClosedDeals(!showClosedDeals)}
                  onSelectProspect={(id) => {
                    if (selectedProspects.includes(id)) {
                      setSelectedProspects(selectedProspects.filter(p => p !== id))
                    } else {
                      setSelectedProspects([...selectedProspects, id])
                    }
                  }}
                  onProspectClick={handleProspectClick}
                  onMoveToStage={handleUpdateStage}
                  className="h-full"
                />
              </div>
            ) : (
              // List View
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-2">
                  {filteredProspects.map((prospect) => (
                    <ProspectCard
                      key={prospect.id}
                      prospect={prospect}
                      isSelected={selectedProspect?.id === prospect.id}
                      onClick={handleProspectClick}
                      compact
                      brandColors={brandColors}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
          
          {/* ===== RIGHT SIDEBAR (Detail Panel) ===== */}
          <AnimatePresence>
            {showRightSidebar && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 360, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="flex-shrink-0 border-l overflow-hidden bg-background relative"
              >
                {selectedProspect ? (
                  <ProspectDetailDrawer
                    prospect={selectedProspect}
                    onClose={() => {
                      setShowRightSidebar(false)
                      setSelectedProspect(null)
                    }}
                    onUpdate={(updated) => {
                      if (updated) {
                        setProspects(prev => prev.map(p => 
                          p.id === updated.id ? updated : p
                        ))
                        setSelectedProspect(updated)
                      } else {
                        handleRefresh()
                      }
                    }}
                    onStageChange={(newStage) => {
                      handleUpdateStage(selectedProspect.id, newStage)
                    }}
                    isAgency={isAgency}
                    embedded
                    expanded={rightSidebarExpanded}
                    onExpand={(expanded) => setRightSidebarExpanded(expanded)}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center p-4">
                    <div className="text-center">
                      <div 
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                        style={{ backgroundColor: brandColors.rgba.primary10 }}
                      >
                        <Users className="h-8 w-8" style={{ color: brandColors.primary }} />
                      </div>
                      <h3 className="font-medium mb-1">No prospect selected</h3>
                      <p className="text-sm text-muted-foreground">
                        Click on a prospect to view details
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Add Prospect Dialog */}
        <AddProspectDialog
          open={isAddProspectOpen}
          onOpenChange={setIsAddProspectOpen}
          onProspectAdded={handleProspectAdded}
        />

        {/* Pipeline Settings Dialog */}
        <PipelineSettingsDialog
          open={isPipelineSettingsOpen}
          onClose={() => setIsPipelineSettingsOpen(false)}
          projectId={currentProject?.id}
          onUpdate={handleRefresh}
        />
      </div>
    </TooltipProvider>
  )
}
