/**
 * @uptrade/site-kit/signal - SignalBridge
 * 
 * Central coordination layer for Signal AI integration.
 * Handles config fetching, SSE streaming, experiment assignment, and outcome tracking.
 */

'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { 
  SignalConfig, 
  SignalContextValue, 
  SignalBridgeProps,
  SignalEvent,
  SignalOutcome,
  ExperimentAssignment 
} from './types'

// ============================================
// Context
// ============================================

const SignalContext = createContext<SignalContextValue | null>(null)

export function useSignal(): SignalContextValue {
  const context = useContext(SignalContext)
  if (!context) {
    throw new Error('useSignal must be used within a SignalBridge')
  }
  return context
}

// ============================================
// Utility Functions
// ============================================

function getApiConfig() {
  const apiUrl = typeof window !== 'undefined' 
    ? (window as any).__SITE_KIT_API_URL__ || 'https://api.uptrademedia.com'
    : 'https://api.uptrademedia.com'
  const apiKey = typeof window !== 'undefined' 
    ? (window as any).__SITE_KIT_API_KEY__
    : undefined
  return { apiUrl, apiKey }
}

function getVisitorId(): string {
  if (typeof window === 'undefined') return ''
  
  const key = '_uptrade_vid'
  let visitorId = localStorage.getItem(key)
  
  if (!visitorId) {
    visitorId = crypto.randomUUID()
    localStorage.setItem(key, visitorId)
  }
  
  return visitorId
}

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  
  const key = '_uptrade_sid'
  let sessionId = sessionStorage.getItem(key)
  
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    sessionStorage.setItem(key, sessionId)
  }
  
  return sessionId
}

function getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  if (typeof window === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile'
  return 'desktop'
}

function getBrowser(): string {
  if (typeof window === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Edg')) return 'Edge'
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Safari')) return 'Safari'
  return 'Other'
}

function getOS(): string {
  if (typeof window === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  if (ua.includes('Windows')) return 'Windows'
  if (ua.includes('Mac')) return 'macOS'
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('Linux')) return 'Linux'
  return 'Other'
}

// ============================================
// SignalBridge Component
// ============================================

export function SignalBridge({
  enabled = true,
  realtime = true,
  experiments = true,
  behaviorTracking = true,
  children,
}: SignalBridgeProps) {
  const [config, setConfig] = useState<SignalConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  // Refs for SSE and tracking
  const eventSourceRef = useRef<EventSource | null>(null)
  const eventQueueRef = useRef<Partial<SignalEvent>[]>([])
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const assignmentsRef = useRef<Map<string, ExperimentAssignment>>(new Map())
  
  // Behavioral tracking state
  const pageLoadTimeRef = useRef<number>(Date.now())
  const scrollDepthRef = useRef<number>(0)
  const clickCountRef = useRef<number>(0)
  
  const { apiUrl, apiKey } = getApiConfig()

  // ============================================
  // Config Fetching
  // ============================================
  
  const fetchConfig = useCallback(async () => {
    if (!apiKey || !enabled) {
      setLoading(false)
      return
    }
    
    try {
      const response = await fetch(`${apiUrl}/api/public/signal/config`, {
        headers: {
          'x-api-key': apiKey,
          'x-visitor-id': getVisitorId(),
        },
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch Signal config: ${response.statusText}`)
      }
      
      const data = await response.json()
      setConfig(data.config)
      setError(null)
      
      // Load experiment assignments
      if (experiments && data.config?.experiments) {
        for (const exp of data.config.experiments) {
          if (exp.status === 'running') {
            await loadExperimentAssignment(exp.id)
          }
        }
      }
    } catch (err) {
      console.error('[Signal] Config fetch error:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [apiUrl, apiKey, enabled, experiments])

  // ============================================
  // SSE Real-time Updates
  // ============================================
  
  const connectSSE = useCallback(() => {
    if (!apiKey || !enabled || !realtime) return
    
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    
    const url = `${apiUrl}/api/public/signal/stream?key=${apiKey}`
    const eventSource = new EventSource(url)
    
    eventSource.addEventListener('config_update', (e) => {
      try {
        const { config: newConfig, version } = JSON.parse(e.data)
        setConfig(prev => {
          if (prev?.version !== version) {
            console.log('[Signal] Config updated to version:', version)
            return newConfig
          }
          return prev
        })
      } catch (err) {
        console.error('[Signal] SSE parse error:', err)
      }
    })
    
    eventSource.addEventListener('experiment_update', (e) => {
      try {
        const { experiment_id, action } = JSON.parse(e.data)
        if (action === 'started' || action === 'updated') {
          loadExperimentAssignment(experiment_id)
        } else if (action === 'stopped') {
          assignmentsRef.current.delete(experiment_id)
        }
      } catch (err) {
        console.error('[Signal] Experiment update error:', err)
      }
    })
    
    eventSource.onerror = () => {
      console.warn('[Signal] SSE connection error, reconnecting...')
      eventSource.close()
      // Reconnect after 5 seconds
      setTimeout(connectSSE, 5000)
    }
    
    eventSourceRef.current = eventSource
  }, [apiUrl, apiKey, enabled, realtime])

  // ============================================
  // Experiment Assignment
  // ============================================
  
  const loadExperimentAssignment = useCallback(async (experimentId: string): Promise<ExperimentAssignment | null> => {
    // Check localStorage first
    const storageKey = `_signal_exp_${experimentId}`
    const stored = localStorage.getItem(storageKey)
    
    if (stored) {
      try {
        const assignment = JSON.parse(stored) as ExperimentAssignment
        if (assignment.expires > Date.now()) {
          assignmentsRef.current.set(experimentId, assignment)
          return assignment
        }
      } catch {
        // Invalid stored data, continue to fetch
      }
    }
    
    // Fetch from API
    try {
      const response = await fetch(`${apiUrl}/api/public/signal/experiment/${experimentId}`, {
        headers: {
          'x-api-key': apiKey!,
          'x-visitor-id': getVisitorId(),
        },
      })
      
      if (!response.ok) return null
      
      const assignment = await response.json() as ExperimentAssignment
      
      // Store assignment
      localStorage.setItem(storageKey, JSON.stringify(assignment))
      assignmentsRef.current.set(experimentId, assignment)
      
      return assignment
    } catch (err) {
      console.error('[Signal] Experiment assignment error:', err)
      return null
    }
  }, [apiUrl, apiKey])
  
  const getExperiment = useCallback((experimentId: string): ExperimentAssignment | null => {
    return assignmentsRef.current.get(experimentId) || null
  }, [])

  // ============================================
  // Event Tracking
  // ============================================
  
  const flushEvents = useCallback(async () => {
    if (eventQueueRef.current.length === 0) return
    
    const events = [...eventQueueRef.current]
    eventQueueRef.current = []
    
    try {
      await fetch(`${apiUrl}/api/public/signal/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey!,
        },
        body: JSON.stringify({
          visitor_id: getVisitorId(),
          session_id: getSessionId(),
          events,
        }),
      })
    } catch (err) {
      // Re-queue failed events
      eventQueueRef.current = [...events, ...eventQueueRef.current]
      console.error('[Signal] Event flush error:', err)
    }
  }, [apiUrl, apiKey])
  
  const trackEvent = useCallback((event: Partial<SignalEvent>) => {
    if (!enabled || !apiKey) return
    
    // Enrich event with context
    const enrichedEvent: Partial<SignalEvent> = {
      ...event,
      page_url: window.location.href,
      page_path: window.location.pathname,
      referrer: document.referrer,
      device_type: getDeviceType(),
      browser: getBrowser(),
      os: getOS(),
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      time_on_page: Date.now() - pageLoadTimeRef.current,
      scroll_depth: scrollDepthRef.current,
      click_count: clickCountRef.current,
      experiments: Array.from(assignmentsRef.current.values()).map(a => ({
        experiment_id: a.experiment_id,
        variant_key: a.variant_key,
      })),
      timestamp: new Date().toISOString(),
    }
    
    eventQueueRef.current.push(enrichedEvent)
    
    // Debounce flush
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current)
    }
    flushTimeoutRef.current = setTimeout(flushEvents, 1000)
  }, [enabled, apiKey, flushEvents])

  // ============================================
  // Outcome Tracking
  // ============================================
  
  const trackOutcome = useCallback(async (outcome: SignalOutcome) => {
    if (!enabled || !apiKey) return
    
    try {
      await fetch(`${apiUrl}/api/public/signal/outcome`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          ...outcome,
          visitor_id: getVisitorId(),
          session_id: getSessionId(),
          experiments: Array.from(assignmentsRef.current.keys()),
          page_url: window.location.href,
          timestamp: new Date().toISOString(),
        }),
      })
    } catch (err) {
      console.error('[Signal] Outcome tracking error:', err)
    }
  }, [apiUrl, apiKey, enabled])

  // ============================================
  // Behavioral Tracking
  // ============================================
  
  useEffect(() => {
    if (!behaviorTracking || typeof window === 'undefined') return
    
    // Track scroll depth
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const depth = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0
      scrollDepthRef.current = Math.max(scrollDepthRef.current, depth)
    }
    
    // Track clicks
    const handleClick = () => {
      clickCountRef.current++
    }
    
    // Reset on page change
    const handlePageChange = () => {
      pageLoadTimeRef.current = Date.now()
      scrollDepthRef.current = 0
      clickCountRef.current = 0
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('click', handleClick)
    
    // Flush on visibility change or unload
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushEvents()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', flushEvents)
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('click', handleClick)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', flushEvents)
    }
  }, [behaviorTracking, flushEvents])

  // ============================================
  // Initialization
  // ============================================
  
  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])
  
  useEffect(() => {
    if (config && realtime) {
      connectSSE()
    }
    
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [config, realtime, connectSSE])

  // ============================================
  // Context Value
  // ============================================
  
  const contextValue = useMemo<SignalContextValue>(() => ({
    config,
    loading,
    error,
    trackEvent,
    trackOutcome,
    getExperiment,
    refreshConfig: fetchConfig,
  }), [config, loading, error, trackEvent, trackOutcome, getExperiment, fetchConfig])

  return (
    <SignalContext.Provider value={contextValue}>
      {children}
    </SignalContext.Provider>
  )
}

// ============================================
// Convenience Hooks
// ============================================

/**
 * Hook to access Signal config
 */
export function useSignalConfig(): SignalConfig | null {
  const { config } = useSignal()
  return config
}

/**
 * Hook for tracking events
 */
export function useSignalEvent() {
  const { trackEvent } = useSignal()
  return trackEvent
}

/**
 * Hook for tracking outcomes/conversions
 */
export function useSignalOutcome() {
  const { trackOutcome } = useSignal()
  return { trackOutcome }
}

/**
 * Hook for experiment assignment
 */
export function useSignalExperiment(experimentId: string): {
  assignment: ExperimentAssignment | null
  variant: string | null
  isControl: boolean
} {
  const { getExperiment, config } = useSignal()
  const assignment = getExperiment(experimentId)
  
  // Check if experiment is running
  const experiment = config?.experiments?.find(e => e.id === experimentId)
  const isRunning = experiment?.status === 'running'
  
  return {
    assignment: isRunning ? assignment : null,
    variant: isRunning && assignment ? assignment.variant_key : null,
    isControl: !assignment || assignment.variant_key === 'control',
  }
}
