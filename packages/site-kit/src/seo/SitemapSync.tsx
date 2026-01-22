/**
 * SitemapSync - Automatically sync sitemap.xml to Portal API
 * 
 * This component should be included in your root layout to ensure
 * seo_pages stays in sync with your actual sitemap.
 * 
 * The sitemap.xml is the canonical source of truth for what pages exist.
 * Analytics will only track page views for pages that exist in seo_pages.
 * 
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { SitemapSync } from '@uptrade/seo'
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <SitemapSync />
 *         {children}
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 */

'use client'

import { useEffect, useRef } from 'react'

interface SitemapSyncProps {
  /** Custom sitemap URL (defaults to /sitemap.xml) */
  sitemapUrl?: string
  /** How often to re-sync in minutes (0 = only on mount, default: 60) */
  syncInterval?: number
  /** Enable debug logging */
  debug?: boolean
}

interface SitemapEntry {
  path: string
  lastmod?: string
  changefreq?: string
  priority?: number
}

function getApiConfig() {
  if (typeof window === 'undefined') return { apiUrl: '', apiKey: '' }
  
  const apiUrl = (window as any).__SITE_KIT_API_URL__ || 'https://api.uptrademedia.com'
  const apiKey = (window as any).__SITE_KIT_API_KEY__ || ''
  return { apiUrl, apiKey }
}

/**
 * Parse sitemap.xml and extract entries
 */
async function parseSitemap(sitemapUrl: string, debug: boolean): Promise<SitemapEntry[]> {
  try {
    const response = await fetch(sitemapUrl)
    if (!response.ok) {
      if (debug) console.warn('[SitemapSync] Failed to fetch sitemap:', response.status)
      return []
    }
    
    const text = await response.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(text, 'application/xml')
    
    // Check for parse errors
    const parseError = doc.querySelector('parsererror')
    if (parseError) {
      if (debug) console.warn('[SitemapSync] Sitemap parse error:', parseError.textContent)
      return []
    }
    
    const urls = doc.querySelectorAll('url')
    const entries: SitemapEntry[] = []
    
    urls.forEach(url => {
      const loc = url.querySelector('loc')?.textContent
      if (!loc) return
      
      // Extract path from full URL
      let path: string
      try {
        const urlObj = new URL(loc)
        path = urlObj.pathname
      } catch {
        // If it's already a path, use it directly
        path = loc.startsWith('/') ? loc : `/${loc}`
      }
      
      // Normalize path
      if (path !== '/' && path.endsWith('/')) {
        path = path.slice(0, -1)
      }
      
      const lastmod = url.querySelector('lastmod')?.textContent || undefined
      const changefreq = url.querySelector('changefreq')?.textContent || undefined
      const priorityStr = url.querySelector('priority')?.textContent
      const priority = priorityStr ? parseFloat(priorityStr) : undefined
      
      entries.push({ path, lastmod, changefreq, priority })
    })
    
    if (debug) {
      console.log(`[SitemapSync] Parsed ${entries.length} entries from sitemap`)
    }
    
    return entries
  } catch (error) {
    if (debug) console.error('[SitemapSync] Error parsing sitemap:', error)
    return []
  }
}

/**
 * Push sitemap entries to Portal API
 */
async function syncToPortal(
  entries: SitemapEntry[], 
  apiUrl: string, 
  apiKey: string,
  debug: boolean
): Promise<{ success: boolean; created: number; updated: number }> {
  if (!apiKey) {
    if (debug) console.warn('[SitemapSync] No API key configured')
    return { success: false, created: 0, updated: 0 }
  }
  
  if (entries.length === 0) {
    if (debug) console.log('[SitemapSync] No entries to sync')
    return { success: true, created: 0, updated: 0 }
  }
  
  try {
    const response = await fetch(`${apiUrl}/api/public/seo/register-sitemap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        entries: entries.map(e => ({
          path: e.path,
          priority: e.priority,
          changefreq: e.changefreq,
        })),
      }),
    })
    
    if (!response.ok) {
      if (debug) console.error('[SitemapSync] API error:', response.status, response.statusText)
      return { success: false, created: 0, updated: 0 }
    }
    
    const result = await response.json()
    
    if (debug) {
      console.log(`[SitemapSync] Synced: ${result.created} created, ${result.updated} updated`)
    }
    
    return {
      success: true,
      created: result.created || 0,
      updated: result.updated || 0,
    }
  } catch (error) {
    if (debug) console.error('[SitemapSync] Sync error:', error)
    return { success: false, created: 0, updated: 0 }
  }
}

export function SitemapSync({
  sitemapUrl = '/sitemap.xml',
  syncInterval = 60,
  debug = false,
}: SitemapSyncProps) {
  const hasSyncedRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  
  useEffect(() => {
    const doSync = async () => {
      const { apiUrl, apiKey } = getApiConfig()
      
      if (!apiKey) {
        if (debug) console.warn('[SitemapSync] No API key found')
        return
      }
      
      if (debug) console.log('[SitemapSync] Starting sitemap sync...')
      
      // Parse sitemap.xml
      const entries = await parseSitemap(sitemapUrl, debug)
      
      if (entries.length > 0) {
        // Push to Portal API
        await syncToPortal(entries, apiUrl, apiKey, debug)
      }
    }
    
    // Initial sync (only once)
    if (!hasSyncedRef.current) {
      hasSyncedRef.current = true
      doSync()
    }
    
    // Set up interval for periodic re-sync
    if (syncInterval > 0) {
      intervalRef.current = setInterval(doSync, syncInterval * 60 * 1000)
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [sitemapUrl, syncInterval, debug])
  
  // This component renders nothing
  return null
}

export default SitemapSync
