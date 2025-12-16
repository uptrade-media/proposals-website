/**
 * StatusBadge - Glass-styled status indicators
 * Used for pipeline stages, lead quality, sentiment, etc.
 */
import { cn } from '@/lib/utils'
import { Flame, Thermometer, Snowflake } from 'lucide-react'

// Lead quality badge with temperature metaphor
export function LeadQualityBadge({ score, size = 'sm' }) {
  if (score == null) return null
  
  let config
  if (score >= 71) {
    config = { 
      label: 'Hot', 
      bg: 'bg-gradient-to-r from-red-500/20 to-orange-500/20',
      border: 'border-red-300/50',
      text: 'text-red-600',
      icon: Flame 
    }
  } else if (score >= 41) {
    config = { 
      label: 'Warm', 
      bg: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20',
      border: 'border-amber-300/50',
      text: 'text-amber-600',
      icon: Thermometer 
    }
  } else {
    config = { 
      label: 'Cold', 
      bg: 'bg-gradient-to-r from-[#39bfb0]/20 to-[#4bbf39]/20',
      border: 'border-[#39bfb0]/50',
      text: 'text-[#39bfb0]',
      icon: Snowflake 
    }
  }
  
  const Icon = config.icon
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-medium backdrop-blur-sm border',
      config.bg, config.border, config.text, sizeClasses
    )}>
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      <span>{score}</span>
    </span>
  )
}

// Sentiment badge for call analysis
export function SentimentBadge({ sentiment, size = 'sm' }) {
  if (!sentiment) return null
  
  const configs = {
    positive: { 
      bg: 'bg-[#4bbf39]/15',
      border: 'border-[#4bbf39]/50',
      text: 'text-[#4bbf39]',
      label: 'Positive' 
    },
    neutral: { 
      bg: 'bg-gray-500/15',
      border: 'border-gray-300/50',
      text: 'text-gray-600',
      label: 'Neutral' 
    },
    negative: { 
      bg: 'bg-red-500/15',
      border: 'border-red-300/50',
      text: 'text-red-600',
      label: 'Negative' 
    },
    mixed: { 
      bg: 'bg-amber-500/15',
      border: 'border-amber-300/50',
      text: 'text-amber-600',
      label: 'Mixed' 
    }
  }
  
  const config = configs[sentiment] || configs.neutral
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
  
  return (
    <span className={cn(
      'inline-flex items-center rounded-full font-medium backdrop-blur-sm border',
      config.bg, config.border, config.text, sizeClasses
    )}>
      {config.label}
    </span>
  )
}

// Pipeline stage badge
export function StageBadge({ stage, config, size = 'sm', showIcon = true }) {
  if (!stage || !config) return null
  
  const Icon = config.icon
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-medium',
      config.bgLight, config.textColor, 'border', config.borderColor,
      sizeClasses
    )}>
      {showIcon && Icon && <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />}
      <span>{config.label}</span>
    </span>
  )
}

// Generic status badge
export function StatusBadge({ 
  status, 
  variant = 'default',
  size = 'sm',
  dot = false,
  className 
}) {
  const variants = {
    default: 'bg-gray-500/15 border-gray-300/50 text-gray-600',
    success: 'bg-[#4bbf39]/15 border-[#4bbf39]/50 text-[#4bbf39]',
    warning: 'bg-amber-500/15 border-amber-300/50 text-amber-600',
    error: 'bg-red-500/15 border-red-300/50 text-red-600',
    info: 'bg-[#4bbf39]/15 border-[#4bbf39]/50 text-[#4bbf39]',
    purple: 'bg-[#39bfb0]/15 border-[#39bfb0]/50 text-[#39bfb0]'
  }
  
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-medium backdrop-blur-sm border',
      variants[variant],
      sizeClasses,
      className
    )}>
      {dot && (
        <span className={cn(
          'rounded-full',
          size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2',
          variant === 'success' && 'bg-[#4bbf39]',
          variant === 'warning' && 'bg-amber-500',
          variant === 'error' && 'bg-red-500',
          variant === 'info' && 'bg-[#4bbf39]',
          variant === 'purple' && 'bg-[#39bfb0]',
          variant === 'default' && 'bg-gray-500'
        )} />
      )}
      {status}
    </span>
  )
}

export default StatusBadge
