// src/components/commerce/CommerceMetrics.jsx
// Top-level metrics with sparklines

import { Card, CardContent } from '@/components/ui/card'
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const mockMetrics = [
  { 
    key: 'revenue',
    label: 'Revenue', 
    value: '$12,450',
    change: 12.5,
    trend: 'up',
    icon: DollarSign,
    sparkline: [45, 52, 49, 63, 58, 70, 85]
  },
  { 
    key: 'orders',
    label: 'Orders', 
    value: '156',
    change: 8.3,
    trend: 'up',
    icon: ShoppingBag,
    sparkline: [22, 25, 28, 24, 32, 30, 35]
  },
  { 
    key: 'customers',
    label: 'Customers', 
    value: '89',
    change: 15.2,
    trend: 'up',
    icon: Users,
    sparkline: [15, 18, 22, 20, 25, 28, 32]
  },
  { 
    key: 'views',
    label: 'Views', 
    value: '2.4K',
    change: -3.2,
    trend: 'down',
    icon: Eye,
    sparkline: [85, 82, 78, 80, 75, 72, 68]
  },
]

export function CommerceMetrics({ 
  metrics = [], 
  showMockData = true,
  brandColors = {},
  className 
}) {
  const displayMetrics = metrics.length > 0 ? metrics : (showMockData ? mockMetrics : [])
  
  const primary = brandColors.primary || '#4bbf39'
  const secondary = brandColors.secondary || '#39bfb0'
  const rgba = brandColors.rgba || { 
    primary10: 'rgba(75, 191, 57, 0.1)', 
    primary20: 'rgba(75, 191, 57, 0.2)',
    secondary10: 'rgba(57, 191, 176, 0.1)',
    secondary20: 'rgba(57, 191, 176, 0.2)' 
  }

  const getMetricColor = (index) => {
    // Alternate between primary and secondary
    return index % 2 === 0 ? primary : secondary
  }

  const getMetricBgColor = (index) => {
    return index % 2 === 0 ? rgba.primary10 : rgba.secondary10
  }

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
      {displayMetrics.map((metric, index) => {
        const Icon = metric.icon
        const isPositive = metric.trend === 'up'
        const color = getMetricColor(index)
        const bgColor = getMetricBgColor(index)
        
        return (
          <Card key={metric.key} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="text-2xl font-bold mt-1">{metric.value}</p>
                  <div className={cn(
                    "flex items-center gap-1 text-sm mt-1",
                    isPositive ? "text-emerald-600" : "text-red-500"
                  )}>
                    {isPositive ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    <span>{Math.abs(metric.change)}%</span>
                    <span className="text-muted-foreground">vs last period</span>
                  </div>
                </div>
                <div 
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: bgColor }}
                >
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
              </div>
              
              {/* Mini Sparkline */}
              {metric.sparkline && (
                <div className="mt-3 h-8 flex items-end gap-0.5">
                  {metric.sparkline.map((value, i) => {
                    const max = Math.max(...metric.sparkline)
                    const height = (value / max) * 100
                    return (
                      <div 
                        key={i}
                        className="flex-1 rounded-sm transition-all"
                        style={{ 
                          height: `${height}%`,
                          backgroundColor: color,
                          opacity: i === metric.sparkline.length - 1 ? 1 : 0.5
                        }}
                      />
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default CommerceMetrics
