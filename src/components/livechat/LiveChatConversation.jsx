// src/components/livechat/LiveChatConversation.jsx
// Full live chat conversation view for agents

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { 
  Send, 
  ChevronLeft,
  MoreVertical,
  ExternalLink,
  Mail,
  Phone,
  Clock,
  MessageCircle,
  Bot,
  User,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import LiveChatAvatar from './LiveChatAvatar'
import useMessagesStore from '@/lib/messages-store'
import useAuthStore from '@/lib/auth-store'
import api from '@/lib/api'

const STATUS_CONFIG = {
  active: { label: 'Active', icon: MessageCircle, color: 'text-blue-500' },
  ai: { label: 'AI Handling', icon: Bot, color: 'text-purple-500' },
  pending_handoff: { label: 'Waiting for Agent', icon: Clock, color: 'text-amber-500' },
  human: { label: 'Agent Active', icon: User, color: 'text-emerald-500' },
  closed: { label: 'Closed', icon: XCircle, color: 'text-gray-400' }
}

export function LiveChatConversation({ 
  session,
  onBack,
  onSessionUpdate,
  className 
}) {
  const { user } = useAuthStore()
  
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  
  const status = session?.chat_status || 'active'
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.active
  const StatusIcon = statusConfig.icon
  
  // Fetch messages on mount
  useEffect(() => {
    if (session?.id) {
      fetchMessages()
    }
  }, [session?.id])
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  // Focus input
  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  
  const fetchMessages = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/.netlify/functions/engage-chat-messages?sessionId=${session.id}`)
      setMessages(response.data.session?.messages || [])
      
      // Mark messages as read
      await api.post('/.netlify/functions/engage-chat-messages', {
        sessionId: session.id,
        action: 'mark_read'
      }).catch(() => {}) // Ignore errors for read receipts
    } catch (error) {
      console.error('Failed to fetch chat messages:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleSend = async () => {
    if (!input.trim() || sending || status === 'closed') return
    
    const content = input.trim()
    setInput('')
    setSending(true)
    
    // Optimistic update
    const tempMessage = {
      id: `temp_${Date.now()}`,
      role: 'agent',
      content,
      created_at: new Date().toISOString(),
      sender: { name: user?.name || 'Agent' }
    }
    setMessages(prev => [...prev, tempMessage])
    
    try {
      const response = await api.post('/.netlify/functions/engage-chat-messages', {
        sessionId: session.id,
        content
      })
      
      // Replace temp message with real one
      setMessages(prev => prev.map(m => 
        m.id === tempMessage.id ? response.data.message : m
      ))
    } catch (error) {
      console.error('Failed to send message:', error)
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id))
      setInput(content) // Restore input
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
  
  const handleCloseChat = async () => {
    try {
      await api.put(`/.netlify/functions/engage-chat-session`, {
        sessionId: session.id,
        status: 'closed'
      })
      onSessionUpdate?.({ ...session, chat_status: 'closed' })
    } catch (error) {
      console.error('Failed to close chat:', error)
    }
  }
  
  const handleTakeOver = async () => {
    try {
      await api.put(`/.netlify/functions/engage-chat-session`, {
        sessionId: session.id,
        status: 'human'
      })
      onSessionUpdate?.({ ...session, chat_status: 'human' })
    } catch (error) {
      console.error('Failed to take over chat:', error)
    }
  }
  
  if (!session) return null
  
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-background/95 backdrop-blur">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        
        <LiveChatAvatar 
          name={session.partner_name} 
          status={status}
          size="md" 
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold truncate">
              {session.partner_name || 'Visitor'}
            </h2>
            <Badge className={cn('text-[10px] px-1.5', statusConfig.color)}>
              <StatusIcon className="w-3 h-3 mr-0.5" />
              {statusConfig.label}
            </Badge>
          </div>
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {session.partner_email && (
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {session.partner_email}
              </span>
            )}
            {session.partner_phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {session.partner_phone}
              </span>
            )}
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {status === 'ai' && (
              <DropdownMenuItem onClick={handleTakeOver}>
                <User className="h-4 w-4 mr-2" />
                Take over from AI
              </DropdownMenuItem>
            )}
            {session.source_url && (
              <DropdownMenuItem onClick={() => window.open(session.source_url, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                View source page
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCloseChat} className="text-red-600">
              <XCircle className="h-4 w-4 mr-2" />
              Close chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Source URL banner */}
      {session.source_url && (
        <div className="px-4 py-2 bg-muted/50 border-b text-xs flex items-center gap-2">
          <ExternalLink className="w-3 h-3" />
          <span className="text-muted-foreground">Chatting from:</span>
          <a 
            href={session.source_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline truncate"
          >
            {session.source_url}
          </a>
        </div>
      )}
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No messages yet</h3>
            <p className="text-sm text-muted-foreground">
              The visitor hasn't sent any messages yet.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble 
                key={message.id} 
                message={message}
                isAgent={message.role === 'agent'}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* Input */}
      {status !== 'closed' ? (
        <div className="p-4 border-t border-border bg-background">
          <div className="flex items-end gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={status === 'ai' ? 'Take over to reply...' : 'Type a message...'}
              disabled={status === 'ai'}
              className="min-h-[44px] max-h-32 resize-none"
              rows={1}
            />
            
            <Button 
              onClick={status === 'ai' ? handleTakeOver : handleSend}
              disabled={status === 'ai' ? false : (!input.trim() || sending)}
              className="h-11"
            >
              {status === 'ai' ? (
                <>
                  <User className="h-4 w-4 mr-2" />
                  Take Over
                </>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4 border-t border-border bg-muted/50 text-center text-sm text-muted-foreground">
          <XCircle className="h-4 w-4 inline mr-2" />
          This chat has been closed
        </div>
      )}
    </div>
  )
}

// Message bubble component
function MessageBubble({ message, isAgent }) {
  const isAI = message.role === 'ai' || message.role === 'assistant'
  
  return (
    <div className={cn(
      'flex gap-3',
      isAgent ? 'flex-row-reverse' : 'flex-row'
    )}>
      {/* Avatar */}
      {!isAgent && (
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0',
          isAI ? 'bg-purple-500' : 'bg-blue-500'
        )}>
          {isAI ? <Bot className="w-4 h-4" /> : (message.sender?.name?.charAt(0) || 'V')}
        </div>
      )}
      
      <div className={cn(
        'flex flex-col max-w-[75%]',
        isAgent ? 'items-end' : 'items-start'
      )}>
        {/* Sender name */}
        {!isAgent && (
          <span className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            {isAI ? 'Echo AI' : (message.sender?.name || 'Visitor')}
            {isAI && <Bot className="w-3 h-3" />}
          </span>
        )}
        
        {/* Message content */}
        <div className={cn(
          'rounded-2xl px-4 py-2.5',
          isAgent 
            ? 'bg-blue-600 text-white' 
            : isAI
              ? 'bg-purple-100 dark:bg-purple-900/30'
              : 'bg-gray-100 dark:bg-gray-800'
        )}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        
        {/* Timestamp */}
        <span className="text-[10px] text-muted-foreground mt-1 px-1">
          {formatTime(message.created_at)}
        </span>
      </div>
    </div>
  )
}

function formatTime(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default LiveChatConversation
