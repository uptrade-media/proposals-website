/**
 * DeviceBreakdown - Device type distribution with donut chart
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { DonutChart } from '@tremor/react'
import { Monitor, Smartphone, Tablet, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const DEVICE_CONFIG = {
  desktop: { icon: Monitor, color: '#39bfb0', label: 'Desktop' },
  mobile: { icon: Smartphone, color: '#3b82f6', label: 'Mobile' },
  tablet: { icon: Tablet, color: '#f59e0b', label: 'Tablet' }
}

export function DeviceBreakdown({ 
  data = {}, 
  isLoading = false,
  formatNumber,
  formatPercent 
}) {
  const total = (data.desktop || 0) + (data.mobile || 0) + (data.tablet || 0)
  
  const chartData = [
    { name: 'Desktop', value: data.desktop || 0 },
    { name: 'Mobile', value: data.mobile || 0 },
    { name: 'Tablet', value: data.tablet || 0 }
  ].filter(d => d.value > 0)

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
        <CardTitle className="text-lg">Device Breakdown</CardTitle>
        <CardDescription>Sessions by device type</CardDescription>
      </CardHeader>
      
      <CardContent>
        {chartData.length > 0 ? (
          <div className="flex items-center gap-6">
            {/* Chart */}
            <div className="relative">
              <DonutChart
                className="h-44 w-44"
                data={chartData}
                category="value"
                index="name"
                colors={['emerald', 'blue', 'amber']}
                valueFormatter={(number) => `${number}`}
                showLabel={false}
                showAnimation={true}
                showTooltip={true}
              />
              {/* Center label */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    {formatNumber(total)}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">Total</p>
                </div>
              </div>
            </div>
            
            {/* Legend with details */}
            <div className="flex-1 space-y-4">
              {Object.entries(DEVICE_CONFIG).map(([key, config]) => {
                const value = data[key] || 0
                const percent = total > 0 ? (value / total) * 100 : 0
                const Icon = config.icon
                
                return (
                  <div key={key} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div 
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ backgroundColor: `${config.color}20` }}
                        >
                          <Icon className="h-4 w-4" style={{ color: config.color }} />
                        </div>
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {config.label}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-[var(--text-primary)]">
                          {formatNumber(value)}
                        </span>
                        <span className="text-xs text-[var(--text-tertiary)] ml-2">
                          ({percent.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="h-1.5 bg-[var(--glass-bg-inset)] rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${percent}%`,
                          backgroundColor: config.color 
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="h-44 flex items-center justify-center text-[var(--text-tertiary)]">
            No device data available
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default DeviceBreakdown
