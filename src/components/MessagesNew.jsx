/**
 * MessengerLayout - Full-page Slack/Messenger-style messaging interface
 * Features: Sidebar with conversations, main chat area, glass morphism design
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  MessageCircle,
  Send,
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
  User,
  Users,
  Settings,
  Bell,
  BellOff,
  Pin,
  Archive,
  Trash2,
  Star,
  Filter,
  ChevronDown,
  Image as ImageIcon,
  FileText,
  AtSign,
  Hash
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
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

// Format date separator
function formatDateSeparator(date) {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  
  if (d.toDateString() === now.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

// Get initials from name
function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// Message Bubble Component
function MessageBubble({ message, isOwn, showAvatar = true, isFirst = false }) {
  return (
    <div className={cn(
      "flex gap-3 max-w-[75%] group",
      isOwn ? "ml-auto flex-row-reverse" : "",
      !isFirst && "mt-0.5"
    )}>
      {!isOwn && (
        <div className="w-8 flex-shrink-0">
          {showAvatar && (
            <Avatar className="h-8 w-8">
              <AvatarImage src={message.sender?.avatar} />
              <AvatarFallback className="text-xs bg-[var(--glass-bg)] text-[var(--text-secondary)]">
                {getInitials(message.sender?.name)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}
      
      <div className={cn(
        "flex flex-col",
        isOwn ? "items-end" : "items-start"
      )}>
        {!isOwn && showAvatar && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {message.sender?.name}
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">
              {formatMessageTime(message.created_at || message.createdAt)}
            </span>
          </div>
        )}
        
        <div className="flex items-end gap-2">
          <div className={cn(
            "px-4 py-2.5 text-sm leading-relaxed",
            isOwn 
              ? "bg-[var(--brand-primary)] text-white rounded-2xl rounded-br-lg" 
              : "bg-[var(--glass-bg)] text-[var(--text-primary)] rounded-2xl rounded-bl-lg border border-[var(--glass-border)]"
          )}>
            {message.content}
          </div>
          
          {/* Message actions on hover */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-[var(--text-tertiary)]">
                    <Smile className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>React</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {isOwn && (
          <div className="flex items-center gap-1 mt-1 px-1">
            <span className="text-[10px] text-[var(--text-tertiary)]">
              {formatMessageTime(message.created_at || message.createdAt)}
            </span>
            <span className="text-[var(--text-tertiary)]">
              {message.read_at || message.readAt ? (
                <CheckCheck className="h-3 w-3 text-[var(--brand-primary)]" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// Date Separator
function DateSeparator({ date }) {
  return (
    <div className="flex items-center justify-center my-6">
      <div className="flex-1 border-t border-[var(--glass-border)]" />
      <span className="px-4 text-xs font-medium text-[var(--text-tertiary)] bg-[var(--surface-primary)]">
        {formatDateSeparator(date)}
      </span>
      <div className="flex-1 border-t border-[var(--glass-border)]" />
    </div>
  )
}

// Conversation List Item
function ConversationItem({ conversation, isActive, onClick, user }) {
  const hasUnread = conversation.unreadCount > 0
  const isGroup = conversation.type === 'group'
  const otherParticipant = conversation.recipient?.id === user?.id 
    ? conversation.sender 
    : conversation.recipient

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
        "hover:bg-[var(--glass-bg-hover)]",
        isActive && "bg-[var(--brand-primary)]/10"
      )}
    >
      <div className="relative flex-shrink-0">
        {isGroup ? (
          <div className="w-12 h-12 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-center">
            <Users className="h-5 w-5 text-[var(--text-secondary)]" />
          </div>
        ) : (
          <Avatar className="h-12 w-12">
            <AvatarImage src={otherParticipant?.avatar || conversation.contact?.avatar} />
            <AvatarFallback className="bg-gradient-to-br from-teal-500 to-green-500 text-white">
              {getInitials(otherParticipant?.name || conversation.contact?.name || conversation.sender_name || conversation.recipient_name)}
            </AvatarFallback>
          </Avatar>
        )}
        {conversation.online && (
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[var(--surface-primary)]" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={cn(
            "text-sm truncate",
            hasUnread ? "font-semibold text-[var(--text-primary)]" : "font-medium text-[var(--text-primary)]"
          )}>
            {otherParticipant?.name || conversation.contact?.name || conversation.sender_name || conversation.recipient_name || 'Unknown'}
          </span>
          <span className={cn(
            "text-[11px] flex-shrink-0",
            hasUnread ? "text-[var(--brand-primary)] font-medium" : "text-[var(--text-tertiary)]"
          )}>
            {formatRelativeTime(conversation.lastMessageAt || conversation.created_at || conversation.createdAt)}
          </span>
        </div>
        
        <div className="flex items-center justify-between gap-2">
          <p className={cn(
            "text-xs truncate",
            hasUnread ? "text-[var(--text-secondary)] font-medium" : "text-[var(--text-tertiary)]"
          )}>
            {conversation.lastMessage || conversation.content || 'Start a conversation'}
          </p>
          {hasUnread && (
            <Badge className="h-5 min-w-5 px-1.5 text-[10px] bg-[var(--brand-primary)] text-white border-0 flex-shrink-0">
              {conversation.unreadCount}
            </Badge>
          )}
          {conversation.pinned && !hasUnread && (
            <Pin className="h-3 w-3 text-[var(--text-tertiary)] flex-shrink-0" />
          )}
        </div>
      </div>
    </button>
  )
}

// New Conversation Modal/Panel
function NewConversationPanel({ contacts, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  
  const filteredContacts = contacts.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      {/* Dark backdrop overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10"
        onClick={onClose}
      />
      {/* Modal panel */}
      <div className="absolute inset-2 bg-[var(--surface-primary)] backdrop-blur-xl border border-[var(--glass-border)] rounded-xl shadow-2xl z-20 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-[var(--glass-border)]">
        <h3 className="font-semibold text-[var(--text-primary)]">New Conversation</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>
      
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <Input 
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-[var(--glass-bg-inset)] border-[var(--glass-border)]"
            autoFocus
          />
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="px-2 pb-4">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-tertiary)]">
              <User className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No contacts found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredContacts.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => onSelect(contact)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--glass-bg-hover)] transition-colors text-left"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={contact.avatar} />
                    <AvatarFallback className="bg-gradient-to-br from-teal-500 to-green-500 text-white text-sm">
                      {getInitials(contact.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{contact.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{contact.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
      </div>
    </>
  )
}

// Empty State
function EmptyState({ onNewMessage }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-center mb-6">
        <MessageCircle className="h-10 w-10 text-[var(--text-tertiary)]" />
      </div>
      <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
        Your Messages
      </h3>
      <p className="text-[var(--text-tertiary)] max-w-sm mb-6">
        Send private messages to team members and clients. Start a new conversation to get started.
      </p>
      <Button onClick={onNewMessage} className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]">
        <Plus className="h-4 w-4 mr-2" />
        New Message
      </Button>
    </div>
  )
}

// Chat Area Component
function ChatArea({ 
  conversation, 
  messages, 
  onSendMessage, 
  onBack, 
  isLoading,
  currentUserId 
}) {
  const [messageText, setMessageText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [messageText])

  const handleSend = async () => {
    if (!messageText.trim() || isSending) return
    
    setIsSending(true)
    await onSendMessage(messageText.trim())
    setMessageText('')
    setIsSending(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const otherParticipant = conversation?.recipient?.id === currentUserId 
    ? conversation?.sender 
    : conversation?.recipient

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.created_at || message.createdAt).toDateString()
    if (!groups[date]) groups[date] = []
    groups[date].push(message)
    return groups
  }, {})

  if (!conversation) {
    return (
      <EmptyState onNewMessage={() => {}} />
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--glass-border)] bg-[var(--glass-bg)]/30">
        <div className="flex items-center gap-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={otherParticipant?.avatar || conversation.contact?.avatar} />
            <AvatarFallback className="bg-gradient-to-br from-teal-500 to-green-500 text-white">
              {getInitials(otherParticipant?.name || conversation.contact?.name || conversation.sender_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">
              {otherParticipant?.name || conversation.contact?.name || conversation.sender_name || 'Unknown'}
            </h3>
            <p className="text-xs text-[var(--text-tertiary)]">
              {conversation.online ? (
                <span className="text-green-400">Active now</span>
              ) : (
                conversation.subject || 'Direct message'
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-[var(--text-tertiary)]">
                  <Phone className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Call</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-[var(--text-tertiary)]">
                  <Video className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Video call</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-[var(--text-tertiary)]">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <Pin className="h-4 w-4 mr-2" />
                Pin conversation
              </DropdownMenuItem>
              <DropdownMenuItem>
                <BellOff className="h-4 w-4 mr-2" />
                Mute notifications
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-500">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-6">
        <div className="py-6 space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-primary)]" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--text-tertiary)]">
                No messages yet. Send a message to start the conversation.
              </p>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date}>
                <DateSeparator date={date} />
                {dateMessages.map((msg, idx) => {
                  const isOwn = msg.sender_id === currentUserId || msg.senderId === currentUserId
                  const prevMsg = dateMessages[idx - 1]
                  const showAvatar = !prevMsg || 
                    (prevMsg.sender_id || prevMsg.senderId) !== (msg.sender_id || msg.senderId)
                  const isFirst = showAvatar
                  
                  return (
                    <MessageBubble 
                      key={msg.id} 
                      message={msg} 
                      isOwn={isOwn}
                      showAvatar={showAvatar}
                      isFirst={isFirst}
                    />
                  )
                })}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="px-6 py-4 border-t border-[var(--glass-border)] bg-[var(--glass-bg)]/30">
        <div className="flex items-end gap-3">
          {/* Attachment buttons */}
          <div className="flex items-center gap-1 pb-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[var(--text-tertiary)]">
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add attachment</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Text input */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              placeholder="Type a message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              className="min-h-[44px] max-h-[120px] py-3 pr-12 resize-none bg-[var(--glass-bg)] border-[var(--glass-border)] rounded-2xl"
            />
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-[var(--text-tertiary)]"
            >
              <Smile className="h-5 w-5" />
            </Button>
          </div>

          {/* Send button */}
          <Button 
            onClick={handleSend}
            disabled={!messageText.trim() || isSending}
            className="h-11 w-11 rounded-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] p-0 flex-shrink-0"
          >
            {isSending ? (
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

// Main Component
export default function Messages() {
  const { user } = useAuthStore()
  const { 
    messages,
    conversations,
    contacts,
    unreadCount,
    fetchMessages,
    fetchConversations,
    fetchContacts,
    fetchMessage,
    sendMessage,
    replyToMessage,
    isLoading 
  } = useMessagesStore()

  const [activeConversation, setActiveConversation] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all') // 'all' | 'unread' | 'starred'
  const hasFetchedRef = useRef(false)

  // Fetch initial data
  useEffect(() => {
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    
    fetchConversations()
    fetchContacts()
    fetchMessages()
  }, [])

  // Use messages as conversations if conversations are empty
  const displayConversations = conversations.length > 0 ? conversations : messages

  // Filter conversations
  const filteredConversations = displayConversations.filter(conv => {
    // Search filter
    if (searchTerm) {
      const name = conv.sender?.name || conv.recipient?.name || conv.contact?.name || ''
      const subject = conv.subject || ''
      const content = conv.content || conv.lastMessage || ''
      const searchLower = searchTerm.toLowerCase()
      if (!name.toLowerCase().includes(searchLower) && 
          !subject.toLowerCase().includes(searchLower) &&
          !content.toLowerCase().includes(searchLower)) {
        return false
      }
    }
    
    // Type filter
    if (filterType === 'unread' && !conv.unreadCount) return false
    if (filterType === 'starred' && !conv.starred) return false
    
    return true
  })

  const handleSelectConversation = async (conversation) => {
    setActiveConversation(conversation)
    setShowNewConversation(false)
    
    // Fetch thread messages
    if (conversation.id) {
      const result = await fetchMessage(conversation.id)
      if (result.success && result.data?.thread) {
        setChatMessages(Array.isArray(result.data.thread) ? result.data.thread : [result.data.thread])
      } else {
        // If it's a single message, show it
        setChatMessages([conversation])
      }
    }
  }

  const handleStartNewConversation = (contact) => {
    setActiveConversation({
      id: null,
      contact: contact,
      recipient: contact,
      lastMessage: null,
      isNew: true
    })
    setChatMessages([])
    setShowNewConversation(false)
  }

  const handleSendMessage = async (content) => {
    if (!activeConversation) return
    
    const recipientId = activeConversation.contact?.id || 
                        activeConversation.recipient?.id ||
                        (activeConversation.sender?.id !== user?.id ? activeConversation.sender?.id : activeConversation.recipient?.id)
    
    if (!recipientId) {
      console.error('No recipient found')
      return
    }
    
    // Optimistic update
    const tempMessage = {
      id: `temp-${Date.now()}`,
      content,
      sender_id: user?.id,
      sender: { id: user?.id, name: user?.name, avatar: user?.avatar },
      created_at: new Date().toISOString()
    }
    setChatMessages(prev => [...prev, tempMessage])
    
    // Send to server
    const messageData = {
      recipientId,
      subject: activeConversation.subject || 'New message',
      content,
      parentId: activeConversation.isNew ? null : activeConversation.id
    }
    
    const result = await sendMessage(messageData)
    
    if (result.success) {
      // Update conversation
      if (activeConversation.isNew) {
        setActiveConversation(prev => ({ ...prev, isNew: false, id: result.data?.message?.id }))
      }
      fetchConversations()
      fetchMessages()
    }
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex rounded-2xl overflow-hidden border border-[var(--glass-border)] bg-[var(--surface-primary)]">
      {/* Sidebar */}
      <div className="w-80 lg:w-96 flex-shrink-0 border-r border-[var(--glass-border)] flex flex-col bg-[var(--glass-bg)]/30 relative">
        {/* Header */}
        <div className="p-4 border-b border-[var(--glass-border)]">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Messages</h1>
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => setShowNewConversation(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>New message</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setFilterType('all')}>
                    All messages
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType('unread')}>
                    Unread only
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType('starred')}>
                    Starred
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
            <Input 
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[var(--glass-bg-inset)] border-[var(--glass-border)]"
            />
          </div>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {isLoading && filteredConversations.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-primary)]" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-[var(--text-tertiary)] opacity-30" />
                <p className="text-sm text-[var(--text-tertiary)]">
                  {searchTerm ? 'No messages found' : 'No conversations yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredConversations.map(conv => (
                  <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isActive={activeConversation?.id === conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    user={user}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* New Conversation Panel */}
        {showNewConversation && (
          <NewConversationPanel
            contacts={contacts}
            onSelect={handleStartNewConversation}
            onClose={() => setShowNewConversation(false)}
          />
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <ChatArea
            conversation={activeConversation}
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            currentUserId={user?.id}
          />
        ) : (
          <EmptyState onNewMessage={() => setShowNewConversation(true)} />
        )}
      </div>
    </div>
  )
}
