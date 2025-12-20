/**
 * UserAvatar - Avatar with optional status indicator
 */
import { cn } from '@/lib/utils'

const GRADIENTS = {
  brand: 'from-[var(--brand-primary)] to-[var(--brand-secondary)]',
  purple: 'from-purple-500 to-purple-600',
  blue: 'from-blue-500 to-blue-600',
  green: 'from-green-500 to-green-600',
  amber: 'from-amber-500 to-amber-600',
  gray: 'from-gray-500 to-gray-600'
}

const STATUS_COLORS = {
  online: 'bg-green-400 ring-2 ring-[var(--surface-primary)]',
  away: 'bg-amber-400 ring-2 ring-[var(--surface-primary)]',
  offline: 'bg-gray-400 ring-2 ring-[var(--surface-primary)]'
}

export default function UserAvatar({
  name,
  email,
  src,
  size = 'md',
  gradient = 'brand',
  status, // 'online' | 'away' | 'offline' | undefined
  className
}) {
  const initials = name 
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : email?.charAt(0)?.toUpperCase() || '?'

  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg'
  }

  const statusSizes = {
    xs: 'h-1.5 w-1.5 -bottom-0 -right-0',
    sm: 'h-2 w-2 -bottom-0.5 -right-0.5',
    md: 'h-2.5 w-2.5 -bottom-0.5 -right-0.5',
    lg: 'h-3 w-3 -bottom-0.5 -right-0.5',
    xl: 'h-4 w-4 -bottom-1 -right-1'
  }

  return (
    <div className={cn("relative inline-block", className)}>
      <div className={cn(
        "rounded-full flex items-center justify-center font-semibold text-white bg-gradient-to-br",
        sizeClasses[size],
        GRADIENTS[gradient]
      )}>
        {src ? (
          <img 
            src={src} 
            alt={name || email} 
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </div>
      
      {status && (
        <span className={cn(
          "absolute rounded-full",
          statusSizes[size],
          STATUS_COLORS[status]
        )} />
      )}
    </div>
  )
}
