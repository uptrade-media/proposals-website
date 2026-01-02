// src/components/echo/EchoConversation.jsx
// Full Echo conversation view with messaging interface

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Send, 
  Paperclip, 
  Smile, 
  Sparkles, 
  HelpCircle,
  ChevronLeft,
  MoreVertical
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import EchoAvatar from './EchoAvatar'
import EchoMessageBubble from './EchoMessageBubble'
import EchoTypingIndicator from './EchoTypingIndicator'
import useMessagesStore from '@/lib/messages-store'
import useAuthStore from '@/lib/auth-store'

// Default quick prompts for new conversations
const DEFAULT_PROMPTS = [
  { text: "What's my SEO status?", icon: '📊' },
  { text: "Who should I follow up with?", icon: '📞' },
  { text: "Draft a blog post about...", icon: '✏️' },
  { text: "Show me my priorities", icon: '⚡' }
]

export function EchoConversation({ 
  echoContact,
  messages = [],
  onBack,
  className 
}) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { sendToEcho, echoTyping, clearEchoTyping } = useMessagesStore()
  
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, echoTyping])
  
  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  
  const handleSend = async () => {
    if (!input.trim() || sending) return
    
    const message = input.trim()
    setInput('')
    setSending(true)
    
    try {
      await sendToEcho({
        recipientId: echoContact.id,
        content: message,
        subject: 'Echo Conversation'
      })
    } catch (error) {
      console.error('Failed to send to Echo:', error)
    } finally {
      setSending(false)
    }
  }
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }
  
  const handlePromptClick = (prompt) => {
    setInput(prompt.text)
    inputRef.current?.focus()
  }
  
  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion)
    inputRef.current?.focus()
  }
  
  const isNewConversation = messages.length === 0
  
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        
        <EchoAvatar size="md" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Echo</h2>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Sparkles className="w-2.5 h-2.5 mr-0.5" />
              Signal AI
            </Badge>
          </div>
          <p className="text-xs text-emerald-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Always available
          </p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <HelpCircle className="h-4 w-4 mr-2" />
              What can Echo do?
            </DropdownMenuItem>
            <DropdownMenuItem>Clear conversation</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isNewConversation ? (
          // Welcome screen for new conversations
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <EchoAvatar size="xl" className="mb-4" />
            
            <h3 className="text-xl font-semibold mb-2">
              Hey{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
            </h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              I'm Echo, your AI teammate. I can help with SEO, leads, content, and anything else you need.
            </p>
            
            <div className="grid grid-cols-2 gap-2 max-w-md">
              {DEFAULT_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handlePromptClick(prompt)}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-lg text-left',
                    'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700',
                    'hover:bg-emerald-50 hover:border-emerald-200 dark:hover:bg-emerald-950/30 dark:hover:border-emerald-800',
                    'transition-colors duration-150'
                  )}
                >
                  <span className="text-lg">{prompt.icon}</span>
                  <span className="text-sm">{prompt.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Message list
          <>
            {messages.map((message) => (
              <EchoMessageBubble
                key={message.id}
                message={message}
                isOwn={message.sender_id === user?.id}
                onSuggestionClick={handleSuggestionClick}
                onAction={(action) => {
                  // Handle Echo action buttons
                  if (action.type === 'openElement') {
                    // Navigate to Engage and open the element
                    // First navigate to the Engage page with the right params
                    navigate(`/engage?tab=elements&project=${action.projectId}`)
                    // Then dispatch an event to open the element editor
                    // Use setTimeout to ensure navigation completes first
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('echo:openElement', {
                        detail: {
                          projectId: action.projectId,
                          elementId: action.elementId,
                          elementName: action.elementName
                        }
                      }))
                    }, 100)
                  } else if (action.type === 'navigate' && action.route) {
                    navigate(action.route)
                  }
                }}
                className="group"
              />
            ))}
            
            {/* Typing indicator */}
            {echoTyping && <EchoTypingIndicator />}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* Input */}
      <div className="p-4 border-t border-border bg-background">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Echo..."
              className={cn(
                'min-h-[44px] max-h-32 resize-none pr-20',
                'focus-visible:ring-emerald-500'
              )}
              rows={1}
            />
            
            {/* Input actions */}
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Smile className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
          
          <Button 
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="h-11 w-11 p-0 bg-emerald-600 hover:bg-emerald-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Echo has access to your organization's data. Responses are based on your permissions.
        </p>
      </div>
    </div>
  )
}

export default EchoConversation
