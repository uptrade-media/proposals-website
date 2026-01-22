/**
 * @uptrade/site-kit/seo - API Functions
 * 
 * All SEO data fetching goes through Portal API with API key auth.
 * These functions are designed for server-side use (RSC/SSR).
 */

import { cache } from 'react'

// ============================================
// API Config
// ============================================

function getApiConfig() {
  const apiUrl = process.env.NEXT_PUBLIC_UPTRADE_API_URL || 'https://api.uptrademedia.com'
  const apiKey = process.env.NEXT_PUBLIC_UPTRADE_API_KEY || ''
  return { apiUrl, apiKey }
}

async function apiPost<T>(endpoint: string, body: Record<string, any> = {}): Promise<T | null> {
  const { apiUrl, apiKey } = getApiConfig()
  
  if (!apiKey) {
    console.error('@uptrade/seo: No API key configured. Set NEXT_PUBLIC_UPTRADE_API_KEY.')
    return null
  }
  
  try {
    const response = await fetch(`${apiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(body),
      next: { revalidate: 60 }, // Cache for 60 seconds
    })
    
    if (!response.ok) {
      console.error(`@uptrade/seo: API error: ${response.statusText}`)
      return null
    }
    
    return await response.json()
  } catch (error) {
    console.error('@uptrade/seo: Network error:', error)
    return null
  }
}

// ============================================
// Cached Data Fetchers
// ============================================

/**
 * Fetch SEO page data - cached per request
 */
export const getSEOPageData = cache(async (
  projectId: string,
  path: string
) => {
  const result = await apiPost<{ page: any }>('/api/public/seo/page', { path })
  return result?.page || null
})

/**
 * Fetch schema markups for a page - cached per request
 */
export const getSchemaMarkups = cache(async (
  projectId: string,
  path: string,
  options?: { includeTypes?: string[]; excludeTypes?: string[] }
) => {
  const result = await apiPost<{ schemas: any[] }>('/api/public/seo/schemas', {
    path,
    includeTypes: options?.includeTypes,
    excludeTypes: options?.excludeTypes,
  })
  return result?.schemas || []
})

/**
 * Fetch FAQ data for a page - cached per request
 */
export const getFAQData = cache(async (
  projectId: string,
  path: string
) => {
  const result = await apiPost<{ faq: any }>('/api/public/seo/faq', { path })
  return result?.faq || null
})

/**
 * Fetch internal links for a page - cached per request
 */
export const getInternalLinks = cache(async (
  projectId: string,
  sourcePath: string,
  options?: { position?: string; limit?: number }
) => {
  const result = await apiPost<{ links: any[] }>('/api/public/seo/internal-links', {
    sourcePath,
    position: options?.position,
    limit: options?.limit,
  })
  return result?.links || []
})

/**
 * Fetch content block - cached per request
 */
export const getContentBlock = cache(async (
  projectId: string,
  path: string,
  section: string
) => {
  const result = await apiPost<{ content: any }>('/api/public/seo/content', { path, section })
  return result?.content || null
})

/**
 * Fetch A/B test and determine variant - cached per request
 */
export const getABTest = cache(async (
  projectId: string,
  path: string,
  field: string
) => {
  const result = await apiPost<{ test: any }>('/api/public/seo/ab-test', { path, field })
  return result?.test || null
})

/**
 * Record A/B test impression
 */
export async function recordABImpression(
  testId: string,
  variant: 'a' | 'b',
  sessionId?: string
): Promise<void> {
  await apiPost('/api/public/seo/ab-impression', { testId, variant, sessionId })
}

/**
 * Fetch redirect for a path - cached per request
 */
export const getRedirectData = cache(async (
  projectId: string,
  path: string
) => {
  const result = await apiPost<{ redirect: any }>('/api/public/seo/redirect', { path })
  return result?.redirect || null
})

/**
 * Fetch managed scripts - cached per request
 */
export const getManagedScripts = cache(async (
  projectId: string,
  position: string,
  currentPath?: string
) => {
  const result = await apiPost<{ scripts: any[] }>('/api/public/seo/scripts', {
    position,
    currentPath,
  })
  return result?.scripts || []
})

/**
 * Fetch robots directive for a page - cached per request
 */
export const getRobotsData = cache(async (
  projectId: string,
  path: string
) => {
  const result = await apiPost<{ page: any }>('/api/public/seo/page', { path })
  return result?.page?.managed_robots || null
})

/**
 * Fetch sitemap entries - cached per request
 */
export const getSitemapEntries = cache(async (
  projectId: string,
  options?: { publishedOnly?: boolean }
) => {
  const result = await apiPost<{ entries: any[] }>('/api/public/seo/sitemap', {
    publishedOnly: options?.publishedOnly,
  })
  return result?.entries || []
})

/**
 * Register/sync sitemap entries from the client site
 * Call this at build time to populate seo_pages from your sitemap.xml
 * 
 * @example
 * ```ts
 * // scripts/register-sitemap.ts (run at build time)
 * import { registerSitemap } from '@uptrade/seo/server'
 * 
 * await registerSitemap([
 *   { path: '/', priority: 1.0, changefreq: 'daily' },
 *   { path: '/about', priority: 0.8, changefreq: 'weekly' },
 * ])
 * ```
 */
export async function registerSitemap(
  entries: Array<{
    path: string
    title?: string
    priority?: number
    changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  }>
): Promise<{ success: boolean; created: number; updated: number }> {
  const { apiUrl, apiKey } = getApiConfig()
  
  if (!apiKey) {
    console.error('@uptrade/seo: No API key configured. Set NEXT_PUBLIC_UPTRADE_API_KEY.')
    return { success: false, created: 0, updated: 0 }
  }
  
  try {
    const response = await fetch(`${apiUrl}/api/public/seo/register-sitemap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ entries }),
    })
    
    if (!response.ok) {
      console.error(`@uptrade/seo: Sitemap registration failed: ${response.statusText}`)
      return { success: false, created: 0, updated: 0 }
    }
    
    return await response.json()
  } catch (error) {
    console.error('@uptrade/seo: Sitemap registration error:', error)
    return { success: false, created: 0, updated: 0 }
  }
}
