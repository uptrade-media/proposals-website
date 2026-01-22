// src/components/signal/sync/CalendarOverview.jsx
// Day view calendar with meetings, focus blocks, and availability
// Premium visual design with timeline and event cards

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  Clock,
  Video,
  Users,
  Phone,
  MapPin,
  Focus,
  Coffee,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Briefcase,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { GlowCard } from '../shared/SignalUI'

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CalendarOverview({ data, date, onMeetingSelect }) {
  const [hoveredEvent, setHoveredEvent] = useState(null)
  
  // Parse events into timeline format
  const timelineEvents = useMemo(() => {
    if (!data?.events) return []
    
    return data.events.map(event => ({
      ...event,
      startHour: new Date(event.start_time).getHours(),
      startMinute: new Date(event.start_time).getMinutes(),
      endHour: new Date(event.end_time).getHours(),
      endMinute: new Date(event.end_time).getMinutes(),
    })).sort((a, b) => a.startHour - b.startHour || a.startMinute - b.startMinute)
  }, [data?.events])
  
  // Business hours for timeline
  const hours = Array.from({ length: 12 }, (_, i) => i + 8) // 8 AM to 7 PM
  
  // Current time indicator
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const isToday = date.toDateString() === now.toDateString()
  
  // Get event type config
  const getEventConfig = (type) => {
    switch (type) {
      case 'meeting':
        return {
          icon: Video,
          bg: 'bg-teal-500/20',
          border: 'border-teal-500/30',
          text: 'text-teal-400',
          gradient: 'from-teal-500/20 to-teal-500/5'
        }
      case 'focus':
        return {
          icon: Focus,
          bg: 'bg-emerald-500/20',
          border: 'border-emerald-500/30',
          text: 'text-emerald-400',
          gradient: 'from-emerald-500/20 to-emerald-500/5'
        }
      case 'break':
        return {
          icon: Coffee,
          bg: 'bg-amber-500/20',
          border: 'border-amber-500/30',
          text: 'text-amber-400',
          gradient: 'from-amber-500/20 to-amber-500/5'
        }
      case 'work':
        return {
          icon: Briefcase,
          bg: 'bg-purple-500/20',
          border: 'border-purple-500/30',
          text: 'text-purple-400',
          gradient: 'from-purple-500/20 to-purple-500/5'
        }
      default:
        return {
          icon: Calendar,
          bg: 'bg-gray-500/20',
          border: 'border-gray-500/30',
          text: 'text-gray-400',
          gradient: 'from-gray-500/20 to-gray-500/5'
        }
    }
  }
  
  // Format time
  const formatTime = (hour, minute = 0) => {
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    const displayMinute = minute.toString().padStart(2, '0')
    return minute > 0 ? `${displayHour}:${displayMinute} ${ampm}` : `${displayHour} ${ampm}`
  }

  return (
    <div className="space-y-6">
      {/* Availability Summary */}
      {data?.availability && (
        <div className="grid grid-cols-3 gap-4">
          <SummaryCard
            label="Total Scheduled"
            value={`${data.availability.totalScheduled || 0}h`}
            icon={Calendar}
            color="teal"
          />
          <SummaryCard
            label="Available"
            value={`${data.availability.totalAvailable || 0}h`}
            icon={Clock}
            color="emerald"
          />
          <SummaryCard
            label="Focus Blocks"
            value={data.availability.focusBlocks || 0}
            icon={Focus}
            color="purple"
          />
        </div>
      )}
      
      {/* Timeline View */}
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-[var(--text-secondary)]">
            {date.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
          <Badge variant="outline" className="bg-white/5 border-white/10 text-xs">
            {timelineEvents.length} events
          </Badge>
        </div>
        
        {/* Timeline */}
        <div className="relative bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden">
          {/* Time grid */}
          <div className="relative">
            {hours.map((hour, index) => (
              <div key={hour} className="relative">
                {/* Hour row */}
                <div className="flex items-stretch min-h-[60px] border-b border-white/[0.04]">
                  {/* Time label */}
                  <div className="w-20 flex-shrink-0 px-3 py-2 text-xs text-[var(--text-muted)] border-r border-white/[0.04]">
                    {formatTime(hour)}
                  </div>
                  
                  {/* Event area */}
                  <div className="flex-1 relative">
                    {/* Events for this hour */}
                    {timelineEvents
                      .filter(event => event.startHour === hour)
                      .map((event, eventIndex) => {
                        const config = getEventConfig(event.type || 'meeting')
                        const Icon = config.icon
                        const durationMinutes = (event.endHour - event.startHour) * 60 + (event.endMinute - event.startMinute)
                        const height = Math.max(56, (durationMinutes / 60) * 60 - 4)
                        const topOffset = (event.startMinute / 60) * 60
                        
                        return (
                          <motion.div
                            key={event.id || eventIndex}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: eventIndex * 0.1 }}
                            style={{ 
                              height: `${height}px`,
                              top: `${topOffset}px`,
                            }}
                            className={cn(
                              "absolute left-2 right-2 rounded-lg p-3 cursor-pointer",
                              "bg-gradient-to-r border backdrop-blur-sm",
                              "transition-all duration-200 hover:scale-[1.01] hover:shadow-lg",
                              config.gradient,
                              config.border,
                              event.id === hoveredEvent && "ring-2 ring-white/20"
                            )}
                            onMouseEnter={() => setHoveredEvent(event.id)}
                            onMouseLeave={() => setHoveredEvent(null)}
                            onClick={() => event.type === 'meeting' && onMeetingSelect?.(event)}
                          >
                            <div className="flex items-start gap-2 h-full">
                              <div className={cn("p-1.5 rounded-md", config.bg)}>
                                <Icon className={cn("h-3.5 w-3.5", config.text)} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                                    {event.title}
                                  </span>
                                  {event.intent_category && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white/5">
                                      {event.intent_category}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-muted)]">
                                  <span>
                                    {formatTime(event.startHour, event.startMinute)} - {formatTime(event.endHour, event.endMinute)}
                                  </span>
                                  {event.attendees?.length > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      {event.attendees.length}
                                    </span>
                                  )}
                                </div>
                                {event.intent_detail && height > 80 && (
                                  <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-1">
                                    {event.intent_detail}
                                  </p>
                                )}
                              </div>
                              {event.type === 'meeting' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </motion.div>
                        )
                      })}
                    
                    {/* Current time indicator */}
                    {isToday && hour === currentHour && (
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-orange-500 shadow-lg shadow-red-500/50"
                        style={{ top: `${(currentMinute / 60) * 60}px` }}
                      >
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Upcoming Meetings */}
      {timelineEvents.filter(e => e.type === 'meeting').length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-[var(--text-secondary)]">
            Upcoming Meetings
          </h3>
          <div className="grid gap-3">
            {timelineEvents
              .filter(e => e.type === 'meeting')
              .slice(0, 3)
              .map((meeting, index) => (
                <MeetingCard
                  key={meeting.id || index}
                  meeting={meeting}
                  onClick={() => onMeetingSelect?.(meeting)}
                />
              ))}
          </div>
        </div>
      )}
      
      {/* Empty state */}
      {timelineEvents.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-12 text-center"
        >
          <div className="p-4 rounded-full bg-emerald-500/10 mb-4">
            <Calendar className="h-8 w-8 text-emerald-400" />
          </div>
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
            Clear Schedule
          </h3>
          <p className="text-[var(--text-secondary)] max-w-sm">
            No events scheduled for this day. Perfect time for deep work or planning.
          </p>
        </motion.div>
      )}
    </div>
  )
}

// ============================================================================
// SUMMARY CARD
// ============================================================================

function SummaryCard({ label, value, icon: Icon, color = 'emerald' }) {
  const colors = {
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
    teal: 'from-teal-500/20 to-teal-500/5 border-teal-500/20 text-teal-400',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-400',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400',
  }
  
  return (
    <div className={cn(
      "p-4 rounded-xl bg-gradient-to-br border backdrop-blur-sm",
      colors[color]
    )}>
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5" />
        <div>
          <div className="text-xl font-bold">{value}</div>
          <div className="text-xs text-[var(--text-muted)]">{label}</div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MEETING CARD
// ============================================================================

function MeetingCard({ meeting, onClick }) {
  const hasPrep = meeting.has_prep || meeting.intent_category
  
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 4 }}
      className={cn(
        "w-full p-4 rounded-xl text-left",
        "bg-gradient-to-r from-white/[0.04] to-white/[0.02]",
        "border border-white/[0.08] hover:border-teal-500/30",
        "transition-all duration-200"
      )}
    >
      <div className="flex items-center gap-4">
        <div className="p-2.5 rounded-lg bg-teal-500/20 border border-teal-500/20">
          <Video className="h-4 w-4 text-teal-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--text-primary)] truncate">
              {meeting.title}
            </span>
            {hasPrep && (
              <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">
                <Sparkles className="h-2.5 w-2.5 mr-1" />
                Prep Ready
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {new Date(meeting.start_time).toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit' 
              })}
            </span>
            {meeting.attendees?.length > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {meeting.attendees.length} attendees
              </span>
            )}
          </div>
        </div>
        
        <ChevronRight className="h-5 w-5 text-[var(--text-muted)]" />
      </div>
    </motion.button>
  )
}
