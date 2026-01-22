/**
 * @uptrade/site-kit/analytics - Analytics Provider
 * 
 * Provides analytics context and automatic page view tracking.
 * All data goes through Portal API with API key auth - never Supabase directly.
 */

'use client'

import React, { createContext, useContext, useEffect, useRef, useCallback, useMemo } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import type { AnalyticsContextValue, TrackEventOptions, TrackConversionOptions } from './types'
import { WebVitals } from './WebVitals'

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null)

// ============================================
// Utility Functions
// ============================================

function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Schedule a callback to run during browser idle time
 * Falls back to setTimeout(0) for Safari
 */
function scheduleIdleTask(callback: () => void, timeout = 2000): void {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    ;(window as typeof window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback(
      callback,
      { timeout }
    )
  } else {
    setTimeout(callback, 0)
  }
}

function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return ''
  
  const key = '_uptrade_vid'
  let visitorId = localStorage.getItem(key)
  
  if (!visitorId) {
    visitorId = generateId()
    localStorage.setItem(key, visitorId)
  }
  
  return visitorId
}

function getSessionId(timeout: number): string {
  if (typeof window === 'undefined') return ''
  
  const key = '_uptrade_sid'
  const timeKey = '_uptrade_stime'
  const now = Date.now()
  const timeoutMs = timeout * 60 * 1000
  
  const existingSession = sessionStorage.getItem(key)
  const lastActivity = sessionStorage.getItem(timeKey)
  
  if (existingSession && lastActivity) {
    const elapsed = now - parseInt(lastActivity, 10)
    if (elapsed < timeoutMs) {
      sessionStorage.setItem(timeKey, now.toString())
      return existingSession
    }
  }
  
  // New session
  const newSession = generateId()
  sessionStorage.setItem(key, newSession)
  sessionStorage.setItem(timeKey, now.toString())
  return newSession
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
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera'
  return 'Other'
}

function getOS(): string {
  if (typeof window === 'undefined') return 'unknown'
  
  const ua = navigator.userAgent
  if (ua.includes('Windows')) return 'Windows'
  if (ua.includes('Mac OS X') || ua.includes('Macintosh')) return 'macOS'
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('Linux')) return 'Linux'
  if (ua.includes('CrOS')) return 'ChromeOS'
  return 'Other'
}

function getUserAgent(): string {
  if (typeof window === 'undefined') return ''
  return navigator.userAgent
}

function getUTMParams(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  
  const params = new URLSearchParams(window.location.search)
  const utmParams: Record<string, string> = {}
  
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
    const value = params.get(key)
    if (value) utmParams[key] = value
  }
  
  return utmParams
}

/**
 * Extract SEO metadata from the current page
 * This enriches seo_pages with live data from the actual page
 */
function getPageMetadata(): Record<string, any> {
  if (typeof document === 'undefined') return {}
  
  const getMeta = (name: string): string | null => {
    const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)
    return el?.getAttribute('content') || null
  }
  
  const getCanonical = (): string | null => {
    const el = document.querySelector('link[rel="canonical"]')
    return el?.getAttribute('href') || null
  }
  
  const getRobots = (): string | null => {
    return getMeta('robots')
  }
  
  const getH1 = (): string | null => {
    const h1 = document.querySelector('h1')
    return h1?.textContent?.trim() || null
  }
  
  const getH1Count = (): number => {
    return document.querySelectorAll('h1').length
  }
  
  const getWordCount = (): number => {
    // Get main content, fallback to body
    const main = document.querySelector('main, article, [role="main"]') || document.body
    const text = main.textContent || ''
    return text.split(/\s+/).filter(w => w.length > 0).length
  }
  
  const getImageStats = (): { count: number; withoutAlt: number } => {
    const images = document.querySelectorAll('img')
    let withoutAlt = 0
    images.forEach(img => {
      if (!img.alt || img.alt.trim() === '') withoutAlt++
    })
    return { count: images.length, withoutAlt }
  }
  
  interface InternalLink {
    targetPath: string
    anchorText: string
    position: 'header' | 'nav' | 'content' | 'footer' | 'sidebar' | 'unknown'
    isNofollow: boolean
  }
  
  const getLinkStats = (): { 
    internal: number
    external: number
    internalLinks: InternalLink[]
  } => {
    const links = document.querySelectorAll('a[href]')
    const currentHost = window.location.host
    let internal = 0
    let external = 0
    const internalLinks: InternalLink[] = []
    
    // Helper to determine link position in page
    const getLinkPosition = (el: Element): InternalLink['position'] => {
      let current: Element | null = el
      while (current) {
        const tag = current.tagName?.toLowerCase()
        const role = current.getAttribute('role')
        
        if (tag === 'header' || role === 'banner') return 'header'
        if (tag === 'nav' || role === 'navigation') return 'nav'
        if (tag === 'footer' || role === 'contentinfo') return 'footer'
        if (tag === 'aside' || role === 'complementary') return 'sidebar'
        if (tag === 'main' || tag === 'article' || role === 'main') return 'content'
        
        current = current.parentElement
      }
      return 'unknown'
    }
    
    links.forEach(link => {
      const href = link.getAttribute('href') || ''
      const rel = link.getAttribute('rel') || ''
      const isNofollow = rel.includes('nofollow')
      
      let isInternal = false
      let targetPath = ''
      
      if (href.startsWith('/') && !href.startsWith('//')) {
        isInternal = true
        targetPath = href.split('?')[0].split('#')[0] // Remove query/hash
      } else if (href.startsWith('#')) {
        // Same page anchor - skip
        internal++
        return
      } else if (href.startsWith('http')) {
        try {
          const url = new URL(href)
          if (url.host === currentHost) {
            isInternal = true
            targetPath = url.pathname
          } else {
            external++
          }
        } catch {
          // Invalid URL
        }
      }
      
      if (isInternal && targetPath) {
        internal++
        // Normalize path
        if (!targetPath.startsWith('/')) targetPath = '/' + targetPath
        if (targetPath !== '/' && targetPath.endsWith('/')) {
          targetPath = targetPath.slice(0, -1)
        }
        
        internalLinks.push({
          targetPath,
          anchorText: (link.textContent || '').trim().slice(0, 200),
          position: getLinkPosition(link),
          isNofollow,
        })
      }
    })
    
    return { internal, external, internalLinks }
  }
  
  const imageStats = getImageStats()
  const linkStats = getLinkStats()
  
  return {
    metaDescription: getMeta('description'),
    canonical: getCanonical(),
    robots: getRobots(),
    ogTitle: getMeta('og:title'),
    ogDescription: getMeta('og:description'),
    ogImage: getMeta('og:image'),
    h1: getH1(),
    h1Count: getH1Count(),
    wordCount: getWordCount(),
    imagesCount: imageStats.count,
    imagesWithoutAlt: imageStats.withoutAlt,
    internalLinks: linkStats.internal,
    internalLinkTargets: linkStats.internalLinks, // Full link graph data
    externalLinks: linkStats.external,
  }
}

function getApiConfig() {
  const apiUrl = typeof window !== 'undefined' 
    ? (window as any).__SITE_KIT_API_URL__ || 'https://api.uptrademedia.com'
    : 'https://api.uptrademedia.com'
  const apiKey = typeof window !== 'undefined' 
    ? (window as any).__SITE_KIT_API_KEY__
    : undefined
  return { apiUrl, apiKey }
}

// ============================================
// Provider Component
// ============================================

interface AnalyticsProviderProps {
  children: React.ReactNode
  apiUrl?: string
  apiKey?: string
  trackPageViews?: boolean
  trackWebVitals?: boolean
  trackScrollDepth?: boolean
  trackClicks?: boolean
  trackJourneys?: boolean // NEW: Track user journey paths
  sessionTimeout?: number
  excludePaths?: string[]
  validateAgainstSitemap?: boolean // Only track paths that exist in sitemap (default: true)
  debug?: boolean
}

export function AnalyticsProvider({
  children,
  apiUrl: propApiUrl,
  apiKey: propApiKey,
  trackPageViews = true,
  trackWebVitals = true,
  trackScrollDepth = true,
  trackClicks = true,
  trackJourneys = true, // NEW: Enable journey tracking by default
  sessionTimeout = 30,
  excludePaths = [],
  validateAgainstSitemap = true,
  debug = false,
}: AnalyticsProviderProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const visitorIdRef = useRef<string>('')
  const sessionIdRef = useRef<string>('')
  const lastPathRef = useRef<string>('')
  const validPathsRef = useRef<Set<string> | null>(null)
  
  // Journey tracking state
  const journeyStartTimeRef = useRef<number>(0)
  const pageEnterTimeRef = useRef<number>(0)
  const currentScrollDepthRef = useRef<number>(0)
  
  // Initialize IDs
  useEffect(() => {
    visitorIdRef.current = getOrCreateVisitorId()
    sessionIdRef.current = getSessionId(sessionTimeout)
  }, [sessionTimeout])
  
  // Fetch valid pages from seo_pages (populated by SitemapSync from SEO module)
  useEffect(() => {
    if (!validateAgainstSitemap) {
      if (debug) console.log('[Analytics] Page validation disabled')
      return
    }
    
    const fetchValidPages = async () => {
      const { apiUrl: globalApiUrl, apiKey: globalApiKey } = getApiConfig()
      const apiUrl = propApiUrl || globalApiUrl
      const apiKey = propApiKey || globalApiKey
      
      if (!apiKey) {
        if (debug) console.warn('[Analytics] No API key for page validation')
        return
      }
      
      try {
        // Fetch seo_pages which is the canonical source of truth
        // (populated by SitemapSync component from the SEO module)
        const response = await fetch(`${apiUrl}/api/public/seo/pages`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          const pages = data?.pages || []
          validPathsRef.current = new Set(
            pages.map((p: any) => p.path).filter(Boolean)
          )
          
          if (debug) {
            console.log('[Analytics] Loaded', validPathsRef.current.size, 'valid pages from seo_pages')
          }
        } else if (debug) {
          console.error('[Analytics] Pages fetch failed:', response.statusText)
        }
      } catch (error) {
        if (debug) console.error('[Analytics] Error fetching valid pages:', error)
      }
    }
    
    fetchValidPages()
  }, [propApiUrl, propApiKey, validateAgainstSitemap, debug])
  
  // Track page views
  useEffect(() => {
    if (!trackPageViews) return
    if (!pathname) return
    if (excludePaths.some(p => pathname.startsWith(p))) return
    if (pathname === lastPathRef.current) return
    
    // Validate against seo_pages if enabled and loaded
    if (validateAgainstSitemap) {
      if (validPathsRef.current && validPathsRef.current.size > 0) {
        if (!validPathsRef.current.has(pathname)) {
          if (debug) {
            console.log('[Analytics] Skipping unregistered path:', pathname)
          }
          return
        }
      } else if (debug) {
        console.log('[Analytics] Sitemap not yet loaded, tracking anyway:', pathname)
      }
    }
    
    lastPathRef.current = pathname
    
    const trackPageView = async () => {
      const { apiUrl: globalApiUrl, apiKey: globalApiKey } = getApiConfig()
      const apiUrl = propApiUrl || globalApiUrl
      const apiKey = propApiKey || globalApiKey
      
      if (!apiKey) {
        if (debug) console.warn('[Analytics] No API key configured')
        return
      }
      
      const utmParams = getUTMParams()
      const pageMetadata = getPageMetadata()
      
      const pageView = {
        sessionId: sessionIdRef.current,
        visitorId: visitorIdRef.current,
        pagePath: pathname,
        pageTitle: document.title,
        referrer: document.referrer || null,
        deviceType: getDeviceType(),
        browser: getBrowser(),
        os: getOS(),
        userAgent: getUserAgent(),
        utmSource: utmParams.utm_source,
        utmMedium: utmParams.utm_medium,
        utmCampaign: utmParams.utm_campaign,
        utmTerm: utmParams.utm_term,
        utmContent: utmParams.utm_content,
        // SEO enrichment data - updates seo_pages
        seo: pageMetadata,
      }
      
      if (debug) {
        console.log('[Analytics] Page view:', pageView)
      }
      
      try {
        const response = await fetch(`${apiUrl}/api/public/analytics/page-view`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify(pageView),
        })
        
        if (!response.ok && debug) {
          console.error('[Analytics] Error tracking page view:', response.statusText)
        }
      } catch (error) {
        if (debug) console.error('[Analytics] Error tracking page view:', error)
      }
    }
    
    // Use requestIdleCallback to defer tracking until browser is idle
    scheduleIdleTask(() => trackPageView())
  }, [pathname, searchParams, propApiUrl, propApiKey, trackPageViews, excludePaths, debug])

  // ============================================
  // Journey Path Tracking
  // ============================================
  useEffect(() => {
    if (!trackJourneys) return
    if (!pathname) return
    if (typeof window === 'undefined') return

    const { apiUrl: globalApiUrl, apiKey: globalApiKey } = getApiConfig()
    const apiUrl = propApiUrl || globalApiUrl
    const apiKey = propApiKey || globalApiKey
    
    if (!apiKey) return
    
    const now = Date.now()
    const previousPath = lastPathRef.current
    const previousDuration = pageEnterTimeRef.current > 0 
      ? Math.round((now - pageEnterTimeRef.current) / 1000) 
      : 0
    const previousScrollDepth = currentScrollDepthRef.current

    // Update tracking refs for next navigation
    pageEnterTimeRef.current = now
    currentScrollDepthRef.current = 0

    // Determine if this is a new session or continuation
    const isNewSession = !previousPath || journeyStartTimeRef.current === 0
    
    if (isNewSession) {
      journeyStartTimeRef.current = now
    }

    const trackJourneyStep = async () => {
      const sessionData: Record<string, any> = {
        sessionId: sessionIdRef.current,
        visitorId: visitorIdRef.current,
        action: isNewSession ? 'start' : 'update',
        lastPage: pathname,
        userAgent: getUserAgent(),
        // Journey step data
        journeyStep: {
          page: pathname,
          timestamp: new Date().toISOString(),
        },
      }

      // Include previous page duration when navigating
      if (!isNewSession && previousDuration > 0) {
        sessionData.previousPageDuration = previousDuration
        sessionData.previousPageScrollDepth = previousScrollDepth
      }

      // Include first page for new sessions
      if (isNewSession) {
        sessionData.firstPage = pathname
        const utmParams = getUTMParams()
        sessionData.referrer = document.referrer || null
        sessionData.utmSource = utmParams.utm_source
        sessionData.utmMedium = utmParams.utm_medium
        sessionData.utmCampaign = utmParams.utm_campaign
        sessionData.utmTerm = utmParams.utm_term
        sessionData.utmContent = utmParams.utm_content
        sessionData.screenWidth = window.screen.width
        sessionData.screenHeight = window.screen.height
      }

      if (debug) {
        console.log('[Analytics] Journey step:', sessionData)
      }

      try {
        await fetch(`${apiUrl}/api/public/analytics/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify(sessionData),
        })
      } catch (error) {
        if (debug) console.error('[Analytics] Error tracking journey:', error)
      }
    }

    scheduleIdleTask(() => trackJourneyStep())

    // Track session end on page unload
    const handleUnload = () => {
      const duration = Math.round((Date.now() - journeyStartTimeRef.current) / 1000)
      const payload = JSON.stringify({
        sessionId: sessionIdRef.current,
        action: 'end',
        duration,
        lastPage: pathname,
        previousPageDuration: Math.round((Date.now() - pageEnterTimeRef.current) / 1000),
        previousPageScrollDepth: currentScrollDepthRef.current,
      })

      // Use sendBeacon for reliability
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon(
          `${apiUrl}/api/public/analytics/session?key=${encodeURIComponent(apiKey)}`,
          blob
        )
      }
    }

    window.addEventListener('beforeunload', handleUnload)

    return () => {
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [pathname, propApiUrl, propApiKey, trackJourneys, debug])

  // ============================================
  // Scroll Depth Tracking
  // ============================================
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    if (debug) console.log('[Analytics] Scroll tracking setup:', { trackScrollDepth, hasApiKey: !!propApiKey })
    
    if (!trackScrollDepth) return

    const { apiUrl: globalApiUrl, apiKey: globalApiKey } = getApiConfig()
    const apiUrl = propApiUrl || globalApiUrl
    const apiKey = propApiKey || globalApiKey
    
    if (!apiKey) {
      if (debug) console.warn('[Analytics] Scroll tracking disabled - no API key')
      return
    }
    
    if (debug) console.log('[Analytics] Scroll tracking enabled for:', pathname)

    let maxDepth = 0
    let startTime = Date.now()
    let milestone25: number | null = null
    let milestone50: number | null = null
    let milestone75: number | null = null
    let milestone100: number | null = null
    let hasTracked = false

    const calculateScrollDepth = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight
      const winHeight = window.innerHeight
      const scrollableHeight = docHeight - winHeight
      
      if (scrollableHeight <= 0) return 100
      return Math.min(100, Math.round((scrollTop / scrollableHeight) * 100))
    }

    const handleScroll = () => {
      const depth = calculateScrollDepth()
      const elapsed = (Date.now() - startTime) / 1000

      if (depth > maxDepth) {
        maxDepth = depth
        currentScrollDepthRef.current = depth // Update ref for journey tracking
        if (debug && depth % 25 === 0) console.log('[Analytics] Scroll milestone:', depth + '%')
        
        if (depth >= 25 && milestone25 === null) milestone25 = elapsed
        if (depth >= 50 && milestone50 === null) milestone50 = elapsed
        if (depth >= 75 && milestone75 === null) milestone75 = elapsed
        if (depth >= 100 && milestone100 === null) milestone100 = elapsed
      }
    }

    const sendScrollData = async (useBeacon = false) => {
      if (hasTracked || maxDepth === 0) return
      hasTracked = true

      const totalTime = (Date.now() - startTime) / 1000
      
      const payload = JSON.stringify({
        sessionId: sessionIdRef.current,
        visitorId: visitorIdRef.current,
        pagePath: pathname,
        maxDepthPercent: maxDepth,
        timeTo25: milestone25,
        timeTo50: milestone50,
        timeTo75: milestone75,
        timeTo100: milestone100,
        totalTimeSeconds: totalTime,
        deviceType: getDeviceType(),
      })

      // Use sendBeacon for page unload (more reliable) or fetch for regular sends
      if (useBeacon && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' })
        const headers = new Headers({ 'x-api-key': apiKey })
        // sendBeacon doesn't support custom headers, so we need to include key in URL
        navigator.sendBeacon(
          `${apiUrl}/api/public/analytics/scroll-depth?key=${encodeURIComponent(apiKey)}`,
          blob
        )
        if (debug) console.log('[Analytics] Scroll depth (beacon):', { maxDepth, totalTime })
      } else {
        try {
          await fetch(`${apiUrl}/api/public/analytics/scroll-depth`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
            },
            body: payload,
            keepalive: true, // Allows request to outlive the page
          })
          
          if (debug) console.log('[Analytics] Scroll depth:', { maxDepth, totalTime })
        } catch (error) {
          if (debug) console.error('[Analytics] Error tracking scroll depth:', error)
        }
      }
    }

    // Reset on page change
    maxDepth = 0
    startTime = Date.now()
    milestone25 = null
    milestone50 = null
    milestone75 = null
    milestone100 = null
    hasTracked = false

    window.addEventListener('scroll', handleScroll, { passive: true })
    
    // Send on page unload or visibility change - use beacon for reliability
    const handleBeforeUnload = () => sendScrollData(true)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') sendScrollData(true)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      sendScrollData(false) // Send when component unmounts (navigation) - can use fetch here
    }
  }, [pathname, propApiUrl, propApiKey, trackScrollDepth, debug])

  // ============================================
  // Click/Heatmap Tracking
  // ============================================
  useEffect(() => {
    if (!trackClicks) return
    if (typeof window === 'undefined') return

    const { apiUrl: globalApiUrl, apiKey: globalApiKey } = getApiConfig()
    const apiUrl = propApiUrl || globalApiUrl
    const apiKey = propApiKey || globalApiKey
    if (!apiKey) return

    const handleClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target) return

      const docHeight = document.documentElement.scrollHeight
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      // Calculate click position as percentage
      const xPercent = Math.round((e.pageX / viewportWidth) * 100)
      const yPercent = Math.round(((e.pageY) / docHeight) * 100)

      // Get element info
      const elementTag = target.tagName.toLowerCase()
      const elementId = target.id || null
      const elementClass = target.className && typeof target.className === 'string' 
        ? target.className.split(' ').slice(0, 3).join(' ') 
        : null
      const elementText = target.textContent?.slice(0, 50) || null

      const clickData = {
        sessionId: sessionIdRef.current,
        pagePath: pathname,
        xPercent,
        yPercent,
        xAbsolute: e.pageX,
        yAbsolute: e.pageY,
        viewportWidth,
        viewportHeight,
        pageHeight: docHeight,
        elementTag,
        elementId,
        elementClass,
        elementText,
      }

      if (debug) console.log('[Analytics] Click:', clickData)

      scheduleIdleTask(async () => {
        try {
          await fetch(`${apiUrl}/api/public/analytics/heatmap-click`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
            },
            body: JSON.stringify(clickData),
          })
        } catch (error) {
          if (debug) console.error('[Analytics] Error tracking click:', error)
        }
      }, 500)
    }

    document.addEventListener('click', handleClick, { passive: true })

    return () => {
      document.removeEventListener('click', handleClick)
    }
  }, [pathname, propApiUrl, propApiKey, trackClicks, debug])
  
  // Track event function - uses idle callback for non-critical events
  const trackEvent = useCallback((options: TrackEventOptions) => {
    const doTrack = async () => {
      const { apiUrl: globalApiUrl, apiKey: globalApiKey } = getApiConfig()
      const apiUrl = propApiUrl || globalApiUrl
      const apiKey = propApiKey || globalApiKey
      
      if (!apiKey) {
        if (debug) console.warn('[Analytics] No API key configured')
        return
      }
      
      const event = {
        sessionId: sessionIdRef.current,
        visitorId: visitorIdRef.current,
        eventName: options.name,
        eventCategory: options.category,
        eventLabel: options.label,
        eventValue: options.value,
        properties: options.properties,
        pagePath: pathname,
      }
      
      if (debug) {
        console.log('[Analytics] Event:', event)
      }
      
      try {
        const response = await fetch(`${apiUrl}/api/public/analytics/event`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify(event),
        })
        
        if (!response.ok && debug) {
          console.error('[Analytics] Error tracking event:', response.statusText)
        }
      } catch (error) {
        if (debug) console.error('[Analytics] Error tracking event:', error)
      }
    }
    
    // Defer event tracking to idle time
    scheduleIdleTask(doTrack, 1000)
  }, [propApiUrl, propApiKey, pathname, debug])
  
  // Track conversion function - runs immediately (conversions are high priority)
  const trackConversion = useCallback((options: TrackConversionOptions) => {
    const doTrack = async () => {
      const { apiUrl: globalApiUrl, apiKey: globalApiKey } = getApiConfig()
      const apiUrl = propApiUrl || globalApiUrl
      const apiKey = propApiKey || globalApiKey
      
      if (!apiKey) {
        if (debug) console.warn('[Analytics] No API key configured')
        return
      }
      
      const conversion = {
        sessionId: sessionIdRef.current,
        visitorId: visitorIdRef.current,
        conversionType: options.type,
        value: options.value,
        currency: options.currency,
        metadata: options.metadata,
        pagePath: pathname,
        referrer: document.referrer || null,
        deviceType: getDeviceType(),
      }
      
      if (debug) {
        console.log('[Analytics] Conversion:', conversion)
      }
      
      try {
        const response = await fetch(`${apiUrl}/api/public/analytics/conversion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify(conversion),
        })
        
        if (!response.ok && debug) {
          console.error('[Analytics] Error tracking conversion:', response.statusText)
        }
      } catch (error) {
        if (debug) console.error('[Analytics] Error tracking conversion:', error)
      }
    }
    
    // Conversions run immediately (not deferred) since they're high-value events
    doTrack()
  }, [propApiUrl, propApiKey, pathname, debug])
  
  const contextValue = useMemo<AnalyticsContextValue>(() => ({
    trackEvent,
    trackConversion,
    sessionId: sessionIdRef.current,
    visitorId: visitorIdRef.current,
  }), [trackEvent, trackConversion])
  
  return (
    <AnalyticsContext.Provider value={contextValue}>
      {trackWebVitals && (
        <WebVitals 
          apiUrl={propApiUrl} 
          apiKey={propApiKey} 
          debug={debug} 
        />
      )}
      {children}
    </AnalyticsContext.Provider>
  )
}

// ============================================
// Hooks
// ============================================

export function useAnalytics(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext)
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider')
  }
  return context
}

export function useTrackEvent() {
  const { trackEvent, trackConversion } = useAnalytics()
  return { trackEvent, trackConversion }
}
