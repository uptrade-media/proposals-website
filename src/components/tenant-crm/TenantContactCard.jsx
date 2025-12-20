/**
 * TenantContactCard - Universal contact card for tenant CRM
 * No call buttons or OpenPhone integration
 */
import { cn } from '@/lib/utils'
import { 
  Mail, 
  Building2, 
  Clock, 
  CheckCircle2,
  TrendingUp,
  Zap
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { TENANT_PIPELINE_STAGES } from './TenantPipelineKanban'

// Lead score badge component
function LeadScoreBadge({ score }) {
  if (!score && score !== 0) return null
  
  const getScoreConfig = (score) => {
    if (score >= 80) return { 
      label: 'Hot', 
      color: 'bg-red-500/10 text-red-600 border-red-500/20',
      icon: Zap
    }
    if (score >= 60) return { 
      label: 'Warm', 
      color: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
      icon: TrendingUp
    }
    if (score >= 40) return { 
      label: 'Cool', 
      color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      icon: null
    }
    return { 
      label: 'Cold', 
      color: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
      icon: null
    }
  }
  
  const config = getScoreConfig(score)
  const Icon = config.icon
  
  return (
    <Badge variant="outline" className={cn("text-xs gap-1", config.color)}>
      {Icon && <Icon className="h-3 w-3" />}
      {score}
    </Badge>
  )
}

export default function TenantContactCard({
  contact,
  isSelected,
  onSelect,
  onClick,
  compact = false
}) {
  const initials = contact.name
    ? contact.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : contact.email?.slice(0, 2).toUpperCase() || '??'
  
  const stageConfig = TENANT_PIPELINE_STAGES[contact.pipeline_stage] || TENANT_PIPELINE_STAGES.new_lead
  
  // Format last activity
  const lastActivity = contact.last_activity_at 
    ? formatDistanceToNow(new Date(contact.last_activity_at), { addSuffix: true })
    : 'No activity'
  
  // Has pending tasks
  const hasTasks = contact.pending_tasks_count > 0
  
  if (compact) {
    // Compact version for closed deals section
    return (
      <div
        onClick={onClick}
        className={cn(
          "p-2 rounded-lg border cursor-pointer transition-all",
          "bg-[var(--glass-bg)]/50 border-[var(--glass-border)]",
          "hover:bg-[var(--glass-bg)] hover:border-[var(--glass-border-hover)]",
          isSelected && "ring-2 ring-[#4bbf39] border-[#4bbf39]"
        )}
      >
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={contact.avatar_url} />
            <AvatarFallback className="text-xs bg-[var(--glass-bg)] text-[var(--text-secondary)]">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
              {contact.name || contact.email}
            </p>
          </div>
          {contact.lead_score && <LeadScoreBadge score={contact.lead_score} />}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "group p-3 rounded-lg border cursor-pointer transition-all",
        "bg-[var(--glass-bg)]/50 border-[var(--glass-border)]",
        "hover:bg-[var(--glass-bg)] hover:border-[var(--glass-border-hover)]",
        "hover:shadow-lg hover:shadow-black/5",
        isSelected && "ring-2 ring-[#4bbf39] border-[#4bbf39]"
      )}
    >
      {/* Header with checkbox and avatar */}
      <div className="flex items-start gap-3">
        <div 
          className="pt-0.5"
          onClick={(e) => {
            e.stopPropagation()
            onSelect()
          }}
        >
          <Checkbox
            checked={isSelected}
            className="border-[var(--glass-border)] data-[state=checked]:bg-[#4bbf39] data-[state=checked]:border-[#4bbf39]"
          />
        </div>
        
        <div className="flex-1 min-w-0" onClick={onClick}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={contact.avatar_url} />
                <AvatarFallback className="text-xs bg-[var(--glass-bg)] text-[var(--text-secondary)]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium text-[var(--text-primary)] truncate">
                  {contact.name || contact.email}
                </p>
                {contact.company && (
                  <div className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                    <Building2 className="h-3 w-3" />
                    <span className="truncate">{contact.company}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Lead score */}
            <LeadScoreBadge score={contact.lead_score} />
          </div>
          
          {/* Contact info */}
          <div className="mt-2 space-y-1">
            {contact.email && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <Mail className="h-3 w-3 text-[var(--text-tertiary)]" />
                <span className="truncate">{contact.email}</span>
              </div>
            )}
          </div>
          
          {/* Footer with activity and tasks */}
          <div className="mt-3 pt-2 border-t border-[var(--glass-border)] flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
              <Clock className="h-3 w-3" />
              <span>{lastActivity}</span>
            </div>
            
            {hasTasks && (
              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {contact.pending_tasks_count} task{contact.pending_tasks_count > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          
          {/* Deal value if present */}
          {contact.deal_value && (
            <div className="mt-2 text-sm font-medium text-[#4bbf39]">
              ${contact.deal_value.toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
