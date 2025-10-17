// netlify/functions/blog-list.js
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)

export async function handler(event) {
  // CORS headers
  const origin = event.headers.origin || 'http://localhost:8888'
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
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
    const url = new URL(event.rawUrl || `http://localhost${event.rawPath}`)
    const status = url.searchParams.get('status') || 'published'
    const category = url.searchParams.get('category')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
    const offset = parseInt(url.searchParams.get('offset') || '0')

    let query = 'SELECT * FROM blog_posts WHERE status = $1'
    const params = [status]

    if (category) {
      query += ` AND category = $${params.length + 1}`
      params.push(category)
    }

    query += ` ORDER BY published_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)

    const result = await sql(query, params)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        posts: result,
        total: result.length
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
