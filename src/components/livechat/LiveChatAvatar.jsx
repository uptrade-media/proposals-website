// src/components/livechat/LiveChatAvatar.jsx
// Avatar for live chat visitors

import { cn } from '@/lib/utils'
import { MessageCircle, User } from 'lucide-react'

export function LiveChatAvatar({ 
  name, 
  size = 'md', 
  status = 'active',
  className 
}) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg'
  }

  const statusColors = {
    active: 'bg-blue-500',
    ai: 'bg-purple-500',
    pending_handoff: 'bg-amber-500',
    human: 'bg-emerald-500',
    closed: 'bg-gray-400'
  }

  // Get initials from name
  const initials = name 
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : null

  return (
    <div className={cn('relative', className)}>
      {/* Avatar circle */}
      <div className={cn(
        sizeClasses[size],
        'rounded-full bg-gradient-to-br from-blue-400 to-indigo-600',
        'flex items-center justify-center text-white font-medium',
        'shadow-md'
      )}>
        {initials ? (
          initials
        ) : (
          <User className="w-1/2 h-1/2" />
        )}
      </div>
      
      {/* Status indicator */}
      <span className={cn(
        'absolute -bottom-0.5 -right-0.5',
        'w-3 h-3 rounded-full border-2 border-white dark:border-gray-900',
        statusColors[status] || statusColors.active
      )}>
        {status === 'pending_handoff' && (
          <span className="absolute inset-0 rounded-full animate-ping bg-amber-400 opacity-75" />
        )}
      </span>
      
      {/* Live chat indicator */}
      <div className="absolute -top-1 -left-1 bg-blue-500 rounded-full p-0.5">
        <MessageCircle className="w-2.5 h-2.5 text-white" />
      </div>
    </div>
  )
}

export default LiveChatAvatar
