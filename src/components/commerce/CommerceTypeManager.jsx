// src/components/commerce/CommerceTypeManager.jsx
// Hook and component for managing commerce types

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Package,
  Briefcase,
  GraduationCap,
  CalendarDays,
  Settings,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Commerce types configuration
export const COMMERCE_TYPES = {
  product: {
    key: 'product',
    label: 'Products',
    description: 'Physical & digital goods',
    icon: Package,
    examples: 'Apparel, equipment, digital downloads',
  },
  service: {
    key: 'service',
    label: 'Services',
    description: 'Bookable appointments',
    icon: Briefcase,
    examples: 'Consultations, training sessions',
  },
  class: {
    key: 'class',
    label: 'Classes',
    description: 'Scheduled group sessions',
    icon: GraduationCap,
    examples: 'Workshops, group training, courses',
  },
  event: {
    key: 'event',
    label: 'Events',
    description: 'Ticketed experiences',
    icon: CalendarDays,
    examples: 'Conferences, meetups, performances',
  },
}

// Hook for fetching and managing commerce types
// Accepts settings object from parent (from useCommerceStore)
export function useCommerceTypes(settings) {
  const enabledTypes = useMemo(() => {
    return settings?.enabled_types || ['product']
  }, [settings])

  const hasProducts = enabledTypes.includes('product')
  const hasServices = enabledTypes.includes('service')
  const hasClasses = enabledTypes.includes('class')
  const hasEvents = enabledTypes.includes('event')

  const isTypeEnabled = (type) => {
    return enabledTypes.includes(type)
  }

  return {
    settings,
    enabledTypes,
    hasProducts,
    hasServices,
    hasClasses,
    hasEvents,
    isTypeEnabled,
    allTypes: Object.values(COMMERCE_TYPES),
  }
}

// Component to display/configure commerce types
export function CommerceTypeManager({ 
  projectId,
  enabledTypes = ['product', 'service', 'class', 'event'],
  onTypesChange,
  readonly = false,
  compact = false,
  brandColors = {},
  className 
}) {
  const [localTypes, setLocalTypes] = useState(enabledTypes)
  
  const primary = brandColors.primary || '#4bbf39'
  const secondary = brandColors.secondary || '#39bfb0'
  const rgba = brandColors.rgba || { 
    primary10: 'rgba(75, 191, 57, 0.1)', 
    primary20: 'rgba(75, 191, 57, 0.2)',
    secondary10: 'rgba(57, 191, 176, 0.1)'
  }

  const getTypeColor = (type) => {
    return ['product', 'class'].includes(type) ? primary : secondary
  }

  const getTypeBgColor = (type) => {
    return ['product', 'class'].includes(type) ? rgba.primary10 : rgba.secondary10
  }

  const handleToggle = (type) => {
    if (readonly) return
    
    const newTypes = localTypes.includes(type)
      ? localTypes.filter(t => t !== type)
      : [...localTypes, type]
    
    setLocalTypes(newTypes)
    onTypesChange?.(newTypes)
  }

  if (compact) {
    // Compact mode: just badges
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        {Object.values(COMMERCE_TYPES).map(type => {
          const isEnabled = localTypes.includes(type.key)
          const Icon = type.icon
          const color = getTypeColor(type.key)
          
          return (
            <Badge 
              key={type.key}
              variant={isEnabled ? 'default' : 'outline'}
              className={cn(
                "gap-1.5 cursor-pointer transition-colors",
                isEnabled && "text-white",
                !isEnabled && "opacity-50"
              )}
              style={isEnabled ? { backgroundColor: color } : {}}
              onClick={() => handleToggle(type.key)}
            >
              <Icon className="h-3 w-3" />
              {type.label}
              {isEnabled && readonly && <Check className="h-3 w-3 ml-1" />}
            </Badge>
          )
        })}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" style={{ color: primary }} />
              Commerce Types
            </CardTitle>
            <CardDescription>Enable the types of offerings for your business</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.values(COMMERCE_TYPES).map(type => {
          const isEnabled = localTypes.includes(type.key)
          const Icon = type.icon
          const color = getTypeColor(type.key)
          const bgColor = getTypeBgColor(type.key)
          
          return (
            <div 
              key={type.key}
              className={cn(
                "flex items-center gap-4 p-3 rounded-lg border transition-colors",
                isEnabled ? "border-border" : "border-muted opacity-60"
              )}
            >
              <div 
                className="p-2.5 rounded-xl"
                style={{ backgroundColor: bgColor }}
              >
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{type.label}</p>
                  {isEnabled && (
                    <Badge variant="outline" className="text-xs">Enabled</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{type.description}</p>
                <p className="text-xs text-muted-foreground mt-1">e.g., {type.examples}</p>
              </div>
              
              {!readonly && (
                <Switch
                  checked={isEnabled}
                  onCheckedChange={() => handleToggle(type.key)}
                />
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export default CommerceTypeManager
