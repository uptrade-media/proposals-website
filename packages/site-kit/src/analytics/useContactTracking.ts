/**
 * @uptrade/site-kit/analytics - Contact Tracking Hook
 * 
 * Tracks phone calls and email clicks as conversions.
 * Use this hook to automatically track tel: and mailto: links,
 * or manually track contact interactions.
 */

'use client'

import { useCallback, useEffect } from 'react'
import { useAnalytics } from './AnalyticsProvider'

export interface UseContactTrackingOptions {
  /** Automatically track all tel: and mailto: links (default: true) */
  autoTrack?: boolean
  /** Debug mode - logs events to console */
  debug?: boolean
}

export interface ContactTrackingReturn {
  /** Manually track a phone call click */
  trackPhoneClick: (phoneNumber: string, metadata?: Record<string, unknown>) => void
  /** Manually track an email click */
  trackEmailClick: (email: string, metadata?: Record<string, unknown>) => void
}

/**
 * Hook for tracking phone and email contact interactions as conversions.
 * 
 * @example
 * ```tsx
 * // Auto-track all tel: and mailto: links
 * useContactTracking()
 * 
 * // Manual tracking
 * const { trackPhoneClick, trackEmailClick } = useContactTracking()
 * trackPhoneClick('513-555-1234')
 * trackEmailClick('hello@example.com')
 * ```
 */
export function useContactTracking(options: UseContactTrackingOptions = {}): ContactTrackingReturn {
  const { autoTrack = true, debug = false } = options
  const { trackConversion } = useAnalytics()
  
  const trackPhoneClick = useCallback((phoneNumber: string, metadata?: Record<string, unknown>) => {
    if (debug) console.log('[Analytics] Phone click:', phoneNumber)
    
    trackConversion({
      type: 'phone_call',
      metadata: {
        phoneNumber: phoneNumber.replace(/\D/g, ''), // Normalize to digits
        rawNumber: phoneNumber,
        ...metadata,
      },
    })
  }, [trackConversion, debug])
  
  const trackEmailClick = useCallback((email: string, metadata?: Record<string, unknown>) => {
    if (debug) console.log('[Analytics] Email click:', email)
    
    trackConversion({
      type: 'email_click',
      metadata: {
        email,
        ...metadata,
      },
    })
  }, [trackConversion, debug])
  
  // Auto-track tel: and mailto: links
  useEffect(() => {
    if (!autoTrack || typeof document === 'undefined') return
    
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a')
      if (!anchor) return
      
      const href = anchor.getAttribute('href')
      if (!href) return
      
      if (href.startsWith('tel:')) {
        const phone = href.replace('tel:', '').trim()
        trackPhoneClick(phone, {
          linkText: anchor.textContent?.trim(),
          source: 'auto',
        })
      } else if (href.startsWith('mailto:')) {
        const email = href.replace('mailto:', '').split('?')[0].trim()
        trackEmailClick(email, {
          linkText: anchor.textContent?.trim(),
          source: 'auto',
        })
      }
    }
    
    document.addEventListener('click', handleClick, { capture: true })
    
    return () => {
      document.removeEventListener('click', handleClick, { capture: true })
    }
  }, [autoTrack, trackPhoneClick, trackEmailClick])
  
  return {
    trackPhoneClick,
    trackEmailClick,
  }
}

/**
 * Component wrapper for contact tracking
 * Simply include this component to auto-track all tel: and mailto: links
 * 
 * @example
 * ```tsx
 * <ContactTracking />
 * ```
 */
export function ContactTracking({ debug = false }: { debug?: boolean }) {
  useContactTracking({ autoTrack: true, debug })
  return null
}
