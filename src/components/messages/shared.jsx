/**
 * Shared Messages UI Components
 * 
 * These components are used by both:
 * - MessagesNew.jsx (full-page module)
 * - ChatBubbleSingle.jsx (floating widget)
 * 
 * Design: Liquid Glass aesthetic with consistent behavior
 */
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import {
  Check,
  CheckCheck,
  Loader2,
  MessageCircle,
  Clock
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import ContactAvatar from '@/components/ui/ContactAvatar'

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

export function formatMessageTime(date) {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })
}

export function formatRelativeTime(date) {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  
  const now = new Date()
  const diff = now - d
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatDateSeparator(date) {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  
  if (d.toDateString() === now.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// ─────────────────────────────────────────────────────────────────────────────
// Message Status Icon
// ─────────────────────────────────────────────────────────────────────────────

export function MessageStatusIcon({ message, className }) {
  const isPending = message.status === 'sending' || message._optimistic
  const isFailed = message.status === 'failed'
  const isDelivered = message.status === 'delivered' || message.delivered_at
  const isRead = message.status === 'read' || message.read_at || message.readAt

  if (isFailed) {
    return <span className={cn("text-[10px] text-red-400", className)}>Failed</span>
  }
  if (isPending) {
    return <Loader2 className={cn("h-3 w-3 animate-spin text-[var(--text-tertiary)]", className)} />
  }
  if (isRead) {
    return <CheckCheck className={cn("h-3 w-3 text-[var(--brand-primary)]", className)} />
  }
  if (isDelivered) {
    return <CheckCheck className={cn("h-3 w-3 text-[var(--text-tertiary)]", className)} />
  }
  // Sent (server received, not yet delivered)
  return <Check className={cn("h-3 w-3 text-[var(--text-tertiary)]", className)} />
}

// ─────────────────────────────────────────────────────────────────────────────
// Message Bubble - Core component for both module and widget
// ─────────────────────────────────────────────────────────────────────────────

export function MessageBubble({ 
  message, 
  isOwn, 
  showAvatar = true, 
  isFirst = false,
  compact = false, // Widget mode
  className
}) {
  const isPending = message.status === 'sending' || message._optimistic
  const isFailed = message.status === 'failed'
  
  // Echo messages are FROM Echo (not to Echo)
  const isEchoMessage = message.is_echo_response === true || 
                        message.sender?.is_ai === true || 
                        message.sender_id === '00000000-0000-0000-0000-000000000001'

  const sender = isEchoMessage 
    ? { name: 'Echo', is_ai: true, contact_type: 'ai' }
    : message.sender
  
  return (
    <div className={cn(
      "flex gap-2 group",
      compact ? "max-w-[85%]" : "max-w-[75%]",
      isOwn ? "ml-auto flex-row-reverse" : "",
      !isFirst && "mt-0.5",
      isPending && "opacity-70",
      className
    )}>
      {/* Avatar */}
      {!isOwn && (
        <div className={cn(compact ? "w-7" : "w-8", "flex-shrink-0")}>
          {showAvatar && (
            compact ? (
              <ContactAvatar 
                contact={sender}
                size="sm"
                showBadge={false}
                status={isEchoMessage ? 'online' : undefined}
              />
            ) : (
              <Avatar className={cn(compact ? "h-7 w-7" : "h-8 w-8")}>
                <AvatarImage src={sender?.avatar} />
                <AvatarFallback className="text-xs bg-[var(--glass-bg)] text-[var(--text-secondary)]">
                  {getInitials(sender?.name)}
                </AvatarFallback>
              </Avatar>
            )
          )}
        </div>
      )}
      
      <div className={cn(
        "flex flex-col",
        isOwn ? "items-end" : "items-start"
      )}>
        {/* Sender name (non-own messages) */}
        {!isOwn && showAvatar && (
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              "text-sm font-medium",
              isEchoMessage 
                ? "text-emerald-600 dark:text-emerald-400" 
                : "text-[var(--text-primary)]"
            )}>
              {sender?.name || 'Unknown'}
            </span>
            {!compact && (
              <span className="text-xs text-[var(--text-tertiary)]">
                {formatMessageTime(message.created_at || message.createdAt)}
              </span>
            )}
          </div>
        )}
        
        {/* Message content bubble */}
        <div className={cn(
          "px-3 py-2 text-sm leading-relaxed",
          compact ? "px-3 py-2 rounded-2xl" : "px-4 py-2.5 rounded-2xl",
          isOwn 
            ? isFailed 
              ? "bg-red-500/80 text-white rounded-br-lg"
              : "bg-[var(--brand-primary)] text-white rounded-br-lg shadow-sm shadow-[var(--brand-primary)]/20" 
            : isEchoMessage
              ? "bg-gradient-to-br from-emerald-50 to-teal-50/80 dark:from-emerald-950/50 dark:to-teal-950/30 text-[var(--text-primary)] rounded-bl-lg border border-emerald-200/50 dark:border-emerald-800/50"
              : "bg-[var(--glass-bg)] text-[var(--text-primary)] rounded-bl-lg border border-[var(--glass-border)]",
          message.streaming && "animate-pulse"
        )}>
          <p className="whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>
        
        {/* Time & status (own messages) */}
        {isOwn && (
          <div className="flex items-center gap-1 mt-1 px-1">
            <span className="text-[10px] text-[var(--text-tertiary)]">
              {formatMessageTime(message.created_at || message.createdAt)}
            </span>
            <MessageStatusIcon message={message} />
          </div>
        )}
        
        {/* Time only for non-own compact mode */}
        {!isOwn && compact && (
          <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5 px-1">
            {formatMessageTime(message.created_at || message.createdAt)}
          </span>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Date Separator
// ─────────────────────────────────────────────────────────────────────────────

export function DateSeparator({ date, compact = false }) {
  return (
    <div className={cn(
      "flex items-center justify-center",
      compact ? "my-3" : "my-6"
    )}>
      <div className="flex-1 border-t border-[var(--glass-border)]" />
      <span className={cn(
        "px-4 font-medium text-[var(--text-tertiary)] bg-[var(--surface-primary)]",
        compact ? "text-[10px]" : "text-xs"
      )}>
        {formatDateSeparator(date)}
      </span>
      <div className="flex-1 border-t border-[var(--glass-border)]" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Unread Divider
// ─────────────────────────────────────────────────────────────────────────────

export const UnreadDivider = forwardRef(function UnreadDivider({ count, compact = false }, ref) {
  return (
    <div ref={ref} className={cn(
      "flex items-center justify-center scroll-mt-24",
      compact ? "my-2" : "my-4"
    )}>
      <div className="flex-1 border-t border-red-500/40" />
      <span className={cn(
        "px-3 font-medium text-red-400 bg-[var(--surface-primary)]",
        compact ? "text-[10px]" : "text-xs"
      )}>
        {count} new message{count !== 1 ? 's' : ''}
      </span>
      <div className="flex-1 border-t border-red-500/40" />
    </div>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// Typing Indicator
// ─────────────────────────────────────────────────────────────────────────────

export function TypingIndicator({ names = [], users, compact = false }) {
  // Accept either names (array of strings) or users (array of objects)
  const displayNames = names.length > 0 
    ? names 
    : (users || []).map(u => u.name || 'Someone')
  
  if (displayNames.length === 0) return null
  
  const nameStr = displayNames.join(', ')
  
  return (
    <div className={cn(
      "flex items-center gap-2 text-[var(--text-tertiary)]",
      compact ? "px-3 py-1.5 text-xs" : "px-0 py-0 text-sm"
    )}>
      <div className="flex gap-1">
        <span 
          className="w-2 h-2 rounded-full bg-[var(--text-tertiary)] animate-bounce" 
          style={{ animationDelay: '0ms' }} 
        />
        <span 
          className="w-2 h-2 rounded-full bg-[var(--text-tertiary)] animate-bounce" 
          style={{ animationDelay: '150ms' }} 
        />
        <span 
          className="w-2 h-2 rounded-full bg-[var(--text-tertiary)] animate-bounce" 
          style={{ animationDelay: '300ms' }} 
        />
      </div>
      <span>
        {nameStr} {displayNames.length === 1 ? 'is' : 'are'} typing...
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversation List Item
// ─────────────────────────────────────────────────────────────────────────────

export function ConversationItem({ 
  conversation, 
  isActive, 
  onClick, 
  currentUserId,
  compact = false,
  disabled = false
}) {
  const hasUnread = (conversation.unreadCount || conversation.unread_count || 0) > 0
  const isEcho = conversation.is_ai || conversation.is_echo || conversation.thread_type === 'echo'
  const otherParticipant = conversation.recipient?.id === currentUserId 
    ? conversation.sender 
    : conversation.recipient

  const displayName = isEcho 
    ? 'Echo' 
    : (conversation.partner_name || otherParticipant?.name || conversation.contact?.name || conversation.sender_name || conversation.recipient_name || 'Unknown')
  
  const contact = isEcho 
    ? { name: 'Echo', is_ai: true, contact_type: 'ai' }
    : (conversation.contact || otherParticipant)

  // Get accent style based on contact type
  const getAccentBg = () => {
    if (isEcho) return 'bg-gradient-to-r from-emerald-500/5 to-transparent'
    if (contact?.contact_type === 'visitor') return 'bg-gradient-to-r from-amber-500/5 to-transparent'
    return ''
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-3 rounded-xl transition-all text-left group",
        compact ? "p-2.5" : "p-3",
        isActive 
          ? "bg-[var(--glass-bg-active)] ring-1 ring-[var(--brand-primary)]/30" 
          : "hover:bg-[var(--glass-bg-hover)]",
        disabled && "opacity-50 cursor-not-allowed",
        getAccentBg()
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <ContactAvatar
          contact={contact}
          size={compact ? "sm" : "md"}
          status={conversation.online || isEcho ? 'online' : 'offline'}
          showBadge
        />
        {hasUnread && !disabled && (
          <Badge className={cn(
            "absolute -top-1 -right-1 rounded-full flex items-center justify-center bg-[var(--brand-primary)] text-white border-2 border-[var(--surface-primary)]",
            compact ? "h-4 min-w-4 px-0.5 text-[9px]" : "h-5 min-w-5 px-1 text-[10px]"
          )}>
            {conversation.unreadCount || conversation.unread_count}
          </Badge>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={cn(
              "font-medium truncate",
              compact ? "text-sm" : "text-sm",
              hasUnread ? "text-[var(--text-primary)]" : "text-[var(--text-primary)]"
            )}>
              {displayName}
            </span>
            {isEcho && (
              <Badge className="text-[9px] px-1.5 py-0 h-4 border-0 font-medium bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                AI
              </Badge>
            )}
          </div>
          <span className="text-[10px] text-[var(--text-tertiary)] shrink-0">
            {formatRelativeTime(conversation.lastMessageAt || conversation.last_message_at)}
          </span>
        </div>
        <p className={cn(
          "text-xs truncate mt-0.5",
          hasUnread 
            ? "text-[var(--text-secondary)] font-medium" 
            : "text-[var(--text-tertiary)]"
        )}>
          {isEcho 
            ? 'Your AI teammate' 
            : (conversation.lastMessage?.content || conversation.last_message?.content || conversation.lastMessage || conversation.last_message || 'No messages yet')}
        </p>
      </div>
      
      {/* Open indicator for widget */}
      {disabled && (
        <span className="text-[10px] text-[var(--text-tertiary)] bg-[var(--glass-bg)] px-2 py-0.5 rounded-full">
          Open
        </span>
      )}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────────────────────────────────────

export function MessagesEmptyState({ onNewMessage, compact = false }) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      compact ? "py-8 px-4" : "py-16 px-8"
    )}>
      <div className={cn(
        "rounded-full bg-[var(--glass-bg)] flex items-center justify-center border border-[var(--glass-border)]",
        compact ? "w-12 h-12 mb-3" : "w-16 h-16 mb-4"
      )}>
        <MessageCircle className={cn(
          "text-[var(--text-tertiary)]",
          compact ? "h-5 w-5" : "h-7 w-7"
        )} />
      </div>
      <h3 className={cn(
        "font-semibold text-[var(--text-primary)]",
        compact ? "text-base mb-1" : "text-xl mb-2"
      )}>
        {compact ? 'No messages' : 'Your Messages'}
      </h3>
      <p className={cn(
        "text-[var(--text-tertiary)] max-w-sm",
        compact ? "text-xs mb-3" : "text-sm mb-6"
      )}>
        {compact 
          ? 'Start a conversation' 
          : 'Send private messages to team members and clients. Start a new conversation to get started.'}
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Message List - Groups messages by date with unread divider
// ─────────────────────────────────────────────────────────────────────────────

export function MessageList({ 
  messages, 
  currentUserId, 
  unreadDividerRef,
  firstUnreadIndex,
  unreadCount,
  compact = false,
  isLoading = false
}) {
  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const dateStr = message.created_at || message.createdAt
    if (!dateStr) return groups
    
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return groups
    
    const dateKey = date.toDateString()
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(message)
    return groups
  }, {})

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-primary)]" />
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className={cn(
        "text-center text-[var(--text-tertiary)]",
        compact ? "py-8" : "py-12"
      )}>
        <p className={compact ? "text-xs" : "text-sm"}>
          No messages yet. Send a message to start the conversation.
        </p>
      </div>
    )
  }

  return (
    <>
      {Object.entries(groupedMessages).map(([date, dateMessages]) => (
        <div key={date}>
          <DateSeparator date={date} compact={compact} />
          {dateMessages.map((msg, idx) => {
            const isOwn = msg.sender_id === currentUserId || msg.senderId === currentUserId
            const prevMsg = dateMessages[idx - 1]
            const showAvatar = !prevMsg || 
              (prevMsg.sender_id || prevMsg.senderId) !== (msg.sender_id || msg.senderId)
            
            // Check if this is the first unread message
            const globalIdx = messages.findIndex(m => m.id === msg.id)
            const isFirstUnread = globalIdx === firstUnreadIndex && unreadCount > 0
            
            return (
              <div key={msg.id}>
                {isFirstUnread && (
                  <UnreadDivider 
                    ref={unreadDividerRef} 
                    count={unreadCount} 
                    compact={compact}
                  />
                )}
                <MessageBubble 
                  message={msg} 
                  isOwn={isOwn}
                  showAvatar={showAvatar}
                  isFirst={showAvatar}
                  compact={compact}
                />
              </div>
            )
          })}
        </div>
      ))}
    </>
  )
}
