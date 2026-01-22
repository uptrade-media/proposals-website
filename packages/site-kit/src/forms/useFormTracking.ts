/**
 * @uptrade/site-kit/forms - Form Tracking Hook
 * 
 * Tracks form analytics including step progress and abandonment
 */

'use client'

import { useEffect, useRef, useCallback } from 'react'

interface UseFormTrackingOptions {
  formId: string
  totalSteps: number
  enabled?: boolean
  debug?: boolean
}

interface FormTrackingReturn {
  trackStepChange: (step: number) => void
  trackComplete: () => void
  sessionId: string
}

export function useFormTracking({
  formId,
  totalSteps,
  enabled = true,
  debug = false,
}: UseFormTrackingOptions): FormTrackingReturn {
  const sessionIdRef = useRef<string>('')
  const startTimeRef = useRef<number>(0)
  const stepStartTimeRef = useRef<number>(0)
  const stepTimesRef = useRef<Record<number, number>>({})
  const currentStepRef = useRef<number>(1)
  const maxStepRef = useRef<number>(1)
  const analyticsIdRef = useRef<string | null>(null)
  
  // Initialize tracking
  useEffect(() => {
    if (!enabled) return
    if (!formId) {
      if (debug) console.warn('[Forms] Tracking skipped: formId is empty')
      return
    }
    
    // Generate session ID
    sessionIdRef.current = crypto.randomUUID()
    startTimeRef.current = Date.now()
    stepStartTimeRef.current = Date.now()
    
    // Record form start
    const startTracking = async () => {
      const apiUrl = (window as any).__SITE_KIT_API_URL__
      const apiKey = (window as any).__SITE_KIT_API_KEY__
      
      if (!apiUrl || !apiKey) {
        if (debug) console.error('[Forms] Missing API URL or API key')
        return
      }
      
      try {
        const response = await fetch(`${apiUrl}/api/public/forms/analytics/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify({
            formId,
            sessionId: sessionIdRef.current,
            deviceType: getDeviceType(),
          }),
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        analyticsIdRef.current = data.id
        if (debug) console.log('[Forms] Started tracking:', data.id)
      } catch (error) {
        if (debug) console.error('[Forms] Error starting tracking:', error)
      }
    }
    
    startTracking()
    
    // Handle abandonment on page leave
    const handleBeforeUnload = () => {
      if (!analyticsIdRef.current) return
      
      const apiUrl = (window as any).__SITE_KIT_API_URL__
      const apiKey = (window as any).__SITE_KIT_API_KEY__
      
      if (!apiUrl || !apiKey) return
      
      const now = Date.now()
      const currentStepTime = Math.floor((now - stepStartTimeRef.current) / 1000)
      stepTimesRef.current[currentStepRef.current] = currentStepTime
      
      // Use sendBeacon for reliable delivery during page unload
      const payload = JSON.stringify({
        analyticsId: analyticsIdRef.current,
        step: currentStepRef.current,
        maxStep: maxStepRef.current,
        stepTimes: stepTimesRef.current,
        totalTimeSeconds: Math.floor((now - startTimeRef.current) / 1000),
      })
      
      const blob = new Blob([payload], { type: 'application/json' })
      // Note: sendBeacon doesn't support custom headers, API key included in URL
      const _headers = new Headers({
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      })
      
      // Try sendBeacon first (more reliable during unload)
      const sent = navigator.sendBeacon(
        `${apiUrl}/api/public/forms/analytics/abandon`,
        blob
      )
      
      if (debug) console.log('[Forms] Abandonment tracked:', sent ? 'success' : 'failed')
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [formId, enabled, debug])
  
  // Track step changes
  const trackStepChange = useCallback(async (step: number) => {
    if (!enabled || !analyticsIdRef.current) return
    
    const apiUrl = (window as any).__SITE_KIT_API_URL__
    const apiKey = (window as any).__SITE_KIT_API_KEY__
    
    if (!apiUrl || !apiKey) {
      if (debug) console.error('[Forms] Missing API URL or API key')
      return
    }
    
    const now = Date.now()
    
    // Record time spent on previous step
    const prevStepTime = Math.floor((now - stepStartTimeRef.current) / 1000)
    stepTimesRef.current[currentStepRef.current] = prevStepTime
    
    // Update refs
    currentStepRef.current = step
    maxStepRef.current = Math.max(maxStepRef.current, step)
    stepStartTimeRef.current = now
    
    // Update database
    try {
      const response = await fetch(`${apiUrl}/api/public/forms/analytics/step`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          analyticsId: analyticsIdRef.current,
          step,
          maxStep: maxStepRef.current,
          stepTimes: stepTimesRef.current,
        }),
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      if (debug) console.log('[Forms] Step changed to:', step)
    } catch (error) {
      if (debug) console.error('[Forms] Error updating step:', error)
    }
  }, [enabled, debug])
  
  // Track completion
  const trackComplete = useCallback(async () => {
    if (!enabled || !analyticsIdRef.current) return
    
    const apiUrl = (window as any).__SITE_KIT_API_URL__
    const apiKey = (window as any).__SITE_KIT_API_KEY__
    
    if (!apiUrl || !apiKey) {
      if (debug) console.error('[Forms] Missing API URL or API key')
      return
    }
    
    const now = Date.now()
    
    // Record time for final step
    const finalStepTime = Math.floor((now - stepStartTimeRef.current) / 1000)
    stepTimesRef.current[currentStepRef.current] = finalStepTime
    
    try {
      // Complete form analytics tracking
      // Note: A database trigger will automatically log this as a conversion
      // in analytics_conversions when completed_at is set
      const response = await fetch(`${apiUrl}/api/public/forms/analytics/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          analyticsId: analyticsIdRef.current,
          totalSteps,
          stepTimes: stepTimesRef.current,
          totalTimeSeconds: Math.floor((now - startTimeRef.current) / 1000),
        }),
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      if (debug) console.log('[Forms] Form completed (conversion auto-logged via trigger)')
    } catch (error) {
      if (debug) console.error('[Forms] Error completing tracking:', error)
    }
  }, [enabled, totalSteps, formId, debug])
  
  return {
    trackStepChange,
    trackComplete,
    sessionId: sessionIdRef.current,
  }
}

// Helper
function getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  if (typeof window === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile'
  return 'desktop'
}

