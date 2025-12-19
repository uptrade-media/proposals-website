// src/components/seo/setup-wizard/constants.js
// Configuration constants for the SEO Setup Wizard
import { 
  Globe, Brain, Search, FileText, Link2, Zap, CheckCircle2,
  BarChart3, Target, Lightbulb, AlertCircle, Code, MapPin, Users,
  TrendingDown, Layers, Award, Shield, Clock, Rocket, Activity,
  Database, PenLine, Gauge, Network, Microscope, Sparkles
} from 'lucide-react'

// =============================================================================
// PHASE DEFINITIONS - Major stages of setup
// =============================================================================
export const SETUP_PHASES = [
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
// SIMPLIFIED PHASES - For streamlined setup
// =============================================================================
export const SIMPLIFIED_PHASES = [
  {
    id: 'connect',
    title: 'Connect Your Site',
    description: 'Discover all pages from your sitemap',
    icon: Globe,
    steps: ['connect', 'crawl-sitemap'],
    duration: '~30 seconds'
  },
  {
    id: 'analyze',
    title: 'AI Analysis',
    description: 'Deep content and SEO analysis',
    icon: Brain,
    steps: ['crawl-pages', 'internal-links', 'ai-train', 'ai-knowledge'],
    duration: '~2 minutes'
  },
  {
    id: 'integrate',
    title: 'Data Integration',
    description: 'Connect Google Search Console',
    icon: BarChart3,
    steps: ['gsc-connect', 'opportunities'],
    duration: '~30 seconds'
  }
]

// =============================================================================
// DETAILED STEP DEFINITIONS - All setup operations
// =============================================================================
export const SETUP_STEPS = [
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
    duration: 3000
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
  
  // PHASE 4: DEEP ANALYSIS
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
  
  // PHASE 5: OPTIMIZATION
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
