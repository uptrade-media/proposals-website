// netlify/functions/blog-update.js
import { neon } from '@neondatabase/serverless'
import jwt from 'jsonwebtoken'

const sql = neon(process.env.DATABASE_URL)

export async function handler(event) {
  // CORS headers
  const origin = event.headers.origin || 'http://localhost:8888'
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
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
    const token = event.headers.cookie?.match(/um_session=([^;]+)/)?.[1]
    if (!token) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }

    const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET)

    // Verify admin role
    if (payload.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      }
    }

    const { id, ...updates } = JSON.parse(event.body || '{}')

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing blog post ID' })
      }
    }

    // Convert markdown to HTML if content is updated
    if (updates.content) {
      updates.contentHtml = updates.content
        .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
        .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
        .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>')
    }

    // Build dynamic update query
    const updateFields = []
    const values = [id]
    let paramCount = 2

    Object.entries(updates).forEach(([key, value]) => {
      updateFields.push(`${key} = $${paramCount++}`)
      values.push(value)
    })

    updateFields.push('updated_at = NOW()')

    const query = `
      UPDATE blog_posts
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING id, slug, title, status
    `

    const result = await sql(query, values)

    if (result.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Blog post not found' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: result[0],
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
