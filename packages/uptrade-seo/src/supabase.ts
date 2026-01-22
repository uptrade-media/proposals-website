import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { cache } from 'react'

// ============================================
// Supabase Client Singleton
// ============================================

let supabaseInstance: SupabaseClient | null = null

/**
 * Get or create Supabase client for server-side use
 * Uses environment variables by default, can be overridden
 */
export function getSupabaseClient(
  url?: string,
  key?: string
): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance
  }

  const supabaseUrl = url || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = key || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      '@uptrade/seo: Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
    )
  }

  supabaseInstance = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return supabaseInstance
}

/**
 * Reset client (useful for testing)
 */
export function resetSupabaseClient(): void {
  supabaseInstance = null
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
  const supabase = getSupabaseClient()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  const { data, error } = await supabase
    .from('seo_pages')
    .select(`
      id,
      project_id,
      path,
      url,
      managed_title,
      managed_description,
      managed_og_title,
      managed_og_description,
      managed_og_image,
      managed_canonical,
      managed_robots,
      managed_keywords,
      updated_at
    `)
    .eq('project_id', projectId)
    .eq('path', normalizedPath)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('@uptrade/seo: Error fetching page data:', error)
  }

  return data
})

/**
 * Fetch schema markups for a page - cached per request
 */
export const getSchemaMarkups = cache(async (
  projectId: string,
  path: string,
  options?: { includeTypes?: string[]; excludeTypes?: string[] }
) => {
  const supabase = getSupabaseClient()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  let query = supabase
    .from('seo_schema_markup')
    .select('*')
    .eq('project_id', projectId)
    .eq('page_path', normalizedPath)
    .eq('is_implemented', true)

  if (options?.includeTypes?.length) {
    query = query.in('schema_type', options.includeTypes)
  }

  if (options?.excludeTypes?.length) {
    query = query.not('schema_type', 'in', `(${options.excludeTypes.join(',')})`)
  }

  const { data, error } = await query

  if (error) {
    console.error('@uptrade/seo: Error fetching schemas:', error)
    return []
  }

  return data || []
})

/**
 * Fetch FAQ data for a page - cached per request
 */
export const getFAQData = cache(async (
  projectId: string,
  path: string
) => {
  const supabase = getSupabaseClient()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  const { data, error } = await supabase
    .from('seo_managed_faqs')
    .select(`
      id,
      project_id,
      path,
      title,
      description,
      items,
      include_schema,
      updated_at
    `)
    .eq('project_id', projectId)
    .eq('path', normalizedPath)
    .eq('is_published', true)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('@uptrade/seo: Error fetching FAQ data:', error)
  }

  return data
})

/**
 * Fetch internal links for a page - cached per request
 */
export const getInternalLinks = cache(async (
  projectId: string,
  sourcePath: string,
  options?: { position?: string; limit?: number }
) => {
  const supabase = getSupabaseClient()
  const normalizedPath = sourcePath.startsWith('/') ? sourcePath : `/${sourcePath}`

  let query = supabase
    .from('seo_managed_links')
    .select('*')
    .eq('project_id', projectId)
    .eq('source_path', normalizedPath)
    .eq('is_active', true)
    .order('priority', { ascending: true })

  if (options?.position) {
    query = query.eq('position', options.position)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('@uptrade/seo: Error fetching internal links:', error)
    return []
  }

  return data || []
})

/**
 * Fetch content block - cached per request
 */
export const getContentBlock = cache(async (
  projectId: string,
  path: string,
  section: string
) => {
  const supabase = getSupabaseClient()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  const { data, error } = await supabase
    .from('seo_managed_content')
    .select('*')
    .eq('project_id', projectId)
    .eq('path', normalizedPath)
    .eq('section', section)
    .eq('is_published', true)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('@uptrade/seo: Error fetching content block:', error)
  }

  return data
})

/**
 * Fetch A/B test and determine variant - cached per request
 */
export const getABTest = cache(async (
  projectId: string,
  path: string,
  field: string
) => {
  const supabase = getSupabaseClient()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  const { data, error } = await supabase
    .from('seo_ab_tests')
    .select('*')
    .eq('project_id', projectId)
    .eq('path', normalizedPath)
    .eq('field', field)
    .eq('status', 'running')
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('@uptrade/seo: Error fetching A/B test:', error)
  }

  return data
})

/**
 * Record A/B test impression
 */
export async function recordABImpression(
  testId: string,
  variant: 'a' | 'b',
  sessionId?: string
): Promise<void> {
  const supabase = getSupabaseClient()

  await supabase
    .from('seo_ab_impressions')
    .insert({
      test_id: testId,
      variant,
      session_id: sessionId,
    })
}

/**
 * Fetch redirect for a path - cached per request
 */
export const getRedirectData = cache(async (
  projectId: string,
  path: string
) => {
  const supabase = getSupabaseClient()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  // First check exact match
  const { data: exactMatch, error: exactError } = await supabase
    .from('seo_managed_redirects')
    .select('*')
    .eq('project_id', projectId)
    .eq('source_path', normalizedPath)
    .eq('is_active', true)
    .eq('is_regex', false)
    .order('priority', { ascending: true })
    .limit(1)
    .single()

  if (exactMatch) {
    return exactMatch
  }

  // Then check regex patterns
  const { data: regexMatches, error: regexError } = await supabase
    .from('seo_managed_redirects')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_active', true)
    .eq('is_regex', true)
    .order('priority', { ascending: true })

  if (regexMatches) {
    for (const redirect of regexMatches) {
      try {
        const regex = new RegExp(redirect.source_path)
        if (regex.test(normalizedPath)) {
          return {
            ...redirect,
            destination_path: normalizedPath.replace(regex, redirect.destination_path),
          }
        }
      } catch (e) {
        console.error('@uptrade/seo: Invalid regex in redirect:', redirect.source_path)
      }
    }
  }

  return null
})

/**
 * Fetch managed scripts - cached per request
 */
export const getManagedScripts = cache(async (
  projectId: string,
  position: string,
  currentPath?: string
) => {
  const supabase = getSupabaseClient()

  let query = supabase
    .from('seo_managed_scripts')
    .select('*')
    .eq('project_id', projectId)
    .eq('position', position)
    .eq('is_active', true)
    .order('priority', { ascending: true })

  const { data, error } = await query

  if (error) {
    console.error('@uptrade/seo: Error fetching scripts:', error)
    return []
  }

  // Filter by path if needed
  return (data || []).filter(script => {
    if (script.load_on === 'all') return true
    if (!currentPath || !script.paths) return script.load_on === 'all'
    
    const normalizedPath = currentPath.startsWith('/') ? currentPath : `/${currentPath}`
    return script.paths.some((p: string) => {
      if (p.endsWith('*')) {
        return normalizedPath.startsWith(p.slice(0, -1))
      }
      return normalizedPath === p
    })
  })
})

/**
 * Fetch robots directive for a page - cached per request
 */
export const getRobotsData = cache(async (
  projectId: string,
  path: string
) => {
  const supabase = getSupabaseClient()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  const { data, error } = await supabase
    .from('seo_pages')
    .select('managed_robots')
    .eq('project_id', projectId)
    .eq('path', normalizedPath)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('@uptrade/seo: Error fetching robots data:', error)
  }

  return data?.managed_robots
})

/**
 * Fetch sitemap entries - cached per request
 */
export const getSitemapEntries = cache(async (
  projectId: string,
  options?: { publishedOnly?: boolean }
) => {
  const supabase = getSupabaseClient()

  let query = supabase
    .from('seo_pages')
    .select(`
      path,
      url,
      updated_at,
      sitemap_priority,
      sitemap_changefreq,
      managed_robots
    `)
    .eq('project_id', projectId)
    .order('path', { ascending: true })

  const { data, error } = await query

  if (error) {
    console.error('@uptrade/seo: Error fetching sitemap entries:', error)
    return []
  }

  // Filter out noindex pages if publishedOnly
  let entries = data || []
  if (options?.publishedOnly) {
    entries = entries.filter(page => {
      const robots = page.managed_robots || ''
      return !robots.includes('noindex')
    })
  }

  return entries
})
