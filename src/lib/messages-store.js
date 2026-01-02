import { create } from 'zustand'
import api from './api'
import { supabase } from './supabase-auth'

// Realtime subscription reference (kept outside store to persist across re-renders)
let realtimeSubscription = null
let typingChannel = null
let engageChatSubscription = null
let engageSessionsSubscription = null

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
  
  // Current user info (for optimistic messages and typing)
  currentUserId: null,
  currentUserName: null,
  
  // Data loading state - tracks if initial data has been prefetched
  hasPrefetched: false,
  isPrefetching: false,

  // Clear error
  clearError: () => set({ error: null }),
  
  // =====================================================
  // PREFETCH - Load all messaging data upfront
  // =====================================================
  
  // Prefetch all messaging data (call on app mount, not widget open)
  prefetchAll: async () => {
    const state = get()
    
    // Skip if already prefetched or currently prefetching
    if (state.hasPrefetched || state.isPrefetching) {
      return { success: true, cached: true }
    }
    
    set({ isPrefetching: true })
    
    try {
      // Fetch Echo contact first (needed for Echo messages)
      await get().fetchEchoContact()
      
      // Fetch all in parallel for speed
      const results = await Promise.allSettled([
        get().fetchConversations(),
        get().fetchContacts(),
        get().fetchMessages(),
        get().fetchEchoMessages() // Persist Echo history
      ])
      
      // Check if all succeeded
      const allSuccess = results.every(r => r.status === 'fulfilled' && r.value?.success !== false)
      
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
  
  // Send typing indicator to a conversation
  sendTypingIndicator: (conversationId, isTyping = true) => {
    if (!typingChannel || !conversationId) return
    
    const state = get()
    // Get user info from auth store (we'll need to pass this in)
    const userId = state.currentUserId
    const userName = state.currentUserName
    
    typingChannel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        conversationId,
        userId,
        userName,
        isTyping,
        timestamp: Date.now()
      }
    })
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

  // Fetch messages
  fetchMessages: async (filters = {}) => {
    set({ isLoading: true, error: null })
    
    try {
      const params = new URLSearchParams()
      if (filters.projectId) params.append('projectId', filters.projectId)
      if (filters.unreadOnly) params.append('unreadOnly', 'true')
      
      const url = `/.netlify/functions/messages-list${params.toString() ? `?${params.toString()}` : ''}`
      const response = await api.get(url)
      
      // Calculate unread count - check both readAt (camelCase) and read_at (snake_case)
      const unreadCount = response.data.messages.filter(m => !m.readAt && !m.read_at).length
      
      set({ 
        messages: response.data.messages || [],
        unreadCount,
        isLoading: false 
      })
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch messages'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Fetch single message thread
  fetchMessage: async (messageId) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.get(`/.netlify/functions/messages-thread/${messageId}`)
      set({ 
        currentMessage: response.data.thread,
        isLoading: false 
      })
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch message thread'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
    }
  },

  // Send new message (with optimistic update)
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
    
    try {
      const response = await api.post('/.netlify/functions/messages-send', messageData)
      
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
        error: error.response?.data?.error || 'Failed to send message'
      }))
      return { success: false, error: error.response?.data?.error || 'Failed to send message' }
    }
  },

  // Reply to message
  replyToMessage: async (parentId, recipientId, content) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.post('/.netlify/functions/messages-send', {
        parentId,
        recipientId,
        content
      })
      
      // Refresh the thread
      if (get().currentMessage) {
        await get().fetchMessage(parentId)
      }
      
      set({ isLoading: false })
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to send reply'
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
      await api.post(`/.netlify/functions/messages-read/${messageId}`)
      
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
      const errorMessage = error.response?.data?.error || 'Failed to mark message as read'
      set({ error: errorMessage })
      return { success: false, error: errorMessage }
    }
  },

  // Fetch unread count (uses messages list to calculate)
  fetchUnreadCount: async () => {
    try {
      // Use the messages list endpoint to get unread count
      const response = await api.get('/.netlify/functions/messages-list')
      const messages = response.data.messages || []
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
      const response = await api.get('/.netlify/functions/messages-conversations')
      set({ 
        conversations: response.data.conversations || [],
        isLoading: false 
      })
      return { success: true, data: response.data }
    } catch (error) {
      console.error('[Messages Store] Failed to fetch conversations:', error)
      set({ 
        conversations: [],
        isLoading: false,
        error: error.response?.data?.error || 'Failed to fetch conversations'
      })
      return { success: false, error: error.response?.data?.error || 'Failed to fetch conversations' }
    }
  },

  // Fetch contacts
  fetchContacts: async () => {
    try {
      const response = await api.get('/.netlify/functions/messages-contacts')
      set({ contacts: response.data.contacts || [] })
      return { success: true, data: response.data }
    } catch (error) {
      console.error('[Messages Store] Failed to fetch contacts:', error)
      set({ contacts: [], error: error.response?.data?.error || 'Failed to fetch contacts' })
      return { success: false, error: error.response?.data?.error || 'Failed to fetch contacts' }
    }
  },

  // Get messages between two users (conversation view)
  getConversationMessages: async (partnerId, page = 1) => {
    set({ isLoading: true, error: null })
    
    try {
      // This would need a specific endpoint or filtering logic
      // For now, we'll filter from all messages
      const response = await api.get(`/messages?page=${page}&per_page=50`)
      
      // Filter messages for this conversation
      const conversationMessages = response.data.messages.filter(msg => 
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
      const response = await api.get('/.netlify/functions/messages-contacts')
      const contacts = response.data.contacts || []
      
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
      
      set({ echoContact })
      return { success: true, data: echoContact }
    } catch (error) {
      console.error('[Messages Store] Failed to fetch Echo contact:', error)
      return { success: false, error: error.message }
    }
  },

  // Fetch messages with Echo
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
      // Fetch Echo thread messages from database
      const response = await api.get('/.netlify/functions/messages-list?threadType=echo')
      const allMessages = response.data.messages || []
      
      // Transform and sort messages (API returns mixed case)
      const echoMessages = allMessages.map(m => ({
        ...m,
        // Normalize field names
        sender_id: m.sender_id || m.senderId,
        recipient_id: m.recipient_id || m.recipientId,
        created_at: m.created_at || m.createdAt,
        thread_type: m.thread_type || m.threadType || 'echo',
        read_at: m.read_at || m.readAt
      })).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      
      set({ echoMessages })
      console.log('[Messages] Loaded', echoMessages.length, 'Echo messages from database')
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
    
    // Add optimistic user message
    const tempId = `temp_${Date.now()}`
    const userMessage = {
      id: tempId,
      sender_id: 'current_user',
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
      const response = await api.post('/.netlify/functions/messages-send', {
        recipientId: echo.id,
        content: messageData.content,
        subject: messageData.subject || 'Echo Conversation',
        projectId: messageData.projectId
      })
      
      // Replace temp message with real one and add Echo's response
      const realMessage = response.data.message
      const echoResponse = response.data.echoResponse
      
      set(state => {
        const newMessages = state.echoMessages
          .filter(m => m.id !== tempId)
          .concat([{
            ...realMessage,
            id: realMessage.id,
            sender_id: realMessage.senderId,
            recipient_id: realMessage.recipientId,
            created_at: realMessage.createdAt
          }])
        
        // Add Echo's response if present
        if (echoResponse) {
          newMessages.push({
            id: `echo_${Date.now()}`,
            sender_id: echo.id,
            recipient_id: realMessage.senderId,
            content: echoResponse.content,
            subject: realMessage.subject,
            created_at: new Date().toISOString(),
            thread_type: 'echo',
            is_echo_response: true,
            echo_metadata: {
              suggestions: echoResponse.suggestions,
              conversationId: echoResponse.conversationId,
              // Include action if present (openElement, navigate, etc.)
              actions: echoResponse.action ? [{
                type: echoResponse.action.type,
                label: echoResponse.action.label,
                // For openElement actions
                projectId: echoResponse.action.projectId || echoResponse.projectId,
                elementId: echoResponse.action.elementId || echoResponse.elementId,
                elementName: echoResponse.action.elementName,
                // For navigate actions (legacy)
                route: echoResponse.action.route
              }] : []
            },
            sender: {
              id: echo.id,
              name: 'Echo',
              is_ai: true
            }
          })
        }
        
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
        error: error.response?.data?.error || 'Failed to send message to Echo'
      }))
      return { success: false, error: error.response?.data?.error || 'Failed to send message to Echo' }
    }
  },

  // Send message to Echo using the dedicated chat endpoint (for advanced features)
  chatWithEcho: async (message, history = []) => {
    set({ echoTyping: true })
    
    try {
      const response = await api.post('/.netlify/functions/echo-chat', {
        message,
        history,
        conversationId: get().echoConversationId
      })
      
      const echoResponse = {
        id: `echo_${Date.now()}`,
        content: response.data.content,
        suggestions: response.data.suggestions,
        conversationId: response.data.conversationId,
        usage: response.data.usage
      }
      
      set({
        echoTyping: false,
        echoConversationId: response.data.conversationId
      })
      
      return { success: true, data: echoResponse }
    } catch (error) {
      set({ echoTyping: false })
      return { success: false, error: error.response?.data?.error || 'Echo encountered an error' }
    }
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
      const response = await api.get('/.netlify/functions/messages-conversations')
      const allConversations = response.data.conversations || []
      
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
      const response = await api.get(`/.netlify/functions/engage-chat-messages?sessionId=${sessionId}`)
      const session = response.data.session
      
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
      const response = await api.post('/.netlify/functions/engage-chat-messages', {
        sessionId,
        content
      })
      
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
      const response = await api.put('/.netlify/functions/engage-chat-session', {
        sessionId,
        status
      })
      
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
  // REALTIME SUBSCRIPTIONS
  // =====================================================

  // Set the active conversation (for targeted updates)
  setActiveConversation: (conversationId) => {
    set({ activeConversationId: conversationId })
  },

  // Subscribe to realtime message updates
  subscribeToMessages: async (userId, orgId, userName = 'User') => {
    // Don't subscribe if already subscribed
    if (realtimeSubscription) {
      console.log('[Realtime] Already subscribed')
      return
    }

    console.log('[Realtime] Subscribing to messages for org:', orgId)
    
    // Store current user info for typing indicators
    set({ currentUserId: userId, currentUserName: userName })

    // Subscribe to messages table for this org
    realtimeSubscription = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `org_id=eq.${orgId}`
        },
        async (payload) => {
          console.log('[Realtime] New message received:', payload.new)
          const newMessage = payload.new
          const state = get()

          // Skip if this message was sent by the current user (we already added it optimistically)
          if (newMessage.sender_id === userId) {
            console.log('[Realtime] Skipping own message')
            return
          }

          // Fetch sender info
          const { data: sender } = await supabase
            .from('contacts')
            .select('id, name, email, avatar, is_ai, contact_type')
            .eq('id', newMessage.sender_id)
            .single()

          const enrichedMessage = {
            ...newMessage,
            sender,
            created_at: newMessage.created_at
          }

          // Handle Echo messages
          if (newMessage.thread_type === 'echo' || newMessage.is_echo_response) {
            console.log('[Realtime] Echo message received')
            set(state => ({
              echoMessages: [...state.echoMessages, enrichedMessage],
              echoTyping: false,
              unreadCount: state.unreadCount + 1
            }))
            return
          }

          // Handle regular messages - add to messages array
          set(state => ({
            messages: [enrichedMessage, ...state.messages],
            unreadCount: state.unreadCount + 1
          }))

          // Update conversation list (refresh to get correct ordering)
          get().fetchConversations()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `org_id=eq.${orgId}`
        },
        (payload) => {
          console.log('[Realtime] Message updated:', payload.new)
          const updatedMessage = payload.new

          // Update in messages array
          set(state => ({
            messages: state.messages.map(m =>
              m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m
            ),
            echoMessages: state.echoMessages.map(m =>
              m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m
            )
          }))
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status)
        set({ realtimeConnected: status === 'SUBSCRIBED' })
      })

    // Subscribe to engage_chat_messages for live chat realtime updates
    engageChatSubscription = supabase
      .channel('engage-chat-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'engage_chat_messages'
        },
        async (payload) => {
          console.log('[Realtime] New engage chat message:', payload.new)
          const newMessage = payload.new
          const state = get()
          
          // Only add if it's for the current live chat session
          if (state.currentLiveChatSession?.id === newMessage.session_id) {
            // Skip if already have this message
            if (state.liveChatMessages.find(m => m.id === newMessage.id)) {
              return
            }
            
            // Fetch sender info if from agent
            let enrichedMessage = { ...newMessage }
            if (newMessage.sender_id) {
              const { data: sender } = await supabase
                .from('contacts')
                .select('id, name, email, avatar')
                .eq('id', newMessage.sender_id)
                .single()
              enrichedMessage.sender = sender
            }
            
            set(state => ({
              liveChatMessages: [...state.liveChatMessages, enrichedMessage]
            }))
          }
          
          // Also refresh the sessions list to update last message time
          get().fetchLiveChatSessions()
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Engage chat subscription status:', status)
      })
    
    // Subscribe to engage_chat_sessions for handoff notifications
    engageSessionsSubscription = supabase
      .channel('engage-sessions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT and UPDATE
          schema: 'public',
          table: 'engage_chat_sessions'
        },
        async (payload) => {
          const session = payload.new
          const oldSession = payload.old
          const state = get()
          
          // Check if this is a new handoff request
          const isNewHandoff = session.chat_status === 'pending_handoff' && 
            (!oldSession || oldSession.chat_status !== 'pending_handoff')
          
          if (isNewHandoff) {
            console.log('[Realtime] New handoff request:', session)
            
            // Add to pending handoffs if not already there
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
          
          // Check if handoff was resolved (claimed or closed)
          const wasHandoff = oldSession?.chat_status === 'pending_handoff'
          const isResolved = session.chat_status === 'human' || session.chat_status === 'closed'
          
          if (wasHandoff && isResolved) {
            console.log('[Realtime] Handoff resolved:', session.id)
            set(state => ({
              pendingHandoffs: state.pendingHandoffs.filter(h => h.id !== session.id)
            }))
          }
          
          // Update liveChatSessions if we have this session
          set(state => ({
            liveChatSessions: state.liveChatSessions.map(s =>
              s.id === session.id ? { ...s, ...session } : s
            ),
            currentLiveChatSession: state.currentLiveChatSession?.id === session.id
              ? { ...state.currentLiveChatSession, ...session }
              : state.currentLiveChatSession
          }))
          
          // Refresh sessions list
          get().fetchLiveChatSessions()
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Engage sessions subscription status:', status)
      })
    
    // Create typing indicator channel (presence-like broadcast)
    typingChannel = supabase
      .channel(`typing-${orgId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        // Ignore our own typing events
        if (payload.userId === userId) return
        
        if (payload.isTyping) {
          // Add to typing users
          set(state => ({
            typingUsers: {
              ...state.typingUsers,
              [payload.userId]: {
                name: payload.userName,
                conversationId: payload.conversationId,
                timestamp: payload.timestamp
              }
            }
          }))
        } else {
          // Remove from typing users
          set(state => {
            const newTypingUsers = { ...state.typingUsers }
            delete newTypingUsers[payload.userId]
            return { typingUsers: newTypingUsers }
          })
        }
      })
      .subscribe()
    
    // Set up interval to clear stale typing indicators
    setInterval(() => {
      get().clearStaleTyping()
    }, 2000)
  },

  // Unsubscribe from realtime updates
  unsubscribeFromMessages: async () => {
    if (realtimeSubscription) {
      console.log('[Realtime] Unsubscribing from messages')
      await supabase.removeChannel(realtimeSubscription)
      realtimeSubscription = null
    }
    if (typingChannel) {
      console.log('[Realtime] Unsubscribing from typing')
      await supabase.removeChannel(typingChannel)
      typingChannel = null
    }
    if (engageChatSubscription) {
      console.log('[Realtime] Unsubscribing from engage chat')
      await supabase.removeChannel(engageChatSubscription)
      engageChatSubscription = null
    }
    if (engageSessionsSubscription) {
      console.log('[Realtime] Unsubscribing from engage sessions')
      await supabase.removeChannel(engageSessionsSubscription)
      engageSessionsSubscription = null
    }
    set({ realtimeConnected: false, typingUsers: {}, pendingHandoffs: [] })
  },

  // Clear all data (for logout)
  clearAll: () => {
    // Unsubscribe from realtime when clearing
    if (realtimeSubscription) {
      supabase.removeChannel(realtimeSubscription)
      realtimeSubscription = null
    }
    if (typingChannel) {
      supabase.removeChannel(typingChannel)
      typingChannel = null
    }
    if (engageChatSubscription) {
      supabase.removeChannel(engageChatSubscription)
      engageChatSubscription = null
    }
    if (engageSessionsSubscription) {
      supabase.removeChannel(engageSessionsSubscription)
      engageSessionsSubscription = null
    }
    
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
