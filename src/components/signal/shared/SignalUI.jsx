// src/components/signal/shared/SignalUI.jsx
// Premium UI components for Signal module
// Neural, organic, alive - industry-leading visual design

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Brain, Zap, Activity, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// AMBIENT BACKGROUND - Creates depth and atmosphere
// ============================================================================

export function SignalAmbient({ children, className, intensity = 'medium' }) {
  const intensityMap = {
    low: 'opacity-20',
    medium: 'opacity-30',
    high: 'opacity-40'
  }
  
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Radial gradient orbs for depth */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className={cn(
            "absolute -top-1/2 -left-1/4 w-[800px] h-[800px] rounded-full",
            "bg-gradient-radial from-emerald-500/30 via-emerald-500/5 to-transparent",
            "blur-3xl",
            intensityMap[intensity]
          )}
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.4, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div 
          className={cn(
            "absolute -bottom-1/2 -right-1/4 w-[600px] h-[600px] rounded-full",
            "bg-gradient-radial from-teal-500/30 via-teal-500/5 to-transparent",
            "blur-3xl",
            intensityMap[intensity]
          )}
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        <motion.div 
          className={cn(
            "absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full",
            "bg-gradient-radial from-cyan-500/20 via-transparent to-transparent",
            "blur-3xl",
            intensityMap[intensity]
          )}
          animate={{ scale: [0.8, 1, 0.8], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        />
      </div>
      
      {/* Subtle grid pattern for tech feel */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(16, 185, 129, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />
      
      <div className="relative z-10">{children}</div>
    </div>
  )
}

// ============================================================================
// SIGNAL LOADER - Neural network animation
// ============================================================================

export function SignalLoader({ size = 'md', message, className }) {
  const sizes = {
    sm: { container: 'h-16 w-16', icon: 'h-6 w-6', ring: 24 },
    md: { container: 'h-24 w-24', icon: 'h-8 w-8', ring: 36 },
    lg: { container: 'h-32 w-32', icon: 'h-12 w-12', ring: 48 }
  }
  
  const s = sizes[size]
  
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <div className={cn("relative", s.container)}>
        {/* Outer pulsing ring */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        
        {/* Spinning gradient ring */}
        <motion.div
          className="absolute inset-2 rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, transparent, #10b981, #14b8a6, transparent)'
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
        
        {/* Inner glow */}
        <div className="absolute inset-3 rounded-full bg-[var(--surface-primary)] shadow-inner" />
        
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Brain className={cn("text-emerald-500", s.icon)} />
          </motion.div>
        </div>
        
        {/* Orbiting particles */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400"
            style={{ top: '50%', left: '50%' }}
            animate={{
              x: [Math.cos(i * 2.094) * s.ring, Math.cos((i * 2.094) + Math.PI * 2) * s.ring],
              y: [Math.sin(i * 2.094) * s.ring, Math.sin((i * 2.094) + Math.PI * 2) * s.ring],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: i * 0.33 }}
          />
        ))}
      </div>
      
      {message && (
        <motion.p
          className="text-sm text-[var(--text-secondary)]"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {message}
        </motion.p>
      )}
    </div>
  )
}

// ============================================================================
// PULSE INDICATOR - Live status with glow
// ============================================================================

export function PulseIndicator({ 
  status = 'active', 
  size = 'sm',
  showLabel = false,
  className 
}) {
  const statusConfig = {
    active: { bg: 'bg-emerald-500', glow: 'shadow-emerald-500/50', label: 'Online' },
    warning: { bg: 'bg-amber-500', glow: 'shadow-amber-500/50', label: 'Warning' },
    error: { bg: 'bg-red-500', glow: 'shadow-red-500/50', label: 'Offline' },
    inactive: { bg: 'bg-gray-500', glow: 'shadow-gray-500/50', label: 'Inactive' }
  }
  
  const sizes = {
    xs: 'h-1.5 w-1.5',
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4'
  }
  
  const config = statusConfig[status]
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="relative flex">
        {/* Ping animation */}
        <span className={cn(
          "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
          config.bg
        )} />
        {/* Core dot with glow */}
        <span className={cn(
          "relative inline-flex rounded-full shadow-lg",
          config.bg,
          config.glow,
          sizes[size]
        )} />
      </span>
      {showLabel && (
        <span className="text-xs font-medium text-[var(--text-secondary)]">
          {config.label}
        </span>
      )}
    </div>
  )
}

// ============================================================================
// GLOW CARD - Premium card with ambient glow
// ============================================================================

export function GlowCard({ 
  children, 
  glow = true, 
  glowColor = 'emerald',
  hover = true,
  className, 
  ...props 
}) {
  const glowColors = {
    emerald: 'from-emerald-500/20 to-teal-500/20',
    teal: 'from-teal-500/20 to-cyan-500/20',
    amber: 'from-amber-500/20 to-orange-500/20',
    purple: 'from-purple-500/20 to-pink-500/20'
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hover ? { y: -2, transition: { duration: 0.2 } } : {}}
      className={cn("relative group", className)}
      {...props}
    >
      {/* Ambient glow behind card */}
      {glow && (
        <div className={cn(
          "absolute -inset-px rounded-xl bg-gradient-to-r blur-sm transition-all duration-300",
          glowColors[glowColor],
          hover && "group-hover:blur-md group-hover:-inset-1"
        )} />
      )}
      
      {/* Card content */}
      <div className={cn(
        "relative rounded-xl overflow-hidden",
        "bg-[var(--surface-secondary)]/80 backdrop-blur-sm",
        "border border-white/5",
        "shadow-xl shadow-black/20"
      )}>
        {/* Inner highlight */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative">{children}</div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// STREAMING TEXT - Typewriter effect with cursor
// ============================================================================

export function StreamingText({ text, speed = 30, className, onComplete }) {
  const [displayText, setDisplayText] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  
  useEffect(() => {
    setDisplayText('')
    setIsComplete(false)
    
    let index = 0
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1))
        index++
      } else {
        clearInterval(interval)
        setIsComplete(true)
        onComplete?.()
      }
    }, speed)
    
    return () => clearInterval(interval)
  }, [text, speed])
  
  return (
    <span className={className}>
      {displayText}
      {!isComplete && (
        <motion.span 
          className="inline-block w-0.5 h-4 bg-gradient-to-b from-emerald-500 to-teal-500 ml-0.5"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}
    </span>
  )
}

// ============================================================================
// GRADIENT TEXT - Signal branded text
// ============================================================================

export function SignalGradientText({ children, className, animate = false }) {
  return (
    <span className={cn(
      "bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent",
      className
    )}>
      {children}
    </span>
  )
}

// ============================================================================
// METRIC RING - Circular progress with glow
// ============================================================================

export function MetricRing({ 
  value, 
  maxValue = 100, 
  size = 140, 
  strokeWidth = 10,
  label,
  sublabel,
  loading = false,
  className 
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(value / maxValue, 1)
  const strokeDashoffset = circumference - (progress * circumference)
  
  const getColor = (pct) => {
    if (pct >= 0.8) return { stroke: 'url(#gradient-good)', text: 'text-emerald-400', glow: 'shadow-emerald-500/30' }
    if (pct >= 0.6) return { stroke: 'url(#gradient-ok)', text: 'text-teal-400', glow: 'shadow-teal-500/30' }
    if (pct >= 0.4) return { stroke: 'url(#gradient-warn)', text: 'text-amber-400', glow: 'shadow-amber-500/30' }
    return { stroke: 'url(#gradient-bad)', text: 'text-red-400', glow: 'shadow-red-500/30' }
  }
  
  const colors = getColor(progress)
  
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      {/* Glow effect */}
      <motion.div 
        className={cn("absolute rounded-full", colors.glow)}
        style={{ width: size + 20, height: size + 20, filter: 'blur(20px)' }}
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id="gradient-good" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
          <linearGradient id="gradient-ok" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="gradient-warn" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
          <linearGradient id="gradient-bad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
        
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-white/5"
        />
        
        {/* Progress arc */}
        {!loading && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{ strokeDasharray: circumference }}
            className="drop-shadow-lg"
          />
        )}
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        ) : (
          <>
            <span className={cn("text-4xl font-bold tracking-tight", colors.text)}>
              {Math.round(value)}%
            </span>
            {label && (
              <span className="text-xs text-[var(--text-muted)] mt-1 uppercase tracking-wider">{label}</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// STAT TILE - Premium stat display
// ============================================================================

export function StatTile({ 
  icon: Icon, 
  label, 
  value, 
  sublabel, 
  trend,
  onClick,
  highlight = false,
  className 
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative p-5 rounded-2xl text-left w-full group overflow-hidden",
        "bg-gradient-to-br from-white/[0.05] to-white/[0.02]",
        "backdrop-blur-sm",
        "border border-white/[0.08] hover:border-emerald-500/30",
        "shadow-xl shadow-black/10",
        "transition-all duration-300",
        highlight && "border-emerald-500/30",
        className
      )}
    >
      {/* Hover glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-teal-500/0 group-hover:from-emerald-500/5 group-hover:to-teal-500/5 transition-all duration-500" />
      
      {/* Icon with glow */}
      <div className="relative mb-4">
        <div className={cn(
          "absolute -inset-2 rounded-xl blur-xl transition-opacity duration-300",
          "bg-gradient-to-r from-emerald-500/20 to-teal-500/20",
          "opacity-0 group-hover:opacity-100"
        )} />
        <div className={cn(
          "relative p-3 rounded-xl w-fit",
          "bg-gradient-to-br from-emerald-500/20 to-teal-500/10",
          "border border-emerald-500/20 group-hover:border-emerald-500/40",
          "transition-colors duration-300"
        )}>
          <Icon className="h-5 w-5 text-emerald-400" />
        </div>
      </div>
      
      {/* Value */}
      <div className="text-3xl font-bold text-[var(--text-primary)] mb-1">
        {value}
      </div>
      
      {/* Label */}
      <div className="text-sm text-[var(--text-secondary)] font-medium">{label}</div>
      
      {/* Sublabel */}
      {sublabel && (
        <div className="text-xs text-[var(--text-muted)] mt-1.5">{sublabel}</div>
      )}
      
      {/* Trend indicator */}
      {trend !== undefined && trend !== 0 && (
        <div className={cn(
          "absolute top-5 right-5 flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
          trend > 0 
            ? "text-emerald-400 bg-emerald-500/10" 
            : "text-red-400 bg-red-500/10"
        )}>
          <Activity className="h-3 w-3" />
          {trend > 0 ? '+' : ''}{trend}%
        </div>
      )}
    </motion.button>
  )
}

// ============================================================================
// ACTION BUTTON - Premium call-to-action
// ============================================================================

export function ActionButton({ 
  icon: Icon, 
  label, 
  description, 
  onClick, 
  variant = 'default',
  className 
}) {
  const isPrimary = variant === 'primary'
  
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01, x: 4 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "relative w-full p-4 rounded-xl text-left overflow-hidden group",
        "backdrop-blur-sm border transition-all duration-300",
        "shadow-lg shadow-black/10",
        isPrimary 
          ? "bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-400/20 hover:shadow-emerald-500/20 hover:shadow-xl" 
          : "bg-gradient-to-br from-white/[0.05] to-white/[0.02] border-white/[0.08] hover:border-emerald-500/30",
        className
      )}
    >
      {/* Shine effect */}
      <div className={cn(
        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
        "bg-gradient-to-r from-transparent via-white/10 to-transparent",
        "-translate-x-full group-hover:translate-x-full transition-transform duration-1000"
      )} />
      
      <div className="relative flex items-center gap-4">
        {/* Icon */}
        <div className={cn(
          "p-2.5 rounded-xl border",
          isPrimary 
            ? "bg-white/20 border-white/20" 
            : "bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border-emerald-500/20"
        )}>
          <Icon className={cn("h-5 w-5", isPrimary ? "text-white" : "text-emerald-400")} />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className={cn(
            "font-semibold",
            isPrimary ? "text-white" : "text-[var(--text-primary)]"
          )}>
            {label}
          </div>
          {description && (
            <div className={cn(
              "text-sm truncate",
              isPrimary ? "text-white/70" : "text-[var(--text-muted)]"
            )}>
              {description}
            </div>
          )}
        </div>
        
        {/* Arrow */}
        <ChevronRight className={cn(
          "h-5 w-5 transition-transform group-hover:translate-x-1",
          isPrimary ? "text-white/70" : "text-[var(--text-muted)]"
        )} />
      </div>
    </motion.button>
  )
}

// ============================================================================
// DOMAIN TILE - Knowledge domain indicator
// ============================================================================

export function DomainTile({ icon: Icon, label, coverage, onClick, className }) {
  const getCoverageConfig = (pct) => {
    if (pct >= 70) return { color: 'emerald', bg: 'from-emerald-500/20 to-emerald-500/5', border: 'border-emerald-500/20', text: 'text-emerald-400' }
    if (pct >= 40) return { color: 'teal', bg: 'from-teal-500/20 to-teal-500/5', border: 'border-teal-500/20', text: 'text-teal-400' }
    if (pct >= 20) return { color: 'amber', bg: 'from-amber-500/20 to-amber-500/5', border: 'border-amber-500/20', text: 'text-amber-400' }
    return { color: 'red', bg: 'from-red-500/20 to-red-500/5', border: 'border-red-500/20', text: 'text-red-400' }
  }
  
  const config = getCoverageConfig(coverage)
  
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05, y: -4 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "relative p-4 rounded-xl text-left group overflow-hidden",
        "bg-gradient-to-br from-white/[0.04] to-transparent",
        "backdrop-blur-sm",
        "border border-white/[0.06] hover:border-emerald-500/30",
        "transition-all duration-300",
        className
      )}
    >
      {/* Background glow on hover */}
      <div className={cn(
        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
        "bg-gradient-to-br",
        config.bg
      )} />
      
      {/* Icon */}
      <div className={cn(
        "relative p-2.5 rounded-lg w-fit mb-3",
        "bg-gradient-to-br",
        config.bg,
        "border",
        config.border
      )}>
        <Icon className={cn("h-5 w-5", config.text)} />
      </div>
      
      {/* Label */}
      <div className="relative text-sm font-medium text-[var(--text-primary)] mb-3">
        {label}
      </div>
      
      {/* Progress bar */}
      <div className="relative h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500")}
          initial={{ width: 0 }}
          animate={{ width: `${coverage}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        />
      </div>
      
      {/* Percentage */}
      <div className={cn("relative text-xs font-semibold mt-2", config.text)}>
        {coverage}%
      </div>
    </motion.button>
  )
}

// ============================================================================
// NEURAL GRAPH PLACEHOLDER
// ============================================================================

export function NeuralGraph({ nodes = [], edges = [], className }) {
  return (
    <div className={cn(
      "relative h-64 rounded-2xl overflow-hidden",
      "bg-gradient-to-br from-white/[0.03] to-transparent",
      "border border-white/[0.06]",
      "flex items-center justify-center",
      className
    )}>
      {/* Animated background */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-emerald-500/10 blur-3xl"
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-24 h-24 rounded-full bg-teal-500/10 blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.2, 0.4] }}
          transition={{ duration: 5, repeat: Infinity, delay: 1 }}
        />
      </div>
      
      <div className="relative text-center">
        <motion.div 
          className="relative inline-block mb-4"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 rounded-full blur-xl" />
          <div className="relative p-5 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30">
            <Brain className="h-10 w-10 text-emerald-400" />
          </div>
        </motion.div>
        <p className="text-sm font-medium text-[var(--text-secondary)]">
          Knowledge Graph
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Interactive visualization coming soon
        </p>
      </div>
    </div>
  )
}
