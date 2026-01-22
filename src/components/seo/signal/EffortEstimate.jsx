// src/components/seo/signal/EffortEstimate.jsx
// Displays effort estimates for SEO tasks: "🕐 2 min" or "🕐 30 min (dev needed)"
import { Clock, Wrench, Code, Sparkles } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * Effort configuration for different task types
 * Maps effort score (1-10) to human-readable time estimates
 */
const EFFORT_CONFIG = {
  // Effort 1-2: Quick fixes, AI can auto-apply
  1: { 
    time: '< 1 min', 
    label: 'Instant', 
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    canAutoApply: true,
    needsDev: false,
    icon: Sparkles
  },
  2: { 
    time: '1-2 min', 
    label: 'Quick', 
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    canAutoApply: true,
    needsDev: false,
    icon: Sparkles
  },
  
  // Effort 3-4: Easy manual fixes
  3: { 
    time: '2-5 min', 
    label: 'Easy', 
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    canAutoApply: false,
    needsDev: false,
    icon: Clock
  },
  4: { 
    time: '5-10 min', 
    label: 'Easy', 
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    canAutoApply: false,
    needsDev: false,
    icon: Clock
  },
  
  // Effort 5-6: Moderate effort
  5: { 
    time: '10-20 min', 
    label: 'Moderate', 
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    canAutoApply: false,
    needsDev: false,
    icon: Clock
  },
  6: { 
    time: '20-30 min', 
    label: 'Moderate', 
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    canAutoApply: false,
    needsDev: false,
    icon: Wrench
  },
  
  // Effort 7-8: Requires some dev work
  7: { 
    time: '30-60 min', 
    label: 'Dev Needed', 
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    canAutoApply: false,
    needsDev: true,
    icon: Code
  },
  8: { 
    time: '1-2 hours', 
    label: 'Dev Needed', 
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    canAutoApply: false,
    needsDev: true,
    icon: Code
  },
  
  // Effort 9-10: Significant dev work
  9: { 
    time: '2-4 hours', 
    label: 'Major Task', 
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    canAutoApply: false,
    needsDev: true,
    icon: Code
  },
  10: { 
    time: '4+ hours', 
    label: 'Major Task', 
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    canAutoApply: false,
    needsDev: true,
    icon: Code
  }
}

/**
 * Get effort configuration for a given score
 * If effort is not set, estimate based on task type
 */
export function getEffortConfig(effort, taskType = null) {
  // If effort is provided, use it directly
  if (effort && EFFORT_CONFIG[effort]) {
    return EFFORT_CONFIG[effort]
  }
  
  // Otherwise, estimate based on task type
  const taskEffortMap = {
    // Quick fixes (effort 1-2)
    'title_optimization': 2,
    'meta_optimization': 2,
    'missing-title': 2,
    'missing-meta': 2,
    'title-too-short': 2,
    'title-too-long': 2,
    'meta-too-short': 2,
    'meta-too-long': 2,
    
    // Easy fixes (effort 3-4)
    'images-missing-alt': 3,
    'missing-h1': 3,
    'multiple-h1': 3,
    'internal_linking': 4,
    
    // Moderate effort (effort 5-6)
    'content_refresh': 5,
    'thin-content': 6,
    'featured_snippet': 5,
    'schema': 5,
    'no-schema': 5,
    
    // Dev needed (effort 7-8)
    'page_speed': 7,
    'mobile': 7,
    'cannibalization': 7,
    'not-indexed': 7,
    
    // Major tasks (effort 9-10)
    'new_content': 8,
    'content_gap': 8,
    'backlink': 9,
  }
  
  const estimatedEffort = taskEffortMap[taskType] || 5 // Default to moderate
  return EFFORT_CONFIG[estimatedEffort]
}

/**
 * EffortEstimate - Displays effort estimate badge for SEO tasks
 * 
 * @param {number} effort - Effort score 1-10 (optional)
 * @param {string} taskType - Type of task for auto-estimation
 * @param {string} variant - 'badge' | 'inline' | 'compact'
 * @param {boolean} showTooltip - Whether to show detailed tooltip
 */
export default function EffortEstimate({ 
  effort, 
  taskType,
  variant = 'badge',
  showTooltip = true,
  className
}) {
  const config = getEffortConfig(effort, taskType)
  const Icon = config.icon
  
  const content = (
    <div className={cn(
      'inline-flex items-center gap-1',
      variant === 'badge' && `px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`,
      variant === 'inline' && `text-xs ${config.color}`,
      variant === 'compact' && `text-xs ${config.color}`,
      className
    )}>
      <Icon className="h-3 w-3" />
      {variant !== 'compact' && (
        <span>{config.time}</span>
      )}
      {variant === 'badge' && config.needsDev && (
        <span className="opacity-75">(dev)</span>
      )}
    </div>
  )
  
  if (!showTooltip) {
    return content
  }
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {content}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <p className="font-medium">{config.label}</p>
          <p className="text-xs text-[var(--text-secondary)]">
            Estimated time: {config.time}
          </p>
          {config.canAutoApply && (
            <p className="text-xs text-green-400">
              ✨ Can be auto-applied by AI
            </p>
          )}
          {config.needsDev && (
            <p className="text-xs text-orange-400">
              🔧 May require developer assistance
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Hook to get effort estimate for a task
 */
export function useEffortEstimate(effort, taskType) {
  return getEffortConfig(effort, taskType)
}

/**
 * Utility to calculate total effort for a list of tasks
 * Returns estimated total time and breakdown
 */
export function calculateTotalEffort(tasks) {
  let totalMinutes = 0
  let autoApplyCount = 0
  let devNeededCount = 0
  
  const timeToMinutes = {
    '< 1 min': 1,
    '1-2 min': 2,
    '2-5 min': 4,
    '5-10 min': 8,
    '10-20 min': 15,
    '20-30 min': 25,
    '30-60 min': 45,
    '1-2 hours': 90,
    '2-4 hours': 180,
    '4+ hours': 300
  }
  
  for (const task of tasks) {
    const config = getEffortConfig(task.effort, task.type)
    totalMinutes += timeToMinutes[config.time] || 15
    if (config.canAutoApply) autoApplyCount++
    if (config.needsDev) devNeededCount++
  }
  
  // Format total time
  let totalTimeLabel
  if (totalMinutes < 60) {
    totalTimeLabel = `${totalMinutes} min`
  } else if (totalMinutes < 120) {
    totalTimeLabel = `${Math.round(totalMinutes / 60 * 10) / 10} hour`
  } else {
    totalTimeLabel = `${Math.round(totalMinutes / 60 * 10) / 10} hours`
  }
  
  return {
    totalMinutes,
    totalTimeLabel,
    autoApplyCount,
    devNeededCount,
    taskCount: tasks.length
  }
}
