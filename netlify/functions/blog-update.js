// netlify/functions/blog-update.js
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  // CORS headers
  const origin = event.headers.origin || 'http://localhost:8888'
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  }

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'PUT') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Verify authentication
    const { user, contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !user || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }

    // Verify admin role
    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      }
    }

    const { id, ...rawUpdates } = JSON.parse(event.body || '{}')

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing blog post ID' })
      }
    }

    // Convert camelCase to snake_case for database
    const updates = {}
    if (rawUpdates.title !== undefined) updates.title = rawUpdates.title
    if (rawUpdates.slug !== undefined) updates.slug = rawUpdates.slug
    if (rawUpdates.subtitle !== undefined) updates.subtitle = rawUpdates.subtitle
    if (rawUpdates.category !== undefined) updates.category = rawUpdates.category
    if (rawUpdates.excerpt !== undefined) updates.excerpt = rawUpdates.excerpt
    if (rawUpdates.content !== undefined) updates.content = rawUpdates.content
    if (rawUpdates.featuredImage !== undefined) updates.featured_image = rawUpdates.featuredImage
    if (rawUpdates.featuredImageAlt !== undefined) updates.featured_image_alt = rawUpdates.featuredImageAlt
    if (rawUpdates.featuredImageWidth !== undefined) updates.featured_image_width = rawUpdates.featuredImageWidth
    if (rawUpdates.featuredImageHeight !== undefined) updates.featured_image_height = rawUpdates.featuredImageHeight
    if (rawUpdates.author !== undefined) updates.author = rawUpdates.author
    if (rawUpdates.keywords !== undefined) updates.keywords = rawUpdates.keywords
    if (rawUpdates.readingTime !== undefined) updates.reading_time = rawUpdates.readingTime
    if (rawUpdates.metaTitle !== undefined) updates.meta_title = rawUpdates.metaTitle || null
    if (rawUpdates.metaDescription !== undefined) updates.meta_description = rawUpdates.metaDescription || null
    if (rawUpdates.faqItems !== undefined) updates.faq_items = rawUpdates.faqItems
    if (rawUpdates.serviceCallouts !== undefined) updates.service_callouts = rawUpdates.serviceCallouts
    if (rawUpdates.status !== undefined) updates.status = rawUpdates.status
    if (rawUpdates.featured !== undefined) updates.featured = rawUpdates.featured
    if (rawUpdates.publishedAt !== undefined) updates.published_at = rawUpdates.publishedAt

    // Convert markdown to HTML if content is updated
    if (updates.content) {
      updates.content_html = updates.content
        .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
        .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
        .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>')
    }

    // Update in Supabase
    const supabase = createSupabaseAdmin()
    
    const { data, error: updateError } = await supabase
      .from('blog_posts')
      .update(updates)
      .eq('id', id)
      .select('id, slug, title, status')
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Blog post not found' })
        }
      }
      throw updateError
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data,
        message: 'Blog post updated successfully'
      })
    }
  } catch (error) {
    console.error('Blog update error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to update blog post',
        details: error.message
      })
    }
  }
}
