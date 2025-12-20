/**
 * TenantCRMDashboard - Streamlined CRM for tenant organizations
 * 
 * Features:
 * - Universal pipeline stages (no proposal-specific stages)
 * - No OpenPhone integration (uses simple contact info)
 * - Optional Signal AI layer for smart insights
 * - Clean, world-class design matching main CRM
 * - Tasks, notes, activity timeline
 * - Email integration
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  TrendingUp,
  Users,
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
  Loader2,
  Sparkles,
  Mail,
  Pencil,
  Trash2,
  ChevronRight,
  Filter,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Zap,
  BrainCircuit
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { toast } from '@/lib/toast'
import useAuthStore from '@/lib/auth-store'
import useDebounce from '@/hooks/useDebounce'
import api from '@/lib/api'

// Local components
import TenantPipelineKanban, { TENANT_PIPELINE_STAGES } from './TenantPipelineKanban'
import TenantContactDetail from './TenantContactDetail'
import TenantContactCard from './TenantContactCard'
import TenantAddContactDialog from './TenantAddContactDialog'
import TenantSignalPanel from './TenantSignalPanel'
import EmailComposeDialog from '../crm/EmailComposeDialog'

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

export default function TenantCRMDashboard() {
  const { user, currentOrg } = useAuthStore()
  const tenantName = currentOrg?.name || 'Your Business'
  
  // View state
  const [activeTab, setActiveTab] = useState('contacts')
  const [viewMode, setViewMode] = useState('pipeline') // 'pipeline' | 'table'
  const [showClosedDeals, setShowClosedDeals] = useState(false)
  
  // Signal AI toggle
  const [signalEnabled, setSignalEnabled] = useState(false)
  const [signalInsights, setSignalInsights] = useState(null)
  const [isLoadingInsights, setIsLoadingInsights] = useState(false)
  
  // Table sorting
  const [sortColumn, setSortColumn] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  
  // Data state
  const [contacts, setContacts] = useState([])
  const [tasks, setTasks] = useState([])
  const [pipelineStats, setPipelineStats] = useState({})
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingTasks, setIsLoadingTasks] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [stageFilter, setStageFilter] = useState('all')
  const [tasksStatus, setTasksStatus] = useState('pending')
  
  // Selected items
  const [selectedContact, setSelectedContact] = useState(null)
  const [selectedContacts, setSelectedContacts] = useState([])
  
  // Contact detail data
  const [contactActivity, setContactActivity] = useState([])
  const [contactEmails, setContactEmails] = useState([])
  const [isLoadingContactData, setIsLoadingContactData] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)
  
  // Dialogs
  const [isAddContactOpen, setIsAddContactOpen] = useState(false)
  const [isEmailComposeOpen, setIsEmailComposeOpen] = useState(false)
  const [emailComposeTarget, setEmailComposeTarget] = useState(null)

  // Fetch contacts
  const fetchContacts = useCallback(async (searchOverride) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      const searchTerm = searchOverride !== undefined ? searchOverride : debouncedSearch
      if (searchTerm) params.append('search', searchTerm)
      if (stageFilter !== 'all') params.append('stage', stageFilter)
      
      const response = await api.get(`/.netlify/functions/crm-prospects-list?${params.toString()}`)
      setContacts(response.data.prospects || [])
      setPipelineStats(response.data.pipelineStats || {})
    } catch (err) {
      console.error('Failed to fetch contacts:', err)
      toast.error('Failed to load contacts')
      setContacts([])
    } finally {
      setIsLoading(false)
    }
  }, [debouncedSearch, stageFilter])

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    setIsLoadingTasks(true)
    try {
      const params = new URLSearchParams()
      if (tasksStatus !== 'all') params.append('status', tasksStatus)
      
      const response = await api.get(`/.netlify/functions/crm-tasks-list?${params.toString()}`)
      setTasks(response.data.tasks || [])
    } catch (err) {
      console.error('Failed to fetch tasks:', err)
      setTasks([])
    } finally {
      setIsLoadingTasks(false)
    }
  }, [tasksStatus])

  // Fetch Signal insights
  const fetchSignalInsights = useCallback(async () => {
    if (!signalEnabled) return
    
    setIsLoadingInsights(true)
    try {
      // This would call a Signal AI endpoint for insights
      // For now, generate sample insights based on contact data
      const insights = generateInsights(contacts, pipelineStats)
      setSignalInsights(insights)
    } catch (err) {
      console.error('Failed to fetch Signal insights:', err)
    } finally {
      setIsLoadingInsights(false)
    }
  }, [signalEnabled, contacts, pipelineStats])

  // Generate AI-style insights (can be replaced with actual API)
  function generateInsights(contacts, stats) {
    const hotLeads = contacts.filter(c => c.lead_score >= 70)
    const staleLeads = contacts.filter(c => {
      const daysSinceContact = c.last_contacted_at 
        ? Math.floor((Date.now() - new Date(c.last_contacted_at)) / 86400000)
        : 999
      return daysSinceContact > 7 && c.pipeline_stage !== 'closed_won' && c.pipeline_stage !== 'closed_lost'
    })
    const newThisWeek = contacts.filter(c => {
      const created = new Date(c.created_at)
      const weekAgo = new Date(Date.now() - 7 * 86400000)
      return created > weekAgo
    })
    
    return {
      hotLeads: hotLeads.slice(0, 3),
      staleLeads: staleLeads.slice(0, 3),
      newThisWeek: newThisWeek.length,
      conversionRate: stats.closed_won ? Math.round((stats.closed_won / (contacts.length || 1)) * 100) : 0,
      recommendations: [
        hotLeads.length > 0 ? `${hotLeads.length} hot lead${hotLeads.length > 1 ? 's' : ''} ready for outreach` : null,
        staleLeads.length > 0 ? `${staleLeads.length} lead${staleLeads.length > 1 ? 's' : ''} need attention - no contact in 7+ days` : null,
        newThisWeek > 3 ? `Strong week! ${newThisWeek} new leads added` : null
      ].filter(Boolean)
    }
  }

  // Auto-fetch on debounced search change
  useEffect(() => {
    fetchContacts()
  }, [debouncedSearch, stageFilter])

  // Initial fetch
  useEffect(() => {
    fetchTasks()
  }, [])

  // Fetch Signal insights when enabled
  useEffect(() => {
    if (signalEnabled && contacts.length > 0) {
      fetchSignalInsights()
    }
  }, [signalEnabled, contacts])

  // Refresh all data
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([
      fetchContacts(),
      fetchTasks()
    ])
    if (signalEnabled) {
      await fetchSignalInsights()
    }
    setIsRefreshing(false)
    toast.success('Data refreshed')
  }

  // Stage update handler
  const handleUpdateStage = async (contactId, newStage) => {
    try {
      await api.patch('/.netlify/functions/crm-prospects-update', {
        id: contactId,
        pipelineStage: newStage
      })
      
      setContacts(contacts.map(c => 
        c.id === contactId ? { ...c, pipeline_stage: newStage } : c
      ))
      
      toast.success(`Moved to ${TENANT_PIPELINE_STAGES[newStage].label}`)
    } catch (err) {
      console.error('Failed to update stage:', err)
      toast.error('Failed to update pipeline stage')
    }
  }

  // Task completion handler
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

  // Open contact detail
  const openContactDetail = async (contact) => {
    setSelectedContact(contact)
    setIsLoadingContactData(true)
    
    try {
      const [emailsRes, activityRes] = await Promise.all([
        api.get(`/.netlify/functions/crm-emails-list?contactId=${contact.id}`).catch(() => ({ data: { emails: [] } })),
        api.get(`/.netlify/functions/crm-prospect-activity?contactId=${contact.id}`).catch(() => ({ data: { timeline: [] } }))
      ])
      
      setContactEmails(emailsRes.data.emails || [])
      setContactActivity(activityRes.data.timeline || [])
    } catch (err) {
      console.error('Failed to fetch contact data:', err)
    } finally {
      setIsLoadingContactData(false)
    }
  }

  // Close contact detail
  const closeContactDetail = () => {
    setSelectedContact(null)
    setContactEmails([])
    setContactActivity([])
    setNewNote('')
  }

  // Email handler
  const handleEmailContact = (contact) => {
    if (contact.email) {
      setEmailComposeTarget(contact)
      setIsEmailComposeOpen(true)
    } else {
      toast.error('No email address for this contact')
    }
  }

  // Add note handler
  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedContact) return
    
    setIsAddingNote(true)
    try {
      await api.post('/.netlify/functions/crm-notes-create', {
        contactId: selectedContact.id,
        content: newNote.trim()
      })
      toast.success('Note added')
      setNewNote('')
      // Refresh activity
      const activityRes = await api.get(`/.netlify/functions/crm-prospect-activity?contactId=${selectedContact.id}`)
      setContactActivity(activityRes.data.timeline || [])
    } catch (err) {
      toast.error('Failed to add note')
    } finally {
      setIsAddingNote(false)
    }
  }

  // Filter and sort contacts for table view
  const sortedContacts = useMemo(() => {
    let sorted = [...contacts]
    
    sorted.sort((a, b) => {
      let aVal = a[sortColumn] || ''
      let bVal = b[sortColumn] || ''
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      
      if (sortDirection === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
      }
    })
    
    return sorted
  }, [contacts, sortColumn, sortDirection])

  // Handle column sort
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Sort icon
  const SortIcon = ({ column }) => {
    if (sortColumn !== column) return <ChevronsUpDown className="h-3 w-3 opacity-50" />
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-3 w-3" />
      : <ChevronDown className="h-3 w-3" />
  }

  // Stats cards
  const statsData = [
    {
      label: 'Total Contacts',
      value: contacts.length,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      label: 'Active Deals',
      value: contacts.filter(c => !['closed_won', 'closed_lost'].includes(c.pipeline_stage)).length,
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      label: 'Won This Month',
      value: pipelineStats.closed_won || 0,
      icon: CheckCheck,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10'
    },
    {
      label: 'Tasks Due',
      value: tasks.filter(t => t.status === 'pending').length,
      icon: ListTodo,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Contacts</h1>
          <p className="text-[var(--text-secondary)]">
            Manage your leads and customers
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Signal AI Toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                  <BrainCircuit className={cn(
                    "h-4 w-4 transition-colors",
                    signalEnabled ? "text-purple-500" : "text-[var(--text-tertiary)]"
                  )} />
                  <Label htmlFor="signal-toggle" className="text-sm cursor-pointer">
                    Signal
                  </Label>
                  <Switch
                    id="signal-toggle"
                    checked={signalEnabled}
                    onCheckedChange={setSignalEnabled}
                    className="data-[state=checked]:bg-purple-500"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>AI-powered insights and recommendations</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
          
          <Button onClick={() => setIsAddContactOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Signal Insights Panel (when enabled) */}
      {signalEnabled && (
        <TenantSignalPanel 
          insights={signalInsights}
          isLoading={isLoadingInsights}
          onContactClick={openContactDetail}
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsData.map((stat, idx) => (
          <Card key={idx} className="bg-[var(--glass-bg)] backdrop-blur-sm border-[var(--glass-border)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="contacts" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              Tasks
              {tasks.filter(t => t.status === 'pending').length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 text-xs">
                  {tasks.filter(t => t.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {activeTab === 'contacts' && (
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
                <Input
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Stage Filter */}
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {Object.entries(TENANT_PIPELINE_STAGES).map(([key, stage]) => (
                    <SelectItem key={key} value={key}>{stage.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* View Toggle */}
              <div className="flex items-center rounded-lg border border-[var(--glass-border)] p-1">
                <Button
                  variant={viewMode === 'pipeline' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('pipeline')}
                  className="h-7 px-2"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="h-7 px-2"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Contacts Tab Content */}
        <TabsContent value="contacts" className="mt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
            </div>
          ) : viewMode === 'pipeline' ? (
            <TenantPipelineKanban
              contacts={contacts}
              selectedContacts={selectedContacts}
              onSelectContact={(id) => {
                setSelectedContacts(prev => 
                  prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
                )
              }}
              onCardClick={openContactDetail}
              onUpdateStage={handleUpdateStage}
              showClosedDeals={showClosedDeals}
              onToggleClosedDeals={() => setShowClosedDeals(!showClosedDeals)}
            />
          ) : (
            /* Table View */
            <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-[var(--glass-border)]">
                      <tr>
                        <th className="w-10 p-3">
                          <Checkbox
                            checked={selectedContacts.length === contacts.length && contacts.length > 0}
                            onCheckedChange={(checked) => {
                              setSelectedContacts(checked ? contacts.map(c => c.id) : [])
                            }}
                          />
                        </th>
                        {[
                          { key: 'name', label: 'Name' },
                          { key: 'email', label: 'Email' },
                          { key: 'company', label: 'Company' },
                          { key: 'pipeline_stage', label: 'Stage' },
                          { key: 'last_contacted_at', label: 'Last Contact' }
                        ].map(col => (
                          <th 
                            key={col.key}
                            className="text-left p-3 text-sm font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]"
                            onClick={() => handleSort(col.key)}
                          >
                            <div className="flex items-center gap-1">
                              {col.label}
                              <SortIcon column={col.key} />
                            </div>
                          </th>
                        ))}
                        <th className="w-20 p-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedContacts.map(contact => {
                        const stage = TENANT_PIPELINE_STAGES[contact.pipeline_stage] || TENANT_PIPELINE_STAGES.new_lead
                        return (
                          <tr 
                            key={contact.id}
                            className="border-b border-[var(--glass-border)] hover:bg-[var(--glass-bg)] cursor-pointer transition-colors"
                            onClick={() => openContactDetail(contact)}
                          >
                            <td className="p-3" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedContacts.includes(contact.id)}
                                onCheckedChange={() => {
                                  setSelectedContacts(prev =>
                                    prev.includes(contact.id) 
                                      ? prev.filter(i => i !== contact.id) 
                                      : [...prev, contact.id]
                                  )
                                }}
                              />
                            </td>
                            <td className="p-3">
                              <div className="font-medium text-[var(--text-primary)]">
                                {contact.name || 'Unnamed'}
                              </div>
                            </td>
                            <td className="p-3 text-[var(--text-secondary)]">
                              {contact.email || '-'}
                            </td>
                            <td className="p-3 text-[var(--text-secondary)]">
                              {contact.company || '-'}
                            </td>
                            <td className="p-3">
                              <Badge 
                                variant="secondary"
                                className={cn("text-xs", stage.bgLight, stage.textColor)}
                              >
                                {stage.label}
                              </Badge>
                            </td>
                            <td className="p-3 text-sm text-[var(--text-tertiary)]">
                              {formatRelativeTime(contact.last_contacted_at)}
                            </td>
                            <td className="p-3" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEmailContact(contact)}
                                  disabled={!contact.email}
                                >
                                  <Mail className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  
                  {contacts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16">
                      <Users className="h-12 w-12 text-[var(--text-tertiary)] mb-4" />
                      <h3 className="text-lg font-medium text-[var(--text-primary)]">No contacts yet</h3>
                      <p className="text-[var(--text-secondary)] mt-1">
                        Add your first contact to get started
                      </p>
                      <Button className="mt-4" onClick={() => setIsAddContactOpen(true)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Contact
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tasks Tab Content */}
        <TabsContent value="tasks" className="mt-0">
          <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Tasks</CardTitle>
                <Select value={tasksStatus} onValueChange={(v) => { setTasksStatus(v); fetchTasks(); }}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingTasks ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--text-tertiary)]" />
                </div>
              ) : tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <ListTodo className="h-10 w-10 text-[var(--text-tertiary)] mb-3" />
                  <p className="text-[var(--text-secondary)]">No tasks found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map(task => (
                    <div 
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-secondary)] hover:bg-[var(--glass-bg)] transition-colors"
                    >
                      <Checkbox
                        checked={task.status === 'completed'}
                        onCheckedChange={() => handleCompleteTask(task.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-medium",
                          task.status === 'completed' && "line-through text-[var(--text-tertiary)]"
                        )}>
                          {task.title}
                        </p>
                        {task.contact_name && (
                          <p className="text-sm text-[var(--text-tertiary)]">
                            {task.contact_name}
                          </p>
                        )}
                      </div>
                      {task.due_date && (
                        <span className="text-xs text-[var(--text-tertiary)]">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Contact Detail Slide-over */}
      {selectedContact && (
        <TenantContactDetail
          contact={selectedContact}
          emails={contactEmails}
          activity={contactActivity}
          isLoading={isLoadingContactData}
          onClose={closeContactDetail}
          onEmail={handleEmailContact}
          onUpdateStage={handleUpdateStage}
          onAddNote={handleAddNote}
          newNote={newNote}
          onNoteChange={setNewNote}
          isAddingNote={isAddingNote}
          signalEnabled={signalEnabled}
        />
      )}

      {/* Add Contact Dialog */}
      <TenantAddContactDialog
        open={isAddContactOpen}
        onOpenChange={setIsAddContactOpen}
        onSuccess={() => {
          fetchContacts()
          setIsAddContactOpen(false)
        }}
      />

      {/* Email Compose Dialog */}
      <EmailComposeDialog
        open={isEmailComposeOpen}
        onOpenChange={setIsEmailComposeOpen}
        prospect={emailComposeTarget}
        audits={[]}
        proposals={[]}
        onSuccess={() => {
          toast.success('Email sent!')
          if (selectedContact?.id === emailComposeTarget?.id) {
            // Refresh activity
            api.get(`/.netlify/functions/crm-prospect-activity?contactId=${selectedContact.id}`)
              .then(res => setContactActivity(res.data.timeline || []))
          }
        }}
      />
    </div>
  )
}
