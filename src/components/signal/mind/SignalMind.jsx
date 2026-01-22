// src/components/signal/mind/SignalMind.jsx
// Signal Mind - Knowledge Center with conversational teaching
// Business DNA, knowledge graph visualization, teaching interface

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  BookOpen,
  Building2,
  Users,
  Package,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  Loader2,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Trash2,
  RefreshCw,
  Globe,
  Mic,
  Send,
  HelpCircle,
  Target,
  Lightbulb,
  Crosshair,
  Settings
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useSignalStore } from '@/lib/signal-store'
import { knowledgeApi, profileApi, faqsApi, echoApi } from '@/lib/signal-api'
import { GlowCard } from '../shared/SignalUI'
import SignalAILogo from '../SignalAILogo'
import EchoLogo from '@/components/echo/EchoLogo'

// Domain Card for knowledge areas - redesigned with icons
function DomainCard({ icon: Icon, label, description, coverage, onClick }) {
  const getCoverageConfig = (pct) => {
    if (pct >= 70) return { 
      border: 'border-emerald-500/20 hover:border-emerald-500/40', 
      badge: 'text-emerald-400 border-emerald-500/30',
      iconBg: 'from-emerald-500/20 to-emerald-500/5',
      iconColor: 'text-emerald-400'
    }
    if (pct >= 50) return { 
      border: 'border-teal-500/20 hover:border-teal-500/40', 
      badge: 'text-teal-400 border-teal-500/30',
      iconBg: 'from-teal-500/20 to-teal-500/5',
      iconColor: 'text-teal-400'
    }
    if (pct >= 25) return { 
      border: 'border-amber-500/20 hover:border-amber-500/40', 
      badge: 'text-amber-400 border-amber-500/30',
      iconBg: 'from-amber-500/20 to-amber-500/5',
      iconColor: 'text-amber-400'
    }
    return { 
      border: 'border-red-500/20 hover:border-red-500/40', 
      badge: 'text-red-400 border-red-500/30',
      iconBg: 'from-red-500/20 to-red-500/5',
      iconColor: 'text-red-400'
    }
  }
  
  const config = getCoverageConfig(coverage)
  
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "w-full p-6 rounded-2xl text-left transition-all group overflow-hidden relative",
        "bg-gradient-to-br from-white/[0.04] to-transparent",
        "backdrop-blur-sm border",
        config.border
      )}
    >
      {/* Hover gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-teal-500/0 group-hover:from-emerald-500/5 group-hover:to-teal-500/5 transition-all duration-500" />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "p-3 rounded-xl bg-gradient-to-br border border-white/10",
            config.iconBg
          )}>
            <Icon className={cn("h-6 w-6", config.iconColor)} />
          </div>
          <Badge 
            variant="outline" 
            className={cn("font-semibold", config.badge)}
          >
            {coverage}%
          </Badge>
        </div>
        <h3 className="font-semibold text-[var(--text-primary)] mb-1">{label}</h3>
        <p className="text-sm text-[var(--text-muted)]">{description}</p>
        <div className="flex items-center gap-2 mt-4 text-emerald-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
          <span>Teach Signal</span>
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </motion.button>
  )
}

// Knowledge Chunk Card
function KnowledgeChunkCard({ chunk, onEdit, onDelete }) {
  return (
    <div className="p-4 rounded-lg bg-[var(--surface-primary)] border border-[var(--border-primary)] group hover:border-emerald-500/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[var(--text-primary)] line-clamp-3">{chunk.content}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {chunk.content_type || 'general'}
            </Badge>
            {chunk.source_url && (
              <span className="text-xs text-[var(--text-muted)] truncate max-w-[200px]">
                {chunk.source_url}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Edit3 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Conversational Teaching Interface
function TeachingInterface({ projectId, domain, onComplete }) {
  const getDomainLabel = (d) => {
    if (!d || d === 'general') return 'business'
    return d
  }
  
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: `Let's teach Signal about your ${getDomainLabel(domain)}. Tell me anything you'd like Signal to know, and I'll help organize and save it to the knowledge base.` 
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [extractedFacts, setExtractedFacts] = useState([])
  const messagesEndRef = useRef(null)
  
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
      // Call Echo to process teaching
      const response = await echoApi.sendMessage({
        projectId,
        message: `[TEACHING MODE - ${domain?.toUpperCase() || 'GENERAL'}] User is teaching you: "${userMessage}". Extract key facts and confirm what you learned. Be specific about what will be saved to the knowledge base.`,
        skill: 'learning'
      })
      
      // Add assistant response
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.message || "I've noted that information. What else would you like me to learn?"
      }])
      
      // Track extracted facts
      if (response.extractedFacts) {
        setExtractedFacts(prev => [...prev, ...response.extractedFacts])
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
    <div className="flex flex-col h-[500px] bg-[#080a0d]">
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
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
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
              <p className="text-sm leading-relaxed">{message.content}</p>
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
      
      {/* Extracted Facts Summary */}
      {extractedFacts.length > 0 && (
        <div className="px-4 py-3 border-t border-white/[0.06] bg-emerald-500/[0.02]">
          <p className="text-xs text-white/40 mb-2">Learned so far:</p>
          <div className="flex flex-wrap gap-1.5">
            {extractedFacts.slice(0, 5).map((fact, i) => (
              <Badge key={i} className="text-xs bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {fact.slice(0, 30)}...
              </Badge>
            ))}
            {extractedFacts.length > 5 && (
              <Badge className="text-xs bg-white/[0.05] border-white/[0.08] text-white/50">+{extractedFacts.length - 5} more</Badge>
            )}
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
            placeholder="Teach Signal something..."
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
        <div className="flex justify-between items-center mt-3">
          <p className="text-xs text-white/40">
            Teaching Signal about: <span className="text-emerald-400 font-medium">{domain ? domain.charAt(0).toUpperCase() + domain.slice(1) : 'General Knowledge'}</span>
          </p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onComplete}
            className="text-white/50 hover:text-white hover:bg-white/[0.05]"
          >
            Done Teaching
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function SignalMind({ projectId, onNavigate }) {
  const [activeTab, setActiveTab] = useState('domains')
  const [teachingDomain, setTeachingDomain] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [knowledgeChunks, setKnowledgeChunks] = useState([])
  const [profile, setProfile] = useState(null)
  
  const {
    knowledgeStats,
    faqsStats
  } = useSignalStore()
  
  // Knowledge domains with coverage estimates - using icons instead of emojis
  const domains = [
    { id: 'business', icon: Building2, label: 'Business Identity', description: 'Who you are, mission, values', coverage: 75 },
    { id: 'products', icon: Package, label: 'Products & Services', description: 'What you sell and pricing', coverage: 60 },
    { id: 'customers', icon: Users, label: 'Customer Understanding', description: 'ICPs, personas, pain points', coverage: 45 },
    { id: 'operations', icon: Settings, label: 'Operations', description: 'How you work, team, hours', coverage: 30 },
    { id: 'competitors', icon: Crosshair, label: 'Competitive Landscape', description: 'Market position, alternatives', coverage: 20 },
    { id: 'voice', icon: Mic, label: 'Brand Voice', description: 'Tone, style, personality', coverage: 55 }
  ]
  
  useEffect(() => {
    if (projectId) {
      loadData()
    }
  }, [projectId])
  
  const loadData = async () => {
    try {
      setLoading(true)
      
      // Fetch knowledge via store (it updates stats too)
      const { fetchKnowledge } = useSignalStore.getState()
      await fetchKnowledge(projectId, { limit: 50 })
      
      // Get chunks from store
      const { knowledge } = useSignalStore.getState()
      setKnowledgeChunks(knowledge || [])
      
      // Fetch profile
      try {
        const { data: profileData } = await profileApi.get(projectId)
        setProfile(profileData)
      } catch (e) {
        console.log('No profile yet')
      }
      
    } catch (error) {
      console.error('Failed to load mind data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleTeach = (domain) => {
    setTeachingDomain(domain)
  }
  
  const filteredChunks = knowledgeChunks.filter(chunk => 
    !searchQuery || chunk.content?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[var(--surface-secondary)]">
          <TabsTrigger value="domains" className="gap-2">
            <Brain className="h-4 w-4" />
            Knowledge Domains
          </TabsTrigger>
          <TabsTrigger value="chunks" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Knowledge Base
          </TabsTrigger>
          <TabsTrigger value="faqs" className="gap-2">
            <HelpCircle className="h-4 w-4" />
            FAQs
          </TabsTrigger>
        </TabsList>
        
        {/* Domains Tab */}
        <TabsContent value="domains" className="space-y-6 mt-6">
          {/* Teaching Dialog */}
          <Dialog open={!!teachingDomain} onOpenChange={(open) => !open && setTeachingDomain(null)}>
            <DialogContent className="sm:max-w-[650px] bg-gradient-to-b from-[#0d1117] to-[#0a0d12] border-white/[0.08] p-0 overflow-hidden">
              {/* Premium header */}
              <div className="relative px-6 pt-6 pb-4">
                {/* Ambient glow */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-60 h-24 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 blur-3xl opacity-50" />
                </div>
                
                <div className="relative">
                  <DialogHeader className="space-y-2">
                    <DialogTitle className="flex items-center gap-3 text-lg font-semibold text-white">
                      <SignalAILogo size={32} white />
                      Teach Signal
                    </DialogTitle>
                    <DialogDescription className="text-white/50">
                      Have a conversation with Signal to teach it about your {teachingDomain?.id === 'general' ? 'business' : teachingDomain?.label?.toLowerCase()}
                    </DialogDescription>
                  </DialogHeader>
                </div>
              </div>
              <TeachingInterface 
                projectId={projectId} 
                domain={teachingDomain?.id}
                onComplete={() => {
                  setTeachingDomain(null)
                  loadData()
                }}
              />
            </DialogContent>
          </Dialog>
          
          {/* Quick Teach Action */}
          <Card className="border-2 border-dashed border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 to-teal-500/5">
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)]">Teach Signal Anything</h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Start a conversation to add knowledge to any domain
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => setTeachingDomain({ id: 'general', label: 'General' })}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Start Teaching
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Domain Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {domains.map(domain => (
              <DomainCard
                key={domain.id}
                {...domain}
                onClick={() => handleTeach(domain)}
              />
            ))}
          </div>
          
          {/* Profile Summary */}
          {profile && (
            <Card className="bg-[var(--surface-secondary)] border-[var(--border-primary)]">
              <CardHeader>
                <CardTitle className="text-[var(--text-primary)] flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-emerald-500" />
                  Business Profile
                </CardTitle>
                <CardDescription>Extracted from your website</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {profile.business_name && (
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Business Name</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{profile.business_name}</p>
                    </div>
                  )}
                  {profile.industry && (
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Industry</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{profile.industry}</p>
                    </div>
                  )}
                  {profile.primary_services && (
                    <div className="col-span-2">
                      <p className="text-xs text-[var(--text-muted)]">Primary Services</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{profile.primary_services}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Knowledge Chunks Tab */}
        <TabsContent value="chunks" className="space-y-4 mt-6">
          {/* Search and Add */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search knowledge base..."
                className="pl-10"
              />
            </div>
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-500">
              <Plus className="h-4 w-4 mr-2" />
              Add Knowledge
            </Button>
          </div>
          
          {/* Chunks List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : filteredChunks.length > 0 ? (
            <div className="space-y-3">
              {filteredChunks.map((chunk, index) => (
                <KnowledgeChunkCard
                  key={chunk.id || index}
                  chunk={chunk}
                  onEdit={() => console.log('Edit', chunk)}
                  onDelete={() => console.log('Delete', chunk)}
                />
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-[var(--text-muted)] mb-4" />
                <h3 className="font-medium text-[var(--text-primary)] mb-2">No knowledge yet</h3>
                <p className="text-sm text-[var(--text-muted)] mb-4">
                  Teach Signal about your business to build the knowledge base
                </p>
                <Button 
                  onClick={() => setTeachingDomain({ id: 'general', label: 'General' })}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500"
                >
                  Start Teaching
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* FAQs Tab */}
        <TabsContent value="faqs" className="mt-6">
          <GlowCard glow={false}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20">
                  <HelpCircle className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">FAQs ({faqsStats?.total || 0})</h3>
                  <p className="text-xs text-white/50">
                    {faqsStats?.autoGenerated || 0} auto-generated, {(faqsStats?.total || 0) - (faqsStats?.autoGenerated || 0)} manual
                  </p>
                </div>
              </div>
              
              <div className="text-center py-12">
                <motion.div
                  className="inline-block mb-4"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                    <HelpCircle className="h-10 w-10 text-emerald-400" />
                  </div>
                </motion.div>
                <p className="text-white font-semibold">FAQ Management Coming Soon</p>
                <p className="text-sm text-white/50 mt-2 max-w-md mx-auto">
                  FAQs are auto-generated during setup and help Echo answer common questions instantly.
                </p>
              </div>
            </div>
          </GlowCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
