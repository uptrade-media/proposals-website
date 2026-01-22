/**
 * TargetCompanyCard - Glass-styled card for prospecting target companies
 * Shows AI-generated score, pitch angles, and call prep status
 */
import { memo } from 'react'
import { cn } from '@/lib/utils'
import { 
  Globe,
  Phone, 
  User,
  Clock,
  ChevronRight,
  Sparkles,
  Target,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Score to label mapping
const getScoreConfig = (score) => {
  if (score >= 80) return { label: 'Hot Lead', color: 'bg-red-500/20 text-red-400 border-red-500/30' }
  if (score >= 60) return { label: 'Warm', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' }
  if (score >= 40) return { label: 'Potential', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' }
  if (score >= 20) return { label: 'Cool', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' }
  return { label: 'Low Priority', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' }
}

// Format relative time
function formatRelativeTime(date) {
  if (!date) return null
  const now = new Date()
  const d = new Date(date)
  const diff = now - d
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const TargetCompanyCard = memo(function TargetCompanyCard({
  company,
  onClick,
  onClaim,
  onCallPrep,
  className
}) {
  const scoreConfig = getScoreConfig(company.score || 0)
  const hasCallPrep = !!company.call_prep
  const isClaimed = !!company.claimed_by

  return (
    <div
      onClick={() => onClick?.(company)}
      className={cn(
        'group relative p-4 rounded-xl cursor-pointer transition-all duration-200',
        'bg-[var(--glass-bg)] backdrop-blur-[var(--blur-md)]',
        'border border-[var(--glass-border)]',
        'hover:bg-[var(--glass-bg-hover)] hover:border-[var(--accent-primary)]/30',
        'hover:shadow-[var(--shadow-lg)]',
        className
      )}
    >
      {/* Header: Domain + Score */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)]/10 flex items-center justify-center flex-shrink-0">
            <Globe className="w-4 h-4 text-[var(--accent-primary)]" />
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-[var(--text-primary)] truncate">
              {company.domain}
            </h3>
            {company.company_name && company.company_name !== company.domain && (
              <p className="text-xs text-[var(--text-muted)] truncate">
                {company.company_name}
              </p>
            )}
          </div>
        </div>
        
        {/* Score Badge */}
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={cn('text-xs font-semibold border', scoreConfig.color)}
          >
            {company.score || 0}
          </Badge>
          <span className={cn('text-[10px] uppercase tracking-wide', scoreConfig.color.split(' ')[1])}>
            {scoreConfig.label}
          </span>
        </div>
      </div>

      {/* AI Summary (if available) */}
      {company.ai_summary && (
        <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-3">
          {company.ai_summary}
        </p>
      )}

      {/* Tech Stack Pills */}
      {company.tech_stack?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {company.tech_stack.slice(0, 4).map((tech) => (
            <span 
              key={tech}
              className="px-2 py-0.5 text-[10px] rounded-full bg-[var(--surface-secondary)] text-[var(--text-muted)]"
            >
              {tech}
            </span>
          ))}
          {company.tech_stack.length > 4 && (
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-[var(--surface-secondary)] text-[var(--text-muted)]">
              +{company.tech_stack.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Top Pitch Angle */}
      {company.pitch_angles?.length > 0 && (
        <div className="flex items-start gap-2 mb-3 p-2 rounded-lg bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10">
          <Target className="w-3.5 h-3.5 text-[var(--accent-primary)] mt-0.5 flex-shrink-0" />
          <span className="text-xs text-[var(--text-secondary)] line-clamp-1">
            {company.pitch_angles[0].title || company.pitch_angles[0]}
          </span>
        </div>
      )}

      {/* Footer: Status + Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--glass-border)]">
        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
          {/* Claimed status */}
          {isClaimed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>Claimed</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                Claimed by {company.claimed_by_contact?.name || 'team member'}
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-[var(--text-muted)]">Unclaimed</span>
          )}
          
          {/* Time since analysis */}
          {company.analyzed_at && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatRelativeTime(company.analyzed_at)}</span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isClaimed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    onClaim?.(company.id)
                  }}
                >
                  <Zap className="w-3 h-3 mr-1" />
                  Claim
                </Button>
              </TooltipTrigger>
              <TooltipContent>Claim this prospect</TooltipContent>
            </Tooltip>
          )}
          
          {!hasCallPrep && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCallPrep?.(company.id)
                  }}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Call Prep
                </Button>
              </TooltipTrigger>
              <TooltipContent>Generate AI call prep</TooltipContent>
            </Tooltip>
          )}
          
          <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
        </div>
      </div>
    </div>
  )
})

export default TargetCompanyCard
