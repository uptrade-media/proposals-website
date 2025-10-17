// netlify/functions/blog-create.js
import { neon } from '@neondatabase/serverless'
import jwt from 'jsonwebtoken'

const sql = neon(process.env.DATABASE_URL)

export async function handler(event) {
  // CORS headers
  const origin = event.headers.origin || 'http://localhost:8888'
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  }

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
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

    const blogPost = JSON.parse(event.body || '{}')

    // Validate required fields
    if (!blogPost.title || !blogPost.slug || !blogPost.content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields: title, slug, content'
        })
      }
    }

    // Basic Markdown to HTML conversion (simple approach)
    const contentHtml = blogPost.content
      .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>')

    // Insert into database
    const result = await sql`
      INSERT INTO blog_posts (
        slug,
        title,
        subtitle,
        category,
        excerpt,
        content,
        content_html,
        featured_image,
        featured_image_alt,
        author,
        keywords,
        reading_time,
        meta_title,
        meta_description,
        status,
        published_at,
        created_at,
        updated_at
      ) VALUES (
        ${blogPost.slug},
        ${blogPost.title},
        ${blogPost.subtitle || null},
        ${blogPost.category || 'news'},
        ${blogPost.excerpt},
        ${blogPost.content},
        ${contentHtml},
        ${blogPost.featuredImage},
        ${blogPost.featuredImageAlt || blogPost.title},
        ${blogPost.author || 'Uptrade Media'},
        ${blogPost.keywords ? JSON.stringify(blogPost.keywords) : null},
        ${blogPost.readingTime || 5},
        ${blogPost.metaTitle || blogPost.title},
        ${blogPost.metaDescription || blogPost.excerpt},
        ${blogPost.status || 'draft'},
        ${blogPost.publishedAt ? new Date(blogPost.publishedAt) : new Date()},
        NOW(),
        NOW()
      )
      RETURNING id, slug, title, status
    `

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        data: result[0],
        message: 'Blog post created successfully'
      })
    }
  } catch (error) {
    console.error('Blog create error:', error)

    // Check for duplicate slug
    if (error.message.includes('unique constraint')) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: 'A blog post with this slug already exists'
        })
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create blog post',
        details: error.message
      })
    }
  }
}
