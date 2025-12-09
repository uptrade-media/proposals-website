/**
 * Callout - Highlight important information
 */

import { cn } from '@/lib/utils'
import { Info, AlertTriangle, CheckCircle2, Lightbulb, XCircle } from 'lucide-react'

const variants = {
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: Info,
    iconColor: 'text-blue-600',
    textColor: 'text-blue-800 dark:text-blue-300'
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
    textColor: 'text-amber-800 dark:text-amber-300'
  },
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    icon: CheckCircle2,
    iconColor: 'text-green-600',
    textColor: 'text-green-800 dark:text-green-300'
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    icon: XCircle,
    iconColor: 'text-red-600',
    textColor: 'text-red-800 dark:text-red-300'
  },
  tip: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-200 dark:border-purple-800',
    icon: Lightbulb,
    iconColor: 'text-purple-600',
    textColor: 'text-purple-800 dark:text-purple-300'
  }
}

export function Callout({
  variant = 'info',
  title,
  children,
  className = ''
}) {
  const config = variants[variant] || variants.info
  const Icon = config.icon

  return (
    <div className={cn(
      'flex gap-3 p-4 sm:p-5 rounded-xl border',
      config.bg,
      config.border,
      className
    )}>
      <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', config.iconColor)} />
      <div className={config.textColor}>
        {title && (
          <p className="font-semibold mb-1">{title}</p>
        )}
        <div className="text-sm">{children}</div>
      </div>
    </div>
  )
}
