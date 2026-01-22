// src/components/signal/sync/DailyBriefing.jsx
// AI-generated daily briefing with priorities, prep notes, and recommendations
// Morning dashboard feel with neural aesthetic

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sun,
  Moon,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Sparkles,
  Brain,
  TrendingUp,
  Users,
  Briefcase,
  Coffee,
  Focus,
  ChevronRight,
  RefreshCw,
  Zap,
  Star
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { GlowCard, SignalGradientText, StreamingText } from '../shared/SignalUI'

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DailyBriefing({ data, onRefresh, loading }) {
  const [expandedSection, setExpandedSection] = useState(null)
  
  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return { text: 'Good morning', icon: Sun, color: 'amber' }
    if (hour < 17) return { text: 'Good afternoon', icon: Sun, color: 'orange' }
    return { text: 'Good evening', icon: Moon, color: 'purple' }
  }
  
  const greeting = getGreeting()
  const GreetingIcon = greeting.icon
  
  // Priority level config
  const getPriorityConfig = (priority) => {
    switch (priority) {
      case 'critical':
        return { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-400', label: 'Critical' }
      case 'high':
        return { bg: 'bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-400', label: 'High' }
      case 'medium':
        return { bg: 'bg-teal-500/20', border: 'border-teal-500/30', text: 'text-teal-400', label: 'Medium' }
      default:
        return { bg: 'bg-gray-500/20', border: 'border-gray-500/30', text: 'text-gray-400', label: 'Normal' }
    }
  }

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl"
      >
        {/* Background gradient */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-50",
          greeting.color === 'amber' && "from-amber-500/30 via-orange-500/20 to-yellow-500/10",
          greeting.color === 'orange' && "from-orange-500/30 via-amber-500/20 to-yellow-500/10",
          greeting.color === 'purple' && "from-purple-500/30 via-indigo-500/20 to-blue-500/10"
        )} />
        
        <div className="relative p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className={cn(
                  "p-3 rounded-xl",
                  greeting.color === 'amber' && "bg-amber-500/20 border border-amber-500/30",
                  greeting.color === 'orange' && "bg-orange-500/20 border border-orange-500/30",
                  greeting.color === 'purple' && "bg-purple-500/20 border border-purple-500/30"
                )}
              >
                <GreetingIcon className={cn(
                  "h-6 w-6",
                  greeting.color === 'amber' && "text-amber-400",
                  greeting.color === 'orange' && "text-orange-400",
                  greeting.color === 'purple' && "text-purple-400"
                )} />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                  {greeting.text}
                </h2>
                <p className="text-[var(--text-secondary)] mt-1">
                  Here's your AI-powered briefing for today
                </p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={loading}
              className="shrink-0"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
          
          {/* AI Summary */}
          {data?.summary && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/20">
                  <Brain className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                    {data.summary}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
      
      {/* Day at a Glance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlanceCard
          icon={Calendar}
          label="Meetings"
          value={data?.stats?.meetings || 0}
          color="teal"
        />
        <GlanceCard
          icon={Target}
          label="Top Priorities"
          value={data?.priorities?.filter(p => p.priority === 'high' || p.priority === 'critical').length || 0}
          color="amber"
        />
        <GlanceCard
          icon={Focus}
          label="Focus Hours"
          value={`${data?.stats?.focusHours || 0}h`}
          color="emerald"
        />
        <GlanceCard
          icon={Clock}
          label="Available"
          value={`${data?.stats?.availableHours || 0}h`}
          color="cyan"
        />
      </div>
      
      {/* Top Priorities */}
      {data?.priorities && data.priorities.length > 0 && (
        <BriefingSection
          title="Top Priorities"
          icon={Target}
          color="amber"
          expanded={expandedSection === 'priorities'}
          onToggle={() => setExpandedSection(expandedSection === 'priorities' ? null : 'priorities')}
        >
          <div className="space-y-3">
            {data.priorities.map((priority, index) => {
              const config = getPriorityConfig(priority.priority)
              return (
                <motion.div
                  key={priority.id || index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "p-4 rounded-xl border backdrop-blur-sm",
                    "bg-gradient-to-r from-white/[0.04] to-white/[0.02]",
                    config.border
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("p-1.5 rounded-md mt-0.5", config.bg)}>
                      <Zap className={cn("h-3.5 w-3.5", config.text)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--text-primary)]">
                          {priority.title}
                        </span>
                        <Badge variant="outline" className={cn("text-[10px]", config.bg, config.text)}>
                          {config.label}
                        </Badge>
                      </div>
                      {priority.description && (
                        <p className="text-sm text-[var(--text-muted)] mt-1">
                          {priority.description}
                        </p>
                      )}
                      {priority.deadline && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-[var(--text-muted)]">
                          <Clock className="h-3 w-3" />
                          Due: {new Date(priority.deadline).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </BriefingSection>
      )}
      
      {/* Meeting Prep Notes */}
      {data?.meetingPrepNotes && data.meetingPrepNotes.length > 0 && (
        <BriefingSection
          title="Meeting Prep"
          icon={Users}
          color="teal"
          expanded={expandedSection === 'meetings'}
          onToggle={() => setExpandedSection(expandedSection === 'meetings' ? null : 'meetings')}
        >
          <div className="space-y-3">
            {data.meetingPrepNotes.map((prep, index) => (
              <motion.div
                key={prep.meetingId || index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-xl bg-gradient-to-r from-teal-500/10 to-teal-500/5 border border-teal-500/20"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-teal-500/20">
                    <Calendar className="h-4 w-4 text-teal-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[var(--text-primary)]">
                        {prep.title}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {prep.time}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                      {prep.note}
                    </p>
                    {prep.attendees && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-teal-400">
                        <Users className="h-3 w-3" />
                        {prep.attendees.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </BriefingSection>
      )}
      
      {/* Focus Recommendations */}
      {data?.focusRecommendations && (
        <BriefingSection
          title="Focus Recommendations"
          icon={Focus}
          color="emerald"
          expanded={expandedSection === 'focus'}
          onToggle={() => setExpandedSection(expandedSection === 'focus' ? null : 'focus')}
        >
          <div className="space-y-3">
            {data.focusRecommendations.map((rec, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20">
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-[var(--text-primary)]">
                      {rec.title}
                    </span>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                      {rec.suggestion}
                    </p>
                  </div>
                  {rec.timeSlot && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      {rec.timeSlot}
                    </Badge>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </BriefingSection>
      )}
      
      {/* Empty State */}
      {!data && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-12 text-center"
        >
          <div className="p-4 rounded-full bg-emerald-500/10 mb-4">
            <Brain className="h-8 w-8 text-emerald-400" />
          </div>
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
            No Briefing Available
          </h3>
          <p className="text-[var(--text-secondary)] max-w-sm mb-4">
            We'll generate your personalized daily briefing once you have calendar events and tasks.
          </p>
          <Button onClick={onRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Generate Briefing
          </Button>
        </motion.div>
      )}
    </div>
  )
}

// ============================================================================
// GLANCE CARD
// ============================================================================

function GlanceCard({ icon: Icon, label, value, color = 'emerald' }) {
  const colors = {
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
    teal: 'from-teal-500/20 to-teal-500/5 border-teal-500/20 text-teal-400',
    cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-400',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-400',
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
      className={cn(
        "p-4 rounded-xl bg-gradient-to-br border backdrop-blur-sm",
        colors[color]
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5" />
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-[var(--text-muted)]">{label}</div>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// BRIEFING SECTION
// ============================================================================

function BriefingSection({ title, icon: Icon, color, expanded, onToggle, children }) {
  const colors = {
    emerald: 'bg-emerald-500/20 border-emerald-500/20 text-emerald-400',
    teal: 'bg-teal-500/20 border-teal-500/20 text-teal-400',
    amber: 'bg-amber-500/20 border-amber-500/20 text-amber-400',
    purple: 'bg-purple-500/20 border-purple-500/20 text-purple-400',
  }
  
  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
      {/* Header */}
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
        <ChevronRight className={cn(
          "h-5 w-5 text-[var(--text-muted)] transition-transform duration-200",
          expanded && "rotate-90"
        )} />
      </button>
      
      {/* Content */}
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
