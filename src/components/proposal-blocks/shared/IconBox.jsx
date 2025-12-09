/**
 * IconBox - Decorative icon container
 */

import { cn } from '@/lib/utils'

export function IconBox({
  icon: Icon,
  size = 'default',
  variant = 'gradient',
  className = ''
}) {
  const sizeClasses = {
    sm: 'p-2 rounded-lg',
    default: 'p-3 rounded-xl',
    lg: 'p-4 rounded-2xl'
  }
  
  const iconSizes = {
    sm: 'w-4 h-4',
    default: 'w-5 h-5',
    lg: 'w-6 h-6'
  }
  
  const variantClasses = {
    gradient: 'bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-teal)] text-white',
    subtle: 'bg-[var(--brand-green)]/10 text-[var(--brand-green)]',
    outline: 'border-2 border-[var(--brand-green)] text-[var(--brand-green)]',
    dark: 'bg-gray-900 text-white'
  }

  return (
    <div className={cn(
      sizeClasses[size],
      variantClasses[variant],
      'flex items-center justify-center flex-shrink-0',
      className
    )}>
      <Icon className={iconSizes[size]} />
    </div>
  )
}
