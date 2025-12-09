/**
 * Section - Core layout wrapper for proposal sections
 * 
 * Provides consistent spacing, backgrounds, and container widths
 * with Liquid Glass styling throughout.
 */

import { cn } from '@/lib/utils'

const variants = {
  default: 'bg-[var(--surface-primary)]',
  glass: 'bg-[var(--glass-bg)] backdrop-blur-xl',
  elevated: 'bg-[var(--surface-secondary)]',
  accent: 'bg-gradient-to-br from-[var(--brand-green)]/5 to-[var(--brand-teal)]/5',
  dark: 'bg-gray-900 text-white',
  gradient: 'bg-gradient-to-r from-[var(--brand-green)] to-[var(--brand-teal)] text-white'
}

const spacing = {
  none: '',
  sm: 'py-10 sm:py-12',
  md: 'py-14 sm:py-20',
  lg: 'py-20 sm:py-28',
  xl: 'py-28 sm:py-36'
}

export function Section({ 
  children, 
  variant = 'default',
  padding = 'md',
  container = true,
  className = '',
  id,
  ...props
}) {
  return (
    <section 
      id={id}
      className={cn(
        variants[variant],
        spacing[padding],
        'relative overflow-hidden',
        className
      )}
      {...props}
    >
      {container ? (
        <div className="max-w-4xl mx-auto px-6 sm:px-8">
          {children}
        </div>
      ) : children}
    </section>
  )
}

// Section header with optional badge and gradient text
export function SectionHeader({ 
  badge,
  title, 
  gradientText,
  subtitle,
  align = 'left',
  className = ''
}) {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center mx-auto'
  }

  return (
    <div className={cn('max-w-3xl mb-10 sm:mb-14', alignClasses[align], className)}>
      {badge && (
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-5
          bg-[var(--brand-green)]/10 text-[var(--brand-green)] border border-[var(--brand-green)]/20">
          {badge}
        </span>
      )}
      
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--text-primary)] leading-tight">
        {title}
        {gradientText && (
          <>
            {' '}
            <span className="bg-gradient-to-r from-[var(--brand-green)] to-[var(--brand-teal)] bg-clip-text text-transparent">
              {gradientText}
            </span>
          </>
        )}
      </h2>
      
      {subtitle && (
        <p className="text-lg sm:text-xl text-[var(--text-secondary)] mt-5 leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  )
}

// Gradient accent text inline
export function GradientText({ children, className = '' }) {
  return (
    <span className={cn(
      'bg-gradient-to-r from-[var(--brand-green)] to-[var(--brand-teal)] bg-clip-text text-transparent',
      className
    )}>
      {children}
    </span>
  )
}

// Section divider
export function Divider({ className = '' }) {
  return (
    <div className={cn('h-px bg-[var(--glass-border)] my-12 sm:my-16', className)} />
  )
}
