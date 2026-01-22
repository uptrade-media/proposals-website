/**
 * @uptrade/site-kit - SiteKitProvider
 * 
 * Unified provider component that initializes all enabled modules.
 * All API calls go through Portal API with API key auth - never Supabase directly.
 */

'use client'

import React, { createContext, useContext, useMemo, useEffect, ReactNode, Suspense } from 'react'
import type { SiteKitConfig } from './types'

// Module providers
import { AnalyticsProvider } from './analytics/AnalyticsProvider'
import { EngageWidget } from './engage/EngageWidget'
import { configureFormsApi } from './forms/formsApi'
import { SitemapSync } from './seo/SitemapSync'

interface SiteKitContextValue extends SiteKitConfig {
  isReady: boolean
}

const SiteKitContext = createContext<SiteKitContextValue | null>(null)

export function useSiteKit(): SiteKitContextValue {
  const context = useContext(SiteKitContext)
  if (!context) {
    throw new Error('useSiteKit must be used within a SiteKitProvider')
  }
  return context
}

interface SiteKitProviderProps extends SiteKitConfig {
  children: ReactNode
}

export function SiteKitProvider({
  children,
  apiUrl = 'https://api.uptrademedia.com',
  apiKey,
  analytics,
  engage,
  forms,
  debug = false,
}: SiteKitProviderProps) {
  // Set window globals for Portal API access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as any).__SITE_KIT_API_URL__ = apiUrl
      ;(window as any).__SITE_KIT_API_KEY__ = apiKey
      ;(window as any).__SITE_KIT_DEBUG__ = debug
    }
    
    // Configure forms API
    configureFormsApi({
      baseUrl: apiUrl,
      apiKey,
    })
  }, [apiUrl, apiKey, debug])

  const contextValue = useMemo<SiteKitContextValue>(
    () => ({
      apiUrl,
      apiKey,
      analytics,
      engage,
      forms,
      debug,
      isReady: true,
    }),
    [apiUrl, apiKey, analytics, engage, forms, debug]
  )

  // Build the provider tree based on enabled modules
  let content = <>{children}</>

  // Wrap with Analytics if enabled
  if (analytics?.enabled) {
    content = (
      <Suspense fallback={null}>
        <AnalyticsProvider
          apiUrl={apiUrl}
          apiKey={apiKey}
          trackPageViews={analytics.trackPageViews !== false}
          trackWebVitals={analytics.trackWebVitals !== false}
          trackScrollDepth={analytics.trackScrollDepth !== false}
          trackClicks={analytics.trackClicks !== false}
          debug={debug}
        >
          {content}
        </AnalyticsProvider>
      </Suspense>
    )
  }

  // Add Engage widget if enabled (doesn't wrap, just renders alongside)
  if (engage?.enabled) {
    content = (
      <>
        {content}
        <EngageWidget apiUrl={apiUrl} apiKey={apiKey} />
      </>
    )
  }

  // Always include SitemapSync to keep seo_pages in sync with sitemap.xml
  // This is the canonical source of truth for what pages exist
  content = (
    <>
      {content}
      <SitemapSync debug={debug} />
    </>
  )

  return (
    <SiteKitContext.Provider value={contextValue}>
      {content}
    </SiteKitContext.Provider>
  )
}

/**
 * Hook to check if a specific module is enabled
 */
export function useModuleEnabled(module: 'analytics' | 'engage' | 'forms' | 'seo'): boolean {
  const context = useSiteKit()
  
  switch (module) {
    case 'analytics':
      return context.analytics?.enabled ?? false
    case 'engage':
      return context.engage?.enabled ?? false
    case 'forms':
      return context.forms?.enabled ?? false
    case 'seo':
      return true // SEO is always enabled via RSC components
    default:
      return false
  }
}
