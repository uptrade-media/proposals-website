/**
 * Blog Get - Public endpoint for fetching a single blog post
 * Used by tenant sites (GWA, etc.) to fetch article content
 */

import { createSupabaseAdmin } from './utils/supabase.js'

export async function handler(event) {
  // CORS headers - allow all origins for public API
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Tenant-ID, X-Organization-Id, X-Project-Id',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'
  }

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const supabase = createSupabaseAdmin()
    
    const url = new URL(event.rawUrl || `http://localhost${event.rawPath}`)
    const slug = url.searchParams.get('slug')
    const id = url.searchParams.get('id')
    const tenantId = event.headers['x-tenant-id']
    const orgId = event.headers['x-organization-id']
    
    if (!slug && !id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'slug or id parameter is required' })
      }
    }

    // Build query for published posts only
    let query = supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')

    // Filter by slug or id
    if (slug) {
      query = query.eq('slug', slug)
    } else {
      query = query.eq('id', id)
    }

    // Filter by org_id if specified directly
    if (orgId) {
      query = query.eq('org_id', orgId)
    } else if (tenantId) {
      // Filter by tenant (looks up org_id from tenant)
      // Look up org_id from tenant
      const { data: tenant } = await supabase
        .from('tenants')
        .select('org_id')
        .eq('id', tenantId)
        .single()
      
      if (tenant?.org_id) {
        query = query.eq('org_id', tenant.org_id)
      }
    }

    const { data: post, error } = await query.single()

    if (error || !post) {
      console.error('[Blog Get] Article not found:', slug || id)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Article not found' })
      }
    }

    // Track view (non-blocking)
    supabase
      .rpc('increment_blog_views', { post_id: post.id })
      .then(() => {})
      .catch(() => {})

    // Transform to expected format
    const article = {
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt || '',
      content: post.content,
      featuredImage: post.featured_image,
      author: post.author || 'Uptrade Media',
      publishedAt: post.published_at,
      category: post.category || 'General',
      tags: post.tags || [],
      seo: {
        title: post.seo_title || post.title,
        description: post.seo_description || post.excerpt,
        ogImage: post.og_image || post.featured_image
      },
      readingTime: post.reading_time || Math.ceil((post.content?.length || 0) / 1000)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(article)
    }
  } catch (error) {
    console.error('Blog get error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch article',
        details: error.message
      })
    }
  }
}
