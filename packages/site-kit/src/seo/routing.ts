import { getRedirectData, getRobotsData, getSitemapEntries } from './api'
import type { 
  GetRedirectOptions, 
  RedirectResult, 
  GetRobotsOptions, 
  RobotsDirective,
  GetSitemapEntriesOptions,
  SitemapEntry 
} from './types'

/**
 * Get redirect for a path if one exists
 * 
 * Use in Next.js middleware to handle managed redirects
 * 
 * @example
 * ```tsx
 * // middleware.ts
 * import { getRedirect } from '@uptrade/seo'
 * 
 * export async function middleware(request) {
 *   const redirect = await getRedirect({
 *     projectId: process.env.UPTRADE_PROJECT_ID!,
 *     path: request.nextUrl.pathname
 *   })
 *   
 *   if (redirect) {
 *     return NextResponse.redirect(redirect.destination, redirect.statusCode)
 *   }
 * }
 * ```
 */
export async function getRedirect(
  options: GetRedirectOptions
): Promise<RedirectResult | null> {
  const { projectId, path } = options

  const redirect = await getRedirectData(projectId, path)

  if (!redirect) {
    return null
  }

  // Check if expired
  if (redirect.expires_at && new Date(redirect.expires_at) < new Date()) {
    return null
  }

  // Determine destination
  const destination = redirect.destination_url || redirect.destination_path
  const isExternal = destination.startsWith('http://') || destination.startsWith('https://')

  return {
    destination,
    statusCode: redirect.status_code,
    isExternal,
  }
}

/**
 * Parse robots directive string into structured object
 */
function parseRobotsString(robots: string): RobotsDirective {
  const directive: RobotsDirective = {
    index: true,
    follow: true,
  }

  const parts = robots.toLowerCase().split(',').map(p => p.trim())

  for (const part of parts) {
    if (part === 'noindex') directive.index = false
    if (part === 'nofollow') directive.follow = false
    if (part === 'noarchive') directive.noarchive = true
    if (part === 'nosnippet') directive.nosnippet = true
    if (part === 'noimageindex') directive.noimageindex = true
    if (part.startsWith('max-snippet:')) {
      directive.max_snippet = parseInt(part.split(':')[1], 10)
    }
    if (part.startsWith('max-image-preview:')) {
      const value = part.split(':')[1] as 'none' | 'standard' | 'large'
      directive.max_image_preview = value
    }
    if (part.startsWith('max-video-preview:')) {
      directive.max_video_preview = parseInt(part.split(':')[1], 10)
    }
  }

  return directive
}

/**
 * Get robots directive for a page
 * 
 * @example
 * ```tsx
 * const robots = await getRobotsDirective({
 *   projectId: process.env.UPTRADE_PROJECT_ID!,
 *   path: '/private-page'
 * })
 * 
 * if (!robots.index) {
 *   // Page should not be indexed
 * }
 * ```
 */
export async function getRobotsDirective(
  options: GetRobotsOptions
): Promise<RobotsDirective> {
  const { projectId, path } = options

  const robotsString = await getRobotsData(projectId, path)

  if (!robotsString) {
    // Default: index and follow
    return { index: true, follow: true }
  }

  return parseRobotsString(robotsString)
}

/**
 * Get sitemap entries for a project
 * 
 * Use in sitemap.ts to generate dynamic sitemap
 * 
 * @example
 * ```tsx
 * // app/sitemap.ts
 * import { generateSitemap } from '@uptrade/seo'
 * 
 * export default async function sitemap() {
 *   return generateSitemap({
 *     projectId: process.env.UPTRADE_PROJECT_ID!,
 *     baseUrl: 'https://example.com',
 *     publishedOnly: true
 *   })
 * }
 * ```
 */
export async function generateSitemap(
  options: GetSitemapEntriesOptions
): Promise<SitemapEntry[]> {
  const { projectId, baseUrl, publishedOnly = true } = options

  const pages = await getSitemapEntries(projectId, { publishedOnly })

  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

  return pages.map(page => ({
    path: page.path,
    url: `${normalizedBase}${page.path}`,
    lastmod: page.updated_at,
    changefreq: page.sitemap_changefreq || 'weekly',
    priority: page.sitemap_priority || 0.5,
  }))
}

/**
 * Register local sitemap entries with Uptrade Portal
 * 
 * Call this at build time to sync your local routes to seo_pages.
 * This ensures analytics only tracks real pages.
 * 
 * @example
 * ```ts
 * // scripts/register-sitemap.ts
 * import { registerLocalSitemap } from '@uptrade/seo'
 * 
 * // Option 1: Provide entries directly
 * await registerLocalSitemap({
 *   entries: [
 *     { path: '/', title: 'Home', priority: 1.0 },
 *     { path: '/about', title: 'About Us', priority: 0.8 },
 *   ]
 * })
 * 
 * // Option 2: Auto-discover from Next.js app directory
 * await registerLocalSitemap({ autoDiscover: true })
 * ```
 */
export async function registerLocalSitemap(options: {
  entries?: Array<{
    path: string
    title?: string
    priority?: number
    changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  }>
  autoDiscover?: boolean
}): Promise<{ success: boolean; created: number; updated: number }> {
  const { registerSitemap } = await import('./api')
  
  let entries = options.entries || []
  
  // Auto-discover from Next.js app directory if requested
  if (options.autoDiscover && entries.length === 0) {
    try {
      const fs = await import('fs')
      const path = await import('path')
      
      const appDir = path.join(process.cwd(), 'app')
      if (fs.existsSync(appDir)) {
        entries = discoverNextJsRoutes(appDir, fs, path)
        console.log(`[Uptrade] Auto-discovered ${entries.length} routes from app directory`)
      }
    } catch (error) {
      console.error('[Uptrade] Auto-discovery failed:', error)
    }
  }
  
  if (entries.length === 0) {
    console.warn('[Uptrade] No sitemap entries to register')
    return { success: true, created: 0, updated: 0 }
  }
  
  console.log(`[Uptrade] Registering ${entries.length} sitemap entries...`)
  const result = await registerSitemap(entries)
  
  if (result.success) {
    console.log(`[Uptrade] Sitemap registered: ${result.created} new, ${result.updated} updated`)
  }
  
  return result
}

/**
 * Discover routes from Next.js app directory
 */
function discoverNextJsRoutes(
  appDir: string,
  fs: typeof import('fs'),
  path: typeof import('path'),
  basePath: string = ''
): Array<{ path: string; priority: number }> {
  const entries: Array<{ path: string; priority: number }> = []
  
  const items = fs.readdirSync(appDir, { withFileTypes: true })
  
  for (const item of items) {
    // Skip private folders, api routes, and special files
    if (item.name.startsWith('_') || item.name.startsWith('.')) continue
    if (item.name === 'api') continue
    if (item.name === 'node_modules') continue
    
    const itemPath = path.join(appDir, item.name)
    
    if (item.isDirectory()) {
      // Check for page.tsx/page.js in this directory
      const hasPage = fs.existsSync(path.join(itemPath, 'page.tsx')) ||
                      fs.existsSync(path.join(itemPath, 'page.js')) ||
                      fs.existsSync(path.join(itemPath, 'page.jsx'))
      
      // Handle route groups (parentheses)
      const isRouteGroup = item.name.startsWith('(') && item.name.endsWith(')')
      
      // Handle dynamic segments [slug]
      const isDynamic = item.name.startsWith('[') && item.name.endsWith(']')
      
      let routePath = basePath
      if (!isRouteGroup && !isDynamic) {
        routePath = `${basePath}/${item.name}`
      }
      
      if (hasPage && !isDynamic) {
        const priority = routePath === '' ? 1.0 : 0.8
        entries.push({ path: routePath || '/', priority })
      }
      
      // Recurse into subdirectories (but not dynamic ones)
      if (!isDynamic) {
        const subEntries = discoverNextJsRoutes(itemPath, fs, path, isRouteGroup ? basePath : routePath)
        entries.push(...subEntries)
      }
    }
  }
  
  // Add root if app/page.tsx exists and we're at root
  if (basePath === '') {
    const hasRootPage = fs.existsSync(path.join(appDir, 'page.tsx')) ||
                        fs.existsSync(path.join(appDir, 'page.js')) ||
                        fs.existsSync(path.join(appDir, 'page.jsx'))
    if (hasRootPage) {
      entries.unshift({ path: '/', priority: 1.0 })
    }
  }
  
  return entries
}

/**
 * Check if a path should be indexed
 * 
 * Quick helper to check indexability without full directive parsing
 */
export async function isIndexable(
  projectId: string,
  path: string
): Promise<boolean> {
  const directive = await getRobotsDirective({ projectId, path })
  return directive.index
}
