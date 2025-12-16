/**
 * ScoreRing - Animated circular progress indicator
 * Perfect for performance scores, lead quality, completion percentages
 */
import { cn } from '@/lib/utils'

export default function ScoreRing({
  value, // 0-100
  max = 100,
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  thickness = 'normal', // 'thin' | 'normal' | 'thick'
  showValue = true,
  label,
  color = 'auto', // 'auto' | 'brand' | 'blue' | 'success' | 'warning' | 'error'
  animated = true,
  className
}) {
  const sizes = {
    sm: { size: 40, font: 'text-xs', labelFont: 'text-[8px]' },
    md: { size: 56, font: 'text-sm', labelFont: 'text-[10px]' },
    lg: { size: 72, font: 'text-lg', labelFont: 'text-xs' },
    xl: { size: 96, font: 'text-2xl', labelFont: 'text-sm' }
  }

  const thicknesses = {
    thin: 3,
    normal: 4,
    thick: 6
  }

  const { size: svgSize, font, labelFont } = sizes[size]
  const strokeWidth = thicknesses[thickness]
  const radius = (svgSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const percentage = Math.min(Math.max(value / max, 0), 1)
  const strokeDashoffset = circumference * (1 - percentage)

  // Auto-color based on value
  const getColor = () => {
    if (color !== 'auto') {
      const colors = {
        brand: 'stroke-[var(--brand-primary)]',
        blue: 'stroke-[#4bbf39]',
        success: 'stroke-[#4bbf39]',
        warning: 'stroke-amber-500',
        error: 'stroke-red-500'
      }
      return colors[color]
    }
    
    if (percentage >= 0.9) return 'stroke-[#4bbf39]'
    if (percentage >= 0.5) return 'stroke-amber-500'
    return 'stroke-red-500'
  }

  const getTextColor = () => {
    if (color !== 'auto') {
      const colors = {
        brand: 'text-[var(--brand-primary)]',
        blue: 'text-[#4bbf39]',
        success: 'text-[#4bbf39]',
        warning: 'text-amber-600',
        error: 'text-red-600'
      }
      return colors[color]
    }
    
    if (percentage >= 0.9) return 'text-[#4bbf39]'
    if (percentage >= 0.5) return 'text-amber-600'
    return 'text-red-600'
  }

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={svgSize}
        height={svgSize}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-[var(--glass-border-strong)]"
        />
        
        {/* Progress circle */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn(
            getColor(),
            animated && 'transition-[stroke-dashoffset] duration-700 ease-out'
          )}
        />
      </svg>
      
      {showValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-bold', font, getTextColor())}>
            {Math.round(value)}
          </span>
          {label && (
            <span className={cn('text-[var(--text-tertiary)] uppercase tracking-wider', labelFont)}>
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
