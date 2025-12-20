/**
 * AccessLevelBadge - Shows organization vs project-level access
 */
import { cn } from '@/lib/utils'
import { Building2, FolderOpen } from 'lucide-react'

export const ACCESS_LEVELS = {
  organization: {
    icon: Building2,
    label: 'Organization',
    description: 'Full access to all projects, billing, and proposals',
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    borderColor: 'border-purple-400/30'
  },
  project: {
    icon: FolderOpen,
    label: 'Project Only',
    description: 'Access limited to assigned projects',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    borderColor: 'border-blue-400/30'
  }
}

export default function AccessLevelBadge({ 
  level = 'organization',
  size = 'md',
  showBorder = true,
  showLabel = true
}) {
  const config = ACCESS_LEVELS[level] || ACCESS_LEVELS.project
  const Icon = config.icon

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4'
  }

  return (
    <div className={cn(
      "flex items-center rounded-lg font-medium",
      config.bgColor, 
      config.color,
      showBorder && ['border', config.borderColor],
      sizeClasses[size]
    )}>
      <Icon className={iconSizes[size]} />
      {showLabel && config.label}
    </div>
  )
}
