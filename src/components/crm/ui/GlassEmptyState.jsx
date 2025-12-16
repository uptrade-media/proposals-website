/**
 * GlassEmptyState - Beautiful empty state with glass styling
 * Used when lists or sections have no data
 */
import { cn } from '@/lib/utils'

export default function GlassEmptyState({
  icon: Icon,
  title,
  description,
  action, // { label, onClick, icon: Icon }
  size = 'md', // 'sm' | 'md' | 'lg'
  className
}) {
  const sizes = {
    sm: {
      container: 'py-8',
      icon: 'h-8 w-8',
      iconWrapper: 'p-3',
      title: 'text-sm',
      description: 'text-xs'
    },
    md: {
      container: 'py-12',
      icon: 'h-10 w-10',
      iconWrapper: 'p-4',
      title: 'text-base',
      description: 'text-sm'
    },
    lg: {
      container: 'py-16',
      icon: 'h-12 w-12',
      iconWrapper: 'p-5',
      title: 'text-lg',
      description: 'text-base'
    }
  }

  const style = sizes[size]

  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      style.container,
      className
    )}>
      {Icon && (
        <div className={cn(
          'rounded-2xl glass-inset mb-4',
          style.iconWrapper
        )}>
          <Icon className={cn(
            'text-[var(--text-tertiary)]',
            style.icon
          )} />
        </div>
      )}
      
      {title && (
        <h3 className={cn(
          'font-semibold text-[var(--text-primary)] mb-1',
          style.title
        )}>
          {title}
        </h3>
      )}
      
      {description && (
        <p className={cn(
          'text-[var(--text-tertiary)] max-w-sm',
          style.description
        )}>
          {description}
        </p>
      )}
      
      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            'mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl',
            'bg-[var(--brand-primary)] text-white font-medium',
            'hover:bg-[var(--brand-primary)]/90 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50'
          )}
        >
          {action.icon && <action.icon className="h-4 w-4" />}
          {action.label}
        </button>
      )}
    </div>
  )
}
