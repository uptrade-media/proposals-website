/**
 * TeamMemberCard - Display card for Uptrade internal team members
 * Shows metrics, integrations (OpenPhone, Gmail), and actions
 */
import { cn } from '@/lib/utils'
import { 
  Mail, 
  Phone, 
  MoreHorizontal, 
  Send, 
  Edit2, 
  XCircle, 
  CheckCircle2 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import UserAvatar from '../shared/UserAvatar'
import RoleBadge from '../shared/RoleBadge'
import StatusBadge from '../shared/StatusBadge'

export default function TeamMemberCard({ 
  member, 
  currentUserId,
  onEdit,
  onResendInvite,
  onStatusChange,
  showMetrics = true
}) {
  const isCurrentUser = member.id === currentUserId

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)] transition-all group">
      {/* Avatar */}
      <UserAvatar
        name={member.name}
        email={member.email}
        src={member.avatar}
        size="lg"
        gradient={member.teamStatus === 'active' ? 'brand' : 'gray'}
        status={member.teamStatus === 'active' ? 'online' : undefined}
      />
      
      {/* Member Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-[var(--text-primary)] truncate">{member.name}</p>
          {isCurrentUser && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]">
              You
            </span>
          )}
        </div>
        <p className="text-sm text-[var(--text-tertiary)] truncate">{member.email}</p>
        
        {/* Integration info */}
        <div className="flex items-center gap-3 mt-1">
          {member.openphoneNumber && (
            <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {member.openphoneNumber}
            </span>
          )}
          {member.gmailAddress && (
            <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {member.gmailAddress}
            </span>
          )}
        </div>
      </div>
      
      {/* Metrics */}
      {showMetrics && member.metrics && (
        <div className="hidden lg:flex items-center gap-4 text-center">
          <div>
            <p className="text-lg font-semibold text-[var(--text-primary)]">{member.metrics.clientsAssigned}</p>
            <p className="text-xs text-[var(--text-tertiary)]">Clients</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-[var(--text-primary)]">{member.metrics.auditsCreated}</p>
            <p className="text-xs text-[var(--text-tertiary)]">Audits</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-[var(--text-primary)]">{member.metrics.proposalsCreated}</p>
            <p className="text-xs text-[var(--text-tertiary)]">Proposals</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-[var(--brand-primary)]">{member.metrics.conversionRate}%</p>
            <p className="text-xs text-[var(--text-tertiary)]">Conv.</p>
          </div>
        </div>
      )}
      
      {/* Role & Status Badges */}
      <div className="flex items-center gap-2">
        <RoleBadge role={member.teamRole} type="uptrade" />
        <StatusBadge status={member.teamStatus} />
      </div>
      
      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => onEdit?.(member)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Edit Details
          </DropdownMenuItem>
          {member.teamStatus === 'pending' && (
            <DropdownMenuItem onClick={() => onResendInvite?.(member)}>
              <Send className="h-4 w-4 mr-2" />
              Resend Invite
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {member.teamStatus === 'active' && !isCurrentUser && (
            <DropdownMenuItem 
              className="text-amber-500"
              onClick={() => onStatusChange?.(member, 'inactive')}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Deactivate
            </DropdownMenuItem>
          )}
          {member.teamStatus === 'inactive' && (
            <DropdownMenuItem 
              className="text-green-500"
              onClick={() => onStatusChange?.(member, 'active')}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Reactivate
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
