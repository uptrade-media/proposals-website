// netlify/functions/blog-list.js
import { createSupabaseAdmin } from './utils/supabase.js'

export async function handler(event) {
  // CORS headers
  const origin = event.headers.origin || 'http://localhost:8888'
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
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
    // Use service role to bypass RLS - frontend controls access
    const supabase = createSupabaseAdmin()
    
    const url = new URL(event.rawUrl || `http://localhost${event.rawPath}`)
    const status = url.searchParams.get('status') || 'published'
    const category = url.searchParams.get('category')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
    const offset = parseInt(url.searchParams.get('offset') || '0')

    let query = supabase
      .from('blog_posts')
      .select('*')
      .eq('status', status)
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Blog API] Database error:', error)
      throw error
    }

    console.log('[Blog API] Found', data?.length || 0, 'blog posts with status:', status)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        posts: data || [],
        total: data?.length || 0
      })
    }
  } catch (error) {
    console.error('Blog list error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch blog posts',
        details: error.message
      })
    }
  }
}
