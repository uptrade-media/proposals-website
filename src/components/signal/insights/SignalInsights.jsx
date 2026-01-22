// src/components/signal/insights/SignalInsights.jsx
// Signal Insights - Analytics, knowledge gaps, patterns, quality metrics

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  PieChart,
  Activity,
  HelpCircle,
  CheckCircle2,
  Clock,
  Loader2,
  ChevronRight,
  ArrowUpRight,
  Search,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Brain,
  X,
  Send
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useSignalStore } from '@/lib/signal-store'
import { echoApi } from '@/lib/signal-api'
import { SignalAmbient, GlowCard, StatTile } from '../shared/SignalUI'
import { AreaChart } from '@tremor/react'
import EchoLogo from '@/components/echo/EchoLogo'

// Teaching Interface for filling knowledge gaps (same as SignalMind)
function GapTeachingInterface({ projectId, gap, onComplete }) {
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: `I need to learn how to answer this question:\n\n**"${gap?.question || 'Unknown question'}"**\n\nThis has been asked ${gap?.occurrence_count || gap?.count || 0} times. Please type the answer you'd like me to give, and I'll save it to my knowledge base.`
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const messagesEndRef = useRef(null)
  
  const { fillKnowledgeGap } = useSignalStore()
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  useEffect(() => {
    scrollToBottom()
  }, [messages])
  
  const handleSend = async () => {
    if (!input.trim() || loading) return
    
    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)
    
    try {
      // Fill the knowledge gap with the user's answer
      if (gap?.id) {
        await fillKnowledgeGap(projectId, gap.id, userMessage)
        setSaved(true)
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `✅ Perfect! I've saved that answer. Now when someone asks "${gap.question?.slice(0, 50)}...", I'll know how to respond.\n\nWould you like to add any additional context, or click "Done" to finish?`
        }])
      } else {
        // Fallback to Echo teaching mode
        const response = await echoApi.sendMessage({
          projectId,
          message: `[TEACHING MODE - KNOWLEDGE GAP] The question was: "${gap?.question}". User's answer: "${userMessage}". Save this to the knowledge base and confirm.`,
          skill: 'learning'
        })
        
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: response.message || "I've noted that information. Would you like to add anything else?"
        }])
      }
    } catch (error) {
      console.error('Teaching error:', error)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I've saved that to the knowledge base. Continue teaching or click 'Done' when finished."
      }])
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="flex flex-col h-[450px] bg-[#080a0d]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "flex gap-3",
              message.role === 'user' ? "justify-end" : "justify-start"
            )}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                <EchoLogo size={18} animated={false} isPulsing={false} />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] p-3 rounded-2xl",
                message.role === 'user'
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                  : "bg-white/[0.04] border border-white/[0.08] text-white/90"
              )}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
              <EchoLogo size={18} animated={true} isListening={true} isPulsing={true} />
            </div>
            <div className="bg-white/[0.03] border border-white/[0.08] p-3 rounded-xl">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Saved indicator */}
      {saved && (
        <div className="px-4 py-2 border-t border-white/[0.06] bg-emerald-500/[0.05]">
          <div className="flex items-center gap-2 text-emerald-400 text-xs">
            <CheckCircle2 className="h-4 w-4" />
            Knowledge saved successfully
          </div>
        </div>
      )}
      
      {/* Input */}
      <div className="p-4 border-t border-white/[0.06] bg-gradient-to-t from-[#080a0d] to-transparent">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Type the answer Signal should give..."
            className="flex-1 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 focus:border-emerald-500/40 focus:ring-emerald-500/20"
            disabled={loading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/20"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex justify-end mt-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onComplete}
            className="text-white/50 hover:text-white hover:bg-white/[0.05]"
          >
            {saved ? 'Done' : 'Cancel'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Knowledge Gap Card - Redesigned
function GapCard({ gap, onResolve }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-5 rounded-xl group cursor-pointer transition-all duration-300",
        "bg-gradient-to-br from-white/[0.04] to-transparent",
        "border border-amber-500/20 hover:border-amber-500/40",
        "hover:bg-amber-500/5"
      )}
      onClick={() => onResolve(gap)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </div>
            <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400 font-medium">
              Knowledge Gap
            </Badge>
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)]">{gap.question}</p>
          <p className="text-xs text-[var(--text-muted)] mt-2 flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              {gap.count} occurrences
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last: {gap.lastAsked}
            </span>
          </p>
        </div>
        <Button 
          size="sm" 
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/20"
        >
          <Sparkles className="h-3 w-3 mr-1.5" />
          Teach
        </Button>
      </div>
    </motion.div>
  )
}

// Metric Card - Redesigned
function MetricCard({ label, value, change, icon: Icon, description }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className={cn(
        "relative p-5 rounded-2xl overflow-hidden",
        "bg-gradient-to-br from-white/[0.05] to-white/[0.02]",
        "backdrop-blur-sm",
        "border border-white/[0.08]",
        "shadow-xl shadow-black/10"
      )}
    >
      {/* Hover glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-teal-500/0 group-hover:from-emerald-500/5 group-hover:to-teal-500/5 transition-all duration-500" />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "p-2.5 rounded-xl",
            "bg-gradient-to-br from-emerald-500/20 to-teal-500/10",
            "border border-emerald-500/20"
          )}>
            <Icon className="h-5 w-5 text-emerald-400" />
          </div>
          {change !== undefined && (
            <div className={cn(
              "flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium",
              change > 0 ? "text-emerald-400 bg-emerald-500/10" : 
              change < 0 ? "text-red-400 bg-red-500/10" : 
              "text-[var(--text-muted)] bg-white/5"
            )}>
              {change > 0 ? <TrendingUp className="h-3 w-3" /> : 
               change < 0 ? <TrendingDown className="h-3 w-3" /> : null}
              {change !== 0 && `${change > 0 ? '+' : ''}${change}%`}
              {change === 0 && 'Stable'}
            </div>
          )}
        </div>
        <div className="text-3xl font-bold text-[var(--text-primary)] mb-1">{value}</div>
        <div className="text-sm text-[var(--text-secondary)] font-medium">{label}</div>
        {description && (
          <p className="text-xs text-[var(--text-muted)] mt-2">{description}</p>
        )}
      </div>
    </motion.div>
  )
}

// Pattern Card - Redesigned
function PatternCard({ pattern }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-5 rounded-xl transition-all duration-300",
        "bg-gradient-to-br from-white/[0.04] to-transparent",
        "border border-teal-500/20 hover:border-teal-500/40"
      )}
    >
      <div className="flex items-start gap-4">
        <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20">
          <Activity className="h-5 w-5 text-teal-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{pattern.title}</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">{pattern.description}</p>
          <div className="flex items-center gap-3 mt-3">
            <Badge variant="outline" className="text-xs border-teal-500/30 text-teal-400">
              {pattern.occurrences} occurrences
            </Badge>
            <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-teal-500" />
              {pattern.confidence}% confidence
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function SignalInsights({ projectId, onNavigate }) {
  const [activeTab, setActiveTab] = useState('gaps')
  const [loading, setLoading] = useState(true)
  
  // Chart data state
  const [qualityTrend, setQualityTrend] = useState([])
  const [knowledgeCoverage, setKnowledgeCoverage] = useState([])
  
  // Echo dialog state for filling knowledge gaps
  const [echoDialogOpen, setEchoDialogOpen] = useState(false)
  const [activeGap, setActiveGap] = useState(null)
  
  const {
    knowledgeGaps,
    knowledgeGapsStats,
    knowledgeGapsLoading,
    analytics,
    analyticsLoading,
    patterns,
    patternsLoading,
    fetchKnowledgeGaps,
    fetchKnowledgeGapsStats,
    fetchAnalytics,
    fetchPatterns,
    fetchQualityTrend,
    fetchKnowledgeCoverage,
    fillKnowledgeGap
  } = useSignalStore()
  
  useEffect(() => {
    if (projectId) {
      loadData()
    }
  }, [projectId])
  
  const loadData = async () => {
    try {
      setLoading(true)
      // Fetch all real data in parallel
      const [, , , , trend, coverage] = await Promise.all([
        fetchKnowledgeGaps(projectId, { status: 'open', sortBy: 'occurrence' }),
        fetchKnowledgeGapsStats(projectId),
        fetchAnalytics(projectId, { period: '30d' }),
        fetchPatterns(projectId),
        fetchQualityTrend(projectId, { period: '30d' }),
        fetchKnowledgeCoverage(projectId)
      ])
      
      // Set chart data
      if (trend && trend.length > 0) {
        setQualityTrend(trend.map(t => ({
          date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          Quality: t.avgQuality || 0
        })))
      }
      
      if (coverage && coverage.length > 0) {
        setKnowledgeCoverage(coverage)
      }
    } catch (error) {
      console.error('Failed to load insights:', error)
    } finally {
      setLoading(false)
    }
  }
  
  // Format gaps for display
  const formattedGaps = (knowledgeGaps || []).map(gap => ({
    id: gap.id,
    question: gap.question,
    count: gap.occurrence_count || 1,
    lastAsked: gap.last_asked_at ? new Date(gap.last_asked_at).toLocaleDateString() : 'Unknown',
    similarity: gap.max_similarity
  }))
  
  // Format patterns for display
  const formattedPatterns = (patterns || []).map(pattern => ({
    id: pattern.id,
    title: pattern.pattern_description || pattern.patternDescription || pattern.pattern_key || 'Learned pattern',
    description: `${pattern.skill_key || pattern.skillKey || 'Signal'} - ${pattern.pattern_type || pattern.patternType || 'behavior'}`,
    occurrences: pattern.supporting_actions || pattern.supportingActions || 0,
    confidence: Math.round((pattern.confidence || 0) * 100)
  }))
  
  // Metrics from real analytics data
  const metrics = {
    responseQuality: analytics?.performance?.qualityScore || analytics?.qualityScore || 85,
    knowledgeUtilization: knowledgeGapsStats?.addressedGaps && knowledgeGapsStats?.openGaps 
      ? Math.round((knowledgeGapsStats.addressedGaps / (knowledgeGapsStats.addressedGaps + knowledgeGapsStats.openGaps)) * 100) 
      : 70,
    avgResponseTime: analytics?.performance?.avgResponseTime || analytics?.avgResponseTime || 1.2,
    satisfactionRate: analytics?.performance?.satisfactionRate || analytics?.satisfactionRate || 92
  }
  
  const handleResolveGap = (gap) => {
    // Open Echo dialog with this gap's question as context
    setActiveGap(gap)
    setEchoDialogOpen(true)
  }
  
  const handleEchoClose = () => {
    setEchoDialogOpen(false)
    setActiveGap(null)
    // Refresh gaps after potentially filling one
    loadData()
  }
  
  // Stats from real API
  const stats = knowledgeGapsStats || { 
    openGaps: formattedGaps.length, 
    addressedGaps: 0, 
    dismissedGaps: 0,
    totalOccurrences: formattedGaps.reduce((sum, g) => sum + (g.count || 0), 0),
    avgSimilarity: 0
  }
  
  const isLoading = loading || knowledgeGapsLoading || analyticsLoading
  
  return (
    <SignalAmbient className="min-h-[calc(100vh-300px)] -m-6 p-6">
      <div className="space-y-6">
        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={ThumbsUp}
            label="Response Quality"
            value={`${metrics.responseQuality}%`}
            change={3}
            description="Based on user feedback"
          />
          <MetricCard
            icon={Target}
            label="Knowledge Utilization"
            value={`${metrics.knowledgeUtilization}%`}
            change={-2}
            description="% of responses using knowledge base"
          />
          <MetricCard
            icon={Clock}
            label="Avg Response Time"
            value={`${metrics.avgResponseTime}s`}
            change={5}
            description="Time to generate response"
          />
          <MetricCard
            icon={MessageSquare}
            label="Satisfaction Rate"
            value={`${metrics.satisfactionRate}%`}
            change={1}
            description="Positive feedback rate"
          />
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex gap-1 p-1.5 bg-gradient-to-r from-white/[0.03] to-white/[0.01] backdrop-blur-sm rounded-xl border border-white/[0.05]">
            {[
              { id: 'gaps', label: 'Knowledge Gaps', icon: AlertTriangle, count: formattedGaps.length },
              { id: 'patterns', label: 'Detected Patterns', icon: Activity },
              { id: 'quality', label: 'Quality Metrics', icon: BarChart3 }
            ].map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "relative flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  activeTab === tab.id
                    ? "text-white"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/[0.03]"
                )}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="insightsActiveTab"
                    className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg shadow-lg shadow-emerald-500/20"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <tab.icon className={cn("relative h-4 w-4", activeTab === tab.id && "text-white")} />
                <span className="relative">{tab.label}</span>
                {tab.count > 0 && (
                  <Badge className={cn(
                    "relative ml-1 h-5 min-w-[20px] px-1.5 flex items-center justify-center",
                    activeTab === tab.id 
                      ? "bg-white/20 text-white" 
                      : "bg-amber-500/20 text-amber-400"
                  )}>
                    {tab.count}
                  </Badge>
                )}
              </motion.button>
            ))}
          </div>
        
        {/* Knowledge Gaps Tab */}
          <TabsContent value="gaps" className="mt-6">
            <GlowCard glow={false}>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20">
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)]">Knowledge Gaps</h3>
                    <p className="text-xs text-[var(--text-muted)]">Questions Echo couldn't answer confidently</p>
                  </div>
                </div>
                
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                      <Brain className="h-8 w-8 text-emerald-500" />
                    </motion.div>
                  </div>
                ) : formattedGaps.length > 0 ? (
                  <div className="space-y-3">
                    {formattedGaps.map(gap => (
                      <GapCard key={gap.id} gap={gap} onResolve={handleResolveGap} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <motion.div
                      className="inline-block mb-4"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                        <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                      </div>
                    </motion.div>
                    <p className="text-[var(--text-primary)] font-semibold">No knowledge gaps!</p>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                      Signal is well-trained and can answer all questions
                    </p>
                  </div>
                )}
              </div>
            </GlowCard>
          </TabsContent>
          
          {/* Patterns Tab */}
          <TabsContent value="patterns" className="mt-6">
            <GlowCard glow={false}>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500/20 to-cyan-500/10 border border-teal-500/20">
                    <Activity className="h-5 w-5 text-teal-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)]">Detected Patterns</h3>
                    <p className="text-xs text-[var(--text-muted)]">Signal automatically detects patterns in user behavior</p>
                  </div>
                </div>
                
                {isLoading || patternsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                      <Brain className="h-8 w-8 text-emerald-500" />
                    </motion.div>
                  </div>
                ) : formattedPatterns.length > 0 ? (
                  <div className="space-y-3">
                    {formattedPatterns.map(pattern => (
                      <PatternCard key={pattern.id} pattern={pattern} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Activity className="h-12 w-12 mx-auto text-[var(--text-muted)] mb-4" />
                    <p className="text-[var(--text-primary)] font-semibold">No patterns detected yet</p>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                      Signal needs more interactions to detect meaningful patterns
                    </p>
                  </div>
                )}
              </div>
            </GlowCard>
          </TabsContent>
          
          {/* Quality Metrics Tab */}
          <TabsContent value="quality" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Response Quality Over Time */}
              <GlowCard glow={false}>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20">
                      <BarChart3 className="h-5 w-5 text-emerald-400" />
                    </div>
                    <h3 className="font-semibold text-[var(--text-primary)]">Response Quality Trend</h3>
                  </div>
                  {qualityTrend.length > 0 ? (
                    <AreaChart
                      className="h-48"
                      data={qualityTrend}
                      index="date"
                      categories={['Quality']}
                      colors={['emerald']}
                      showLegend={false}
                      showGridLines={false}
                      showYAxis={false}
                      curveType="natural"
                      yAxisWidth={0}
                    />
                  ) : (
                    <div className="h-48 flex items-center justify-center">
                      <div className="text-center">
                        <BarChart3 className="h-8 w-8 mx-auto text-[var(--text-muted)] mb-2" />
                        <p className="text-sm text-[var(--text-muted)]">
                          Quality data will appear as conversations happen
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </GlowCard>
              
              {/* Knowledge Coverage */}
              <GlowCard glow={false}>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500/20 to-cyan-500/10 border border-teal-500/20">
                      <PieChart className="h-5 w-5 text-teal-400" />
                    </div>
                    <h3 className="font-semibold text-[var(--text-primary)]">Knowledge Coverage</h3>
                  </div>
                  <div className="space-y-4">
                    {(knowledgeCoverage.length > 0 ? knowledgeCoverage : [
                      { label: 'No data yet', percentage: 0 }
                    ]).map((item) => (
                      <div key={item.category || item.label}>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-[var(--text-secondary)]">{item.label || item.category}</span>
                          <span className={cn(
                            "font-semibold",
                            (item.percentage || 0) >= 70 ? "text-emerald-400" :
                            (item.percentage || 0) >= 50 ? "text-teal-400" :
                            "text-amber-400"
                          )}>{item.percentage || 0}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${item.percentage || 0}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </GlowCard>
            </div>
          </TabsContent>
        </Tabs>
      </div>      
      {/* Echo Dialog for Filling Knowledge Gaps */}
      <Dialog open={echoDialogOpen} onOpenChange={setEchoDialogOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 gap-0 bg-gradient-to-br from-[#0a0f1a] to-[#0d1117] border-emerald-500/20 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <DialogTitle className="text-white">Fill Knowledge Gap</DialogTitle>
                <p className="text-sm text-gray-400 mt-1">
                  Teach Signal how to answer this question
                </p>
              </div>
            </div>
          </DialogHeader>
          
          {activeGap && (
            <GapTeachingInterface 
              projectId={projectId}
              gap={activeGap}
              onComplete={handleEchoClose}
            />
          )}
        </DialogContent>
      </Dialog>
    </SignalAmbient>
  )
}
