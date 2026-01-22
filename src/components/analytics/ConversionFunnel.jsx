/**
 * ConversionFunnel - Visual funnel showing visitor journey
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Users, Eye, Zap, Target } from 'lucide-react'
import { useBrandColors } from '@/hooks/useBrandColors'

const defaultFormatNumber = (num) => {
  if (!num && num !== 0) return '0'
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toLocaleString()
}

const FUNNEL_STEPS = [
  { key: 'uniqueVisitors', label: 'Visitors', icon: Users, description: 'Unique visitors' },
  { key: 'engagedSessions', label: 'Engaged', icon: Zap, description: 'Active sessions' },
  { key: 'conversions', label: 'Conversion', icon: Target, description: 'Goal completions' }
]

export function ConversionFunnel({ 
  data = {}, 
  isLoading = false,
  formatNumber = defaultFormatNumber 
}) {
  const { primary, secondary } = useBrandColors()
  
  // Calculate percentages relative to first step
  const baseValue = data.uniqueVisitors || data.pageViews || 1
  
  const steps = FUNNEL_STEPS.map((step, index) => {
    const value = data[step.key] || 0
    const percentage = baseValue > 0 ? (value / baseValue) * 100 : 0
    const dropOff = index > 0 
      ? ((data[FUNNEL_STEPS[index - 1].key] || 0) - value) 
      : 0
    
    return {
      ...step,
      value,
      percentage,
      dropOff,
      width: Math.max(30, percentage) // Minimum width for visibility
    }
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-72">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Conversion Funnel</CardTitle>
        <CardDescription>Visitor journey from arrival to conversion</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {steps.map((step, index) => {
          const Icon = step.icon
          const opacity = 1 - (index * 0.15)
          
          return (
            <div key={step.key} className="relative">
              {/* Funnel bar */}
              <div 
                className="relative rounded-lg overflow-hidden transition-all duration-500"
                style={{ 
                  width: `${step.width}%`,
                  marginLeft: `${(100 - step.width) / 2}%`
                }}
              >
                <div 
                  className="px-4 py-3 flex items-center justify-between"
                  style={{ 
                    background: `linear-gradient(135deg, ${primary}${Math.round(opacity * 255).toString(16).padStart(2, '0')}, ${secondary}${Math.round(opacity * 0.7 * 255).toString(16).padStart(2, '0')})`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-white/20 rounded-md">
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{step.label}</p>
                      <p className="text-xs text-white/70">{step.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white tabular-nums">
                      {formatNumber(step.value)}
                    </p>
                    <p className="text-xs text-white/70">
                      {step.percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Drop-off indicator */}
              {index > 0 && step.dropOff > 0 && (
                <div className="absolute -top-1.5 right-4 text-xs text-red-400 font-medium">
                  -{formatNumber(step.dropOff)} dropped
                </div>
              )}
            </div>
          )
        })}
        
        {/* Conversion rate summary */}
        <div className="pt-4 mt-4 border-t border-[var(--glass-border)]">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">Overall Conversion Rate</span>
            <span className="text-lg font-bold" style={{ color: primary }}>
              {baseValue > 0 
                ? ((data.conversions || 0) / baseValue * 100).toFixed(2)
                : 0
              }%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ConversionFunnel
