/**
 * RealTimeWidget - Live visitor activity
 */
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Activity, 
  Globe, 
  RefreshCw,
  Eye,
  Clock,
  Smartphone,
  Monitor,
  Tablet
} from 'lucide-react'
import { cn } from '@/lib/utils'

function getDeviceIcon(device) {
  switch (device?.toLowerCase()) {
    case 'mobile': return Smartphone
    case 'tablet': return Tablet
    default: return Monitor
  }
}

function timeAgo(timestamp) {
  if (!timestamp) return 'Just now'
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
  
  if (seconds < 10) return 'Just now'
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}

export function RealTimeWidget({ 
  activeVisitors = 0,
  recentEvents = [],
  isLive = true,
  onRefresh,
  isLoading = false 
}) {
  const [pulsing, setPulsing] = useState(true)
  
  // Pulse animation for live indicator
  useEffect(() => {
    if (!isLive) return
    const interval = setInterval(() => {
      setPulsing(p => !p)
    }, 2000)
    return () => clearInterval(interval)
  }, [isLive])

  // Limit displayed events
  const displayEvents = recentEvents.slice(0, 8)

  return (
    <Card className="relative overflow-hidden">
      {/* Live indicator gradient border */}
      {isLive && (
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-transparent to-green-500/20 opacity-50 animate-pulse pointer-events-none" />
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="relative">
              <Activity className="h-5 w-5 text-green-500" />
              {isLive && (
                <span className={cn(
                  "absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500 transition-opacity",
                  pulsing ? 'opacity-100' : 'opacity-50'
                )} />
              )}
            </div>
            Real-Time
          </CardTitle>
          
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-md hover:bg-[var(--glass-bg)] text-[var(--text-tertiary)] transition-colors"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Active visitors count */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl mb-4">
          <div>
            <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5">
              Active Now
            </p>
            <p className="text-4xl font-bold text-green-500 tabular-nums">
              {activeVisitors}
            </p>
          </div>
          <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <Globe className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        {/* Recent activity stream */}
        <div>
          <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
            Recent Activity
          </p>
          
          <ScrollArea className="h-[180px]">
            {displayEvents.length > 0 ? (
              <div className="space-y-2">
                {displayEvents.map((event, index) => {
                  const DeviceIcon = getDeviceIcon(event.device)
                  
                  return (
                    <div 
                      key={event.id || index}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg transition-all",
                        index === 0 && "bg-[var(--glass-bg)] animate-in fade-in slide-in-from-top-2"
                      )}
                    >
                      <div className="p-1.5 rounded-md bg-blue-500/10">
                        <Eye className="h-3.5 w-3.5 text-blue-500" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--text-primary)] truncate">
                          {event.page || event.title || '/'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                          <DeviceIcon className="h-3 w-3" />
                          {event.country && <span>{event.country}</span>}
                        </div>
                      </div>
                      
                      <span className="text-xs text-[var(--text-tertiary)] whitespace-nowrap">
                        {timeAgo(event.timestamp)}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[var(--text-tertiary)]">
                <Clock className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">Waiting for activity...</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}

export default RealTimeWidget
