/**
 * RealTimeWidget - Live visitor count and recent activity
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, Users, Zap, Clock, Globe } from 'lucide-react'
import { useBrandColors } from '@/hooks/useBrandColors'

export function RealTimeWidget({ 
  activeVisitors = 0,
  recentEvents = [],
  isLive = true,
  onRefresh,
  isLoading = false
}) {
  const { primary } = useBrandColors()
  
  // Pulse animation for live indicator
  const pulseColor = activeVisitors > 0 ? '#22c55e' : '#64748b'

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Real-Time</CardTitle>
            {isLive && (
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span 
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                    style={{ backgroundColor: pulseColor }}
                  />
                  <span 
                    className="relative inline-flex rounded-full h-2.5 w-2.5"
                    style={{ backgroundColor: pulseColor }}
                  />
                </span>
                <span className="text-xs text-[var(--text-tertiary)]">Live</span>
              </div>
            )}
          </div>
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        {/* Active Visitors Display */}
        <div className="flex-1 flex flex-col items-center justify-center py-6">
          <div 
            className="relative w-32 h-32 rounded-full flex items-center justify-center mb-4"
            style={{ 
              background: `radial-gradient(circle at center, ${primary}20 0%, transparent 70%)`,
              boxShadow: activeVisitors > 0 ? `0 0 60px ${primary}30` : 'none'
            }}
          >
            <div className="text-center">
              <p 
                className="text-5xl font-bold tabular-nums"
                style={{ color: activeVisitors > 0 ? primary : 'var(--text-tertiary)' }}
              >
                {activeVisitors}
              </p>
              <div className="flex items-center gap-1 justify-center mt-1">
                <Users className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                <span className="text-xs text-[var(--text-tertiary)]">
                  {activeVisitors === 1 ? 'visitor' : 'visitors'}
                </span>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-[var(--text-secondary)]">
            Active right now
          </p>
        </div>
        
        {/* Recent Events */}
        {recentEvents.length > 0 ? (
          <div className="border-t border-[var(--glass-border)] pt-4 mt-4">
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Recent Activity
            </p>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {recentEvents.slice(0, 5).map((event, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 text-xs p-2 rounded-lg bg-[var(--glass-bg-inset)]"
                >
                  <Globe className="w-3 h-3 text-[var(--text-tertiary)] flex-shrink-0" />
                  <span className="text-[var(--text-primary)] truncate flex-1">
                    {event.page || event.name || 'Page view'}
                  </span>
                  <span className="text-[var(--text-tertiary)] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {event.time || 'now'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="border-t border-[var(--glass-border)] pt-4 mt-4">
            <p className="text-xs text-[var(--text-tertiary)] text-center">
              Waiting for activity...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default RealTimeWidget
