/**
 * FollowUpsTab - Glass-styled follow-ups list for CRM
 * Features: Follow-up list with type icons, suggested messages, completion
 */
import { cn } from '@/lib/utils'
import {
  Clock,
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  CheckCircle2,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GlassCard, GlassEmptyState, StatusBadge } from './ui'

// Main FollowUpsTab Component
export default function FollowUpsTab({
  followUps = [],
  summary = {},
  isLoading = false,
  onComplete
}) {
  const typeIcons = {
    email: Mail,
    call: Phone,
    sms: MessageSquare,
    meeting: Calendar
  }

  return (
    <div className="space-y-4">
      {/* Summary Badges */}
      <div className="flex items-center gap-3">
        <StatusBadge 
          status={`${summary.overdue || 0} overdue`} 
          variant={summary.overdue > 0 ? 'error' : 'default'}
          dot
        />
        <StatusBadge 
          status={`${summary.today || 0} today`} 
          variant="info"
          dot
        />
        <StatusBadge 
          status={`${summary.thisWeek || 0} this week`} 
          variant="success"
          dot
        />
      </div>

      {/* Follow-ups List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
            <p className="text-sm text-[var(--text-tertiary)]">Loading follow-ups...</p>
          </div>
        </div>
      ) : followUps.length === 0 ? (
        <GlassEmptyState
          icon={Clock}
          title="No follow-ups scheduled"
          description="AI-suggested follow-ups from calls will appear here"
          size="lg"
        />
      ) : (
        <div className="space-y-3">
          {followUps.map(followUp => {
            const isOverdue = new Date(followUp.scheduled_for) < new Date()
            const TypeIcon = typeIcons[followUp.follow_up_type] || Clock

            return (
              <GlassCard 
                key={followUp.id} 
                padding="md"
                glow={isOverdue ? 'error' : undefined}
              >
                <div className="flex items-start gap-4">
                  {/* Type Icon */}
                  <div className={cn(
                    'p-3 rounded-2xl',
                    isOverdue ? 'bg-red-500/10' : 'bg-[#39bfb0]/10'
                  )}>
                    <TypeIcon className={cn(
                      'h-5 w-5',
                      isOverdue ? 'text-red-500' : 'text-[#39bfb0]'
                    )} />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-[var(--text-primary)] capitalize">
                        {followUp.follow_up_type}
                      </span>
                      {followUp.contact?.name && (
                        <span className="text-[var(--text-secondary)]">
                          with {followUp.contact.name}
                        </span>
                      )}
                      {isOverdue && (
                        <StatusBadge status="Overdue" variant="error" size="sm" />
                      )}
                    </div>
                    
                    {followUp.suggested_subject && (
                      <p className="text-sm font-medium text-[var(--text-primary)] mt-2">
                        {followUp.suggested_subject}
                      </p>
                    )}
                    
                    {followUp.suggested_message && (
                      <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">
                        {followUp.suggested_message}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] mt-2">
                      <Clock className="h-3 w-3" />
                      {new Date(followUp.scheduled_for).toLocaleString()}
                    </div>
                  </div>
                  
                  {/* Complete Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl flex-shrink-0"
                    onClick={() => onComplete?.(followUp.id)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Done
                  </Button>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
