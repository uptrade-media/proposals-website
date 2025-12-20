/**
 * ProjectMemberCard - Compact card for project team members
 * Used in project team view and project assignment lists
 */
import { cn } from '@/lib/utils'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import UserAvatar from '../shared/UserAvatar'
import RoleBadge from '../shared/RoleBadge'

export default function ProjectMemberCard({ 
  member, 
  onRemove,
  compact = false,
  showRemove = true
}) {
  const isUptradeTeam = member.role === 'uptrade_assigned'
  const isOwner = member.role === 'owner'

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--glass-bg)]/50 border border-[var(--glass-border)]">
        <UserAvatar
          name={member.contact?.name}
          email={member.contact?.email}
          src={member.contact?.avatar}
          size="sm"
          gradient={isUptradeTeam ? 'green' : 'brand'}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
            {member.contact?.name || member.contact?.email}
          </p>
        </div>
        <RoleBadge role={member.role} type="project" size="sm" />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-[var(--glass-bg)]/50 border border-[var(--glass-border)] group">
      <UserAvatar
        name={member.contact?.name}
        email={member.contact?.email}
        src={member.contact?.avatar}
        size="md"
        gradient={isUptradeTeam ? 'green' : 'brand'}
      />
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-[var(--text-primary)] truncate">
          {member.contact?.name || 'Unknown'}
        </p>
        <p className="text-xs text-[var(--text-tertiary)] truncate">
          {member.contact?.email}
        </p>
      </div>
      
      <RoleBadge role={member.role} type="project" size="sm" />
      
      {/* Remove button - don't show for Uptrade team or owners */}
      {showRemove && !isUptradeTeam && !isOwner && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity" 
          onClick={() => onRemove?.(member)}
        >
          <XCircle className="h-3.5 w-3.5 text-[var(--text-tertiary)] hover:text-red-400" />
        </Button>
      )}
    </div>
  )
}
