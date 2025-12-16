/**
 * ProspectCallsTab - Call history for a specific prospect in ProspectDetailPanel
 * Shows call logs, AI summaries, and follow-up actions
 */
import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Play,
  Pause,
  Clock,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
  ListTodo,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GlassCard, GlassEmptyState, LeadQualityBadge, SentimentBadge } from './ui'

// Format duration
function formatDuration(seconds) {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
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
  
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

// Call card with expandable details
function CallCard({ call, isExpanded, onToggle }) {
  const getDirectionIcon = () => {
    if (call.status === 'missed') return <PhoneMissed className="h-4 w-4 text-red-500" />
    if (call.direction === 'incoming') return <PhoneIncoming className="h-4 w-4 text-[#4bbf39]" />
    return <PhoneOutgoing className="h-4 w-4 text-[#39bfb0]" />
  }

  const getDirectionColor = () => {
    if (call.status === 'missed') return 'bg-red-500/10'
    if (call.direction === 'incoming') return 'bg-[#4bbf39]/10'
    return 'bg-[#39bfb0]/10'
  }

  return (
    <GlassCard padding="md" className="overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 text-left"
      >
        {/* Direction Icon */}
        <div className={cn('p-2 rounded-xl', getDirectionColor())}>
          {getDirectionIcon()}
        </div>

        {/* Call Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {call.direction === 'incoming' ? 'Incoming Call' : 'Outgoing Call'}
            </span>
            {call.call_intent && (
              <Badge variant="secondary" className="text-xs">
                {call.call_intent}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)] mt-1">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(call.duration)}
            </span>
            <span>{formatRelativeTime(call.created_at)}</span>
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2">
          <SentimentBadge sentiment={call.sentiment} />
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-[var(--text-tertiary)]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[var(--text-tertiary)]" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-[var(--glass-border)] space-y-4">
          {/* Pre-call notes */}
          {call.pre_call_notes && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                <MessageSquare className="h-3 w-3" />
                Pre-call Notes
              </div>
              <p className="text-sm text-[var(--text-primary)] bg-[var(--glass-bg-inset)] rounded-lg p-3">
                {call.pre_call_notes}
              </p>
            </div>
          )}

          {/* AI Summary */}
          {call.ai_summary && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                <Sparkles className="h-3 w-3 text-[#39bfb0]" />
                AI Summary
              </div>
              <p className="text-sm text-[var(--text-primary)] bg-[var(--glass-bg-inset)] rounded-lg p-3">
                {call.ai_summary}
              </p>
            </div>
          )}

          {/* Key Points */}
          {call.ai_key_points && call.ai_key_points.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                <ListTodo className="h-3 w-3" />
                Key Points
              </div>
              <ul className="space-y-1">
                {(Array.isArray(call.ai_key_points) ? call.ai_key_points : []).map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
                    <span className="text-[#39bfb0] mt-1">•</span>
                    {typeof point === 'string' ? point : point.topic || point.title}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tasks extracted */}
          {call.tasks && call.tasks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                <CheckCircle2 className="h-3 w-3" />
                Tasks
              </div>
              <div className="space-y-1">
                {call.tasks.map((task, i) => (
                  <div 
                    key={i}
                    className={cn(
                      'flex items-center gap-2 text-sm p-2 rounded-lg',
                      task.status === 'completed' 
                        ? 'bg-green-500/10 text-green-600' 
                        : 'bg-[var(--glass-bg-inset)] text-[var(--text-primary)]'
                    )}
                  >
                    <CheckCircle2 className={cn(
                      'h-4 w-4',
                      task.status === 'completed' ? 'text-green-500' : 'text-[var(--text-tertiary)]'
                    )} />
                    {task.title}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Follow-up */}
          {call.follow_up && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#39bfb0]/10 border border-[#39bfb0]/20">
              <Calendar className="h-4 w-4 text-[#39bfb0]" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {call.follow_up.follow_up_type}: {call.follow_up.suggested_subject}
                </p>
                {call.follow_up.scheduled_for && (
                  <p className="text-xs text-[var(--text-secondary)]">
                    Scheduled for {new Date(call.follow_up.scheduled_for).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Recording player */}
          {call.recording_url && (
            <div className="pt-2">
              <audio 
                controls 
                src={call.recording_url}
                className="w-full h-10"
              />
            </div>
          )}
        </div>
      )}
    </GlassCard>
  )
}

// Main component
export default function ProspectCallsTab({ calls = [], isLoading = false, onCall }) {
  const [expandedCallId, setExpandedCallId] = useState(null)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-tertiary)]" />
      </div>
    )
  }

  if (calls.length === 0) {
    return (
      <GlassEmptyState
        icon={Phone}
        title="No calls yet"
        description="Call history will appear here after you call this contact."
        action={
          onCall && (
            <Button onClick={onCall} className="gap-2">
              <Phone className="h-4 w-4" />
              Make a Call
            </Button>
          )
        }
      />
    )
  }

  return (
    <div className="space-y-3">
      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-[var(--glass-bg-inset)]">
          <p className="text-xs text-[var(--text-tertiary)]">Total Calls</p>
          <p className="text-lg font-bold text-[var(--text-primary)]">{calls.length}</p>
        </div>
        <div className="p-3 rounded-xl bg-[var(--glass-bg-inset)]">
          <p className="text-xs text-[var(--text-tertiary)]">Total Duration</p>
          <p className="text-lg font-bold text-[var(--text-primary)]">
            {formatDuration(calls.reduce((sum, c) => sum + (c.duration || 0), 0))}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-[var(--glass-bg-inset)]">
          <p className="text-xs text-[var(--text-tertiary)]">Avg Sentiment</p>
          <SentimentBadge 
            sentiment={getMostCommonSentiment(calls)} 
          />
        </div>
      </div>

      {/* Call list */}
      {calls.map(call => (
        <CallCard
          key={call.id}
          call={call}
          isExpanded={expandedCallId === call.id}
          onToggle={() => setExpandedCallId(
            expandedCallId === call.id ? null : call.id
          )}
        />
      ))}
    </div>
  )
}

// Helper to get most common sentiment
function getMostCommonSentiment(calls) {
  const sentiments = calls.filter(c => c.sentiment).map(c => c.sentiment)
  if (sentiments.length === 0) return null
  
  const counts = sentiments.reduce((acc, s) => {
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})
  
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
}
