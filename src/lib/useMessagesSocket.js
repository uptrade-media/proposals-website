/**
 * useMessagesSocket Hook
 * 
 * Real-time WebSocket connection to Portal API for messaging features.
 * Provides typing indicators, presence, read receipts, and instant message delivery.
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import { io } from 'socket.io-client'
import { supabase } from './supabase-auth'
import { getPortalApiUrl } from './portal-api'

// Notification sound
let notificationAudio = null
function playNotificationSound() {
  try {
    if (!notificationAudio) {
      notificationAudio = new Audio('/chatnotification.wav')
      notificationAudio.volume = 0.5
    }
    notificationAudio.currentTime = 0
    notificationAudio.play().catch(() => {})
  } catch (err) {
    console.log('[Notification] Audio error:', err.message)
  }
}

/**
 * Hook for real-time messaging via WebSocket
 */
export function useMessagesSocket(options = {}) {
  const {
    onMessage,
    onMessageEdited,
    onMessageDeleted,
    onMessageRead,
    onTyping,
    onPresence,
    onReactionAdded,
    onReactionRemoved,
    onUnreadUpdated,
    onThreadReply,
    onGroupJoined,
    onGroupLeft,
    enabled = true,
  } = options

  const socketRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState(null)

  useEffect(() => {
    if (!enabled) return

    let socket = null

    const connect = async () => {
      try {
        // Get Supabase session token
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          console.log('[MessagesSocket] No session, skipping connection')
          return
        }

        const portalApiUrl = getPortalApiUrl()
        console.log('[MessagesSocket] Connecting to', portalApiUrl)

        socket = io(`${portalApiUrl}/messages`, {
          auth: { token: session.access_token },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        })

        socketRef.current = socket

        // Connection events
        socket.on('connect', () => {
          console.log('[MessagesSocket] Connected')
          setIsConnected(true)
          setConnectionError(null)
        })

        socket.on('disconnect', (reason) => {
          console.log('[MessagesSocket] Disconnected:', reason)
          setIsConnected(false)
        })

        socket.on('connect_error', (error) => {
          console.error('[MessagesSocket] Connection error:', error.message)
          setConnectionError(error.message)
          setIsConnected(false)
        })

        // Message events
        socket.on('message:new', (message) => {
          console.log('[MessagesSocket] New message:', message.id)
          onMessage?.(message)
          
          // Play notification sound if not focused
          if (document.hidden) {
            playNotificationSound()
          }
        })

        socket.on('message:sent', (message) => {
          console.log('[MessagesSocket] Message sent confirmed:', message.id)
        })

        socket.on('message:edited', (data) => {
          console.log('[MessagesSocket] Message edited:', data.messageId)
          onMessageEdited?.(data)
        })

        socket.on('message:deleted', (data) => {
          console.log('[MessagesSocket] Message deleted:', data.messageId)
          onMessageDeleted?.(data)
        })

        socket.on('message:read', (data) => {
          console.log('[MessagesSocket] Message read:', data.messageId)
          onMessageRead?.(data)
        })

        // Typing indicators
        socket.on('typing', (data) => {
          onTyping?.(data)
        })

        // Presence
        socket.on('presence', (data) => {
          onPresence?.(data)
        })

        socket.on('presence:bulk', (data) => {
          Object.entries(data.users).forEach(([userId, status]) => {
            onPresence?.({ userId, status })
          })
        })

        // Reactions
        socket.on('reaction:added', (data) => {
          onReactionAdded?.(data)
        })

        socket.on('reaction:removed', (data) => {
          onReactionRemoved?.(data)
        })

        // Unread counts
        socket.on('unread:updated', (data) => {
          onUnreadUpdated?.(data)
        })

        // Threads
        socket.on('thread:reply', (message) => {
          onThreadReply?.(message)
        })

        socket.on('thread:updated', (data) => {
          console.log('[MessagesSocket] Thread updated:', data.messageId)
        })

        // Groups
        socket.on('group:joined', (data) => {
          console.log('[MessagesSocket] Joined group:', data.groupId)
          onGroupJoined?.(data)
        })

        socket.on('group:left', (data) => {
          console.log('[MessagesSocket] Left group:', data.groupId)
          onGroupLeft?.(data)
        })

        // Heartbeat for presence
        const heartbeatInterval = setInterval(() => {
          if (socket.connected) {
            socket.emit('presence:heartbeat')
          }
        }, 30000)

        return () => {
          clearInterval(heartbeatInterval)
        }
      } catch (error) {
        console.error('[MessagesSocket] Setup error:', error)
        setConnectionError(error.message)
      }
    }

    connect()

    return () => {
      if (socket) {
        console.log('[MessagesSocket] Disconnecting...')
        socket.disconnect()
        socketRef.current = null
      }
    }
  }, [enabled])

  // ─────────────────────────────────────────────────────────────────────────────
  // Send Actions
  // ─────────────────────────────────────────────────────────────────────────────

  const sendMessage = useCallback((recipientId, content, attachments) => {
    socketRef.current?.emit('message:send', { recipientId, content, attachments })
  }, [])

  const editMessage = useCallback((messageId, content) => {
    socketRef.current?.emit('message:edit', { messageId, content })
  }, [])

  const deleteMessage = useCallback((messageId, forEveryone = false) => {
    socketRef.current?.emit('message:delete', { messageId, forEveryone })
  }, [])

  const markRead = useCallback((messageId) => {
    socketRef.current?.emit('message:read', { messageId })
  }, [])

  // ─────────────────────────────────────────────────────────────────────────────
  // Typing Indicators
  // ─────────────────────────────────────────────────────────────────────────────

  const startTyping = useCallback((conversationId) => {
    socketRef.current?.emit('typing:start', { conversationId })
  }, [])

  const stopTyping = useCallback((conversationId) => {
    socketRef.current?.emit('typing:stop', { conversationId })
  }, [])

  // ─────────────────────────────────────────────────────────────────────────────
  // Reactions
  // ─────────────────────────────────────────────────────────────────────────────

  const addReaction = useCallback((messageId, emoji) => {
    socketRef.current?.emit('reaction:add', { messageId, emoji })
  }, [])

  const removeReaction = useCallback((messageId, emoji) => {
    socketRef.current?.emit('reaction:remove', { messageId, emoji })
  }, [])

  // ─────────────────────────────────────────────────────────────────────────────
  // Threads
  // ─────────────────────────────────────────────────────────────────────────────

  const joinThread = useCallback((messageId) => {
    socketRef.current?.emit('thread:join', { messageId })
  }, [])

  const leaveThread = useCallback((messageId) => {
    socketRef.current?.emit('thread:leave', { messageId })
  }, [])

  const sendThreadReply = useCallback((parentId, content) => {
    socketRef.current?.emit('thread:reply', { parentId, content })
  }, [])

  // ─────────────────────────────────────────────────────────────────────────────
  // Drafts
  // ─────────────────────────────────────────────────────────────────────────────

  const saveDraft = useCallback((conversationId, content) => {
    socketRef.current?.emit('draft:save', { conversationId, content })
  }, [])

  // ─────────────────────────────────────────────────────────────────────────────
  // Groups
  // ─────────────────────────────────────────────────────────────────────────────

  const joinGroup = useCallback((groupId) => {
    socketRef.current?.emit('group:join', { groupId })
  }, [])

  const sendGroupMessage = useCallback((groupId, content, attachments) => {
    socketRef.current?.emit('group:message', { groupId, content, attachments })
  }, [])

  const setGroupTyping = useCallback((groupId, isTyping) => {
    socketRef.current?.emit('group:typing', { groupId, isTyping })
  }, [])

  return {
    // State
    isConnected,
    connectionError,
    socket: socketRef.current,
    
    // Message actions
    sendMessage,
    editMessage,
    deleteMessage,
    markRead,
    
    // Typing
    startTyping,
    stopTyping,
    
    // Reactions
    addReaction,
    removeReaction,
    
    // Threads
    joinThread,
    leaveThread,
    sendThreadReply,
    
    // Drafts
    saveDraft,
    
    // Groups
    joinGroup,
    sendGroupMessage,
    setGroupTyping,
  }
}

export default useMessagesSocket
