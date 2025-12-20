/**
 * TenantSignalPanel - AI-powered insights panel for tenant CRM
 * Shows hot leads, stale contacts, and smart recommendations
 */
import { cn } from '@/lib/utils'
import {
  Zap,
  TrendingUp,
  Clock,
  AlertTriangle,
  Lightbulb,
  ChevronRight,
  Sparkles,
  Mail,
  Phone,
  Target,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDistanceToNow } from 'date-fns'

// Insight types with their styling
const INSIGHT_TYPES = {
  hot_lead: {
    icon: Zap,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    label: 'Hot Lead',
    priority: 1
  },
  warm_lead: {
    icon: TrendingUp,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
    label: 'Warm Lead',
    priority: 2
  },
  stale_contact: {
    icon: Clock,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    label: 'Needs Follow-up',
    priority: 3
  },
  at_risk: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-600/10',
    borderColor: 'border-red-600/20',
    label: 'At Risk',
    priority: 1
  },
  recommendation: {
    icon: Lightbulb,
    color: 'text-[#4bbf39]',
    bgColor: 'bg-[#4bbf39]/10',
    borderColor: 'border-[#4bbf39]/20',
    label: 'Recommendation',
    priority: 4
  },
  opportunity: {
    icon: Target,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    label: 'Opportunity',
    priority: 2
  }
}

// Individual insight card
function InsightCard({ insight, onContactClick, onAction }) {
  const config = INSIGHT_TYPES[insight.type] || INSIGHT_TYPES.recommendation
  const Icon = config.icon
  
  const contact = insight.contact
  const initials = contact?.name
    ? contact.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : contact?.email?.slice(0, 2).toUpperCase() || '??'

  return (
    <div className={cn(
      "p-3 rounded-lg border transition-all",
      config.bgColor,
      config.borderColor,
      "hover:shadow-md"
    )}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg", config.bgColor)}>
          <Icon className={cn("h-4 w-4", config.color)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-xs", config.bgColor, config.color, config.borderColor)}>
              {config.label}
            </Badge>
            {insight.score && (
              <span className={cn("text-xs font-medium", config.color)}>
                Score: {insight.score}
              </span>
            )}
          </div>
          
          {/* Message */}
          <p className="text-sm text-[var(--text-primary)] mt-1">
            {insight.message}
          </p>
          
          {/* Contact info if present */}
          {contact && (
            <button
              onClick={() => onContactClick?.(contact)}
              className="flex items-center gap-2 mt-2 group"
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={contact.avatar_url} />
                <AvatarFallback className="text-xs bg-[var(--glass-bg)]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-[var(--text-secondary)] group-hover:text-[#4bbf39]">
                {contact.name || contact.email}
              </span>
              <ChevronRight className="h-3 w-3 text-[var(--text-tertiary)] group-hover:text-[#4bbf39]" />
            </button>
          )}
          
          {/* Suggested action */}
          {insight.action && (
            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className={cn("text-xs", config.color, "hover:bg-[var(--glass-bg)]")}
                onClick={() => onAction?.(insight.action, insight.contact)}
              >
                {insight.action.icon === 'email' && <Mail className="h-3 w-3 mr-1" />}
                {insight.action.icon === 'phone' && <Phone className="h-3 w-3 mr-1" />}
                {insight.action.label}
                <ArrowUpRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Summary stats at top
function SignalSummary({ insights }) {
  const hotLeads = insights.filter(i => i.type === 'hot_lead').length
  const needsFollowUp = insights.filter(i => i.type === 'stale_contact').length
  const opportunities = insights.filter(i => i.type === 'opportunity').length
  
  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
        <Zap className="h-5 w-5 mx-auto text-red-500 mb-1" />
        <p className="text-lg font-semibold text-red-500">{hotLeads}</p>
        <p className="text-xs text-red-500/70">Hot Leads</p>
      </div>
      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
        <Clock className="h-5 w-5 mx-auto text-amber-500 mb-1" />
        <p className="text-lg font-semibold text-amber-500">{needsFollowUp}</p>
        <p className="text-xs text-amber-500/70">Need Follow-up</p>
      </div>
      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
        <Target className="h-5 w-5 mx-auto text-blue-500 mb-1" />
        <p className="text-lg font-semibold text-blue-500">{opportunities}</p>
        <p className="text-xs text-blue-500/70">Opportunities</p>
      </div>
    </div>
  )
}

export default function TenantSignalPanel({
  insights,
  isLoading = false,
  onRefresh,
  onContactClick,
  onAction
}) {
  // Ensure insights is always an array (handle null/undefined)
  const safeInsights = Array.isArray(insights) ? insights : []
  
  // Sort insights by priority
  const sortedInsights = [...safeInsights].sort((a, b) => {
    const priorityA = INSIGHT_TYPES[a.type]?.priority || 5
    const priorityB = INSIGHT_TYPES[b.type]?.priority || 5
    return priorityA - priorityB
  })

  return (
    <div className="rounded-xl border border-[var(--glass-border)] bg-gradient-to-b from-[#4bbf39]/5 to-transparent overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[var(--glass-border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#4bbf39]/10">
            <Sparkles className="h-5 w-5 text-[#4bbf39]" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Signal AI Insights</h3>
            <p className="text-xs text-[var(--text-tertiary)]">
              AI-powered recommendations for your pipeline
            </p>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="text-[var(--text-secondary)]"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="h-[400px]">
        <div className="p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 text-[var(--text-tertiary)]">
              <RefreshCw className="h-8 w-8 animate-spin mb-2 text-[#4bbf39]" />
              <p className="text-sm">Analyzing your pipeline...</p>
            </div>
          ) : safeInsights.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-[var(--text-tertiary)]">
              <Sparkles className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No insights available</p>
              <p className="text-xs mt-1">Add more contacts to get AI recommendations</p>
            </div>
          ) : (
            <>
              {/* Summary stats */}
              <SignalSummary insights={safeInsights} />
              
              {/* Insight cards */}
              <div className="space-y-3">
                {sortedInsights.map((insight, index) => (
                  <InsightCard
                    key={insight.id || index}
                    insight={insight}
                    onContactClick={onContactClick}
                    onAction={onAction}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      {safeInsights.length > 0 && !isLoading && (
        <div className="p-3 border-t border-[var(--glass-border)] bg-[var(--glass-bg)]/50">
          <p className="text-xs text-center text-[var(--text-tertiary)]">
            Last updated {formatDistanceToNow(new Date(), { addSuffix: true })}
          </p>
        </div>
      )}
    </div>
  )
}

// Helper function to generate insights from contacts
export function generateSignalInsights(contacts) {
  const insights = []
  const now = new Date()
  
  contacts.forEach(contact => {
    // Hot leads - high lead score
    if (contact.lead_score >= 80) {
      insights.push({
        id: `hot-${contact.id}`,
        type: 'hot_lead',
        score: contact.lead_score,
        message: `${contact.name || contact.email} has a high lead score and is ready to convert!`,
        contact,
        action: {
          icon: 'email',
          label: 'Send Email',
          type: 'send_email'
        }
      })
    }
    
    // Warm leads
    else if (contact.lead_score >= 60) {
      insights.push({
        id: `warm-${contact.id}`,
        type: 'warm_lead',
        score: contact.lead_score,
        message: `${contact.name || contact.email} is showing strong interest. Consider following up.`,
        contact,
        action: {
          icon: 'email',
          label: 'Follow Up',
          type: 'follow_up'
        }
      })
    }
    
    // Stale contacts - no activity in 14+ days
    if (contact.last_activity_at) {
      const lastActivity = new Date(contact.last_activity_at)
      const daysSinceActivity = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24))
      
      if (daysSinceActivity >= 14 && contact.pipeline_stage !== 'closed_won' && contact.pipeline_stage !== 'closed_lost') {
        insights.push({
          id: `stale-${contact.id}`,
          type: 'stale_contact',
          message: `No activity with ${contact.name || contact.email} for ${daysSinceActivity} days.`,
          contact,
          action: {
            icon: 'email',
            label: 'Re-engage',
            type: 're_engage'
          }
        })
      }
    }
    
    // High-value opportunities in late stages
    if (contact.deal_value && contact.deal_value > 5000 && 
        ['offer_made', 'negotiating'].includes(contact.pipeline_stage)) {
      insights.push({
        id: `opp-${contact.id}`,
        type: 'opportunity',
        message: `$${contact.deal_value.toLocaleString()} deal with ${contact.name || contact.email} is close to closing!`,
        contact,
        action: {
          icon: 'email',
          label: 'Close Deal',
          type: 'close_deal'
        }
      })
    }
  })
  
  // Add general recommendations if we have enough data
  if (contacts.length >= 5) {
    const avgDealValue = contacts
      .filter(c => c.deal_value)
      .reduce((sum, c) => sum + c.deal_value, 0) / contacts.filter(c => c.deal_value).length
    
    if (avgDealValue) {
      insights.push({
        id: 'rec-avg-deal',
        type: 'recommendation',
        message: `Your average deal value is $${Math.round(avgDealValue).toLocaleString()}. Consider targeting higher-value prospects.`,
        action: null
      })
    }
    
    const newLeads = contacts.filter(c => c.pipeline_stage === 'new_lead').length
    if (newLeads > 5) {
      insights.push({
        id: 'rec-new-leads',
        type: 'recommendation',
        message: `You have ${newLeads} uncontacted leads. Schedule time to reach out to them.`,
        action: null
      })
    }
  }
  
  return insights
}
