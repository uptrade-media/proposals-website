// src/components/sync/SyncModule.jsx
// Sync Module - Motion-inspired Calendar & Scheduling
// Clean, beautiful calendar design with AI-powered scheduling

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  Clock,
  Video,
  Users,
  Plus,
  Settings,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Link2,
  CalendarPlus,
  Loader2,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Sparkles,
  Brain,
  Focus,
  Sun,
  Target,
  Search,
  LayoutGrid,
  List,
  CalendarDays,
  Coffee,
  Briefcase,
  CheckSquare,
  Timer,
  X,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  PanelLeftClose,
  PanelRightClose,
  CalendarCheck,
  CalendarOff,
  Lightbulb,
  History,
  FileText,
  HelpCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import useAuthStore from '@/lib/auth-store'
import { useSignalAccess } from '@/lib/signal-access'
import { portalApi } from '@/lib/portal-api'
import { syncApi as signalSyncApi } from '@/lib/signal-api'
import { toast } from 'sonner'

// Import modal components
import CreateEventModal from './CreateEventModal'
import BookingTypesPanel from './BookingTypesPanel'
import BookingsListPanel from './BookingsListPanel'
import HostsPanel from './HostsPanel'
import AvailabilityExceptionsPanel from './AvailabilityExceptionsPanel'
import CalendarConnectionsPanel from './CalendarConnectionsPanel'

// Color palette for events (Motion-inspired with Uptrade teal/emerald)
const EVENT_COLORS = {
  focus: { 
    bg: 'bg-teal-500', 
    light: 'bg-teal-50 dark:bg-teal-500/15', 
    text: 'text-teal-700 dark:text-teal-300', 
    border: 'border-teal-400',
    accent: '#14b8a6'
  },
  meeting: { 
    bg: 'bg-rose-400', 
    light: 'bg-rose-50 dark:bg-rose-500/15', 
    text: 'text-rose-700 dark:text-rose-300', 
    border: 'border-rose-400',
    accent: '#fb7185'
  },
  task: { 
    bg: 'bg-amber-400', 
    light: 'bg-amber-50 dark:bg-amber-500/15', 
    text: 'text-amber-700 dark:text-amber-300', 
    border: 'border-amber-400',
    accent: '#fbbf24'
  },
  lunch: { 
    bg: 'bg-orange-400', 
    light: 'bg-orange-50 dark:bg-orange-500/15', 
    text: 'text-orange-700 dark:text-orange-300', 
    border: 'border-orange-400',
    accent: '#fb923c'
  },
  work: { 
    bg: 'bg-violet-400', 
    light: 'bg-violet-50 dark:bg-violet-500/15', 
    text: 'text-violet-700 dark:text-violet-300', 
    border: 'border-violet-400',
    accent: '#a78bfa'
  },
  personal: { 
    bg: 'bg-sky-400', 
    light: 'bg-sky-50 dark:bg-sky-500/15', 
    text: 'text-sky-700 dark:text-sky-300', 
    border: 'border-sky-400',
    accent: '#38bdf8'
  },
  default: { 
    bg: 'bg-gray-400', 
    light: 'bg-gray-50 dark:bg-gray-500/15', 
    text: 'text-gray-700 dark:text-gray-300', 
    border: 'border-gray-400',
    accent: '#9ca3af'
  },
}

// Get week dates starting from Sunday
const getWeekDates = (date) => {
  const start = new Date(date)
  start.setDate(start.getDate() - start.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

// Format helpers
const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })
}

const formatHour = (hour) => {
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour} ${ampm}`
}

const isSameDay = (d1, d2) => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate()
}

// ============================================================================
// MINI CALENDAR COMPONENT
// ============================================================================

function MiniCalendar({ selectedDate, setSelectedDate, events }) {
  const today = new Date()
  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
  const startDay = monthStart.getDay()
  const daysInMonth = monthEnd.getDate()
  
  const getEventsForDay = (date) => events.filter(e => isSameDay(new Date(e.start_time || e.startTime), date))
  
  const days = []
  for (let i = 0; i < startDay; i++) {
    const d = new Date(monthStart)
    d.setDate(d.getDate() - (startDay - i))
    days.push({ date: d, isCurrentMonth: false })
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ date: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i), isCurrentMonth: true })
  }
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(monthEnd)
    d.setDate(d.getDate() + i)
    days.push({ date: d, isCurrentMonth: false })
  }
  
  const navigateMonth = (direction) => {
    const newDate = new Date(selectedDate)
    newDate.setMonth(newDate.getMonth() + direction)
    setSelectedDate(newDate)
  }
  
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold">
          {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <div className="flex gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-[11px] text-muted-foreground font-medium py-1.5">{day}</div>
        ))}
        {days.map(({ date, isCurrentMonth }, i) => {
          const isSelected = isSameDay(date, selectedDate)
          const isCurrentDay = isSameDay(date, today)
          const hasEvents = getEventsForDay(date).length > 0
          
          return (
            <button
              key={i}
              onClick={() => setSelectedDate(date)}
              className={cn(
                "relative w-8 h-8 rounded-full text-xs font-medium transition-all",
                !isCurrentMonth && "text-muted-foreground/40",
                isCurrentMonth && "hover:bg-muted",
                isSelected && "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm",
                isCurrentDay && !isSelected && "ring-2 ring-emerald-500/50 font-bold text-emerald-600 dark:text-emerald-400"
              )}
            >
              {date.getDate()}
              {hasEvents && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SyncModule({ className }) {
  const { currentOrg, currentProject, availableProjects, user } = useAuthStore()
  const { hasAccess: hasSignalAccess, hasOrgSignal, hasCurrentProjectSignal, isAdmin } = useSignalAccess()
  
  // State
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('week')
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showRightSidebar, setShowRightSidebar] = useState(true)
  const [showLeftSidebar, setShowLeftSidebar] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createModalType, setCreateModalType] = useState('event')
  const [showBookingTypes, setShowBookingTypes] = useState(false)
  const [showBookingsList, setShowBookingsList] = useState(false)
  const [showHostsPanel, setShowHostsPanel] = useState(false)
  const [showExceptionsPanel, setShowExceptionsPanel] = useState(false)
  const [showCalendarConnections, setShowCalendarConnections] = useState(null) // host object or null
  const [hosts, setHosts] = useState([])
  
  // Calendar visibility (source filtering)
  const [calendarSources, setCalendarSources] = useState([
    { id: 'project-task', name: 'Project Tasks', color: 'teal', visible: true, icon: CheckSquare },
  ])
  const [projectSourceVisibility, setProjectSourceVisibility] = useState({})
  const [expandedProjects, setExpandedProjects] = useState({})

  const crmSources = [
    { id: 'booking', name: 'Consultations', color: 'rose', icon: Video },
    { id: 'crm-followup', name: 'CRM Follow-ups', color: 'amber', icon: Users },
    { id: 'crm-activity', name: 'CRM Activities', color: 'violet', icon: Briefcase },
  ]

  const projectList = useMemo(() => {
    if (availableProjects?.length) return availableProjects
    return currentProject ? [currentProject] : []
  }, [availableProjects, currentProject])

  useEffect(() => {
    if (!projectList.length) return
    setProjectSourceVisibility((prev) => {
      const next = { ...prev }
      projectList.forEach((project) => {
        if (!next[project.id]) {
          next[project.id] = {
            booking: true,
            'crm-followup': true,
            'crm-activity': true,
          }
        }
      })
      return next
    })
  }, [projectList])
  
  // Signal AI states
  const [aiLoading, setAiLoading] = useState(null) // 'briefing' | 'focus' | 'prep' | null
  const [dailyBriefing, setDailyBriefing] = useState(null)
  const [focusRecommendations, setFocusRecommendations] = useState(null)
  const [meetingPrep, setMeetingPrep] = useState(null)
  const [showAIPanel, setShowAIPanel] = useState(null) // 'briefing' | 'focus' | 'prep' | null
  
  // Signal AI in Sync requires ORG-LEVEL Signal access (not project-level)
  // Project-level Signal only enables AI features within project modules, not Sync
  const signalEnabled = hasOrgSignal
  
  // Filter events by visible sources
  const filteredEvents = useMemo(() => {
    const visibleSources = calendarSources.filter(c => c.visible).map(c => c.id)

    return events.filter((event) => {
      if (event.source === 'booking' || event.source === 'crm-followup' || event.source === 'crm-activity') {
        const projectId = event.projectId || event.project_id
        if (!projectId) return true
        const visibility = projectSourceVisibility[projectId]
        if (!visibility) return true
        return visibility[event.source] !== false
      }

      return visibleSources.includes(event.source)
    })
  }, [events, calendarSources, projectSourceVisibility])
  
  // Computed values
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate])
  const today = new Date()
  const isToday = isSameDay(selectedDate, today)
  
  // Business hours (8 AM to 8 PM)
  const hours = Array.from({ length: 13 }, (_, i) => i + 8)
  
  // Load calendar data from all sources
  const loadCalendarData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const startDate = weekDates[0].toISOString().split('T')[0]
      const endDate = weekDates[6].toISOString().split('T')[0]
      const projectId = currentProject?.id
      
      // Parallel fetch from all data sources
      const [
        tasksRes,
        bookingsByProject,
        followUpsByProject,
        activitiesByProject,
      ] = await Promise.all([
        // 1. Project Tasks (per-user, independent of project dropdowns)
        projectId 
          ? portalApi.get(`/seo/projects/${projectId}/tasks`, {
              params: { status: 'pending,in_progress', hasDeadline: true }
            }).catch(() => ({ data: { tasks: [] } }))
          : Promise.resolve({ data: { tasks: [] } }),

        // 2. Consultation Bookings (per project)
        Promise.all(
          projectList.map((project) =>
            portalApi.get('/sync/admin/bookings', {
              params: { startDate, endDate, status: 'confirmed,pending' },
              headers: {
                'X-Project-Id': project.id,
                ...(project.org_id || currentOrg?.id
                  ? { 'X-Tenant-Org-Id': project.org_id || currentOrg?.id }
                  : {}),
              },
            })
              .then((res) => ({ project, data: res.data?.bookings || [] }))
              .catch(() => ({ project, data: [] }))
          )
        ),

        // 3. CRM Follow-ups (per project)
        Promise.all(
          projectList.map((project) =>
            portalApi.get('/crm/follow-ups', {
              params: { startDate, endDate },
              headers: {
                'X-Project-Id': project.id,
                ...(project.org_id || currentOrg?.id
                  ? { 'X-Tenant-Org-Id': project.org_id || currentOrg?.id }
                  : {}),
              },
            })
              .then((res) => ({ project, data: res.data?.followUps || res.data?.data || [] }))
              .catch(() => ({ project, data: [] }))
          )
        ),

        // 4. CRM Activities (per project)
        Promise.all(
          projectList.map((project) =>
            portalApi.get('/crm/activities', {
              params: { startDate, endDate, type: 'call,meeting' },
              headers: {
                'X-Project-Id': project.id,
                ...(project.org_id || currentOrg?.id
                  ? { 'X-Tenant-Org-Id': project.org_id || currentOrg?.id }
                  : {}),
              },
            })
              .then((res) => ({ project, data: res.data?.activities || res.data?.data || [] }))
              .catch(() => ({ project, data: [] }))
          )
        ),
      ])
      
      const allEvents = []
      
      // Transform bookings (per project)
      bookingsByProject.forEach(({ project, data }) => {
        data.forEach(booking => {
          allEvents.push({
            id: `booking-${booking.id}`,
            title: booking.title || `${booking.booking_type_name || 'Meeting'} with ${booking.guest_name}`,
            startTime: new Date(booking.scheduled_at || booking.start_time),
            endTime: new Date(booking.end_time || new Date(new Date(booking.scheduled_at).getTime() + (booking.duration_minutes || 30) * 60000)),
            type: 'meeting',
            color: 'meeting',
            source: 'booking',
            sourceId: booking.id,
            projectId: project.id,
            meta: { guestEmail: booking.guest_email, videoLink: booking.video_link, projectId: project.id }
          })
        })
      })
      
      // Transform CRM follow-ups (per project)
      followUpsByProject.forEach(({ project, data }) => {
        data.forEach(followUp => {
          if (followUp.due_at || followUp.scheduled_at) {
            const scheduledTime = new Date(followUp.due_at || followUp.scheduled_at)
            allEvents.push({
              id: `followup-${followUp.id}`,
              title: followUp.title || `Follow-up: ${followUp.contact_name || 'Contact'}`,
              startTime: scheduledTime,
              endTime: new Date(scheduledTime.getTime() + 30 * 60000), // 30 min default
              type: followUp.type === 'call' ? 'meeting' : 'task',
              color: followUp.type === 'call' ? 'meeting' : 'task',
              source: 'crm-followup',
              sourceId: followUp.id,
              projectId: project.id,
              meta: { contactId: followUp.contact_id, projectId: project.id }
            })
          }
        })
      })
      
      // Transform project tasks with deadlines
      const tasks = tasksRes.data?.tasks || tasksRes.data?.data || []
      tasks.forEach(task => {
        if (task.due_date || task.deadline) {
          const deadline = new Date(task.due_date || task.deadline)
          // Set to end of day if no time specified
          if (deadline.getHours() === 0 && deadline.getMinutes() === 0) {
            deadline.setHours(17, 0, 0, 0)
          }
          allEvents.push({
            id: `task-${task.id}`,
            title: task.title || task.name,
            startTime: new Date(deadline.getTime() - 60 * 60000), // 1 hour before deadline
            endTime: deadline,
            type: 'task',
            color: task.priority === 'high' ? 'meeting' : 'task',
            source: 'project-task',
            sourceId: task.id,
            meta: { projectId: task.project_id, status: task.status, priority: task.priority }
          })
        }
      })
      
      // Transform CRM activities (per project)
      activitiesByProject.forEach(({ project, data }) => {
        data.forEach(activity => {
          if (activity.scheduled_at) {
            const scheduledTime = new Date(activity.scheduled_at)
            allEvents.push({
              id: `activity-${activity.id}`,
              title: activity.title || `${activity.type}: ${activity.contact_name || 'Contact'}`,
              startTime: scheduledTime,
              endTime: new Date(scheduledTime.getTime() + (activity.duration_minutes || 30) * 60000),
              type: activity.type === 'call' ? 'meeting' : 'work',
              color: activity.type === 'call' ? 'meeting' : 'work',
              source: 'crm-activity',
              sourceId: activity.id,
              projectId: project.id,
              meta: { contactId: activity.contact_id, type: activity.type, projectId: project.id }
            })
          }
        })
      })
      
      setEvents(allEvents)
    } catch (err) {
      console.error('Failed to load sync data:', err)
      setError(err.message || 'Failed to load calendar data')
    } finally {
      setLoading(false)
    }
  }, [weekDates, currentProject?.id, projectList, currentOrg?.id])
  
  useEffect(() => {
    loadCalendarData()
  }, [loadCalendarData])
  
  // Load hosts for exceptions panel
  const loadHosts = useCallback(async () => {
    try {
      const { data } = await portalApi.get('/sync/admin/hosts').catch(() => ({ data: { hosts: [] } }))
      setHosts(data.hosts || [])
    } catch (err) {
      console.error('Failed to load hosts:', err)
    }
  }, [])
  
  useEffect(() => {
    loadHosts()
  }, [loadHosts])
  
  // ==================== Signal AI Handlers ====================
  
  // Load AI Daily Briefing
  const loadDailyBriefing = useCallback(async () => {
    if (!signalEnabled) return
    setAiLoading('briefing')
    try {
      const result = await signalSyncApi.getDailyBriefing({
        date: selectedDate.toISOString().split('T')[0],
        projectId: currentProject?.id,
      })
      setDailyBriefing(result.data || result)
      setShowAIPanel('briefing')
      toast.success('Daily briefing loaded')
    } catch (err) {
      console.error('Failed to load daily briefing:', err)
      toast.error('Failed to load daily briefing')
    } finally {
      setAiLoading(null)
    }
  }, [signalEnabled, selectedDate, currentProject?.id])
  
  // Get Focus Time Recommendations
  const loadFocusRecommendations = useCallback(async () => {
    if (!signalEnabled) return
    setAiLoading('focus')
    try {
      const result = await signalSyncApi.getFocusTime({
        date: selectedDate.toISOString().split('T')[0],
        projectId: currentProject?.id,
      })
      setFocusRecommendations(result.data || result)
      setShowAIPanel('focus')
      toast.success('Focus time recommendations loaded')
    } catch (err) {
      console.error('Failed to load focus recommendations:', err)
      toast.error('Failed to get focus time recommendations')
    } finally {
      setAiLoading(null)
    }
  }, [signalEnabled, selectedDate, currentProject?.id])
  
  // Block a focus time slot
  const handleBlockFocusTime = useCallback(async (slot) => {
    if (!signalEnabled) return
    try {
      await signalSyncApi.blockFocusTime({
        start: slot.start,
        end: slot.end,
        title: slot.title || 'Focus Time',
      })
      toast.success('Focus time blocked!')
      loadCalendarData() // Refresh calendar
      setShowAIPanel(null)
    } catch (err) {
      console.error('Failed to block focus time:', err)
      toast.error('Failed to block focus time')
    }
  }, [signalEnabled, loadCalendarData])
  
  // Get Meeting Prep for an event
  const loadMeetingPrep = useCallback(async (event) => {
    if (!signalEnabled || !event) return
    setAiLoading('prep')
    try {
      const result = await signalSyncApi.getMeetingPrep(event.sourceId || event.id, {
        projectId: currentProject?.id,
      })
      setMeetingPrep({ ...result.data || result, event })
      setShowAIPanel('prep')
      toast.success('Meeting prep loaded')
    } catch (err) {
      console.error('Failed to load meeting prep:', err)
      toast.error('Failed to load meeting prep')
    } finally {
      setAiLoading(null)
    }
  }, [signalEnabled, currentProject?.id])
  
  // Get event color type
  const getEventColor = (type) => {
    if (type === 'focus' || type === 'focus_block') return 'focus'
    if (type === 'meeting' || type === 'call') return 'meeting'
    if (type === 'task') return 'task'
    if (type === 'lunch' || type === 'break') return 'lunch'
    if (type === 'work' || type === 'project_work') return 'work'
    return 'default'
  }
  
  // Navigate dates
  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate)
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + direction)
    } else {
      newDate.setDate(newDate.getDate() + (direction * 7))
    }
    setSelectedDate(newDate)
  }
  
  const goToToday = () => setSelectedDate(new Date())
  
  // Handle click on calendar grid to create event at that time
  const handleGridClick = (date, hour) => {
    setSelectedDate(date)
    setCreateModalType('event')
    setShowCreateModal(true)
  }
  
  // Get events for a specific day
  const getEventsForDay = (date) => filteredEvents.filter(e => isSameDay(e.startTime, date))
  
  // Current time position for indicator
  const getCurrentTimePosition = () => {
    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()
    const startHour = 8
    const endHour = 20
    const totalHours = endHour - startHour
    const currentPosition = (hours - startHour) + (minutes / 60)
    return Math.max(0, Math.min(100, (currentPosition / totalHours) * 100))
  }

  return (
    <TooltipProvider>
      <div className={cn("h-[calc(100vh-120px)] flex flex-col bg-background overflow-hidden", className)}>
        {/* ===== TOP HEADER BAR ===== */}
        <div className="flex-shrink-0 h-14 border-b flex items-center justify-between px-4 bg-card/50">
          {/* Left: Branding + Date Navigation */}
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
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                <Calendar className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-lg hidden lg:inline">Sync</span>
              {signalEnabled && (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] px-1.5 hidden sm:flex">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI
                </Badge>
              )}
            </div>
            
            {/* Date Navigation */}
            <div className="flex items-center gap-2 ml-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={goToToday}
                className={cn(
                  "h-8 px-3",
                  isToday && "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                )}
              >
                Today
              </Button>
              <div className="flex items-center border rounded-md">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none rounded-l-md" onClick={() => navigateDate(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none rounded-r-md" onClick={() => navigateDate(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <span className="font-medium text-sm min-w-[180px]">
                {viewMode === 'week' 
                  ? `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  : selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                }
              </span>
            </div>
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Booking Links */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1.5 text-muted-foreground hidden md:flex"
              onClick={() => setShowBookingTypes(true)}
            >
              <Link2 className="h-4 w-4" />
              Booking links
            </Button>
            
            {/* View Bookings */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1.5 text-muted-foreground hidden md:flex"
              onClick={() => setShowBookingsList(true)}
            >
              <CalendarCheck className="h-4 w-4" />
              Bookings
            </Button>
            
            {/* Display Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hidden md:flex">
                  <Settings className="h-4 w-4" />
                  Display
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setShowLeftSidebar(!showLeftSidebar)}>
                  {showLeftSidebar ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {showLeftSidebar ? 'Hide' : 'Show'} left sidebar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowRightSidebar(!showRightSidebar)}>
                  {showRightSidebar ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {showRightSidebar ? 'Hide' : 'Show'} right sidebar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={loadCalendarData}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh calendar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Refresh (mobile) */}
            <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={loadCalendarData} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            
            {/* View Mode Toggle */}
            <div className="flex border rounded-md overflow-hidden">
              {[
                { id: 'day', label: 'Day', icon: CalendarDays },
                { id: 'week', label: 'Week', icon: LayoutGrid },
              ].map((mode) => (
                <Tooltip key={mode.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setViewMode(mode.id)}
                      className={cn(
                        "h-8 px-3 text-xs font-medium transition-colors flex items-center gap-1.5",
                        viewMode === mode.id 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <mode.icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{mode.label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{mode.label} view</TooltipContent>
                </Tooltip>
              ))}
            </div>
            
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
              <TooltipContent>{showRightSidebar ? 'Hide sidebar' : 'Show sidebar'}</TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        {/* ===== MAIN CONTENT AREA ===== */}
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
                    {/* Quick Actions */}
                    <div className="space-y-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button className="w-full justify-between gap-2 bg-emerald-600 hover:bg-emerald-700">
                            <span className="flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              Create
                            </span>
                            <ChevronDown className="h-4 w-4 opacity-70" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-52">
                          <DropdownMenuItem onClick={() => { setCreateModalType('event'); setShowCreateModal(true) }}>
                            <CalendarPlus className="h-4 w-4 mr-2" />
                            New Event
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setCreateModalType('focus'); setShowCreateModal(true) }}>
                            <Focus className="h-4 w-4 mr-2" />
                            Block Focus Time
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setCreateModalType('task'); setShowCreateModal(true) }}>
                            <CheckSquare className="h-4 w-4 mr-2" />
                            New Task
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setShowBookingTypes(true)}>
                            <Link2 className="h-4 w-4 mr-2" />
                            Manage Booking Types
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search events..." 
                        className="pl-8 h-9 text-sm bg-background"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    {/* Navigation */}
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Views</p>
                      {[
                        { icon: Calendar, label: 'Calendar', active: true, onClick: () => {} },
                        { icon: CalendarCheck, label: 'Bookings', badge: null, onClick: () => setShowBookingsList(true) },
                        { icon: Users, label: 'Hosts', onClick: () => setShowHostsPanel(true) },
                        { icon: Link2, label: 'Booking Types', onClick: () => setShowBookingTypes(true) },
                        { icon: CalendarOff, label: 'PTO & Holidays', onClick: () => setShowExceptionsPanel(true) },
                      ].map((item) => (
                        <button 
                          key={item.label}
                          onClick={item.onClick}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2.5 transition-colors",
                            item.active 
                              ? "bg-primary/10 text-primary font-medium" 
                              : "hover:bg-muted text-foreground"
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                          {item.badge && (
                            <Badge variant="secondary" className="ml-auto text-[10px] h-5 min-w-5 justify-center">
                              {item.badge}
                            </Badge>
                          )}
                        </button>
                      ))}
                    </div>
                    
                    {/* Current Project */}
                    {currentProject && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project</p>
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-muted/50">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span className="text-sm font-medium truncate">{currentProject.name || currentProject.title}</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Signal AI Features */}
                    {signalEnabled && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3 text-emerald-500" />
                          AI Features
                        </p>
                        <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 space-y-1">
                          <button 
                            onClick={loadFocusRecommendations}
                            disabled={aiLoading === 'focus'}
                            className="w-full text-left px-2 py-1.5 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                          >
                            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                              {aiLoading === 'focus' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Focus className="h-4 w-4" />}
                              <span className="text-sm font-medium">Auto Focus Time</span>
                            </div>
                          </button>
                          <button 
                            onClick={loadDailyBriefing}
                            disabled={aiLoading === 'briefing'}
                            className="w-full text-left px-2 py-1.5 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                          >
                            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                              {aiLoading === 'briefing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sun className="h-4 w-4" />}
                              <span className="text-sm font-medium">Daily Briefing</span>
                            </div>
                          </button>
                          <button 
                            onClick={() => {
                              // Get the next upcoming meeting
                              const upcomingMeetings = filteredEvents
                                .filter(e => e.type === 'meeting' && e.startTime > new Date())
                                .sort((a, b) => a.startTime - b.startTime)
                              if (upcomingMeetings.length > 0) {
                                loadMeetingPrep(upcomingMeetings[0])
                              } else {
                                toast.info('No upcoming meetings to prepare for')
                              }
                            }}
                            disabled={aiLoading === 'prep'}
                            className="w-full text-left px-2 py-1.5 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                          >
                            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                              {aiLoading === 'prep' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
                              <span className="text-sm font-medium">Meeting Prep</span>
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
          
          {/* ===== MAIN CALENDAR GRID ===== */}
          <div className="flex-1 overflow-auto bg-background">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Loading calendar...</p>
                </div>
              </div>
            ) : error ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-destructive">
                  <AlertCircle className="h-8 w-8 mx-auto mb-3" />
                  <p className="font-medium">Failed to load calendar</p>
                  <p className="text-sm text-muted-foreground mt-1">{error}</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={loadCalendarData}>
                    Try again
                  </Button>
                </div>
              </div>
            ) : viewMode === 'week' ? (
              // ===== WEEK VIEW =====
              <div className="h-full flex flex-col">
                {/* Day Headers */}
                <div className="flex-shrink-0 flex border-b bg-muted/30 sticky top-0 z-10">
                  <div className="w-[60px] flex-shrink-0 border-r" /> {/* Time column spacer */}
                  <div className="flex-1 grid grid-cols-7">
                    {weekDates.map((date, i) => {
                      const isCurrentDay = isSameDay(date, today)
                      return (
                        <div 
                          key={i}
                          className={cn(
                            "text-center py-3 border-r last:border-r-0",
                            isCurrentDay && "bg-emerald-50 dark:bg-emerald-500/5"
                          )}
                        >
                          <div className="text-xs text-muted-foreground font-medium mb-1">
                            {date.toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                          <div className={cn(
                            "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors",
                            isCurrentDay && "bg-emerald-500 text-white shadow-sm"
                          )}>
                            {date.getDate()}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                
                {/* Time Grid */}
                <div className="flex-1 flex flex-col relative">
                  {/* Current time indicator */}
                  {weekDates.some(d => isSameDay(d, today)) && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute h-0.5 bg-red-500 z-20 pointer-events-none"
                      style={{ top: `${getCurrentTimePosition()}%`, left: '60px', right: 0 }}
                    >
                      <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-500 shadow-sm" />
                    </motion.div>
                  )}
                  
                  {hours.map((hour) => (
                    <div key={hour} className="flex flex-1 min-h-[40px] border-b last:border-b-0">
                      {/* Time Label */}
                      <div className="w-[60px] flex-shrink-0 text-[11px] text-muted-foreground text-right pr-3 pt-0.5 border-r">
                        {formatHour(hour)}
                      </div>
                      
                      {/* Day Columns */}
                      <div className="flex-1 grid grid-cols-7">
                      {weekDates.map((date, dayIndex) => {
                        const isCurrentDay = isSameDay(date, today)
                        const hourEvents = events.filter(e => 
                          isSameDay(e.startTime, date) && 
                          e.startTime.getHours() === hour
                        )
                        
                        return (
                          <div 
                            key={dayIndex}
                            onClick={() => handleGridClick(date, hour)}
                            className={cn(
                              "border-r last:border-r-0 relative group cursor-pointer transition-colors",
                              isCurrentDay && "bg-emerald-50/50 dark:bg-emerald-500/5",
                              "hover:bg-muted/50"
                            )}
                          >
                            {/* Events - using percentage-based positioning */}
                            {hourEvents.map((event, eventIndex) => {
                              const colors = EVENT_COLORS[event.color] || EVENT_COLORS.default
                              const durationMinutes = (event.endTime - event.startTime) / (1000 * 60)
                              const heightPercent = Math.max(33, (durationMinutes / 60) * 100)
                              
                              return (
                                <motion.div
                                  key={event.id || eventIndex}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  whileHover={{ scale: 1.02 }}
                                  className={cn(
                                    "absolute left-0.5 right-0.5 rounded-md px-2 py-1 text-xs cursor-pointer overflow-hidden",
                                    "shadow-sm hover:shadow-md transition-shadow",
                                    colors.light
                                  )}
                                  style={{ 
                                    height: `${heightPercent}%`,
                                    top: `${(event.startTime.getMinutes() / 60) * 100}%`,
                                    borderLeft: `3px solid ${colors.accent}`,
                                  }}
                                >
                                  <div className={cn("font-medium truncate leading-tight", colors.text)}>
                                    {event.title}
                                  </div>
                                  {durationMinutes >= 30 && (
                                    <div className="text-[10px] text-muted-foreground mt-0.5">
                                      {formatTime(event.startTime)} – {formatTime(event.endTime)}
                                    </div>
                                  )}
                                  {event.attendees?.length > 0 && durationMinutes >= 45 && (
                                    <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
                                      <Users className="h-3 w-3" />
                                      {event.attendees.length}
                                    </div>
                                  )}
                                </motion.div>
                              )
                            })}
                            
                            {/* Add event on hover */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <Plus className="h-4 w-4 text-muted-foreground/50" />
                            </div>
                          </div>
                        )
                      })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // ===== DAY VIEW =====
              <div className="h-full flex flex-col">
                {hours.map((hour) => {
                  const hourEvents = events.filter(e => 
                    isSameDay(e.startTime, selectedDate) && 
                    e.startTime.getHours() === hour
                  )
                  
                  return (
                    <div key={hour} className="flex flex-1 min-h-[40px] border-b">
                      <div className="w-20 flex-shrink-0 text-xs text-muted-foreground text-right pr-4 pt-1">
                        {formatHour(hour)}
                      </div>
                      <div 
                        className="flex-1 relative border-l group hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => handleGridClick(selectedDate, hour)}
                      >
                        {hourEvents.map((event, i) => {
                          const colors = EVENT_COLORS[event.color] || EVENT_COLORS.default
                          const durationMinutes = (event.endTime - event.startTime) / (1000 * 60)
                          const heightPercent = Math.max(33, (durationMinutes / 60) * 100)
                          return (
                            <motion.div
                              key={event.id || i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className={cn(
                                "absolute left-2 right-2 rounded-md px-3 py-2 text-sm shadow-sm overflow-hidden",
                                colors.light
                              )}
                              style={{ 
                                borderLeft: `3px solid ${colors.accent}`,
                                height: `${heightPercent}%`,
                                top: `${(event.startTime.getMinutes() / 60) * 100}%`,
                              }}
                            >
                              <div className={cn("font-medium", colors.text)}>{event.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatTime(event.startTime)} – {formatTime(event.endTime)}
                              </div>
                            </motion.div>
                          )
                        })}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <Plus className="h-4 w-4 text-muted-foreground/50" />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          
          {/* ===== RIGHT SIDEBAR ===== */}
          <AnimatePresence>
            {showRightSidebar && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="flex-shrink-0 border-l overflow-hidden bg-muted/20"
              >
                <ScrollArea className="h-full">
                  {/* Mini Calendar */}
                  <MiniCalendar 
                    selectedDate={selectedDate} 
                    setSelectedDate={setSelectedDate} 
                    events={filteredEvents}
                  />
                  
                  {/* Calendar Sources */}
                  <div className="px-4 py-3 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sources</span>
                    </div>
                    <div className="space-y-3">
                      {/* Global Sources */}
                      <div className="space-y-2">
                        {calendarSources.map(source => {
                          const SourceIcon = source.icon
                          return (
                            <label key={source.id} className="flex items-center gap-2.5 cursor-pointer group">
                              <Checkbox 
                                checked={source.visible}
                                onCheckedChange={(checked) => {
                                  setCalendarSources(sources => sources.map(s => 
                                    s.id === source.id ? { ...s, visible: checked } : s
                                  ))
                                }}
                                className={cn(
                                  "border-2 transition-colors",
                                  source.color === 'rose' && "border-rose-500 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500",
                                  source.color === 'teal' && "border-teal-500 data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                                )}
                              />
                              <SourceIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm group-hover:text-foreground transition-colors">{source.name}</span>
                            </label>
                          )
                        })}
                      </div>

                      {/* Project Sources */}
                      {projectList.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Projects
                          </p>
                          <div className="space-y-2">
                            {projectList.map((project) => {
                              const isOpen = expandedProjects[project.id] ?? true
                              return (
                                <div key={project.id} className="rounded-md border bg-background/60">
                                  <button
                                    onClick={() =>
                                      setExpandedProjects((prev) => ({
                                        ...prev,
                                        [project.id]: !isOpen,
                                      }))
                                    }
                                    className="w-full flex items-center justify-between px-2.5 py-2 text-sm"
                                  >
                                    <span className="truncate">{project.name || project.title}</span>
                                    <ChevronDown className={cn("h-4 w-4 transition-transform", !isOpen && "-rotate-90")} />
                                  </button>
                                  {isOpen && (
                                    <div className="px-2.5 pb-2 space-y-2">
                                      {crmSources.map((source) => {
                                        const SourceIcon = source.icon
                                        const checked = projectSourceVisibility?.[project.id]?.[source.id] ?? true
                                        return (
                                          <label key={source.id} className="flex items-center gap-2.5 cursor-pointer group">
                                            <Checkbox
                                              checked={checked}
                                              onCheckedChange={(value) => {
                                                setProjectSourceVisibility((prev) => ({
                                                  ...prev,
                                                  [project.id]: {
                                                    ...prev[project.id],
                                                    [source.id]: !!value,
                                                  },
                                                }))
                                              }}
                                              className={cn(
                                                "border-2 transition-colors",
                                                source.color === 'amber' && "border-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500",
                                                source.color === 'violet' && "border-violet-500 data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
                                              )}
                                            />
                                            <SourceIcon className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm group-hover:text-foreground transition-colors">
                                              {source.name}
                                            </span>
                                          </label>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Accounts */}
                  <div className="px-4 py-3 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Accounts</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              // Find host for current user, or use first host
                              const userHost = hosts.find(h => h.email === user?.email) || hosts[0]
                              if (userHost) {
                                setShowCalendarConnections(userHost)
                              } else {
                                toast.info('Create a host first to connect calendars', {
                                  action: {
                                    label: 'Manage Hosts',
                                    onClick: () => setShowHostsPanel(true)
                                  }
                                })
                              }
                            }}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Connect calendar</TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="space-y-2">
                      {hosts.length === 0 ? (
                        <button
                          onClick={() => setShowHostsPanel(true)}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          Add a host to connect calendars
                        </button>
                      ) : (
                        hosts.map((host) => (
                          <div key={host.id} className="space-y-1.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                                <span className="text-white text-xs font-semibold">
                                  {host.name?.[0]?.toUpperCase() || host.email?.[0]?.toUpperCase() || 'U'}
                                </span>
                              </div>
                              <span className="text-sm truncate flex-1">{host.email || host.name}</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                    onClick={() => setShowCalendarConnections(host)}
                                  >
                                    <Link2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Manage calendars</TooltipContent>
                              </Tooltip>
                            </div>
                            {/* Show connected calendars if any */}
                            {host.connected_calendars?.length > 0 && (
                              <div className="ml-9 space-y-1">
                                {host.connected_calendars.map((cal) => (
                                  <div key={cal.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <div className={cn(
                                      "w-2 h-2 rounded-full",
                                      cal.provider === 'google' && "bg-red-500",
                                      cal.provider === 'outlook' && "bg-blue-500",
                                      cal.provider === 'apple' && "bg-gray-500"
                                    )} />
                                    <span className="truncate">{cal.name || cal.calendar_id}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  
                  {/* Today's Agenda */}
                  <div className="px-4 py-3 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Agenda
                      </span>
                      <Badge variant="secondary" className="text-[10px] h-5">
                        {isSameDay(selectedDate, today) ? 'Today' : selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {getEventsForDay(selectedDate).length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          No events scheduled
                        </p>
                      ) : (
                        getEventsForDay(selectedDate).slice(0, 6).map((event, i) => {
                          const colors = EVENT_COLORS[event.color] || EVENT_COLORS.default
                          return (
                            <motion.div 
                              key={event.id || i} 
                              className="flex items-start gap-2.5 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                              whileHover={{ x: 2 }}
                            >
                              <div 
                                className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" 
                                style={{ backgroundColor: colors.accent }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{event.title}</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatTime(event.startTime)} – {formatTime(event.endTime)}
                                </div>
                              </div>
                            </motion.div>
                          )
                        })
                      )}
                    </div>
                  </div>
                  
                  {/* Signal AI Insights */}
                  {signalEnabled && (
                    <div className="px-4 py-3 border-t">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Insights</span>
                      </div>
                      <div className="space-y-2">
                        <motion.div 
                          className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/20"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">📊 Schedule Analysis</p>
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                            You have 2.5 hours of focus time available this afternoon.
                          </p>
                        </motion.div>
                        <motion.div 
                          className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-500/20"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                        >
                          <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">⚡ Recommendation</p>
                          <p className="text-[11px] text-amber-600 dark:text-amber-400">
                            Block 2-4 PM for deep work — your most productive hours.
                          </p>
                        </motion.div>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* ===== MODALS ===== */}
        <CreateEventModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          initialType={createModalType}
          selectedDate={selectedDate}
          onCreated={loadCalendarData}
        />
        
        <BookingTypesPanel
          isOpen={showBookingTypes}
          onClose={() => setShowBookingTypes(false)}
        />
        
        <BookingsListPanel
          isOpen={showBookingsList}
          onClose={() => setShowBookingsList(false)}
        />
        
        <HostsPanel
          isOpen={showHostsPanel}
          onClose={() => setShowHostsPanel(false)}
        />
        
        <AvailabilityExceptionsPanel
          isOpen={showExceptionsPanel}
          onClose={() => setShowExceptionsPanel(false)}
          hosts={hosts}
        />
        
        <CalendarConnectionsPanel
          isOpen={!!showCalendarConnections}
          onClose={() => setShowCalendarConnections(null)}
          hostId={showCalendarConnections?.id}
          hostName={showCalendarConnections?.name || showCalendarConnections?.email}
        />
        
        {/* ===== AI PANEL MODALS ===== */}
        
        {/* Daily Briefing Modal */}
        <Dialog open={showAIPanel === 'briefing'} onOpenChange={() => setShowAIPanel(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Daily Briefing
              </DialogTitle>
              <DialogDescription>
                Your AI-generated overview for {format(selectedDate, 'EEEE, MMMM d')}
              </DialogDescription>
            </DialogHeader>
            
            {dailyBriefing ? (
              <div className="space-y-6 mt-4">
                {/* Summary */}
                {dailyBriefing.summary && (
                  <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-gray-700">{dailyBriefing.summary}</p>
                  </div>
                )}
                
                {/* Today's Focus */}
                {dailyBriefing.focus && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4 text-purple-500" />
                      Today's Focus
                    </h4>
                    <div className="space-y-2">
                      {(Array.isArray(dailyBriefing.focus) ? dailyBriefing.focus : [dailyBriefing.focus]).map((item, i) => (
                        <div key={i} className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                          <p className="text-sm text-gray-700">{typeof item === 'string' ? item : item.title || item.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Meetings */}
                {dailyBriefing.meetings?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Video className="h-4 w-4 text-blue-500" />
                      Meetings ({dailyBriefing.meetings.length})
                    </h4>
                    <div className="space-y-2">
                      {dailyBriefing.meetings.map((meeting, i) => (
                        <div key={i} className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{meeting.title}</p>
                            <p className="text-xs text-gray-500">{meeting.time || meeting.start}</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setShowAIPanel(null)
                              loadMeetingPrep(meeting)
                            }}
                          >
                            <Brain className="h-4 w-4 mr-1" />
                            Prep
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Tasks */}
                {dailyBriefing.tasks?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-green-500" />
                      Priority Tasks ({dailyBriefing.tasks.length})
                    </h4>
                    <div className="space-y-2">
                      {dailyBriefing.tasks.map((task, i) => (
                        <div key={i} className="p-3 bg-green-50 rounded-lg border border-green-100">
                          <p className="text-sm text-gray-700">{typeof task === 'string' ? task : task.title || task.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Insights */}
                {dailyBriefing.insights && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      AI Insights
                    </h4>
                    <p className="text-sm text-gray-600">{dailyBriefing.insights}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        {/* Focus Time Modal */}
        <Dialog open={showAIPanel === 'focus'} onOpenChange={() => setShowAIPanel(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Focus className="h-5 w-5 text-purple-500" />
                Focus Time Recommendations
              </DialogTitle>
              <DialogDescription>
                AI-optimized time blocks for deep work based on your schedule patterns
              </DialogDescription>
            </DialogHeader>
            
            {focusRecommendations ? (
              <div className="space-y-4 mt-4">
                {focusRecommendations.recommendations?.length > 0 ? (
                  focusRecommendations.recommendations.map((slot, i) => (
                    <div key={i} className="p-4 bg-purple-50 rounded-lg border border-purple-200 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {slot.start} - {slot.end}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {slot.reason || slot.description || 'Optimal focus window'}
                        </p>
                        {slot.score && (
                          <Badge variant="secondary" className="mt-2 text-xs">
                            {Math.round(slot.score * 100)}% optimal
                          </Badge>
                        )}
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => handleBlockFocusTime(slot)}
                        disabled={aiLoading === 'blocking'}
                      >
                        {aiLoading === 'blocking' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-1" />
                            Block
                          </>
                        )}
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No focus time recommendations available</p>
                    <p className="text-xs mt-1">Your calendar may be fully booked</p>
                  </div>
                )}
                
                {focusRecommendations.insights && (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 mt-4">
                    <p className="text-xs text-amber-800">
                      <Lightbulb className="h-3 w-3 inline mr-1" />
                      {focusRecommendations.insights}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        {/* Meeting Prep Modal */}
        <Dialog open={showAIPanel === 'prep'} onOpenChange={() => setShowAIPanel(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-500" />
                Meeting Prep
              </DialogTitle>
              <DialogDescription>
                AI-generated preparation notes for your meeting
              </DialogDescription>
            </DialogHeader>
            
            {meetingPrep ? (
              <div className="space-y-6 mt-4">
                {/* Meeting Info */}
                {meetingPrep.meeting && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-gray-900">{meetingPrep.meeting.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {meetingPrep.meeting.time || meetingPrep.meeting.start}
                    </p>
                    {meetingPrep.meeting.attendees && (
                      <p className="text-xs text-gray-500 mt-2">
                        With: {Array.isArray(meetingPrep.meeting.attendees) 
                          ? meetingPrep.meeting.attendees.join(', ') 
                          : meetingPrep.meeting.attendees}
                      </p>
                    )}
                  </div>
                )}
                
                {/* Agenda */}
                {meetingPrep.agenda && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      Suggested Agenda
                    </h4>
                    <div className="space-y-2">
                      {(Array.isArray(meetingPrep.agenda) ? meetingPrep.agenda : [meetingPrep.agenda]).map((item, i) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-start gap-3">
                          <span className="text-xs font-medium text-gray-400 mt-0.5">{i + 1}.</span>
                          <p className="text-sm text-gray-700">{typeof item === 'string' ? item : item.topic || item.title}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Key Points */}
                {meetingPrep.keyPoints && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      Key Points to Address
                    </h4>
                    <div className="space-y-2">
                      {(Array.isArray(meetingPrep.keyPoints) ? meetingPrep.keyPoints : [meetingPrep.keyPoints]).map((point, i) => (
                        <div key={i} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <p className="text-sm text-gray-700">{typeof point === 'string' ? point : point.point || point.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Context */}
                {meetingPrep.context && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <History className="h-4 w-4 text-purple-500" />
                      Background Context
                    </h4>
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-sm text-gray-700">{meetingPrep.context}</p>
                    </div>
                  </div>
                )}
                
                {/* Questions */}
                {meetingPrep.questions && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-blue-500" />
                      Questions to Ask
                    </h4>
                    <div className="space-y-2">
                      {(Array.isArray(meetingPrep.questions) ? meetingPrep.questions : [meetingPrep.questions]).map((q, i) => (
                        <div key={i} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <p className="text-sm text-gray-700">{typeof q === 'string' ? q : q.question}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
