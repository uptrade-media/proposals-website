// src/components/signal/sync/FocusTimeManager.jsx
// AI-powered focus time recommendations and blocking interface
// Helps users protect deep work time with intelligent scheduling

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Focus,
  Clock,
  Calendar,
  Sparkles,
  Brain,
  Zap,
  Lock,
  Plus,
  Check,
  X,
  ChevronRight,
  Timer,
  Target,
  Coffee,
  Moon,
  Sun,
  TrendingUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { GlowCard, SignalGradientText } from '../shared/SignalUI'

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function FocusTimeManager({ data, calendarData, onBlockTime, onRefresh }) {
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [blockingSlot, setBlockingSlot] = useState(null)
  const [duration, setDuration] = useState(90) // minutes
  
  // Parse available slots
  const availableSlots = useMemo(() => {
    if (!data?.slots) return []
    return data.slots.map(slot => ({
      ...slot,
      startTime: new Date(slot.start),
      endTime: new Date(slot.end),
      durationMinutes: (new Date(slot.end) - new Date(slot.start)) / (1000 * 60)
    }))
  }, [data?.slots])
  
  // Best focus times from AI
  const bestTimes = data?.recommendations?.bestTimes || []
  
  // Focus patterns
  const patterns = data?.patterns || {}
  
  // Handle block time
  const handleBlock = async (slot) => {
    setBlockingSlot(slot.id)
    try {
      await onBlockTime({
        start: slot.start,
        end: slot.end,
        title: 'Focus Time',
        type: 'focus'
      })
      onRefresh?.()
    } catch (err) {
      console.error('Failed to block time:', err)
    } finally {
      setBlockingSlot(null)
    }
  }
  
  // Format time
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }
  
  // Get productivity score color
  const getScoreColor = (score) => {
    if (score >= 80) return 'emerald'
    if (score >= 60) return 'teal'
    if (score >= 40) return 'amber'
    return 'red'
  }

  return (
    <div className="space-y-6">
      {/* AI Insights Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-transparent border border-emerald-500/20"
      >
        <div className="flex items-start gap-4">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30"
          >
            <Brain className="h-6 w-6 text-emerald-400" />
          </motion.div>
          <div className="flex-1">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <SignalGradientText>Focus Intelligence</SignalGradientText>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                <Sparkles className="h-3 w-3 mr-1" />
                AI-Powered
              </Badge>
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {data?.insight || 'Analyzing your calendar to find optimal focus windows...'}
            </p>
          </div>
        </div>
        
        {/* Focus Patterns */}
        {patterns.bestDays && (
          <div className="grid grid-cols-3 gap-4 mt-6">
            <PatternCard
              icon={Sun}
              label="Best Time"
              value={patterns.bestTimeOfDay || 'Morning'}
              color="amber"
            />
            <PatternCard
              icon={Calendar}
              label="Best Days"
              value={patterns.bestDays?.slice(0, 2).join(', ') || 'Tue, Wed'}
              color="teal"
            />
            <PatternCard
              icon={Timer}
              label="Avg Session"
              value={`${patterns.avgSessionLength || 90} min`}
              color="emerald"
            />
          </div>
        )}
      </motion.div>
      
      {/* Available Focus Slots */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-[var(--text-secondary)]">
            Available Focus Slots
          </h3>
          <Badge variant="outline" className="bg-white/5 border-white/10">
            {availableSlots.length} slots
          </Badge>
        </div>
        
        {availableSlots.length > 0 ? (
          <div className="grid gap-3">
            {availableSlots.map((slot, index) => {
              const isRecommended = bestTimes.some(t => t.start === slot.start)
              const score = slot.productivityScore || 70
              const scoreColor = getScoreColor(score)
              
              return (
                <motion.div
                  key={slot.id || index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "p-4 rounded-xl border backdrop-blur-sm transition-all duration-200",
                    "bg-gradient-to-r from-white/[0.04] to-white/[0.02]",
                    isRecommended 
                      ? "border-emerald-500/30 hover:border-emerald-500/50" 
                      : "border-white/[0.08] hover:border-white/[0.15]",
                    selectedSlot === slot.id && "ring-2 ring-emerald-500/30"
                  )}
                  onClick={() => setSelectedSlot(slot.id === selectedSlot ? null : slot.id)}
                >
                  <div className="flex items-center gap-4">
                    {/* Time Block */}
                    <div className="flex-shrink-0 text-center">
                      <div className="text-lg font-bold text-[var(--text-primary)]">
                        {formatTime(slot.startTime)}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        to {formatTime(slot.endTime)}
                      </div>
                    </div>
                    
                    {/* Divider */}
                    <div className="w-px h-12 bg-white/10" />
                    
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {slot.durationMinutes} minutes available
                        </span>
                        {isRecommended && (
                          <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">
                            <Sparkles className="h-2.5 w-2.5 mr-1" />
                            Recommended
                          </Badge>
                        )}
                      </div>
                      
                      {/* Productivity Score */}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-[var(--text-muted)]">Focus Score:</span>
                        <Progress 
                          value={score} 
                          className={cn(
                            "h-1.5 w-20",
                            scoreColor === 'emerald' && "[&>div]:bg-emerald-500",
                            scoreColor === 'teal' && "[&>div]:bg-teal-500",
                            scoreColor === 'amber' && "[&>div]:bg-amber-500",
                            scoreColor === 'red' && "[&>div]:bg-red-500"
                          )}
                        />
                        <span className={cn(
                          "text-xs font-medium",
                          scoreColor === 'emerald' && "text-emerald-400",
                          scoreColor === 'teal' && "text-teal-400",
                          scoreColor === 'amber' && "text-amber-400",
                          scoreColor === 'red' && "text-red-400"
                        )}>
                          {score}%
                        </span>
                      </div>
                      
                      {slot.reason && (
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          {slot.reason}
                        </p>
                      )}
                    </div>
                    
                    {/* Action */}
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleBlock(slot)
                      }}
                      disabled={blockingSlot === slot.id}
                      className={cn(
                        "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30",
                        blockingSlot === slot.id && "opacity-50"
                      )}
                    >
                      {blockingSlot === slot.id ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Timer className="h-4 w-4" />
                        </motion.div>
                      ) : (
                        <>
                          <Lock className="h-3.5 w-3.5 mr-1.5" />
                          Block
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {/* Expanded details */}
                  <AnimatePresence>
                    {selectedSlot === slot.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 mt-4 border-t border-white/[0.06]">
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-[var(--text-muted)]">Duration:</span>
                            <Slider
                              value={[duration]}
                              onValueChange={([v]) => setDuration(v)}
                              max={Math.min(slot.durationMinutes, 180)}
                              min={30}
                              step={15}
                              className="flex-1"
                            />
                            <span className="text-sm font-medium text-emerald-400 w-20 text-right">
                              {duration} min
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-12 text-center rounded-xl bg-white/[0.02] border border-white/[0.06]"
          >
            <div className="p-4 rounded-full bg-amber-500/10 mb-4">
              <Calendar className="h-8 w-8 text-amber-400" />
            </div>
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
              Busy Day Ahead
            </h3>
            <p className="text-[var(--text-secondary)] max-w-sm">
              No large focus blocks available today. Consider rescheduling some meetings or checking tomorrow.
            </p>
          </motion.div>
        )}
      </div>
      
      {/* Focus Tips */}
      {data?.tips && data.tips.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-[var(--text-secondary)]">
            AI Focus Tips
          </h3>
          <div className="grid gap-2">
            {data.tips.map((tip, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]"
              >
                <Zap className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-[var(--text-secondary)]">{tip}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}
      
      {/* Weekly Focus Goals */}
      {data?.weeklyGoal && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-purple-500/5 border border-purple-500/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-medium text-[var(--text-primary)]">
                Weekly Focus Goal
              </span>
            </div>
            <span className="text-sm text-purple-400 font-medium">
              {data.weeklyGoal.current}h / {data.weeklyGoal.target}h
            </span>
          </div>
          <Progress 
            value={(data.weeklyGoal.current / data.weeklyGoal.target) * 100} 
            className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-purple-500 [&>div]:to-pink-500"
          />
          <p className="text-xs text-[var(--text-muted)] mt-2">
            {data.weeklyGoal.message || `${data.weeklyGoal.target - data.weeklyGoal.current} hours remaining this week`}
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// PATTERN CARD
// ============================================================================

function PatternCard({ icon: Icon, label, value, color = 'emerald' }) {
  const colors = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    teal: 'bg-teal-500/10 border-teal-500/20 text-teal-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  }
  
  return (
    <div className={cn(
      "p-3 rounded-lg border backdrop-blur-sm",
      colors[color]
    )}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <div>
          <div className="text-xs text-[var(--text-muted)]">{label}</div>
          <div className="text-sm font-medium">{value}</div>
        </div>
      </div>
    </div>
  )
}
