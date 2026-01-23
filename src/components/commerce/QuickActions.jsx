// src/components/commerce/QuickActions.jsx
// Quick action buttons for common commerce tasks

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import {
  Package,
  Briefcase,
  GraduationCap,
  CalendarDays,
  Users,
  Download,
  Upload,
  Zap,
  Receipt,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const defaultActions = [
  { 
    id: 'add-product',
    label: 'Add Product', 
    icon: Package, 
    href: '/commerce/offerings/new?type=product',
    category: 'create'
  },
  { 
    id: 'add-service',
    label: 'Add Service', 
    icon: Briefcase, 
    href: '/commerce/offerings/new?type=service',
    category: 'create'
  },
  { 
    id: 'add-class',
    label: 'Add Class', 
    icon: GraduationCap, 
    href: '/commerce/offerings/new?type=class',
    category: 'create'
  },
  { 
    id: 'add-event',
    label: 'Add Event', 
    icon: CalendarDays, 
    href: '/commerce/offerings/new?type=event',
    category: 'create'
  },
  { 
    id: 'view-sales',
    label: 'View Sales', 
    icon: Receipt, 
    href: '/commerce/sales',
    category: 'manage'
  },
  { 
    id: 'manage-customers',
    label: 'Customers', 
    icon: Users, 
    href: '/commerce/customers',
    category: 'manage'
  },
]

// Promotion actions removed until those pages exist
const promotionActions = []

const importExportActions = [
  { 
    id: 'export-data',
    label: 'Export Data', 
    icon: Download, 
    action: 'export',
    category: 'data'
  },
  { 
    id: 'import-data',
    label: 'Import', 
    icon: Upload, 
    action: 'import',
    category: 'data'
  },
]

export function QuickActions({ 
  enabledTypes = ['product', 'service', 'class', 'event'],
  showPromotions = true,
  showImportExport = true,
  onExport,
  onImport,
  compact = false,
  brandColors = {},
  className 
}) {
  const navigate = useNavigate()
  
  const primary = brandColors.primary || '#4bbf39'
  const rgba = brandColors.rgba || { primary10: 'rgba(75, 191, 57, 0.1)', primary20: 'rgba(75, 191, 57, 0.2)' }

  // Filter actions based on enabled types
  const typeToAction = {
    product: 'add-product',
    service: 'add-service',
    class: 'add-class',
    event: 'add-event',
  }
  
  const createActions = defaultActions.filter(a => 
    a.category === 'create' && enabledTypes.some(t => typeToAction[t] === a.id)
  )
  
  const manageActions = defaultActions.filter(a => a.category === 'manage')
  
  const handleAction = (action) => {
    if (action.href) {
      navigate(action.href)
    } else if (action.action === 'export' && onExport) {
      onExport()
    } else if (action.action === 'import' && onImport) {
      onImport()
    }
  }

  if (compact) {
    // Compact mode: single row of primary actions
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        {createActions.slice(0, 4).map(action => {
          const Icon = action.icon
          return (
            <Button 
              key={action.id}
              size="sm"
              onClick={() => handleAction(action)}
              className="gap-2"
              style={{ backgroundColor: primary }}
            >
              <Icon className="h-4 w-4" />
              {action.label}
            </Button>
          )
        })}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="h-5 w-5" style={{ color: primary }} />
          Quick Actions
        </CardTitle>
        <CardDescription>Common tasks at your fingertips</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create Actions */}
        {createActions.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">CREATE</p>
            <div className="grid grid-cols-2 gap-2">
              {createActions.map(action => {
                const Icon = action.icon
                return (
                  <Button 
                    key={action.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction(action)}
                    className="justify-start gap-2 h-auto py-2.5"
                  >
                    <div 
                      className="p-1.5 rounded"
                      style={{ backgroundColor: rgba.primary10 }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: primary }} />
                    </div>
                    {action.label}
                  </Button>
                )
              })}
            </div>
          </div>
        )}
        
        {/* Manage Actions */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">MANAGE</p>
          <div className="grid grid-cols-2 gap-2">
            {manageActions.map(action => {
              const Icon = action.icon
              return (
                <Button 
                  key={action.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAction(action)}
                  className="justify-start gap-2 h-auto py-2"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {action.label}
                </Button>
              )
            })}
          </div>
        </div>
        
        {/* Promotion Actions */}
        {showPromotions && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">PROMOTE</p>
            <div className="grid grid-cols-2 gap-2">
              {promotionActions.map(action => {
                const Icon = action.icon
                return (
                  <Button 
                    key={action.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAction(action)}
                    className="justify-start gap-2 h-auto py-2"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {action.label}
                  </Button>
                )
              })}
            </div>
          </div>
        )}
        
        {/* Import/Export */}
        {showImportExport && (
          <div className="flex gap-2 pt-2 border-t">
            {importExportActions.map(action => {
              const Icon = action.icon
              return (
                <Button 
                  key={action.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction(action)}
                  className="flex-1 gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {action.label}
                </Button>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default QuickActions
