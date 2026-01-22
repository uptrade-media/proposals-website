// src/components/signal/pulse/SignalPulse.jsx
// Signal Pulse - Immersive live dashboard showing Signal's neural activity
// The heartbeat of your AI brain - designed to feel like mission control

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Brain,
  Activity,
  Zap,
  BookOpen,
  MessageSquare,
  AlertTriangle,
  Clock,
  Sparkles,
  Target,
  HelpCircle,
  Database,
  Lightbulb,
  RefreshCw,
  Building2,
  Package,
  Users,
  Settings,
  Crosshair,
  Mic,
  Layers
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSignalStore } from '@/lib/signal-store'
import SignalAILogo from '../SignalAILogo'
import { 
  SignalAmbient, 
  MetricRing, 
  StatTile, 
  ActionButton, 
  DomainTile,
  GlowCard
} from '../shared/SignalUI'

// ============================================================================
// ACTIVITY TIMELINE - Live learning feed with neural aesthetic
// ============================================================================

function ActivityTimeline({ activities, loading }) {
  const getActivityConfig = (type) => {
    switch (type) {
      case 'learned': 
        return { 
          icon: BookOpen, 
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          text: 'text-emerald-400'
        }
      case 'answered': 
        return { 
          icon: MessageSquare, 
          bg: 'bg-teal-500/10',
          border: 'border-teal-500/30',
          text: 'text-teal-400'
        }
      case 'gap': 
        return { 
          icon: AlertTriangle, 
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          text: 'text-amber-400'
        }
      case 'faq': 
        return { 
          icon: HelpCircle, 
          bg: 'bg-purple-500/10',
          border: 'border-purple-500/30',
          text: 'text-purple-400'
        }
      case 'trained': 
        return { 
          icon: Sparkles, 
          bg: 'bg-cyan-500/10',
          border: 'border-cyan-500/30',
          text: 'text-cyan-400'
        }
      default: 
        return { 
          icon: Activity, 
          bg: 'bg-white/5',
          border: 'border-white/10',
          text: 'text-gray-400'
        }
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <SignalAILogo size={48} className="text-emerald-500" />
        </motion.div>
      </div>
    )
  }
  
  if (!activities?.length) {
    return (
      <div className="text-center py-12">
        <motion.div
          className="inline-block mb-4"
          animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.7, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <SignalAILogo size={48} className="opacity-50" />
        </motion.div>
        <p className="text-[var(--text-muted)]">Waiting for neural activity...</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-1">
      {activities.map((activity, index) => {
        const config = getActivityConfig(activity.type)
        const Icon = config.icon
        const isLast = index === activities.length - 1
        
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex gap-4 group"
          >
            {/* Timeline connector */}
            <div className="flex flex-col items-center">
              <motion.div 
                className={cn(
                  "p-2 rounded-xl border transition-all duration-300",
                  config.bg,
                  config.border,
                  "group-hover:scale-110"
                )}
                whileHover={{ scale: 1.1 }}
              >
                <Icon className={cn("h-4 w-4", config.text)} />
              </motion.div>
              {!isLast && (
                <div className="w-px flex-1 bg-gradient-to-b from-white/10 to-transparent my-2" />
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 pb-6">
              <p className="text-sm text-[var(--text-primary)] font-medium">
                {activity.message}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-2">
                <Clock className="h-3 w-3" />
                {activity.time}
              </p>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

// ============================================================================
// DOMAIN ICONS MAPPING
// ============================================================================

const DOMAIN_ICONS = {
  business: Building2,
  products: Package,
  customers: Users,
  operations: Settings,
  competitors: Crosshair,
  voice: Mic
}

// ============================================================================
// MAIN PULSE COMPONENT
// ============================================================================

export default function SignalPulse({ projectId, onNavigate }) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    knowledgeChunks: 0,
    faqs: 0,
    conversations: 0,
    knowledgeGaps: 0,
    healthScore: 0
  })
  const [activities, setActivities] = useState([])
  const [domains, setDomains] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  
  const {
    knowledgeStats,
    faqsStats,
    knowledgeGapsStats,
    fetchKnowledge,
    fetchFaqs,
    fetchKnowledgeGapsStats,
    fetchActivityFeed,
    fetchKnowledgeDomains
  } = useSignalStore()
  
  useEffect(() => {
    if (projectId) {
      loadData()
    }
  }, [projectId])
  
  const loadData = async () => {
    try {
      setLoading(true)
      
      const [, , , activityData, domainsData] = await Promise.all([
        fetchKnowledge(projectId, { limit: 1 }),
        fetchFaqs(projectId, { limit: 1 }),
        fetchKnowledgeGapsStats(projectId),
        fetchActivityFeed(projectId, 10),
        fetchKnowledgeDomains(projectId)
      ])
      
      // Set real activities from API
      if (activityData && activityData.length > 0) {
        setActivities(activityData)
      }
      
      // Set real domains from API
      if (domainsData?.domains && domainsData.domains.length > 0) {
        setDomains(domainsData.domains)
      } else {
        // Fallback to empty domains
        setDomains([
          { key: 'business', label: 'Business', coverage: 0 },
          { key: 'products', label: 'Products', coverage: 0 },
          { key: 'customers', label: 'Customers', coverage: 0 },
          { key: 'operations', label: 'Operations', coverage: 0 },
          { key: 'competitors', label: 'Competitors', coverage: 0 },
          { key: 'voice', label: 'Brand Voice', coverage: 0 }
        ])
      }
      
      setTimeout(() => calculateHealthScore(), 100)
      
    } catch (error) {
      console.error('Failed to load Signal stats:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }
  
  const calculateHealthScore = () => {
    const chunks = knowledgeStats?.totalChunks || 0
    const faqs = faqsStats?.total || 0
    const gaps = knowledgeGapsStats?.total || 0
    
    let score = 0
    score += Math.min(40, chunks * 2)
    score += Math.min(30, faqs * 3)
    score -= Math.min(20, gaps * 2)
    score = Math.max(0, Math.min(100, score))
    
    setStats(prev => ({ ...prev, healthScore: score }))
  }

  return (
    <SignalAmbient className="min-h-[calc(100vh-200px)] -m-6 p-6">
      <div className="space-y-8">
        {/* Hero Section - Health Score */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Health Ring */}
          <GlowCard className="lg:col-span-1" glow>
            <div className="p-6 flex flex-col items-center justify-center min-h-[240px]">
              <MetricRing 
                value={stats.healthScore} 
                loading={loading}
                label="Health"
                size={160}
                strokeWidth={12}
              />
              <p className="text-sm text-[var(--text-secondary)] mt-4 text-center">
                {stats.healthScore >= 80 ? 'Signal is thriving' :
                 stats.healthScore >= 60 ? 'Growing intelligence' :
                 stats.healthScore >= 40 ? 'Needs more training' :
                 'Awaiting knowledge'}
              </p>
            </div>
          </GlowCard>
          
          {/* Quick Stats */}
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatTile
              icon={Database}
              label="Knowledge Chunks"
              value={loading ? '—' : (knowledgeStats?.totalChunks || 0)}
              sublabel="RAG embeddings"
              onClick={() => onNavigate('mind')}
            />
            <StatTile
              icon={HelpCircle}
              label="FAQs"
              value={loading ? '—' : (faqsStats?.total || 0)}
              sublabel={`${faqsStats?.autoGenerated || 0} auto-generated`}
              onClick={() => onNavigate('mind')}
            />
            <StatTile
              icon={AlertTriangle}
              label="Knowledge Gaps"
              value={loading ? '—' : (knowledgeGapsStats?.total || 0)}
              sublabel="Unanswered questions"
              highlight={(knowledgeGapsStats?.total || 0) > 5}
              onClick={() => onNavigate('insights')}
            />
          </div>
        </div>
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Feed */}
          <GlowCard className="lg:col-span-2" glow={false}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20">
                    <Activity className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)]">Neural Activity</h3>
                    <p className="text-xs text-[var(--text-muted)]">Real-time learning feed</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <RefreshCw className={cn("h-4 w-4 text-[var(--text-muted)]", refreshing && "animate-spin")} />
                </motion.button>
              </div>
              
              <ActivityTimeline activities={activities} loading={loading} />
            </div>
          </GlowCard>
          
          {/* Quick Actions */}
          <GlowCard glow={false}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20">
                  <Zap className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">Quick Actions</h3>
                  <p className="text-xs text-[var(--text-muted)]">Common operations</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <ActionButton
                  icon={Brain}
                  label="Teach Signal"
                  description="Add new knowledge"
                  onClick={() => onNavigate('mind')}
                  variant="primary"
                />
                <ActionButton
                  icon={Lightbulb}
                  label="View Gaps"
                  description="See what Signal doesn't know"
                  onClick={() => onNavigate('insights')}
                />
                <ActionButton
                  icon={MessageSquare}
                  label="Test Echo"
                  description="Preview responses"
                  onClick={() => onNavigate('playground')}
                />
                <ActionButton
                  icon={Target}
                  label="Configure"
                  description="Adjust settings"
                  onClick={() => onNavigate('config')}
                />
              </div>
            </div>
          </GlowCard>
        </div>
        
        {/* Knowledge Domains */}
        <GlowCard glow={false}>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20">
                <Layers className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">Knowledge Domains</h3>
                <p className="text-xs text-[var(--text-muted)]">What Signal knows about your business</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {domains.map((domain) => {
                const Icon = DOMAIN_ICONS[domain.key]
                return (
                  <DomainTile
                    key={domain.key}
                    icon={Icon}
                    label={domain.label}
                    coverage={domain.coverage}
                    onClick={() => onNavigate('mind')}
                  />
                )
              })}
            </div>
          </div>
        </GlowCard>
      </div>
    </SignalAmbient>
  )
}
