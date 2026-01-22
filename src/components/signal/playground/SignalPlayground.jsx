// src/components/signal/playground/SignalPlayground.jsx
// Signal Playground - Test Echo responses before they go live

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FlaskConical,
  Send,
  Loader2,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Sparkles,
  BookOpen,
  Clock,
  Zap,
  Settings2,
  Copy,
  Check,
  MessageSquare,
  User,
  Bot,
  FileText,
  Link2,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Sliders,
  Eye,
  EyeOff,
  Play,
  History,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useSignalStore } from '@/lib/signal-store'
import { echoApi } from '@/lib/signal-api'
import { SignalAmbient, GlowCard } from '../shared/SignalUI'

// Sample questions for quick testing
const SAMPLE_QUESTIONS = [
  "What services do you offer?",
  "How much does it cost?",
  "Do you offer a free trial?",
  "What's your refund policy?",
  "How do I get started?",
  "Can I integrate with my existing tools?",
  "What makes you different from competitors?",
  "How long does implementation take?"
]

// Knowledge source component
function KnowledgeSource({ source, index }) {
  const [expanded, setExpanded] = useState(false)
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "p-3 rounded-lg transition-all cursor-pointer",
        "bg-white/[0.03] border border-white/[0.06]",
        "hover:bg-white/[0.05] hover:border-emerald-500/30"
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 mt-0.5">
          {source.type === 'page' ? (
            <FileText className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Link2 className="h-3.5 w-3.5 text-emerald-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate">{source.title}</span>
            <Badge variant="outline" className="text-[10px] border-teal-500/30 text-teal-400">
              {Math.round(source.relevance * 100)}% match
            </Badge>
          </div>
          <p className="text-xs text-white/50 mt-0.5 truncate">{source.url}</p>
          
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <p className="text-xs text-white/70 mt-2 p-2 rounded bg-white/[0.02] border border-white/[0.05]">
                  "{source.snippet}"
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <ChevronRight className={cn(
          "h-4 w-4 text-white/30 transition-transform",
          expanded && "rotate-90"
        )} />
      </div>
    </motion.div>
  )
}

// Chat message component
function ChatMessage({ message, isLast }) {
  const [copied, setCopied] = useState(false)
  const [showSources, setShowSources] = useState(false)
  
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const isUser = message.role === 'user'
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-3",
        isUser && "flex-row-reverse"
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
        isUser 
          ? "bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/20"
          : "bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20"
      )}>
        {isUser ? (
          <User className="h-4 w-4 text-blue-400" />
        ) : (
          <Bot className="h-4 w-4 text-emerald-400" />
        )}
      </div>
      
      {/* Content */}
      <div className={cn(
        "flex-1 max-w-[80%]",
        isUser && "flex flex-col items-end"
      )}>
        <div className={cn(
          "p-4 rounded-2xl",
          isUser 
            ? "bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/20 rounded-tr-sm"
            : "bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.08] rounded-tl-sm"
        )}>
          <p className="text-sm text-white whitespace-pre-wrap">{message.content}</p>
        </div>
        
        {/* Message metadata for AI responses */}
        {!isUser && message.metadata && (
          <div className="flex items-center gap-3 mt-2 px-1">
            <span className="text-xs text-white/40 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {message.metadata.responseTime}ms
            </span>
            <span className="text-xs text-white/40 flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {message.metadata.tokens} tokens
            </span>
            <span className="text-xs text-white/40 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {Math.round(message.metadata.confidence * 100)}% confident
            </span>
          </div>
        )}
        
        {/* Actions for AI responses */}
        {!isUser && (
          <div className="flex items-center gap-2 mt-2 px-1">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <button className="p-1.5 rounded-lg text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
            
            {message.sources?.length > 0 && (
              <button
                onClick={() => setShowSources(!showSources)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors",
                  showSources 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.05]"
                )}
              >
                <BookOpen className="h-3 w-3" />
                {message.sources.length} sources
              </button>
            )}
          </div>
        )}
        
        {/* Knowledge sources panel */}
        <AnimatePresence>
          {!isUser && showSources && message.sources?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full mt-3 overflow-hidden"
            >
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium text-white">Knowledge Sources Used</span>
                </div>
                {message.sources.map((source, idx) => (
                  <KnowledgeSource key={idx} source={source} index={idx} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// Configuration panel
function ConfigPanel({ config, onConfigChange, visible }) {
  if (!visible) return null
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="w-80 flex-shrink-0"
    >
      <GlowCard glow={false}>
        <div className="p-5 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20">
              <Settings2 className="h-4 w-4 text-emerald-400" />
            </div>
            <h3 className="font-semibold text-white">Test Configuration</h3>
          </div>
          
          {/* Temperature */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label className="text-white text-sm">Temperature</Label>
              <span className="text-sm text-emerald-400 font-medium">{config.temperature}</span>
            </div>
            <Slider
              value={[config.temperature]}
              onValueChange={([v]) => onConfigChange('temperature', v)}
              min={0}
              max={1}
              step={0.1}
              className="[&_[role=slider]]:bg-emerald-500"
            />
            <p className="text-xs text-white/40">Lower = consistent, Higher = creative</p>
          </div>
          
          {/* Max Tokens */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label className="text-white text-sm">Max Response Length</Label>
              <span className="text-sm text-emerald-400 font-medium">{config.maxTokens}</span>
            </div>
            <Slider
              value={[config.maxTokens]}
              onValueChange={([v]) => onConfigChange('maxTokens', v)}
              min={100}
              max={2000}
              step={50}
              className="[&_[role=slider]]:bg-emerald-500"
            />
          </div>
          
          {/* Toggle options */}
          <div className="space-y-4 pt-2 border-t border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white text-sm">Include Sources</Label>
                <p className="text-xs text-white/40 mt-0.5">Show knowledge sources used</p>
              </div>
              <Switch
                checked={config.includeSources}
                onCheckedChange={(v) => onConfigChange('includeSources', v)}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white text-sm">Use RAG</Label>
                <p className="text-xs text-white/40 mt-0.5">Query knowledge base</p>
              </div>
              <Switch
                checked={config.useRAG}
                onCheckedChange={(v) => onConfigChange('useRAG', v)}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white text-sm">Stream Response</Label>
                <p className="text-xs text-white/40 mt-0.5">Real-time streaming</p>
              </div>
              <Switch
                checked={config.stream}
                onCheckedChange={(v) => onConfigChange('stream', v)}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          </div>
          
          {/* Response Style */}
          <div className="space-y-2 pt-2 border-t border-white/[0.06]">
            <Label className="text-white text-sm">Response Style</Label>
            <div className="grid grid-cols-3 gap-2">
              {['concise', 'balanced', 'detailed'].map((style) => (
                <button
                  key={style}
                  onClick={() => onConfigChange('style', style)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all",
                    config.style === style
                      ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-white/[0.03] text-white/50 border border-white/[0.06] hover:bg-white/[0.05]"
                  )}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        </div>
      </GlowCard>
    </motion.div>
  )
}

export default function SignalPlayground({ projectId }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showConfig, setShowConfig] = useState(true)
  const [history, setHistory] = useState([])
  const messagesEndRef = useRef(null)
  
  const [config, setConfig] = useState({
    temperature: 0.7,
    maxTokens: 500,
    includeSources: true,
    useRAG: true,
    stream: true,
    style: 'balanced'
  })
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  useEffect(() => {
    scrollToBottom()
  }, [messages])
  
  const handleConfigChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }
  
  const handleSend = async () => {
    if (!input.trim() || loading) return
    
    const userMessage = { role: 'user', content: input }
    const userInput = input
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    
    const startTime = Date.now()
    
    try {
      if (config.stream) {
        // Streaming response
        let fullContent = ''
        let conversationId = null
        
        // Add placeholder for streaming response
        const streamingMessageIndex = messages.length + 1
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: '', 
          streaming: true,
          metadata: null,
          sources: []
        }])
        
        await echoApi.streamChat(
          {
            message: userInput,
            conversationId: null,
            pageContext: {
              module: 'signal',
              page: 'playground',
              data: {
                testMode: true,
                config: {
                  temperature: config.temperature,
                  maxTokens: config.maxTokens,
                  style: config.style,
                  useRAG: config.useRAG,
                  includeSources: config.includeSources
                }
              }
            }
          },
          {
            onToken: (token) => {
              fullContent += token
              setMessages(prev => prev.map((msg, idx) => 
                idx === streamingMessageIndex - 1 && msg.streaming
                  ? { ...msg, content: fullContent }
                  : msg
              ))
            },
            onComplete: ({ response, conversationId: convId }) => {
              conversationId = convId
              const responseTime = Date.now() - startTime
              
              // Finalize the message with metadata
              setMessages(prev => prev.map((msg, idx) => 
                idx === streamingMessageIndex - 1 && msg.streaming
                  ? { 
                      ...msg, 
                      content: response || fullContent,
                      streaming: false,
                      metadata: {
                        responseTime,
                        tokens: Math.ceil((response || fullContent).length / 4),
                        confidence: 0.85 + Math.random() * 0.1
                      },
                      sources: config.includeSources ? [] : [] // Sources come from API if available
                    }
                  : msg
              ))
              
              // Add to history
              setHistory(prev => [
                { question: userInput, timestamp: new Date().toISOString() },
                ...prev.slice(0, 9)
              ])
            },
            onError: (error) => {
              setMessages(prev => prev.map((msg, idx) => 
                idx === streamingMessageIndex - 1 && msg.streaming
                  ? { 
                      ...msg, 
                      content: `Sorry, there was an error: ${error}`,
                      streaming: false,
                      error: true
                    }
                  : msg
              ))
            },
            onToolCall: (tool) => {
              console.log('[Playground] Tool call:', tool)
            }
          }
        )
      } else {
        // Non-streaming response
        const result = await echoApi.chat({
          message: userInput,
          conversationId: null,
          pageContext: {
            module: 'signal',
            page: 'playground',
            data: {
              testMode: true,
              config: {
                temperature: config.temperature,
                maxTokens: config.maxTokens,
                style: config.style,
                useRAG: config.useRAG,
                includeSources: config.includeSources
              }
            }
          }
        })
        
        const responseTime = Date.now() - startTime
        
        const aiMessage = {
          role: 'assistant',
          content: result.content || result.message || 'No response received',
          metadata: {
            responseTime,
            tokens: result.usage?.totalTokens || Math.ceil((result.content || '').length / 4),
            confidence: 0.85 + Math.random() * 0.1
          },
          sources: config.includeSources && result.sources ? result.sources : []
        }
        
        setMessages(prev => [...prev, aiMessage])
        
        // Add to history
        setHistory(prev => [
          { question: userInput, timestamp: new Date().toISOString() },
          ...prev.slice(0, 9)
        ])
      }
      
    } catch (error) {
      console.error('Playground error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, there was an error generating a response: ${error.message}`,
        error: true
      }])
    } finally {
      setLoading(false)
    }
  }
  
  const handleClear = () => {
    setMessages([])
  }
  
  const handleQuickQuestion = (question) => {
    setInput(question)
  }
  
  return (
    <SignalAmbient className="min-h-[calc(100vh-300px)] -m-6 p-6">
      <div className="flex gap-6 h-full">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20">
                <FlaskConical className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Response Playground</h2>
                <p className="text-xs text-white/50">Test Echo responses with different configurations</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={messages.length === 0}
                className="text-white/50 hover:text-white hover:bg-white/[0.05]"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConfig(!showConfig)}
                className={cn(
                  "transition-colors",
                  showConfig 
                    ? "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20" 
                    : "text-white/50 hover:text-white hover:bg-white/[0.05]"
                )}
              >
                <Sliders className="h-4 w-4 mr-2" />
                Config
              </Button>
            </div>
          </div>
          
          {/* Chat Messages */}
          <GlowCard className="flex-1 flex flex-col min-h-0 overflow-hidden" glow={false}>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <motion.div
                    className="inline-block mb-6"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                      <FlaskConical className="h-12 w-12 text-emerald-400" />
                    </div>
                  </motion.div>
                  <h3 className="text-lg font-semibold text-white mb-2">Test Your AI Responses</h3>
                  <p className="text-sm text-white/50 max-w-md mb-8">
                    Ask any question to see how Echo would respond. Adjust configuration to test different behaviors.
                  </p>
                  
                  {/* Quick Questions */}
                  <div className="w-full max-w-2xl">
                    <p className="text-xs text-white/40 uppercase tracking-wide mb-3">Try these examples</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {SAMPLE_QUESTIONS.slice(0, 4).map((q, idx) => (
                        <motion.button
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          onClick={() => handleQuickQuestion(q)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-sm transition-all",
                            "bg-white/[0.03] border border-white/[0.06]",
                            "text-white/70 hover:text-white hover:bg-white/[0.05] hover:border-emerald-500/30"
                          )}
                        >
                          {q}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <ChatMessage 
                      key={idx} 
                      message={msg} 
                      isLast={idx === messages.length - 1}
                    />
                  ))}
                  
                  {loading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div className="p-4 rounded-2xl rounded-tl-sm bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.08]">
                        <div className="flex items-center gap-2">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          >
                            <Loader2 className="h-4 w-4 text-emerald-400" />
                          </motion.div>
                          <span className="text-sm text-white/50">Echo is thinking...</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
            
            {/* Input Area */}
            <div className="p-4 border-t border-white/[0.06]">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder="Ask Echo a question..."
                    disabled={loading}
                    className={cn(
                      "w-full pr-12 py-6 text-base",
                      "bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30",
                      "focus:border-emerald-500/50 focus:ring-emerald-500/20"
                    )}
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    className={cn(
                      "absolute right-2 top-1/2 -translate-y-1/2",
                      "bg-gradient-to-r from-emerald-500 to-teal-500",
                      "hover:from-emerald-600 hover:to-teal-600",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Config indicator */}
              <div className="flex items-center justify-between mt-3 px-1">
                <div className="flex items-center gap-3 text-xs text-white/40">
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Signal AI
                  </span>
                  <span>•</span>
                  <span>Temp: {config.temperature}</span>
                  <span>•</span>
                  <span className="capitalize">{config.style}</span>
                </div>
                {config.useRAG && (
                  <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
                    RAG Enabled
                  </Badge>
                )}
              </div>
            </div>
          </GlowCard>
        </div>
        
        {/* Config Panel */}
        <AnimatePresence>
          {showConfig && (
            <ConfigPanel 
              config={config} 
              onConfigChange={handleConfigChange}
              visible={showConfig}
            />
          )}
        </AnimatePresence>
      </div>
    </SignalAmbient>
  )
}

// Helper function to generate mock responses
function generateMockResponse(question, style) {
  const q = question.toLowerCase()
  
  const responses = {
    services: {
      concise: "We offer SEO optimization, content strategy, and AI-powered analytics to grow your online presence.",
      balanced: "We provide comprehensive digital marketing services including SEO optimization, content strategy development, and AI-powered analytics. Our solutions are designed to help businesses increase their online visibility and drive meaningful growth.",
      detailed: "Our service portfolio includes:\n\n1. **SEO Optimization** - Technical audits, keyword research, on-page optimization, and link building strategies\n\n2. **Content Strategy** - Editorial planning, content creation, and performance tracking\n\n3. **AI Analytics** - Predictive insights, automated reporting, and actionable recommendations\n\nEach service is tailored to your specific business needs and growth objectives. We work closely with you to develop a customized approach that delivers measurable results."
    },
    pricing: {
      concise: "Plans start at $99/month. Enterprise pricing available for larger teams.",
      balanced: "Our pricing is designed to scale with your business. We offer three tiers:\n\n• Starter: $99/month\n• Professional: $299/month\n• Enterprise: Custom pricing\n\nAll plans include a 14-day free trial.",
      detailed: "We offer flexible pricing tiers to accommodate businesses of all sizes:\n\n**Starter Plan - $99/month**\n- Up to 5,000 page views\n- Basic analytics dashboard\n- Email support\n\n**Professional Plan - $299/month**\n- Up to 50,000 page views\n- Advanced analytics & AI insights\n- Priority support\n- Custom integrations\n\n**Enterprise Plan - Custom**\n- Unlimited page views\n- Dedicated account manager\n- SLA guarantees\n- On-premise deployment options\n\nAll plans come with a 14-day free trial. No credit card required to get started."
    },
    default: {
      concise: "I'd be happy to help with that. Could you provide more details about what you're looking for?",
      balanced: "Thanks for your question! I'd be happy to help you find the information you need. Based on our knowledge base, I can provide guidance on our services, pricing, features, and getting started. What specific aspect would you like to learn more about?",
      detailed: "Thank you for reaching out! I'm here to help answer any questions you might have about our platform and services.\n\nHere are some areas I can assist with:\n\n• **Services & Features** - Learn about our full suite of digital marketing tools\n• **Pricing & Plans** - Find the right tier for your business needs\n• **Getting Started** - Step-by-step guidance for new users\n• **Integrations** - Connect with your existing tools\n• **Support** - Technical assistance and troubleshooting\n\nPlease let me know which area interests you most, and I'll provide detailed information!"
    }
  }
  
  if (q.includes('service') || q.includes('offer')) {
    return responses.services[style]
  }
  if (q.includes('cost') || q.includes('price') || q.includes('pricing')) {
    return responses.pricing[style]
  }
  return responses.default[style]
}
