/**
 * Messages - Full-page Slack/Messenger-style messaging interface
 * Features: Sidebar with conversations, main chat area, glass morphism design, file attachments, emoji picker
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import EmojiPicker from 'emoji-picker-react'
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
  Hash,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import ContactAvatar from '@/components/ui/ContactAvatar'
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
import { TypingIndicator } from '@/components/messages/shared'
import useMessagesStore from '@/lib/messages-store'
import useAuthStore from '@/lib/auth-store'
import useFilesStore from '@/lib/files-store'
import usePageContextStore from '@/lib/page-context-store'

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

// Message Bubble Component - Liquid Glass Design
function MessageBubble({ message, isOwn, showAvatar = true, isFirst = false }) {
  const isPending = message.status === 'sending'
  const isFailed = message.status === 'failed'
  
  return (
    <div className={cn(
      "flex gap-3 max-w-[80%] group",
      isOwn ? "ml-auto flex-row-reverse" : "",
      !isFirst && "mt-1",
      isPending && "opacity-70"
    )}>
      {!isOwn && (
        <div className="w-9 flex-shrink-0">
          {showAvatar && (
            <Avatar className="h-9 w-9 ring-2 ring-white/10 shadow-lg">
              <AvatarImage src={message.sender?.avatar} />
              <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-[var(--brand-primary)]/20 to-[var(--brand-primary)]/5 text-[var(--brand-primary)]">
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
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {message.sender?.name}
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)]">
              {formatMessageTime(message.created_at || message.createdAt)}
            </span>
          </div>
        )}
        
        <div className="flex items-end gap-2">
          <div className={cn(
            "px-4 py-3 text-sm leading-relaxed shadow-md transition-all duration-200",
            isOwn 
              ? isFailed 
                ? "bg-gradient-to-br from-red-500 to-red-600 text-white rounded-2xl rounded-br-md shadow-red-500/20"
                : "bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-hover)] text-white rounded-2xl rounded-br-md shadow-[var(--brand-primary)]/20" 
              : "bg-[var(--glass-bg)]/80 backdrop-blur-sm text-[var(--text-primary)] rounded-2xl rounded-bl-md ring-1 ring-white/10 shadow-black/5"
          )}>
            {message.content}
          </div>
          
          {/* Message actions on hover */}
          <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-0.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 transition-colors">
                    <Smile className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-primary)]">React</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {isOwn && (
          <div className="flex items-center gap-1.5 mt-1.5 px-1">
            <span className="text-[11px] text-[var(--text-tertiary)]">
              {formatMessageTime(message.created_at || message.createdAt)}
            </span>
            <span className="text-[var(--text-tertiary)]">
              {isFailed ? (
                <span className="text-[11px] text-red-400 font-medium">Failed</span>
              ) : isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--text-tertiary)]" />
              ) : message.read_at || message.readAt ? (
                <CheckCheck className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// Date Separator - Liquid Glass Design
function DateSeparator({ date }) {
  return (
    <div className="flex items-center justify-center my-8">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[var(--glass-border)] to-transparent" />
      <span className="px-4 py-1.5 text-[11px] font-medium tracking-wide text-[var(--text-tertiary)] bg-[var(--glass-bg)]/50 backdrop-blur-sm rounded-full ring-1 ring-white/5">
        {formatDateSeparator(date)}
      </span>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[var(--glass-border)] to-transparent" />
    </div>
  )
}

// Conversation List Item - Sleek Liquid Glass Design
function ConversationItem({ conversation, isActive, onClick, user }) {
  const hasUnread = conversation.unreadCount > 0
  const isGroup = conversation.type === 'group'
  const isEcho = conversation.is_ai || conversation.is_echo
  const otherParticipant = conversation.recipient?.id === user?.id 
    ? conversation.sender 
    : conversation.recipient

  // Get display name - prioritize Echo
  const displayName = isEcho 
    ? 'Echo' 
    : (otherParticipant?.name || conversation.contact?.name || conversation.sender_name || conversation.recipient_name || 'Unknown')

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 text-left group",
        "hover:bg-white/5 hover:shadow-lg hover:shadow-black/5",
        isActive && "bg-gradient-to-r from-[var(--brand-primary)]/15 to-[var(--brand-primary)]/5 ring-1 ring-[var(--brand-primary)]/30 shadow-md shadow-[var(--brand-primary)]/10",
        isEcho && !isActive && "bg-gradient-to-r from-emerald-500/10 to-transparent ring-1 ring-emerald-500/20"
      )}
    >
      <div className="relative flex-shrink-0">
        {isGroup ? (
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[var(--glass-bg)] to-[var(--glass-bg-hover)] border border-[var(--glass-border)] flex items-center justify-center shadow-inner">
            <Users className="h-5 w-5 text-[var(--text-secondary)]" />
          </div>
        ) : (
          <ContactAvatar
            contact={otherParticipant || conversation.contact || {
              name: displayName,
              is_ai: isEcho,
              contact_type: isEcho ? 'ai' : undefined
            }}
            size="md"
            status={conversation.online || isEcho ? 'online' : 'offline'}
            showBadge
          />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm truncate transition-colors",
              hasUnread ? "font-semibold text-[var(--text-primary)]" : "font-medium text-[var(--text-primary)]",
              isActive && "text-[var(--brand-primary)]"
            )}>
              {displayName}
            </span>
            {isEcho && (
              <Badge className="text-[9px] px-1.5 py-0 h-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 shadow-sm shadow-emerald-500/30">
                AI
              </Badge>
            )}
          </div>
          <span className={cn(
            "text-[10px] flex-shrink-0 font-medium",
            hasUnread ? "text-[var(--brand-primary)]" : "text-[var(--text-tertiary)] opacity-70"
          )}>
            {isEcho ? '' : formatRelativeTime(conversation.lastMessageAt || conversation.created_at || conversation.createdAt)}
          </span>
        </div>
        
        <div className="flex items-center justify-between gap-2">
          <p className={cn(
            "text-xs truncate",
            hasUnread ? "text-[var(--text-secondary)]" : "text-[var(--text-tertiary)] opacity-80",
            isEcho && "text-emerald-600 dark:text-emerald-400"
          )}>
            {isEcho 
              ? 'Always online • Ask me anything!' 
              : (typeof conversation.lastMessage === 'string' 
                  ? conversation.lastMessage 
                  : conversation.lastMessage?.content || conversation.content || 'Start a conversation')}
          </p>
          {hasUnread && (
            <Badge className="h-5 min-w-5 px-1.5 text-[10px] bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-hover)] text-white border-0 flex-shrink-0 shadow-md shadow-[var(--brand-primary)]/30">
              {conversation.unreadCount}
            </Badge>
          )}
          {conversation.pinned && !hasUnread && (
            <Pin className="h-3 w-3 text-[var(--text-tertiary)] flex-shrink-0 opacity-50" />
          )}
        </div>
      </div>
    </button>
  )
}

// New Conversation Modal/Panel
function NewConversationPanel({ contacts, onSelect, onClose, onCreateGroup }) {
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState('single') // 'single' | 'group'
  const [selectedContacts, setSelectedContacts] = useState([])
  const [groupName, setGroupName] = useState('')
  
  // Filter out Echo (AI assistant) from new conversation search
  // Echo is always available as an active thread if Signal is enabled
  const filteredContacts = contacts
    .filter(c => !c.is_ai && !c.is_echo && c.contact_type !== 'ai')
    .filter(c => 
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
    )

  const toggleContactSelection = (contact) => {
    setSelectedContacts(prev => {
      const isSelected = prev.some(c => c.id === contact.id)
      if (isSelected) {
        return prev.filter(c => c.id !== contact.id)
      }
      return [...prev, contact]
    })
  }

  const handleCreateGroup = () => {
    if (selectedContacts.length < 2) return
    onCreateGroup?.(groupName || `Group (${selectedContacts.length})`, selectedContacts)
    onClose()
  }

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
        <h3 className="font-semibold text-[var(--text-primary)]">
          {mode === 'group' ? 'Create Group' : 'New Conversation'}
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>
      
      {/* Mode Toggle */}
      <div className="p-4 pb-0 flex gap-2">
        <Button
          variant={mode === 'single' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setMode('single'); setSelectedContacts([]) }}
          className={mode === 'single' ? 'bg-[var(--brand-primary)]' : ''}
        >
          <User className="h-4 w-4 mr-2" />
          Direct Message
        </Button>
        <Button
          variant={mode === 'group' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('group')}
          className={mode === 'group' ? 'bg-[var(--brand-primary)]' : ''}
        >
          <Users className="h-4 w-4 mr-2" />
          Group Chat
        </Button>
      </div>

      {/* Group name input (only in group mode) */}
      {mode === 'group' && (
        <div className="px-4 pt-4">
          <Input 
            placeholder="Group name (optional)"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="bg-[var(--glass-bg-inset)] border-[var(--glass-border)]"
          />
          {selectedContacts.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedContacts.map(c => (
                <Badge 
                  key={c.id} 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-900"
                  onClick={() => toggleContactSelection(c)}
                >
                  {c.name} <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
      
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
              {filteredContacts.map(contact => {
                const isSelected = selectedContacts.some(c => c.id === contact.id)
                return (
                  <button
                    key={contact.id}
                    onClick={() => mode === 'group' ? toggleContactSelection(contact) : onSelect(contact)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--glass-bg-hover)] transition-colors text-left",
                      isSelected && "bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]"
                    )}
                  >
                    {mode === 'group' && (
                      <div className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center",
                        isSelected ? "bg-[var(--brand-primary)] border-[var(--brand-primary)]" : "border-[var(--glass-border)]"
                      )}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    )}
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
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Create Group Button */}
      {mode === 'group' && (
        <div className="p-4 border-t border-[var(--glass-border)]">
          <Button 
            onClick={handleCreateGroup}
            disabled={selectedContacts.length < 2}
            className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"
          >
            <Users className="h-4 w-4 mr-2" />
            Create Group ({selectedContacts.length} members)
          </Button>
        </div>
      )}
      </div>
    </>
  )
}

// Empty State
// Empty State - Liquid Glass Design
function EmptyState({ onNewMessage }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      {/* Decorative gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-[var(--brand-primary)]/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-purple-500/5 blur-3xl" />
      </div>
      
      <div className="relative">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--glass-bg)] to-[var(--glass-bg)]/50 backdrop-blur-xl ring-1 ring-white/10 shadow-2xl shadow-black/10 flex items-center justify-center mb-8 transform rotate-3 hover:rotate-0 transition-transform duration-300">
          <MessageCircle className="h-12 w-12 text-[var(--brand-primary)]" />
        </div>
        
        <h3 className="text-2xl font-semibold text-[var(--text-primary)] mb-3">
          Your Messages
        </h3>
        <p className="text-[var(--text-secondary)] max-w-sm mb-8 leading-relaxed">
          Send private messages to team members and clients. Start a new conversation to get started.
        </p>
        
        <Button 
          onClick={onNewMessage} 
          className="h-11 px-6 rounded-xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-hover)] hover:shadow-lg hover:shadow-[var(--brand-primary)]/30 text-white border-0 transition-all duration-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Message
        </Button>
      </div>
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
  currentUserId,
  typingUsers = {},
  onTyping,
  echoTyping = false,
}) {
  const [messageText, setMessageText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const emojiButtonRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const { uploadFile } = useFilesStore()

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
  
  // Handle typing input - send typing indicator
  const handleTextChange = (e) => {
    setMessageText(e.target.value)
    
    // Send typing indicator
    if (onTyping && e.target.value) {
      onTyping(true)
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      // Stop typing after 2 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false)
      }, 2000)
    }
  }

  const handleSend = async () => {
    if ((!messageText.trim() && selectedFiles.length === 0) || isSending) return
    
    // Clear typing
    if (onTyping) onTyping(false)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    
    setIsSending(true)
    
    // Upload files first if any
    let attachmentIds = []
    if (selectedFiles.length > 0) {
      for (const file of selectedFiles) {
        const result = await uploadFile(null, file, 'message-attachment', false)
        if (result.success) {
          attachmentIds.push(result.data.file.id)
        }
      }
    }
    
    // Send message with attachments
    await onSendMessage(messageText.trim(), attachmentIds)
    setMessageText('')
    setSelectedFiles([])
    setIsSending(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape') {
      setShowEmojiPicker(false)
    }
  }
  
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles(prev => [...prev, ...files])
  }
  
  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }
  
  const handleEmojiClick = (emojiData) => {
    setMessageText(prev => prev + emojiData.emoji)
    setShowEmojiPicker(false)
    textareaRef.current?.focus()
  }

  const otherParticipant = conversation?.recipient?.id === currentUserId 
    ? conversation?.sender 
    : conversation?.recipient
  
  // Get typing users for this conversation
  const conversationId = conversation?.id || conversation?.contact?.id
  const typingInConversation = Object.values(typingUsers).filter(
    t => t.conversationId === conversationId
  )

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
      {/* Chat Header - Liquid Glass */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--glass-border)]/30 bg-gradient-to-r from-[var(--glass-bg)]/40 via-transparent to-[var(--glass-bg)]/20 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="relative">
            <ContactAvatar
              contact={otherParticipant || conversation.contact || {
                name: conversation.sender_name,
                is_ai: conversation.is_echo || conversation.is_ai,
                contact_type: conversation.is_echo || conversation.is_ai ? 'ai' : undefined
              }}
              size="md"
              status={conversation.online ? 'online' : 'offline'}
              showBadge
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[var(--text-primary)]">
                {otherParticipant?.name || conversation.contact?.name || conversation.sender_name || 'Unknown'}
              </h3>
              {(conversation.is_echo || conversation.is_ai) && (
                <Badge className="text-[9px] px-1.5 py-0 h-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 shadow-sm shadow-emerald-500/30">
                  AI
                </Badge>
              )}
            </div>
            <p className="text-xs text-[var(--text-tertiary)]">
              {(conversation.is_echo || conversation.is_ai) ? (
                <span className="text-emerald-500">Always online</span>
              ) : conversation.online ? (
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
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 transition-colors">
                  <Phone className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Call</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 transition-colors">
                  <Video className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Video call</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl text-[var(--text-tertiary)] hover:bg-[var(--glass-bg-hover)] transition-colors">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl border-[var(--glass-border)]/50 bg-[var(--surface-primary)]/95 backdrop-blur-xl">
              <DropdownMenuItem className="rounded-lg">
                <Pin className="h-4 w-4 mr-2" />
                Pin conversation
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg">
                <BellOff className="h-4 w-4 mr-2" />
                Mute notifications
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg">
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
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
                <span className="text-sm text-[var(--text-tertiary)]">Loading messages...</span>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--glass-bg)]/50 backdrop-blur-sm ring-1 ring-white/10 mb-4">
                <MessageCircle className="h-8 w-8 text-[var(--text-tertiary)]" />
              </div>
              <p className="text-[var(--text-secondary)] text-sm">
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

      {/* Typing Indicator */}
      {typingInConversation.length > 0 && (
        <div className="px-6 py-2">
          <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--text-tertiary)] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-[var(--text-tertiary)] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-[var(--text-tertiary)] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>
              {typingInConversation.map(t => t.name).join(', ')} {typingInConversation.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        </div>
      )}
      
      {/* Echo Typing Indicator */}
      {echoTyping && (conversation.is_echo || conversation.is_ai) && (
        <div className="px-6 py-2">
          <TypingIndicator names={['Echo']} compact={false} />
        </div>
      )}
      
      {/* Message Input - Liquid Glass */}
      <div className="px-6 py-4 border-t border-[var(--glass-border)]/30 bg-gradient-to-r from-[var(--glass-bg)]/40 via-[var(--glass-bg)]/20 to-transparent backdrop-blur-sm">
        {/* File Preview */}
        {selectedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 px-3 py-2 bg-[var(--glass-bg)]/60 border border-[var(--glass-border)]/40 rounded-xl backdrop-blur-sm shadow-sm">
                <FileText className="h-4 w-4 text-[var(--brand-primary)]" />
                <span className="text-sm text-[var(--text-primary)] truncate max-w-[200px]">{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                  onClick={() => handleRemoveFile(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex items-end gap-3">
          {/* Attachment button */}
          <div className="flex items-center pb-1.5">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-10 w-10 p-0 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-5 w-5" />
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
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              rows={1}
              className="min-h-[48px] max-h-[120px] py-3.5 px-4 pr-12 resize-none bg-[var(--glass-bg-inset)]/50 border-[var(--glass-border)]/30 rounded-2xl focus:ring-1 focus:ring-[var(--brand-primary)]/30 transition-all placeholder:text-[var(--text-tertiary)]/60"
            />
            <Button 
              ref={emojiButtonRef}
              variant="ghost" 
              size="sm" 
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 transition-colors"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile className="h-5 w-5" />
            </Button>
            
            {/* Emoji Picker Popover */}
            {showEmojiPicker && (
              <div className="absolute bottom-full right-0 mb-2 z-50 rounded-2xl overflow-hidden shadow-2xl shadow-black/20">
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme="auto"
                  width={350}
                  height={400}
                />
              </div>
            )}
          </div>

          {/* Send button */}
          <Button 
            onClick={handleSend}
            disabled={(!messageText.trim() && selectedFiles.length === 0) || isSending}
            className="h-11 w-11 rounded-xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-hover)] hover:shadow-lg hover:shadow-[var(--brand-primary)]/30 p-0 flex-shrink-0 transition-all duration-200 disabled:opacity-50 disabled:shadow-none"
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
    isLoading,
    // Echo support
    echoContact,
    echoMessages,
    echoTyping,
    fetchEchoContact,
    fetchEchoMessages,
    sendToEcho,
    streamEchoResponse,
    isEchoContact,
    setActiveConversation: setStoreActiveConversation,
    // Typing indicators
    typingUsers,
    sendTypingIndicator,
    // Unread count
    markConversationAsRead,
    fetchUnreadCount
  } = useMessagesStore()

  const [activeConversation, setActiveConversation] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all') // 'all' | 'unread' | 'starred'
  const hasHandledContactParam = useRef(false)

  // Handle ?contact= query parameter from Team module integration
  useEffect(() => {
    if (hasHandledContactParam.current) return
    
    const urlParams = new URLSearchParams(window.location.search)
    const contactId = urlParams.get('contact')
    
    if (contactId && contacts.length > 0) {
      hasHandledContactParam.current = true
      const targetContact = contacts.find(c => c.id === contactId)
      if (targetContact) {
        // Start a new conversation with this contact
        setShowNewConversation(true)
        setActiveConversation({
          id: null,
          contact: targetContact,
          recipient: targetContact,
          lastMessage: null,
          isNew: true
        })
        setChatMessages([])
        // Clear the URL param
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, [contacts])

  // Prefetch handled globally in MainLayout. Avoid clearing messages on switch
  // to prevent flicker when cached data exists.

  // Update chat messages when store's messages change (from realtime) - ONLY for non-Echo
  useEffect(() => {
    // Skip if no active conversation or if it's an Echo conversation
    if (!activeConversation || activeConversation.is_echo || activeConversation.is_ai) {
      return
    }
    
    if (messages.length > 0) {
      const partnerId = activeConversation.contact?.id || activeConversation.recipient?.id || activeConversation.sender_id
      if (partnerId) {
        const conversationMessages = messages.filter(msg => 
          msg.sender_id === partnerId || msg.recipient_id === partnerId
        )
        // Update if we have messages for this conversation
        if (conversationMessages.length > 0) {
          setChatMessages(conversationMessages)
        }
      }
    }
  }, [messages, activeConversation?.id, activeConversation?.contact?.id, activeConversation?.is_echo, activeConversation?.is_ai])
  
  // Update Echo messages from store - ONLY for Echo conversations
  useEffect(() => {
    // Only update if this IS an Echo conversation
    if (activeConversation && (activeConversation.is_echo || activeConversation.is_ai)) {
      if (echoMessages.length > 0) {
        setChatMessages(echoMessages)
      }
    }
  }, [echoMessages, activeConversation?.is_echo, activeConversation?.is_ai])

  // Build display conversations - mark Echo conversations properly
  const baseConversations = conversations.length > 0 ? conversations : messages
  
  // Filter out any Echo-related conversations from the database
  // We'll add Echo as a separate persistent entry instead
  const nonEchoConversations = baseConversations.filter(conv => {
    // Exclude if it's an Echo conversation (by recipient/contact ID matching echoContact)
    const isEchoConversation = echoContact && (
      conv.recipient?.id === echoContact.id ||
      conv.contact?.id === echoContact.id ||
      conv.partner_id === echoContact.id ||
      conv.is_ai ||
      conv.is_echo ||
      conv.recipient?.name?.toLowerCase() === 'echo' ||
      conv.contact?.name?.toLowerCase() === 'echo'
    )
    return !isEchoConversation
  })
  
  // Add Echo as a persistent entry at the top if echoContact exists
  const displayConversations = echoContact 
    ? [
        {
          id: 'echo-persistent',
          is_echo: true,
          is_ai: true,
          online: true,
          contact: echoContact,
          recipient: echoContact,
          lastMessage: echoMessages.length > 0 ? echoMessages[echoMessages.length - 1]?.content : 'Your AI teammate',
          updated_at: echoMessages.length > 0 ? echoMessages[echoMessages.length - 1]?.created_at : new Date().toISOString()
        },
        ...nonEchoConversations
      ]
    : nonEchoConversations

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
    setStoreActiveConversation?.(conversation.id) // Track for realtime updates
    
    // Handle Echo conversation
    if (conversation.is_echo || conversation.is_ai) {
      // First set existing messages if any, then fetch fresh ones
      if (echoMessages.length > 0) {
        setChatMessages(echoMessages)
      }
      await fetchEchoMessages()
      // After fetch, the useEffect watching echoMessages will update chatMessages
      return
    }
    
    // Use cached messages immediately to avoid UI refresh/flicker
    const partnerId = conversation.contact?.id || conversation.recipient?.id || conversation.partner_id || conversation.sender_id
    const cachedMessages = partnerId
      ? messages.filter(msg => msg.sender_id === partnerId || msg.recipient_id === partnerId)
      : []

    if (cachedMessages.length > 0) {
      setChatMessages(cachedMessages)
    }

    // Mark conversation as read
    if (partnerId) {
      await markConversationAsRead(partnerId)
      await fetchUnreadCount() // Refresh unread count after marking as read
    }
    
    // Fetch thread messages for regular conversations
    if (conversation.id && cachedMessages.length === 0) {
      // Strip any prefix from the ID (e.g., "direct:uuid" -> "uuid")
      const cleanId = conversation.id.includes(':') 
        ? conversation.id.split(':')[1] 
        : conversation.id
      
      const result = await fetchMessage(cleanId)
      if (result.success && result.data?.thread) {
        setChatMessages(Array.isArray(result.data.thread) ? result.data.thread : [result.data.thread])
      } else if (result.success && result.data) {
        // If it's a single message response, wrap it
        setChatMessages([result.data])
      } else {
        // Fallback: try to filter from all messages
        const partnerId = conversation.contact?.id || conversation.recipient?.id || conversation.sender_id
        const conversationMsgs = messages.filter(msg => 
          msg.sender_id === partnerId || msg.recipient_id === partnerId
        )
        if (conversationMsgs.length > 0) {
          setChatMessages(conversationMsgs)
        } else {
          // Last resort: show the conversation itself as a message if it has content
          setChatMessages(conversation.content ? [conversation] : [])
        }
      }
    } else if (!conversation.id && cachedMessages.length === 0) {
      setChatMessages([])
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

  const handleCreateGroup = (groupName, members) => {
    // Create a new group conversation
    setActiveConversation({
      id: null,
      type: 'group',
      name: groupName,
      members: members,
      lastMessage: null,
      isNew: true
    })
    setChatMessages([])
    setShowNewConversation(false)
  }

  const handleSendMessage = async (content, attachmentIds = []) => {
    if (!activeConversation) return
    
    const recipientId = activeConversation.contact?.id || 
                        activeConversation.recipient?.id ||
                        (activeConversation.sender?.id !== user?.id ? activeConversation.sender?.id : activeConversation.recipient?.id)
    
    if (!recipientId) {
      console.error('No recipient found')
      return
    }

    // Use Echo-specific method for AI conversations
    if (activeConversation.is_echo || activeConversation.is_ai) {
      // Get page context for Echo awareness
      const pageContext = usePageContextStore.getState().getContext()
      await streamEchoResponse(content, { pageContext })
      // Echo messages are managed via the store's echoMessages state
      // No need to refetch - this was causing the refresh issue
      return
    }
    
    // Optimistic update for human-to-human threads
    const tempMessage = {
      id: `temp-${Date.now()}`,
      content,
      sender_id: user?.id,
      sender: { id: user?.id, name: user?.name, avatar: user?.avatar },
      created_at: new Date().toISOString(),
      attachments: attachmentIds.length > 0 ? attachmentIds : undefined
    }
    setChatMessages(prev => [...prev, tempMessage])

    // Send to server for regular conversations
    const messageData = {
      recipientId,
      subject: activeConversation.subject || 'New message',
      content,
      // Parent should only be set when replying to a specific message; for now send as root
      parentId: null,
      threadType: 'direct',
      attachments: attachmentIds.length > 0 ? attachmentIds : undefined
    }
    
    const result = await sendMessage(messageData)
    
    if (result.success) {
      // Update conversation state for new conversations
      if (activeConversation.isNew) {
        setActiveConversation(prev => ({ ...prev, isNew: false, id: result.data?.message?.id }))
      }
      // No need to refetch - WebSocket handles real-time updates
      // fetchConversations() and fetchMessages() removed to prevent refresh
    }
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex rounded-3xl overflow-hidden border border-[var(--glass-border)]/50 bg-[var(--surface-primary)]/95 backdrop-blur-2xl shadow-2xl shadow-black/10 ring-1 ring-white/10">
      {/* Chat Area - Main content on left */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gradient-to-br from-[var(--surface-primary)] to-[var(--glass-bg)]/30">
        {activeConversation ? (
          <ChatArea
            conversation={activeConversation}
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            currentUserId={user?.id}
            typingUsers={typingUsers}
            echoTyping={echoTyping}
            onTyping={(isTyping) => {
              const conversationId = activeConversation?.id || activeConversation?.contact?.id
              if (conversationId) {
                sendTypingIndicator(conversationId, isTyping)
              }
            }}
          />
        ) : (
          <EmptyState onNewMessage={() => setShowNewConversation(true)} />
        )}
      </div>

      {/* Threads Sidebar - Right side */}
      <div className="w-80 lg:w-96 flex-shrink-0 border-l border-[var(--glass-border)]/40 flex flex-col bg-[var(--glass-bg)]/20 backdrop-blur-xl relative overflow-hidden">
        {/* Gradient shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/5 pointer-events-none" />
        
        {/* Header */}
        <div className="relative p-4 border-b border-[var(--glass-border)]/40 bg-gradient-to-r from-[var(--glass-bg)]/50 to-transparent">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-[var(--text-primary)]">Conversations</h1>
              {unreadCount > 0 && (
                <Badge className="h-5 min-w-5 px-1.5 text-[10px] bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-hover)] text-white border-0 shadow-md shadow-[var(--brand-primary)]/30">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 rounded-xl hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)] transition-colors"
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
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl hover:bg-[var(--glass-bg-hover)] transition-colors">
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl border-[var(--glass-border)]/50 bg-[var(--surface-primary)]/95 backdrop-blur-xl">
                  <DropdownMenuItem onClick={() => setFilterType('all')} className="rounded-lg">
                    All messages
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType('unread')} className="rounded-lg">
                    Unread only
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType('starred')} className="rounded-lg">
                    Starred
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)] opacity-60" />
            <Input 
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[var(--glass-bg-inset)]/50 border-[var(--glass-border)]/30 rounded-xl focus:ring-1 focus:ring-[var(--brand-primary)]/30 transition-all"
            />
          </div>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1 relative">
          <div className="p-2 space-y-1">
            {isLoading && filteredConversations.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--brand-primary)]/20 to-[var(--brand-primary)]/5 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--brand-primary)]" />
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)]">Loading conversations...</p>
                </div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[var(--glass-bg)] to-[var(--glass-bg-hover)] border border-[var(--glass-border)]/30 flex items-center justify-center">
                  <MessageCircle className="h-7 w-7 text-[var(--text-tertiary)] opacity-50" />
                </div>
                <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">
                  {searchTerm ? 'No results' : 'No conversations'}
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {searchTerm ? 'Try a different search term' : 'Start a new conversation'}
                </p>
              </div>
            ) : (
              filteredConversations.map(conv => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={activeConversation?.id === conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  user={user}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* New Conversation Panel */}
        {showNewConversation && (
          <NewConversationPanel
            contacts={contacts}
            onSelect={handleStartNewConversation}
            onCreateGroup={handleCreateGroup}
            onClose={() => setShowNewConversation(false)}
          />
        )}
      </div>
    </div>
  )
}
