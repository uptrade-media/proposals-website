/**
 * Score Display Components
 * Liquid Glass styled score cards for audit reports
 */
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { 
  scaleIn, 
  fadeInUp, 
  getScoreColor, 
  formatMs,
  hoverLift 
} from './utils'

/**
 * ScoreCard - Large score display with icon and description
 * Used in the main score grid at top of audit
 */
export function ScoreCard({ label, value, icon: Icon, description }) {
  const colors = getScoreColor(value)
  
  return (
    <motion.div 
      variants={scaleIn}
      {...hoverLift}
      className={`rounded-2xl p-5 ${colors.bg} border border-[var(--glass-border)] backdrop-blur-sm cursor-default
        hover:shadow-lg hover:shadow-[var(--brand-primary)]/10 transition-all duration-300`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${colors.text}`} />
        </div>
        <span className="font-medium text-[var(--text-primary)]">{label}</span>
      </div>
      <div className={`text-4xl font-bold ${colors.text} mb-1 tabular-nums`}>
        {value ?? 'N/A'}
      </div>
      <div className="text-xs text-[var(--text-tertiary)] font-medium">{colors.label}</div>
      {description && (
        <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">{description}</p>
      )}
    </motion.div>
  )
}

/**
 * MetricCard - Core Web Vital metric with progress bar
 * Used for LCP, FID, CLS, TTFB display
 */
export function MetricCard({ name, value, target, score }) {
  const colors = getScoreColor(score)
  
  return (
    <motion.div 
      variants={fadeInUp}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="bg-[var(--glass-bg)] backdrop-blur-sm rounded-xl p-4 border border-[var(--glass-border)]
        hover:border-[var(--glass-border-strong)] transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[var(--text-primary)]">{name}</span>
        <Badge variant="outline" className={`${colors.bg} ${colors.text} border-0 text-xs font-medium`}>
          {colors.label}
        </Badge>
      </div>
      <div className={`text-2xl font-bold ${colors.text} mb-1 tabular-nums`}>{value}</div>
      <div className="text-xs text-[var(--text-tertiary)]">Target: {target}</div>
      <div className="mt-2 h-1.5 bg-[var(--glass-bg-inset)] rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(score || 0, 100)}%` }}
          transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.3 }}
          className={`h-full rounded-full ${score >= 90 ? 'bg-[var(--accent-green)]' : score >= 70 ? 'bg-[var(--accent-orange)]' : 'bg-[var(--accent-red)]'}`}
        />
      </div>
    </motion.div>
  )
}

/**
 * MiniMetricCard - Compact metric display for secondary metrics
 * Used for TTI, TBT, Speed Index
 */
export function MiniMetricCard({ icon: Icon, value, label }) {
  return (
    <motion.div 
      variants={fadeInUp} 
      className="bg-[var(--glass-bg-inset)] rounded-xl p-4 text-center hover:bg-[var(--glass-bg)] transition-colors duration-300"
    >
      {Icon && <Icon className="w-6 h-6 mx-auto mb-2 text-[var(--text-secondary)]" />}
      <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{value}</div>
      <div className="text-xs text-[var(--text-tertiary)] font-medium">{label}</div>
    </motion.div>
  )
}

/**
 * GradeBadge - Large animated grade display
 * Used in the header section
 */
export function GradeBadge({ grade, gradeColor, size = 'default' }) {
  const sizeClasses = {
    default: 'w-28 h-28 md:w-32 md:h-32 text-5xl md:text-6xl',
    small: 'w-16 h-16 text-2xl',
    large: 'w-36 h-36 text-7xl'
  }
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
      className={`${sizeClasses[size]} rounded-2xl bg-gradient-to-br ${gradeColor} flex items-center justify-center shadow-2xl flex-shrink-0 ring-4 ring-white/10`}
    >
      <span className="font-bold text-white drop-shadow-lg">{grade}</span>
    </motion.div>
  )
}

/**
 * ScoreGrid - Container for score cards
 * Responsive grid layout with proper spacing
 */
export function ScoreGrid({ children }) {
  return (
    <div className="bg-[var(--glass-bg)] backdrop-blur-xl border-b border-[var(--glass-border)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <motion.div 
          variants={{ 
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
          }}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 lg:grid-cols-5 gap-4"
        >
          {children}
        </motion.div>
      </div>
    </div>
  )
}
