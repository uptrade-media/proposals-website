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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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

// Get initials from name
function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// Message Bubble Component
function MessageBubble({ message, isOwn, showAvatar = true }) {
  return (
    <div className={cn(
      "flex gap-2 max-w-[85%]",
      isOwn ? "ml-auto flex-row-reverse" : ""
    )}>
      {showAvatar && !isOwn && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={message.sender?.avatar} />
          <AvatarFallback className="text-xs bg-[var(--glass-bg)] text-[var(--text-secondary)]">
            {getInitials(message.sender?.name)}
          </AvatarFallback>
        </Avatar>
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

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
        "hover:bg-[var(--glass-bg-hover)]",
        isActive && "bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/30"
      )}
    >
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={conversation.contact?.avatar} />
          <AvatarFallback className="bg-gradient-to-br from-teal-500 to-green-500 text-white">
            {getInitials(conversation.contact?.name)}
          </AvatarFallback>
        </Avatar>
        {conversation.online && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--surface-primary)]" />
        )}
      </div>
      
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between">
          <span className={cn(
            "text-sm truncate",
            hasUnread ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
          )}>
            {conversation.contact?.name || conversation.name}
          </span>
          <span className="text-[10px] text-[var(--text-tertiary)]">
            {formatRelativeTime(conversation.lastMessageAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={cn(
            "text-xs truncate",
            hasUnread ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"
          )}>
            {conversation.lastMessage || 'No messages yet'}
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
              <Avatar className="h-10 w-10">
                <AvatarImage src={contact.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-teal-500 to-green-500 text-white">
                  {getInitials(contact.name)}
                </AvatarFallback>
              </Avatar>
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
      <div className="flex items-center gap-3 p-3 border-b border-[var(--glass-border)] bg-[var(--glass-bg)]/50">
        <Button variant="ghost" size="sm" className="p-1 lg:hidden" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <Avatar className="h-9 w-9">
          <AvatarImage src={conversation?.contact?.avatar} />
          <AvatarFallback className="bg-[var(--glass-bg)] text-[var(--text-secondary)]">
            {getInitials(conversation?.contact?.name)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-[var(--text-primary)] truncate">
            {conversation?.contact?.name}
          </h3>
          <p className="text-xs text-[var(--text-tertiary)]">
            {conversation?.online ? (
              <span className="text-green-400">Online</span>
            ) : (
              `Last seen ${formatRelativeTime(conversation?.lastSeen)}`
            )}
          </p>
        </div>
        
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
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-tertiary)]">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs">Send a message to start the conversation</p>
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
export default function ChatBubble() {
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
    isLoading 
  } = useMessagesStore()

  // Fetch data when opened
  useEffect(() => {
    if (isOpen) {
      fetchConversations()
      fetchContacts()
    }
  }, [isOpen])

  // Transform messages to conversations format if not available
  const displayConversations = conversations.length > 0 ? conversations : []

  const handleOpenConversation = async (conversation) => {
    setActiveConversation(conversation)
    setView('chat')
    
    // Fetch messages for this conversation
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
    
    // Send to server
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

  return (
    <>
      {/* Floating Bubble Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            "fixed bottom-6 right-6 z-50",
            "w-14 h-14 rounded-full",
            "bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]",
            "text-white shadow-lg hover:shadow-xl",
            "flex items-center justify-center",
            "transition-all duration-200 hover:scale-105",
            "focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-2"
          )}
        >
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
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
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)]/10 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-[var(--brand-primary)]" />
              </div>
              <div>
                <h2 className="font-semibold text-[var(--text-primary)]">Messages</h2>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
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
