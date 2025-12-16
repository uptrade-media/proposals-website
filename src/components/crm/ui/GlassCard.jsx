/**
 * GlassCard - Frosted glass card component following Apple's liquid glass design
 * 
 * Variants:
 * - default: Standard frosted glass with subtle border
 * - elevated: Stronger blur and shadow for modals/overlays  
 * - inset: Subtle inset appearance for nested content
 * - interactive: Hover/active states for clickable cards
 */
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const GlassCard = forwardRef(({ 
  className, 
  variant = 'default',
  padding = 'md',
  hover = false,
  glow = null, // 'success' | 'warning' | 'error' | 'brand' | color string
  children,
  ...props 
}, ref) => {
  const variants = {
    default: 'glass',
    elevated: 'glass-elevated',
    inset: 'glass-inset',
    interactive: 'glass hover:bg-[var(--glass-bg-hover)] active:scale-[0.99] cursor-pointer'
  }

  const paddings = {
    none: '',
    xs: 'p-2',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8'
  }

  const glowColors = {
    success: 'shadow-[0_0_20px_rgba(52,199,89,0.15)]',
    warning: 'shadow-[0_0_20px_rgba(255,149,0,0.15)]',
    error: 'shadow-[0_0_20px_rgba(255,59,48,0.15)]',
    brand: 'shadow-[0_0_20px_rgba(75,191,57,0.15)]',
    blue: 'shadow-[0_0_20px_rgba(0,122,255,0.15)]',
    purple: 'shadow-[0_0_20px_rgba(175,82,222,0.15)]'
  }

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl transition-all duration-300',
        variants[variant],
        paddings[padding],
        hover && 'hover:shadow-lg hover:-translate-y-0.5',
        glow && glowColors[glow],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})

GlassCard.displayName = 'GlassCard'

export default GlassCard
