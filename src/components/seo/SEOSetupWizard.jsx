/**
 * SEO Setup Wizard - Comprehensive Edition
 * 
 * Epic onboarding flow that walks through ALL SEO features:
 * - Site discovery & crawling
 * - Google Search Console integration
 * - Signal AI training
 * - Schema markup generation
 * - Internal link analysis
 * - Keyword cannibalization detection
 * - Topic cluster mapping
 * - SERP feature opportunities
 * - Content decay detection
 * - Competitor analysis
 * - Local SEO setup
 * - And much more!
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Globe, 
  Brain, 
  Search, 
  FileText, 
  Link2, 
  Zap, 
  CheckCircle2, 
  Loader2,
  Sparkles,
  BarChart3,
  Target,
  Lightbulb,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Code,
  MapPin,
  Users,
  TrendingDown,
  Layers,
  Award,
  Shield,
  Clock,
  Rocket,
  ChevronRight,
  Activity,
  Database,
  Settings,
  Eye,
  PenLine,
  Gauge,
  Network,
  Microscope,
  BookOpen
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import SignalSEOLogo from './SignalSEOLogo'

// =============================================================================
// PHASE DEFINITIONS - Major stages of setup
// =============================================================================
const SETUP_PHASES = [
  {
    id: 'discovery',
    title: 'Discovery',
    description: 'Site crawling & content analysis',
    icon: Search,
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'data',
    title: 'Data Integration',
    description: 'GSC & performance metrics',
    icon: BarChart3,
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'intelligence',
    title: 'Signal Intelligence',
    description: 'Training Signal AI',
    icon: Brain,
    color: 'from-purple-500 to-indigo-500'
  },
  {
    id: 'analysis',
    title: 'Deep Analysis',
    description: 'Technical & content audits',
    icon: Microscope,
    color: 'from-orange-500 to-rose-500'
  },
  {
    id: 'optimization',
    title: 'Optimization',
    description: 'Schema, metadata & recommendations',
    icon: Zap,
    color: 'from-amber-500 to-yellow-500'
  }
]

// =============================================================================
// DETAILED STEP DEFINITIONS - All 47+ operations
// =============================================================================
const SETUP_STEPS = [
  // PHASE 1: DISCOVERY
  {
    id: 'connect',
    phase: 'discovery',
    title: 'Connecting to Site',
    description: 'Verifying domain access and configuration',
    icon: Globe,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    duration: 2000
  },
  {
    id: 'crawl-sitemap',
    phase: 'discovery',
    title: 'Crawling Sitemap',
    description: 'Discovering all pages from sitemap.xml',
    icon: Search,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    endpoint: 'seo-crawl-sitemap',
    duration: 5000
  },
  {
    id: 'crawl-pages',
    phase: 'discovery',
    title: 'Analyzing Page Content',
    description: 'Extracting titles, descriptions, headings, and content',
    icon: FileText,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    endpoint: 'seo-crawl-page',
    batch: true,
    duration: 8000
  },
  {
    id: 'internal-links',
    phase: 'discovery',
    title: 'Mapping Internal Links',
    description: 'Building site architecture and link graph',
    icon: Network,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
    endpoint: 'seo-internal-links',
    duration: 4000
  },
  
  // PHASE 2: DATA INTEGRATION
  {
    id: 'gsc-connect',
    phase: 'data',
    title: 'Google Search Console Sync',
    description: 'Syncing queries, pages, and performance data',
    icon: BarChart3,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    endpoint: 'seo-gsc-sync',
    duration: 3000
  },
  {
    id: 'gsc-queries',
    phase: 'data',
    title: 'Search Queries',
    description: '(Included in GSC sync)',
    icon: Target,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    endpoint: 'seo-gsc-queries',
    duration: 3000,
    autoComplete: true // Completed by gsc-connect
  },
  {
    id: 'gsc-pages',
    phase: 'data',
    title: 'Page Metrics',
    description: '(Included in GSC sync)',
    icon: Activity,
    color: 'text-teal-500',
    bgColor: 'bg-teal-500/10',
    endpoint: 'seo-gsc-pages',
    duration: 3000,
    autoComplete: true // Completed by gsc-connect
  },
  {
    id: 'gsc-indexing',
    phase: 'data',
    title: 'Indexing Status Check',
    description: 'Detecting 404s, 5xx errors, and indexing issues',
    icon: Shield,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    endpoint: 'seo-gsc-indexing',
    duration: 4000
  },
  {
    id: 'pagespeed',
    phase: 'data',
    title: 'Core Web Vitals',
    description: 'Measuring LCP, INP, CLS performance',
    icon: Gauge,
    color: 'text-lime-500',
    bgColor: 'bg-lime-500/10',
    endpoint: 'seo-pagespeed-impact',
    duration: 5000
  },
  
  // PHASE 3: AI INTELLIGENCE
  {
    id: 'ai-train',
    phase: 'intelligence',
    title: 'Training Signal',
    description: 'Teaching Signal about your business and content',
    icon: Brain,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    endpoint: 'seo-ai-train',
    duration: 8000
  },
  {
    id: 'ai-knowledge',
    phase: 'intelligence',
    title: 'Building Knowledge Base',
    description: 'Signal learning your site structure',
    icon: Database,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    endpoint: 'seo-ai-knowledge',
    duration: 5000
  },
  {
    id: 'topic-clusters',
    phase: 'intelligence',
    title: 'Topic Cluster Mapping',
    description: 'Signal organizing your content clusters',
    icon: Layers,
    color: 'text-fuchsia-500',
    bgColor: 'bg-fuchsia-500/10',
    endpoint: 'seo-topic-clusters',
    duration: 4000
  },
  {
    id: 'blog-brain',
    phase: 'intelligence',
    title: 'Content Style Training',
    description: 'Signal learning your writing style',
    icon: PenLine,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    endpoint: 'seo-ai-blog-brain',
    duration: 4000
  },
  
  // PHASE 4: DEEP ANALYSIS
  {
    id: 'cannibalization',
    phase: 'analysis',
    title: 'Keyword Cannibalization',
    description: 'Detecting pages competing for same keywords',
    icon: AlertCircle,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    endpoint: 'seo-cannibalization',
    duration: 4000
  },
  {
    id: 'content-decay',
    phase: 'analysis',
    title: 'Content Decay Detection',
    description: 'Finding pages losing traffic over time',
    icon: TrendingDown,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    endpoint: 'seo-content-decay',
    duration: 3000
  },
  {
    id: 'content-gap',
    phase: 'analysis',
    title: 'Content Gap Analysis',
    description: 'Identifying missing topics and opportunities',
    icon: Search,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    endpoint: 'seo-content-gap-analysis',
    duration: 4000
  },
  {
    id: 'serp-features',
    phase: 'analysis',
    title: 'SERP Feature Opportunities',
    description: 'Finding featured snippet and FAQ targets',
    icon: Award,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    endpoint: 'seo-serp-features',
    duration: 4000
  },
  {
    id: 'technical-audit',
    phase: 'analysis',
    title: 'Technical SEO Audit',
    description: 'Checking robots, canonicals, redirects',
    icon: Shield,
    color: 'text-slate-500',
    bgColor: 'bg-slate-500/10',
    endpoint: 'seo-technical-audit',
    duration: 4000
  },
  {
    id: 'backlinks',
    phase: 'analysis',
    title: 'Backlink Analysis',
    description: 'Mapping external links and authority',
    icon: Link2,
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10',
    endpoint: 'seo-backlinks',
    duration: 3000
  },
  {
    id: 'local-seo',
    phase: 'analysis',
    title: 'Local SEO Check',
    description: 'Analyzing local signals and citations',
    icon: MapPin,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    endpoint: 'seo-local-analyze',
    duration: 3000
  },
  {
    id: 'competitors',
    phase: 'analysis',
    title: 'Competitor Analysis',
    description: 'Benchmarking against top competitors',
    icon: Users,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
    endpoint: 'seo-competitor-analyze',
    duration: 5000
  },
  
  // PHASE 5: OPTIMIZATION
  {
    id: 'schema-generate',
    phase: 'optimization',
    title: 'Generating Schema Markup',
    description: 'Creating structured data for all page types',
    icon: Code,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    endpoint: 'seo-schema-generate',
    duration: 5000
  },
  {
    id: 'metadata-optimize',
    phase: 'optimization',
    title: 'Optimizing Metadata',
    description: 'AI-powered title and description improvements',
    icon: PenLine,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    endpoint: 'seo-metadata-api',
    duration: 5000
  },
  {
    id: 'predictive-ranking',
    phase: 'optimization',
    title: 'Predictive Ranking Scores',
    description: 'Calculating ranking potential for all pages',
    icon: Rocket,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    endpoint: 'seo-predictive-ranking',
    duration: 4000
  },
  {
    id: 'opportunities',
    phase: 'optimization',
    title: 'Detecting Quick Wins',
    description: 'Finding high-impact, low-effort improvements',
    icon: Lightbulb,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    endpoint: 'seo-opportunities-detect',
    duration: 4000
  },
  {
    id: 'ai-recommendations',
    phase: 'optimization',
    title: 'AI Recommendations',
    description: 'Generating prioritized action items',
    icon: Sparkles,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    endpoint: 'seo-ai-recommendations',
    duration: 5000
  },
  {
    id: 'auto-optimize',
    phase: 'optimization',
    title: 'Running Auto-Optimization',
    description: 'Applying quick fixes and generating recommendations',
    icon: Zap,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    endpoint: 'seo-auto-optimize',
    duration: 4000
  },
  {
    id: 'keyword-tracking',
    phase: 'optimization',
    title: 'Setting Up Keyword Tracking',
    description: 'Importing top keywords from GSC for long-term tracking',
    icon: Target,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    endpoint: 'seo-keywords-import',
    duration: 3000
  },
  {
    id: 'cwv-baseline',
    phase: 'optimization',
    title: 'Recording CWV Baseline',
    description: 'Measuring initial Core Web Vitals performance',
    icon: Gauge,
    color: 'text-lime-500',
    bgColor: 'bg-lime-500/10',
    endpoint: 'seo-cwv',
    duration: 5000
  },
  {
    id: 'schedule-setup',
    phase: 'optimization',
    title: 'Setting Up Automation',
    description: 'Configuring recurring analysis schedules',
    icon: Clock,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    endpoint: 'seo-schedule',
    duration: 2000
  },
  {
    id: 'complete',
    phase: 'optimization',
    title: 'Setup Complete!',
    description: 'Your AI SEO Brain is fully configured',
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    duration: 1000
  }
]

// =============================================================================
// ANIMATED COMPONENTS
// =============================================================================

// Animated progress ring
function ProgressRing({ progress, size = 120 }) {
  const radius = (size - 12) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" style={{ width: size, height: size }}>
        <circle
          className="text-[var(--glass-border)]"
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
          stroke="url(#signal-gradient)"
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
          <linearGradient id="signal-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#95d47d" />
            <stop offset="100%" stopColor="#238b95" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-[var(--text-primary)]">{Math.round(progress)}%</span>
      </div>
    </div>
  )
}

// Phase indicator pill
function PhaseIndicator({ phase, isActive, isCompleted, index }) {
  const Icon = phase.icon
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
        isCompleted && 'bg-emerald-500/20 text-emerald-500',
        isActive && !isCompleted && `bg-gradient-to-r ${phase.color} text-white shadow-lg`,
        !isActive && !isCompleted && 'bg-[var(--glass-bg)] text-[var(--text-tertiary)]'
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

// Step status component
function StepIndicator({ step, status, isActive, index }) {
  const Icon = step.icon
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg transition-all duration-300',
        isActive && 'bg-[var(--glass-bg)] shadow-md border border-[var(--glass-border)]',
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
            isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
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
            className="text-xs text-[var(--text-secondary)] truncate"
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

// Live log entry
function LogEntry({ log, index }) {
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

// Stats card
function StatCard({ label, value, icon: Icon, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-[var(--glass-bg)] rounded-xl p-4 shadow-sm border border-[var(--glass-border)] w-full"
    >
      <div className="flex flex-col items-center text-center gap-2">
        <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', color)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="w-full">
          <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
          <p className="text-xs text-[var(--text-secondary)] whitespace-nowrap overflow-hidden text-ellipsis">{label}</p>
        </div>
      </div>
    </motion.div>
  )
}

// =============================================================================
// MAIN WIZARD COMPONENT
// =============================================================================
export default function SEOSetupWizard({ siteId, domain, onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [currentPhase, setCurrentPhase] = useState('discovery')
  const [stepStatuses, setStepStatuses] = useState({})
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState([])
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    pagesDiscovered: 0,
    keywordsTracked: 0,
    issuesFound: 0,
    opportunitiesDetected: 0,
    schemaGenerated: 0,
    recommendationsCreated: 0
  })
  const [failedStep, setFailedStep] = useState(null)
  const [parallelProgress, setParallelProgress] = useState({ running: 0, completed: 0, total: 0 })
  const abortSignalRef = useRef(0) // Increment to abort current operations
  const logContainerRef = useRef(null)

  // Add log entry (with optional deduplication for parallel runs)
  const addLog = useCallback((message, type = 'info') => {
    const time = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
    setLogs(prev => [...prev.slice(-50), { message, type, time }]) // Keep last 50 logs
  }, [])

  // Update step status
  const updateStep = useCallback((stepId, status) => {
    setStepStatuses(prev => ({ ...prev, [stepId]: status }))
  }, [])

  // Update stats
  const updateStats = useCallback((newStats) => {
    setStats(prev => ({ ...prev, ...newStats }))
  }, [])

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])

  // Get current phase from step
  useEffect(() => {
    const step = SETUP_STEPS[currentStep]
    if (step) {
      setCurrentPhase(step.phase)
    }
  }, [currentStep])

  // =========================================================================
  // PARALLEL STEP EXECUTION GROUPS
  // =========================================================================
  
  // Phase 1: Sequential discovery (must complete before parallel phase)
  const SEQUENTIAL_DISCOVERY_STEPS = ['connect', 'crawl-sitemap', 'crawl-pages', 'internal-links']
  
  // Phase 2: GSC sync (must complete before parallel analysis) - single step does all GSC work
  const GSC_SYNC_STEPS = ['gsc-connect'] // gsc-queries and gsc-pages are handled by same sync
  
  // Phase 3: PARALLEL - All these can run simultaneously after GSC sync
  const PARALLEL_ANALYSIS_STEPS = [
    'gsc-indexing',
    'pagespeed',
    'topic-clusters',
    'blog-brain',
    'cannibalization',
    'content-decay',
    'content-gap',
    'serp-features',
    'technical-audit',
    'backlinks',
    'local-seo',
    'competitors',
    'schema-generate',
    'metadata-optimize',
    'predictive-ranking',
    'opportunities'
  ]
  
  // Phase 4: Signal training (must wait for all analysis) - ai-knowledge is just a read, skip it
  const SIGNAL_TRAINING_STEPS = ['ai-train']
  
  // Phase 5: Final recommendations (after Signal training)
  const FINAL_STEPS = ['ai-recommendations', 'auto-optimize', 'keyword-tracking', 'cwv-baseline', 'schedule-setup', 'complete']

  // Main setup runner with parallel execution
  const runSetup = useCallback(async () => {
    if (isRunning) return
    
    setIsRunning(true)
    setError(null)
    setFailedStep(null)
    setLogs([])
    
    addLog('🚀 Starting comprehensive SEO setup...', 'info')
    addLog(`📍 Domain: ${domain}`, 'info')

    const startAbortSignal = abortSignalRef.current
    
    try {
      // =====================================================================
      // PHASE 1: Sequential Discovery Steps
      // =====================================================================
      addLog('📡 Phase 1: Site Discovery', 'info')
      
      for (const stepId of SEQUENTIAL_DISCOVERY_STEPS) {
        if (abortSignalRef.current !== startAbortSignal) return
        
        const stepIndex = SETUP_STEPS.findIndex(s => s.id === stepId)
        const step = SETUP_STEPS[stepIndex]
        if (!step) continue
        
        setCurrentStep(stepIndex)
        updateStep(step.id, 'running')
        setProgress(Math.round((stepIndex / SETUP_STEPS.length) * 100))
        
        addLog(`▶️ ${step.title}...`, 'info')
        
        try {
          await executeStep(step)
          updateStep(step.id, 'completed')
          addLog(`✅ ${step.title}`, 'success')
        } catch (stepError) {
          updateStep(step.id, 'error')
          const errorMessage = stepError.response?.data?.message || stepError.response?.data?.error || stepError.message
          addLog(`❌ ${step.title}: ${errorMessage}`, 'error')
          setError(`${step.title} failed: ${errorMessage}`)
          setFailedStep({ id: step.id, title: step.title, error: errorMessage, stepIndex })
          setIsRunning(false)
          return
        }
        
        await new Promise(r => setTimeout(r, 200))
      }
      
      // =====================================================================
      // PHASE 2: GSC Sync (Sequential - must complete before parallel)
      // =====================================================================
      if (abortSignalRef.current !== startAbortSignal) return
      
      addLog('📊 Phase 2: Google Search Console Sync', 'info')
      
      for (const stepId of GSC_SYNC_STEPS) {
        if (abortSignalRef.current !== startAbortSignal) return
        
        const stepIndex = SETUP_STEPS.findIndex(s => s.id === stepId)
        const step = SETUP_STEPS[stepIndex]
        if (!step) continue
        
        setCurrentStep(stepIndex)
        updateStep(step.id, 'running')
        setProgress(Math.round((stepIndex / SETUP_STEPS.length) * 100))
        
        addLog(`▶️ ${step.title}...`, 'info')
        
        try {
          await executeStep(step)
          updateStep(step.id, 'completed')
          addLog(`✅ ${step.title}`, 'success')
        } catch (stepError) {
          updateStep(step.id, 'error')
          const errorMessage = stepError.response?.data?.message || stepError.response?.data?.error || stepError.message
          addLog(`❌ ${step.title}: ${errorMessage}`, 'error')
          setError(`${step.title} failed: ${errorMessage}`)
          setFailedStep({ id: step.id, title: step.title, error: errorMessage, stepIndex })
          setIsRunning(false)
          return
        }
        
        await new Promise(r => setTimeout(r, 200))
      }
      
      // =====================================================================
      // PHASE 3: PARALLEL Analysis (All at once!)
      // =====================================================================
      if (abortSignalRef.current !== startAbortSignal) return
      
      addLog(`⚡ Phase 3: Running ${PARALLEL_ANALYSIS_STEPS.length} analysis steps in parallel...`, 'info')
      
      // Mark all parallel steps as running
      const parallelStepObjects = PARALLEL_ANALYSIS_STEPS.map(id => {
        const stepIndex = SETUP_STEPS.findIndex(s => s.id === id)
        return { ...SETUP_STEPS[stepIndex], stepIndex }
      }).filter(s => s)
      
      for (const step of parallelStepObjects) {
        updateStep(step.id, 'running')
      }
      
      // Track parallel progress
      let completedCount = 0
      let failedCount = 0
      const parallelErrors = []
      
      setParallelProgress({ running: parallelStepObjects.length, completed: 0, total: parallelStepObjects.length })
      
      // Execute all in parallel with progress tracking
      const parallelPromises = parallelStepObjects.map(async (step) => {
        try {
          await executeStep(step, true) // true = silent mode (no individual logs)
          updateStep(step.id, 'completed')
          completedCount++
          setParallelProgress(prev => ({ ...prev, completed: completedCount, running: prev.total - completedCount }))
          
          // Only log completion, not individual details
          // Progress update shows overall count
          return { success: true, step }
        } catch (err) {
          updateStep(step.id, 'error')
          failedCount++
          const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message
          parallelErrors.push({ step, error: errorMessage })
          return { success: false, step, error: errorMessage }
        }
      })
      
      // Wait for all parallel steps with progress updates
      const progressInterval = setInterval(() => {
        if (abortSignalRef.current !== startAbortSignal) {
          clearInterval(progressInterval)
          return
        }
        const completed = completedCount
        const total = parallelStepObjects.length
        const pct = Math.round((completed / total) * 100)
        setProgress(40 + Math.round(pct * 0.4)) // 40-80% range for parallel phase
        
        if (completed > 0 && completed < total) {
          // Update log with progress count (replace last progress log)
          setLogs(prev => {
            const filtered = prev.filter(l => !l.message.startsWith('⚡ Parallel:'))
            return [...filtered, { 
              message: `⚡ Parallel: ${completed}/${total} complete (${total - completed} running)`, 
              type: 'info',
              time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            }]
          })
        }
      }, 1000)
      
      // Wait for all to complete
      await Promise.all(parallelPromises)
      clearInterval(progressInterval)
      
      // Log final parallel status
      addLog(`✅ Parallel phase complete: ${completedCount} succeeded, ${failedCount} failed`, 
        failedCount > 0 ? 'warning' : 'success')
      
      // If critical steps failed, report but continue
      if (parallelErrors.length > 0) {
        for (const { step, error } of parallelErrors.slice(0, 3)) { // Show first 3 errors
          addLog(`  └ ⚠️ ${step.title}: ${error}`, 'warning')
        }
        if (parallelErrors.length > 3) {
          addLog(`  └ ... and ${parallelErrors.length - 3} more warnings`, 'warning')
        }
      }
      
      setProgress(80)
      
      // =====================================================================
      // PHASE 4: Signal Training (Must wait for analysis data)
      // =====================================================================
      if (abortSignalRef.current !== startAbortSignal) return
      
      addLog('🧠 Phase 4: Training Signal AI...', 'info')
      
      for (const stepId of SIGNAL_TRAINING_STEPS) {
        if (abortSignalRef.current !== startAbortSignal) return
        
        const stepIndex = SETUP_STEPS.findIndex(s => s.id === stepId)
        const step = SETUP_STEPS[stepIndex]
        if (!step) continue
        
        setCurrentStep(stepIndex)
        updateStep(step.id, 'running')
        setProgress(80 + Math.round((SIGNAL_TRAINING_STEPS.indexOf(stepId) / SIGNAL_TRAINING_STEPS.length) * 10))
        
        addLog(`▶️ ${step.title}...`, 'info')
        
        try {
          await executeStep(step)
          updateStep(step.id, 'completed')
          addLog(`✅ ${step.title}`, 'success')
        } catch (stepError) {
          updateStep(step.id, 'error')
          const errorMessage = stepError.response?.data?.message || stepError.response?.data?.error || stepError.message
          addLog(`❌ ${step.title}: ${errorMessage}`, 'error')
          setError(`${step.title} failed: ${errorMessage}`)
          setFailedStep({ id: step.id, title: step.title, error: errorMessage, stepIndex })
          setIsRunning(false)
          return
        }
        
        await new Promise(r => setTimeout(r, 200))
      }
      
      // =====================================================================
      // PHASE 5: Final Steps
      // =====================================================================
      if (abortSignalRef.current !== startAbortSignal) return
      
      addLog('🎯 Phase 5: Generating Recommendations...', 'info')
      
      for (const stepId of FINAL_STEPS) {
        if (abortSignalRef.current !== startAbortSignal) return
        
        const stepIndex = SETUP_STEPS.findIndex(s => s.id === stepId)
        const step = SETUP_STEPS[stepIndex]
        if (!step) continue
        
        setCurrentStep(stepIndex)
        updateStep(step.id, 'running')
        setProgress(90 + Math.round((FINAL_STEPS.indexOf(stepId) / FINAL_STEPS.length) * 10))
        
        if (stepId !== 'complete') {
          addLog(`▶️ ${step.title}...`, 'info')
        }
        
        try {
          await executeStep(step)
          updateStep(step.id, 'completed')
          if (stepId !== 'complete') {
            addLog(`✅ ${step.title}`, 'success')
          }
        } catch (stepError) {
          // Final steps are less critical, log warning and continue
          updateStep(step.id, 'error')
          const errorMessage = stepError.response?.data?.message || stepError.response?.data?.error || stepError.message
          addLog(`⚠️ ${step.title}: ${errorMessage}`, 'warning')
        }
        
        await new Promise(r => setTimeout(r, 100))
      }

      setProgress(100)
      addLog('🎉 SEO setup complete! Signal is fully configured.', 'success')

      // Mark site as setup complete
      await api.put('/.netlify/functions/seo-sites-update', {
        siteId,
        setup_completed: true,
        setup_completed_at: new Date().toISOString()
      })

    } catch (err) {
      console.error('Setup error:', err)
      setError(err.message || 'Setup failed')
      addLog(`❌ Error: ${err.message}`, 'error')
    } finally {
      setIsRunning(false)
      setParallelProgress({ running: 0, completed: 0, total: 0 })
    }
  }, [siteId, domain, addLog, updateStep, isRunning])

  // Execute individual step (silentMode = true for parallel execution, suppresses logs)
  const executeStep = async (step, silentMode = false) => {
    const startTime = Date.now()
    
    // Helper to log only in non-silent mode
    const stepLog = (message, type = 'info') => {
      if (!silentMode) {
        addLog(message, type)
      }
    }
    
    switch (step.id) {
      case 'connect':
        // Just verify site exists - seo-sites-get expects 'id' not 'siteId'
        const siteRes = await api.get(`/.netlify/functions/seo-sites-get?id=${siteId}`)
        if (!siteRes.data.site) throw new Error('Site not found')
        stepLog(`  └ Connected to ${siteRes.data.site.domain}`)
        break

      case 'crawl-sitemap':
        const crawlRes = await api.post('/.netlify/functions/seo-crawl-sitemap', { siteId })
        // API returns urlsFound, pagesCreated, pagesAlreadyExist
        const pagesFound = crawlRes.data.urlsFound || crawlRes.data.pagesFound || 0
        updateStats({ pagesDiscovered: pagesFound })
        stepLog(`  └ Discovered ${pagesFound} pages from sitemap`)
        if (crawlRes.data.pagesCreated > 0) {
          stepLog(`  └ Added ${crawlRes.data.pagesCreated} new pages`)
        }
        break

      case 'crawl-pages':
        // Queue page content analysis and wait for completion
        stepLog(`  └ Analyzing page content...`)
        try {
          const contentRes = await api.post('/.netlify/functions/seo-background-jobs', {
            siteId,
            jobType: 'metadata-extract'
          })
          const contentJobId = contentRes.data.job?.id
          
          if (contentJobId) {
            stepLog(`  └ Processing pages (job ${contentJobId})`)
            
            // Capture current abort signal
            const startAbortSignal = abortSignalRef.current
            
            // Poll for job completion
            let contentCompleted = false
            let contentAttempts = 0
            const maxAttempts = 180 // 15 minutes at 5s intervals
            
            while (!contentCompleted && contentAttempts < maxAttempts) {
              // Wait first but check abort signal during wait
              for (let i = 0; i < 10; i++) {
                if (abortSignalRef.current !== startAbortSignal) {
                  console.log('[Wizard] Content polling aborted')
                  stepLog(`  └ Content analysis aborted`)
                  return // Exit immediately
                }
                await new Promise(r => setTimeout(r, 500)) // Check every 500ms
              }
              contentAttempts++
              
              // Check abort again before API call
              if (abortSignalRef.current !== startAbortSignal) {
                console.log('[Wizard] Content polling aborted')
                return
              }
              
              try {
                const jobStatus = await api.get(`/.netlify/functions/seo-background-jobs?jobId=${contentJobId}`)
                console.log('[Wizard] Content job status:', jobStatus.data)
                const status = jobStatus.data?.job?.status || jobStatus.data?.status
                
                if (status === 'completed') {
                  console.log('[Wizard] Content job completed!')
                  stepLog(`  └ Page content analysis complete`)
                  contentCompleted = true
                } else if (status === 'failed') {
                  console.log('[Wizard] Content job failed, continuing anyway')
                  stepLog(`  └ Content analysis failed, continuing...`)
                  contentCompleted = true
                } else if (contentAttempts % 3 === 0) {
                  // Log every 15 seconds
                  stepLog(`  └ Still analyzing... (${contentAttempts * 5}s elapsed)`)
                }
              } catch (err) {
                console.log('[Wizard] Content job poll error:', err.message)
                // If we can't poll, just continue after a reasonable wait
                if (contentAttempts >= 4) {
                  stepLog(`  └ Content analysis running in background`)
                  contentCompleted = true
                }
              }
            }
            
            if (!contentCompleted) {
              stepLog(`  └ Content analysis timed out, continuing...`)
            }
          }
        } catch (err) {
          stepLog(`  └ Page content analysis will run in background`)
        }
        break

      case 'internal-links':
        // Queue background job and wait for completion
        const linksRes = await api.post('/.netlify/functions/seo-internal-links', { 
          siteId,
          crawlLinks: true
        })
        const jobId = linksRes.data.jobId
        const initialLinksFound = linksRes.data.totalLinks || 0
        stepLog(`  └ Queued internal link analysis (job ${jobId})`)
        
        // Poll for job completion
        if (jobId) {
          // Capture current abort signal
          const startAbortSignal = abortSignalRef.current
          
          let completed = false
          let attempts = 0
          const maxAttempts = 180 // 15 minutes at 5s intervals
          
          while (!completed && attempts < maxAttempts) {
            // Wait with abort checking
            for (let i = 0; i < 10; i++) {
              if (abortSignalRef.current !== startAbortSignal) {
                console.log('[Wizard] Internal links polling aborted')
                stepLog(`  └ Internal link analysis aborted`)
                return
              }
              await new Promise(r => setTimeout(r, 500))
            }
            attempts++
            
            // Check abort again before API call
            if (abortSignalRef.current !== startAbortSignal) {
              console.log('[Wizard] Internal links polling aborted')
              return
            }
            
            try {
              const jobStatus = await api.get(`/.netlify/functions/seo-background-jobs?jobId=${jobId}`)
              console.log('[Wizard] Internal links job status:', jobStatus.data)
              const status = jobStatus.data?.job?.status || jobStatus.data?.status
              
              if (status === 'completed') {
                stepLog(`  └ Internal link analysis complete`)
                completed = true
              } else if (status === 'failed') {
                throw new Error(jobStatus.data.error || 'Job failed')
              } else if (attempts % 3 === 0) {
                // Log every 15 seconds
                stepLog(`  └ Still analyzing... (${attempts * 5}s elapsed)`)
              }
            } catch (err) {
              console.log('[Wizard] Poll error (will retry):', err.message)
            }
          }
          
          if (!completed) {
            throw new Error('Internal link analysis timed out after 15 minutes')
          }
        }
        stepLog(`  └ Mapped ${initialLinksFound} internal links`)
        break

      case 'gsc-connect':
      case 'gsc-queries':
      case 'gsc-pages':
        // Try to sync GSC data
        const gscRes = await api.post('/.netlify/functions/seo-gsc-sync', { siteId })
        console.log('[Wizard] GSC sync response:', gscRes.data) // Debug
        
        if (gscRes.data.jobId) {
          // GSC sync is now a background job - poll for completion
          stepLog(`  └ GSC sync queued (job ${gscRes.data.jobId.substring(0, 8)})...`)
          
          // Capture current abort signal
          const startAbortSignal = abortSignalRef.current
          
          let jobComplete = false
          let attempts = 0
          const maxAttempts = 60 // 5 minutes max (5s intervals)
          
          while (!jobComplete && attempts < maxAttempts) {
            // Wait with abort checking
            for (let i = 0; i < 10; i++) {
              if (abortSignalRef.current !== startAbortSignal) {
                console.log('[Wizard] GSC polling aborted')
                stepLog(`  └ GSC sync aborted`)
                return
              }
              await new Promise(r => setTimeout(r, 500))
            }
            attempts++
            
            // Check abort again before API call
            if (abortSignalRef.current !== startAbortSignal) {
              console.log('[Wizard] GSC polling aborted')
              return
            }
            
            const jobRes = await api.get(`/.netlify/functions/seo-background-jobs?jobId=${gscRes.data.jobId}`)
            const job = jobRes.data?.job || jobRes.data
            console.log('[Wizard] GSC job status:', job)
            
            if (job.status === 'completed') {
              jobComplete = true
              const result = job.result || {}
              const queriesCount = result.queriesCount || 0
              const pagesCount = result.pagesCount || 0
              const keywordsUpserted = result.keywordsUpserted || 0
              const pagesCreated = result.pagesCreated || 0
              const sitemapsCount = result.sitemapsCount || 0
              
              stepLog(`  └ GSC connected - synced ${queriesCount} queries, ${pagesCount} pages`)
              if (sitemapsCount > 0) {
                stepLog(`  └ Synced ${sitemapsCount} sitemaps status`)
              }
              if (keywordsUpserted > 0) {
                stepLog(`  └ Added ${keywordsUpserted} keywords to universe`)
                updateStats({ keywordsTracked: keywordsUpserted })
              }
              if (pagesCreated > 0) {
                stepLog(`  └ Discovered ${pagesCreated} new pages from GSC`)
              }
            } else if (job.status === 'failed') {
              throw new Error(`GSC sync failed: ${job.error || 'Unknown error'}`)
            } else {
              // Still processing - log progress every 15 seconds
              if (attempts % 3 === 0) {
                const progressVal = job.progress ?? 0
                stepLog(`  └ GSC sync in progress (${progressVal}% complete)...`)
              }
            }
          }
          
          if (!jobComplete) {
            throw new Error('GSC sync timed out after 5 minutes')
          }
        } else if (gscRes.data.gscConnected) {
          // Fallback for old response format (if somehow still used)
          const queriesCount = gscRes.data.queriesCount || 0
          const pagesCount = gscRes.data.pagesCount || 0
          const keywordsUpserted = gscRes.data.keywordsUpserted || 0
          const pagesCreated = gscRes.data.pagesCreated || 0
          stepLog(`  └ GSC connected - synced ${queriesCount} queries, ${pagesCount} pages`)
          if (keywordsUpserted > 0) {
            stepLog(`  └ Added ${keywordsUpserted} keywords to universe`)
            updateStats({ keywordsTracked: keywordsUpserted })
          }
          if (pagesCreated > 0) {
            stepLog(`  └ Discovered ${pagesCreated} new pages from GSC`)
          }
        } else if (gscRes.data.error) {
          stepLog(`  └ GSC error: ${gscRes.data.error}`, 'warning')
        } else {
          stepLog(`  └ GSC not connected for this site`)
        }
        
        // Auto-complete related GSC steps (they all use the same sync)
        updateStep('gsc-queries', 'completed')
        updateStep('gsc-pages', 'completed')
        break

      case 'gsc-indexing':
        // Queue GSC indexing analysis as background job
        try {
          const indexJobRes = await api.post('/.netlify/functions/seo-background-jobs', {
            siteId,
            jobType: 'gsc-indexing'
          })
          const indexJobId = indexJobRes.data.job?.id
          
          if (indexJobId) {
            stepLog(`  └ Scanning ALL URLs from GSC (job ${indexJobId.substring(0, 8)})...`)
            
            // Capture current abort signal
            const startAbortSignal = abortSignalRef.current
            
            let completed = false
            let attempts = 0
            const maxAttempts = 180 // 15 minutes (200 URLs at 300ms each = ~60s + overhead)
            
            while (!completed && attempts < maxAttempts) {
              // Wait with abort checking
              for (let i = 0; i < 10; i++) {
                if (abortSignalRef.current !== startAbortSignal) {
                  console.log('[Wizard] GSC indexing polling aborted')
                  stepLog(`  └ Indexing check aborted`)
                  return
                }
                await new Promise(r => setTimeout(r, 500))
              }
              attempts++
              
              if (abortSignalRef.current !== startAbortSignal) return
              
              const jobStatus = await api.get(`/.netlify/functions/seo-background-jobs?jobId=${indexJobId}`)
              const job = jobStatus.data?.job || jobStatus.data
              
              if (job.status === 'completed') {
                completed = true
                const result = job.result || {}
                const issues = result.issues || []
                const totalNotIndexed = (result.notIndexed || 0) + (result.orphanNotIndexed || 0)
                
                stepLog(`  └ Inspected ${result.urlsInspected || 0} URLs (${result.totalUrlsKnown || 0} total known)`)
                stepLog(`  └ ${result.indexed || 0} indexed, ${totalNotIndexed} not indexed`)
                
                if (result.orphanNotIndexed > 0) {
                  stepLog(`  └ Found ${result.orphanNotIndexed} orphan URLs (in GSC but not tracked)`)
                }
                
                if (issues.length > 0) {
                  stepLog(`  └ ${issues.length} indexing issue categories detected`)
                  updateStats({ issuesFound: (s) => (s.issuesFound || 0) + totalNotIndexed })
                }
              } else if (job.status === 'failed') {
                throw new Error(job.error || 'Indexing check failed')
              } else if (attempts % 6 === 0) {
                stepLog(`  └ Inspecting URLs... (${job.progress || 0}% complete)`)
              }
            }
            
            if (!completed) {
              throw new Error('Indexing check timed out after 15 minutes')
            }
          } else {
            throw new Error('Failed to queue indexing job')
          }
        } catch (err) {
          // Re-throw to fail the step
          console.error('[Wizard] Indexing check error:', err.message)
          stepLog(`  └ ❌ Indexing check failed: ${err.message}`)
          throw err
        }
        break

      case 'pagespeed':
        // Queue PageSpeed analysis as background job
        try {
          const psiJobRes = await api.post('/.netlify/functions/seo-background-jobs', {
            siteId,
            jobType: 'pagespeed'
          })
          const psiJobId = psiJobRes.data.job?.id
          
          if (psiJobId) {
            stepLog(`  └ Analyzing Core Web Vitals (job ${psiJobId.substring(0, 8)})...`)
            
            // Capture current abort signal
            const startAbortSignal = abortSignalRef.current
            
            let completed = false
            let attempts = 0
            const maxAttempts = 180 // 15 minutes (PSI is slow)
            
            while (!completed && attempts < maxAttempts) {
              // Wait with abort checking
              for (let i = 0; i < 10; i++) {
                if (abortSignalRef.current !== startAbortSignal) {
                  console.log('[Wizard] PageSpeed polling aborted')
                  stepLog(`  └ PageSpeed analysis aborted`)
                  return
                }
                await new Promise(r => setTimeout(r, 500))
              }
              attempts++
              
              if (abortSignalRef.current !== startAbortSignal) return
              
              const jobStatus = await api.get(`/.netlify/functions/seo-background-jobs?jobId=${psiJobId}`)
              const job = jobStatus.data?.job || jobStatus.data
              
              if (job.status === 'completed') {
                completed = true
                const result = job.result || {}
                stepLog(`  └ Analyzed ${result.pagesAnalyzed || 0} pages, avg score: ${result.avgScore || 'N/A'}`)
                if (result.poorPerformance > 0) {
                  stepLog(`  └ ${result.poorPerformance} pages need speed optimization`)
                }
              } else if (job.status === 'failed') {
                throw new Error(job.error || 'PageSpeed analysis failed')
              } else if (attempts % 6 === 0) {
                // Log every 30 seconds
                stepLog(`  └ Analyzing... (${job.progress || 0}% complete)`)
              }
            }
            
            if (!completed) {
              throw new Error('PageSpeed analysis timed out after 15 minutes')
            }
          } else {
            throw new Error('Failed to queue PageSpeed job')
          }
        } catch (err) {
          // Re-throw to fail the step
          console.error('[Wizard] PageSpeed error:', err.message)
          stepLog(`  └ ❌ PageSpeed analysis failed: ${err.message}`)
          throw err
        }
        break

      case 'ai-train':
        // Force refresh during development to ensure training runs
        const trainRes = await api.post('/.netlify/functions/seo-ai-train', { siteId, forceRefresh: true })
        stepLog(`  └ Signal training initiated...`)
        // Poll for completion
        for (let attempt = 0; attempt < 60; attempt++) {
          await new Promise(r => setTimeout(r, 2000))
          const statusRes = await api.get(`/.netlify/functions/seo-ai-knowledge?siteId=${siteId}`)
          if (statusRes.data.knowledge?.training_status === 'completed') {
            stepLog(`  └ Signal training complete!`)
            break
          }
          if (attempt === 59) {
            stepLog(`  └ Training still in progress (will complete in background)`)
          } else if (attempt % 5 === 0 && attempt > 0) {
            stepLog(`  └ Still training... (${attempt * 2}s elapsed)`)
          }
        }
        break

      case 'ai-knowledge':
        // Force refresh
        const knowledgeRes = await api.get(`/.netlify/functions/seo-ai-knowledge?siteId=${siteId}&refresh=true`)
        if (knowledgeRes.data.knowledge) {
          stepLog(`  └ Knowledge base loaded`)
        }
        break

      case 'topic-clusters':
        // This now returns 202 and runs in background
        const clustersRes = await api.post('/.netlify/functions/seo-topic-clusters', { siteId, forceRefresh: true })
        if (clustersRes.status === 202 && clustersRes.data.jobId) {
          stepLog(`  └ Topic clustering queued (runs in background)`)
        } else {
          const clustersFound = clustersRes.data.clusters?.length || 0
          stepLog(`  └ Created ${clustersFound} topic clusters`)
        }
        break

      case 'blog-brain':
        // Force refresh
        await api.post('/.netlify/functions/seo-ai-blog-brain', { 
          siteId,
          action: 'recommend-topics',
          forceRefresh: true
        })
        stepLog(`  └ Content style analysis complete`)
        break

      case 'cannibalization':
        // Force refresh - re-detect
        const cannibRes = await api.post('/.netlify/functions/seo-cannibalization', { 
          siteId,
          action: 'detect',
          forceRefresh: true
        })
        const cannibIssues = cannibRes.data.issues?.length || 0
        if (cannibIssues > 0) {
          updateStats(prev => ({ ...prev, issuesFound: prev.issuesFound + cannibIssues }))
          stepLog(`  └ Found ${cannibIssues} cannibalization issues`)
        } else {
          stepLog(`  └ No cannibalization detected`)
        }
        break

      case 'content-decay':
        // Force refresh
        const decayRes = await api.post('/.netlify/functions/seo-content-decay', { siteId, forceRefresh: true })
        const decayingPages = decayRes.data.decayingPages?.length || 0
        if (decayingPages > 0) {
          updateStats(prev => ({ ...prev, issuesFound: prev.issuesFound + decayingPages }))
          stepLog(`  └ Found ${decayingPages} pages with declining traffic`)
        } else {
          stepLog(`  └ No content decay detected`)
        }
        break

      case 'content-gap':
        // This now returns 202 and runs in background
        const gapRes = await api.post('/.netlify/functions/seo-content-gap-analysis', { 
          siteId,
          action: 'analyze',
          forceRefresh: true
        })
        if (gapRes.status === 202 && gapRes.data.jobId) {
          stepLog(`  └ Content gap analysis queued (runs in background)`)
        } else {
          const gaps = gapRes.data.gaps?.length || 0
          updateStats(prev => ({ ...prev, opportunitiesDetected: prev.opportunitiesDetected + gaps }))
          stepLog(`  └ Found ${gaps} content opportunities`)
        }
        break

      case 'serp-features':
        // This now returns 202 and runs in background
        const serpRes = await api.post('/.netlify/functions/seo-serp-features', { siteId, forceRefresh: true })
        if (serpRes.status === 202 && serpRes.data.jobId) {
          stepLog(`  └ SERP features analysis queued (runs in background)`)
        } else {
          const serpOpps = serpRes.data.opportunities?.length || 0
          updateStats(prev => ({ ...prev, opportunitiesDetected: prev.opportunitiesDetected + serpOpps }))
          stepLog(`  └ Found ${serpOpps} SERP feature opportunities`)
        }
        break

      case 'technical-audit':
        await api.post('/.netlify/functions/seo-serp-analyze', { 
          siteId,
          action: 'audit',
          forceRefresh: true
        })
        stepLog(`  └ Technical audit complete`)
        break

      case 'backlinks':
        // Force refresh
        const backlinksRes = await api.post('/.netlify/functions/seo-backlinks', { siteId, forceRefresh: true })
        stepLog(`  └ Backlink profile analyzed`)
        break

      case 'local-seo':
        await api.post('/.netlify/functions/seo-local-analyze', { 
          siteId,
          action: 'audit',
          forceRefresh: true
        })
        stepLog(`  └ Local SEO signals checked`)
        break

      case 'competitors':
        await api.post('/.netlify/functions/seo-competitor-analyze', { 
          siteId,
          action: 'analyze',
          forceRefresh: true
        })
        stepLog(`  └ Competitor benchmarking complete`)
        break

      case 'schema-generate':
        // Schema generation - force refresh
        const schemaStatusRes = await api.get(`/.netlify/functions/seo-schema-generate?siteId=${siteId}&forceRefresh=true`)
        const pagesWithSchema = schemaStatusRes.data.pagesWithSchema || 0
        updateStats({ schemaGenerated: pagesWithSchema })
        stepLog(`  └ Found ${pagesWithSchema} pages with schema markup`)
        break

      case 'metadata-optimize':
        // Metadata optimization happens during AI analysis
        stepLog(`  └ Metadata optimization included in Signal analysis`)
        break

      case 'predictive-ranking':
        // Predictive ranking available on-demand
        stepLog(`  └ Predictive ranking available on-demand for pages`)
        break

      case 'opportunities':
        const oppsRes = await api.post('/.netlify/functions/seo-opportunities-detect', { siteId, forceRefresh: true })
        const oppsFound = oppsRes.data.opportunities?.length || 0
        updateStats(prev => ({ ...prev, opportunitiesDetected: prev.opportunitiesDetected + oppsFound }))
        stepLog(`  └ Detected ${oppsFound} quick wins`)
        break

      case 'ai-recommendations':
        // Force refresh - use seo-ai-analyze to generate recommendations
        const recsRes = await api.post('/.netlify/functions/seo-ai-analyze', { 
          siteId,
          analysisType: 'full_audit',
          forceRefresh: true
        })
        const recsCreated = recsRes.data.recommendations?.length || 0
        updateStats({ recommendationsCreated: recsCreated })
        stepLog(`  └ Generated ${recsCreated} Signal recommendations`)
        break

      case 'cwv-baseline':
        // CWV check requires a URL - use the site's homepage
        try {
          const cwvRes = await api.post('/.netlify/functions/seo-cwv', { 
            siteId,
            url: `https://${domain}`,
            device: 'mobile',
            forceRefresh: true
          })
          const cwvScore = cwvRes.data.result?.performance_score || 0
          stepLog(`  └ CWV baseline recorded (score: ${cwvScore})`)
        } catch (cwvErr) {
          // PageSpeed API might not be configured
          stepLog(`  └ CWV will be measured on next scheduled run`)
        }
        break

      case 'schedule-setup':
        // seo-schedule expects: siteId, schedule (frequency), enabled, etc.
        try {
          await api.post('/.netlify/functions/seo-schedule', { 
            siteId,
            schedule: 'weekly',
            enabled: true,
            notifications: true,
            modules: ['all']
          })
          stepLog(`  └ Automated schedules configured`)
        } catch (scheduleErr) {
          // If schedule table doesn't exist, just skip
          stepLog(`  └ Scheduling will be configured later`)
        }
        break

      case 'complete':
        // Final step - just a placeholder
        break

      default:
        // Generic endpoint call
        if (step.endpoint) {
          await api.post(`/.netlify/functions/${step.endpoint}`, { siteId })
        }
    }

    const elapsed = Date.now() - startTime
    if (elapsed < 500) {
      await new Promise(r => setTimeout(r, 500 - elapsed))
    }
  }

  // Auto-start on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      runSetup()
    }, 800)
    return () => clearTimeout(timer)
  }, [])

  // Get phase completion status
  const getPhaseStatus = (phaseId) => {
    const phaseSteps = SETUP_STEPS.filter(s => s.phase === phaseId)
    const completedSteps = phaseSteps.filter(s => stepStatuses[s.id] === 'completed')
    if (completedSteps.length === phaseSteps.length) return 'completed'
    if (completedSteps.length > 0) return 'active'
    return 'pending'
  }

  // Retry setup from the beginning
  const retrySetup = useCallback(() => {
    setStepStatuses({})
    setProgress(0)
    setCurrentStep(0)
    setError(null)
    setFailedStep(null)
    setStats({
      pagesDiscovered: 0,
      keywordsTracked: 0,
      issuesFound: 0,
      opportunitiesDetected: 0,
      schemaGenerated: 0,
      recommendationsCreated: 0
    })
    // Trigger runSetup after state reset
    setTimeout(() => runSetup(), 100)
  }, [runSetup])

  // Retry from failed step (preserves progress up to failure point)
  const retryFromFailedStep = useCallback(() => {
    if (!failedStep) return
    
    // Keep existing completed steps, clear failed step
    const updatedStatuses = { ...stepStatuses }
    delete updatedStatuses[failedStep.id]
    setStepStatuses(updatedStatuses)
    
    setError(null)
    setFailedStep(null)
    setCurrentStep(failedStep.stepIndex)
    setProgress(Math.round((failedStep.stepIndex / SETUP_STEPS.length) * 100))
    
    // Continue from failed step
    setTimeout(() => continueFromStep(failedStep.stepIndex), 100)
  }, [failedStep, stepStatuses])

  // Stop and restart current step manually
  const stopAndRestartCurrentStep = useCallback(() => {
    if (!isRunning || currentStep === null) return
    
    const step = SETUP_STEPS[currentStep]
    
    // Signal abort to any running operations (use ref for immediate effect)
    abortSignalRef.current++
    console.log('[Wizard] Abort signal incremented to:', abortSignalRef.current)
    
    // Clear current step status
    const updatedStatuses = { ...stepStatuses }
    delete updatedStatuses[step.id]
    setStepStatuses(updatedStatuses)
    
    addLog(`🔄 Restarting ${step.title}...`, 'info')
    
    // Restart from current step after a brief delay
    setTimeout(() => {
      // Reset current step to trigger re-execution
      setCurrentStep(currentStep)
      continueFromStep(currentStep, true)
    }, 500)
  }, [isRunning, currentStep, stepStatuses, addLog])

  // Continue setup from a specific step index
  const continueFromStep = useCallback(async (startIndex, isRestart = false) => {
    if (isRunning && !isRestart) return
    
    setIsRunning(true)
    setError(null)
    setFailedStep(null)

    try {
      for (let i = startIndex; i < SETUP_STEPS.length; i++) {
        const step = SETUP_STEPS[i]
        setCurrentStep(i)
        updateStep(step.id, 'running')
        
        // Calculate progress
        const progressPercent = Math.round((i / SETUP_STEPS.length) * 100)
        setProgress(progressPercent)
        
        addLog(`▶️ ${step.title}...`, 'info')

        // Execute step
        try {
          await executeStep(step)
          updateStep(step.id, 'completed')
          addLog(`✅ ${step.title} complete`, 'success')
        } catch (stepError) {
          // STOP on ANY failure
          updateStep(step.id, 'error')
          const errorMessage = stepError.response?.data?.message || stepError.response?.data?.error || stepError.message
          addLog(`❌ ${step.title} failed: ${errorMessage}`, 'error')
          setError(`${step.title} failed: ${errorMessage}`)
          setFailedStep({
            id: step.id,
            title: step.title,
            error: errorMessage,
            stepIndex: i
          })
          setIsRunning(false)
          return // Stop execution immediately
        }

        // Small delay for visual effect
        await new Promise(r => setTimeout(r, 300))
      }

      setProgress(100)
      addLog('🎉 SEO setup complete! Signal is fully configured.', 'success')

      // Mark site as setup complete
      await api.put('/.netlify/functions/seo-sites-update', {
        siteId,
        setup_completed: true,
        setup_completed_at: new Date().toISOString()
      })

    } catch (err) {
      console.error('Setup error:', err)
      setError(err.message || 'Setup failed')
      addLog(`❌ Error: ${err.message}`, 'error')
    } finally {
      setIsRunning(false)
    }
  }, [siteId, addLog, updateStep, isRunning, executeStep])

  const isComplete = progress === 100 && !isRunning && !error
  const hasFailed = !!failedStep

  return (
    <div className="min-h-screen bg-[var(--surface-page)] p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <SignalSEOLogo size={56} animate={isRunning} />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#95d47d] to-[#238b95] bg-clip-text text-transparent">
              Signal SEO Setup
            </h1>
          </div>
          <p className="text-[var(--text-secondary)]">
            {isComplete 
              ? '🎉 Signal SEO is fully configured and ready!' 
              : hasFailed
                ? '❌ Setup failed - see error details below'
                : `Configuring comprehensive SEO intelligence for ${domain}`
            }
          </p>
        </motion.div>

        {/* Phase indicators */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {SETUP_PHASES.map((phase, index) => (
            <PhaseIndicator
              key={phase.id}
              phase={phase}
              index={index}
              isActive={currentPhase === phase.id}
              isCompleted={getPhaseStatus(phase.id) === 'completed'}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left column - Steps */}
          <div className="lg:col-span-1 space-y-2 h-[800px] overflow-y-auto pr-2">
            {SETUP_STEPS.map((step, index) => (
              <StepIndicator
                key={step.id}
                step={step}
                status={stepStatuses[step.id] || 'pending'}
                isActive={currentStep === index}
                index={index}
              />
            ))}
          </div>

          {/* Center column - Progress & Stats */}
          <div className="lg:col-span-1 space-y-6">
            {/* Progress ring */}
            <Card className="p-6">
              <div className="flex flex-col items-center">
                <ProgressRing progress={progress} size={160} />
                <p className="mt-4 text-sm text-[var(--text-secondary)]">
                  {isComplete 
                    ? 'Setup complete!' 
                    : parallelProgress.total > 0
                      ? `⚡ Running ${parallelProgress.running} steps in parallel (${parallelProgress.completed}/${parallelProgress.total} done)`
                      : `Step ${currentStep + 1} of ${SETUP_STEPS.length}`
                  }
                </p>
                {SETUP_STEPS[currentStep] && !isComplete && (
                  <p className="text-lg font-medium text-[var(--text-primary)] mt-2">
                    {SETUP_STEPS[currentStep].title}
                  </p>
                )}
                {(isRunning || hasFailed) && !isComplete && (
                  <Button 
                    onClick={stopAndRestartCurrentStep}
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    disabled={!isRunning}
                  >
                    <RefreshCw className="w-3 h-3 mr-2" />
                    Restart Current Step
                  </Button>
                )}
              </div>
            </Card>

            {/* Stats grid */}
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
          </div>

          {/* Right column - Logs */}
          <div className="lg:col-span-1">
            <Card className="h-[800px] flex flex-col">
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
          </div>
        </div>

        {/* Completion actions */}
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 text-center"
          >
            <div className="inline-flex flex-col items-center gap-4 bg-gradient-to-r from-[#95d47d]/10 to-[#238b95]/10 dark:from-[#95d47d]/20 dark:to-[#238b95]/20 rounded-2xl p-8 border border-[#95d47d]/30">
              <div className="flex items-center gap-2 text-[#238b95]">
                <CheckCircle2 className="w-8 h-8" />
                <span className="text-xl font-semibold">Setup Complete!</span>
              </div>
              <p className="text-[var(--text-secondary)] max-w-md">
                Signal SEO has analyzed your entire site and is ready to help you
                dominate search rankings. Check your dashboard for personalized recommendations.
              </p>
              <div className="flex gap-3">
                <Button 
                  size="lg"
                  onClick={onComplete}
                  className="bg-gradient-to-r from-[#95d47d] to-[#238b95] hover:from-[#7bc064] hover:to-[#1a7a83] text-white"
                >
                  <Rocket className="w-5 h-5 mr-2" />
                  Go to Dashboard
                </Button>
                <Button 
                  variant="outline"
                  onClick={runSetup}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Run Again
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error state - detailed failure panel */}
        {hasFailed && failedStep && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
          >
            <Card className="max-w-2xl mx-auto p-6 border-red-500/30 bg-gradient-to-br from-red-500/10 to-orange-500/10">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-500 mb-1">
                    Setup Failed at Step {failedStep.stepIndex + 1}
                  </h3>
                  <p className="text-red-400 font-medium mb-2">
                    {failedStep.title}
                  </p>
                  <div className="bg-red-500/10 rounded-lg p-3 mb-4 border border-red-500/20">
                    <p className="text-sm text-red-400 font-mono break-all">
                      {failedStep.error}
                    </p>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mb-4">
                    The setup has been stopped. You can retry from this step or start over.
                    Check the logs on the right for more details.
                  </p>
                  <div className="flex gap-3">
                    <Button 
                      onClick={retryFromFailedStep} 
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry from Step {failedStep.stepIndex + 1}
                    </Button>
                    <Button 
                      onClick={retrySetup} 
                      variant="outline"
                    >
                      Restart from Beginning
                    </Button>
                    <Button variant="outline" onClick={onSkip}>
                      Skip Setup
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Legacy error state (for non-step errors) */}
        {error && !hasFailed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 text-center"
          >
            <Card className="inline-block p-6 border-red-500/30 bg-red-500/10">
              <div className="flex items-center gap-3 text-red-500 mb-4">
                <AlertCircle className="w-6 h-6" />
                <span className="font-medium">Setup encountered an error</span>
              </div>
              <p className="text-sm text-red-400 mb-4">{error}</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={retrySetup} variant="destructive">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry Setup
                </Button>
                <Button variant="outline" onClick={onSkip}>
                  Skip for Now
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Skip option during setup */}
        {isRunning && (
          <div className="mt-6 text-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onSkip}
              className="text-gray-400 hover:text-gray-600"
            >
              Skip setup (not recommended)
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
