// src/components/echo/EchoThreadItem.jsx
// Thread list item with Echo-specific styling

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Sparkles } from 'lucide-react'
import EchoAvatar from './EchoAvatar'

export function EchoThreadItem({ 
  thread, 
  isSelected = false, 
  unreadCount = 0,
  onClick,
  className 
}) {
  const isEchoThread = thread.thread_type === 'echo' || thread.is_ai || thread.contact?.is_ai
  
  return (
    <button
      onClick={() => onClick?.(thread)}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-lg',
        'text-left transition-all duration-150',
        isSelected 
          ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800' 
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
        isEchoThread && !isSelected && 'bg-gradient-to-r from-transparent via-emerald-50/30 to-transparent dark:via-emerald-950/20',
        className
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {isEchoThread ? (
          <EchoAvatar size="md" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
            {thread.name?.charAt(0) || thread.contact?.name?.charAt(0) || '?'}
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            'font-medium truncate',
            unreadCount > 0 && 'text-foreground',
            !unreadCount && 'text-muted-foreground'
          )}>
            {isEchoThread ? 'Echo' : (thread.name || thread.contact?.name || 'Unknown')}
          </span>
          
          {isEchoThread && (
            <Badge 
              variant="secondary" 
              className="text-[10px] px-1.5 py-0 h-4 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            >
              <Sparkles className="w-2.5 h-2.5 mr-0.5" />
              AI
            </Badge>
          )}
          
          {unreadCount > 0 && (
            <Badge className="ml-auto h-5 w-5 p-0 flex items-center justify-center bg-emerald-500 text-white text-[10px]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </div>
        
        <p className={cn(
          'text-sm truncate mt-0.5',
          unreadCount > 0 ? 'text-foreground/80' : 'text-muted-foreground'
        )}>
          {thread.lastMessage || thread.preview || 'Start a conversation...'}
        </p>
      </div>
      
      {/* Status/Time */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        {isEchoThread ? (
          <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(thread.lastMessageAt || thread.updated_at)}
          </span>
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

export default EchoThreadItem
