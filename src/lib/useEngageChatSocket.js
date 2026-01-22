// src/lib/useEngageChatSocket.js
// React hook for Portal API WebSocket connection to /engage/chat namespace
// Handles real-time messaging, typing indicators, and agent notifications

import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'

const PORTAL_API_URL = import.meta.env.VITE_PORTAL_API_URL || 'https://api.uptrademedia.com'

/**
 * Hook for connecting to Engage live chat WebSocket
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether to connect
 * @param {string} options.projectId - Project ID to filter sessions
 * @param {Function} options.onMessage - Callback for new messages
 * @param {Function} options.onVisitorTyping - Callback for visitor typing status
 * @param {Function} options.onSessionUpdate - Callback for session status changes
 * @param {Function} options.onHandoffRequest - Callback for handoff requests
 * @param {Function} options.onAgentJoined - Callback when another agent joins
 */
export function useEngageChatSocket({
  enabled = true,
  projectId,
  onMessage,
  onVisitorTyping,
  onSessionUpdate,
  onHandoffRequest,
  onAgentJoined,
} = {}) {
  const socketRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState(null)
  const [visitorTypingStates, setVisitorTypingStates] = useState({}) // { sessionId: { isTyping, timestamp } }

  // Get token from cookie (same pattern as useMessagesSocket)
  const getToken = useCallback(() => {
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      acc[key] = value
      return acc
    }, {})
    return cookies['sb-access-token'] || cookies['sb-qxnfswulhjrwinosjxon-auth-token']
  }, [])

  useEffect(() => {
    if (!enabled) return

    const token = getToken()
    if (!token) {
      console.warn('[EngageChatSocket] No auth token found')
      return
    }

    console.log('[EngageChatSocket] Connecting to Portal API...')

    // Create socket connection to engage chat namespace
    const socket = io(`${PORTAL_API_URL}/engage/chat`, {
      auth: { token },
      query: { projectId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    // Connection events
    socket.on('connect', () => {
      console.log('[EngageChatSocket] Connected')
      setIsConnected(true)
      setConnectionError(null)

      // Join project room for agent broadcasts
      if (projectId) {
        socket.emit('agent:join-project', { projectId })
      }
    })

    socket.on('disconnect', (reason) => {
      console.log('[EngageChatSocket] Disconnected:', reason)
      setIsConnected(false)
    })

    socket.on('connect_error', (error) => {
      console.error('[EngageChatSocket] Connection error:', error.message)
      setConnectionError(error.message)
    })

    // ─────────────────────────────────────────────────────────────────────────────
    // Message Events
    // ─────────────────────────────────────────────────────────────────────────────

    // New message from visitor
    socket.on('chat:message', (data) => {
      console.log('[EngageChatSocket] New message:', data.sessionId)
      onMessage?.(data)
    })

    // Message sent confirmation
    socket.on('message:sent', (message) => {
      console.log('[EngageChatSocket] Message sent:', message.id)
    })

    // ─────────────────────────────────────────────────────────────────────────────
    // Typing Events
    // ─────────────────────────────────────────────────────────────────────────────

    // Visitor is typing
    socket.on('visitor:typing', (data) => {
      const { sessionId, isTyping } = data
      
      if (isTyping) {
        setVisitorTypingStates(prev => ({
          ...prev,
          [sessionId]: { isTyping: true, timestamp: Date.now() }
        }))
      } else {
        setVisitorTypingStates(prev => {
          const newState = { ...prev }
          delete newState[sessionId]
          return newState
        })
      }
      
      onVisitorTyping?.(data)
    })

    // ─────────────────────────────────────────────────────────────────────────────
    // Session Events
    // ─────────────────────────────────────────────────────────────────────────────

    // Session status changed (ai -> pending_handoff -> human -> closed)
    socket.on('session:updated', (session) => {
      console.log('[EngageChatSocket] Session updated:', session.id, session.status)
      onSessionUpdate?.(session)
    })

    // Handoff requested by visitor or AI
    socket.on('handoff:requested', (data) => {
      console.log('[EngageChatSocket] Handoff requested:', data.session?.id)
      onHandoffRequest?.(data)
    })

    // Another agent joined the chat
    socket.on('agent:joined', (data) => {
      console.log('[EngageChatSocket] Agent joined:', data.agentName)
      onAgentJoined?.(data)
    })

    // Chat transferred to another agent
    socket.on('chat:transferred', (data) => {
      console.log('[EngageChatSocket] Chat transferred from:', data.fromAgent?.name)
      onSessionUpdate?.(data)
    })

    // ─────────────────────────────────────────────────────────────────────────────
    // Cleanup stale typing indicators
    // ─────────────────────────────────────────────────────────────────────────────

    const typingCleanup = setInterval(() => {
      setVisitorTypingStates(prev => {
        const now = Date.now()
        const newState = {}
        for (const [sessionId, state] of Object.entries(prev)) {
          if (now - state.timestamp < 3000) {
            newState[sessionId] = state
          }
        }
        return newState
      })
    }, 1000)

    return () => {
      clearInterval(typingCleanup)
      if (socket) {
        console.log('[EngageChatSocket] Disconnecting...')
        socket.disconnect()
        socketRef.current = null
      }
    }
  }, [enabled, projectId])

  // ─────────────────────────────────────────────────────────────────────────────
  // Agent Actions
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Send message to visitor
   */
  const sendMessage = useCallback((sessionId, content) => {
    if (!socketRef.current?.connected) {
      console.warn('[EngageChatSocket] Not connected')
      return false
    }
    socketRef.current.emit('agent:message', { sessionId, content })
    return true
  }, [])

  /**
   * Emit agent typing status
   */
  const setAgentTyping = useCallback((sessionId, isTyping) => {
    if (!socketRef.current?.connected) return
    socketRef.current.emit('agent:typing', { sessionId, isTyping })
  }, [])

  /**
   * Join a specific chat session
   */
  const joinSession = useCallback((sessionId) => {
    if (!socketRef.current?.connected) return
    socketRef.current.emit('agent:join', { sessionId })
  }, [])

  /**
   * Leave a chat session
   */
  const leaveSession = useCallback((sessionId) => {
    if (!socketRef.current?.connected) return
    socketRef.current.emit('agent:leave', { sessionId })
  }, [])

  /**
   * Transfer chat to another agent
   */
  const transferChat = useCallback((sessionId, toAgentId, note) => {
    if (!socketRef.current?.connected) return
    socketRef.current.emit('chat:transfer', { sessionId, toAgentId, note })
  }, [])

  /**
   * Close a chat session
   */
  const closeSession = useCallback((sessionId) => {
    if (!socketRef.current?.connected) return
    socketRef.current.emit('session:close', { sessionId })
  }, [])

  /**
   * Check if visitor is typing in a session
   */
  const isVisitorTyping = useCallback((sessionId) => {
    return visitorTypingStates[sessionId]?.isTyping || false
  }, [visitorTypingStates])

  return {
    // State
    isConnected,
    connectionError,
    socket: socketRef.current,
    visitorTypingStates,
    
    // Actions
    sendMessage,
    setAgentTyping,
    joinSession,
    leaveSession,
    transferChat,
    closeSession,
    
    // Utilities
    isVisitorTyping,
  }
}

export default useEngageChatSocket
