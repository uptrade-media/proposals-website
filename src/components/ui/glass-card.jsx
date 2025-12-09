import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * GlassCard - A card component with frosted glass effect
 * 
 * Variants:
 * - default: Standard glass background with blur
 * - elevated: Slightly more opaque, stronger shadow (for modals, popovers)
 * - inset: Subtle inset appearance (for nested content)
 * - outline: Just a glass border, no fill
 */

const GlassCard = React.forwardRef(({ 
  className, 
  variant = "default",
  hover = false,
  ...props 
}, ref) => {
  const variants = {
    default: `
      bg-[var(--glass-bg)]
      backdrop-blur-[var(--blur-lg)]
      border border-[var(--glass-border)]
      shadow-[var(--shadow-glass)]
    `,
    elevated: `
      bg-[var(--glass-bg-elevated)]
      backdrop-blur-[var(--blur-xl)]
      border border-[var(--glass-border)]
      shadow-[var(--shadow-glass-elevated)]
    `,
    inset: `
      bg-[var(--glass-bg-inset)]
      border border-[var(--glass-border)]
    `,
    outline: `
      bg-transparent
      border border-[var(--glass-border-strong)]
    `,
  }

  const hoverStyles = hover ? `
    transition-all duration-200 ease-out
    hover:bg-[var(--glass-bg-hover)]
    hover:shadow-[var(--shadow-lg)]
    hover:-translate-y-0.5
    cursor-pointer
  ` : ''

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-[var(--radius-xl)]",
        variants[variant],
        hoverStyles,
        className
      )}
      {...props}
    />
  )
})
GlassCard.displayName = "GlassCard"

const GlassCardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5 p-6 pb-4",
      className
    )}
    {...props}
  />
))
GlassCardHeader.displayName = "GlassCardHeader"

const GlassCardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-xl font-semibold leading-none tracking-tight text-[var(--text-primary)]",
      className
    )}
    {...props}
  />
))
GlassCardTitle.displayName = "GlassCardTitle"

const GlassCardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-sm text-[var(--text-secondary)]",
      className
    )}
    {...props}
  />
))
GlassCardDescription.displayName = "GlassCardDescription"

const GlassCardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn("p-6 pt-0", className)} 
    {...props} 
  />
))
GlassCardContent.displayName = "GlassCardContent"

const GlassCardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center p-6 pt-4 border-t border-[var(--glass-border)]",
      className
    )}
    {...props}
  />
))
GlassCardFooter.displayName = "GlassCardFooter"

export { 
  GlassCard, 
  GlassCardHeader, 
  GlassCardTitle, 
  GlassCardDescription, 
  GlassCardContent, 
  GlassCardFooter 
}
