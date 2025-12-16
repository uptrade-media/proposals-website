/**
 * ConversionFunnel - Visualize user journey through site
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, TrendingDown, ArrowDown, Users, Eye, MousePointerClick, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ConversionFunnel({ 
  data = null, 
  isLoading = false,
  formatNumber = (n) => n?.toLocaleString() || '0'
}) {
  // Default funnel stages with sample structure
  const defaultStages = [
    { id: 'visitors', label: 'Visitors', icon: Users, color: '#3b82f6' },
    { id: 'pageviews', label: 'Page Views', icon: Eye, color: '#8b5cf6' },
    { id: 'engaged', label: 'Engaged', icon: MousePointerClick, color: '#ec4899' },
    { id: 'conversions', label: 'Conversions', icon: Send, color: '#10b981' }
  ]

  // Get values from data or use defaults
  const getStageValue = (stageId) => {
    if (!data) return 0
    switch (stageId) {
      case 'visitors': return data.uniqueVisitors || data.visitors || 0
      case 'pageviews': return data.pageViews || data.pageviews || 0
      case 'engaged': return data.engagedSessions || Math.floor((data.uniqueVisitors || 0) * 0.4) || 0
      case 'conversions': return data.conversions || data.goals || 0
      default: return 0
    }
  }

  const stages = defaultStages.map(stage => ({
    ...stage,
    value: getStageValue(stage.id)
  }))

  const maxValue = Math.max(...stages.map(s => s.value), 1)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-80">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-green-500" />
          Conversion Funnel
        </CardTitle>
        <CardDescription>User journey from visit to conversion</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4 pt-2">
          {stages.map((stage, index) => {
            const Icon = stage.icon
            const widthPercent = maxValue > 0 ? (stage.value / maxValue) * 100 : 0
            const prevValue = index > 0 ? stages[index - 1].value : null
            const dropOff = prevValue ? ((1 - stage.value / prevValue) * 100).toFixed(0) : null
            
            return (
              <div key={stage.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div 
                      className="p-1.5 rounded-md"
                      style={{ backgroundColor: `${stage.color}20` }}
                    >
                      <Icon 
                        className="h-3.5 w-3.5" 
                        style={{ color: stage.color }} 
                      />
                    </div>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {stage.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {dropOff && parseInt(dropOff) > 0 && (
                      <span className="text-xs text-[var(--text-tertiary)]">
                        -{dropOff}%
                      </span>
                    )}
                    <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                      {formatNumber(stage.value)}
                    </span>
                  </div>
                </div>
                
                <div className="h-8 bg-[var(--glass-bg-inset)] rounded-lg overflow-hidden">
                  <div 
                    className="h-full rounded-lg transition-all duration-700 flex items-center justify-end pr-3"
                    style={{ 
                      width: `${Math.max(widthPercent, 2)}%`,
                      backgroundColor: stage.color
                    }}
                  >
                    {widthPercent > 15 && (
                      <span className="text-xs font-medium text-white">
                        {widthPercent.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
                
                {index < stages.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ArrowDown className="h-4 w-4 text-[var(--text-tertiary)]" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
        
        {/* Overall conversion rate */}
        <div className="mt-6 pt-4 border-t border-[var(--glass-border)]">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">Overall Conversion Rate</span>
            <span className="text-lg font-bold text-green-500">
              {stages[0].value > 0 
                ? ((stages[stages.length - 1].value / stages[0].value) * 100).toFixed(2) 
                : '0.00'}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ConversionFunnel
