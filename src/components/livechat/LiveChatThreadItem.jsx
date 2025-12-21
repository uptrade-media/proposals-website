// src/components/livechat/LiveChatThreadItem.jsx
// Thread list item for live chat sessions

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, ExternalLink, Bot, User, Clock } from 'lucide-react'
import LiveChatAvatar from './LiveChatAvatar'

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  ai: { label: 'AI Handling', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  pending_handoff: { label: 'Needs Reply', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  human: { label: 'Live Chat', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' }
}

export function LiveChatThreadItem({ 
  session, 
  isSelected = false, 
  onClick,
  className 
}) {
  const status = session.chat_status || 'active'
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.active
  
  return (
    <button
      onClick={() => onClick?.(session)}
      className={cn(
        'w-full flex items-start gap-3 p-3 rounded-lg',
        'text-left transition-all duration-150',
        isSelected 
          ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800' 
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
        status === 'pending_handoff' && !isSelected && 'bg-amber-50/50 dark:bg-amber-950/20',
        className
      )}
    >
      {/* Avatar */}
      <LiveChatAvatar 
        name={session.partner_name} 
        status={status}
        size="md" 
      />
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            'font-medium truncate',
            session.unread_count > 0 && 'text-foreground',
            !session.unread_count && 'text-muted-foreground'
          )}>
            {session.partner_name || 'Visitor'}
          </span>
          
          {/* Status badge */}
          <Badge className={cn('text-[10px] px-1.5 py-0 h-4', statusConfig.color)}>
            {status === 'ai' && <Bot className="w-2.5 h-2.5 mr-0.5" />}
            {status === 'human' && <User className="w-2.5 h-2.5 mr-0.5" />}
            {statusConfig.label}
          </Badge>
          
          {/* Unread count */}
          {session.unread_count > 0 && (
            <Badge className="ml-auto h-5 w-5 p-0 flex items-center justify-center bg-blue-500 text-white text-[10px]">
              {session.unread_count > 9 ? '9+' : session.unread_count}
            </Badge>
          )}
        </div>
        
        {/* Email if available */}
        {session.partner_email && (
          <p className="text-xs text-muted-foreground truncate">
            {session.partner_email}
          </p>
        )}
        
        {/* Preview */}
        <p className={cn(
          'text-sm truncate mt-0.5',
          session.unread_count > 0 ? 'text-foreground/80 font-medium' : 'text-muted-foreground'
        )}>
          {session.latest_message?.is_from_partner ? '' : 'You: '}
          {session.latest_message?.content || 'New chat session'}
        </p>
        
        {/* Source URL */}
        {session.source_url && (
          <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
            <ExternalLink className="w-3 h-3" />
            <span className="truncate">{new URL(session.source_url).pathname}</span>
          </div>
        )}
      </div>
      
      {/* Time */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatRelativeTime(session.latest_message?.created_at)}
        </span>
        
        {/* Project badge if available */}
        {session.project && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {session.project.title}
          </Badge>
        )}
      </div>
    </button>
  )
}

// Format relative time
function formatRelativeTime(dateString) {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'Now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default LiveChatThreadItem
