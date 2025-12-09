import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/lib/toast'
import ConfirmDialog from '@/components/ConfirmDialog'
import EmptyState from '@/components/EmptyState'
import {
  Users,
  UserPlus,
  Mail,
  Trash2,
  Edit,
  Loader2,
  Search,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
  Phone,
  FileText,
  Tag,
  History,
  Bell,
  Eye,
  MoreHorizontal,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  MessageSquare,
  Clock,
  ArrowRight,
  Send,
  ListTodo,
  TrendingUp,
  Filter,
  Play,
  ExternalLink,
  Sparkles,
  Flame,
  Thermometer,
  Activity,
  GitBranch,
  UserCheck,
  CheckSquare,
  PinIcon,
  Snowflake,
  RefreshCw,
  Grid3X3,
  LayoutList,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Globe,
  Star,
  AlertCircle,
  CheckCheck,
  Table2
} from 'lucide-react'
import useAuthStore from '@/lib/auth-store'
import useNotificationStore from '@/lib/notification-store'
import api from '@/lib/api'
import ProposalAIDialog from './ProposalAIDialog'

// Pipeline stages configuration
const PIPELINE_STAGES = {
  new_lead: { label: 'New Lead', color: 'bg-blue-500', textColor: 'text-blue-600', bgLight: 'bg-blue-50', borderColor: 'border-blue-200', icon: Sparkles },
  contacted: { label: 'Contacted', color: 'bg-purple-500', textColor: 'text-purple-600', bgLight: 'bg-purple-50', borderColor: 'border-purple-200', icon: PhoneCall },
  qualified: { label: 'Qualified', color: 'bg-amber-500', textColor: 'text-amber-600', bgLight: 'bg-amber-50', borderColor: 'border-amber-200', icon: CheckCircle2 },
  proposal_sent: { label: 'Proposal Sent', color: 'bg-indigo-500', textColor: 'text-indigo-600', bgLight: 'bg-indigo-50', borderColor: 'border-indigo-200', icon: Send },
  negotiating: { label: 'Negotiating', color: 'bg-orange-500', textColor: 'text-orange-600', bgLight: 'bg-orange-50', borderColor: 'border-orange-200', icon: MessageSquare },
  closed_won: { label: 'Won', color: 'bg-green-500', textColor: 'text-green-600', bgLight: 'bg-green-50', borderColor: 'border-green-200', icon: CheckCheck },
  closed_lost: { label: 'Lost', color: 'bg-red-500', textColor: 'text-red-600', bgLight: 'bg-red-50', borderColor: 'border-red-200', icon: XCircle }
}

// Active stages (shown as full columns)
const ACTIVE_STAGES = ['new_lead', 'contacted', 'qualified', 'proposal_sent', 'negotiating']
// Closed stages (collapsible)
const CLOSED_STAGES = ['closed_won', 'closed_lost']

// Lead quality badge
function LeadQualityBadge({ score }) {
  if (score == null) return null
  
  let config
  if (score >= 71) {
    config = { label: 'Hot', color: 'bg-red-100 text-red-800 border-red-200', icon: Flame }
  } else if (score >= 41) {
    config = { label: 'Warm', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Thermometer }
  } else {
    config = { label: 'Cold', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Snowflake }
  }
  
  const Icon = config.icon
  return (
    <Badge className={`${config.color} border gap-1`}>
      <Icon className="h-3 w-3" />
      {score}
    </Badge>
  )
}

// Sentiment badge
function SentimentBadge({ sentiment }) {
  if (!sentiment) return null
  
  const config = {
    positive: { color: 'bg-[var(--accent-success)]/20 text-[var(--accent-success)]', label: 'Positive' },
    neutral: { color: 'bg-[var(--surface-tertiary)] text-[var(--text-secondary)]', label: 'Neutral' },
    negative: { color: 'bg-[var(--accent-error)]/20 text-[var(--accent-error)]', label: 'Negative' },
    mixed: { color: 'bg-[var(--accent-warning)]/20 text-[var(--accent-warning)]', label: 'Mixed' }
  }[sentiment] || { color: 'bg-[var(--surface-tertiary)] text-[var(--text-secondary)]', label: sentiment }
  
  return <Badge className={config.color}>{config.label}</Badge>
}

// Format duration
function formatDuration(seconds) {
  if (!seconds) return '0s'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
}

// Format relative time
function formatRelativeTime(date) {
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

export default function ClientManagement() {
  const { user } = useAuthStore()
  
  // View state
  const [activeTab, setActiveTab] = useState('prospects')
  const [viewMode, setViewMode] = useState('pipeline') // 'pipeline' | 'table'
  const [showClosedDeals, setShowClosedDeals] = useState(false)
  
  // Table sorting
  const [sortColumn, setSortColumn] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc') // 'asc' | 'desc'
  
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
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [callsDirection, setCallsDirection] = useState('all')
  const [tasksStatus, setTasksStatus] = useState('pending')
  
  // Selected item for detail view
  const [selectedProspect, setSelectedProspect] = useState(null)
  const [selectedCall, setSelectedCall] = useState(null)
  const [prospectDetailTab, setProspectDetailTab] = useState('overview')
  const [prospectActivity, setProspectActivity] = useState([])
  const [isLoadingActivity, setIsLoadingActivity] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)
  
  // Bulk selection
  const [selectedProspects, setSelectedProspects] = useState([])
  const [isBulkActionOpen, setIsBulkActionOpen] = useState(false)
  
  // Dialogs
  const [isAddProspectOpen, setIsAddProspectOpen] = useState(false)
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false)
  const [isCallDetailOpen, setIsCallDetailOpen] = useState(false)
  
  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newProspect, setNewProspect] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    website: '',
    source: 'outreach',
    notes: ''
  })

  // Check admin access
  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <XCircle className="h-12 w-12 mx-auto mb-4" />
              <p className="font-semibold">Access Denied</p>
              <p className="text-sm text-[var(--text-secondary)] mt-2">Admin privileges required.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Get notification store to clear badge when viewing clients
  const { markLeadsAsViewed } = useNotificationStore()

  // Fetch data and clear notification badge
  useEffect(() => {
    fetchProspects()
    fetchActiveUsers()
    fetchCalls()
    fetchTasks()
    fetchFollowUps()
    // Clear the new leads badge when viewing the clients section
    markLeadsAsViewed()
  }, [])

  const fetchProspects = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
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
  }

  const fetchActiveUsers = async () => {
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
  }

  const fetchCalls = async () => {
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
  }

  const fetchTasks = async () => {
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
  }

  const fetchFollowUps = async () => {
    try {
      const response = await api.get('/.netlify/functions/crm-follow-ups-list?status=pending')
      setFollowUps(response.data.followUps || [])
      setFollowUpsSummary(response.data.summary || {})
    } catch (err) {
      console.error('Failed to fetch follow-ups:', err)
      setFollowUps([])
    }
  }

  // Group prospects by pipeline stage for kanban view
  const prospectsByStage = useMemo(() => {
    const grouped = {}
    Object.keys(PIPELINE_STAGES).forEach(stage => {
      grouped[stage] = prospects.filter(p => (p.pipeline_stage || 'new_lead') === stage)
    })
    return grouped
  }, [prospects])

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
          aVal = a.avg_lead_quality || 0
          bVal = b.avg_lead_quality || 0
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

  // Toggle sort
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
      className={`px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--surface-secondary)] select-none ${className}`}
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

  // Handlers
  const handleAddProspect = async (e) => {
    e.preventDefault()
    if (!newProspect.name.trim()) {
      toast.error('Name is required')
      return
    }

    setIsSubmitting(true)
    try {
      await api.post('/.netlify/functions/admin-clients-create', {
        ...newProspect,
        pipeline_stage: 'new_lead'
      })
      toast.success('Prospect added successfully')
      setNewProspect({ name: '', email: '', company: '', phone: '', website: '', source: 'outreach', notes: '' })
      setIsAddProspectOpen(false)
      fetchProspects()
    } catch (err) {
      console.error('Failed to add prospect:', err)
      toast.error(err.response?.data?.error || 'Failed to add prospect')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateStage = async (prospectId, newStage) => {
    try {
      await api.patch('/.netlify/functions/crm-prospects-update', {
        id: prospectId,
        pipelineStage: newStage
      })
      
      // Update local state
      setProspects(prospects.map(p => 
        p.id === prospectId ? { ...p, pipeline_stage: newStage } : p
      ))
      
      toast.success(`Moved to ${PIPELINE_STAGES[newStage].label}`)
    } catch (err) {
      console.error('Failed to update stage:', err)
      toast.error('Failed to update pipeline stage')
    }
  }

  const handleConvertToUser = async () => {
    if (!selectedProspect) return
    
    setIsSubmitting(true)
    try {
      await api.post('/.netlify/functions/crm-convert-prospect', {
        prospectId: selectedProspect.id,
        sendMagicLink: true
      })
      toast.success('Magic link sent! Prospect is now a portal user.')
      setIsConvertDialogOpen(false)
      setSelectedProspect(null)
      fetchProspects()
    } catch (err) {
      console.error('Failed to convert prospect:', err)
      toast.error(err.response?.data?.error || 'Failed to convert prospect')
    } finally {
      setIsSubmitting(false)
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

  // Fetch prospect activity timeline
  const fetchProspectActivity = async (contactId) => {
    setIsLoadingActivity(true)
    try {
      const response = await api.get(`/.netlify/functions/crm-prospect-activity?contactId=${contactId}`)
      setProspectActivity(response.data.timeline || [])
    } catch (err) {
      console.error('Failed to fetch prospect activity:', err)
      setProspectActivity([])
    } finally {
      setIsLoadingActivity(false)
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
      fetchProspectActivity(selectedProspect.id)
    } catch (err) {
      toast.error('Failed to add note')
    } finally {
      setIsAddingNote(false)
    }
  }

  // Bulk actions
  const handleBulkStageChange = async (stage) => {
    if (selectedProspects.length === 0) return
    
    try {
      await api.post('/.netlify/functions/crm-prospects-bulk-update', {
        action: 'change_stage',
        prospectIds: selectedProspects,
        data: { stage }
      })
      toast.success(`${selectedProspects.length} prospect(s) moved to ${stage}`)
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

  const toggleProspectSelection = (prospectId) => {
    setSelectedProspects(prev => 
      prev.includes(prospectId) 
        ? prev.filter(id => id !== prospectId)
        : [...prev, prospectId]
    )
  }

  const selectAllProspects = () => {
    if (selectedProspects.length === prospects.length) {
      setSelectedProspects([])
    } else {
      setSelectedProspects(prospects.map(p => p.id))
    }
  }

  // Open prospect detail and fetch activity
  const openProspectDetail = (prospect) => {
    setSelectedProspect(prospect)
    setProspectDetailTab('overview')
    fetchProspectActivity(prospect.id)
  }

  const openCallDetail = async (call) => {
    setSelectedCall(call)
    setIsCallDetailOpen(true)
    
    // Fetch full call details
    try {
      const response = await api.get(`/.netlify/functions/crm-calls-get?id=${call.id}`)
      setSelectedCall(response.data.call)
    } catch (err) {
      console.error('Failed to fetch call details:', err)
    }
  }

  const handleLookupBusiness = async (callId, phoneNumber) => {
    try {
      toast.info('Looking up business info...')
      const response = await api.post('/.netlify/functions/crm-lookup-business', {
        callLogId: callId,
        phoneNumber
      })
      
      if (response.data.business?.company) {
        toast.success(`Found: ${response.data.business.company}`)
        fetchCalls()
      } else {
        toast.info('No business found for this number')
      }
    } catch (err) {
      toast.error('Failed to lookup business')
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">
              CRM Dashboard
            </h1>
            <p className="text-[var(--text-secondary)] mt-1">Manage prospects, calls, and follow-ups</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { fetchProspects(); fetchCalls(); fetchTasks(); fetchFollowUps() }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={isAddProspectOpen} onOpenChange={setIsAddProspectOpen}>
              <DialogTrigger asChild>
                <Button variant="glass-primary" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add Prospect
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add New Prospect</DialogTitle>
                  <DialogDescription>Add a prospect to your sales pipeline</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddProspect} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input
                        value={newProspect.name}
                        onChange={(e) => setNewProspect({ ...newProspect, name: e.target.value })}
                        placeholder="John Smith"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Company</Label>
                      <Input
                        value={newProspect.company}
                        onChange={(e) => setNewProspect({ ...newProspect, company: e.target.value })}
                        placeholder="Acme Corp"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={newProspect.email}
                        onChange={(e) => setNewProspect({ ...newProspect, email: e.target.value })}
                        placeholder="john@acme.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={newProspect.phone}
                        onChange={(e) => setNewProspect({ ...newProspect, phone: e.target.value })}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Website</Label>
                      <Input
                        value={newProspect.website}
                        onChange={(e) => setNewProspect({ ...newProspect, website: e.target.value })}
                        placeholder="https://acme.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Source</Label>
                      <Select value={newProspect.source} onValueChange={(value) => setNewProspect({ ...newProspect, source: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="outreach">Outreach</SelectItem>
                          <SelectItem value="inbound">Inbound</SelectItem>
                          <SelectItem value="referral">Referral</SelectItem>
                          <SelectItem value="website">Website</SelectItem>
                          <SelectItem value="event">Event</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={newProspect.notes}
                      onChange={(e) => setNewProspect({ ...newProspect, notes: e.target.value })}
                      placeholder="Initial notes about this prospect..."
                      rows={3}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddProspectOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Add Prospect
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Total Prospects</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{prospects.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Total Calls</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{callsSummary.total || 0}</p>
                </div>
                <Phone className="h-8 w-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Hot Leads</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{callsSummary.hotLeads || 0}</p>
                </div>
                <Flame className="h-8 w-8 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Pending Tasks</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{tasksSummary.pending || 0}</p>
                </div>
                <ListTodo className="h-8 w-8 text-amber-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Overdue</p>
                  <p className="text-2xl font-bold text-[var(--accent-error)]">{tasksSummary.overdue || 0}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Follow-ups Today</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{followUpsSummary.today || 0}</p>
                </div>
                <Clock className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 max-w-3xl">
            <TabsTrigger value="prospects" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="calls" className="gap-2">
              <Phone className="h-4 w-4" />
              Calls
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2">
              <ListTodo className="h-4 w-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="followups" className="gap-2">
              <Clock className="h-4 w-4" />
              Follow-ups
            </TabsTrigger>
          </TabsList>

          {/* Pipeline Tab */}
          <TabsContent value="prospects" className="space-y-4 mt-0">
            {/* Pipeline Controls */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Bulk Selection */}
              {selectedProspects.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
                  <Checkbox
                    checked={selectedProspects.length === prospects.length}
                    onCheckedChange={selectAllProspects}
                  />
                  <span className="text-sm font-medium text-blue-700">
                    {selectedProspects.length} selected
                  </span>
                  <DropdownMenu open={isBulkActionOpen} onOpenChange={setIsBulkActionOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="h-7">
                        Actions
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
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
              
              <div className="flex-1 relative max-w-md">
                <Search className="h-4 w-4 absolute left-3 top-3 text-[var(--text-tertiary)]" />
                <Input
                  placeholder="Search prospects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchProspects()}
                  className="pl-10"
                />
              </div>
              <Select value={stageFilter} onValueChange={(v) => { setStageFilter(v); fetchProspects() }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {Object.entries(PIPELINE_STAGES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant={showClosedDeals ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setShowClosedDeals(!showClosedDeals)}
                  className={`gap-2 ${viewMode !== 'pipeline' ? 'hidden' : ''}`}
                >
                  {showClosedDeals ? <Eye className="h-4 w-4" /> : <CheckCheck className="h-4 w-4" />}
                  {showClosedDeals ? 'Hide' : 'Show'} Closed
                </Button>
                <div className="flex border rounded-lg">
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

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
              </div>
            ) : viewMode === 'pipeline' ? (
              /* Full-Width Kanban Pipeline View - Horizontally scrollable on smaller viewports */
              <div 
                className="overflow-x-auto pb-4 -mx-4 px-4 cursor-grab active:cursor-grabbing scroll-smooth snap-x snap-mandatory touch-pan-x"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--glass-border) transparent' }}
                onMouseDown={(e) => {
                  const container = e.currentTarget
                  const startX = e.pageX - container.offsetLeft
                  const scrollLeft = container.scrollLeft
                  
                  const handleMouseMove = (moveEvent) => {
                    moveEvent.preventDefault()
                    const x = moveEvent.pageX - container.offsetLeft
                    const walk = (x - startX) * 1.5
                    container.scrollLeft = scrollLeft - walk
                  }
                  
                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove)
                    document.removeEventListener('mouseup', handleMouseUp)
                  }
                  
                  document.addEventListener('mousemove', handleMouseMove)
                  document.addEventListener('mouseup', handleMouseUp)
                }}
              >
              <div className="grid gap-3" style={{ gridTemplateColumns: showClosedDeals ? 'repeat(7, minmax(240px, 1fr))' : 'repeat(5, minmax(280px, 1fr))', minWidth: showClosedDeals ? '1680px' : '1400px' }}>
                {/* Active Pipeline Stages */}
                {ACTIVE_STAGES.map((stage) => {
                  const config = PIPELINE_STAGES[stage]
                  const StageIcon = config.icon
                  const stageProspects = prospectsByStage[stage] || []
                  
                  return (
                    <div key={stage} className="flex flex-col min-w-0">
                      {/* Column Header */}
                      <div className={`rounded-t-xl p-3 ${config.bgLight} border ${config.borderColor} border-b-0`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${config.color}`}>
                              <StageIcon className="h-3.5 w-3.5 text-white" />
                            </div>
                            <span className={`font-semibold text-sm ${config.textColor}`}>{config.label}</span>
                          </div>
                          <Badge variant="secondary" className={`${config.bgLight} ${config.textColor} border ${config.borderColor} font-semibold`}>
                            {stageProspects.length}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Column Content */}
                      <ScrollArea className={`flex-1 min-h-[500px] max-h-[calc(100vh-320px)] rounded-b-xl border ${config.borderColor} bg-[var(--surface-secondary)]/50`}>
                        <div className="p-2 space-y-2">
                          {stageProspects.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-[var(--text-tertiary)]">
                              <StageIcon className="h-8 w-8 mb-2 opacity-50" />
                              <p className="text-sm">No prospects</p>
                              <p className="text-xs">in this stage</p>
                            </div>
                          ) : (
                            stageProspects.map(prospect => (
                              <Card 
                                key={prospect.id} 
                                className={`cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all duration-200 border-l-4 ${selectedProspects.includes(prospect.id) ? 'ring-2 ring-blue-500 border-l-blue-500' : `${config.borderColor.replace('border-', 'border-l-')}`}`}
                                onClick={() => openProspectDetail(prospect)}
                              >
                                <CardContent className="p-3">
                                  <div className="flex items-start gap-2">
                                    <Checkbox
                                      checked={selectedProspects.includes(prospect.id)}
                                      onCheckedChange={() => toggleProspectSelection(prospect.id)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="mt-0.5"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          <h4 className="font-semibold text-sm truncate leading-tight text-[var(--text-primary)]">{prospect.name}</h4>
                                          {prospect.company && (
                                            <p className="text-xs text-[var(--text-tertiary)] truncate flex items-center gap-1 mt-0.5">
                                              <Building2 className="h-3 w-3 flex-shrink-0" />
                                              {prospect.company}
                                            </p>
                                          )}
                                        </div>
                                        <LeadQualityBadge score={prospect.avg_lead_quality} />
                                      </div>
                                      
                                      {/* Contact Info */}
                                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-[var(--text-tertiary)]">
                                        {prospect.email && (
                                          <span className="flex items-center gap-1 truncate max-w-[140px]">
                                            <Mail className="h-3 w-3 flex-shrink-0" />
                                            <span className="truncate">{prospect.email}</span>
                                          </span>
                                        )}
                                        {prospect.phone && (
                                          <span className="flex items-center gap-1">
                                            <Phone className="h-3 w-3" />
                                            {prospect.phone}
                                          </span>
                                        )}
                                      </div>
                                      
                                      {/* Activity & Actions Row */}
                                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--glass-border)]">
                                        <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                                          {prospect.call_count > 0 && (
                                            <span className="flex items-center gap-1" title={`${prospect.call_count} calls`}>
                                              <Phone className="h-3 w-3" />
                                              {prospect.call_count}
                                            </span>
                                          )}
                                          {prospect.last_call && (
                                            <span className="flex items-center gap-1" title="Last contact">
                                              <Clock className="h-3 w-3" />
                                              {formatRelativeTime(prospect.last_call.created_at)}
                                            </span>
                                          )}
                                        </div>
                                        
                                        {/* Quick Actions */}
                                        <div className="flex items-center gap-0.5">
                                          {prospect.email && (
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-7 w-7 p-0"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    window.location.href = `mailto:${prospect.email}`
                                                  }}
                                                >
                                                  <Mail className="h-3.5 w-3.5" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>Send Email</TooltipContent>
                                            </Tooltip>
                                          )}
                                          {prospect.phone && (
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-7 w-7 p-0"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    window.location.href = `tel:${prospect.phone}`
                                                  }}
                                                >
                                                  <Phone className="h-3.5 w-3.5" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>Call</TooltipContent>
                                            </Tooltip>
                                          )}
                                          {stage !== 'negotiating' && (
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-7 w-7 p-0 text-[var(--text-tertiary)] hover:text-[var(--brand-primary)]"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    const stages = ACTIVE_STAGES
                                                    const nextIndex = stages.indexOf(stage) + 1
                                                    if (nextIndex < stages.length) {
                                                      handleUpdateStage(prospect.id, stages[nextIndex])
                                                    }
                                                  }}
                                                >
                                                  <ArrowRight className="h-3.5 w-3.5" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>Move to next stage</TooltipContent>
                                            </Tooltip>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  )
                })}
                
                {/* Closed Deals Columns - shown inline in the grid when toggled */}
                {showClosedDeals && CLOSED_STAGES.map((stage) => {
                  const config = PIPELINE_STAGES[stage]
                  const StageIcon = config.icon
                  const stageProspects = prospectsByStage[stage] || []
                  
                  return (
                    <div key={stage} className="flex flex-col min-w-0">
                      {/* Column Header */}
                      <div className={`rounded-t-xl p-3 ${config.bgLight} border ${config.borderColor} border-b-0`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${config.color}`}>
                              <StageIcon className="h-3.5 w-3.5 text-white" />
                            </div>
                            <span className={`font-semibold text-sm ${config.textColor}`}>{config.label}</span>
                          </div>
                          <Badge variant="secondary" className={`${config.bgLight} ${config.textColor} border ${config.borderColor} font-semibold`}>
                            {stageProspects.length}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Column Content */}
                      <ScrollArea className={`flex-1 min-h-[500px] max-h-[calc(100vh-320px)] rounded-b-xl border ${config.borderColor} bg-[var(--surface-secondary)]/30`}>
                        <div className="p-2 space-y-2">
                          {stageProspects.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-[var(--text-tertiary)]">
                              <StageIcon className="h-8 w-8 mb-2 opacity-50" />
                              <p className="text-sm">No prospects</p>
                              <p className="text-xs">in this stage</p>
                            </div>
                          ) : (
                            stageProspects.map(prospect => (
                              <div 
                                key={prospect.id} 
                                className={`p-2.5 rounded-lg border ${config.borderColor} ${config.bgLight} cursor-pointer hover:shadow-sm transition-shadow`}
                                onClick={() => openProspectDetail(prospect)}
                              >
                                <div className="flex items-center gap-2">
                                  <StageIcon className={`h-4 w-4 ${config.textColor} flex-shrink-0`} />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate text-[var(--text-primary)]">{prospect.name}</p>
                                    {prospect.company && (
                                      <p className="text-xs text-[var(--text-tertiary)] truncate">{prospect.company}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  )
                })}
              </div>
              </div>
            ) : (
              /* Spreadsheet Table View */
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[var(--surface-secondary)] border-b border-[var(--glass-border)]">
                      <tr>
                        <th className="px-4 py-3 w-10">
                          <Checkbox
                            checked={selectedProspects.length === prospects.length && prospects.length > 0}
                            onCheckedChange={selectAllProspects}
                          />
                        </th>
                        <SortHeader column="name" className="min-w-[180px]">Name</SortHeader>
                        <SortHeader column="company" className="min-w-[150px]">Company</SortHeader>
                        <SortHeader column="email" className="min-w-[200px]">Email</SortHeader>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider min-w-[120px]">Phone</th>
                        <SortHeader column="stage" className="min-w-[140px]">Stage</SortHeader>
                        <SortHeader column="lead_score" className="min-w-[100px]">Score</SortHeader>
                        <SortHeader column="calls" className="min-w-[80px]">Calls</SortHeader>
                        <SortHeader column="last_contact" className="min-w-[120px]">Last Contact</SortHeader>
                        <SortHeader column="created" className="min-w-[100px]">Created</SortHeader>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--glass-border)] bg-[var(--glass-bg)]">
                      {sortedProspects.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="px-4 py-12">
                            <EmptyState
                              icon={Users}
                              title="No prospects yet"
                              description="Add your first prospect or make a call to get started"
                            />
                          </td>
                        </tr>
                      ) : (
                        sortedProspects.map(prospect => {
                          const stageConfig = PIPELINE_STAGES[prospect.pipeline_stage || 'new_lead']
                          const StageIcon = stageConfig.icon
                          
                          return (
                            <tr 
                              key={prospect.id} 
                              className={`hover:bg-[var(--surface-secondary)] cursor-pointer transition-colors ${selectedProspects.includes(prospect.id) ? 'bg-[var(--brand-primary)]/10' : ''}`}
                              onClick={() => openProspectDetail(prospect)}
                            >
                              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={selectedProspects.includes(prospect.id)}
                                  onCheckedChange={() => toggleProspectSelection(prospect.id)}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-[var(--text-primary)]">{prospect.name}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-[var(--text-secondary)] text-sm">{prospect.company || '—'}</div>
                              </td>
                              <td className="px-4 py-3">
                                {prospect.email ? (
                                  <a 
                                    href={`mailto:${prospect.email}`} 
                                    className="text-[var(--brand-primary)] hover:underline text-sm"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {prospect.email}
                                  </a>
                                ) : (
                                  <span className="text-[var(--text-tertiary)] text-sm">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {prospect.phone ? (
                                  <a 
                                    href={`tel:${prospect.phone}`} 
                                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-mono"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {prospect.phone}
                                  </a>
                                ) : (
                                  <span className="text-[var(--text-tertiary)] text-sm">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <Select
                                  value={prospect.pipeline_stage || 'new_lead'}
                                  onValueChange={(value) => handleUpdateStage(prospect.id, value)}
                                >
                                  <SelectTrigger 
                                    className={`h-8 text-xs ${stageConfig.bgLight} ${stageConfig.textColor} border-0 font-medium`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <StageIcon className="h-3 w-3" />
                                      <span>{stageConfig.label}</span>
                                    </div>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(PIPELINE_STAGES).map(([stage, config]) => {
                                      const Icon = config.icon
                                      return (
                                        <SelectItem key={stage} value={stage}>
                                          <div className="flex items-center gap-2">
                                            <Icon className={`h-3 w-3 ${config.textColor}`} />
                                            {config.label}
                                          </div>
                                        </SelectItem>
                                      )
                                    })}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-4 py-3">
                                <LeadQualityBadge score={prospect.avg_lead_quality} />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="text-sm text-[var(--text-secondary)]">{prospect.call_count || 0}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm text-[var(--text-tertiary)]">
                                  {prospect.last_call?.created_at ? formatRelativeTime(prospect.last_call.created_at) : '—'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm text-[var(--text-tertiary)]">
                                  {prospect.created_at ? new Date(prospect.created_at).toLocaleDateString() : '—'}
                                </span>
                              </td>
                              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openProspectDetail(prospect)}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Details
                                    </DropdownMenuItem>
                                    {prospect.email && (
                                      <DropdownMenuItem onClick={() => { setSelectedProspect(prospect); setIsConvertDialogOpen(true) }}>
                                        <Send className="h-4 w-4 mr-2" />
                                        Send Magic Link
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      className="text-red-600"
                                      onClick={() => handleBulkDelete()}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Archive
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Table footer with count */}
                <div className="px-4 py-3 bg-[var(--surface-secondary)] border-t border-[var(--glass-border)] text-sm text-[var(--text-secondary)] flex items-center justify-between">
                  <span>
                    {selectedProspects.length > 0 
                      ? `${selectedProspects.length} of ${prospects.length} selected`
                      : `${prospects.length} prospect${prospects.length !== 1 ? 's' : ''}`
                    }
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[var(--text-tertiary)]">Sort:</span>
                    <span className="font-medium">{sortColumn}</span>
                    <span className="text-[var(--text-tertiary)]">({sortDirection})</span>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Users Tab - Active Portal Accounts */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-emerald-600" />
                      Active Portal Users
                    </CardTitle>
                    <CardDescription>
                      Clients with portal access ({activeUsers.filter(u => u.account_setup === 'true' || u.account_setup === true).length} active)
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchActiveUsers}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingUsers ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
                  </div>
                ) : activeUsers.length === 0 ? (
                  <div className="text-center py-12 text-[var(--text-secondary)]">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No portal users yet</p>
                    <p className="text-sm mt-1">Users appear here after completing account setup</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Active Users */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Active Accounts ({activeUsers.filter(u => u.account_setup === 'true' || u.account_setup === true).length})
                      </h4>
                      <div className="grid gap-2">
                        {activeUsers
                          .filter(u => u.account_setup === 'true' || u.account_setup === true)
                          .map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center justify-between p-4 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--surface-secondary)] transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                {user.avatar ? (
                                  <img 
                                    src={user.avatar} 
                                    alt={user.name} 
                                    className="h-10 w-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] flex items-center justify-center text-white font-medium">
                                    {user.name?.charAt(0)?.toUpperCase() || '?'}
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-[var(--text-primary)]">{user.name}</p>
                                  <p className="text-sm text-[var(--text-tertiary)]">{user.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                {user.company && (
                                  <div className="flex items-center gap-1 text-sm text-[var(--text-tertiary)]">
                                    <Building2 className="h-4 w-4" />
                                    {user.company}
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  {user.google_id ? (
                                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                      <svg className="h-3 w-3 mr-1" viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                      </svg>
                                      Google
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-[var(--surface-tertiary)] text-[var(--text-secondary)] border-[var(--glass-border)]">
                                      <Mail className="h-3 w-3 mr-1" />
                                      Password
                                    </Badge>
                                  )}
                                  <Badge className={user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'}>
                                    {user.role === 'admin' ? 'Admin' : 'Client'}
                                  </Badge>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setSelectedProspect(user)}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Mail className="h-4 w-4 mr-2" />
                                      Send Email
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-red-600">
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Disable Account
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Pending Invites */}
                    {activeUsers.filter(u => u.account_setup !== 'true' && u.account_setup !== true).length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-amber-600" />
                          Pending Invites ({activeUsers.filter(u => u.account_setup !== 'true' && u.account_setup !== true).length})
                        </h4>
                        <div className="grid gap-2">
                          {activeUsers
                            .filter(u => u.account_setup !== 'true' && u.account_setup !== true)
                            .map((user) => (
                              <div
                                key={user.id}
                                className="flex items-center justify-between p-4 rounded-lg border border-dashed bg-amber-50/50 hover:bg-amber-50 transition-colors"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                                    <Clock className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-[var(--text-primary)]">{user.name}</p>
                                    <p className="text-sm text-[var(--text-tertiary)]">{user.email}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  {user.company && (
                                    <div className="flex items-center gap-1 text-sm text-[var(--text-tertiary)]">
                                      <Building2 className="h-4 w-4" />
                                      {user.company}
                                    </div>
                                  )}
                                  <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                                    Invite Pending
                                  </Badge>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        await api.post('/.netlify/functions/admin-resend-setup-email', { contactId: user.id })
                                        toast.success('Setup email resent!')
                                      } catch (err) {
                                        toast.error('Failed to resend email')
                                      }
                                    }}
                                  >
                                    <Send className="h-4 w-4 mr-2" />
                                    Resend Invite
                                  </Button>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calls Tab */}
          <TabsContent value="calls" className="space-y-4">
            <div className="flex items-center gap-4">
              <Select value={callsDirection} onValueChange={(v) => { setCallsDirection(v); fetchCalls() }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Calls" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Calls</SelectItem>
                  <SelectItem value="inbound">Inbound</SelectItem>
                  <SelectItem value="outbound">Outbound</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex-1 text-sm text-[var(--text-secondary)]">
                {callsSummary.inbound || 0} inbound • {callsSummary.outbound || 0} outbound
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                {isLoadingCalls ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
                  </div>
                ) : calls.length === 0 ? (
                  <EmptyState
                    icon={Phone}
                    title="No calls yet"
                    description="Calls from OpenPhone will appear here automatically"
                  />
                ) : (
                  <div className="divide-y divide-[var(--glass-border)]">
                    {calls.map(call => (
                      <div
                        key={call.id}
                        className="p-4 hover:bg-[var(--surface-secondary)] cursor-pointer flex items-center gap-4"
                        onClick={() => openCallDetail(call)}
                      >
                        <div className={`p-2 rounded-full ${call.direction === 'inbound' ? 'bg-green-100' : 'bg-blue-100'}`}>
                          {call.direction === 'inbound' ? (
                            <PhoneIncoming className={`h-5 w-5 text-green-600`} />
                          ) : (
                            <PhoneOutgoing className={`h-5 w-5 text-blue-600`} />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium font-mono">{call.phone_number}</span>
                            {call.contact && (
                              <Badge variant="outline" className="text-xs">
                                {call.contact.name}
                              </Badge>
                            )}
                          </div>
                          {call.ai_summary && (
                            <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-1">{call.ai_summary}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)] mt-1">
                            <span>{formatDuration(call.duration)}</span>
                            <span>{formatRelativeTime(call.created_at)}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <LeadQualityBadge score={call.lead_quality_score} />
                          <SentimentBadge sentiment={call.sentiment} />
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openCallDetail(call) }}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {call.recording_url && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(call.recording_url, '_blank') }}>
                                  <Play className="h-4 w-4 mr-2" />
                                  Play Recording
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleLookupBusiness(call.id, call.phone_number) }}>
                                <Globe className="h-4 w-4 mr-2" />
                                Lookup Business
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="flex items-center gap-4">
              <Select value={tasksStatus} onValueChange={(v) => { setTasksStatus(v); fetchTasks() }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex-1 text-sm text-[var(--text-secondary)]">
                {tasksSummary.urgent > 0 && (
                  <span className="text-[var(--accent-error)] font-medium">{tasksSummary.urgent} urgent • </span>
                )}
                {tasksSummary.overdue > 0 && (
                  <span className="text-[var(--accent-warning)] font-medium">{tasksSummary.overdue} overdue • </span>
                )}
                {tasksSummary.pending || 0} pending
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                {isLoadingTasks ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
                  </div>
                ) : tasks.length === 0 ? (
                  <EmptyState
                    icon={ListTodo}
                    title="No tasks"
                    description="AI-generated tasks from calls will appear here"
                  />
                ) : (
                  <div className="divide-y">
                    {tasks.map(task => {
                      const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
                      
                      return (
                        <div key={task.id} className="p-4 flex items-start gap-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-6 w-6 rounded-full p-0 ${task.status === 'completed' ? 'text-[var(--accent-success)]' : 'text-[var(--text-tertiary)]'}`}
                            onClick={() => task.status !== 'completed' && handleCompleteTask(task.id)}
                          >
                            <CheckCircle2 className="h-5 w-5" />
                          </Button>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${task.status === 'completed' ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}>
                                {task.title}
                              </span>
                              {task.priority === 'urgent' && (
                                <Badge className="bg-red-100 text-red-800">Urgent</Badge>
                              )}
                              {task.priority === 'high' && (
                                <Badge className="bg-orange-100 text-orange-800">High</Badge>
                              )}
                            </div>
                            {task.description && (
                              <p className="text-sm text-[var(--text-secondary)] mt-1">{task.description}</p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)] mt-2">
                              {task.contact?.name && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {task.contact.name}
                                </span>
                              )}
                              {task.due_date && (
                                <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                                  <Clock className="h-3 w-3" />
                                  {new Date(task.due_date).toLocaleDateString()}
                                  {isOverdue && ' (overdue)'}
                                </span>
                              )}
                              {task.ai_confidence && (
                                <span className="flex items-center gap-1">
                                  <Sparkles className="h-3 w-3" />
                                  {Math.round(task.ai_confidence * 100)}% AI confidence
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Follow-ups Tab */}
          <TabsContent value="followups" className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <Badge className={followUpsSummary.overdue > 0 ? 'bg-[var(--accent-error)]/20 text-[var(--accent-error)]' : 'bg-[var(--surface-tertiary)] text-[var(--text-secondary)]'}>
                  {followUpsSummary.overdue || 0} overdue
                </Badge>
                <Badge className="bg-blue-100 text-blue-800">
                  {followUpsSummary.today || 0} today
                </Badge>
                <Badge className="bg-green-100 text-green-800">
                  {followUpsSummary.thisWeek || 0} this week
                </Badge>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                {followUps.length === 0 ? (
                  <EmptyState
                    icon={Clock}
                    title="No follow-ups scheduled"
                    description="AI-suggested follow-ups from calls will appear here"
                  />
                ) : (
                  <div className="divide-y">
                    {followUps.map(followUp => {
                      const isOverdue = new Date(followUp.scheduled_for) < new Date()
                      const TypeIcon = {
                        email: Mail,
                        call: Phone,
                        sms: MessageSquare,
                        meeting: Calendar
                      }[followUp.follow_up_type] || Clock
                      
                      return (
                        <div key={followUp.id} className="p-4 flex items-start gap-4">
                          <div className={`p-2 rounded-full ${isOverdue ? 'bg-red-100' : 'bg-blue-100'}`}>
                            <TypeIcon className={`h-5 w-5 ${isOverdue ? 'text-red-600' : 'text-blue-600'}`} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium capitalize text-[var(--text-primary)]">{followUp.follow_up_type}</span>
                              {followUp.contact?.name && (
                                <span className="text-[var(--text-secondary)]">with {followUp.contact.name}</span>
                              )}
                              {isOverdue && (
                                <Badge className="bg-[var(--accent-error)]/20 text-[var(--accent-error)]">Overdue</Badge>
                              )}
                            </div>
                            {followUp.suggested_subject && (
                              <p className="text-sm text-[var(--text-secondary)] mt-1">{followUp.suggested_subject}</p>
                            )}
                            {followUp.suggested_message && (
                              <p className="text-sm text-[var(--text-tertiary)] mt-1 line-clamp-2">{followUp.suggested_message}</p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)] mt-2">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(followUp.scheduled_for).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCompleteFollowUp(followUp.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Done
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Enhanced Prospect Detail Dialog */}
        {selectedProspect && (
          <Dialog open={!!selectedProspect} onOpenChange={(open) => !open && setSelectedProspect(null)}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                      {selectedProspect.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <DialogTitle className="text-xl">{selectedProspect.name}</DialogTitle>
                      <DialogDescription className="flex items-center gap-2">
                        {selectedProspect.company && <span>{selectedProspect.company}</span>}
                        {selectedProspect.company && selectedProspect.email && <span>•</span>}
                        {selectedProspect.email && <span>{selectedProspect.email}</span>}
                      </DialogDescription>
                    </div>
                  </div>
                  <Badge className={`${PIPELINE_STAGES[selectedProspect.pipeline_stage || 'new_lead'].color} text-white`}>
                    {PIPELINE_STAGES[selectedProspect.pipeline_stage || 'new_lead'].label}
                  </Badge>
                </div>
              </DialogHeader>
              
              {/* Quick Actions Bar */}
              <div className="flex items-center gap-2 py-3 border-b flex-shrink-0">
                {selectedProspect.phone && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`tel:${selectedProspect.phone}`}>
                      <Phone className="h-4 w-4 mr-2" />
                      Call
                    </a>
                  </Button>
                )}
                {selectedProspect.email && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`mailto:${selectedProspect.email}`}>
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </a>
                  </Button>
                )}
                {selectedProspect.website && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={selectedProspect.website} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4 mr-2" />
                      Website
                    </a>
                  </Button>
                )}
                <div className="flex-1" />
                <ProposalAIDialog 
                  preselectedClientId={selectedProspect.id}
                  onSuccess={(proposal) => {
                    toast.success('Proposal generated successfully!')
                    // Could navigate to proposal preview or refresh data
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsConvertDialogOpen(true)}
                  disabled={!selectedProspect.email}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Magic Link
                </Button>
              </div>
              
              {/* Tabbed Content */}
              <Tabs value={prospectDetailTab} onValueChange={setProspectDetailTab} className="flex-1 overflow-hidden flex flex-col">
                <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>
                
                <ScrollArea className="flex-1 mt-4">
                  {/* Overview Tab */}
                  <TabsContent value="overview" className="mt-0 space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="p-4 bg-[var(--surface-secondary)] rounded-lg text-center">
                        <p className="text-2xl font-bold text-blue-600">{selectedProspect.call_count || 0}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">Calls</p>
                      </div>
                      <div className="p-4 bg-[var(--surface-secondary)] rounded-lg text-center">
                        <p className="text-2xl font-bold text-purple-600">{formatDuration(selectedProspect.total_call_duration || 0)}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">Talk Time</p>
                      </div>
                      <div className="p-4 bg-[var(--surface-secondary)] rounded-lg text-center">
                        <LeadQualityBadge score={selectedProspect.avg_lead_quality} />
                        <p className="text-xs text-[var(--text-tertiary)] mt-1">Lead Score</p>
                      </div>
                      <div className="p-4 bg-[var(--surface-secondary)] rounded-lg text-center">
                        <p className="text-2xl font-bold text-[var(--text-secondary)]">
                          {selectedProspect.last_contact_at ? formatRelativeTime(selectedProspect.last_contact_at) : 'Never'}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)]">Last Contact</p>
                      </div>
                    </div>
                    
                    {/* Contact Details */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Contact Information</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-[var(--text-tertiary)]" />
                          <span className="text-[var(--text-primary)]">{selectedProspect.email || 'No email'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-[var(--text-tertiary)]" />
                          <span className="text-[var(--text-primary)]">{selectedProspect.phone || 'No phone'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-[var(--text-tertiary)]" />
                          <span className="text-[var(--text-primary)]">{selectedProspect.company || 'No company'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-[var(--text-tertiary)]" />
                          <span className="text-[var(--text-primary)] capitalize">{selectedProspect.source || 'Unknown source'}</span>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Recent Call */}
                    {selectedProspect.last_call && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Last Call</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2 mb-2">
                            {selectedProspect.last_call.direction === 'inbound' ? (
                              <PhoneIncoming className="h-4 w-4 text-green-600" />
                            ) : (
                              <PhoneOutgoing className="h-4 w-4 text-blue-600" />
                            )}
                            <span className="font-medium">{formatDuration(selectedProspect.last_call.duration)}</span>
                            <span className="text-[var(--text-tertiary)]">•</span>
                            <span className="text-[var(--text-tertiary)]">{formatRelativeTime(selectedProspect.last_call.created_at)}</span>
                            <SentimentBadge sentiment={selectedProspect.last_call.sentiment} />
                          </div>
                          {selectedProspect.last_call.ai_summary && (
                            <p className="text-sm text-[var(--text-secondary)] bg-[var(--surface-secondary)] p-3 rounded-lg">{selectedProspect.last_call.ai_summary}</p>
                          )}
                        </CardContent>
                      </Card>
                    )}
                    
                    {/* Pipeline Stage Selector */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Pipeline Stage</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(PIPELINE_STAGES).map(([stage, config]) => {
                            const StageIcon = config.icon
                            const isActive = (selectedProspect.pipeline_stage || 'new_lead') === stage
                            
                            return (
                              <Button
                                key={stage}
                                variant={isActive ? 'default' : 'outline'}
                                size="sm"
                                className={isActive ? `${config.color} text-white` : ''}
                                onClick={() => handleUpdateStage(selectedProspect.id, stage)}
                              >
                                <StageIcon className="h-4 w-4 mr-1" />
                                {config.label}
                              </Button>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  {/* Notes Tab */}
                  <TabsContent value="notes" className="mt-0 space-y-4">
                    {/* Add Note Form */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Add Note</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-2">
                          <Textarea
                            placeholder="Add a note about this prospect..."
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            rows={2}
                            className="flex-1"
                          />
                          <Button
                            onClick={handleAddNote}
                            disabled={!newNote.trim() || isAddingNote}
                            className="self-end"
                          >
                            {isAddingNote ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Notes List */}
                    <Card>
                      <CardContent className="p-0">
                        {isLoadingActivity ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-[var(--text-tertiary)]" />
                          </div>
                        ) : prospectActivity.filter(a => a.type === 'note').length === 0 ? (
                          <div className="text-center py-8 text-[var(--text-secondary)]">
                            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No notes yet</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-[var(--glass-border)]">
                            {prospectActivity
                              .filter(a => a.type === 'note')
                              .map(note => (
                                <div key={note.id} className="p-4">
                                  <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-full bg-blue-100">
                                      <MessageSquare className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm text-[var(--text-primary)]">{note.description}</p>
                                      <p className="text-xs text-[var(--text-tertiary)] mt-1">
                                        {note.metadata?.created_by_email || 'Unknown'} • {formatRelativeTime(note.timestamp)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  {/* Activity Tab */}
                  <TabsContent value="activity" className="mt-0">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          Activity Timeline
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        {isLoadingActivity ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-[var(--text-tertiary)]" />
                          </div>
                        ) : prospectActivity.length === 0 ? (
                          <div className="text-center py-8 text-[var(--text-secondary)]">
                            <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No activity yet</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-[var(--glass-border)]">
                            {prospectActivity.map(activity => {
                              const iconMap = {
                                call: Phone,
                                note: MessageSquare,
                                stage_change: GitBranch,
                                proposal: FileText,
                                follow_up: Clock,
                                task: CheckSquare,
                                email_sent: Mail,
                                converted: UserCheck
                              }
                              const colorMap = {
                                call: 'bg-green-100 text-green-600',
                                note: 'bg-blue-100 text-blue-600',
                                stage_change: 'bg-purple-100 text-purple-600',
                                proposal: 'bg-indigo-100 text-indigo-600',
                                follow_up: 'bg-amber-100 text-amber-600',
                                task: 'bg-emerald-100 text-emerald-600',
                                email_sent: 'bg-cyan-100 text-cyan-600',
                                converted: 'bg-green-100 text-green-600'
                              }
                              const Icon = iconMap[activity.type] || Activity
                              const colorClass = colorMap[activity.type] || 'bg-[var(--surface-tertiary)] text-[var(--text-secondary)]'
                              
                              return (
                                <div key={activity.id} className="p-4 flex items-start gap-3">
                                  <div className={`p-2 rounded-full ${colorClass}`}>
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-[var(--text-primary)]">{activity.title}</p>
                                    <p className="text-sm text-[var(--text-secondary)] mt-0.5">{activity.description}</p>
                                    <p className="text-xs text-[var(--text-tertiary)] mt-1">{formatRelativeTime(activity.timestamp)}</p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </ScrollArea>
              </Tabs>
              
              <DialogFooter className="flex-shrink-0 border-t pt-4">
                <Button variant="outline" onClick={() => setSelectedProspect(null)}>
                  Close
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const prospectData = {
                      id: selectedProspect.id,
                      name: selectedProspect.name,
                      company: selectedProspect.company,
                      email: selectedProspect.email
                    }
                    window.location.href = `/admin/proposals?createFor=${encodeURIComponent(JSON.stringify(prospectData))}`
                  }}
                  disabled={!selectedProspect.email}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Create Proposal
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Convert to User Dialog */}
        <ConfirmDialog
          open={isConvertDialogOpen}
          onOpenChange={setIsConvertDialogOpen}
          title="Send Portal Access"
          description={`Send a magic link to ${selectedProspect?.email}? They'll be able to access the client portal and view any proposals.`}
          onConfirm={handleConvertToUser}
          isLoading={isSubmitting}
          confirmText="Send Magic Link"
        />

        {/* Call Detail Dialog */}
        {selectedCall && (
          <Dialog open={isCallDetailOpen} onOpenChange={(open) => { setIsCallDetailOpen(open); if (!open) setSelectedCall(null) }}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${selectedCall.direction === 'inbound' ? 'bg-green-100' : 'bg-blue-100'}`}>
                    {selectedCall.direction === 'inbound' ? (
                      <PhoneIncoming className="h-6 w-6 text-green-600" />
                    ) : (
                      <PhoneOutgoing className="h-6 w-6 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <DialogTitle className="font-mono">{selectedCall.phone_number}</DialogTitle>
                    <DialogDescription>
                      {formatDuration(selectedCall.duration)} • {new Date(selectedCall.created_at).toLocaleString()}
                    </DialogDescription>
                  </div>
                  <div className="ml-auto flex gap-2">
                    <LeadQualityBadge score={selectedCall.lead_quality_score} />
                    <SentimentBadge sentiment={selectedCall.sentiment} />
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* AI Summary */}
                {selectedCall.ai_summary && (
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                    <p className="text-sm font-medium text-blue-800 flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4" />
                      AI Summary
                    </p>
                    <p className="text-sm">{selectedCall.ai_summary}</p>
                  </div>
                )}
                
                {/* Transcript */}
                {selectedCall.openphone_transcript && (
                  <div>
                    <p className="text-sm font-medium mb-2">Transcript</p>
                    <ScrollArea className="h-64 rounded-lg border p-4">
                      <pre className="text-sm whitespace-pre-wrap font-sans">{selectedCall.openphone_transcript}</pre>
                    </ScrollArea>
                  </div>
                )}
                
                {/* Recording */}
                {selectedCall.recording_url && (
                  <div>
                    <p className="text-sm font-medium mb-2">Recording</p>
                    <audio controls className="w-full">
                      <source src={selectedCall.recording_url} type="audio/mpeg" />
                    </audio>
                  </div>
                )}
                
                {/* Contact */}
                {selectedCall.contact && (
                  <div className="p-4 border border-[var(--glass-border)] rounded-lg">
                    <p className="text-sm font-medium mb-2 text-[var(--text-primary)]">Matched Contact</p>
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{selectedCall.contact.name}</p>
                        <p className="text-sm text-[var(--text-tertiary)]">{selectedCall.contact.company}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCallDetailOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => handleLookupBusiness(selectedCall.id, selectedCall.phone_number)}>
                  <Globe className="h-4 w-4 mr-2" />
                  Lookup Business
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </TooltipProvider>
  )
}
