/**
 * WebVitalsCard - Core Web Vitals performance metrics
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Gauge, MousePointer, LayoutGrid, Paintbrush, Clock, Zap } from 'lucide-react'
import { useBrandColors } from '@/hooks/useBrandColors'

// Web Vitals thresholds (Google's standards)
const VITALS_CONFIG = {
  lcp: {
    label: 'LCP',
    fullName: 'Largest Contentful Paint',
    icon: Paintbrush,
    unit: 's',
    thresholds: { good: 2.5, needsImprovement: 4 },
    description: 'Loading performance'
  },
  fid: {
    label: 'FID',
    fullName: 'First Input Delay',
    icon: MousePointer,
    unit: 'ms',
    thresholds: { good: 100, needsImprovement: 300 },
    description: 'Interactivity'
  },
  cls: {
    label: 'CLS',
    fullName: 'Cumulative Layout Shift',
    icon: LayoutGrid,
    unit: '',
    thresholds: { good: 0.1, needsImprovement: 0.25 },
    description: 'Visual stability'
  },
  fcp: {
    label: 'FCP',
    fullName: 'First Contentful Paint',
    icon: Clock,
    unit: 's',
    thresholds: { good: 1.8, needsImprovement: 3 },
    description: 'First content'
  },
  ttfb: {
    label: 'TTFB',
    fullName: 'Time to First Byte',
    icon: Zap,
    unit: 'ms',
    thresholds: { good: 800, needsImprovement: 1800 },
    description: 'Server response'
  },
  inp: {
    label: 'INP',
    fullName: 'Interaction to Next Paint',
    icon: Gauge,
    unit: 'ms',
    thresholds: { good: 200, needsImprovement: 500 },
    description: 'Responsiveness'
  }
}

// Extract the numeric value from web vitals data
// API returns { p75, avg, samples, ratings, status } for each metric
function getVitalNumericValue(vitalData) {
  if (vitalData === null || vitalData === undefined) return null
  // If it's already a number, return it
  if (typeof vitalData === 'number') return vitalData
  // If it's an object with p75, use that (preferred metric for Core Web Vitals)
  if (typeof vitalData === 'object' && vitalData.p75 !== null && vitalData.p75 !== undefined) {
    return vitalData.p75
  }
  // Fall back to avg if available
  if (typeof vitalData === 'object' && vitalData.avg !== null && vitalData.avg !== undefined) {
    return vitalData.avg
  }
  return null
}

function getVitalStatus(key, vitalData) {
  const config = VITALS_CONFIG[key]
  if (!config) return 'unknown'
  
  // If the API already provides a status, use it
  if (typeof vitalData === 'object' && vitalData?.status && vitalData.status !== 'no-data') {
    return vitalData.status
  }
  
  const value = getVitalNumericValue(vitalData)
  if (value === null) return 'unknown'
  
  if (value <= config.thresholds.good) return 'good'
  if (value <= config.thresholds.needsImprovement) return 'needs-improvement'
  return 'poor'
}

function getStatusColor(status) {
  switch (status) {
    case 'good': return '#22c55e'
    case 'needs-improvement': return '#f59e0b'
    case 'poor': return '#ef4444'
    default: return '#64748b'
  }
}

function formatVitalValue(key, vitalData) {
  const value = getVitalNumericValue(vitalData)
  if (value === null) return '—'
  const config = VITALS_CONFIG[key]
  
  if (key === 'cls') {
    return value.toFixed(3)
  }
  if (config.unit === 's') {
    // Convert ms to seconds if value seems to be in ms
    const displayValue = value > 10 ? value / 1000 : value
    return displayValue.toFixed(2) + 's'
  }
  if (config.unit === 'ms') {
    return Math.round(value) + 'ms'
  }
  return value.toString()
}

export function WebVitalsCard({ 
  data = {},
  isLoading = false
}) {
  const { primary } = useBrandColors()
  
  // Core Web Vitals (the 3 main ones)
  const coreVitals = ['lcp', 'fid', 'cls']
  const otherVitals = ['fcp', 'ttfb', 'inp']

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
        </CardContent>
      </Card>
    )
  }

  // Check if we have any data
  const hasData = Object.keys(data || {}).some(key => {
    if (!VITALS_CONFIG[key]) return false
    const vitalData = data[key]
    // Check if there's actual numeric data or a valid status
    if (typeof vitalData === 'object') {
      return vitalData?.samples > 0 || vitalData?.p75 != null || vitalData?.avg != null
    }
    return vitalData !== null && vitalData !== undefined
  })

  if (!hasData) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Core Web Vitals</CardTitle>
          <CardDescription>Performance metrics from real users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-[var(--text-tertiary)]">
            <Gauge className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No Web Vitals data collected yet</p>
            <p className="text-xs mt-1">Data appears as users visit your site</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderVital = (key) => {
    const config = VITALS_CONFIG[key]
    const vitalData = data[key]
    const numericValue = getVitalNumericValue(vitalData)
    const status = getVitalStatus(key, vitalData)
    const color = getStatusColor(status)
    const Icon = config.icon
    
    // Get sample count if available
    const samples = typeof vitalData === 'object' ? vitalData?.samples : null
    
    return (
      <div 
        key={key}
        className="p-4 rounded-xl bg-[var(--glass-bg-inset)] border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] transition-all"
      >
        <div className="flex items-start justify-between mb-3">
          <div 
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <div 
            className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
            style={{ 
              backgroundColor: `${color}15`,
              color 
            }}
          >
            {status.replace('-', ' ')}
          </div>
        </div>
        
        <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums mb-1">
          {formatVitalValue(key, vitalData)}
        </p>
        
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {config.label}
        </p>
        <p className="text-xs text-[var(--text-tertiary)]">
          {config.description}
          {samples ? ` (${samples} samples)` : ''}
        </p>
        
        {/* Progress bar showing position in threshold range */}
        <div className="mt-3 h-1.5 bg-[var(--glass-border)] rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: numericValue !== null 
                ? `${Math.min(100, (numericValue / config.thresholds.needsImprovement) * 50)}%`
                : '0%',
              backgroundColor: color
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Core Web Vitals</CardTitle>
            <CardDescription>Performance metrics from real users</CardDescription>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-[var(--text-tertiary)]">Good</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-[var(--text-tertiary)]">Needs Work</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-[var(--text-tertiary)]">Poor</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Core Web Vitals - Primary row */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {coreVitals.map(renderVital)}
        </div>
        
        {/* Other metrics - Secondary row */}
        <div className="grid grid-cols-3 gap-4">
          {otherVitals.map(renderVital)}
        </div>
      </CardContent>
    </Card>
  )
}

export default WebVitalsCard
