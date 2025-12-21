import { create } from 'zustand'
import api from './api'

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

  // Clear error
  clearError: () => set({ error: null }),

  // Fetch messages
  fetchMessages: async (filters = {}) => {
    set({ isLoading: true, error: null })
    
    try {
      const params = new URLSearchParams()
      if (filters.projectId) params.append('projectId', filters.projectId)
      if (filters.unreadOnly) params.append('unreadOnly', 'true')
      
      const url = `/.netlify/functions/messages-list${params.toString() ? `?${params.toString()}` : ''}`
      const response = await api.get(url)
      
      // Calculate unread count
      const unreadCount = response.data.messages.filter(m => !m.readAt).length
      
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

  // Send new message
  sendMessage: async (messageData) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await api.post('/.netlify/functions/messages-send', messageData)
      
      // Refresh messages list
      await get().fetchMessages()
      
      set({ isLoading: false })
      
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to send message'
      set({ 
        isLoading: false, 
        error: errorMessage 
      })
      return { success: false, error: errorMessage }
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
      
      // Find Echo contact (is_ai = true)
      const echoContact = contacts.find(c => c.is_ai === true || c.contact_type === 'ai')
      
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
      // Fetch all messages where Echo is sender or recipient
      const response = await api.get('/.netlify/functions/messages-list?threadType=echo')
      const allMessages = response.data.messages || []
      
      // Filter to Echo thread
      const echoMessages = allMessages.filter(m => 
        m.sender_id === echo.id || 
        m.recipient_id === echo.id ||
        m.thread_type === 'echo'
      ).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      
      set({ echoMessages })
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
              conversationId: echoResponse.conversationId
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
          : state.currentLiveChatSession
      }))
      
      return { success: true, data: response.data }
    } catch (error) {
      console.error('[Messages Store] Failed to update live chat status:', error)
      return { success: false, error: error.message }
    }
  },

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

  // Clear all data (for logout)
  clearAll: () => set({
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
    pagination: {
      page: 1,
      pages: 1,
      per_page: 20,
      total: 0,
      has_next: false,
      has_prev: false
    }
  })
}))

export default useMessagesStore
