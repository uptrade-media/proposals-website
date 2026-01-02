// src/components/echo/EchoAvatar.jsx
// Echo's animated avatar with online indicator
// Uses /echologo.svg for the Echo brand mark

import { cn } from '@/lib/utils'

export function EchoAvatar({ size = 'md', className, showStatus = true }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  const logoSizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-7 h-7',
    xl: 'w-10 h-10'
  }

  return (
    <div className={cn('relative', className)}>
      {/* Avatar circle with gradient */}
      <div className={cn(
        sizeClasses[size],
        'rounded-full bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600',
        'flex items-center justify-center',
        'shadow-lg shadow-emerald-500/20'
      )}>
        {/* Echo logo SVG */}
        <img 
          src="/echologo.svg" 
          alt="Echo AI" 
          className={cn(logoSizes[size], 'object-contain')}
        />
      </div>
      
      {/* Online status indicator */}
      {showStatus && (
        <span className={cn(
          'absolute -bottom-0.5 -right-0.5',
          'w-3 h-3 rounded-full',
          'bg-emerald-400 border-2 border-white dark:border-gray-900',
          'shadow-sm',
          'flex items-center justify-center'
        )}>
          {/* Sparkle indicator */}
          <span className="text-[6px]">✨</span>
        </span>
      )}
    </div>
  )
}

export default EchoAvatar
