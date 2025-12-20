/**
 * StatusBadge - User status indicator (active, pending, inactive)
 */
import { cn } from '@/lib/utils'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'

export const STATUS_CONFIG = {
  active: { 
    icon: CheckCircle2,
    label: 'Active', 
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    borderColor: 'border-green-400/30',
    dotColor: 'bg-green-400'
  },
  pending: { 
    icon: Clock,
    label: 'Pending', 
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10',
    borderColor: 'border-amber-400/30',
    dotColor: 'bg-amber-400'
  },
  inactive: { 
    icon: XCircle,
    label: 'Inactive', 
    color: 'text-gray-400',
    bgColor: 'bg-gray-400/10',
    borderColor: 'border-gray-400/30',
    dotColor: 'bg-gray-400'
  }
}

export default function StatusBadge({ 
  status = 'active',
  size = 'md',
  variant = 'badge', // 'badge' | 'dot' | 'icon'
  showBorder = false
}) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const Icon = config.icon

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2'
  }

  const dotSizes = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-2.5 w-2.5'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4'
  }

  if (variant === 'dot') {
    return (
      <span className={cn(
        "rounded-full",
        config.dotColor,
        dotSizes[size]
      )} />
    )
  }

  if (variant === 'icon') {
    return <Icon className={cn(iconSizes[size], config.color)} />
  }

  return (
    <div className={cn(
      "flex items-center rounded-lg font-medium",
      config.bgColor, 
      config.color,
      showBorder && ['border', config.borderColor],
      sizeClasses[size]
    )}>
      {config.label}
    </div>
  )
}
