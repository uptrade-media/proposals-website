/**
 * CRMDashboard - Main orchestrator component for the CRM
 * Features: Glass design, tabbed navigation, pipeline/table views, modular architecture
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  TrendingUp,
  Users,
  Phone,
  ListTodo,
  Clock,
  RefreshCw,
  UserPlus,
  Search,
  Grid3X3,
  Table2,
  Eye,
  CheckCheck,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  XCircle,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Trash2, ChevronRight } from 'lucide-react'
import { toast } from '@/lib/toast'
import useAuthStore from '@/lib/auth-store'
import useNotificationStore from '@/lib/notification-store'
import useDebounce from '@/hooks/useDebounce'
import api from '@/lib/api'

// CRM Components
import CRMStats from './CRMStats'
import PipelineKanban, { PIPELINE_STAGES } from './PipelineKanban'
import ProspectDetailPanel from './ProspectDetailPanel'
import EmailComposeDialog from './EmailComposeDialog'
import AddProspectDialog from './AddProspectDialog'
import ConvertDialog from './ConvertDialog'
import CallsTab from './CallsTab'
import TasksTab from './TasksTab'
import FollowUpsTab from './FollowUpsTab'
import UsersTab from './UsersTab'
import TeamTab from './TeamTab'
import ProposalAIDialog from '@/components/ProposalAIDialog'
import CallIntentDialog from './CallIntentDialog'
import AuditViewModal from './AuditViewModal'
import NotificationsPanel from './NotificationsPanel'
import LeadScoreBadge from './LeadScoreBadge'
import AssignContactDialog from './AssignContactDialog'
import { GlassCard, GlassEmptyState, StageBadge, LeadQualityBadge } from './ui'

// Format relative time
function formatRelativeTime(date) {
  if (!date) return 'Never'
  const now = new Date()
  const d = new Date(date)
  const diff = now - d
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

export default function CRMDashboard() {
  const { user } = useAuthStore()
  const { markLeadsAsViewed } = useNotificationStore()
  
  // View state
  const [activeTab, setActiveTab] = useState('prospects')
  const [viewMode, setViewMode] = useState('pipeline')
  const [showClosedDeals, setShowClosedDeals] = useState(false)
  
  // Table sorting
  const [sortColumn, setSortColumn] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  
  // Data state
  const [prospects, setProspects] = useState([])
  const [activeUsers, setActiveUsers] = useState([])
  const [calls, setCalls] = useState([])
  const [tasks, setTasks] = useState([])
  const [followUps, setFollowUps] = useState([])
  const [callsSummary, setCallsSummary] = useState({})
  const [tasksSummary, setTasksSummary] = useState({})
  const [followUpsSummary, setFollowUpsSummary] = useState({})
  const [pipelineStats, setPipelineStats] = useState({})
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingCalls, setIsLoadingCalls] = useState(false)
  const [isLoadingTasks, setIsLoadingTasks] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300) // 300ms debounce for real-time search
  const [stageFilter, setStageFilter] = useState('all')
  const [callsDirection, setCallsDirection] = useState('all')
  const [tasksStatus, setTasksStatus] = useState('pending')
  
  // Selected items
  const [selectedProspect, setSelectedProspect] = useState(null)
  const [selectedProspects, setSelectedProspects] = useState([])
  const [isBulkActionOpen, setIsBulkActionOpen] = useState(false)
  
  // Prospect detail data
  const [prospectAudits, setProspectAudits] = useState([])
  const [prospectProposals, setProspectProposals] = useState([])
  const [prospectEmails, setProspectEmails] = useState([])
  const [prospectScheduledFollowups, setProspectScheduledFollowups] = useState([])
  const [prospectActivity, setProspectActivity] = useState([])
  const [prospectCalls, setProspectCalls] = useState([])
  const [isLoadingProspectData, setIsLoadingProspectData] = useState(false)
  const [isLoadingProspectCalls, setIsLoadingProspectCalls] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)
  
  // Dialogs
  const [isAddProspectOpen, setIsAddProspectOpen] = useState(false)
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false)
  const [convertTarget, setConvertTarget] = useState(null)
  
  // Email compose dialog
  const [isEmailComposeOpen, setIsEmailComposeOpen] = useState(false)
  const [emailComposeTarget, setEmailComposeTarget] = useState(null)
  const [emailComposeAudits, setEmailComposeAudits] = useState([])
  const [emailComposeProposals, setEmailComposeProposals] = useState([])
  
  // Proposal dialog
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false)
  const [proposalDialogData, setProposalDialogData] = useState(null)
  
  // Call dialog
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false)
  const [callTarget, setCallTarget] = useState(null)
  
  // Audit view modal
  const [isAuditViewOpen, setIsAuditViewOpen] = useState(false)
  const [viewingAudit, setViewingAudit] = useState(null)
  
  // Bulk assignment
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false)
  const [isBulkAssigning, setIsBulkAssigning] = useState(false)

  // Check admin access
  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <GlassCard className="max-w-md p-8 text-center">
          <div className="p-4 rounded-2xl bg-red-500/10 w-fit mx-auto mb-4">
            <XCircle className="h-12 w-12 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Access Denied</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            Admin privileges required to access the CRM dashboard.
          </p>
        </GlassCard>
      </div>
    )
  }

  // API Calls
  const fetchProspects = useCallback(async (searchOverride) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      const searchTerm = searchOverride !== undefined ? searchOverride : debouncedSearch
      if (searchTerm) params.append('search', searchTerm)
      if (stageFilter !== 'all') params.append('stage', stageFilter)
      
      const response = await api.get(`/.netlify/functions/crm-prospects-list?${params.toString()}`)
      setProspects(response.data.prospects || [])
      setPipelineStats(response.data.pipelineStats || {})
    } catch (err) {
      console.error('Failed to fetch prospects:', err)
      toast.error('Failed to load prospects')
      setProspects([])
    } finally {
      setIsLoading(false)
    }
  }, [debouncedSearch, stageFilter])

  // Auto-fetch when debounced search changes
  useEffect(() => {
    fetchProspects()
  }, [debouncedSearch, stageFilter])

  const fetchActiveUsers = useCallback(async () => {
    setIsLoadingUsers(true)
    try {
      const response = await api.get('/.netlify/functions/crm-users-list')
      setActiveUsers(response.data.users || [])
    } catch (err) {
      console.error('Failed to fetch active users:', err)
      setActiveUsers([])
    } finally {
      setIsLoadingUsers(false)
    }
  }, [])

  const handleResendInvite = useCallback(async (user) => {
    try {
      toast.info(`Sending invite to ${user.email}...`)
      await api.post('/.netlify/functions/admin-resend-setup-email', { clientId: user.id })
      toast.success(`Setup email sent to ${user.email}`)
    } catch (err) {
      console.error('Failed to resend invite:', err)
      toast.error(err.response?.data?.error || 'Failed to send invite email')
    }
  }, [])

  const fetchCalls = useCallback(async () => {
    setIsLoadingCalls(true)
    try {
      const params = new URLSearchParams()
      if (callsDirection !== 'all') params.append('direction', callsDirection)
      params.append('limit', '20')
      
      const response = await api.get(`/.netlify/functions/crm-calls-list?${params.toString()}`)
      setCalls(response.data.calls || [])
      setCallsSummary(response.data.summary || {})
    } catch (err) {
      console.error('Failed to fetch calls:', err)
      setCalls([])
    } finally {
      setIsLoadingCalls(false)
    }
  }, [callsDirection])

  const fetchTasks = useCallback(async () => {
    setIsLoadingTasks(true)
    try {
      const params = new URLSearchParams()
      if (tasksStatus !== 'all') params.append('status', tasksStatus)
      
      const response = await api.get(`/.netlify/functions/crm-tasks-list?${params.toString()}`)
      setTasks(response.data.tasks || [])
      setTasksSummary(response.data.summary || {})
    } catch (err) {
      console.error('Failed to fetch tasks:', err)
      setTasks([])
    } finally {
      setIsLoadingTasks(false)
    }
  }, [tasksStatus])

  const fetchFollowUps = useCallback(async () => {
    try {
      const response = await api.get('/.netlify/functions/crm-follow-ups-list?status=pending')
      setFollowUps(response.data.followUps || [])
      setFollowUpsSummary(response.data.summary || {})
    } catch (err) {
      console.error('Failed to fetch follow-ups:', err)
      setFollowUps([])
    }
  }, [])

  // Initial fetch (prospects handled by debounced search effect)
  useEffect(() => {
    fetchActiveUsers()
    fetchCalls()
    fetchTasks()
    fetchFollowUps()
    markLeadsAsViewed()
  }, [])

  // Refresh all data
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([
      fetchProspects(),
      fetchActiveUsers(),
      fetchCalls(),
      fetchTasks(),
      fetchFollowUps()
    ])
    setIsRefreshing(false)
    toast.success('Data refreshed')
  }

  // Handlers
  const handleUpdateStage = async (prospectId, newStage) => {
    try {
      await api.patch('/.netlify/functions/crm-prospects-update', {
        id: prospectId,
        pipelineStage: newStage
      })
      
      setProspects(prospects.map(p => 
        p.id === prospectId ? { ...p, pipeline_stage: newStage } : p
      ))
      
      toast.success(`Moved to ${PIPELINE_STAGES[newStage].label}`)
    } catch (err) {
      console.error('Failed to update stage:', err)
      toast.error('Failed to update pipeline stage')
    }
  }

  const handleCompleteTask = async (taskId) => {
    try {
      await api.patch('/.netlify/functions/crm-tasks-update', {
        id: taskId,
        status: 'completed'
      })
      toast.success('Task completed!')
      fetchTasks()
    } catch (err) {
      toast.error('Failed to complete task')
    }
  }

  const handleCompleteFollowUp = async (followUpId) => {
    try {
      await api.patch('/.netlify/functions/crm-follow-ups-update', {
        id: followUpId,
        status: 'completed'
      })
      toast.success('Follow-up completed!')
      fetchFollowUps()
    } catch (err) {
      toast.error('Failed to complete follow-up')
    }
  }

  const handleBulkStageChange = async (stage) => {
    if (selectedProspects.length === 0) return
    
    try {
      await api.post('/.netlify/functions/crm-prospects-bulk-update', {
        action: 'change_stage',
        prospectIds: selectedProspects,
        data: { stage }
      })
      toast.success(`${selectedProspects.length} prospect(s) moved to ${PIPELINE_STAGES[stage].label}`)
      setSelectedProspects([])
      setIsBulkActionOpen(false)
      fetchProspects()
    } catch (err) {
      toast.error('Failed to update prospects')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedProspects.length === 0) return
    
    try {
      await api.post('/.netlify/functions/crm-prospects-bulk-update', {
        action: 'delete',
        prospectIds: selectedProspects
      })
      toast.success(`${selectedProspects.length} prospect(s) archived`)
      setSelectedProspects([])
      setIsBulkActionOpen(false)
      fetchProspects()
    } catch (err) {
      toast.error('Failed to archive prospects')
    }
  }

  const handleBulkAssign = async (teamMemberId, notify) => {
    if (selectedProspects.length === 0) return
    
    setIsBulkAssigning(true)
    try {
      await api.post('/.netlify/functions/admin-contacts-assign', {
        contactIds: selectedProspects,
        assignedTo: teamMemberId,
        notify
      })
      toast.success(`${selectedProspects.length} contact(s) assigned`)
      setSelectedProspects([])
      setIsBulkAssignOpen(false)
      fetchProspects()
    } catch (err) {
      toast.error('Failed to assign contacts')
    } finally {
      setIsBulkAssigning(false)
    }
  }

  // Open prospect detail and fetch related data
  const openProspectDetail = async (prospect) => {
    setSelectedProspect(prospect)
    setIsLoadingProspectData(true)
    setIsLoadingProspectCalls(true)
    
    try {
      // Fetch audits, proposals, emails, activity, calls, and scheduled follow-ups in parallel
      const [auditsRes, proposalsRes, emailsRes, activityRes, callsRes, followupsRes] = await Promise.all([
        api.get(`/.netlify/functions/audits-list?contactId=${prospect.id}`).catch(() => ({ data: { audits: [] } })),
        api.get(`/.netlify/functions/proposals-list?contactId=${prospect.id}`).catch(() => ({ data: { proposals: [] } })),
        api.get(`/.netlify/functions/crm-emails-list?contactId=${prospect.id}`).catch(() => ({ data: { emails: [] } })),
        api.get(`/.netlify/functions/crm-prospect-activity?contactId=${prospect.id}`).catch(() => ({ data: { timeline: [] } })),
        api.get(`/.netlify/functions/calls-list?contactId=${prospect.id}`).catch(() => ({ data: { calls: [] } })),
        api.get(`/.netlify/functions/scheduled-followups?contactId=${prospect.id}`).catch(() => ({ data: { followups: [] } }))
      ])
      
      setProspectAudits(auditsRes.data.audits || auditsRes.data || [])
      setProspectProposals(proposalsRes.data.proposals || proposalsRes.data || [])
      setProspectEmails(emailsRes.data.emails || emailsRes.data || [])
      setProspectScheduledFollowups(followupsRes.data.followups || [])
      setProspectActivity(activityRes.data.timeline || [])
      setProspectCalls(callsRes.data.calls || callsRes.data || [])
    } catch (err) {
      console.error('Failed to fetch prospect data:', err)
    } finally {
      setIsLoadingProspectData(false)
      setIsLoadingProspectCalls(false)
    }
  }

  // Close prospect detail panel
  const closeProspectDetail = () => {
    setSelectedProspect(null)
    setProspectAudits([])
    setProspectProposals([])
    setProspectEmails([])
    setProspectScheduledFollowups([])
    setProspectActivity([])
    setProspectCalls([])
    setNewNote('')
  }

  // Quick actions for prospects
  const handleCallProspect = (prospect) => {
    if (prospect.phone) {
      setCallTarget(prospect)
      setIsCallDialogOpen(true)
    } else {
      toast.error('No phone number available for this contact')
    }
  }
  
  const handleCallInitiated = (prospect) => {
    // Refresh prospect data to show updated call count
    if (selectedProspect?.id === prospect.id) {
      fetchProspectDetail(prospect)
    }
    toast.success(`Calling ${prospect.name || 'contact'}...`)
  }
  
  // View audit in modal
  const handleViewAudit = (audit) => {
    setViewingAudit(audit)
    setIsAuditViewOpen(true)
  }

  const handleEmailProspect = async (prospect) => {
    if (prospect.email) {
      setEmailComposeTarget(prospect)
      setIsEmailComposeOpen(true)
      
      // Fetch audits and proposals for this contact
      try {
        const [auditsRes, proposalsRes] = await Promise.all([
          api.get(`/.netlify/functions/audits-list?contactId=${prospect.id}`).catch(() => ({ data: { audits: [] } })),
          api.get(`/.netlify/functions/proposals-list?contactId=${prospect.id}`).catch(() => ({ data: { proposals: [] } }))
        ])
        setEmailComposeAudits(auditsRes.data.audits || auditsRes.data || [])
        setEmailComposeProposals(proposalsRes.data.proposals || proposalsRes.data || [])
      } catch (err) {
        console.error('Failed to fetch contact data for email:', err)
        setEmailComposeAudits([])
        setEmailComposeProposals([])
      }
    }
  }

  // Handle create proposal - opens AI dialog with pre-filled data
  const handleCreateProposal = (prospect) => {
    // Get the most recent audit if available
    const mostRecentAudit = prospectAudits.length > 0
      ? prospectAudits.reduce((latest, a) => 
          new Date(a.created_at) > new Date(latest.created_at) ? a : latest
        )
      : null

    // Build context from audit data if available
    let auditContext = ''
    if (mostRecentAudit) {
      const scores = []
      if (mostRecentAudit.score_overall) scores.push(`Overall: ${mostRecentAudit.score_overall}/100`)
      if (mostRecentAudit.score_performance) scores.push(`Performance: ${mostRecentAudit.score_performance}/100`)
      if (mostRecentAudit.score_seo) scores.push(`SEO: ${mostRecentAudit.score_seo}/100`)
      if (mostRecentAudit.score_accessibility) scores.push(`Accessibility: ${mostRecentAudit.score_accessibility}/100`)
      
      auditContext = `\n\nWebsite Audit Results (${new Date(mostRecentAudit.created_at).toLocaleDateString()}):\n${scores.join(', ')}`
      if (mostRecentAudit.recommendations) {
        auditContext += `\nKey Issues: ${mostRecentAudit.recommendations.slice(0, 3).join('; ')}`
      }
    }

    // Pre-fill form data
    setProposalDialogData({
      contactId: prospect.id,
      clientName: prospect.name || '',
      clientCompany: prospect.company || '',
      clientEmail: prospect.email || '',
      brandName: prospect.company || prospect.name || '',
      websiteUrl: prospect.website || '',
      context: `Prospect from CRM pipeline (${PIPELINE_STAGES[prospect.pipeline_stage || 'new_lead']?.label || 'New Lead'})${auditContext}`,
      notes: prospect.notes || ''
    })
    setIsProposalDialogOpen(true)
  }
  
  // Handle email sent - refresh emails list
  const handleEmailSent = async (result) => {
    toast.success('Email sent and tracked!')
    // Refresh prospect emails if we have one selected
    if (selectedProspect) {
      try {
        const emailsRes = await api.get(`/.netlify/functions/crm-emails-list?contactId=${selectedProspect.id}`)
        setProspectEmails(emailsRes.data.emails || [])
      } catch (err) {
        console.error('Failed to refresh emails:', err)
      }
    }
  }

  const handleViewWebsite = (prospect) => {
    if (prospect.website) {
      window.open(prospect.website, '_blank', 'noopener,noreferrer')
    }
  }

  // Add note to prospect
  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedProspect) return
    
    setIsAddingNote(true)
    try {
      await api.post('/.netlify/functions/crm-notes-create', {
        contactId: selectedProspect.id,
        content: newNote.trim(),
        noteType: 'general'
      })
      toast.success('Note added!')
      setNewNote('')
      // Refresh activity
      const activityRes = await api.get(`/.netlify/functions/crm-prospect-activity?contactId=${selectedProspect.id}`)
      setProspectActivity(activityRes.data.timeline || [])
    } catch (err) {
      toast.error('Failed to add note')
    } finally {
      setIsAddingNote(false)
    }
  }

  const openConvertDialog = (prospect) => {
    setConvertTarget(prospect)
    setIsConvertDialogOpen(true)
  }

  // Sorted prospects for table view
  const sortedProspects = useMemo(() => {
    const sorted = [...prospects]
    sorted.sort((a, b) => {
      let aVal, bVal
      
      switch (sortColumn) {
        case 'name':
          aVal = (a.name || '').toLowerCase()
          bVal = (b.name || '').toLowerCase()
          break
        case 'company':
          aVal = (a.company || '').toLowerCase()
          bVal = (b.company || '').toLowerCase()
          break
        case 'email':
          aVal = (a.email || '').toLowerCase()
          bVal = (b.email || '').toLowerCase()
          break
        case 'stage':
          aVal = Object.keys(PIPELINE_STAGES).indexOf(a.pipeline_stage || 'new_lead')
          bVal = Object.keys(PIPELINE_STAGES).indexOf(b.pipeline_stage || 'new_lead')
          break
        case 'lead_score':
          aVal = a.lead_score || 0
          bVal = b.lead_score || 0
          break
        case 'calls':
          aVal = a.call_count || 0
          bVal = b.call_count || 0
          break
        case 'last_contact':
          aVal = a.last_call?.created_at ? new Date(a.last_call.created_at).getTime() : 0
          bVal = b.last_call?.created_at ? new Date(b.last_call.created_at).getTime() : 0
          break
        case 'created':
          aVal = a.created_at ? new Date(a.created_at).getTime() : 0
          bVal = b.created_at ? new Date(b.created_at).getTime() : 0
          break
        default:
          aVal = (a.name || '').toLowerCase()
          bVal = (b.name || '').toLowerCase()
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [prospects, sortColumn, sortDirection])

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Sort header component
  const SortHeader = ({ column, children, className = '' }) => (
    <th 
      className={cn(
        'px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--glass-bg)] select-none transition-colors',
        className
      )}
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortColumn === column ? (
          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronsUpDown className="h-3 w-3 opacity-30" />
        )}
      </div>
    </th>
  )

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
              CRM Dashboard
            </h1>
            <p className="text-[var(--text-secondary)] mt-1">
              Manage prospects, calls, and follow-ups
            </p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationsPanel onViewContact={openProspectDetail} />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="glass-inset"
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
              Refresh
            </Button>
            <Button 
              onClick={() => setIsAddProspectOpen(true)}
              className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] hover:from-[#43ab33] hover:to-[#33aba0] text-white gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Add Prospect
            </Button>
          </div>
        </div>

        {/* Stats */}
        <CRMStats
          prospects={prospects}
          callsSummary={callsSummary}
          tasksSummary={tasksSummary}
          followUpsSummary={followUpsSummary}
        />

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="glass p-1 h-auto">
            <TabsTrigger 
              value="prospects" 
              className="gap-2 data-[state=active]:bg-[var(--glass-bg)] data-[state=active]:shadow-sm"
            >
              <TrendingUp className="h-4 w-4" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger 
              value="users" 
              className="gap-2 data-[state=active]:bg-[var(--glass-bg)] data-[state=active]:shadow-sm"
            >
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger 
              value="calls" 
              className="gap-2 data-[state=active]:bg-[var(--glass-bg)] data-[state=active]:shadow-sm"
            >
              <Phone className="h-4 w-4" />
              Calls
            </TabsTrigger>
            <TabsTrigger 
              value="tasks" 
              className="gap-2 data-[state=active]:bg-[var(--glass-bg)] data-[state=active]:shadow-sm"
            >
              <ListTodo className="h-4 w-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger 
              value="followups" 
              className="gap-2 data-[state=active]:bg-[var(--glass-bg)] data-[state=active]:shadow-sm"
            >
              <Clock className="h-4 w-4" />
              Follow-ups
            </TabsTrigger>
            <TabsTrigger 
              value="team" 
              className="gap-2 data-[state=active]:bg-[var(--glass-bg)] data-[state=active]:shadow-sm"
            >
              <Users className="h-4 w-4" />
              Team
            </TabsTrigger>
          </TabsList>

          {/* Pipeline Tab */}
          <TabsContent value="prospects" className="space-y-4 mt-0">
            {/* Pipeline Controls */}
            <GlassCard className="p-4">
              <div className="flex items-center gap-4 flex-wrap">
                {/* Bulk Selection */}
                {selectedProspects.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#4bbf39]/10 rounded-lg border border-[#4bbf39]/20">
                    <Checkbox
                      checked={selectedProspects.length === prospects.length}
                      onCheckedChange={() => {
                        if (selectedProspects.length === prospects.length) {
                          setSelectedProspects([])
                        } else {
                          setSelectedProspects(prospects.map(p => p.id))
                        }
                      }}
                    />
                    <span className="text-sm font-medium text-[#4bbf39]">
                      {selectedProspects.length} selected
                    </span>
                    <DropdownMenu open={isBulkActionOpen} onOpenChange={setIsBulkActionOpen}>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="h-7 glass-inset">
                          Actions
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="glass">
                        <DropdownMenuItem disabled className="text-xs text-[var(--text-tertiary)]">
                          Move to stage:
                        </DropdownMenuItem>
                        {Object.entries(PIPELINE_STAGES).map(([stage, config]) => (
                          <DropdownMenuItem key={stage} onClick={() => handleBulkStageChange(stage)}>
                            <div className={`w-2 h-2 rounded-full ${config.color} mr-2`} />
                            {config.label}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setIsBulkAssignOpen(true)}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Assign to Team Member
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={handleBulkDelete}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Archive Selected
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => setSelectedProspects([])}>
                      Clear
                    </Button>
                  </div>
                )}
                
                {/* Search - Real-time filtering */}
                <div className="flex-1 relative max-w-md">
                  {isLoading && searchQuery ? (
                    <Loader2 className="h-4 w-4 absolute left-3 top-3 text-[var(--brand-primary)] animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 absolute left-3 top-3 text-[var(--text-tertiary)]" />
                  )}
                  <Input
                    placeholder="Search prospects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 glass-inset"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-3 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                {/* Stage Filter */}
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger className="w-48 glass-inset">
                    <SelectValue placeholder="All Stages" />
                  </SelectTrigger>
                  <SelectContent className="glass">
                    <SelectItem value="all">All Stages</SelectItem>
                    {Object.entries(PIPELINE_STAGES).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* View Toggle */}
                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    variant={showClosedDeals ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setShowClosedDeals(!showClosedDeals)}
                    className={cn('gap-2', viewMode !== 'pipeline' && 'hidden')}
                  >
                    {showClosedDeals ? <Eye className="h-4 w-4" /> : <CheckCheck className="h-4 w-4" />}
                    {showClosedDeals ? 'Hide' : 'Show'} Closed
                  </Button>
                  <div className="flex glass rounded-lg p-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={viewMode === 'pipeline' ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('pipeline')}
                          className="rounded-r-none"
                        >
                          <Grid3X3 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Kanban View</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('table')}
                          className="rounded-l-none"
                        >
                          <Table2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Table View</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Pipeline Content */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
              </div>
            ) : viewMode === 'pipeline' ? (
              <PipelineKanban
                prospects={prospects}
                selectedProspects={selectedProspects}
                showClosedDeals={showClosedDeals}
                onToggleClosedDeals={() => setShowClosedDeals(!showClosedDeals)}
                onSelectProspect={(id) => {
                  setSelectedProspects(prev => 
                    prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
                  )
                }}
                onProspectClick={openProspectDetail}
                onMoveToStage={handleUpdateStage}
                onEmail={handleEmailProspect}
                onCall={handleCallProspect}
                onViewWebsite={handleViewWebsite}
              />
            ) : (
              /* Table View */
              <GlassCard className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-[var(--glass-border)]">
                      <tr>
                        <th className="px-4 py-3 w-10">
                          <Checkbox
                            checked={selectedProspects.length === prospects.length && prospects.length > 0}
                            onCheckedChange={() => {
                              if (selectedProspects.length === prospects.length) {
                                setSelectedProspects([])
                              } else {
                                setSelectedProspects(prospects.map(p => p.id))
                              }
                            }}
                          />
                        </th>
                        <SortHeader column="name">Name</SortHeader>
                        <SortHeader column="company">Company</SortHeader>
                        <SortHeader column="email">Email</SortHeader>
                        <SortHeader column="stage">Stage</SortHeader>
                        <SortHeader column="lead_score">Lead Score</SortHeader>
                        <SortHeader column="calls">Calls</SortHeader>
                        <SortHeader column="last_contact">Last Contact</SortHeader>
                        <SortHeader column="created">Created</SortHeader>
                        <th className="px-4 py-3 w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--glass-border)]">
                      {sortedProspects.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-12">
                            <GlassEmptyState
                              icon={Users}
                              title="No prospects found"
                              description="Add your first prospect to get started"
                              action={{
                                label: 'Add Prospect',
                                onClick: () => setIsAddProspectOpen(true)
                              }}
                            />
                          </td>
                        </tr>
                      ) : sortedProspects.map(prospect => (
                        <tr 
                          key={prospect.id}
                          className="hover:bg-[var(--glass-bg)] cursor-pointer transition-colors"
                          onClick={() => openProspectDetail(prospect)}
                        >
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedProspects.includes(prospect.id)}
                              onCheckedChange={() => {
                                setSelectedProspects(prev => 
                                  prev.includes(prospect.id) 
                                    ? prev.filter(id => id !== prospect.id)
                                    : [...prev, prospect.id]
                                )
                              }}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-[var(--text-primary)]">
                              {prospect.name}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[var(--text-secondary)]">
                            {prospect.company || '—'}
                          </td>
                          <td className="px-4 py-3 text-[var(--text-secondary)]">
                            {prospect.email || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <StageBadge 
                              stage={prospect.pipeline_stage || 'new_lead'} 
                              config={PIPELINE_STAGES[prospect.pipeline_stage || 'new_lead']} 
                            />
                          </td>
                          <td className="px-4 py-3">
                            <LeadScoreBadge 
                              score={prospect.lead_score || 0} 
                              trend={prospect.lead_scores?.[0]?.score_trend || 'stable'}
                              breakdown={prospect.lead_scores?.[0] ? {
                                callScore: prospect.lead_scores[0].call_score,
                                emailScore: prospect.lead_scores[0].email_score,
                                websiteScore: prospect.lead_scores[0].website_score,
                                engagementScore: prospect.lead_scores[0].engagement_score,
                                recencyScore: prospect.lead_scores[0].recency_score,
                                factors: prospect.lead_scores[0].factors
                              } : null}
                              size="sm"
                            />
                          </td>
                          <td className="px-4 py-3 text-[var(--text-secondary)]">
                            {prospect.call_count || 0}
                          </td>
                          <td className="px-4 py-3 text-[var(--text-secondary)]">
                            {formatRelativeTime(prospect.last_call?.created_at)}
                          </td>
                          <td className="px-4 py-3 text-[var(--text-secondary)]">
                            {new Date(prospect.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openProspectDetail(prospect)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="mt-0">
            <UsersTab
              users={activeUsers}
              isLoading={isLoadingUsers}
              onRefresh={fetchActiveUsers}
              onResendInvite={handleResendInvite}
              onSendEmail={handleEmailProspect}
              onViewUser={(user) => {
                // Open detail panel directly with the user - they share the same structure
                openProspectDetail(user)
              }}
            />
          </TabsContent>

          {/* Calls Tab */}
          <TabsContent value="calls" className="mt-0">
            <CallsTab
              calls={calls}
              callsSummary={callsSummary}
              isLoading={isLoadingCalls}
              direction={callsDirection}
              onDirectionChange={(d) => { setCallsDirection(d); fetchCalls() }}
              onRefresh={fetchCalls}
            />
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="mt-0">
            <TasksTab
              tasks={tasks}
              tasksSummary={tasksSummary}
              isLoading={isLoadingTasks}
              status={tasksStatus}
              onStatusChange={(s) => { setTasksStatus(s); fetchTasks() }}
              onComplete={handleCompleteTask}
              onRefresh={fetchTasks}
            />
          </TabsContent>

          {/* Follow-ups Tab */}
          <TabsContent value="followups" className="mt-0">
            <FollowUpsTab
              followUps={followUps}
              followUpsSummary={followUpsSummary}
              onComplete={handleCompleteFollowUp}
              onRefresh={fetchFollowUps}
            />
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="mt-0">
            <TeamTab />
          </TabsContent>
        </Tabs>

        {/* Prospect Detail Panel */}
        <ProspectDetailPanel
          prospect={selectedProspect}
          isOpen={!!selectedProspect}
          onClose={closeProspectDetail}
          // Data
          audits={prospectAudits}
          emails={prospectEmails}
          scheduledFollowups={prospectScheduledFollowups}
          activity={prospectActivity}
          calls={prospectCalls}
          isLoadingAudits={isLoadingProspectData}
          isLoadingEmails={isLoadingProspectData}
          isLoadingActivity={isLoadingProspectData}
          isLoadingCalls={isLoadingProspectCalls}
          // Actions
          onUpdateStage={handleUpdateStage}
          onUpdateProspect={(updatedProspect) => {
            // Update in local state
            setSelectedProspect(updatedProspect)
            setProspects(prev => 
              prev.map(p => p.id === updatedProspect.id ? { ...p, ...updatedProspect } : p)
            )
          }}
          onConvertToUser={() => openConvertDialog(selectedProspect)}
          onCreateProposal={() => handleCreateProposal(selectedProspect)}
          onGenerateAudit={() => {
            toast.info('Generating audit...')
            // TODO: Implement audit generation
          }}
          onViewAudit={handleViewAudit}
          onSendAudit={(audit) => {
            setEmailComposeTarget(selectedProspect)
            setEmailComposeAudits([audit])
            setIsEmailComposeOpen(true)
          }}
          onComposeEmail={handleEmailProspect}
          onCall={handleCallProspect}
          onCancelFollowup={async (followupId) => {
            try {
              await api.delete('/.netlify/functions/scheduled-followups', {
                data: { id: followupId }
              })
              // Update local state
              setProspectScheduledFollowups(prev => 
                prev.map(f => f.id === followupId 
                  ? { ...f, status: 'cancelled', cancelled_at: new Date().toISOString() } 
                  : f
                )
              )
              toast.success('Follow-up cancelled')
            } catch (err) {
              console.error('Failed to cancel follow-up:', err)
              toast.error('Failed to cancel follow-up')
            }
          }}
          // Notes
          newNote={newNote}
          onNewNoteChange={setNewNote}
          onAddNote={handleAddNote}
          isAddingNote={isAddingNote}
        />

        {/* Add Prospect Dialog */}
        <AddProspectDialog
          open={isAddProspectOpen}
          onOpenChange={setIsAddProspectOpen}
          onSuccess={fetchProspects}
        />

        {/* Convert Dialog */}
        <ConvertDialog
          open={isConvertDialogOpen}
          onOpenChange={setIsConvertDialogOpen}
          prospect={convertTarget}
          onSuccess={() => {
            fetchProspects()
            fetchActiveUsers()
          }}
        />
        
        {/* Email Compose Dialog */}
        <EmailComposeDialog
          open={isEmailComposeOpen}
          onOpenChange={(open) => {
            setIsEmailComposeOpen(open)
            if (!open) {
              // Clear data when closing
              setEmailComposeAudits([])
              setEmailComposeProposals([])
            }
          }}
          contact={emailComposeTarget}
          audits={emailComposeAudits}
          proposals={emailComposeProposals}
          onSent={handleEmailSent}
        />
        
        {/* Quick Proposal Dialog */}
        <ProposalAIDialog
          open={isProposalDialogOpen}
          onOpenChange={(open) => {
            setIsProposalDialogOpen(open)
            if (!open) {
              setProposalDialogData(null)
            }
          }}
          preselectedClientId={proposalDialogData?.contactId}
          initialFormData={proposalDialogData}
          triggerButton={false}
          onSuccess={(proposal) => {
            toast.success(`Proposal "${proposal.title}" created!`)
            // Update pipeline stage to proposal_sent
            if (selectedProspect) {
              handleUpdateStage(selectedProspect.id, 'proposal_sent')
            }
          }}
        />
        
        {/* Call Intent Dialog */}
        <CallIntentDialog
          open={isCallDialogOpen}
          onOpenChange={setIsCallDialogOpen}
          prospect={callTarget}
          onCallInitiated={handleCallInitiated}
        />
        
        {/* Audit View Modal */}
        <AuditViewModal
          audit={viewingAudit}
          isOpen={isAuditViewOpen}
          onClose={() => {
            setIsAuditViewOpen(false)
            setViewingAudit(null)
          }}
          onSendAudit={(audit) => {
            setIsAuditViewOpen(false)
            setEmailComposeTarget(selectedProspect)
            setEmailComposeAudits([audit])
            setIsEmailComposeOpen(true)
          }}
        />

        {/* Bulk Assignment Dialog */}
        <AssignContactDialog
          open={isBulkAssignOpen}
          onOpenChange={setIsBulkAssignOpen}
          contacts={selectedProspects.map(id => prospects.find(p => p.id === id)).filter(Boolean)}
          onAssign={handleBulkAssign}
          isLoading={isBulkAssigning}
        />
      </div>
    </TooltipProvider>
  )
}
