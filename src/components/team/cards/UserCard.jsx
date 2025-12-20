/**
 * UserCard - Display card for organization users
 * Shows access level, role, project assignments, and actions
 */
import { cn } from '@/lib/utils'
import { 
  MoreHorizontal, 
  Edit2, 
  XCircle,
  FolderOpen,
  ChevronRight,
  MessageSquare
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import UserAvatar from '../shared/UserAvatar'
import RoleBadge from '../shared/RoleBadge'
import AccessLevelBadge from '../shared/AccessLevelBadge'

export default function UserCard({ 
  user, 
  currentUserId,
  onEdit,
  onRemove,
  onMessage,
  onViewProjects,
  showAccessLevel = true
}) {
  const isCurrentUser = user.contact?.id === currentUserId
  const projectCount = user.projectMemberships?.length || 0
  const hasManageActions = onEdit || onRemove
  const hasAnyActions = hasManageActions || onMessage

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)] transition-all group">
      {/* Avatar */}
      <UserAvatar
        name={user.contact?.name}
        email={user.contact?.email}
        src={user.contact?.avatar}
        size="lg"
        gradient="brand"
      />
      
      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-[var(--text-primary)] truncate">
            {user.contact?.name || user.contact?.email || 'Unknown'}
          </p>
          {isCurrentUser && (
            <Badge variant="secondary" className="text-xs">You</Badge>
          )}
        </div>
        <p className="text-sm text-[var(--text-tertiary)] truncate">{user.contact?.email}</p>
        
        {/* Project assignments for project-level users */}
        {user.access_level === 'project' && projectCount > 0 && (
          <button 
            onClick={() => onViewProjects?.(user)}
            className="flex items-center gap-1 mt-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <FolderOpen className="h-3 w-3" />
            {projectCount} project{projectCount !== 1 ? 's' : ''}
            <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Access Level Badge */}
      {showAccessLevel && (
        <AccessLevelBadge level={user.access_level} />
      )}

      {/* Role Badge */}
      <RoleBadge role={user.role} type="org" size="md" />

      {/* Actions */}
      {!isCurrentUser && hasAnyActions && (
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
            {onMessage && (
              <DropdownMenuItem onClick={() => onMessage?.(user)}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Message
              </DropdownMenuItem>
            )}
            {onMessage && hasManageActions && <DropdownMenuSeparator />}
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit?.(user)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Access
              </DropdownMenuItem>
            )}
            {hasManageActions && (
              <DropdownMenuSeparator />
            )}
            {onRemove && (
              <DropdownMenuItem
                className="text-red-500"
                onClick={() => onRemove?.(user)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Remove User
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
