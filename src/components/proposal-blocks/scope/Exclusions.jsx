/**
 * Exclusions - What's NOT included in the project scope
 * 
 * Critical for legal clarity and managing expectations.
 */

import { cn } from '@/lib/utils'
import { XCircle, AlertCircle, Info } from 'lucide-react'

export function Exclusions({
  title = "Out of Scope",
  subtitle = "The following items are not included in this proposal",
  items = [],
  note,
  className = ''
}) {
  return (
    <div className={cn(
      'p-6 sm:p-8 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700',
      className
    )}>
      <div className="flex items-start gap-3 mb-5">
        <AlertCircle className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">{title}</h3>
          {subtitle && (
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      
      <ul className="space-y-2 mb-4">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <XCircle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-[var(--text-secondary)]">{item}</span>
          </li>
        ))}
      </ul>
      
      {note && (
        <div className="flex items-start gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Info className="w-4 h-4 text-[var(--brand-green)] mt-0.5 flex-shrink-0" />
          <p className="text-sm text-[var(--text-secondary)]">{note}</p>
        </div>
      )}
    </div>
  )
}

// Inline exclusion note
export function ExclusionNote({ children, className = '' }) {
  return (
    <div className={cn(
      'flex items-start gap-2 p-4 rounded-lg bg-gray-100 dark:bg-gray-800',
      className
    )}>
      <AlertCircle className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
      <p className="text-sm text-[var(--text-secondary)]">{children}</p>
    </div>
  )
}
