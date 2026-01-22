import { getRedirectData, getRobotsData, getSitemapEntries } from './supabase'
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
