// src/components/signal/training/SignalTraining.jsx
// Signal Training - Review uncertain responses, provide corrections, help Echo learn
// Premium glass UI with neural aesthetic

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Check,
  X,
  Clock,
  AlertTriangle,
  Sparkles,
  Brain,
  Edit3,
  Send,
  Loader2,
  RefreshCw,
  ChevronRight,
  RotateCcw,
  Filter,
  Target,
  TrendingUp,
  Lightbulb,
  Eye,
  CheckCircle2,
  XCircle,
  Pause,
  Play
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useSignalStore } from '@/lib/signal-store'
import { SignalAmbient, GlowCard, MetricRing } from '../shared/SignalUI'
import EchoLogo from '@/components/echo/EchoLogo'

// Suggestion type configuration
const SUGGESTION_TYPES = {
  faq: { 
    label: 'New FAQ', 
    icon: MessageSquare, 
    color: 'text-blue-400', 
    bgColor: 'from-blue-500/20 to-blue-500/5',
    borderColor: 'border-blue-500/30',
    description: 'Suggested FAQ from conversation patterns'
  },
  knowledge_gap: { 
    label: 'Knowledge Gap', 
    icon: Brain, 
    color: 'text-amber-400', 
    bgColor: 'from-amber-500/20 to-amber-500/5',
    borderColor: 'border-amber-500/30',
    description: 'Missing knowledge identified from questions'
  },
  improvement: { 
    label: 'Improvement', 
    icon: TrendingUp, 
    color: 'text-emerald-400', 
    bgColor: 'from-emerald-500/20 to-emerald-500/5',
    borderColor: 'border-emerald-500/30',
    description: 'Response quality improvement'
  },
  correction: { 
    label: 'Correction', 
    icon: Edit3, 
    color: 'text-purple-400', 
    bgColor: 'from-purple-500/20 to-purple-500/5',
    borderColor: 'border-purple-500/30',
    description: 'User-submitted correction to apply'
  },
}

// Status configuration
const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-amber-400', borderColor: 'border-amber-500/30' },
  approved: { label: 'Approved', color: 'text-blue-400', borderColor: 'border-blue-500/30' },
  applied: { label: 'Applied', color: 'text-emerald-400', borderColor: 'border-emerald-500/30' },
  rejected: { label: 'Rejected', color: 'text-red-400', borderColor: 'border-red-500/30' },
  deferred: { label: 'Deferred', color: 'text-white/40', borderColor: 'border-white/20' }
}

// Stat card component
function StatCard({ label, value, icon: Icon, trend, color = 'emerald' }) {
  const colorMap = {
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-400',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-400',
  }
  
  return (
    <div className={cn(
      "p-4 rounded-xl bg-gradient-to-br border",
      colorMap[color]
    )}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={cn("h-5 w-5", `text-${color}-400`)} />
        {trend && (
          <span className="text-xs text-emerald-400">+{trend}%</span>
        )}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-white/50 mt-1">{label}</p>
    </div>
  )
}

// Suggestion card component
function SuggestionCard({ suggestion, onAction, actionLoading }) {
  const type = SUGGESTION_TYPES[suggestion.type || suggestion.skillKey] || SUGGESTION_TYPES.improvement
  const status = STATUS_CONFIG[suggestion.status] || STATUS_CONFIG.pending
  const TypeIcon = type.icon
  
  const isLoading = (action) => actionLoading === action
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "p-4 rounded-xl bg-gradient-to-br from-white/[0.04] to-transparent",
        "border border-white/[0.08] hover:border-white/[0.15] transition-all group"
      )}
    >
      <div className="flex items-start gap-4">
        {/* Type Icon */}
        <div className={cn(
          "p-2.5 rounded-xl bg-gradient-to-br border flex-shrink-0",
          type.bgColor,
          type.borderColor
        )}>
          <TypeIcon className={cn("h-5 w-5", type.color)} />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-xs font-medium", type.color)}>{type.label}</span>
            <Badge variant="outline" className={cn("text-[10px]", status.color, status.borderColor)}>
              {status.label}
            </Badge>
          </div>
          
          {/* Issue Pattern / What was learned */}
          <p className="text-sm text-white font-medium mb-2">
            {suggestion.issuePattern || suggestion.issue_pattern || 'Response improvement suggestion'}
          </p>
          
          {/* Improvement suggestion */}
          {(suggestion.improvement || suggestion.exampleGood) && (
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] mb-3">
              <p className="text-xs text-white/40 mb-1">Suggested Improvement:</p>
              <p className="text-sm text-white/80">
                {suggestion.improvement || suggestion.exampleGood}
              </p>
            </div>
          )}
          
          {/* Bad example (if exists) */}
          {(suggestion.exampleBad || suggestion.example_bad) && (
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 mb-3">
              <p className="text-xs text-red-400/60 mb-1">Original Response:</p>
              <p className="text-sm text-white/60 line-clamp-2">
                {suggestion.exampleBad || suggestion.example_bad}
              </p>
            </div>
          )}
          
          {/* Actions */}
          {suggestion.status === 'pending' && (
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                onClick={() => onAction(suggestion.id, 'apply')}
                disabled={actionLoading}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
              >
                {isLoading('apply') ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                )}
                Apply
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onAction(suggestion.id, 'approve')}
                disabled={actionLoading}
                className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
              >
                {isLoading('approve') ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <ThumbsUp className="h-3.5 w-3.5 mr-1.5" />
                )}
                Approve
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onAction(suggestion.id, 'defer')}
                disabled={actionLoading}
                className="text-white/50 hover:text-white hover:bg-white/[0.05]"
              >
                {isLoading('defer') ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Clock className="h-3.5 w-3.5 mr-1.5" />
                )}
                Later
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onAction(suggestion.id, 'reject')}
                disabled={actionLoading}
                className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
              >
                {isLoading('reject') ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <X className="h-3.5 w-3.5 mr-1.5" />
                )}
                Reject
              </Button>
            </div>
          )}
        </div>
        
        {/* Timestamp */}
        <div className="text-[10px] text-white/30 flex-shrink-0">
          {suggestion.createdAt ? new Date(suggestion.createdAt).toLocaleDateString() : 'Recently'}
        </div>
      </div>
    </motion.div>
  )
}

// Empty state component
function EmptyState({ type = 'pending' }) {
  const messages = {
    pending: {
      icon: CheckCircle2,
      title: "All caught up!",
      description: "No pending suggestions to review. Echo is performing well.",
      color: 'emerald'
    },
    approved: {
      icon: ThumbsUp,
      title: "No approved items",
      description: "Approved suggestions will appear here before being applied.",
      color: 'blue'
    },
    applied: {
      icon: Sparkles,
      title: "No applied improvements yet",
      description: "Applied learnings will be shown here.",
      color: 'purple'
    },
    all: {
      icon: Brain,
      title: "No learning data",
      description: "As Echo interacts with users, learning suggestions will appear here.",
      color: 'amber'
    }
  }
  
  const config = messages[type] || messages.all
  const Icon = config.icon
  
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <motion.div
        className="mb-4"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className={cn(
          "p-4 rounded-2xl bg-gradient-to-br border",
          config.color === 'emerald' && "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20",
          config.color === 'blue' && "from-blue-500/20 to-blue-500/5 border-blue-500/20",
          config.color === 'purple' && "from-purple-500/20 to-purple-500/5 border-purple-500/20",
          config.color === 'amber' && "from-amber-500/20 to-amber-500/5 border-amber-500/20",
        )}>
          <Icon className={cn(
            "h-8 w-8",
            config.color === 'emerald' && "text-emerald-400",
            config.color === 'blue' && "text-blue-400",
            config.color === 'purple' && "text-purple-400",
            config.color === 'amber' && "text-amber-400",
          )} />
        </div>
      </motion.div>
      <h3 className="text-lg font-semibold text-white mb-1">{config.title}</h3>
      <p className="text-sm text-white/50 max-w-md">{config.description}</p>
    </div>
  )
}

export default function SignalTraining({ projectId }) {
  const {
    suggestions,
    suggestionsLoading,
    suggestionsPagination,
    suggestionsStats,
    fetchSuggestions,
    approveSuggestion,
    applySuggestion,
    rejectSuggestion,
    deferSuggestion
  } = useSignalStore()
  
  const [activeTab, setActiveTab] = useState('pending')
  const [typeFilter, setTypeFilter] = useState('all')
  const [actionLoading, setActionLoading] = useState({})
  
  // Fetch on mount and filter changes
  useEffect(() => {
    if (projectId) {
      fetchSuggestions(projectId, {
        status: activeTab !== 'all' ? activeTab : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined
      })
    }
  }, [projectId, activeTab, typeFilter])
  
  const handleAction = async (suggestionId, action) => {
    setActionLoading(prev => ({ ...prev, [suggestionId]: action }))
    try {
      switch (action) {
        case 'approve':
          await approveSuggestion(projectId, suggestionId)
          break
        case 'apply':
          await applySuggestion(projectId, suggestionId)
          break
        case 'reject':
          await rejectSuggestion(projectId, suggestionId)
          break
        case 'defer':
          await deferSuggestion(projectId, suggestionId)
          break
      }
      // Refresh after action
      await fetchSuggestions(projectId, {
        status: activeTab !== 'all' ? activeTab : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined
      })
    } catch (error) {
      console.error(`Failed to ${action} suggestion:`, error)
    } finally {
      setActionLoading(prev => ({ ...prev, [suggestionId]: null }))
    }
  }
  
  const handleRefresh = () => {
    fetchSuggestions(projectId, {
      status: activeTab !== 'all' ? activeTab : undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined
    })
  }
  
  const stats = suggestionsStats || { byStatus: {}, byType: {} }
  const pendingCount = stats.byStatus?.pending || 0
  const approvedCount = stats.byStatus?.approved || 0
  const appliedCount = (stats.byStatus?.applied || 0) + (stats.byStatus?.approved || 0)
  const totalLearnings = stats.total || suggestions.length || 0
  
  return (
    <SignalAmbient className="min-h-[calc(100vh-300px)] -m-6 p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20">
              <GraduationCap className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Training</h2>
              <p className="text-xs text-white/50">Review suggestions & help Echo learn</p>
            </div>
          </div>
          
          {/* Refresh */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={suggestionsLoading}
            className="text-white/50 hover:text-white hover:bg-white/[0.05]"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", suggestionsLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
        
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="Pending Review"
            value={pendingCount}
            icon={Clock}
            color="amber"
          />
          <StatCard
            label="Applied Learnings"
            value={appliedCount}
            icon={Sparkles}
            color="emerald"
          />
          <StatCard
            label="Total Learnings"
            value={totalLearnings}
            icon={Brain}
            color="purple"
          />
          <StatCard
            label="Echo Accuracy"
            value="94%"
            icon={Target}
            color="blue"
            trend={2}
          />
        </div>
        
        {/* Main Content */}
        <GlowCard glow={false}>
          {/* Tabs & Filters */}
          <div className="p-4 border-b border-white/[0.06]">
            <div className="flex items-center justify-between">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-white/[0.03] border border-white/[0.08]">
                  <TabsTrigger 
                    value="pending" 
                    className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
                  >
                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                    Pending
                    {pendingCount > 0 && (
                      <Badge className="ml-1.5 h-5 px-1.5 bg-amber-500/30 text-amber-300 border-0">
                        {pendingCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="approved"
                    className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400"
                  >
                    Approved
                  </TabsTrigger>
                  <TabsTrigger 
                    value="applied"
                    className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"
                  >
                    Applied
                  </TabsTrigger>
                  <TabsTrigger 
                    value="all"
                    className="data-[state=active]:bg-white/10"
                  >
                    All
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px] bg-white/[0.03] border-white/[0.08] text-white">
                  <Filter className="h-4 w-4 mr-2 text-white/50" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(SUGGESTION_TYPES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <config.icon className={cn("h-4 w-4", config.color)} />
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Suggestions List */}
          <div className="p-4 min-h-[400px]">
            {suggestionsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-3" />
                  <p className="text-sm text-white/50">Loading suggestions...</p>
                </div>
              </div>
            ) : suggestions.length === 0 ? (
              <EmptyState type={activeTab} />
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="space-y-3">
                  {suggestions.map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      onAction={handleAction}
                      actionLoading={actionLoading[suggestion.id]}
                    />
                  ))}
                </div>
              </AnimatePresence>
            )}
          </div>
          
          {/* Pagination info */}
          {suggestionsPagination?.total > 0 && (
            <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between">
              <p className="text-xs text-white/40">
                Showing {suggestions.length} of {suggestionsPagination.total} suggestions
              </p>
              {suggestionsPagination.pages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={suggestionsPagination.page <= 1}
                    className="text-white/50 hover:text-white"
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-white/40">
                    Page {suggestionsPagination.page} of {suggestionsPagination.pages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={suggestionsPagination.page >= suggestionsPagination.pages}
                    className="text-white/50 hover:text-white"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </GlowCard>
        
        {/* How It Works */}
        <GlowCard glow={false}>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-medium text-white">How Training Works</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">1</div>
                  <h4 className="text-sm font-medium text-white">Echo Learns</h4>
                </div>
                <p className="text-xs text-white/50">
                  When Echo gives uncertain or low-rated responses, it suggests improvements.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-400">2</div>
                  <h4 className="text-sm font-medium text-white">You Review</h4>
                </div>
                <p className="text-xs text-white/50">
                  Review suggestions here. Approve good ones, reject incorrect ones.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400">3</div>
                  <h4 className="text-sm font-medium text-white">Echo Improves</h4>
                </div>
                <p className="text-xs text-white/50">
                  Applied learnings are integrated into Signal's knowledge, improving future responses.
                </p>
              </div>
            </div>
          </div>
        </GlowCard>
      </div>
    </SignalAmbient>
  )
}
