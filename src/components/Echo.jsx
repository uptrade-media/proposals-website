/**
 * Echo - Signal's Conversational Interface
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * A floating chat interface that connects to Signal AI.
 * Can be used as:
 * - Global Echo: Available everywhere, routes to appropriate skill
 * - Module Echo: Embedded in a module, pre-scoped to that skill
 * 
 * Usage:
 *   <Echo />                        // Global Echo (floating)
 *   <Echo skill="seo" contextId={projectId} embedded />  // Module Echo
 */

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Sparkles, Minimize2, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { echoApi } from '@/lib/signal-api'

// Skill icons and colors
const SKILL_CONFIG = {
  seo: { icon: '📊', color: 'bg-green-500', name: 'SEO' },
  crm: { icon: '👥', color: 'bg-blue-500', name: 'CRM' },
  proposals: { icon: '📝', color: 'bg-purple-500', name: 'Proposals' },
  content: { icon: '✏️', color: 'bg-orange-500', name: 'Content' },
  billing: { icon: '💳', color: 'bg-emerald-500', name: 'Billing' },
  support: { icon: '🎧', color: 'bg-pink-500', name: 'Support' },
  router: { icon: '🧠', color: 'bg-indigo-500', name: 'Signal' }
}

export function Echo({ 
  skill = null,  // Pre-scoped skill (for module Echo)
  contextId = null,  // Context ID (site, contact, etc.)
  embedded = false,  // Embedded in a module vs floating
  title = null,  // Custom title
  placeholder = 'Ask Signal anything...',
  className = '',
  initialContext = null,  // Initial context for the conversation (e.g., knowledge gap)
  onClose = null  // Callback when conversation is done
}) {
  const [isOpen, setIsOpen] = useState(embedded)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  const [currentSkill, setCurrentSkill] = useState(skill)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  
  // Set initial prompt based on context
  useEffect(() => {
    if (initialContext?.type === 'knowledge_gap' && initialContext.question) {
      // Add a system message explaining the context
      setMessages([{
        role: 'assistant',
        content: `I need to learn how to answer this question:\n\n**"${initialContext.question}"**\n\nPlease type the answer you'd like me to give when someone asks this. I'll save it to my knowledge base.`,
        skill: 'knowledge'
      }])
    }
  }, [initialContext])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen, isMinimized])

  // Load conversation history
  useEffect(() => {
    if (conversationId) {
      loadConversation()
    }
  }, [conversationId])

  async function loadConversation() {
    try {
      const data = await echoApi.getConversation(conversationId)
      setMessages(data.messages.map(m => ({
        role: m.role === 'echo' ? 'assistant' : m.role,
        content: m.content,
        skill: m.skill_key || currentSkill
      })))
    } catch (error) {
      console.error('Failed to load conversation:', error)
    }
  }

  async function sendMessage(e) {
    e?.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      // Use module endpoint if skill is set, otherwise global
      const chatFn = skill 
        ? () => echoApi.moduleChat(skill, { message: userMessage, conversationId })
        : () => echoApi.chat({ message: userMessage, conversationId })

      const data = await chatFn()
      
      const { message, conversation_id, skill: routedSkill } = data
      
      // Update conversation ID if new
      if (!conversationId && conversation_id) {
        setConversationId(conversation_id)
      }

      // Update skill if routed
      if (routedSkill && !skill) {
        setCurrentSkill(routedSkill)
      }

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: message,
        skill: routedSkill || currentSkill
      }])

    } catch (error) {
      console.error('Echo error:', error)
      setMessages(prev => [...prev, { 
        role: 'error', 
        content: 'Sorry, I encountered an error. Please try again.'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  async function rateMessage(rating) {
    if (!conversationId) return
    try {
      await echoApi.rateResponse({
        conversationId,
        rating
      })
    } catch (error) {
      console.error('Failed to rate:', error)
    }
  }

  // Floating button (when not embedded)
  if (!embedded && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg hover:scale-105 transition-transform"
        aria-label="Open Signal Echo"
      >
        <Sparkles className="h-6 w-6" />
      </button>
    )
  }

  const skillConfig = SKILL_CONFIG[currentSkill] || SKILL_CONFIG.router

  return (
    <div 
      className={cn(
        'flex flex-col bg-background border rounded-lg shadow-xl overflow-hidden',
        embedded 
          ? 'h-full' 
          : 'fixed bottom-6 right-6 z-50 w-[400px]',
        isMinimized ? 'h-14' : embedded ? '' : 'h-[500px]',
        className
      )}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-4 py-3 border-b',
        skillConfig.color.replace('bg-', 'bg-opacity-10 bg-')
      )}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{skillConfig.icon}</span>
          <div>
            <h3 className="font-semibold text-sm">
              {title || `Echo${skill ? ` • ${skillConfig.name}` : ''}`}
            </h3>
            {!isMinimized && messages.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Signal AI Assistant
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!embedded && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      {!isMinimized && (
        <>
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <Sparkles className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-sm mb-2">
                  {skill 
                    ? `Ask me anything about ${skillConfig.name}`
                    : "Hi! I'm Echo, your Signal AI assistant."}
                </p>
                <p className="text-xs opacity-70">
                  {skill 
                    ? 'I can help analyze, recommend, and execute actions.'
                    : "I'll route your questions to the right expert."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <MessageBubble 
                    key={idx} 
                    message={msg} 
                    isLast={idx === messages.length - 1 && msg.role === 'assistant'}
                    onRate={rateMessage}
                  />
                ))}
                {isLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="flex gap-1">
                      <span className="animate-bounce delay-0">●</span>
                      <span className="animate-bounce delay-100">●</span>
                      <span className="animate-bounce delay-200">●</span>
                    </div>
                    <span className="text-xs">Signal is thinking...</span>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <form onSubmit={sendMessage} className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholder}
                disabled={isLoading}
                className="flex-1"
              />
              <Button 
                type="submit" 
                size="icon"
                disabled={!input.trim() || isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}

// Message bubble component
function MessageBubble({ message, isLast, onRate }) {
  const isUser = message.role === 'user'
  const isError = message.role === 'error'
  const skillConfig = message.skill ? SKILL_CONFIG[message.skill] : null

  return (
    <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}>
      {/* Skill badge for assistant */}
      {!isUser && skillConfig && (
        <div className="flex items-center gap-1 mb-1 text-xs text-muted-foreground">
          <span>{skillConfig.icon}</span>
          <span>{skillConfig.name}</span>
        </div>
      )}
      
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-3 py-2 text-sm',
          isUser 
            ? 'bg-primary text-primary-foreground' 
            : isError 
              ? 'bg-destructive/10 text-destructive'
              : 'bg-muted'
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>

      {/* Rating buttons for last assistant message */}
      {isLast && !isUser && !isError && (
        <div className="flex items-center gap-1 mt-1">
          <button 
            onClick={() => onRate(5)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            👍
          </button>
          <button 
            onClick={() => onRate(1)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            👎
          </button>
        </div>
      )}
    </div>
  )
}

// Global Echo hook for opening/closing programmatically
export function useEcho() {
  const [isOpen, setIsOpen] = useState(false)
  const [initialMessage, setInitialMessage] = useState(null)
  const [skill, setSkill] = useState(null)

  function openEcho(options = {}) {
    if (options.message) setInitialMessage(options.message)
    if (options.skill) setSkill(options.skill)
    setIsOpen(true)
  }

  function closeEcho() {
    setIsOpen(false)
    setInitialMessage(null)
    setSkill(null)
  }

  return { isOpen, openEcho, closeEcho, initialMessage, skill }
}

export default Echo
