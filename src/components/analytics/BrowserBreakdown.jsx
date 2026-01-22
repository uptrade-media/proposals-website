/**
 * BrowserBreakdown - Browser and OS distribution charts
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Globe, Monitor } from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts'
import { useBrandColors } from '@/hooks/useBrandColors'

// Browser icons/colors
const BROWSER_COLORS = {
  'Chrome': '#4285F4',
  'Safari': '#5AC8FA',
  'Firefox': '#FF7139',
  'Edge': '#0078D7',
  'Opera': '#FF1B2D',
  'Samsung Internet': '#1428A0',
  'Other': '#64748b'
}

const OS_COLORS = {
  'Windows': '#0078D4',
  'macOS': '#A2AAAD', // Apple's signature silver/grey with more visibility
  'iOS': '#147CE5', // Apple blue
  'Android': '#3DDC84',
  'Linux': '#FCC624',
  'Chrome OS': '#4285F4',
  'Other': '#64748b'
}

function getColor(name, colorMap, fallbackColors, index) {
  return colorMap[name] || fallbackColors[index % fallbackColors.length]
}

// Custom tooltip
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  
  return (
    <div className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-lg p-3 shadow-xl">
      <p className="text-sm font-medium text-[var(--text-primary)]">{data.name}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-lg font-bold text-[var(--text-primary)]">{data.count?.toLocaleString()}</span>
        <span className="text-xs text-[var(--text-tertiary)]">
          ({data.percentage?.toFixed(1) || ((data.count / data.total) * 100).toFixed(1)}%)
        </span>
      </div>
    </div>
  )
}

export function BrowserBreakdown({ sessions = {} }) {
  const { primary, secondary } = useBrandColors()
  
  const browsers = sessions?.browsers || []
  const operatingSystems = sessions?.operatingSystems || []
  
  const fallbackColors = [primary, secondary, '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
  
  // Calculate totals
  const browserTotal = browsers.reduce((sum, b) => sum + (b.count || 0), 0)
  const osTotal = operatingSystems.reduce((sum, o) => sum + (o.count || 0), 0)
  
  // Prepare chart data
  const browserData = browsers.map((b, i) => ({
    name: b.name || b.browser || 'Unknown',
    count: b.count || 0,
    percentage: b.percentage || (browserTotal > 0 ? (b.count / browserTotal) * 100 : 0),
    total: browserTotal,
    fill: getColor(b.name || b.browser, BROWSER_COLORS, fallbackColors, i)
  }))
  
  const osData = operatingSystems.map((o, i) => ({
    name: o.name || o.os || 'Unknown',
    count: o.count || 0,
    percentage: o.percentage || (osTotal > 0 ? (o.count / osTotal) * 100 : 0),
    total: osTotal,
    fill: getColor(o.name || o.os, OS_COLORS, fallbackColors, i)
  }))

  const hasData = browserData.length > 0 || osData.length > 0

  if (!hasData) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Browser & OS</CardTitle>
          <CardDescription>Technology breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-[var(--text-tertiary)]">
            <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No session data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Browser & Operating System</CardTitle>
        <CardDescription>Technology breakdown by sessions</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Browsers */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-[var(--text-tertiary)]" />
              <h4 className="text-sm font-medium text-[var(--text-primary)]">Browsers</h4>
            </div>
            
            {browserData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={browserData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                    >
                      {browserData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Legend */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {browserData.slice(0, 6).map((browser, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <div 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: browser.fill }}
                      />
                      <span className="text-[var(--text-secondary)] truncate">{browser.name}</span>
                      <span className="text-[var(--text-tertiary)] ml-auto">
                        {browser.percentage.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-44 flex items-center justify-center text-[var(--text-tertiary)] text-sm">
                No browser data
              </div>
            )}
          </div>
          
          {/* Operating Systems */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Monitor className="w-4 h-4 text-[var(--text-tertiary)]" />
              <h4 className="text-sm font-medium text-[var(--text-primary)]">Operating Systems</h4>
            </div>
            
            {osData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={osData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                    >
                      {osData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Legend */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {osData.slice(0, 6).map((os, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <div 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: os.fill }}
                      />
                      <span className="text-[var(--text-secondary)] truncate">{os.name}</span>
                      <span className="text-[var(--text-tertiary)] ml-auto">
                        {os.percentage.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-44 flex items-center justify-center text-[var(--text-tertiary)] text-sm">
                No OS data
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default BrowserBreakdown
