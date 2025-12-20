// netlify/functions/blog-delete.js
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  // CORS headers
  const origin = event.headers.origin || 'http://localhost:8888'
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  }

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'DELETE') {
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

    const { id } = JSON.parse(event.body || '{}')

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing blog post ID' })
      }
    }

    // Hard delete - permanently remove post
    const supabase = createSupabaseAdmin()
    
    // Get post data to check for featured image
    const { data: post, error: fetchError } = await supabase
      .from('blog_posts')
      .select('id, featured_image')
      .eq('id', id)
      .single()
    
    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Blog post not found' })
        }
      }
      throw fetchError
    }
    
    // Delete the blog post (CASCADE will delete related data)
    const { error: deleteError } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id)
    
    if (deleteError) {
      throw deleteError
    }
    
    // Note: If featured_image is stored in Supabase storage, delete it here
    // For now, we just remove the DB reference
    console.log('[Blog Delete] Post deleted:', id)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Blog post deleted successfully'
      })
    }
  } catch (error) {
    console.error('Blog delete error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to delete blog post',
        details: error.message
      })
    }
  }
}
