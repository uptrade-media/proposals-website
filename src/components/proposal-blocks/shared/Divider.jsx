/**
 * Divider - Section separator
 */

import { cn } from '@/lib/utils'

export function Divider({ 
  label,
  className = '' 
}) {
  if (label) {
    return (
      <div className={cn('flex items-center gap-4 my-10 sm:my-14', className)}>
        <div className="flex-1 h-px bg-[var(--glass-border)]" />
        <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
          {label}
        </span>
        <div className="flex-1 h-px bg-[var(--glass-border)]" />
      </div>
    )
  }
  
  return (
    <div className={cn('h-px bg-[var(--glass-border)] my-10 sm:my-14', className)} />
  )
}
