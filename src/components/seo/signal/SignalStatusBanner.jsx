// src/components/seo/signal/SignalStatusBanner.jsx
// Shows Signal AI status, memory, and latest insight
import { motion } from 'framer-motion'
import { Sparkles, History, Brain, Zap, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function SignalStatusBanner({
  siteDomain,
  analyzingDays = 0,
  recommendationCount = 0,
  winCount = 0,
  latestInsight = null,
  onViewMemory,
  onApply,
  className
}) {
  const hasStats = analyzingDays > 0 || recommendationCount > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-xl border',
        'bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10',
        'border-emerald-500/20',
        className
      )}
    >
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 opacity-50" />
      
      <div className="relative p-4 md:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20">
                <Sparkles className="h-4 w-4 text-emerald-400" />
              </div>
              <h3 className="font-semibold text-[var(--text-primary)]">
                Signal Status
              </h3>
              {onViewMemory && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-auto text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  onClick={onViewMemory}
                >
                  <History className="h-3 w-3 mr-1" />
                  View Memory
                </Button>
              )}
            </div>

            {/* Stats row */}
            {hasStats && (
              <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)] mb-3">
                <span className="flex items-center gap-1">
                  <Brain className="h-3.5 w-3.5 text-teal-400" />
                  Analyzing {siteDomain} for {analyzingDays} days
                </span>
                <span className="text-[var(--text-tertiary)]">•</span>
                <span>{recommendationCount} recommendations</span>
                <span className="text-[var(--text-tertiary)]">•</span>
                <span className="text-emerald-400">{winCount} wins</span>
              </div>
            )}

            {/* Latest insight */}
            {latestInsight && (
              <div className="bg-[var(--glass-bg)] rounded-lg p-3 border border-[var(--glass-border)]">
                <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                  "{latestInsight}"
                </p>
              </div>
            )}
          </div>

          {/* Apply button */}
          {onApply && latestInsight && (
            <Button 
              size="sm" 
              className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white"
              onClick={onApply}
            >
              Apply
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
