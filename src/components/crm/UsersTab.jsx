/**
 * UsersTab - Glass-styled active users list for CRM
 * Features: Active users, pending invites, Google/password badges
 */
import { cn } from '@/lib/utils'
import {
  Users,
  Building2,
  Clock,
  Send,
  MoreHorizontal,
  Eye,
  XCircle,
  Mail,
  CheckCircle2,
  RefreshCw,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { GlassCard, GlassAvatar, GlassEmptyState, StatusBadge } from './ui'

// User Row Component
function UserRow({ user, onView, onResendInvite, onDisable, onSendEmail }) {
  const isActive = user.account_setup === 'true' || user.account_setup === true
  const hasGoogle = !!user.google_id

  return (
    <GlassCard padding="md" hover className="cursor-pointer" onClick={() => onView?.(user)}>
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <GlassAvatar
          name={user.name}
          src={user.avatar}
          size="lg"
          gradient={isActive ? 'brand' : 'orange'}
          status={isActive ? 'online' : undefined}
        />
        
        {/* User Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[var(--text-primary)]">{user.name}</p>
          <p className="text-sm text-[var(--text-tertiary)]">{user.email}</p>
        </div>
        
        {/* Company & Badges */}
        <div className="flex items-center gap-3">
          {user.company && (
            <span className="text-sm text-[var(--text-tertiary)] flex items-center gap-1.5">
              <Building2 className="h-4 w-4" />
              {user.company}
            </span>
          )}
          
          <div className="flex items-center gap-2">
            {hasGoogle ? (
              <StatusBadge status="Google" variant="info" size="sm" />
            ) : (
              <StatusBadge status="Password" variant="default" size="sm" />
            )}
            <StatusBadge 
              status={user.role === 'admin' ? 'Admin' : 'Client'} 
              variant={user.role === 'admin' ? 'purple' : 'success'} 
              size="sm"
            />
          </div>
          
          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onView?.(user)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSendEmail?.(user)}>
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={() => onDisable?.(user)}>
                <XCircle className="h-4 w-4 mr-2" />
                Disable Account
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </GlassCard>
  )
}

// Pending Invite Row
function PendingInviteRow({ user, onResendInvite }) {
  return (
    <GlassCard 
      padding="md" 
      className="border-dashed border-amber-500/30 bg-amber-500/5"
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
          <Clock className="h-6 w-6 text-amber-500" />
        </div>
        
        {/* User Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[var(--text-primary)]">{user.name}</p>
          <p className="text-sm text-[var(--text-tertiary)]">{user.email}</p>
        </div>
        
        {/* Company & Actions */}
        <div className="flex items-center gap-3">
          {user.company && (
            <span className="text-sm text-[var(--text-tertiary)] flex items-center gap-1.5">
              <Building2 className="h-4 w-4" />
              {user.company}
            </span>
          )}
          
          <StatusBadge status="Invite Pending" variant="warning" />
          
          <Button 
            variant="outline" 
            size="sm"
            className="rounded-xl"
            onClick={() => onResendInvite?.(user)}
          >
            <Send className="h-4 w-4 mr-2" />
            Resend
          </Button>
        </div>
      </div>
    </GlassCard>
  )
}

// Main UsersTab Component
export default function UsersTab({
  users = [],
  isLoading = false,
  onRefresh,
  onViewUser,
  onResendInvite,
  onDisableUser,
  onSendEmail
}) {
  const activeUsers = users.filter(u => u.account_setup === 'true' || u.account_setup === true)
  // Only show pending users who have actually been invited (have a magic_link_token)
  const pendingUsers = users.filter(u => 
    u.magic_link_token && (u.account_setup !== 'true' && u.account_setup !== true)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Users className="h-5 w-5 text-[#4bbf39]" />
            Active Portal Users
          </h3>
          <p className="text-sm text-[var(--text-tertiary)]">
            {activeUsers.length} active • {pendingUsers.length} pending
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} className="rounded-xl">
          <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
            <p className="text-sm text-[var(--text-tertiary)]">Loading users...</p>
          </div>
        </div>
      ) : users.length === 0 ? (
        <GlassEmptyState
          icon={Users}
          title="No portal users yet"
          description="Users appear here after completing account setup"
          size="lg"
        />
      ) : (
        <>
          {/* Active Users */}
          {activeUsers.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#4bbf39]" />
                Active Accounts ({activeUsers.length})
              </h4>
              {activeUsers.map(user => (
                <UserRow
                  key={user.id}
                  user={user}
                  onView={onViewUser}
                  onDisable={onDisableUser}
                  onSendEmail={onSendEmail}
                />
              ))}
            </div>
          )}

          {/* Pending Invites */}
          {pendingUsers.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Pending Invites ({pendingUsers.length})
              </h4>
              {pendingUsers.map(user => (
                <PendingInviteRow
                  key={user.id}
                  user={user}
                  onResendInvite={onResendInvite}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
