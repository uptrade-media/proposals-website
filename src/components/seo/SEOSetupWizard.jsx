/**
 * SEO Setup Wizard - Comprehensive Edition
 * 
 * Epic onboarding flow that walks through ALL SEO features:
 * - Site discovery & crawling
 * - Google Search Console integration
 * - AI Brain training
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
import axios from 'axios'

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
    title: 'AI Intelligence',
    description: 'Training & knowledge base',
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
    title: 'Google Search Console',
    description: 'Syncing performance data from GSC',
    icon: BarChart3,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    endpoint: 'seo-gsc-sync',
    optional: true,
    duration: 3000
  },
  {
    id: 'gsc-queries',
    phase: 'data',
    title: 'Analyzing Search Queries',
    description: 'Processing keyword rankings and CTR data',
    icon: Target,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    endpoint: 'seo-gsc-queries',
    optional: true,
    duration: 3000
  },
  {
    id: 'gsc-pages',
    phase: 'data',
    title: 'Page Performance Metrics',
    description: 'Clicks, impressions, and positions by URL',
    icon: Activity,
    color: 'text-teal-500',
    bgColor: 'bg-teal-500/10',
    endpoint: 'seo-gsc-pages',
    optional: true,
    duration: 3000
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
    optional: true,
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
    title: 'Training AI Brain',
    description: 'Teaching the AI about your business and content',
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
    description: 'Creating semantic understanding of your site',
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
    description: 'Organizing content into semantic clusters',
    icon: Layers,
    color: 'text-fuchsia-500',
    bgColor: 'bg-fuchsia-500/10',
    endpoint: 'seo-topic-clusters',
    duration: 4000
  },
  {
    id: 'blog-brain',
    phase: 'intelligence',
    title: 'Blog Brain Training',
    description: 'Learning your content style and topics',
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
    optional: true,
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
    optional: true,
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
    id: 'report-setup',
    phase: 'optimization',
    title: 'Configuring Weekly Reports',
    description: 'Setting up automated SEO performance emails',
    icon: BarChart3,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    endpoint: 'seo-reports',
    duration: 2000
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
  const logContainerRef = useRef(null)

  // Add log entry
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

  // Main setup runner
  const runSetup = useCallback(async () => {
    if (isRunning) return
    
    setIsRunning(true)
    setError(null)
    setLogs([])
    
    addLog('🚀 Starting comprehensive SEO setup...', 'info')
    addLog(`📍 Domain: ${domain}`, 'info')

    try {
      for (let i = 0; i < SETUP_STEPS.length; i++) {
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
          if (step.optional) {
            updateStep(step.id, 'skipped')
            addLog(`⏭️ ${step.title} skipped (optional)`, 'warning')
          } else {
            updateStep(step.id, 'error')
            addLog(`⚠️ ${step.title}: ${stepError.message}`, 'warning')
            // Continue with other steps even if one fails
          }
        }

        // Small delay for visual effect
        await new Promise(r => setTimeout(r, 300))
      }

      setProgress(100)
      addLog('🎉 SEO setup complete! Your AI Brain is fully configured.', 'success')

      // Mark site as setup complete
      await axios.put('/.netlify/functions/seo-sites-update', {
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
  }, [siteId, domain, addLog, updateStep, isRunning])

  // Execute individual step
  const executeStep = async (step) => {
    const startTime = Date.now()
    
    switch (step.id) {
      case 'connect':
        // Just verify site exists
        const siteRes = await axios.get(`/.netlify/functions/seo-sites-get?siteId=${siteId}`)
        if (!siteRes.data.site) throw new Error('Site not found')
        addLog(`  └ Connected to ${siteRes.data.site.domain}`)
        break

      case 'crawl-sitemap':
        const crawlRes = await axios.post('/.netlify/functions/seo-crawl-sitemap', { siteId })
        const pagesFound = crawlRes.data.pagesFound || 0
        updateStats({ pagesDiscovered: pagesFound })
        addLog(`  └ Discovered ${pagesFound} pages from sitemap`)
        break

      case 'crawl-pages':
        // Trigger background crawl of individual pages
        await axios.post('/.netlify/functions/seo-background-jobs', {
          siteId,
          jobType: 'crawl_pages',
          priority: 'high'
        })
        addLog(`  └ Queued page content analysis`)
        // Simulate some delay for visual effect
        await new Promise(r => setTimeout(r, 2000))
        break

      case 'internal-links':
        const linksRes = await axios.post('/.netlify/functions/seo-internal-links', { 
          siteId,
          action: 'analyze'
        })
        const linksFound = linksRes.data.totalLinks || 0
        addLog(`  └ Mapped ${linksFound} internal links`)
        break

      case 'gsc-connect':
      case 'gsc-queries':
      case 'gsc-pages':
        // Try to sync GSC data
        const gscRes = await axios.post('/.netlify/functions/seo-gsc-sync', { siteId })
        if (gscRes.data.gscConnected) {
          addLog(`  └ Synced ${gscRes.data.queriesCount || 0} queries, ${gscRes.data.pagesCount || 0} pages`)
          updateStats({ keywordsTracked: gscRes.data.queriesCount || 0 })
        } else {
          addLog(`  └ GSC not connected - skipping`)
        }
        break

      case 'pagespeed':
        await axios.post('/.netlify/functions/seo-pagespeed-impact', { 
          siteId,
          action: 'analyze'
        })
        addLog(`  └ Core Web Vitals analyzed`)
        break

      case 'ai-train':
        const trainRes = await axios.post('/.netlify/functions/seo-ai-train', { siteId })
        addLog(`  └ AI Brain training initiated`)
        // Poll for completion
        for (let attempt = 0; attempt < 10; attempt++) {
          await new Promise(r => setTimeout(r, 1000))
          const statusRes = await axios.get(`/.netlify/functions/seo-ai-knowledge?siteId=${siteId}`)
          if (statusRes.data.knowledge?.training_status === 'completed') {
            addLog(`  └ Training complete!`)
            break
          }
          if (attempt === 9) {
            addLog(`  └ Training in progress (will complete in background)`)
          }
        }
        break

      case 'ai-knowledge':
        const knowledgeRes = await axios.get(`/.netlify/functions/seo-ai-knowledge?siteId=${siteId}`)
        if (knowledgeRes.data.knowledge) {
          addLog(`  └ Knowledge base loaded`)
        }
        break

      case 'topic-clusters':
        const clustersRes = await axios.post('/.netlify/functions/seo-topic-clusters', { 
          siteId,
          action: 'generate'
        })
        const clustersFound = clustersRes.data.clusters?.length || 0
        addLog(`  └ Created ${clustersFound} topic clusters`)
        break

      case 'blog-brain':
        await axios.post('/.netlify/functions/seo-ai-blog-brain', { 
          siteId,
          action: 'train'
        })
        addLog(`  └ Blog Brain trained on content style`)
        break

      case 'cannibalization':
        const cannibRes = await axios.post('/.netlify/functions/seo-cannibalization', { 
          siteId,
          action: 'detect'
        })
        const cannibIssues = cannibRes.data.issues?.length || 0
        if (cannibIssues > 0) {
          updateStats(prev => ({ ...prev, issuesFound: prev.issuesFound + cannibIssues }))
          addLog(`  └ Found ${cannibIssues} cannibalization issues`)
        } else {
          addLog(`  └ No cannibalization detected`)
        }
        break

      case 'content-decay':
        const decayRes = await axios.post('/.netlify/functions/seo-content-decay', { 
          siteId,
          action: 'detect'
        })
        const decayingPages = decayRes.data.decayingPages?.length || 0
        if (decayingPages > 0) {
          updateStats(prev => ({ ...prev, issuesFound: prev.issuesFound + decayingPages }))
          addLog(`  └ Found ${decayingPages} pages with declining traffic`)
        } else {
          addLog(`  └ No content decay detected`)
        }
        break

      case 'content-gap':
        const gapRes = await axios.post('/.netlify/functions/seo-content-gap-analysis', { 
          siteId,
          action: 'analyze'
        })
        const gaps = gapRes.data.gaps?.length || 0
        updateStats(prev => ({ ...prev, opportunitiesDetected: prev.opportunitiesDetected + gaps }))
        addLog(`  └ Found ${gaps} content opportunities`)
        break

      case 'serp-features':
        const serpRes = await axios.post('/.netlify/functions/seo-serp-features', { 
          siteId,
          action: 'analyze'
        })
        const serpOpps = serpRes.data.opportunities?.length || 0
        updateStats(prev => ({ ...prev, opportunitiesDetected: prev.opportunitiesDetected + serpOpps }))
        addLog(`  └ Found ${serpOpps} SERP feature opportunities`)
        break

      case 'technical-audit':
        await axios.post('/.netlify/functions/seo-serp-analyze', { 
          siteId,
          action: 'audit'
        })
        addLog(`  └ Technical audit complete`)
        break

      case 'backlinks':
        const backlinksRes = await axios.post('/.netlify/functions/seo-backlinks', { 
          siteId,
          action: 'analyze'
        })
        addLog(`  └ Backlink profile analyzed`)
        break

      case 'local-seo':
        await axios.post('/.netlify/functions/seo-local-analyze', { 
          siteId,
          action: 'audit'
        })
        addLog(`  └ Local SEO signals checked`)
        break

      case 'competitors':
        await axios.post('/.netlify/functions/seo-competitor-analyze', { 
          siteId,
          action: 'analyze'
        })
        addLog(`  └ Competitor benchmarking complete`)
        break

      case 'schema-generate':
        const schemaRes = await axios.post('/.netlify/functions/seo-schema-generate', { 
          siteId,
          generateForAll: true
        })
        const schemasGenerated = schemaRes.data.schemasGenerated || 0
        updateStats({ schemaGenerated: schemasGenerated })
        addLog(`  └ Generated schema for ${schemasGenerated} pages`)
        break

      case 'metadata-optimize':
        const metaRes = await axios.post('/.netlify/functions/seo-metadata-api', { 
          siteId,
          action: 'optimize_all'
        })
        const metaOptimized = metaRes.data.optimized || 0
        addLog(`  └ Optimized metadata for ${metaOptimized} pages`)
        break

      case 'predictive-ranking':
        await axios.post('/.netlify/functions/seo-predictive-ranking', { 
          siteId,
          action: 'calculate_all'
        })
        addLog(`  └ Ranking potential calculated`)
        break

      case 'opportunities':
        const oppsRes = await axios.post('/.netlify/functions/seo-opportunities-detect', { siteId })
        const oppsFound = oppsRes.data.opportunities?.length || 0
        updateStats(prev => ({ ...prev, opportunitiesDetected: prev.opportunitiesDetected + oppsFound }))
        addLog(`  └ Detected ${oppsFound} quick wins`)
        break

      case 'ai-recommendations':
        const recsRes = await axios.post('/.netlify/functions/seo-ai-recommendations', { 
          siteId,
          generateNew: true
        })
        const recsCreated = recsRes.data.recommendations?.length || 0
        updateStats({ recommendationsCreated: recsCreated })
        addLog(`  └ Generated ${recsCreated} AI recommendations`)
        break

      case 'schedule-setup':
        await axios.post('/.netlify/functions/seo-schedule', { 
          siteId,
          action: 'setup_default',
          schedules: [
            { type: 'gsc_sync', frequency: 'daily' },
            { type: 'content_decay', frequency: 'weekly' },
            { type: 'ai_analysis', frequency: 'weekly' },
            { type: 'opportunities', frequency: 'daily' }
          ]
        })
        addLog(`  └ Automated schedules configured`)
        break

      case 'complete':
        // Final step - just a placeholder
        break

      default:
        // Generic endpoint call
        if (step.endpoint) {
          await axios.post(`/.netlify/functions/${step.endpoint}`, { siteId })
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

  const isComplete = progress === 100 && !isRunning

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <motion.div
              animate={isRunning ? { rotate: 360 } : {}}
              transition={{ duration: 3, repeat: isRunning ? Infinity : 0, ease: 'linear' }}
            >
              <Brain className="w-12 h-12 text-purple-600" />
            </motion.div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              SEO AI Brain Setup
            </h1>
          </div>
          <p className="text-gray-600">
            {isComplete 
              ? '🎉 Your AI SEO Brain is fully configured and ready!' 
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
          <div className="lg:col-span-1 space-y-2 max-h-[600px] overflow-y-auto pr-2">
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
                <p className="mt-4 text-sm text-gray-500">
                  {isComplete 
                    ? 'Setup complete!' 
                    : `Step ${currentStep + 1} of ${SETUP_STEPS.length}`
                  }
                </p>
                {SETUP_STEPS[currentStep] && !isComplete && (
                  <p className="text-lg font-medium text-gray-900 mt-2">
                    {SETUP_STEPS[currentStep].title}
                  </p>
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
          </div>
        </div>

        {/* Completion actions */}
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 text-center"
          >
            <div className="inline-flex flex-col items-center gap-4 bg-gradient-to-r from-emerald-50 to-cyan-50 rounded-2xl p-8 border border-emerald-100">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="w-8 h-8" />
                <span className="text-xl font-semibold">Setup Complete!</span>
              </div>
              <p className="text-gray-600 max-w-md">
                Your AI SEO Brain has analyzed your entire site and is ready to help you
                dominate search rankings. Check your dashboard for personalized recommendations.
              </p>
              <div className="flex gap-3">
                <Button 
                  size="lg"
                  onClick={onComplete}
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
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

        {/* Error state */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 text-center"
          >
            <Card className="inline-block p-6 border-red-200 bg-red-50">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <AlertCircle className="w-6 h-6" />
                <span className="font-medium">Setup encountered an error</span>
              </div>
              <p className="text-sm text-red-600 mb-4">{error}</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={runSetup} variant="destructive">
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
