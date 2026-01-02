/**
 * AnalyticsHeader - Header with date range selector and refresh
 */
import { Button } from '@/components/ui/button'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { RefreshCw, Calendar, TrendingUp, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AnalyticsHeader({ 
  dateRange, 
  onDateRangeChange, 
  onRefresh, 
  isRefreshing = false,
  lastUpdated = null,
  siteName = null,
  siteDomain = null,
  realtimeConnected = false
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-[#39bfb0]/20 to-[#4bbf39]/20">
            <TrendingUp className="h-6 w-6 text-[#39bfb0]" />
          </div>
          Analytics
          {siteName && (
            <span className="text-lg font-normal text-[var(--text-secondary)]">
              — {siteName}
            </span>
          )}
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">
          {siteDomain ? (
            <>Traffic and engagement for <span className="text-[var(--text-primary)]">{siteDomain}</span></>
          ) : (
            'Website traffic and engagement insights'
          )}
          {lastUpdated && (
            <span className="text-[var(--text-tertiary)] ml-2">
              · Updated {new Date(lastUpdated).toLocaleTimeString()}
            </span>
          )}
        </p>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Realtime Status Indicator */}
        <div 
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
            realtimeConnected 
              ? "bg-emerald-500/10 text-emerald-500" 
              : "bg-yellow-500/10 text-yellow-500"
          )}
          title={realtimeConnected ? "Live updates enabled" : "Connecting..."}
        >
          {realtimeConnected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" />
              Offline
            </>
          )}
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]">
          <Calendar className="h-4 w-4 text-[var(--text-tertiary)]" />
          <Select value={dateRange.toString()} onValueChange={(v) => onDateRangeChange(parseInt(v))}>
            <SelectTrigger className="border-0 bg-transparent h-8 w-[120px] focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Refresh Button */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>
    </div>
  )
}

export default AnalyticsHeader
