/**
 * ProspectTimeline - Message-thread style unified timeline
 * Displays all interactions with a prospect in a chat-like format
 * 
 * Direction:
 * - "inbound" (left bubble): Things prospect did (calls to us, form submissions, page visits)
 * - "outbound" (right bubble): Things we did (calls to them, emails sent, proposals sent)
 */
import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Mail,
  MailOpen,
  Send,
  FileText,
  Receipt,
  Globe,
  MousePointerClick,
  MessageSquare,
  GitBranch,
  Clock,
  CheckSquare,
  UserCheck,
  FileSearch,
  Sparkles,
  Eye,
  Activity,
  Loader2,
  ChevronDown,
  Filter,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { GlassCard, GlassEmptyState, SentimentBadge } from './ui'

// Timeline event type configuration
const EVENT_CONFIG = {
  // Inbound events (prospect's actions) - left side
  call_inbound: {
    icon: PhoneIncoming,
    label: 'Incoming Call',
    direction: 'inbound',
    bgColor: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
    bubbleColor: 'bg-gray-100 dark:bg-gray-800'
  },
  email_received: {
    icon: MailOpen,
    label: 'Email Received',
    direction: 'inbound',
    bgColor: 'bg-purple-500/10',
    iconColor: 'text-purple-500',
    bubbleColor: 'bg-gray-100 dark:bg-gray-800'
  },
  form_submission: {
    icon: FileText,
    label: 'Form Submitted',
    direction: 'inbound',
    bgColor: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
    bubbleColor: 'bg-gray-100 dark:bg-gray-800'
  },
  page_view: {
    icon: Eye,
    label: 'Page View',
    direction: 'inbound',
    bgColor: 'bg-gray-500/10',
    iconColor: 'text-gray-500',
    bubbleColor: 'bg-gray-100 dark:bg-gray-800'
  },
  chat_started: {
    icon: MessageSquare,
    label: 'Chat Started',
    direction: 'inbound',
    bgColor: 'bg-teal-500/10',
    iconColor: 'text-teal-500',
    bubbleColor: 'bg-gray-100 dark:bg-gray-800'
  },
  
  // Outbound events (our actions) - right side
  call_outbound: {
    icon: PhoneOutgoing,
    label: 'Outgoing Call',
    direction: 'outbound',
    bgColor: 'bg-[#4bbf39]/10',
    iconColor: 'text-[#4bbf39]',
    bubbleColor: 'bg-[#4bbf39] text-white'
  },
  email_sent: {
    icon: Send,
    label: 'Email Sent',
    direction: 'outbound',
    bgColor: 'bg-[#39bfb0]/10',
    iconColor: 'text-[#39bfb0]',
    bubbleColor: 'bg-[#39bfb0] text-white'
  },
  proposal_sent: {
    icon: FileText,
    label: 'Proposal Sent',
    direction: 'outbound',
    bgColor: 'bg-[#4bbf39]/10',
    iconColor: 'text-[#4bbf39]',
    bubbleColor: 'bg-[#4bbf39] text-white'
  },
  proposal_accepted: {
    icon: FileText,
    label: 'Proposal Accepted',
    direction: 'inbound',
    bgColor: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
    bubbleColor: 'bg-emerald-100 dark:bg-emerald-900'
  },
  invoice_sent: {
    icon: Receipt,
    label: 'Invoice Sent',
    direction: 'outbound',
    bgColor: 'bg-amber-500/10',
    iconColor: 'text-amber-500',
    bubbleColor: 'bg-amber-500 text-white'
  },
  invoice_paid: {
    icon: Receipt,
    label: 'Invoice Paid',
    direction: 'inbound',
    bgColor: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
    bubbleColor: 'bg-emerald-100 dark:bg-emerald-900'
  },
  audit_sent: {
    icon: FileSearch,
    label: 'Audit Sent',
    direction: 'outbound',
    bgColor: 'bg-[#39bfb0]/10',
    iconColor: 'text-[#39bfb0]',
    bubbleColor: 'bg-[#39bfb0] text-white'
  },
  audit_viewed: {
    icon: Eye,
    label: 'Audit Viewed',
    direction: 'inbound',
    bgColor: 'bg-purple-500/10',
    iconColor: 'text-purple-500',
    bubbleColor: 'bg-gray-100 dark:bg-gray-800'
  },
  
  // System/status events - centered
  stage_change: {
    icon: GitBranch,
    label: 'Stage Changed',
    direction: 'system',
    bgColor: 'bg-[#39bfb0]/10',
    iconColor: 'text-[#39bfb0]',
    bubbleColor: 'bg-[var(--glass-bg)] border border-[var(--glass-border)]'
  },
  note: {
    icon: MessageSquare,
    label: 'Note Added',
    direction: 'outbound',
    bgColor: 'bg-gray-500/10',
    iconColor: 'text-gray-500',
    bubbleColor: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-100'
  },
  task_created: {
    icon: CheckSquare,
    label: 'Task Created',
    direction: 'system',
    bgColor: 'bg-amber-500/10',
    iconColor: 'text-amber-500',
    bubbleColor: 'bg-[var(--glass-bg)] border border-[var(--glass-border)]'
  },
  task_completed: {
    icon: CheckSquare,
    label: 'Task Completed',
    direction: 'system',
    bgColor: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
    bubbleColor: 'bg-[var(--glass-bg)] border border-[var(--glass-border)]'
  },
  converted: {
    icon: UserCheck,
    label: 'Converted to Client',
    direction: 'system',
    bgColor: 'bg-[#4bbf39]/10',
    iconColor: 'text-[#4bbf39]',
    bubbleColor: 'bg-[#4bbf39]/10 border border-[#4bbf39]/30'
  },
  
  // Default fallback
  default: {
    icon: Activity,
    label: 'Activity',
    direction: 'system',
    bgColor: 'bg-gray-500/10',
    iconColor: 'text-gray-500',
    bubbleColor: 'bg-[var(--glass-bg)] border border-[var(--glass-border)]'
  }
}

// Format relative time
function formatRelativeTime(date) {
  if (!date) return ''
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
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Format duration
function formatDuration(seconds) {
  if (!seconds) return null
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
}

// Single timeline event bubble
function TimelineBubble({ event, isLast }) {
  const config = EVENT_CONFIG[event.event_type] || EVENT_CONFIG.default
  const Icon = config.icon
  const isOutbound = config.direction === 'outbound'
  const isSystem = config.direction === 'system'
  
  // System events are centered
  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs',
          config.bubbleColor
        )}>
          <Icon className={cn('h-3.5 w-3.5', config.iconColor)} />
          <span className="text-[var(--text-secondary)]">{event.title}</span>
          <span className="text-[var(--text-tertiary)]">•</span>
          <span className="text-[var(--text-tertiary)]">{formatRelativeTime(event.event_time)}</span>
        </div>
      </div>
    )
  }
  
  return (
    <div className={cn(
      'flex gap-3 mb-4',
      isOutbound ? 'flex-row-reverse' : 'flex-row'
    )}>
      {/* Avatar/Icon */}
      <div className={cn(
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
        config.bgColor
      )}>
        <Icon className={cn('h-4 w-4', config.iconColor)} />
      </div>
      
      {/* Bubble */}
      <div className={cn(
        'max-w-[70%] rounded-2xl px-4 py-3',
        config.bubbleColor,
        isOutbound ? 'rounded-tr-md' : 'rounded-tl-md'
      )}>
        {/* Header */}
        <div className={cn(
          'flex items-center gap-2 mb-1',
          isOutbound ? 'flex-row-reverse' : 'flex-row'
        )}>
          <span className={cn(
            'text-xs font-medium',
            isOutbound ? 'text-white/90' : 'text-[var(--text-secondary)]'
          )}>
            {config.label}
          </span>
          {event.created_by_name && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {event.created_by_name}
            </Badge>
          )}
        </div>
        
        {/* Title */}
        <p className={cn(
          'text-sm font-medium',
          isOutbound ? 'text-white' : 'text-[var(--text-primary)]'
        )}>
          {event.title}
        </p>
        
        {/* Description */}
        {event.description && (
          <p className={cn(
            'text-sm mt-1',
            isOutbound ? 'text-white/80' : 'text-[var(--text-secondary)]'
          )}>
            {event.description}
          </p>
        )}
        
        {/* Metadata */}
        <div className={cn(
          'flex items-center gap-2 mt-2 text-xs',
          isOutbound ? 'text-white/60 flex-row-reverse' : 'text-[var(--text-tertiary)]'
        )}>
          <span>{formatRelativeTime(event.event_time)}</span>
          
          {/* Call duration */}
          {event.metadata?.duration && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(event.metadata.duration)}
              </span>
            </>
          )}
          
          {/* Sentiment */}
          {event.metadata?.sentiment && (
            <>
              <span>•</span>
              <SentimentBadge sentiment={event.metadata.sentiment} size="xs" />
            </>
          )}
          
          {/* Amount for invoices */}
          {event.metadata?.amount && (
            <>
              <span>•</span>
              <span className="font-medium">
                ${event.metadata.amount.toLocaleString()}
              </span>
            </>
          )}
          
          {/* Page URL for visits */}
          {event.metadata?.page_url && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1 cursor-help">
                  <Globe className="h-3 w-3" />
                  {new URL(event.metadata.page_url).pathname}
                </span>
              </TooltipTrigger>
              <TooltipContent>{event.metadata.page_url}</TooltipContent>
            </Tooltip>
          )}
        </div>
        
        {/* Call summary if available */}
        {event.metadata?.ai_summary && (
          <div className={cn(
            'mt-3 pt-3 border-t',
            isOutbound ? 'border-white/20' : 'border-[var(--glass-border)]'
          )}>
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className={cn(
                'h-3 w-3',
                isOutbound ? 'text-white/60' : 'text-[#4bbf39]'
              )} />
              <span className={cn(
                'text-xs font-medium',
                isOutbound ? 'text-white/60' : 'text-[var(--text-tertiary)]'
              )}>
                AI Summary
              </span>
            </div>
            <p className={cn(
              'text-xs',
              isOutbound ? 'text-white/80' : 'text-[var(--text-secondary)]'
            )}>
              {event.metadata.ai_summary}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// Date separator
function DateSeparator({ date }) {
  const d = new Date(date)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  let label
  if (d.toDateString() === today.toDateString()) {
    label = 'Today'
  } else if (d.toDateString() === yesterday.toDateString()) {
    label = 'Yesterday'
  } else {
    label = d.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'short', 
      day: 'numeric',
      year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    })
  }
  
  return (
    <div className="flex items-center gap-4 my-6">
      <div className="flex-1 h-px bg-[var(--glass-border)]" />
      <span className="text-xs font-medium text-[var(--text-tertiary)] px-2">
        {label}
      </span>
      <div className="flex-1 h-px bg-[var(--glass-border)]" />
    </div>
  )
}

// Main component
export default function ProspectTimeline({
  prospectId,
  contactId, // If converted, use contact ID
  events = [],
  isLoading = false,
  error = null,
  onLoadMore,
  hasMore = false,
  attribution = null, // Lead attribution data
  className
}) {
  const [typeFilters, setTypeFilters] = useState([])
  const scrollRef = useRef(null)
  
  // Toggle type filter
  const toggleFilter = (type) => {
    setTypeFilters(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }
  
  // Filter events
  const filteredEvents = typeFilters.length === 0 
    ? events 
    : events.filter(e => typeFilters.includes(e.event_type))
  
  // Group events by date
  const groupedEvents = filteredEvents.reduce((groups, event) => {
    const date = new Date(event.event_time).toDateString()
    if (!groups[date]) groups[date] = []
    groups[date].push(event)
    return groups
  }, {})
  
  // Sort dates descending (most recent first)
  const sortedDates = Object.keys(groupedEvents).sort((a, b) => 
    new Date(b) - new Date(a)
  )
  
  // Get unique event types for filter
  const eventTypes = [...new Set(events.map(e => e.event_type))]
  
  if (error) {
    return (
      <GlassCard className={className}>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">Failed to load timeline</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">{error}</p>
        </div>
      </GlassCard>
    )
  }
  
  if (isLoading && events.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-primary)]" />
      </div>
    )
  }
  
  if (events.length === 0) {
    return (
      <GlassEmptyState
        icon={Activity}
        title="No activity yet"
        description="Interactions with this prospect will appear here as they happen"
        size="md"
        className={className}
      />
    )
  }
  
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Lead Attribution Header */}
      {attribution && (
        <div className="mb-4 p-3 rounded-xl bg-[var(--glass-bg-inset)] border border-[var(--glass-border)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">First Touch</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {attribution.first_touch_source || 'Unknown'}
                {attribution.first_touch_medium && (
                  <span className="text-[var(--text-secondary)]"> / {attribution.first_touch_medium}</span>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--text-tertiary)]">Last Touch</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {attribution.last_touch_source || 'Unknown'}
                {attribution.last_touch_medium && (
                  <span className="text-[var(--text-secondary)]"> / {attribution.last_touch_medium}</span>
                )}
              </p>
            </div>
          </div>
          {attribution.first_touch_campaign && (
            <div className="mt-2 pt-2 border-t border-[var(--glass-border)]">
              <Badge variant="outline" className="text-xs">
                Campaign: {attribution.first_touch_campaign}
              </Badge>
            </div>
          )}
        </div>
      )}
      
      {/* Filter Bar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-[var(--text-tertiary)]">
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
        </p>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              Filter
              {typeFilters.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                  {typeFilters.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Event Types</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {eventTypes.map(type => {
              const config = EVENT_CONFIG[type] || EVENT_CONFIG.default
              const Icon = config.icon
              return (
                <DropdownMenuCheckboxItem
                  key={type}
                  checked={typeFilters.includes(type)}
                  onCheckedChange={() => toggleFilter(type)}
                >
                  <Icon className={cn('h-3.5 w-3.5 mr-2', config.iconColor)} />
                  {config.label}
                </DropdownMenuCheckboxItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Timeline */}
      <ScrollArea ref={scrollRef} className="flex-1 pr-4">
        <div className="space-y-1">
          {sortedDates.map((date, dateIndex) => (
            <div key={date}>
              <DateSeparator date={date} />
              {groupedEvents[date].map((event, eventIndex) => (
                <TimelineBubble
                  key={event.id}
                  event={event}
                  isLast={dateIndex === sortedDates.length - 1 && 
                          eventIndex === groupedEvents[date].length - 1}
                />
              ))}
            </div>
          ))}
          
          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-4 pb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onLoadMore}
                disabled={isLoading}
                className="text-xs gap-1.5"
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                Load older activity
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
