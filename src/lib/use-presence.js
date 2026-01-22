/**
 * usePresence - Real-time presence tracking with Supabase Realtime
 * 
 * Features:
 * - Track who's online in real-time
 * - Show "online now" green dots
 * - Show "last seen X ago" for offline users
 * - Sync presence to database for persistence
 * 
 * Usage:
 *   const { onlineUsers, isOnline, getPresenceStatus } = usePresence()
 *   
 *   // Check if a specific user is online
 *   if (isOnline(userId)) { ... }
 *   
 *   // Get status with last seen
 *   const status = getPresenceStatus(userId) // { online: true } or { online: false, lastSeen: Date }
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabase'
import useAuthStore from './auth-store'

// Presence channel name
const PRESENCE_CHANNEL = 'portal-presence'

// How often to send heartbeat (ms)
const HEARTBEAT_INTERVAL = 30000 // 30 seconds

// How long before marking user as away (ms)
const AWAY_TIMEOUT = 120000 // 2 minutes

export function usePresence() {
  const { user } = useAuthStore()
  const [onlineUsers, setOnlineUsers] = useState(new Map()) // userId -> presence data
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef(null)
  const heartbeatRef = useRef(null)
  const awayTimeoutRef = useRef(null)
  const lastActivityRef = useRef(Date.now())

  // Track user activity
  const trackActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    
    // Clear away timeout and reset
    if (awayTimeoutRef.current) {
      clearTimeout(awayTimeoutRef.current)
    }
    
    // Set new away timeout
    awayTimeoutRef.current = setTimeout(() => {
      // Mark as away after inactivity
      if (channelRef.current && user?.id) {
        channelRef.current.track({
          id: user.id,
          status: 'away',
          lastActivity: lastActivityRef.current
        })
      }
    }, AWAY_TIMEOUT)
  }, [user?.id])

  // Initialize presence channel
  useEffect(() => {
    if (!user?.id) return

    // Create presence channel
    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: {
        presence: {
          key: user.id
        }
      }
    })

    // Handle presence sync (initial state)
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const users = new Map()
      
      Object.entries(state).forEach(([key, presences]) => {
        // Get the most recent presence for each user
        if (presences.length > 0) {
          const latest = presences[presences.length - 1]
          users.set(key, {
            id: latest.id,
            status: latest.status || 'online',
            lastActivity: latest.lastActivity,
            joinedAt: latest.presence_ref
          })
        }
      })
      
      setOnlineUsers(users)
    })

    // Handle user join
    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      setOnlineUsers(prev => {
        const next = new Map(prev)
        if (newPresences.length > 0) {
          const presence = newPresences[0]
          next.set(key, {
            id: presence.id,
            status: presence.status || 'online',
            lastActivity: presence.lastActivity,
            joinedAt: Date.now()
          })
        }
        return next
      })
    })

    // Handle user leave
    channel.on('presence', { event: 'leave' }, ({ key }) => {
      setOnlineUsers(prev => {
        const next = new Map(prev)
        next.delete(key)
        return next
      })
      
      // Update database when user leaves
      updatePresenceInDatabase(key, 'offline')
    })

    // Subscribe and track own presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true)
        
        // Track own presence
        await channel.track({
          id: user.id,
          status: 'online',
          lastActivity: Date.now()
        })
        
        // Update database
        updatePresenceInDatabase(user.id, 'online')
      }
    })

    channelRef.current = channel

    // Set up heartbeat to keep presence alive
    heartbeatRef.current = setInterval(() => {
      if (channelRef.current) {
        const status = Date.now() - lastActivityRef.current > AWAY_TIMEOUT ? 'away' : 'online'
        channelRef.current.track({
          id: user.id,
          status,
          lastActivity: lastActivityRef.current
        })
      }
    }, HEARTBEAT_INTERVAL)

    // Track activity events
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach(event => {
      window.addEventListener(event, trackActivity, { passive: true })
    })

    // Cleanup
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
      }
      if (awayTimeoutRef.current) {
        clearTimeout(awayTimeoutRef.current)
      }
      
      events.forEach(event => {
        window.removeEventListener(event, trackActivity)
      })
      
      // Untrack and unsubscribe
      if (channelRef.current) {
        channelRef.current.untrack()
        supabase.removeChannel(channelRef.current)
      }
      
      // Mark as offline in database
      if (user?.id) {
        updatePresenceInDatabase(user.id, 'offline')
      }
      
      setIsConnected(false)
    }
  }, [user?.id, trackActivity])

  // Update presence in database for persistence
  const updatePresenceInDatabase = async (userId, status) => {
    try {
      await supabase.rpc('update_contact_presence', {
        contact_id: userId,
        new_status: status
      })
    } catch (error) {
      // Silently fail - presence is best-effort
      console.debug('Failed to update presence in database:', error)
    }
  }

  // Check if a user is online
  const isOnline = useCallback((userId) => {
    const presence = onlineUsers.get(userId)
    return presence?.status === 'online'
  }, [onlineUsers])

  // Check if a user is away
  const isAway = useCallback((userId) => {
    const presence = onlineUsers.get(userId)
    return presence?.status === 'away'
  }, [onlineUsers])

  // Get full presence status for a user
  const getPresenceStatus = useCallback((userId, lastSeenFromDb) => {
    const presence = onlineUsers.get(userId)
    
    if (presence) {
      return {
        online: presence.status === 'online',
        away: presence.status === 'away',
        status: presence.status,
        lastActivity: presence.lastActivity ? new Date(presence.lastActivity) : null
      }
    }
    
    // User not in realtime presence, use database value
    return {
      online: false,
      away: false,
      status: 'offline',
      lastSeen: lastSeenFromDb ? new Date(lastSeenFromDb) : null
    }
  }, [onlineUsers])

  // Get count of online users
  const onlineCount = Array.from(onlineUsers.values()).filter(u => u.status === 'online').length

  return {
    onlineUsers,
    onlineCount,
    isConnected,
    isOnline,
    isAway,
    getPresenceStatus
  }
}

export default usePresence
