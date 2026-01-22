/**
 * ChatBubbleManager - Multi-bubble chat system with Liquid Glass design
 * Manages multiple concurrent chat conversations like Facebook Messenger
 * Each conversation gets its own minimizable bubble along the bottom of the screen
 * 
 * Echo AI access requires ORG-LEVEL Signal (not project-level).
 * Project-level Signal only enables AI features within project modules.
 */
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  MessageCircle,
  X,
  Search,
  Plus,
  ArrowLeft,
  UserPlus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import ContactAvatar from '@/components/ui/ContactAvatar'
import ChatBubbleSingle from '@/components/ChatBubbleSingle'
import MessagesIcon from '@/components/MessagesIcon'
import useMessagesStore from '@/lib/messages-store'
import useAuthStore from '@/lib/auth-store'
import { useEchoAccess } from '@/lib/signal-access'

const STORAGE_KEY = 'uptrade_open_chat_bubbles'
const MINIMIZED_STORAGE_KEY = 'uptrade_minimized_chat_bubbles'

// Load persisted bubbles from localStorage
const loadPersistedBubbles = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

const loadPersistedMinimized = () => {
  try {
    const stored = localStorage.getItem(MINIMIZED_STORAGE_KEY)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch {
    return new Set()
  }
}

export default function ChatBubbleManager({ hidden = false }) {
  const [openBubbles, setOpenBubbles] = useState(() => loadPersistedBubbles()) // Array of conversation IDs
  const [minimizedBubbles, setMinimizedBubbles] = useState(() => loadPersistedMinimized()) // Track which are minimized
  const [showSelector, setShowSelector] = useState(false)
  const [viewMode, setViewMode] = useState('conversations') // 'conversations' or 'new'
  const [searchTerm, setSearchTerm] = useState('')
  
  const { user } = useAuthStore()
  const hasEchoAccess = useEchoAccess() // Requires org-level Signal
  const { 
    conversations, 
    contacts,
    unreadCount,
    fetchConversations,
    fetchContacts,
    echoContact,
    prefetchAll,
    hasPrefetched,
    pendingHandoffs
  } = useMessagesStore()

  // Persist open bubbles to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openBubbles))
    } catch (e) {
      console.warn('Failed to persist open bubbles:', e)
    }
  }, [openBubbles])

  // Persist minimized state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(MINIMIZED_STORAGE_KEY, JSON.stringify([...minimizedBubbles]))
    } catch (e) {
      console.warn('Failed to persist minimized bubbles:', e)
    }
  }, [minimizedBubbles])

  // Prefetch data on mount
  useEffect(() => {
    if (user && !hasPrefetched) {
      prefetchAll()
    }
    // Ensure contacts are available even if prefetched elsewhere
    if (user && contacts.length === 0) {
      fetchContacts()
    }
  }, [user, hasPrefetched, prefetchAll, contacts.length, fetchContacts])

  // Auto-fetch Echo contact - only once
  useEffect(() => {
    // Skip if we already have echoContact or if we're still loading/prefetching
    if (echoContact || hasPrefetched === false) return
    
    // Only fetch contacts if we haven't already
    if (contacts.length === 0) {
      fetchContacts()
    }
  }, []) // Empty deps - only run once on mount

  // Listen for external requests to open conversations
  useEffect(() => {
    const handleOpenConversation = (event) => {
      const conversationId = event.detail?.conversationId
      if (conversationId && !openBubbles.includes(conversationId)) {
        setOpenBubbles(prev => [...prev, conversationId])
      }
    }

    window.addEventListener('openChatBubble', handleOpenConversation)
    return () => window.removeEventListener('openChatBubble', handleOpenConversation)
  }, [openBubbles])

  // Filter out any Echo-related conversations from the database
  // We'll add Echo as a single persistent entry instead
  const nonEchoConversations = conversations.filter(conv => {
    // Exclude if it's an Echo conversation
    const isEchoConversation = echoContact && (
      conv.is_echo ||
      conv.is_ai ||
      conv.contact?.is_ai ||
      conv.recipient?.id === echoContact.id ||
      conv.contact?.id === echoContact.id ||
      conv.recipient?.name?.toLowerCase() === 'echo' ||
      conv.contact?.name?.toLowerCase() === 'echo'
    )
    return !isEchoConversation
  })

  // Add Echo as a persistent entry at the top if echoContact exists AND user has Echo access
  // Echo access requires ORG-LEVEL Signal, not just project-level Signal
  const allConversations = (echoContact && hasEchoAccess)
    ? [
        {
          id: 'echo-persistent',
          is_echo: true,
          is_ai: true,
          online: true,
          contact: echoContact,
          recipient: echoContact
        },
        ...nonEchoConversations
      ]
    : nonEchoConversations

  // Filter conversations based on search
  const filteredConversations = allConversations.filter(conv => {
    if (!searchTerm) return true
    const contact = conv.contact || conv.recipient
    const name = contact?.name?.toLowerCase() || ''
    const email = contact?.email?.toLowerCase() || ''
    return name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase())
  })

  // Filter contacts for new conversation mode
  const existingContactIds = new Set(conversations.map(c => c.contact?.id || c.recipient?.id).filter(Boolean))
  const filteredContacts = (contacts || []).filter(contact => {
    // Exclude self and Echo/AI contacts
    if (contact.id === user?.id) return false
    if (contact.is_ai || contact.contact_type === 'ai') return false
    // Note: We DO show contacts even if we have existing conversations with them
    
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    const name = contact.name?.toLowerCase() || ''
    const email = contact.email?.toLowerCase() || ''
    const company = contact.company?.toLowerCase() || ''
    const organization = contact.organization_name?.toLowerCase() || ''
    return name.includes(search) || email.includes(search) || company.includes(search) || organization.includes(search)
  })

  // Get conversation by ID
  const getConversation = (id) => {
    return allConversations.find(c => c.id === id || c.contact?.id === id)
  }

  // Open a conversation bubble
  const openBubble = (conversationId) => {
    if (!openBubbles.includes(conversationId)) {
      setOpenBubbles(prev => [...prev, conversationId])
    }
    setShowSelector(false)
    setSearchTerm('')
  }

  // Close a conversation bubble
  const closeBubble = (conversationId) => {
    setOpenBubbles(prev => prev.filter(id => id !== conversationId))
    setMinimizedBubbles(prev => {
      const next = new Set(prev)
      next.delete(conversationId)
      return next
    })
  }

  // Toggle minimize state
  const toggleMinimize = (conversationId, isMinimized) => {
    setMinimizedBubbles(prev => {
      const next = new Set(prev)
      if (isMinimized) {
        next.add(conversationId)
      } else {
        next.delete(conversationId)
      }
      return next
    })
  }

  // Calculate position for each bubble
  const getBubblePosition = (index) => {
    let offset = 72 // Start after the main launcher button
    
    for (let i = 0; i < index; i++) {
      const bubbleId = openBubbles[i]
      if (minimizedBubbles.has(bubbleId)) {
        offset += 56 // Minimized bubble width (48px) + gap (8px)
      } else {
        offset += 352 // Expanded bubble width (340px) + gap (12px)
      }
    }
    
    return offset
  }

  // Get accent color based on contact type
  const getAccentStyle = (conversation) => {
    if (conversation.is_echo || conversation.is_ai) {
      return {
        border: 'border-emerald-400/60 dark:border-emerald-500/60',
        glow: 'shadow-emerald-500/25',
        headerBg: 'bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent',
        label: 'AI',
        labelClass: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
        ring: 'ring-emerald-500/30'
      }
    }
    if (conversation.contact?.contact_type === 'visitor') {
      return {
        border: 'border-amber-400/60 dark:border-amber-500/60',
        glow: 'shadow-amber-500/25',
        headerBg: 'bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent',
        label: 'Live',
        labelClass: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 animate-pulse',
        ring: 'ring-amber-500/30'
      }
    }
    if (conversation.contact?.is_team_member || conversation.contact?.contactType === 'uptrade_team') {
      return {
        border: 'border-sky-400/60 dark:border-sky-500/60',
        glow: 'shadow-sky-500/25',
        headerBg: 'bg-gradient-to-r from-sky-500/10 via-blue-500/5 to-transparent',
        label: 'Uptrade',
        labelClass: 'bg-sky-500/20 text-sky-600 dark:text-sky-400',
        ring: 'ring-sky-500/30'
      }
    }
    return {
      border: 'border-violet-400/40 dark:border-violet-500/40',
      glow: 'shadow-violet-500/15',
      headerBg: 'bg-gradient-to-r from-violet-500/5 via-transparent to-transparent',
      label: null,
      labelClass: '',
      ring: 'ring-violet-500/20'
    }
  }

  if (hidden || !user) return null

  const hasLiveHandoffs = pendingHandoffs?.length > 0
  const totalBadgeCount = unreadCount + (pendingHandoffs?.length || 0)

  return (
    <>
      {/* Conversation Selector Panel - Liquid Glass Design */}
      {showSelector && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-[55] transition-opacity"
            onClick={() => { setShowSelector(false); setSearchTerm('') }}
          />
          
          {/* Panel */}
          <div 
            className={cn(
              "fixed z-[60] overflow-hidden",
              // Liquid glass effect
              "bg-[var(--surface-primary)]/80 backdrop-blur-2xl",
              "border border-[var(--glass-border)]/80 rounded-2xl",
              "shadow-2xl shadow-black/10",
              "ring-1 ring-white/10",
              // Position above the launcher
              "bottom-24 right-6 w-80",
              // Animation
              "animate-in slide-in-from-bottom-4 fade-in duration-200"
            )}
          >
            {/* Gradient shimmer overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-tr from-[var(--brand-primary)]/3 via-transparent to-emerald-500/3 pointer-events-none" />
            
            {/* Header */}
            <div className="relative flex items-center justify-between p-4 border-b border-[var(--glass-border)]/50">
              <div className="flex items-center gap-3">
                {viewMode === 'new' ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)] rounded-xl"
                    onClick={() => { setViewMode('conversations'); setSearchTerm('') }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-hover)] flex items-center justify-center shadow-lg shadow-[var(--brand-primary)]/25">
                    <MessageCircle className="h-4 w-4 text-white" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                    {viewMode === 'new' ? 'New Conversation' : 'Conversations'}
                  </h3>
                  <p className="text-[10px] text-[var(--text-tertiary)]">
                    {viewMode === 'new' 
                      ? 'Select a contact to chat' 
                      : openBubbles.length > 0 ? `${openBubbles.length} active` : 'Select to chat'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {viewMode === 'conversations' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--glass-bg)]"
                    onClick={() => { setViewMode('new'); setSearchTerm('') }}
                    title="New conversation"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)]"
                  onClick={() => { setShowSelector(false); setSearchTerm(''); setViewMode('conversations') }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="relative p-3 border-b border-[var(--glass-border)]/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
                <Input 
                  placeholder={viewMode === 'new' ? "Search contacts..." : "Search conversations..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-[var(--glass-bg-inset)] border-[var(--glass-border)]/50 h-9 text-sm placeholder:text-[var(--text-tertiary)]/70"
                />
              </div>
            </div>

            {/* List - Conversations or Contacts based on viewMode */}
            <ScrollArea className="h-80">
              <div className="p-2 space-y-1">
                {viewMode === 'new' ? (
                  // New Conversation - Contact List
                  <>
                    {filteredContacts.length === 0 ? (
                      <div className="text-center py-8 text-[var(--text-tertiary)]">
                        <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No contacts found</p>
                        <p className="text-xs mt-1 opacity-70">Try a different search term</p>
                      </div>
                    ) : (
                      filteredContacts.map(contact => {
                        const isTeam = contact.is_team_member || contact.contactType === 'uptrade_team'
                        
                        return (
                          <button
                            key={contact.id}
                            onClick={() => {
                              openBubble(contact.id)
                              setViewMode('conversations')
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group",
                              "hover:bg-[var(--glass-bg-hover)] hover:shadow-sm"
                            )}
                          >
                            <div className="relative shrink-0">
                              <ContactAvatar
                                contact={contact}
                                size="md"
                                showBadge
                              />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                                  {contact.name || 'Unknown'}
                                </span>
                                {isTeam && (
                                  <Badge className="text-[9px] px-1.5 py-0 h-4 border-0 font-medium bg-sky-500/20 text-sky-600 dark:text-sky-400">
                                    Uptrade
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-[var(--text-tertiary)] truncate">
                                {contact.email || contact.company || 'Start a conversation'}
                              </p>
                            </div>
                            
                            <MessageCircle className="h-4 w-4 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        )
                      })
                    )}
                  </>
                ) : (
                  // Existing Conversations
                  <>
                    {filteredConversations.length === 0 ? (
                      <div className="text-center py-8 text-[var(--text-tertiary)]">
                        <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No conversations found</p>
                      </div>
                    ) : (
                      filteredConversations.map(conv => {
                        const isOpen = openBubbles.includes(conv.id || conv.contact?.id)
                        const conversationId = conv.id || conv.contact?.id
                        const contact = conv.contact || conv.recipient
                        const accent = getAccentStyle(conv)
                        const isEcho = conv.is_echo || conv.is_ai

                        return (
                          <button
                            key={conversationId}
                            onClick={() => !isOpen && openBubble(conversationId)}
                            disabled={isOpen}
                            className={cn(
                              "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group",
                              "hover:bg-[var(--glass-bg-hover)] hover:shadow-sm",
                              isOpen && "opacity-50 cursor-not-allowed bg-[var(--glass-bg)]/50",
                              isEcho && "bg-gradient-to-r from-emerald-500/5 to-transparent"
                            )}
                          >
                            <div className="relative shrink-0">
                              <ContactAvatar
                                contact={isEcho ? { name: 'Echo', is_ai: true, contact_type: 'ai' } : contact}
                                type={isEcho ? 'echo' : undefined}
                                size="md"
                                status={conv.online || isEcho ? 'online' : 'offline'}
                                showBadge
                              />
                              {conv.unreadCount > 0 && !isOpen && (
                                <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full flex items-center justify-center bg-[var(--brand-primary)] text-white text-[10px] border-2 border-[var(--surface-primary)]">
                                  {conv.unreadCount}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                                  {isEcho ? 'Echo' : contact?.name || 'Unknown'}
                                </span>
                                {accent.label && (
                                  <Badge className={cn("text-[9px] px-1.5 py-0 h-4 border-0 font-medium", accent.labelClass)}>
                                    {accent.label}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-[var(--text-tertiary)] truncate">
                                {isEcho ? 'Your AI teammate' : (
                                  typeof conv.lastMessage === 'string' 
                                    ? conv.lastMessage 
                                    : conv.lastMessage?.content || conv.lastMessage?.subject || 'No messages yet'
                                )}
                              </p>
                            </div>
                            
                            {isOpen && (
                              <span className="text-[10px] text-[var(--text-tertiary)] bg-[var(--glass-bg)] px-2 py-0.5 rounded-full">
                                Open
                              </span>
                            )}
                          </button>
                        )
                      })
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </>
      )}

      {/* Main Launcher Button - Liquid Glass with brand color */}
      <button
        onClick={() => setShowSelector(!showSelector)}
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "w-14 h-14 rounded-full",
          "flex items-center justify-center",
          "transition-all duration-300 ease-out",
          "hover:scale-105 active:scale-95",
          "focus:outline-none focus:ring-2 focus:ring-offset-2",
          // Brand color - not purple/blue gradient
          hasLiveHandoffs 
            ? "bg-amber-500 hover:bg-amber-600 shadow-xl shadow-amber-500/40 focus:ring-amber-500 animate-pulse"
            : "bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] shadow-xl shadow-[var(--brand-primary)]/40 focus:ring-[var(--brand-primary)]",
          "text-white"
        )}
      >
        <MessagesIcon size={28} />
        
        {/* Unread Badge */}
        {totalBadgeCount > 0 && (
          <span className={cn(
            "absolute -top-1 -right-1 min-w-5 h-5 px-1 text-white text-xs font-bold rounded-full flex items-center justify-center",
            "border-2 border-[var(--surface-primary)]",
            hasLiveHandoffs ? "bg-red-500 animate-bounce" : "bg-red-500"
          )}>
            {totalBadgeCount > 9 ? '9+' : totalBadgeCount}
          </span>
        )}
        
        {/* Open bubbles indicator */}
        {openBubbles.length > 0 && !totalBadgeCount && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[var(--surface-primary)] text-[var(--brand-primary)] text-[9px] font-bold px-1.5 rounded-full border border-[var(--glass-border)] shadow-sm">
            {openBubbles.length}
          </span>
        )}
        
        {/* Live visitor label */}
        {hasLiveHandoffs && (
          <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full shadow-sm">
            Live Visitor
          </span>
        )}
      </button>

      {/* Open Chat Bubbles */}
      {openBubbles.map((conversationId, index) => {
        const conversation = getConversation(conversationId)
        if (!conversation) return null

        const accent = getAccentStyle(conversation)
        const isMinimized = minimizedBubbles.has(conversationId)

        return (
          <div
            key={conversationId}
            className="fixed bottom-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300 transition-all"
            style={{ right: `${getBubblePosition(index)}px` }}
          >
            <ChatBubbleSingle
              conversation={conversation}
              onClose={() => closeBubble(conversationId)}
              onMinimizeChange={(minimized) => toggleMinimize(conversationId, minimized)}
              accent={accent}
              defaultMinimized={isMinimized}
            />
          </div>
        )
      })}
    </>
  )
}
