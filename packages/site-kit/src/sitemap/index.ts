/**
 * @uptrade/site-kit - Sitemap Generator
 * 
 * Automatically generates sitemap.xml from Next.js app directory structure.
 * Works at build time to discover all pages and sync them to Portal API.
 * 
 * @example
 * ```ts
 * // app/sitemap.ts
 * import { createSitemap } from '@uptrade/site-kit/sitemap'
 * 
 * export default createSitemap({
 *   baseUrl: 'https://example.com',
 *   // Optional: exclude patterns
 *   exclude: ['/admin/*', '/api/*'],
 *   // Optional: additional dynamic routes
 *   additionalPaths: async () => [
 *     { path: '/blog/post-1', priority: 0.7 },
 *   ]
 * })
 * ```
 */

import { readdirSync, statSync, existsSync } from 'fs'
import { join, relative } from 'path'

export interface SitemapEntry {
  url: string
  lastModified?: Date | string
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

export interface SitemapConfig {
  /** Base URL for the site (required) */
  baseUrl: string
  /** Glob patterns to exclude (e.g., ['/admin/*', '/api/*']) */
  exclude?: string[]
  /** Default priority for pages */
  defaultPriority?: number
  /** Default change frequency */
  defaultChangeFrequency?: SitemapEntry['changeFrequency']
  /** Additional paths to include (for dynamic routes) */
  additionalPaths?: () => Promise<Array<{ path: string; priority?: number; changeFrequency?: SitemapEntry['changeFrequency'] }>>
  /** Priority overrides by path pattern */
  priorities?: Record<string, number>
  /** Portal API URL for syncing (defaults to NEXT_PUBLIC_UPTRADE_API_URL or https://api.uptrademedia.com) */
  apiUrl?: string
  /** Portal API key for syncing (defaults to NEXT_PUBLIC_UPTRADE_API_KEY) */
  apiKey?: string
  /** Disable auto-sync to Portal API */
  disableSync?: boolean
}

// Route groups and special folders to ignore
const IGNORED_FOLDERS = [
  'api',
  'admin',
  '_uptrade',
  '%5Fuptrade', // URL-encoded _uptrade
  'uptrade-setup',
  'offline',
]

// File patterns that indicate a page
const PAGE_FILES = ['page.tsx', 'page.jsx', 'page.js', 'page.ts']

/**
 * Check if a path matches any exclude pattern
 */
function isExcluded(path: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    if (pattern.endsWith('/*')) {
      const prefix = pattern.slice(0, -2)
      return path.startsWith(prefix)
    }
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1)
      return path.startsWith(prefix)
    }
    return path === pattern
  })
}

/**
 * Recursively discover pages from the app directory
 */
function discoverPages(
  appDir: string,
  currentPath: string = '',
  pages: string[] = []
): string[] {
  const fullPath = join(appDir, currentPath)
  
  if (!existsSync(fullPath)) {
    return pages
  }

  const entries = readdirSync(fullPath)
  
  // Check if this directory has a page file
  const hasPage = entries.some(entry => PAGE_FILES.includes(entry))
  
  if (hasPage) {
    // Convert directory path to URL path
    let urlPath = '/' + currentPath
    
    // Handle route groups (parentheses) - remove them from URL
    urlPath = urlPath.replace(/\/\([^)]+\)/g, '')
    
    // Clean up path
    urlPath = urlPath.replace(/\/+/g, '/') // Remove double slashes
    if (urlPath !== '/' && urlPath.endsWith('/')) {
      urlPath = urlPath.slice(0, -1) // Remove trailing slash
    }
    
    pages.push(urlPath)
  }
  
  // Recurse into subdirectories
  for (const entry of entries) {
    const entryPath = join(fullPath, entry)
    const stat = statSync(entryPath)
    
    if (stat.isDirectory()) {
      // Skip ignored folders
      const folderName = entry.toLowerCase()
      if (IGNORED_FOLDERS.some(ignored => folderName.includes(ignored))) {
        continue
      }
      
      // Skip dynamic route segments for now (would need runtime data)
      if (entry.startsWith('[') && entry.endsWith(']')) {
        continue
      }
      
      // Skip private folders
      if (entry.startsWith('_')) {
        continue
      }
      
      discoverPages(appDir, join(currentPath, entry), pages)
    }
  }
  
  return pages
}

/**
 * Find the app directory from the current working directory
 */
function findAppDir(): string {
  const cwd = process.cwd()
  
  // Try common locations
  const candidates = [
    join(cwd, 'app'),
    join(cwd, 'src', 'app'),
  ]
  
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }
  
  throw new Error(
    '[site-kit] Could not find app directory. Ensure you have an "app" or "src/app" folder.'
  )
}

/**
 * Get priority for a path based on config
 */
function getPriority(path: string, config: SitemapConfig): number {
  // Check priority overrides
  if (config.priorities) {
    for (const [pattern, priority] of Object.entries(config.priorities)) {
      if (pattern.endsWith('/*')) {
        const prefix = pattern.slice(0, -2)
        if (path.startsWith(prefix)) return priority
      } else if (path === pattern) {
        return priority
      }
    }
  }
  
  // Home page gets highest priority
  if (path === '/') return 1.0
  
  // Shallow pages get higher priority
  const depth = path.split('/').filter(Boolean).length
  if (depth === 1) return 0.8
  if (depth === 2) return 0.6
  
  return config.defaultPriority ?? 0.5
}

/**
 * Sync sitemap entries to Portal API
 * Called automatically by createSitemap at build time
 */
export async function syncSitemapToPortal(
  entries: SitemapEntry[],
  apiUrl: string,
  apiKey: string
): Promise<{ success: boolean; created: number; updated: number }> {
  if (!apiKey) {
    console.warn('[site-kit] No API key provided, skipping sitemap sync')
    return { success: false, created: 0, updated: 0 }
  }
  
  const normalizedEntries = entries.map(entry => {
    let path: string
    try {
      const url = new URL(entry.url)
      path = url.pathname
    } catch {
      path = entry.url.startsWith('/') ? entry.url : `/${entry.url}`
    }
    
    return {
      path,
      priority: entry.priority,
      changefreq: entry.changeFrequency,
    }
  })
  
  try {
    const response = await fetch(`${apiUrl}/api/public/seo/register-sitemap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ entries: normalizedEntries }),
    })
    
    if (!response.ok) {
      console.error('[site-kit] Sitemap sync failed:', response.status, await response.text())
      return { success: false, created: 0, updated: 0 }
    }
    
    const result = await response.json()
    
    return {
      success: true,
      created: result.created || 0,
      updated: result.updated || 0,
    }
  } catch (error) {
    console.error('[site-kit] Sitemap sync error:', error)
    return { success: false, created: 0, updated: 0 }
  }
}

/**
 * Create a sitemap generator function for Next.js
 * Automatically syncs to Portal API at build time.
 * 
 * @example
 * ```ts
 * // app/sitemap.ts
 * import { createSitemap } from '@uptrade/site-kit/sitemap'
 * 
 * export default createSitemap({
 *   baseUrl: 'https://example.com'
 * })
 * ```
 */
export function createSitemap(config: SitemapConfig): () => SitemapEntry[] | Promise<SitemapEntry[]> {
  return async () => {
    const { baseUrl, exclude = [], defaultChangeFrequency = 'weekly' } = config
    
    // Normalize base URL
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    
    // Default exclusions
    const allExclusions = [
      '/api/*',
      '/admin/*',
      '/_uptrade/*',
      '/uptrade-setup/*',
      '/offline/*',
      ...exclude,
    ]
    
    // Discover pages from app directory
    let pages: string[] = []
    try {
      const appDir = findAppDir()
      pages = discoverPages(appDir)
    } catch (error) {
      console.warn('[site-kit] Failed to discover pages:', error)
      // Fall back to just the home page
      pages = ['/']
    }
    
    // Filter out excluded pages
    pages = pages.filter(page => !isExcluded(page, allExclusions))
    
    // Build sitemap entries
    const entries: SitemapEntry[] = pages.map(path => ({
      url: `${normalizedBaseUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: defaultChangeFrequency,
      priority: getPriority(path, config),
    }))
    
    // Add additional dynamic paths if provided
    if (config.additionalPaths) {
      try {
        const additional = await config.additionalPaths()
        for (const item of additional) {
          if (!isExcluded(item.path, allExclusions)) {
            entries.push({
              url: `${normalizedBaseUrl}${item.path}`,
              lastModified: new Date(),
              changeFrequency: item.changeFrequency ?? defaultChangeFrequency,
              priority: item.priority ?? getPriority(item.path, config),
            })
          }
        }
      } catch (error) {
        console.warn('[site-kit] Failed to get additional paths:', error)
      }
    }
    
    // Sort by priority descending
    entries.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    
    console.log(`[site-kit] Generated sitemap with ${entries.length} pages`)
    
    // Auto-sync to Portal API at build time (unless disabled)
    if (!config.disableSync) {
      const apiUrl = config.apiUrl || process.env.NEXT_PUBLIC_UPTRADE_API_URL || 'https://api.uptrademedia.com'
      const apiKey = config.apiKey || process.env.NEXT_PUBLIC_UPTRADE_API_KEY
      
      if (apiKey) {
        // Fire and forget - don't block sitemap generation
        syncSitemapToPortal(entries, apiUrl, apiKey)
          .then(result => {
            if (result.success) {
              console.log(`[site-kit] Synced to Portal API: ${result.created} created, ${result.updated} updated`)
            }
          })
          .catch(err => {
            console.warn('[site-kit] Failed to sync sitemap to Portal API:', err.message)
          })
      } else {
        console.log('[site-kit] No API key found, skipping Portal API sync')
      }
    }
    
    return entries
  }
}

export default createSitemap
