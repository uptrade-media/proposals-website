import { create } from 'zustand'
import api from './api'
import { supabase } from './supabase-auth'
import { messagesApi, engageApi } from './portal-api'
import { echoApi } from './signal-api'
import messagesSocket, {
  connectSocket,
  disconnectSocket,
  setHandlers,
  emitTyping,
  emitMessageRead,
  emitMessageDelivered,
  startHeartbeat,
  stopHeartbeat,
  isConnected,
} from './messages-socket'
import messagesCache from './messages-cache'

// Portal API for Messages/Engage CRUD, Signal API for Echo AI chat
// Socket.io for real-time message delivery (replaced Supabase Realtime)
// IndexedDB for offline-first caching
console.log('[Messages Store] Using Socket.io for real-time, IndexedDB for cache')

// Navigation request handlers (components can register to receive navigation requests)
const navigationHandlers = new Set()

// Register a handler to receive navigation requests from Echo
export function onEchoNavigation(handler) {
  navigationHandlers.add(handler)
  return () => navigationHandlers.delete(handler)
}

// Dispatch a navigation request to all registered handlers
function dispatchNavigation(request) {
  navigationHandlers.forEach(handler => handler(request))
}

// Audio refs for notification sounds
let messageNotificationAudio = null
let liveChatNotificationAudio = null

// Initialize audio on first use (must be after user interaction)
function initializeAudio() {
  if (!messageNotificationAudio) {
    messageNotificationAudio = new Audio('/chatnotification.wav')
    messageNotificationAudio.volume = 0.5
  }
  if (!liveChatNotificationAudio) {
    // Use same sound but louder for live chat urgency
    liveChatNotificationAudio = new Audio('/chatnotification.wav')
    liveChatNotificationAudio.volume = 0.8
  }
}

// Play notification sound
function playNotificationSound(type = 'message') {
  try {
    initializeAudio()
    const audio = type === 'livechat' ? liveChatNotificationAudio : messageNotificationAudio
    if (audio) {
      audio.currentTime = 0
      audio.play().catch(err => console.log('[Notification] Audio blocked:', err.message))
    }
  } catch (err) {
    console.log('[Notification] Audio error:', err.message)
  }
}

const useMessagesStore = create((set, get) => ({
  messages: [],
  conversations: [],
  contacts: [],
  currentMessage: null,
  unreadCount: 0,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    pages: 1,
    per_page: 20,
    total: 0,
    has_next: false,
    has_prev: false
  },
  
  // Cursor-based pagination state (per conversation)
  cursors: {}, // { conversationId: { nextCursor, prevCursor, hasMore, isLoadingMore } }
  
  // Echo-specific state
  echoContact: null,
  echoMessages: [],
  echoTyping: false,
  echoConversationId: null,
  
  // Realtime state
  realtimeConnected: false,
  activeConversationId: null, // Track which conversation is currently open
  
  // Live chat handoff notifications
  pendingHandoffs: [], // Sessions waiting for human response
  soundEnabled: true,  // Allow users to mute
  
  // Typing indicators - map of { recipientId: { name, timestamp } }
  typingUsers: {},
  
  // Pending/optimistic messages (local IDs before server confirms)
  pendingMessages: [],
  
  // Offline queue - messages queued when disconnected
  offlineQueue: [],
  
  // Current user info (for optimistic messages and typing)
  currentUserId: null,
  currentUserName: null,
  
  // Data loading state - tracks if initial data has been prefetched
  hasPrefetched: false,
  isPrefetching: false,

  // Clear error
  clearError: () => set({ error: null }),
  
  // Get current user from Supabase auth
  getCurrentUser: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      
      // Try to get contact record for more info
      const { data: contact } = await supabase
        .from('contacts')
        .select('id, name, email, avatar')
        .or(`auth_user_id.eq.${user.id},email.ilike.${user.email}`)
        .single()
      
      return {
        id: contact?.id || user.id,
        name: contact?.name || user.user_metadata?.name || user.email?.split('@')[0],
        email: contact?.email || user.email,
        avatar: contact?.avatar || user.user_metadata?.avatar_url
      }
    } catch (error) {
      console.error('[Messages] Failed to get current user:', error)
      return null
    }
  },
  
  // =====================================================
  // PREFETCH - Load all messaging data upfront
  // =====================================================
  
  // Force refresh all messaging data (call after user deletions, etc.)
  refreshAll: async () => {
    console.log('[Messages] Force refreshing all data...')
    set({ isPrefetching: true })
    
    try {
      // Fetch all in parallel for speed
      const results = await Promise.allSettled([
        get().fetchConversations(),
        get().fetchContacts(),
        get().fetchMessages()
      ])
      
      // Check if all succeeded
      const allSuccess = results.every(r => r.status === 'fulfilled' && r.value?.success !== false)
      
      set({ isPrefetching: false })
      
      console.log('[Messages] Force refresh complete:', allSuccess ? 'success' : 'partial')
      return { success: allSuccess }
    } catch (error) {
      console.error('[Messages] Refresh error:', error)
      set({ isPrefetching: false })
      return { success: false, error: error.message }
    }
  },
  
  // Prefetch all messaging data (call on app mount, not widget open)
  // Uses IndexedDB cache for instant UI, then syncs with server
  prefetchAll: async () => {
    const state = get()
    
    // Skip if already prefetched or currently prefetching
    if (state.hasPrefetched || state.isPrefetching) {
      return { success: true, cached: true }
    }
    
    set({ isPrefetching: true })
    
    try {
      // 1. Load from IndexedDB cache immediately (instant UI)
      const hasCache = await messagesCache.hasData()
      if (hasCache) {
        console.log('[Messages] Loading from cache...')
        const [cachedConversations, cachedContacts, cachedMessages, cachedEchoMessages] = await Promise.all([
          messagesCache.getConversations(),
          messagesCache.getContacts(),
          messagesCache.getMessages(),
          messagesCache.getEchoMessages(),
        ])
        
        // Set cached data immediately for instant UI
        if (cachedConversations.length > 0 || cachedMessages.length > 0) {
          set({
            conversations: cachedConversations,
            contacts: cachedContacts,
            messages: cachedMessages,
            echoMessages: cachedEchoMessages,
            unreadCount: cachedMessages.filter(m => !m.read_at && !m.readAt).length,
          })
          console.log('[Messages] Loaded from cache:', {
            conversations: cachedConversations.length,
            contacts: cachedContacts.length,
            messages: cachedMessages.length,
            echoMessages: cachedEchoMessages.length,
          })
        }
      }
      
      // 2. Fetch Echo contact (needed for Echo messages)
      await get().fetchEchoContact()
      
      // 3. Fetch fresh data from server in parallel
      const results = await Promise.allSettled([
        get().fetchConversations(),
        get().fetchContacts(),
        get().fetchMessages(),
        get().fetchEchoMessages()
      ])
      
      // Check if all succeeded
      const allSuccess = results.every(r => r.status === 'fulfilled' && r.value?.success !== false)
      
      // 4. Update cache with fresh data
      const currentState = get()
      await Promise.all([
        messagesCache.putConversations(currentState.conversations),
        messagesCache.putContacts(currentState.contacts),
        messagesCache.putMessages(currentState.messages),
        messagesCache.putEchoMessages(currentState.echoMessages),
        messagesCache.setLastSync('messages'),
      ])
      
      set({ 
        hasPrefetched: true, 
        isPrefetching: false 
      })
      
      console.log('[Messages] Prefetched all data:', allSuccess ? 'success' : 'partial')
      return { success: allSuccess }
    } catch (error) {
      console.error('[Messages] Prefetch error:', error)
      set({ isPrefetching: false })
      return { success: false, error: error.message }
    }
  },

  // =====================================================
  // TYPING INDICATORS
  // =====================================================
  
  // Send typing indicator to a conversation (via Socket.io)
  sendTypingIndicator: (conversationId, isTyping = true) => {
    if (!conversationId) return
    emitTyping(conversationId, isTyping)
  },
  
  // Set current user info (called when subscribing)
  setCurrentUser: (userId, userName) => {
    set({ currentUserId: userId, currentUserName: userName })
  },
  
  // Clear stale typing indicators (older than 3 seconds)
  clearStaleTyping: () => {
    const now = Date.now()
    set(state => {
      const newTypingUsers = {}
      Object.entries(state.typingUsers).forEach(([id, data]) => {
        if (now - data.timestamp < 3000) {
          newTypingUsers[id] = data
        }
      })
      return { typingUsers: newTypingUsers }
    })
  },

  // Fetch messages with cursor pagination
  fetchMessages: async (filters = {}) => {
    const conversationId = filters.conversationId || 'all'
    
    set({ isLoading: true, error: null })
    
    try {
      const response = await messagesApi.getMessages(filters)
      
      // API returns { success: true, data: { messages, nextCursor, ... } }
      const data = response?.data || response || {}
      const messages = data.messages || data.data?.messages || []
      
      console.log('[Messages Store] fetchMessages response:', { 
        conversationId, 
        messageCount: messages.length,
        raw: response 
      })
      
      // Calculate unread count - check both readAt (camelCase) and read_at (snake_case)
      const unreadCount = messages.filter(m => !m.readAt && !m.read_at).length
      
      // Update cursors for this conversation
      set(state => ({ 
        messages,
        unreadCount,
        isLoading: false,
        cursors: {
          ...state.cursors,
          [conversationId]: {
            nextCursor: data.nextCursor,
            prevCursor: data.prevCursor,
            hasMore: data.hasMore,
            isLoadingMore: false,
          }
        }
      }))
      
      return { success: true, data: { messages, ...data } }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch messages'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },
  
  // Load more messages (infinite scroll)
  loadMoreMessages: async (conversationId) => {
    const state = get()
    const cursorState = state.cursors[conversationId || 'all']
    
    // Don't load if already loading or no more messages
    if (!cursorState?.hasMore || cursorState?.isLoadingMore) {
      return { success: true, hasMore: false }
    }
    
    // Mark as loading more
    set(state => ({
      cursors: {
        ...state.cursors,
        [conversationId || 'all']: {
          ...cursorState,
          isLoadingMore: true,
        }
      }
    }))
    
    try {
      const response = await messagesApi.getMessages({
        conversationId,
        cursor: cursorState.nextCursor,
        direction: 'before',
        limit: 50,
      })
      
      const newMessages = response.messages || []
      
      // Append to existing messages (older messages go at the end)
      set(state => ({
        messages: [...state.messages, ...newMessages],
        cursors: {
          ...state.cursors,
          [conversationId || 'all']: {
            nextCursor: response.nextCursor,
            prevCursor: cursorState.prevCursor, // Keep original
            hasMore: response.hasMore,
            isLoadingMore: false,
          }
        }
      }))
      
      return { success: true, hasMore: response.hasMore, loaded: newMessages.length }
    } catch (error) {
      console.error('[Messages] Load more error:', error)
      set(state => ({
        cursors: {
          ...state.cursors,
          [conversationId || 'all']: {
            ...cursorState,
            isLoadingMore: false,
          }
        }
      }))
      return { success: false, error: error.message }
    }
  },

  // Fetch single message thread
  fetchMessage: async (messageId) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = { data: await messagesApi.getThread(messageId) }
      
      set({ 
        currentMessage: response.data.thread || response.data,
        isLoading: false 
      })
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch message thread'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Send new message (with optimistic update and offline queue)
  sendMessage: async (messageData) => {
    const state = get()
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Create optimistic message
    const optimisticMessage = {
      id: tempId,
      content: messageData.content,
      sender_id: state.currentUserId,
      sender: {
        id: state.currentUserId,
        name: state.currentUserName,
      },
      recipient_id: messageData.recipientId,
      created_at: new Date().toISOString(),
      status: 'sending', // pending state
      _optimistic: true
    }
    
    // Add to messages immediately
    set(state => ({
      messages: [optimisticMessage, ...state.messages],
      pendingMessages: [...state.pendingMessages, tempId]
    }))
    
    // Clear typing indicator
    get().sendTypingIndicator(messageData.recipientId, false)
    
    // If offline, queue for later
    if (!state.realtimeConnected) {
      console.log('[Messages] Offline - queuing message for later')
      set(state => ({
        messages: state.messages.map(m => 
          m.id === tempId ? { ...m, status: 'queued' } : m
        ),
        offlineQueue: [...state.offlineQueue, { tempId, messageData, timestamp: Date.now() }]
      }))
      return { success: true, queued: true, message: optimisticMessage }
    }
    
    try {
      const response = { data: await messagesApi.sendMessage(messageData) }
      
      // Replace optimistic message with real one
      set(state => ({
        messages: state.messages.map(m => 
          m.id === tempId 
            ? { ...response.data.message, status: 'sent', _optimistic: false }
            : m
        ),
        pendingMessages: state.pendingMessages.filter(id => id !== tempId)
      }))
      
      // Refresh conversations to update sidebar
      get().fetchConversations()
      
      return { success: true, data: response.data }
    } catch (error) {
      // Mark as failed
      set(state => ({
        messages: state.messages.map(m => 
          m.id === tempId 
            ? { ...m, status: 'failed', _optimistic: true }
            : m
        ),
        pendingMessages: state.pendingMessages.filter(id => id !== tempId),
        error: error.response?.data?.error || error.message || 'Failed to send message'
      }))
      return { success: false, error: error.response?.data?.error || error.message || 'Failed to send message' }
    }
  },
  
  // Flush offline queue when reconnected
  flushOfflineQueue: async () => {
    const { offlineQueue } = get()
    if (offlineQueue.length === 0) return
    
    console.log(`[Messages] Flushing ${offlineQueue.length} queued messages`)
    
    for (const { tempId, messageData } of offlineQueue) {
      try {
        // Update status to sending
        set(state => ({
          messages: state.messages.map(m =>
            m.id === tempId ? { ...m, status: 'sending' } : m
          )
        }))
        
        const response = { data: await messagesApi.sendMessage(messageData) }
        
        // Replace temp message with real one
        set(state => ({
          messages: state.messages.map(m =>
            m.id === tempId 
              ? { ...response.data.message, status: 'sent', _optimistic: false }
              : m
          ),
          offlineQueue: state.offlineQueue.filter(q => q.tempId !== tempId),
          pendingMessages: state.pendingMessages.filter(id => id !== tempId)
        }))
      } catch (error) {
        console.error('[Messages] Failed to send queued message:', error)
        // Mark as failed
        set(state => ({
          messages: state.messages.map(m =>
            m.id === tempId ? { ...m, status: 'failed' } : m
          ),
          offlineQueue: state.offlineQueue.filter(q => q.tempId !== tempId)
        }))
      }
    }
    
    // Refresh conversations after flushing
    get().fetchConversations()
  },
  
  // Retry a failed message
  retryMessage: async (tempId) => {
    const state = get()
    const failedMessage = state.messages.find(m => m.id === tempId && m.status === 'failed')
    
    if (!failedMessage) {
      console.warn('[Messages] No failed message found with id:', tempId)
      return { success: false, error: 'Message not found' }
    }
    
    // Reconstruct message data
    const messageData = {
      content: failedMessage.content,
      recipientId: failedMessage.recipient_id,
      parentId: failedMessage.parent_id,
    }
    
    // Update status to sending
    set(state => ({
      messages: state.messages.map(m =>
        m.id === tempId ? { ...m, status: 'sending' } : m
      )
    }))
    
    try {
      const response = { data: await messagesApi.sendMessage(messageData) }
      
      set(state => ({
        messages: state.messages.map(m => 
          m.id === tempId 
            ? { ...response.data.message, status: 'sent', _optimistic: false }
            : m
        ),
        pendingMessages: state.pendingMessages.filter(id => id !== tempId)
      }))
      
      return { success: true, data: response.data }
    } catch (error) {
      set(state => ({
        messages: state.messages.map(m =>
          m.id === tempId ? { ...m, status: 'failed' } : m
        )
      }))
      return { success: false, error: error.message }
    }
  },

  // Reply to message
  replyToMessage: async (parentId, recipientId, content) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = { data: await messagesApi.sendMessage({
        parentId,
        recipientId,
        content
      })}
      
      // Refresh the thread
      if (get().currentMessage) {
        await get().fetchMessage(parentId)
      }
      
      set({ isLoading: false })
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to send reply'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Mark message as read
  markAsRead: async (messageId) => {
    try {
      await messagesApi.markAsRead(messageId)
      
      // Update message in the list
      set(state => ({
        messages: state.messages.map(m => 
          m.id === messageId 
            ? { ...m, readAt: new Date().toISOString() }
            : m
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
        currentMessage: state.currentMessage?.root?.id === messageId
          ? { ...state.currentMessage, status: 'read', read_at: new Date().toISOString() }
          : state.currentMessage
      }))
      
      // Update unread count
      get().fetchUnreadCount()
      
      return { success: true }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to mark message as read'
      set({ error: errorMessage })
      return { success: false, error: errorMessage }
    }
  },

  // Mark all messages in a conversation as read
  markConversationAsRead: async (partnerId) => {
    try {
      await messagesApi.markConversationAsRead(partnerId)
      
      // Update all messages from this partner as read
      const readAt = new Date().toISOString()
      set(state => ({
        messages: state.messages.map(m => 
          (m.sender_id === partnerId || m.senderId === partnerId)
            ? { ...m, readAt, read_at: readAt }
            : m
        ),
        // Update conversations list to clear unread badge
        conversations: state.conversations.map(c => 
          c.partner_id === partnerId || c.contact?.id === partnerId
            ? { ...c, unread_count: 0, unreadCount: 0 }
            : c
        )
      }))
      
      // Refresh unread count
      get().fetchUnreadCount()
      
      return { success: true }
    } catch (error) {
      console.error('Failed to mark conversation as read:', error)
      return { success: false, error: error.message }
    }
  },

  // Fetch unread count (uses messages list to calculate)
  fetchUnreadCount: async () => {
    try {
      const response = await messagesApi.getMessages({})
      const messages = response.messages || []
      const unreadCount = messages.filter(m => !m.readAt && !m.read_at).length
      set({ unreadCount })
      return { success: true, count: unreadCount }
    } catch (error) {
      // Silently fail - don't show error for notification count
      console.error('Failed to fetch unread count:', error)
      return { success: false, error: error.message }
    }
  },

  // Fetch conversations
  fetchConversations: async () => {
    set({ isLoading: true, error: null })
    
    try {
      console.log('[Messages Store] Fetching conversations...')
      const response = await messagesApi.getConversations()
      const data = response?.data || response || {}
      // API returns { success: true, data: [...conversations] } 
      // so conversations are in data.data or just data if it's an array
      const conversations = Array.isArray(data) ? data : (data.data || data.conversations || [])
      
      console.log('[Messages Store] Conversations response:', conversations?.length, conversations)
      set({ 
        conversations,
        isLoading: false 
      })
      return { success: true, data: conversations }
    } catch (error) {
      console.error('[Messages Store] Failed to fetch conversations:', error, error.response?.data)
      set({ 
        conversations: [],
        isLoading: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch conversations'
      })
      return { success: false, error: error.response?.data?.error || error.message || 'Failed to fetch conversations' }
    }
  },

  // Delete conversation (soft delete)
  deleteConversation: async (conversationId) => {
    try {
      // Optimistically remove from list
      set(state => ({
        conversations: state.conversations.filter(c => c.id !== conversationId)
      }))
      
      await messagesApi.deleteConversation(conversationId)
      return { success: true }
    } catch (error) {
      // Revert on failure - refetch conversations
      get().fetchConversations()
      console.error('[Messages Store] Failed to delete conversation:', error)
      return { success: false, error: error.response?.data?.error || error.message }
    }
  },

  // Archive conversation
  archiveConversation: async (conversationId) => {
    try {
      set(state => ({
        conversations: state.conversations.filter(c => c.id !== conversationId)
      }))
      
      await messagesApi.archiveConversation(conversationId, true)
      return { success: true }
    } catch (error) {
      get().fetchConversations()
      return { success: false, error: error.response?.data?.error || error.message }
    }
  },

  // Fetch contacts
  fetchContacts: async () => {
    try {
      const response = await messagesApi.getContacts()
      const data = response?.data || response || {}
      const contacts = data.contacts || data.data?.contacts || []
      
      set({ contacts })
      return { success: true, data }
    } catch (error) {
      console.error('[Messages Store] Failed to fetch contacts:', error)
      set({ contacts: [], error: error.response?.data?.error || error.message || 'Failed to fetch contacts' })
      return { success: false, error: error.response?.data?.error || error.message || 'Failed to fetch contacts' }
    }
  },

  // Get messages between two users (conversation view)
  getConversationMessages: async (partnerId, page = 1) => {
    set({ isLoading: true, error: null })
    
    try {
      // This would need a specific endpoint or filtering logic
      // For now, we'll filter from all messages
      const response = await messagesApi.getMessages({ page, per_page: 50, partnerId })
      const data = response.data || response
      
      // Filter messages for this conversation
      const conversationMessages = (data.messages || []).filter(msg => 
        (msg.sender_id === partnerId) || (msg.recipient_id === partnerId)
      )
      
      set({ 
        messages: conversationMessages,
        isLoading: false 
      })
      
      return { success: true, data: { messages: conversationMessages } }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch conversation'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Format message date
  formatMessageDate: (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now - date) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60))
      return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString()
    }
  },

  // Clear current message
  clearCurrentMessage: () => set({ currentMessage: null }),

  // =====================================================
  // ECHO AI TEAMMATE METHODS
  // =====================================================

  // Fetch Echo contact for the current org
  fetchEchoContact: async () => {
    try {
      const response = await messagesApi.getContacts()
      // API returns { contacts } or { data: { contacts } }
      const contacts = response?.contacts || response?.data?.contacts || []
      
      console.log('[Messages Store] Fetched contacts:', contacts.length, 'contacts')
      console.log('[Messages Store] Looking for Echo (is_ai=true or contact_type=ai)...')
      
      // Find Echo contact (is_ai = true)
      const echoContact = contacts.find(c => c.is_ai === true || c.contact_type === 'ai')
      
      if (echoContact) {
        console.log('[Messages Store] ✅ Found Echo contact:', echoContact)
      } else {
        console.warn('[Messages Store] ❌ No Echo contact found in', contacts.length, 'contacts')
        console.log('[Messages Store] Sample contact:', contacts[0])
      }
      
      set({ echoContact, contacts })
      return { success: true, data: echoContact }
    } catch (error) {
      console.error('[Messages Store] Failed to fetch Echo contact:', error)
      return { success: false, error: error.message }
    }
  },

  // Fetch messages with Echo from Signal API (persistent conversations)
  fetchEchoMessages: async () => {
    const { echoContact } = get()
    if (!echoContact) {
      await get().fetchEchoContact()
    }
    
    const echo = get().echoContact
    if (!echo) {
      return { success: false, error: 'Echo contact not found' }
    }
    
    try {
      // Fetch Echo conversations from Signal API (where they're actually stored)
      const conversations = await echoApi.listConversations({ limit: 10 })
      
      // If no conversations exist yet, return empty
      if (!conversations || conversations.length === 0) {
        console.log('[Messages] No Echo conversations found')
        set({ echoMessages: [] })
        return { success: true, data: [] }
      }
      
      // Get the most recent conversation with its messages
      const latestConversation = conversations[0]
      const conversationData = await echoApi.getConversation(latestConversation.id)
      
      // Get current user for sender matching
      const currentUser = await get().getCurrentUser()
      
      // Transform Signal API messages to match our format
      const echoMessages = (conversationData.messages || []).map(m => ({
        id: m.id,
        content: m.content,
        sender_id: m.role === 'user' ? currentUser?.id : echo.id,
        recipient_id: m.role === 'user' ? echo.id : currentUser?.id,
        sender: m.role === 'user' 
          ? { id: currentUser?.id, name: currentUser?.name, avatar: currentUser?.avatar }
          : { id: echo.id, name: 'Echo', is_ai: true },
        created_at: m.created_at,
        thread_type: 'echo',
        is_echo_response: m.role === 'assistant'
      }))
      
      set({ 
        echoMessages,
        echoConversationId: latestConversation.id
      })
      console.log('[Messages] Loaded', echoMessages.length, 'Echo messages from Signal API')
      return { success: true, data: echoMessages }
    } catch (error) {
      console.error('[Messages Store] Failed to fetch Echo messages:', error)
      return { success: false, error: error.message }
    }
  },

  // Send message to Echo
  sendToEcho: async (messageData) => {
    const { echoContact } = get()
    if (!echoContact) {
      await get().fetchEchoContact()
    }
    
    const echo = get().echoContact
    if (!echo) {
      return { success: false, error: 'Echo contact not found' }
    }
    
    // Get current user from Supabase auth
    const currentUser = await get().getCurrentUser()
    
    // Add optimistic user message with proper sender info
    const tempId = `temp_${Date.now()}`
    const userMessage = {
      id: tempId,
      sender_id: currentUser?.id,
      sender: {
        id: currentUser?.id,
        name: currentUser?.name || currentUser?.email?.split('@')[0],
        avatar: currentUser?.avatar
      },
      recipient_id: echo.id,
      content: messageData.content,
      subject: messageData.subject || 'Echo Conversation',
      created_at: new Date().toISOString(),
      thread_type: 'echo',
      is_echo_response: false
    }
    
    set(state => ({
      echoMessages: [...state.echoMessages, userMessage],
      echoTyping: true // Show typing indicator
    }))
    
    try {
      // Portal API routes Echo messages to Signal API
      const response = { data: await messagesApi.sendMessage({
        recipientId: echo.id,
        content: messageData.content,
        subject: messageData.subject || 'Echo Conversation',
        projectId: messageData.projectId,
        pageContext: messageData.pageContext // Pass page context for Echo awareness
      })}
      
      // Response now includes both userMessage and echoMessage
      const serverUserMessage = response.data.userMessage
      const echoMessage = response.data // The echo message is the main response
      
      set(state => {
        const newMessages = state.echoMessages
          .filter(m => m.id !== tempId)
        
        // Add server version of user message
        if (serverUserMessage) {
          newMessages.push({
            ...serverUserMessage,
            sender_id: serverUserMessage.sender_id || serverUserMessage.senderId,
            recipient_id: serverUserMessage.recipient_id || serverUserMessage.recipientId,
            created_at: serverUserMessage.created_at || serverUserMessage.createdAt
          })
        }
        
        // Add Echo's response
        newMessages.push({
          ...echoMessage,
          id: echoMessage.id,
          sender_id: echo.id,
          recipient_id: currentUser?.id,
          content: echoMessage.content,
          created_at: echoMessage.created_at || echoMessage.createdAt || new Date().toISOString(),
          thread_type: 'echo',
          is_echo_response: true,
          sender: {
            id: echo.id,
            name: 'Echo',
            is_ai: true
          }
        })
        
        return {
          echoMessages: newMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
          echoTyping: false,
          echoConversationId: echoResponse?.conversationId || state.echoConversationId
        }
      })
      
      return { success: true, data: response.data }
    } catch (error) {
      // Remove temp message on error
      set(state => ({
        echoMessages: state.echoMessages.filter(m => m.id !== tempId),
        echoTyping: false,
        error: error.response?.data?.error || error.message || 'Failed to send message to Echo'
      }))
      return { success: false, error: error.response?.data?.error || error.message || 'Failed to send message to Echo' }
    }
  },

  // Send message to Echo using Signal API (non-streaming)
  chatWithEcho: async (message, history = []) => {
    set({ echoTyping: true })
    
    try {
      // Call Signal API directly for AI chat
      const response = await echoApi.chat({
        message,
        conversationId: get().echoConversationId
      })
      
      const echoResponse = {
        id: `echo_${Date.now()}`,
        content: response.response,
        suggestions: response.suggestions,
        conversationId: response.conversationId,
        usage: response.usage
      }
      
      set({
        echoTyping: false,
        echoConversationId: response.conversationId
      })
      
      return { success: true, data: echoResponse }
    } catch (error) {
      set({ echoTyping: false })
      return { success: false, error: error.response?.data?.error || error.message || 'Echo encountered an error' }
    }
  },

  // Stream response from Echo via SSE (true streaming from Signal API)
  // After streaming, persists both messages to Portal API for unified inbox
  // @param message - The user's message
  // @param options - { userId, onToken, onComplete, onError, pageContext }
  streamEchoResponse: async (message, options = {}) => {
    const { userId, onToken, onComplete, onError, pageContext } = options
    
    // Ensure Echo contact is loaded
    let echo = get().echoContact
    if (!echo) {
      console.log('[Echo] No echoContact, fetching...')
      await get().fetchEchoContact()
      echo = get().echoContact
    }
    
    if (!echo) {
      console.error('[Echo] Echo contact not found after fetch')
      onError?.('Echo contact not found')
      return
    }

    console.log('[Echo] Streaming response for message:', message.substring(0, 50))

    // Add user message optimistically - use actual user ID so isOwn works correctly
    const tempUserId = `temp_user_${Date.now()}`
    const currentUserId = userId || get().currentUserId
    
    console.log('[Echo] User ID for message:', { 
      passedUserId: userId, 
      storeUserId: get().currentUserId, 
      resolvedUserId: currentUserId,
      echoId: echo.id
    })
    
    if (!currentUserId) {
      console.warn('[Echo] No user ID available for message attribution')
    }
    
    const userMessage = {
      id: tempUserId,
      sender_id: currentUserId, // Use real user ID for correct bubble alignment
      recipient_id: echo.id,
      content: message,
      created_at: new Date().toISOString(),
      thread_type: 'echo',
      is_echo_response: false
    }

    set(state => ({
      echoMessages: [...state.echoMessages, userMessage],
      echoTyping: true
    }))

    // Track streaming content for the final message
    let streamedContent = ''
    let finalConversationId = get().echoConversationId

    // Add a placeholder message for streaming content
    const echoResponseId = `echo_${Date.now()}`
    const streamingMessage = {
      id: echoResponseId,
      sender_id: echo.id,
      recipient_id: currentUserId || 'current_user', // Use real user ID
      content: '',
      created_at: new Date().toISOString(),
      thread_type: 'echo',
      is_echo_response: true,
      streaming: true,
      sender: {
        id: echo.id,
        name: 'Echo',
        is_ai: true
      }
    }

    set(state => ({
      echoMessages: [...state.echoMessages, streamingMessage]
    }))

    // Call Signal API directly with true SSE streaming
    await echoApi.streamChat(
      {
        message,
        conversationId: get().echoConversationId,
        pageContext // Pass page context for Echo awareness
      },
      {
        onToken: (token) => {
          streamedContent += token
          // Update the streaming message with new content
          set(state => ({
            echoMessages: state.echoMessages.map(m =>
              m.id === echoResponseId
                ? { ...m, content: streamedContent }
                : m
            )
          }))
          onToken?.(token)
        },
        onComplete: async ({ response, conversationId }) => {
          finalConversationId = conversationId || finalConversationId
          const finalContent = streamedContent || response
          
          // Mark message as complete (no longer streaming)
          set(state => ({
            echoMessages: state.echoMessages.map(m =>
              m.id === echoResponseId
                ? { ...m, content: finalContent, streaming: false }
                : m
            ),
            echoTyping: false,
            echoConversationId: finalConversationId
          }))

          // Persist to Portal API for unified inbox persistence
          // This saves both user message and Echo response without triggering new AI
          try {
            await messagesApi.saveEchoMessages({
              userMessage: message,
              echoResponse: finalContent,
              conversationId: finalConversationId
            })
            console.log('[Echo] Messages persisted to Portal API')
          } catch (persistError) {
            console.warn('[Echo] Failed to persist to Portal API:', persistError.message)
            // Non-blocking - streaming still worked, just won't appear in DB history
          }

          onComplete?.({ response: finalContent, conversationId: finalConversationId })
        },
        onError: (error) => {
          console.error('[Echo] Stream error:', error)
          // Remove the failed streaming message
          set(state => ({
            echoMessages: state.echoMessages.filter(m => m.id !== echoResponseId),
            echoTyping: false
          }))
          onError?.(error)
        },
        onToolCall: (toolCall) => {
          console.log('[Echo] Tool call:', toolCall)
          // Could add visual indicator for tool usage
        }
      }
    )
  },

  // Clear Echo typing state
  clearEchoTyping: () => set({ echoTyping: false }),

  // Reset Echo conversation
  clearEchoConversation: () => set({
    echoMessages: [],
    echoConversationId: null,
    echoTyping: false
  }),

  // Check if a contact is Echo
  isEchoContact: (contact) => {
    return contact?.is_ai === true || contact?.contact_type === 'ai'
  },

  // Get conversations with Echo pinned at top
  getConversationsWithEcho: () => {
    const { conversations, echoContact } = get()
    
    if (!echoContact) return conversations
    
    // Create Echo thread if not exists
    const hasEchoThread = conversations.some(c => 
      c.contact?.is_ai || c.thread_type === 'echo'
    )
    
    if (!hasEchoThread) {
      const echoThread = {
        id: 'echo-thread',
        name: 'Echo',
        contact: echoContact,
        thread_type: 'echo',
        is_ai: true,
        lastMessage: 'Ask me anything...',
        lastMessageAt: new Date().toISOString(),
        unreadCount: 0
      }
      
      return [echoThread, ...conversations]
    }
    
    // Sort with Echo first
    return [...conversations].sort((a, b) => {
      const aIsEcho = a.contact?.is_ai || a.thread_type === 'echo'
      const bIsEcho = b.contact?.is_ai || b.thread_type === 'echo'
      
      if (aIsEcho && !bIsEcho) return -1
      if (!aIsEcho && bIsEcho) return 1
      
      return new Date(b.lastMessageAt || b.updated_at) - new Date(a.lastMessageAt || a.updated_at)
    })
  },

  // =====================================================
  // LIVE CHAT (ENGAGE) METHODS
  // =====================================================

  // Live chat state
  liveChatSessions: [],
  currentLiveChatSession: null,
  liveChatMessages: [],
  liveChatLoading: false,

  // Fetch live chat sessions (from unified inbox)
  fetchLiveChatSessions: async () => {
    set({ liveChatLoading: true })
    
    try {
      const response = await messagesApi.getConversations()
      const allConversations = response.conversations || []
      
      // Filter to just live chat sessions
      const liveChatSessions = allConversations.filter(c => 
        c.thread_source === 'engage' || c.type === 'live_chat'
      )
      
      set({ 
        liveChatSessions,
        liveChatLoading: false 
      })
      
      return { success: true, data: liveChatSessions }
    } catch (error) {
      console.error('[Messages Store] Failed to fetch live chat sessions:', error)
      set({ liveChatLoading: false })
      return { success: false, error: error.message }
    }
  },

  // Get a single live chat session with messages
  fetchLiveChatSession: async (sessionId) => {
    set({ liveChatLoading: true })
    
    try {
      const session = await engageApi.getChatSession(sessionId)
      
      set({ 
        currentLiveChatSession: session,
        liveChatMessages: session?.messages || [],
        liveChatLoading: false 
      })
      
      return { success: true, data: session }
    } catch (error) {
      console.error('[Messages Store] Failed to fetch live chat session:', error)
      set({ liveChatLoading: false })
      return { success: false, error: error.message }
    }
  },

  // Send message in live chat session
  sendLiveChatMessage: async (sessionId, content) => {
    const tempId = `temp_${Date.now()}`
    
    // Optimistic update
    const tempMessage = {
      id: tempId,
      role: 'agent',
      content,
      created_at: new Date().toISOString()
    }
    
    set(state => ({
      liveChatMessages: [...state.liveChatMessages, tempMessage]
    }))
    
    try {
      // Portal API uses WebSocket for live chat, but also has HTTP fallback
      const response = { data: { message: await engageApi.sendChatMessage(sessionId, content) } }
      
      // Replace temp message with real one
      set(state => ({
        liveChatMessages: state.liveChatMessages.map(m =>
          m.id === tempId ? response.data.message : m
        )
      }))
      
      return { success: true, data: response.data }
    } catch (error) {
      // Remove temp message on error
      set(state => ({
        liveChatMessages: state.liveChatMessages.filter(m => m.id !== tempId)
      }))
      console.error('[Messages Store] Failed to send live chat message:', error)
      return { success: false, error: error.message }
    }
  },

  // Update live chat session status (handoff, close, etc.)
  updateLiveChatStatus: async (sessionId, status) => {
    try {
      let response
      
      if (status === 'closed') {
        response = { data: await engageApi.closeChatSession(sessionId) }
      } else {
        // For 'human' status, use assign endpoint
        response = { data: await engageApi.assignChatSession(sessionId) }
      }
      
      // Update local state
      set(state => ({
        liveChatSessions: state.liveChatSessions.map(s =>
          s.id === sessionId ? { ...s, chat_status: status } : s
        ),
        currentLiveChatSession: state.currentLiveChatSession?.id === sessionId
          ? { ...state.currentLiveChatSession, chat_status: status }
          : state.currentLiveChatSession,
        // Remove from pending handoffs if claiming
        pendingHandoffs: status === 'human' || status === 'closed'
          ? state.pendingHandoffs.filter(h => h.id !== sessionId)
          : state.pendingHandoffs
      }))
      
      return { success: true, data: response.data }
    } catch (error) {
      console.error('[Messages Store] Failed to update live chat status:', error)
      return { success: false, error: error.message }
    }
  },
  
  // Claim a pending handoff (shortcut for setting status to 'human')
  claimHandoff: async (sessionId) => {
    return get().updateLiveChatStatus(sessionId, 'human')
  },
  
  // Dismiss a handoff notification without claiming
  dismissHandoff: (sessionId) => {
    set(state => ({
      pendingHandoffs: state.pendingHandoffs.filter(h => h.id !== sessionId)
    }))
  },
  
  // Toggle notification sounds
  toggleSound: () => set(state => ({ soundEnabled: !state.soundEnabled })),

  // Clear current live chat
  clearCurrentLiveChat: () => set({
    currentLiveChatSession: null,
    liveChatMessages: []
  }),

  // Check if a conversation is a live chat
  isLiveChat: (conversation) => {
    return conversation?.thread_source === 'engage' || 
           conversation?.type === 'live_chat' ||
           conversation?.engage_session_id != null
  },

  // Get unified inbox (combines Echo, Live Chats, and Team conversations)
  getUnifiedInbox: () => {
    const { conversations, echoContact, liveChatSessions } = get()
    
    // Start with all conversations
    let unified = [...conversations]
    
    // Ensure Echo is at top
    const hasEchoThread = unified.some(c => 
      c.contact?.is_ai || c.thread_type === 'echo'
    )
    
    if (!hasEchoThread && echoContact) {
      unified.unshift({
        id: 'echo-thread',
        name: 'Echo',
        contact: echoContact,
        thread_type: 'echo',
        is_ai: true,
        lastMessage: 'Ask me anything...',
        lastMessageAt: new Date().toISOString(),
        unreadCount: 0
      })
    }
    
    // Sort: Echo first, then by recency
    return unified.sort((a, b) => {
      const aIsEcho = a.contact?.is_ai || a.thread_type === 'echo'
      const bIsEcho = b.contact?.is_ai || b.thread_type === 'echo'
      
      if (aIsEcho && !bIsEcho) return -1
      if (!aIsEcho && bIsEcho) return 1
      
      // Then pending handoffs
      const aIsPending = a.chat_status === 'pending_handoff'
      const bIsPending = b.chat_status === 'pending_handoff'
      
      if (aIsPending && !bIsPending) return -1
      if (!aIsPending && bIsPending) return 1
      
      // Then by recency
      return new Date(b.lastMessageAt || b.updated_at) - new Date(a.lastMessageAt || a.updated_at)
    })
  },

  // =====================================================
  // REALTIME SUBSCRIPTIONS (Socket.io)
  // =====================================================

  // Set the active conversation (for targeted updates)
  setActiveConversation: (conversationId) => {
    set({ activeConversationId: conversationId })
  },

  // Subscribe to realtime message updates via Socket.io
  subscribeToMessages: async (userId, orgId, userName = 'User', token) => {
    // Resolve auth token and user context if not provided
    let authToken = token
    let resolvedUserId = userId
    let resolvedOrgId = orgId
    let resolvedUserName = userName

    if (!authToken || !resolvedUserId || !resolvedOrgId) {
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData?.session

      if (session) {
        const authUser = session.user
        authToken = authToken || session.access_token
        resolvedUserId = resolvedUserId || authUser?.id
        resolvedOrgId =
          resolvedOrgId || authUser?.user_metadata?.org_id || authUser?.app_metadata?.org_id
        resolvedUserName =
          resolvedUserName || authUser?.user_metadata?.name || authUser?.email || 'User'
      }
    }

    if (!authToken || !resolvedUserId || !resolvedOrgId) {
      console.warn('[Socket] Missing auth token or user/org context, skipping socket connect')
      return
    }

    // Check if already connected
    if (isConnected()) {
      console.log('[Socket] Already connected')
      return
    }

    console.log('[Socket] Connecting for user:', resolvedUserId, 'org:', resolvedOrgId)
    
    // Store current user info
    set({ currentUserId: resolvedUserId, currentUserName: resolvedUserName })

    // Set up event handlers before connecting
    setHandlers({
      onConnect: () => {
        console.log('[Socket] Connected and authenticated')
        set({ realtimeConnected: true })
        // Start presence heartbeat
        startHeartbeat()
        // Flush any queued messages
        get().flushOfflineQueue()
      },
      
      onDisconnect: (reason) => {
        console.log('[Socket] Disconnected:', reason)
        set({ realtimeConnected: false })
        stopHeartbeat()
      },
      
      // Handle new messages
      onMessage: (message) => {
        const state = get()
        
        // Skip if this message was sent by the current user (already optimistically added)
        if (message.sender_id === resolvedUserId) {
          // But DO update if we have a temp ID to replace
          const tempMessage = state.messages.find(m => 
            m._optimistic && m.content === message.content
          )
          if (tempMessage) {
            set(state => ({
              messages: state.messages.map(m =>
                m.id === tempMessage.id 
                  ? { ...message, status: 'sent', _optimistic: false }
                  : m
              ),
              pendingMessages: state.pendingMessages.filter(id => id !== tempMessage.id)
            }))
          }
          return
        }

        // Handle Echo messages
        if (message.thread_type === 'echo' || message.is_echo_response) {
          console.log('[Socket] Echo message received')
          set(state => ({
            echoMessages: [...state.echoMessages, message],
            echoTyping: false,
            unreadCount: state.unreadCount + 1
          }))
          // Play notification sound
          if (state.soundEnabled) {
            playNotificationSound('message')
          }
          // Acknowledge delivery
          emitMessageDelivered(message.id)
          return
        }

        // Handle regular messages
        set(state => ({
          messages: [message, ...state.messages],
          unreadCount: state.unreadCount + 1
        }))
        
        // Acknowledge delivery to sender
        emitMessageDelivered(message.id)
        
        // Play notification sound
        if (state.soundEnabled) {
          playNotificationSound('message')
        }

        // Update conversation list
        get().fetchConversations()
      },
      
      // Handle message edits
      onMessageEdited: ({ messageId, content, editedAt }) => {
        set(state => ({
          messages: state.messages.map(m =>
            m.id === messageId ? { ...m, content, edited_at: editedAt } : m
          ),
          echoMessages: state.echoMessages.map(m =>
            m.id === messageId ? { ...m, content, edited_at: editedAt } : m
          )
        }))
      },
      
      // Handle message deletions
      onMessageDeleted: ({ messageId }) => {
        set(state => ({
          messages: state.messages.map(m =>
            m.id === messageId ? { ...m, content: '[Message deleted]', deleted_at: new Date().toISOString() } : m
          )
        }))
      },
      
      // Handle read receipts
      onMessageRead: ({ messageId, readBy, readAt, status }) => {
        set(state => ({
          messages: state.messages.map(m =>
            m.id === messageId ? { ...m, read_at: readAt, readBy, status: status || 'read' } : m
          )
        }))
      },
      
      // Handle delivery confirmations (message reached recipient's device)
      onMessageDelivered: ({ messageId, deliveredTo, deliveredAt, status }) => {
        set(state => ({
          messages: state.messages.map(m =>
            m.id === messageId ? { ...m, delivered_at: deliveredAt, deliveredTo, status: status || 'delivered' } : m
          )
        }))
      },
      
      // Handle typing indicators
      onTyping: ({ conversationId, userId: typingUserId, userName: typingUserName, isTyping }) => {
        if (typingUserId === resolvedUserId) return // Ignore own typing
        
        if (isTyping) {
          set(state => ({
            typingUsers: {
              ...state.typingUsers,
              [typingUserId]: {
                name: typingUserName,
                conversationId,
                timestamp: Date.now()
              }
            }
          }))
        } else {
          set(state => {
            const newTypingUsers = { ...state.typingUsers }
            delete newTypingUsers[typingUserId]
            return { typingUsers: newTypingUsers }
          })
        }
      },
      
      // Handle presence updates
      onPresence: ({ userId: presenceUserId, status, lastSeen }) => {
        set(state => ({
          contacts: state.contacts.map(c =>
            c.id === presenceUserId ? { ...c, status, lastSeen } : c
          )
        }))
      },
      
      // Handle bulk presence (on connect)
      onPresenceBulk: ({ users }) => {
        set(state => ({
          contacts: state.contacts.map(c => ({
            ...c,
            status: users[c.id] || 'offline'
          }))
        }))
      },
      
      // Handle reactions
      onReactionAdded: ({ messageId, emoji, userId: reactUserId, userName: reactUserName }) => {
        set(state => ({
          messages: state.messages.map(m => {
            if (m.id !== messageId) return m
            const reactions = m.reactions || []
            return {
              ...m,
              reactions: [...reactions, { emoji, user_id: reactUserId, user_name: reactUserName }]
            }
          })
        }))
      },
      
      onReactionRemoved: ({ messageId, emoji, userId: reactUserId }) => {
        set(state => ({
          messages: state.messages.map(m => {
            if (m.id !== messageId) return m
            return {
              ...m,
              reactions: (m.reactions || []).filter(r => 
                !(r.emoji === emoji && r.user_id === reactUserId)
              )
            }
          })
        }))
      },
      
      // Handle engage (live chat) messages
      onEngageMessage: (message) => {
        const state = get()
        
        // Only add if it's for the current live chat session
        if (state.currentLiveChatSession?.id === message.session_id) {
          // Skip if already have this message
          if (state.liveChatMessages.find(m => m.id === message.id)) {
            return
          }
          
          set(state => ({
            liveChatMessages: [...state.liveChatMessages, message]
          }))
        }
        
        // Refresh sessions list
        get().fetchLiveChatSessions()
      },
      
      // Handle engage session updates (handoffs, status changes)
      onEngageSession: (session) => {
        const state = get()
        const oldSession = state.liveChatSessions.find(s => s.id === session.id)
        
        // Check if this is a new handoff request
        const isNewHandoff = session.chat_status === 'pending_handoff' && 
          (!oldSession || oldSession.chat_status !== 'pending_handoff')
        
        if (isNewHandoff) {
          console.log('[Socket] New handoff request:', session)
          
          const exists = state.pendingHandoffs.find(h => h.id === session.id)
          if (!exists) {
            set(state => ({
              pendingHandoffs: [...state.pendingHandoffs, session],
              unreadCount: state.unreadCount + 1
            }))
            
            // Play urgent notification sound
            if (state.soundEnabled) {
              playNotificationSound('livechat')
            }
          }
        }
        
        // Check if handoff was resolved
        const wasHandoff = oldSession?.chat_status === 'pending_handoff'
        const isResolved = session.chat_status === 'human' || session.chat_status === 'closed'
        
        if (wasHandoff && isResolved) {
          set(state => ({
            pendingHandoffs: state.pendingHandoffs.filter(h => h.id !== session.id)
          }))
        }
        
        // Update sessions
        set(state => ({
          liveChatSessions: state.liveChatSessions.map(s =>
            s.id === session.id ? { ...s, ...session } : s
          ),
          currentLiveChatSession: state.currentLiveChatSession?.id === session.id
            ? { ...state.currentLiveChatSession, ...session }
            : state.currentLiveChatSession
        }))
      }
    })

    // Connect to Socket.io
    connectSocket(authToken)
    
    // Set up interval to clear stale typing indicators
    setInterval(() => {
      get().clearStaleTyping()
    }, 2000)
  },

  // Unsubscribe from realtime updates
  unsubscribeFromMessages: async () => {
    console.log('[Socket] Disconnecting...')
    stopHeartbeat()
    disconnectSocket()
    set({ realtimeConnected: false, typingUsers: {}, pendingHandoffs: [] })
  },

  // Clear all data (for logout)
  clearAll: () => {
    // Disconnect socket when clearing
    stopHeartbeat()
    disconnectSocket()
    
    // Clear IndexedDB cache
    messagesCache.clear()
    
    set({
      messages: [],
      conversations: [],
      contacts: [],
      currentMessage: null,
      unreadCount: 0,
      error: null,
      echoContact: null,
      echoMessages: [],
      echoTyping: false,
      echoConversationId: null,
      liveChatSessions: [],
      currentLiveChatSession: null,
      liveChatMessages: [],
      liveChatLoading: false,
      pendingHandoffs: [],
      realtimeConnected: false,
      activeConversationId: null,
      typingUsers: {},
      pendingMessages: [],
      offlineQueue: [],
      currentUserId: null,
      currentUserName: null,
      hasPrefetched: false,
      isPrefetching: false,
      pagination: {
        page: 1,
        pages: 1,
        per_page: 20,
        total: 0,
        has_next: false,
        has_prev: false
      }
    })
  }
}))

export default useMessagesStore

// Utility function to open a conversation bubble from anywhere in the app
export function openChatBubble(conversationId) {
  const event = new CustomEvent('openChatBubble', {
    detail: { conversationId }
  })
  window.dispatchEvent(event)
}
