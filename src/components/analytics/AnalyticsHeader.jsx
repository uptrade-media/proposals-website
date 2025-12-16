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
import { RefreshCw, Calendar, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AnalyticsHeader({ 
  dateRange, 
  onDateRangeChange, 
  onRefresh, 
  isRefreshing = false,
  lastUpdated = null 
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-[#39bfb0]/20 to-[#4bbf39]/20">
            <TrendingUp className="h-6 w-6 text-[#39bfb0]" />
          </div>
          Analytics
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Website traffic and engagement insights
          {lastUpdated && (
            <span className="text-[var(--text-tertiary)] ml-2">
              · Updated {new Date(lastUpdated).toLocaleTimeString()}
            </span>
          )}
        </p>
      </div>
      
      <div className="flex items-center gap-3">
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
