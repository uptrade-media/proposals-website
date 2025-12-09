/**
 * Shared Stats Components
 * 
 * Visual stat cards and grids for metrics display.
 */

import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

// Individual stat card
export function StatCard({
  value,
  label,
  change,
  trend = 'neutral', // 'up' | 'down' | 'neutral'
  size = 'default', // 'sm' | 'default' | 'lg'
  className = ''
}) {
  const sizeClasses = {
    sm: 'p-3',
    default: 'p-4 sm:p-5',
    lg: 'p-6 sm:p-8'
  }
  
  const valueSizes = {
    sm: 'text-xl',
    default: 'text-2xl sm:text-3xl',
    lg: 'text-3xl sm:text-4xl lg:text-5xl'
  }
  
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-[var(--text-tertiary)]'
  }

  return (
    <div className={cn(
      'rounded-xl bg-[var(--glass-bg)] backdrop-blur-sm border border-[var(--glass-border)]',
      sizeClasses[size],
      className
    )}>
      <div className={cn(
        'font-bold bg-gradient-to-r from-[var(--brand-green)] to-[var(--brand-teal)] bg-clip-text text-transparent',
        valueSizes[size]
      )}>
        {value}
      </div>
      
      <div className="text-sm text-[var(--text-secondary)] mt-1">
        {label}
      </div>
      
      {change && (
        <div className={cn('flex items-center gap-1 text-xs mt-2', trendColors[trend])}>
          {trend === 'up' && <TrendingUp className="w-3 h-3" />}
          {trend === 'down' && <TrendingDown className="w-3 h-3" />}
          <span>{change}</span>
        </div>
      )}
    </div>
  )
}

// Stats grid wrapper
export function StatsGrid({
  children,
  columns = 4,
  className = ''
}) {
  const colClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4'
  }

  return (
    <div className={cn(
      'grid gap-4',
      colClasses[columns] || colClasses[4],
      className
    )}>
      {children}
    </div>
  )
}
