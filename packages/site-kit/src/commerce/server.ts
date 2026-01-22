/**
 * @uptrade/site-kit/commerce - Server-side utilities
 * 
 * Helpers for server-side rendering and dynamic routes.
 * Use in Next.js getStaticPaths, getStaticProps, or App Router.
 */

import { createClient } from '@supabase/supabase-js'
import type { CommerceOffering, OfferingType } from './types'

interface ServerConfig {
  supabaseUrl: string
  supabaseKey: string
  projectId: string
}

function getSupabaseClient(config: ServerConfig) {
  return createClient(config.supabaseUrl, config.supabaseKey)
}

function transformOffering(data: any): CommerceOffering {
  return {
    id: data.id,
    project_id: data.project_id,
    type: data.type,
    status: data.status,
    name: data.name,
    slug: data.slug,
    description: data.description,
    short_description: data.short_description,
    long_description: data.long_description,
    featured_image_url: data.featured_image_url,
    gallery_images: data.gallery_image_urls || [],
    price_type: data.price_type,
    price: data.price,
    compare_at_price: data.compare_at_price,
    currency: data.currency || 'USD',
    price_is_public: data.price_is_public ?? true,
    billing_period: data.billing_period,
    track_inventory: data.track_inventory,
    inventory_count: data.inventory_count,
    allow_backorder: data.allow_backorder,
    duration_minutes: data.duration_minutes,
    capacity: data.capacity,
    location: data.location,
    is_virtual: data.is_virtual,
    virtual_meeting_url: data.virtual_meeting_url,
    requires_booking: data.requires_booking,
    booking_lead_time_hours: data.booking_lead_time_hours,
    category: data.category,
    category_id: data.category_id,
    tags: data.tags || [],
    seo_title: data.seo_title,
    seo_description: data.seo_description,
    features: data.features || [],
    specifications: data.specifications || {},
    schedules: data.schedules || [],
    variants: data.variants || [],
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}

// ============================================
// Static Path Generators
// ============================================

/**
 * Get all product slugs for static generation
 * 
 * @example Next.js Pages Router
 * export async function getStaticPaths() {
 *   const paths = await getProductPaths(config)
 *   return { paths, fallback: 'blocking' }
 * }
 */
export async function getProductPaths(config: ServerConfig): Promise<{ params: { slug: string } }[]> {
  const supabase = getSupabaseClient(config)
  
  const { data, error } = await supabase
    .from('commerce_offerings')
    .select('slug')
    .eq('project_id', config.projectId)
    .eq('type', 'product')
    .eq('status', 'active')
  
  if (error || !data) return []
  
  return data.map(item => ({ params: { slug: item.slug } }))
}

/**
 * Get all event slugs for static generation
 */
export async function getEventPaths(config: ServerConfig): Promise<{ params: { slug: string } }[]> {
  const supabase = getSupabaseClient(config)
  
  const { data, error } = await supabase
    .from('commerce_offerings')
    .select('slug')
    .eq('project_id', config.projectId)
    .eq('type', 'event')
    .eq('status', 'active')
  
  if (error || !data) return []
  
  return data.map(item => ({ params: { slug: item.slug } }))
}

/**
 * Get all offering slugs for static generation (any type)
 */
export async function getOfferingPaths(
  config: ServerConfig,
  type?: OfferingType | OfferingType[]
): Promise<{ params: { slug: string } }[]> {
  const supabase = getSupabaseClient(config)
  
  let query = supabase
    .from('commerce_offerings')
    .select('slug')
    .eq('project_id', config.projectId)
    .eq('status', 'active')
  
  if (type) {
    if (Array.isArray(type)) {
      query = query.in('type', type)
    } else {
      query = query.eq('type', type)
    }
  }
  
  const { data, error } = await query
  
  if (error || !data) return []
  
  return data.map(item => ({ params: { slug: item.slug } }))
}

// ============================================
// Data Fetchers
// ============================================

/**
 * Fetch a single offering by slug (server-side)
 * 
 * @example Next.js Pages Router
 * export async function getStaticProps({ params }) {
 *   const product = await getOfferingBySlug(config, params.slug)
 *   if (!product) return { notFound: true }
 *   return { props: { product }, revalidate: 60 }
 * }
 */
export async function getOfferingBySlug(
  config: ServerConfig,
  slug: string
): Promise<CommerceOffering | null> {
  const supabase = getSupabaseClient(config)
  
  const { data, error } = await supabase
    .from('commerce_offerings')
    .select(`
      *,
      category:commerce_categories(id, name, slug),
      variants:commerce_variants(*),
      schedules:commerce_schedules(*)
    `)
    .eq('project_id', config.projectId)
    .eq('slug', slug)
    .single()
  
  if (error || !data) return null
  
  return transformOffering(data)
}

/**
 * Fetch all offerings of a type (server-side)
 */
export async function getOfferings(
  config: ServerConfig,
  options: {
    type?: OfferingType | OfferingType[]
    category?: string
    limit?: number
    status?: string
  } = {}
): Promise<CommerceOffering[]> {
  const supabase = getSupabaseClient(config)
  
  let query = supabase
    .from('commerce_offerings')
    .select(`
      *,
      category:commerce_categories(id, name, slug),
      variants:commerce_variants(*),
      schedules:commerce_schedules(*)
    `)
    .eq('project_id', config.projectId)
    .eq('status', options.status || 'active')
    .order('sort_order', { ascending: true })
  
  if (options.type) {
    if (Array.isArray(options.type)) {
      query = query.in('type', options.type)
    } else {
      query = query.eq('type', options.type)
    }
  }
  
  if (options.category) {
    query = query.eq('category_id', options.category)
  }
  
  if (options.limit) {
    query = query.limit(options.limit)
  }
  
  const { data, error } = await query
  
  if (error || !data) return []
  
  return data.map(transformOffering)
}

/**
 * Fetch upcoming events (server-side)
 */
export async function getUpcomingEvents(
  config: ServerConfig,
  options: { limit?: number; category?: string } = {}
): Promise<CommerceOffering[]> {
  const supabase = getSupabaseClient(config)
  const now = new Date().toISOString()
  
  let query = supabase
    .from('commerce_offerings')
    .select(`
      *,
      category:commerce_categories(id, name, slug),
      schedules:commerce_schedules(*)
    `)
    .eq('project_id', config.projectId)
    .eq('type', 'event')
    .eq('status', 'active')
  
  if (options.category) {
    query = query.eq('category_id', options.category)
  }
  
  const { data, error } = await query
  
  if (error || !data) return []
  
  // Filter events with upcoming schedules and sort
  const eventsWithSchedules = data
    .map(event => {
      const schedules = (event.schedules || [])
        .filter((s: any) => new Date(s.starts_at) >= new Date(now) && s.status === 'scheduled')
        .sort((a: any, b: any) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
      
      return {
        ...transformOffering(event),
        schedules,
        next_schedule: schedules[0] || null,
      }
    })
    .filter(event => event.schedules.length > 0)
    .sort((a, b) => {
      const aDate = (a as any).next_schedule?.starts_at
      const bDate = (b as any).next_schedule?.starts_at
      if (!aDate || !bDate) return 0
      return new Date(aDate).getTime() - new Date(bDate).getTime()
    })
  
  if (options.limit) {
    return eventsWithSchedules.slice(0, options.limit)
  }
  
  return eventsWithSchedules
}

/**
 * Get next upcoming event (server-side)
 */
export async function getNextEvent(
  config: ServerConfig,
  category?: string
): Promise<CommerceOffering | null> {
  const events = await getUpcomingEvents(config, { limit: 1, category })
  return events[0] || null
}

// ============================================
// Metadata Helpers
// ============================================

/**
 * Generate page metadata for an offering
 * 
 * @example Next.js App Router
 * export async function generateMetadata({ params }) {
 *   const product = await getOfferingBySlug(config, params.slug)
 *   return generateOfferingMetadata(product, 'https://example.com')
 * }
 */
export function generateOfferingMetadata(
  offering: CommerceOffering | null,
  siteUrl: string
): {
  title: string
  description: string
  openGraph: {
    title: string
    description: string
    images: string[]
    type: string
    url: string
  }
} | null {
  if (!offering) return null
  
  const title = offering.seo_title || offering.name
  const description = offering.seo_description || offering.short_description || offering.description || ''
  const images = offering.featured_image_url ? [offering.featured_image_url] : []
  
  const typeMap: Record<OfferingType, string> = {
    product: 'product',
    service: 'website',
    event: 'website',
    class: 'website',
    subscription: 'product',
  }
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images,
      type: typeMap[offering.type] || 'website',
      url: `${siteUrl}/${offering.type}s/${offering.slug}`,
    },
  }
}

// ============================================
// Export config builder
// ============================================

export function createServerConfig(
  supabaseUrl: string,
  supabaseKey: string,
  projectId: string
): ServerConfig {
  return { supabaseUrl, supabaseKey, projectId }
}
