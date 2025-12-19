// src/components/seo/setup-wizard/WizardComponents.jsx
// Reusable UI components for the SEO Setup Wizard
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  ChevronRight,
  Activity,
  FileText,
  Target,
  Lightbulb,
  Code,
  Sparkles
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// =============================================================================
// PROGRESS RING - Animated circular progress indicator
// =============================================================================
export function ProgressRing({ progress, size = 120 }) {
  const radius = (size - 12) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" style={{ width: size, height: size }}>
        <circle
          className="text-gray-200"
          strokeWidth="8"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <motion.circle
          className="text-primary"
          strokeWidth="8"
          stroke="url(#gradient)"
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            strokeDasharray: circumference,
          }}
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="50%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold">{Math.round(progress)}%</span>
      </div>
    </div>
  )
}

// =============================================================================
// PHASE INDICATOR - Shows phase status in header
// =============================================================================
export function PhaseIndicator({ phase, isActive, isCompleted, index }) {
  const Icon = phase.icon
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
        isCompleted && 'bg-emerald-100 text-emerald-700',
        isActive && !isCompleted && `bg-gradient-to-r ${phase.color} text-white shadow-lg`,
        !isActive && !isCompleted && 'bg-gray-100 text-gray-400'
      )}
    >
      {isCompleted ? (
        <CheckCircle2 className="w-4 h-4" />
      ) : isActive ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Icon className="w-4 h-4" />
        </motion.div>
      ) : (
        <Icon className="w-4 h-4" />
      )}
      <span>{phase.title}</span>
    </motion.div>
  )
}

// =============================================================================
// STEP INDICATOR - Shows individual step status
// =============================================================================
export function StepIndicator({ step, status, isActive, index }) {
  const Icon = step.icon
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg transition-all duration-300',
        isActive && 'bg-white shadow-md border border-gray-100',
        status === 'completed' && 'opacity-70',
        status === 'pending' && 'opacity-40'
      )}
    >
      <div className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center transition-all',
        step.bgColor,
        isActive && 'scale-110 shadow-md'
      )}>
        {status === 'completed' ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        ) : status === 'running' ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className={cn('w-5 h-5', step.color)} />
          </motion.div>
        ) : status === 'error' ? (
          <AlertCircle className="w-5 h-5 text-red-500" />
        ) : (
          <Icon className={cn('w-5 h-5', step.color)} />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn(
            'font-medium text-sm truncate',
            isActive ? 'text-gray-900' : 'text-gray-600'
          )}>
            {step.title}
          </p>
          {step.optional && status === 'pending' && (
            <Badge variant="outline" className="text-xs">Optional</Badge>
          )}
        </div>
        {isActive && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="text-xs text-gray-500 truncate"
          >
            {step.description}
          </motion.p>
        )}
      </div>
      
      {status === 'completed' && (
        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
      )}
    </motion.div>
  )
}

// =============================================================================
// LOG ENTRY - Single log line with icon
// =============================================================================
export function LogEntry({ log, index }) {
  const getLogIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'warning': return <AlertCircle className="w-4 h-4 text-amber-500" />
      default: return <ChevronRight className="w-4 h-4 text-gray-400" />
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className={cn(
        'flex items-start gap-2 py-1 text-sm',
        log.type === 'error' && 'text-red-600',
        log.type === 'success' && 'text-emerald-600',
        log.type === 'warning' && 'text-amber-600'
      )}
    >
      {getLogIcon(log.type)}
      <span className="flex-1">{log.message}</span>
      <span className="text-xs text-gray-400">{log.time}</span>
    </motion.div>
  )
}

// =============================================================================
// STAT CARD - Shows a single metric
// =============================================================================
export function StatCard({ label, value, icon: Icon, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-xl p-4 shadow-sm border"
    >
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', color)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </motion.div>
  )
}

// =============================================================================
// LOG PANEL - Container for activity logs
// =============================================================================
export function LogPanel({ logs, isRunning, logContainerRef }) {
  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Live Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div 
          ref={logContainerRef}
          className="h-full overflow-y-auto space-y-1 text-xs font-mono"
        >
          <AnimatePresence mode="popLayout">
            {logs.map((log, index) => (
              <LogEntry key={index} log={log} index={index} />
            ))}
          </AnimatePresence>
          {isRunning && (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex items-center gap-2 text-gray-400 pt-2"
            >
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Processing...</span>
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// STATS GRID - Grid of stat cards
// =============================================================================
export function StatsGrid({ stats }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard 
        label="Pages Discovered" 
        value={stats.pagesDiscovered} 
        icon={FileText} 
        color="bg-blue-500" 
      />
      <StatCard 
        label="Keywords Tracked" 
        value={stats.keywordsTracked} 
        icon={Target} 
        color="bg-purple-500" 
      />
      <StatCard 
        label="Issues Found" 
        value={stats.issuesFound} 
        icon={AlertCircle} 
        color="bg-orange-500" 
      />
      <StatCard 
        label="Opportunities" 
        value={stats.opportunitiesDetected} 
        icon={Lightbulb} 
        color="bg-amber-500" 
      />
      <StatCard 
        label="Schema Generated" 
        value={stats.schemaGenerated} 
        icon={Code} 
        color="bg-green-500" 
      />
      <StatCard 
        label="Recommendations" 
        value={stats.recommendationsCreated} 
        icon={Sparkles} 
        color="bg-cyan-500" 
      />
    </div>
  )
}
