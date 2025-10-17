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

  // Fetch unread count
  fetchUnreadCount: async () => {
    try {
      const response = await api.get('/messages/unread-count')
      set({ unreadCount: response.data.unread_count })
      return { success: true, data: response.data }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch unread count'
      return { success: false, error: errorMessage }
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

  // Clear all data (for logout)
  clearAll: () => set({
    messages: [],
    conversations: [],
    contacts: [],
    currentMessage: null,
    unreadCount: 0,
    error: null,
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
