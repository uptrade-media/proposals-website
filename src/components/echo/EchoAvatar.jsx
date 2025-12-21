// src/components/echo/EchoAvatar.jsx
// Echo's animated avatar with online indicator

import { cn } from '@/lib/utils'

export function EchoAvatar({ size = 'md', className, showStatus = true }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  }

  return (
    <div className={cn('relative', className)}>
      {/* Avatar circle with gradient */}
      <div className={cn(
        sizeClasses[size],
        'rounded-full bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600',
        'flex items-center justify-center',
        'shadow-lg shadow-emerald-500/20',
        'animate-pulse-subtle'
      )}>
        {/* Signal logo icon */}
        <svg
          viewBox="0 0 24 24"
          className={cn(iconSizes[size], 'text-white')}
          fill="currentColor"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
        </svg>
      </div>
      
      {/* Online status indicator */}
      {showStatus && (
        <span className={cn(
          'absolute -bottom-0.5 -right-0.5',
          'w-3 h-3 rounded-full',
          'bg-emerald-400 border-2 border-white dark:border-gray-900',
          'shadow-sm'
        )}>
          {/* Sparkle indicator */}
          <span className="absolute inset-0 flex items-center justify-center text-[6px]">
            ✨
          </span>
        </span>
      )}
    </div>
  )
}

export default EchoAvatar
