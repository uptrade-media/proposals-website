// src/components/signal/sync/MeetingPrepCard.jsx
// AI-powered meeting preparation with attendee context and talking points
// Pre-meeting intelligence to make every meeting more effective

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Users,
  Video,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  Target,
  MessageSquare,
  Lightbulb,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  User,
  Building2,
  Globe,
  Mail,
  Briefcase,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { GlowCard, SignalLoader, SignalGradientText } from '../shared/SignalUI'

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MeetingPrepCard({ 
  meeting, 
  prep, 
  loading, 
  onSelectMeeting,
  upcomingMeetings = []
}) {
  const [expandedSection, setExpandedSection] = useState('talking-points')
  
  // If no meeting selected, show meeting selector
  if (!meeting) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-teal-500/20 border border-teal-500/30">
            <Brain className="h-6 w-6 text-teal-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold">
              <SignalGradientText>Meeting Prep</SignalGradientText>
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              AI-powered preparation for your meetings
            </p>
          </div>
        </div>
        
        {/* Meeting List */}
        {upcomingMeetings.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--text-muted)]">
              Select a meeting to generate AI prep:
            </p>
            <div className="grid gap-3">
              {upcomingMeetings.map((m, index) => (
                <motion.button
                  key={m.id || index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ x: 4 }}
                  onClick={() => onSelectMeeting?.(m)}
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
                      <div className="font-medium text-[var(--text-primary)] truncate">
                        {m.title}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-[var(--text-muted)]">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(m.start_time).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit' 
                          })}
                        </span>
                        {m.attendees?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {m.attendees.length}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-[var(--text-muted)]" />
                  </div>
                  {m.intent_category && (
                    <div className="mt-3 pt-3 border-t border-white/[0.04]">
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        <Target className="h-3 w-3 mr-1" />
                        {m.intent_category}
                      </Badge>
                      {m.intent_detail && (
                        <p className="text-xs text-[var(--text-muted)] mt-2">
                          {m.intent_detail}
                        </p>
                      )}
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-12 text-center rounded-xl bg-white/[0.02] border border-white/[0.06]"
          >
            <div className="p-4 rounded-full bg-teal-500/10 mb-4">
              <Calendar className="h-8 w-8 text-teal-400" />
            </div>
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
              No Upcoming Meetings
            </h3>
            <p className="text-[var(--text-secondary)] max-w-sm">
              Once you have meetings scheduled, we'll help you prepare with AI-powered context and talking points.
            </p>
          </motion.div>
        )}
      </div>
    )
  }
  
  // Loading state
  if (loading) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent border border-teal-500/20 p-8">
        <SignalLoader size="md" message="Generating meeting prep..." className="py-8" />
      </div>
    )
  }
  
  // Meeting prep view
  return (
    <div className="space-y-6">
      {/* Meeting Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl bg-gradient-to-br from-teal-500/20 via-teal-500/10 to-transparent border border-teal-500/20"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="p-3 rounded-xl bg-teal-500/20 border border-teal-500/30"
            >
              <Video className="h-6 w-6 text-teal-400" />
            </motion.div>
            <div>
              <h3 className="text-xl font-bold text-[var(--text-primary)]">
                {meeting.title}
              </h3>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-[var(--text-secondary)]">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {new Date(meeting.start_time).toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit' 
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(meeting.start_time).toLocaleDateString('en-US', { 
                    weekday: 'short',
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
                {meeting.attendees?.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {meeting.attendees.length} attendees
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectMeeting?.(null)}
            className="text-[var(--text-muted)]"
          >
            Change
          </Button>
        </div>
        
        {/* Intent Context */}
        {(meeting.intent_category || prep?.context?.intent) && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-start gap-2">
              <Target className="h-4 w-4 text-emerald-400 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-emerald-400">
                  Meeting Intent: {meeting.intent_category || prep?.context?.intent?.category}
                </div>
                {(meeting.intent_detail || prep?.context?.intent?.detail) && (
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    {meeting.intent_detail || prep?.context?.intent?.detail}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
      
      {/* AI Summary */}
      {prep?.summary && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/20">
              <Brain className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-[var(--text-primary)] mb-1">
                AI Briefing
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {prep.summary}
              </p>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Prep Sections */}
      <div className="space-y-3">
        {/* Talking Points */}
        {prep?.talkingPoints && prep.talkingPoints.length > 0 && (
          <PrepSection
            title="Talking Points"
            icon={MessageSquare}
            color="teal"
            expanded={expandedSection === 'talking-points'}
            onToggle={() => setExpandedSection(expandedSection === 'talking-points' ? null : 'talking-points')}
          >
            <div className="space-y-3">
              {prep.talkingPoints.map((point, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-teal-500/5 border border-teal-500/10"
                >
                  <div className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-teal-400">{index + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-primary)]">{point.point}</p>
                    {point.context && (
                      <p className="text-xs text-[var(--text-muted)] mt-1">{point.context}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </PrepSection>
        )}
        
        {/* Attendees */}
        {prep?.attendees && prep.attendees.length > 0 && (
          <PrepSection
            title="Attendee Context"
            icon={Users}
            color="purple"
            expanded={expandedSection === 'attendees'}
            onToggle={() => setExpandedSection(expandedSection === 'attendees' ? null : 'attendees')}
          >
            <div className="space-y-3">
              {prep.attendees.map((attendee, index) => (
                <AttendeeCard key={index} attendee={attendee} />
              ))}
            </div>
          </PrepSection>
        )}
        
        {/* Key Questions */}
        {prep?.questions && prep.questions.length > 0 && (
          <PrepSection
            title="Questions to Ask"
            icon={Lightbulb}
            color="amber"
            expanded={expandedSection === 'questions'}
            onToggle={() => setExpandedSection(expandedSection === 'questions' ? null : 'questions')}
          >
            <div className="space-y-2">
              {prep.questions.map((q, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/5"
                >
                  <Zap className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-[var(--text-primary)]">{q}</p>
                </motion.div>
              ))}
            </div>
          </PrepSection>
        )}
        
        {/* Background Context */}
        {prep?.context?.history && prep.context.history.length > 0 && (
          <PrepSection
            title="Relationship History"
            icon={FileText}
            color="emerald"
            expanded={expandedSection === 'history'}
            onToggle={() => setExpandedSection(expandedSection === 'history' ? null : 'history')}
          >
            <div className="space-y-2">
              {prep.context.history.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10"
                >
                  <div className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                    {item.date}
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">{item.note}</p>
                </motion.div>
              ))}
            </div>
          </PrepSection>
        )}
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          className="flex-1 bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06]"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Join Meeting
        </Button>
        <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500">
          <CheckCircle className="h-4 w-4 mr-2" />
          Mark Ready
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// PREP SECTION
// ============================================================================

function PrepSection({ title, icon: Icon, color, expanded, onToggle, children }) {
  const colors = {
    emerald: 'bg-emerald-500/20 border-emerald-500/20 text-emerald-400',
    teal: 'bg-teal-500/20 border-teal-500/20 text-teal-400',
    amber: 'bg-amber-500/20 border-amber-500/20 text-amber-400',
    purple: 'bg-purple-500/20 border-purple-500/20 text-purple-400',
  }
  
  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg border", colors[color])}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="font-medium text-[var(--text-primary)]">{title}</span>
        </div>
        <ChevronDown className={cn(
          "h-5 w-5 text-[var(--text-muted)] transition-transform duration-200",
          expanded && "rotate-180"
        )} />
      </button>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 border-t border-white/[0.04]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// ATTENDEE CARD
// ============================================================================

function AttendeeCard({ attendee }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-purple-500/5 border border-purple-500/20"
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 border border-purple-500/20">
          <AvatarImage src={attendee.avatar} />
          <AvatarFallback className="bg-purple-500/20 text-purple-400 text-sm">
            {attendee.name?.split(' ').map(n => n[0]).join('') || '?'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--text-primary)]">
              {attendee.name}
            </span>
            {attendee.isHost && (
              <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/20">
                Host
              </Badge>
            )}
          </div>
          
          {attendee.title && (
            <div className="flex items-center gap-1 mt-1 text-sm text-[var(--text-muted)]">
              <Briefcase className="h-3.5 w-3.5" />
              {attendee.title}
              {attendee.company && ` at ${attendee.company}`}
            </div>
          )}
          
          {attendee.context && (
            <p className="text-sm text-[var(--text-secondary)] mt-2 p-2 rounded bg-white/[0.03]">
              {attendee.context}
            </p>
          )}
          
          {attendee.recentInteractions && (
            <div className="mt-2 text-xs text-[var(--text-muted)]">
              <span className="text-purple-400">{attendee.recentInteractions}</span> recent interactions
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
