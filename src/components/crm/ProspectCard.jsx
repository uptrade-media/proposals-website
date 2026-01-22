/**
 * ProspectCard - Glass-styled prospect card for pipeline kanban
 * Features: Hover states, quick actions, lead score, last contact info
 */
import { memo } from 'react'
import { cn } from '@/lib/utils'
import { 
  Mail, 
  Phone, 
  Building2, 
  Clock, 
  ArrowRight,
  MoreHorizontal,
  Globe
} from 'lucide-react'
import { GlassAvatar, LeadQualityBadge } from './ui'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Format relative time
function formatRelativeTime(date) {
  if (!date) return null
  const now = new Date()
  const d = new Date(date)
  const diff = now - d
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const ProspectCard = memo(function ProspectCard({
  prospect,
  stageConfig,
  isSelected = false,
  onSelect,
  onClick,
  onMoveNext,
  onEmail,
  onCall,
  onViewWebsite,
  onViewDetails,
  onArchive,
  onDragStart,
  isDragging = false,
  className
}) {
  const handleCheckboxClick = (e) => {
    e.stopPropagation()
    onSelect?.(prospect.id)
  }

  const handleQuickAction = (e, action) => {
    e.stopPropagation()
    action?.()
  }

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', prospect.id)
    e.dataTransfer.effectAllowed = 'move'
    onDragStart?.(prospect)
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cn(
        // Base card styling - modern rounded-xl
        'group relative p-3 cursor-grab transition-all duration-200 rounded-xl',
        'bg-[var(--glass-bg)] border border-[var(--glass-border)]',
        // Hover state
        'hover:shadow-md hover:border-[var(--text-tertiary)]',
        // Dragging state
        isDragging && 'opacity-50 scale-95',
        // Selected state
        isSelected && 'ring-2 ring-offset-2 ring-offset-[var(--bg-primary)]',
        className
      )}
      style={isSelected ? { '--tw-ring-color': stageConfig?.color || 'var(--brand-primary)' } : undefined}
      onClick={() => onClick?.(prospect)}
    >
      <div>
        {/* Header: Avatar, Name, Score */}
        <div className="flex items-start gap-3">
          {/* Selection checkbox - appears on hover or when selected */}
          <div className={cn(
            'transition-opacity duration-200',
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onSelect?.(prospect.id)}
              onClick={handleCheckboxClick}
              className="mt-0.5"
            />
          </div>
          
          {/* Avatar - hidden when checkbox is visible */}
          <div className={cn(
            'transition-opacity duration-200',
            isSelected ? 'hidden' : 'group-hover:hidden'
          )}>
            <GlassAvatar 
              name={prospect.name} 
              src={prospect.avatar}
              size="md"
              gradient={prospect.pipeline_stage === 'closed_won' ? 'brand' : 'blue'}
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-semibold text-[var(--text-primary)] truncate leading-tight">
                  {prospect.name}
                </h4>
                {prospect.company && (
                  <p className="text-xs text-[var(--text-tertiary)] truncate flex items-center gap-1 mt-0.5">
                    <Building2 className="h-3 w-3 flex-shrink-0" />
                    {prospect.company}
                  </p>
                )}
              </div>
              
              <LeadQualityBadge score={prospect.avg_lead_quality} />
            </div>
          </div>
        </div>
        
        {/* Contact info row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-xs text-[var(--text-tertiary)]">
          {prospect.email && (
            <span className="flex items-center gap-1 truncate max-w-[140px]">
              <Mail className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{prospect.email}</span>
            </span>
          )}
          {prospect.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {prospect.phone}
            </span>
          )}
        </div>
        
        {/* Footer: Stats & Quick Actions - Only visible on hover */}
        <div className={cn(
          'flex items-center justify-between pt-3 border-t transition-all duration-200',
          'opacity-0 max-h-0 mt-0 overflow-hidden border-transparent',
          'group-hover:opacity-100 group-hover:max-h-20 group-hover:mt-3 group-hover:border-[var(--glass-border)]'
        )}>
          {/* Activity stats */}
          <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
            {prospect.call_count > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {prospect.call_count}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{prospect.call_count} calls</TooltipContent>
              </Tooltip>
            )}
            {prospect.last_call?.created_at && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatRelativeTime(prospect.last_call.created_at)}
                  </span>
                </TooltipTrigger>
                <TooltipContent>Last contact</TooltipContent>
              </Tooltip>
            )}
          </div>
          
          {/* Quick actions */}
          <div className="flex items-center gap-0.5">
            {prospect.email && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-[var(--text-tertiary)] hover:text-[var(--brand-primary)]"
                    onClick={(e) => handleQuickAction(e, () => onEmail?.(prospect))}
                  >
                    <Mail className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Send Email</TooltipContent>
              </Tooltip>
            )}
            
            {prospect.phone && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-[var(--text-tertiary)] hover:text-[var(--brand-primary)]"
                    onClick={(e) => handleQuickAction(e, () => onCall?.(prospect))}
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Call</TooltipContent>
              </Tooltip>
            )}
            
            {prospect.website && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-[var(--text-tertiary)] hover:text-[var(--brand-primary)]"
                    onClick={(e) => handleQuickAction(e, () => onViewWebsite?.(prospect))}
                  >
                    <Globe className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View Website</TooltipContent>
              </Tooltip>
            )}
            
            {onMoveNext && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-[var(--text-tertiary)] hover:text-[var(--brand-primary)]"
                    onClick={(e) => handleQuickAction(e, () => onMoveNext?.(prospect))}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Move to next stage</TooltipContent>
              </Tooltip>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-[var(--text-tertiary)]"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onViewDetails?.(prospect)}>
                  View Details
                </DropdownMenuItem>
                {prospect.website && (
                  <DropdownMenuItem onClick={() => window.open(prospect.website, '_blank')}>
                    Open Website
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600"
                  onClick={() => onArchive?.(prospect)}
                >
                  Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  )
})

export default ProspectCard
