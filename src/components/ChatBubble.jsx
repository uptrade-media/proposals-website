/**
 * ChatBubble - Floating chat widget for persistent messaging access
 * Slack/Messenger-inspired design with glass morphism
 */
import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import {
  MessageCircle,
  X,
  Send,
  Minimize2,
  Maximize2,
  ChevronLeft,
  Search,
  Plus,
  Loader2,
  Check,
  CheckCheck,
  Paperclip,
  Smile,
  MoreVertical,
  Phone,
  Video,
  User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import ContactAvatar from '@/components/ui/ContactAvatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import useMessagesStore from '@/lib/messages-store'
import useAuthStore from '@/lib/auth-store'

// Format relative time
function formatRelativeTime(date) {
  if (!date) return ''
  const now = new Date()
  const d = new Date(date)
  const diff = now - d
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Format time for messages
function formatMessageTime(date) {
  if (!date) return ''
  return new Date(date).toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })
}

// Message Bubble Component
function MessageBubble({ message, isOwn, showAvatar = true }) {
  return (
    <div className={cn(
      "flex gap-2 max-w-[85%]",
      isOwn ? "ml-auto flex-row-reverse" : ""
    )}>
      {showAvatar && !isOwn && (
        <ContactAvatar 
          contact={message.sender}
          size="sm"
          showBadge={false}
          status={message.sender?.status}
          isLiveChatActive={message.sender?.contact_type === 'visitor'}
          className="flex-shrink-0"
        />
      )}
      
      <div className={cn(
        "flex flex-col gap-1",
        isOwn ? "items-end" : "items-start"
      )}>
        {!isOwn && showAvatar && (
          <span className="text-xs text-[var(--text-tertiary)] px-1">
            {message.sender?.name}
          </span>
        )}
        <div className={cn(
          "px-3 py-2 rounded-2xl text-sm",
          isOwn 
            ? "bg-[var(--brand-primary)] text-white rounded-br-md" 
            : "bg-[var(--glass-bg)] text-[var(--text-primary)] rounded-bl-md border border-[var(--glass-border)]"
        )}>
          {message.content}
        </div>
        <div className={cn(
          "flex items-center gap-1 px-1",
          isOwn ? "flex-row-reverse" : ""
        )}>
          <span className="text-[10px] text-[var(--text-tertiary)]">
            {formatMessageTime(message.created_at || message.createdAt)}
          </span>
          {isOwn && (
            <span className="text-[var(--brand-primary)]">
              {message.read_at || message.readAt ? (
                <CheckCheck className="h-3 w-3" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// Conversation List Item
function ConversationItem({ conversation, isActive, onClick }) {
  const hasUnread = conversation.unreadCount > 0
  const isEcho = conversation.is_ai || conversation.is_echo

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
        "hover:bg-[var(--glass-bg-hover)]",
        isActive && "bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/30",
        isEcho && "border border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50/30 to-transparent dark:from-emerald-950/20"
      )}
    >
      <ContactAvatar
        contact={isEcho ? { name: 'Echo', contact_type: 'ai', is_ai: true } : conversation.contact}
        type={isEcho ? 'echo' : undefined}
        size="md"
        status={conversation.online ? 'online' : 'offline'}
        isLiveChatActive={conversation.contact?.contact_type === 'visitor'}
        showBadge
        className="shrink-0"
      />
      
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "text-sm truncate",
              hasUnread ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
            )}>
              {isEcho ? 'Echo' : (conversation.contact?.name || conversation.name)}
            </span>
            {isEcho && (
              <Badge className="text-[9px] px-1 py-0 h-3.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                AI
              </Badge>
            )}
          </div>
          <span className="text-[10px] text-[var(--text-tertiary)]">
            {isEcho ? 'Always on' : formatRelativeTime(conversation.lastMessageAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={cn(
            "text-xs truncate",
            hasUnread ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"
          )}>
            {conversation.lastMessage || (isEcho ? 'Your AI teammate' : 'No messages yet')}
          </p>
          {hasUnread && (
            <Badge className="h-5 min-w-5 px-1.5 text-[10px] bg-[var(--brand-primary)] text-white border-0">
              {conversation.unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </button>
  )
}

// New Conversation Dialog (inline)
function NewConversationView({ contacts, onSelect, onBack }) {
  const [search, setSearch] = useState('')
  
  const filteredContacts = contacts.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b border-[var(--glass-border)]">
        <Button variant="ghost" size="sm" className="p-1" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h3 className="font-semibold text-[var(--text-primary)]">New Message</h3>
      </div>
      
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <Input 
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[var(--glass-bg-inset)] border-[var(--glass-border)]"
          />
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredContacts.map(contact => (
            <button
              key={contact.id}
              onClick={() => onSelect(contact)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--glass-bg-hover)] transition-colors"
            >
              <ContactAvatar contact={contact} size="md" showBadge={false} />
              <div className="text-left">
                <p className="text-sm font-medium text-[var(--text-primary)]">{contact.name}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{contact.email}</p>
              </div>
            </button>
          ))}
          {filteredContacts.length === 0 && (
            <div className="text-center py-8 text-[var(--text-tertiary)]">
              <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No contacts found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// Active Chat View
function ActiveChatView({ conversation, messages, onBack, onSend, isLoading, currentUserId }) {
  const [message, setMessage] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const scrollAreaRef = useRef(null)
  
  const isEcho = conversation?.is_ai || conversation?.is_echo

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when conversation opens
  useEffect(() => {
    inputRef.current?.focus()
  }, [conversation?.id])

  const handleSend = () => {
    if (!message.trim()) return
    onSend(message.trim())
    setMessage('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className={cn(
        "flex items-center gap-3 p-3 border-b border-[var(--glass-border)]",
        isEcho ? "bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-950/30" : "bg-[var(--glass-bg)]/50"
      )}>
        <Button variant="ghost" size="sm" className="p-1 lg:hidden" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <ContactAvatar
          contact={isEcho ? { name: 'Echo', contact_type: 'ai', is_ai: true } : conversation?.contact}
          type={isEcho ? 'echo' : undefined}
          size="md"
          status={isEcho ? 'online' : conversation?.online ? 'online' : 'offline'}
          isLiveChatActive={conversation?.contact?.contact_type === 'visitor'}
          showBadge
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-sm text-[var(--text-primary)] truncate">
              {isEcho ? 'Echo' : conversation?.contact?.name}
            </h3>
            {isEcho && (
              <Badge className="text-[9px] px-1 py-0 h-3.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                AI
              </Badge>
            )}
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">
            {isEcho ? (
              <span className="text-emerald-500">Always online</span>
            ) : conversation?.online ? (
              <span className="text-green-400">Online</span>
            ) : (
              `Last seen ${formatRelativeTime(conversation?.lastSeen)}`
            )}
          </p>
        </div>
        
        {!isEcho && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="p-2 text-[var(--text-tertiary)]">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2 text-[var(--text-tertiary)]">
              <Video className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2 text-[var(--text-tertiary)]">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Messages Area - with proper overflow handling */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-tertiary)]">
              {isEcho ? (
                <>
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Hey! I'm Echo</p>
                  <p className="text-xs mt-1">Your AI teammate. Ask me anything about SEO, projects, or data.</p>
                </>
              ) : (
                <>
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs">Send a message to start the conversation</p>
                </>
              )}
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isOwn = msg.sender_id === currentUserId || msg.senderId === currentUserId
              const prevMsg = messages[idx - 1]
              const showAvatar = !prevMsg || 
                (prevMsg.sender_id || prevMsg.senderId) !== (msg.sender_id || msg.senderId)
              
              return (
                <MessageBubble 
                  key={msg.id} 
                  message={msg} 
                  isOwn={isOwn}
                  showAvatar={showAvatar}
                />
              )
            })
          )}
          <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Message Input */}
      <div className="p-3 border-t border-[var(--glass-border)] bg-[var(--glass-bg)]/30">
        <div className="flex items-end gap-2">
          <Button variant="ghost" size="sm" className="p-2 text-[var(--text-tertiary)] flex-shrink-0">
            <Paperclip className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pr-10 bg-[var(--glass-bg-inset)] border-[var(--glass-border)] rounded-full"
            />
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-[var(--text-tertiary)]"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>
          
          <Button 
            onClick={handleSend}
            disabled={!message.trim() || isLoading}
            className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white rounded-full p-2 h-10 w-10 flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Main ChatBubble Component
export default function ChatBubble({ hidden = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [view, setView] = useState('list') // 'list' | 'chat' | 'new'
  const [activeConversation, setActiveConversation] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  
  const { user } = useAuthStore()
  const { 
    conversations, 
    contacts,
    unreadCount,
    fetchConversations,
    fetchContacts,
    fetchMessage,
    sendMessage,
    isLoading,
    // Echo support
    echoContact,
    echoMessages,
    fetchEchoContact,
    fetchEchoMessages,
    sendToEcho,
    // Realtime support
    subscribeToMessages,
    unsubscribeFromMessages,
    realtimeConnected,
    // Prefetch support
    prefetchAll,
    hasPrefetched,
    // Live chat handoffs
    pendingHandoffs,
    claimHandoff,
    dismissHandoff
  } = useMessagesStore()

  // Note: prefetchAll and subscribeToMessages are now called in MainLayout on app mount
  // This ensures messaging is ready before the widget is ever opened
  
  // Create Echo conversation entry (MUST be before useEffect that references it)
  const echoConversation = echoContact ? {
    id: echoContact.id,
    contact: echoContact,
    is_echo: true,
    is_ai: true,
    online: true,
    lastMessage: 'Your AI teammate - ask me anything!',
    lastMessageAt: new Date().toISOString()
  } : null
  
  // Listen for external requests to open with Echo
  useEffect(() => {
    const handleOpenWithEcho = (event) => {
      setIsOpen(true)
      // Select Echo conversation
      if (echoConversation) {
        setActiveConversation(echoConversation)
        setView('chat')
        // Pre-fill message if provided
        if (event.detail?.message) {
          // Store initial message to send after Echo is loaded
          setTimeout(() => {
            const input = document.querySelector('[data-echo-input]')
            if (input) {
              input.value = event.detail.message
              input.focus()
            }
          }, 100)
        }
      }
    }
    
    window.addEventListener('messages:openWithEcho', handleOpenWithEcho)
    return () => window.removeEventListener('messages:openWithEcho', handleOpenWithEcho)
  }, [echoConversation])
  
  // Refresh data when opened (in case of stale cache)
  useEffect(() => {
    if (isOpen && hasPrefetched) {
      // Soft refresh in background - data is already displayed from cache
      fetchConversations()
    }
  }, [isOpen])

  // Update chat messages from echoMessages for Echo conversations
  useEffect(() => {
    if (activeConversation?.is_echo && echoMessages.length > 0) {
      setChatMessages(echoMessages)
    }
  }, [echoMessages, activeConversation?.is_echo])

  // Transform messages to conversations format - Echo first
  const displayConversations = [
    ...(echoConversation ? [echoConversation] : []),
    ...conversations.filter(c => !c.is_ai && !c.is_echo)
  ]

  const handleOpenConversation = async (conversation) => {
    setActiveConversation(conversation)
    setView('chat')
    
    // Handle Echo conversation
    if (conversation.is_echo || conversation.is_ai) {
      await fetchEchoMessages()
      setChatMessages(echoMessages)
      return
    }
    
    // Fetch messages for regular conversations
    if (conversation.id) {
      const result = await fetchMessage(conversation.id)
      if (result.success && result.data?.thread) {
        setChatMessages(result.data.thread)
      }
    }
  }

  const handleStartNewConversation = (contact) => {
    setActiveConversation({
      id: null,
      contact: contact,
      lastMessage: null,
      lastMessageAt: null
    })
    setChatMessages([])
    setView('chat')
  }

  const handleSendMessage = async (content) => {
    if (!activeConversation) return
    
    // Optimistic update
    const tempMessage = {
      id: `temp-${Date.now()}`,
      content,
      sender_id: user?.id,
      sender: { name: user?.name, avatar: user?.avatar },
      created_at: new Date().toISOString()
    }
    setChatMessages(prev => [...prev, tempMessage])
    
    // Use Echo-specific method for AI conversations
    if (activeConversation.is_echo || activeConversation.is_ai) {
      const result = await sendToEcho({ content })
      if (result.success) {
        fetchConversations()
      }
      return
    }
    
    // Send to server for regular conversations
    const result = await sendMessage({
      recipientId: activeConversation.contact?.id,
      subject: activeConversation.subject || 'Chat message',
      content,
      parentId: activeConversation.id
    })
    
    if (result.success) {
      // Refresh conversations
      fetchConversations()
    }
  }

  const handleBack = () => {
    setView('list')
    setActiveConversation(null)
    setChatMessages([])
  }

  // Panel dimensions
  const panelClasses = cn(
    "fixed z-50 transition-all duration-300 ease-out",
    "bg-[var(--surface-primary)] backdrop-blur-xl",
    "border border-[var(--glass-border)] shadow-2xl",
    "flex flex-col overflow-hidden",
    isExpanded 
      ? "bottom-4 right-4 w-[420px] h-[600px] rounded-2xl"
      : "bottom-4 right-4 w-[380px] h-[500px] rounded-2xl"
  )

  // If hidden, render nothing but keep the component mounted for realtime
  if (hidden) {
    return null
  }
  
  // Calculate badge display - prioritize live chat handoffs
  const hasLiveHandoffs = pendingHandoffs.length > 0
  const totalBadgeCount = unreadCount + pendingHandoffs.length

  return (
    <>
      {/* Floating Bubble Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            "fixed bottom-6 right-6 z-50",
            "w-14 h-14 rounded-full",
            hasLiveHandoffs 
              ? "bg-amber-500 hover:bg-amber-600 animate-pulse"
              : "bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]",
            "text-white shadow-lg hover:shadow-xl",
            "flex items-center justify-center",
            "transition-all duration-200 hover:scale-105",
            "focus:outline-none focus:ring-2 focus:ring-offset-2",
            hasLiveHandoffs 
              ? "focus:ring-amber-500" 
              : "focus:ring-[var(--brand-primary)]"
          )}
        >
          <MessageCircle className="h-6 w-6" />
          {totalBadgeCount > 0 && (
            <span className={cn(
              "absolute -top-1 -right-1 w-5 h-5 text-white text-xs font-bold rounded-full flex items-center justify-center",
              hasLiveHandoffs ? "bg-red-500 animate-bounce" : "bg-red-500"
            )}>
              {totalBadgeCount > 9 ? '9+' : totalBadgeCount}
            </span>
          )}
          {/* Live visitor indicator */}
          {hasLiveHandoffs && (
            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full">
              Live Visitor
            </span>
          )}
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className={panelClasses}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--glass-border)] bg-[var(--glass-bg)]">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                hasLiveHandoffs 
                  ? "bg-amber-500/20" 
                  : "bg-[var(--brand-primary)]/10"
              )}>
                <MessageCircle className={cn(
                  "h-5 w-5",
                  hasLiveHandoffs 
                    ? "text-amber-500" 
                    : "text-[var(--brand-primary)]"
                )} />
              </div>
              <div>
                <h2 className="font-semibold text-[var(--text-primary)]">Messages</h2>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {hasLiveHandoffs 
                    ? <span className="text-amber-500 font-medium">{pendingHandoffs.length} live visitor{pendingHandoffs.length > 1 ? 's' : ''} waiting</span>
                    : unreadCount > 0 
                      ? `${unreadCount} unread` 
                      : 'All caught up'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-2 text-[var(--text-tertiary)]"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-2 text-[var(--text-tertiary)]"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {view === 'list' && (
              <div className="flex flex-col h-full">
                {/* Pending Handoffs Alert */}
                {pendingHandoffs.length > 0 && (
                  <div className="p-2 border-b border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
                    <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      Live Visitors Need Response
                    </div>
                    <div className="space-y-1">
                      {pendingHandoffs.map(session => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 rounded-lg border border-amber-200 dark:border-amber-800"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {session.visitor_name || 'Website Visitor'}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {session.ai_summary || 'Requested human assistance'}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="ml-2 bg-amber-500 hover:bg-amber-600 text-white"
                            onClick={() => {
                              claimHandoff(session.id)
                              // Open the chat with this session
                              setActiveConversation({
                                id: session.id,
                                is_live_chat: true,
                                contact: {
                                  name: session.visitor_name || 'Website Visitor',
                                  email: session.visitor_email
                                }
                              })
                              setView('chat')
                            }}
                          >
                            Respond
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Search & New Message */}
                <div className="p-3 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
                    <Input 
                      placeholder="Search messages..."
                      className="pl-9 bg-[var(--glass-bg-inset)] border-[var(--glass-border)]"
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2 text-[var(--text-secondary)]"
                    onClick={() => setView('new')}
                  >
                    <Plus className="h-4 w-4" />
                    New Message
                  </Button>
                </div>

                {/* Conversations List */}
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {isLoading && displayConversations.length === 0 ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-primary)]" />
                      </div>
                    ) : displayConversations.length === 0 ? (
                      <div className="text-center py-12 text-[var(--text-tertiary)]">
                        <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No conversations yet</p>
                        <p className="text-xs">Start a new message to begin</p>
                      </div>
                    ) : (
                      displayConversations.map(conv => (
                        <ConversationItem
                          key={conv.id}
                          conversation={conv}
                          isActive={activeConversation?.id === conv.id}
                          onClick={() => handleOpenConversation(conv)}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            {view === 'new' && (
              <NewConversationView
                contacts={contacts}
                onSelect={handleStartNewConversation}
                onBack={() => setView('list')}
              />
            )}

            {view === 'chat' && (
              <ActiveChatView
                conversation={activeConversation}
                messages={chatMessages}
                onBack={handleBack}
                onSend={handleSendMessage}
                isLoading={isLoading}
                currentUserId={user?.id}
              />
            )}
          </div>
        </div>
      )}
    </>
  )
}
