/**
 * RoleBadge - Displays user role with appropriate icon and color
 * Used for both Uptrade team roles and project member roles
 */
import { cn } from '@/lib/utils'
import { Crown, Shield, Briefcase, Code, Eye, Users, Building2 } from 'lucide-react'

// Uptrade internal team roles
export const UPTRADE_ROLES = {
  admin: { 
    icon: Crown, 
    label: 'Admin', 
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10',
    borderColor: 'border-amber-400/30'
  },
  manager: { 
    icon: Shield, 
    label: 'Manager', 
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    borderColor: 'border-purple-400/30'
  },
  sales_rep: { 
    icon: Briefcase, 
    label: 'Sales Rep', 
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    borderColor: 'border-blue-400/30'
  },
  developer: { 
    icon: Code, 
    label: 'Developer', 
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    borderColor: 'border-green-400/30'
  }
}

// Organization member roles
export const ORG_ROLES = {
  owner: { 
    icon: Crown, 
    label: 'Owner', 
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10',
    borderColor: 'border-amber-400/30'
  },
  admin: { 
    icon: Shield, 
    label: 'Admin', 
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    borderColor: 'border-purple-400/30'
  },
  member: { 
    icon: Users, 
    label: 'Member', 
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    borderColor: 'border-blue-400/30'
  },
  viewer: { 
    icon: Eye, 
    label: 'Viewer', 
    color: 'text-gray-400',
    bgColor: 'bg-gray-400/10',
    borderColor: 'border-gray-400/30'
  }
}

// Project member roles
export const PROJECT_ROLES = {
  owner: { 
    icon: Crown, 
    label: 'Owner', 
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10',
    borderColor: 'border-amber-400/30'
  },
  admin: { 
    icon: Shield, 
    label: 'Admin', 
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    borderColor: 'border-purple-400/30'
  },
  member: { 
    icon: Users, 
    label: 'Member', 
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    borderColor: 'border-blue-400/30'
  },
  viewer: { 
    icon: Eye, 
    label: 'Viewer', 
    color: 'text-gray-400',
    bgColor: 'bg-gray-400/10',
    borderColor: 'border-gray-400/30'
  },
  uptrade_assigned: { 
    icon: Building2, 
    label: 'Uptrade', 
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    borderColor: 'border-green-400/30'
  }
}

export default function RoleBadge({ 
  role, 
  type = 'uptrade', // 'uptrade' | 'org' | 'project'
  size = 'md',
  showBorder = true 
}) {
  const roleMap = type === 'uptrade' ? UPTRADE_ROLES : type === 'org' ? ORG_ROLES : PROJECT_ROLES
  const config = roleMap[role] || roleMap.member || UPTRADE_ROLES.sales_rep
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
      {config.label}
    </div>
  )
}
