// src/components/engage/EngageChatInbox.jsx
// Portal inbox for viewing and responding to live chat sessions

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import {
  MessageCircle,
  Send,
  Loader2,
  Clock,
  User,
  Mail,
  Phone,
  Globe,
  ExternalLink,
  RefreshCw,
  CheckCheck,
  Bot,
  Sparkles
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// Status badge config
const STATUS_STYLES = {
  active: { label: 'Active', className: 'bg-green-500/10 text-green-600 border-green-500/30' },
  ai: { label: 'AI', className: 'bg-purple-500/10 text-purple-600 border-purple-500/30' },
  pending_handoff: { label: 'Pending', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  human: { label: 'Human', className: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  closed: { label: 'Closed', className: 'bg-slate-500/10 text-slate-600 border-slate-500/30' }
}

export default function EngageChatInbox({ projectId }) {
  const [sessions, setSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const messagesEndRef = useRef(null)
  const pollingRef = useRef(null)

  // Fetch sessions on mount
  useEffect(() => {
    fetchSessions()
    
    // Set up polling
    pollingRef.current = setInterval(() => {
      fetchSessions(true)
      if (selectedSession) {
        fetchSessionDetails(selectedSession.id, true)
      }
    }, 5000)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [projectId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedSession?.messages])

  const fetchSessions = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const params = projectId ? `?projectId=${projectId}` : ''
      const { data } = await api.get(`/.netlify/functions/engage-chat-messages${params}`)
      setSessions(data.sessions || [])
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
      if (!silent) toast.error('Failed to load chat sessions')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const fetchSessionDetails = async (sessionId, silent = false) => {
    try {
      if (!silent) setLoadingMessages(true)
      const { data } = await api.get(`/.netlify/functions/engage-chat-messages?sessionId=${sessionId}`)
      setSelectedSession(data.session)
    } catch (error) {
      console.error('Failed to fetch session:', error)
      if (!silent) toast.error('Failed to load chat messages')
    } finally {
      if (!silent) setLoadingMessages(false)
    }
  }

  const selectSession = (session) => {
    setSelectedSession(null)
    fetchSessionDetails(session.id)
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!message.trim() || !selectedSession) return

    const content = message.trim()
    setMessage('')
    setSending(true)

    try {
      const { data } = await api.post('/.netlify/functions/engage-chat-messages', {
        sessionId: selectedSession.id,
        content
      })

      // Add message to local state
      setSelectedSession(prev => ({
        ...prev,
        messages: [...(prev.messages || []), data.message]
      }))

      // Update session in list
      setSessions(prev => prev.map(s => 
        s.id === selectedSession.id 
          ? { ...s, last_message_at: new Date().toISOString(), message_count: (s.message_count || 0) + 1 }
          : s
      ))
    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error('Failed to send message')
      setMessage(content) // Restore message
    } finally {
      setSending(false)
    }
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] border rounded-lg overflow-hidden bg-background">
      {/* Sessions List */}
      <div className="w-80 border-r flex flex-col bg-muted/30">
        <div className="p-4 border-b bg-background">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Live Chats
            </h3>
            <Button size="sm" variant="ghost" onClick={() => fetchSessions()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {sessions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No chat sessions</p>
              <p className="text-sm mt-1">New chats will appear here</p>
            </div>
          ) : (
            <div className="divide-y">
              {sessions.map(session => (
                <button
                  key={session.id}
                  className={cn(
                    'w-full p-4 text-left hover:bg-accent/50 transition-colors',
                    selectedSession?.id === session.id && 'bg-accent'
                  )}
                  onClick={() => selectSession(session)}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {getInitials(session.visitor_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate">
                          {session.visitor_name || 'Anonymous Visitor'}
                        </span>
                        <Badge variant="outline" className={cn('text-xs shrink-0', STATUS_STYLES[session.status]?.className)}>
                          {STATUS_STYLES[session.status]?.label || session.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {session.visitor_email || 'No email'}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{session.message_count || 0} messages</span>
                        <span>•</span>
                        <span>
                          {session.last_message_at 
                            ? formatDistanceToNow(new Date(session.last_message_at), { addSuffix: true })
                            : formatDistanceToNow(new Date(session.created_at), { addSuffix: true })
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat View */}
      <div className="flex-1 flex flex-col">
        {!selectedSession ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="font-medium">Select a chat</p>
              <p className="text-sm mt-1">Choose a conversation from the list</p>
            </div>
          </div>
        ) : loadingMessages ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-background">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(selectedSession.visitor_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      {selectedSession.visitor_name || 'Anonymous Visitor'}
                      {selectedSession.chat_mode === 'ai' && (
                        <Badge variant="outline" className="text-xs">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Signal
                        </Badge>
                      )}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {selectedSession.visitor_email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {selectedSession.visitor_email}
                        </span>
                      )}
                      {selectedSession.visitor_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {selectedSession.visitor_phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {selectedSession.source_url && (
                    <a
                      href={selectedSession.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <Globe className="w-4 h-4" />
                      View page
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <Badge variant="outline" className={cn(STATUS_STYLES[selectedSession.status]?.className)}>
                    {STATUS_STYLES[selectedSession.status]?.label || selectedSession.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 bg-muted/30">
              <div className="space-y-4 max-w-2xl mx-auto">
                {(selectedSession.messages || []).map((msg, i) => (
                  <div
                    key={msg.id || i}
                    className={cn(
                      'flex',
                      msg.role === 'visitor' ? 'justify-start' : 'justify-end'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[80%] px-4 py-2 rounded-2xl',
                        msg.role === 'visitor' && 'bg-background border shadow-sm rounded-bl-md',
                        msg.role === 'agent' && 'bg-primary text-primary-foreground rounded-br-md',
                        msg.role === 'ai' && 'bg-purple-500 text-white rounded-br-md',
                        msg.role === 'system' && 'bg-muted text-muted-foreground text-center text-sm w-full max-w-none rounded-lg'
                      )}
                    >
                      {msg.role === 'ai' && (
                        <div className="flex items-center gap-1 mb-1 text-xs opacity-80">
                          <Bot className="w-3 h-3" />
                          AI Response
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <div className={cn(
                        'text-xs mt-1',
                        msg.role === 'visitor' ? 'text-muted-foreground' : 'opacity-70'
                      )}>
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        {msg.role === 'agent' && msg.sender?.name && (
                          <span className="ml-2">• {msg.sender.name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            {selectedSession.status !== 'closed' && (
              <form onSubmit={handleSendMessage} className="p-4 border-t bg-background">
                <div className="flex gap-2 max-w-2xl mx-auto">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your reply..."
                    disabled={sending}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!message.trim() || sending}>
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
