// netlify/functions/blog-create.js
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  // CORS headers
  const origin = event.headers.origin || 'http://localhost:8888'
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    const supabase = createSupabaseAdmin()
    
    const { data, error: insertError } = await supabase
      .from('blog_posts')
      .insert({
        slug: blogPost.slug,
        title: blogPost.title,
        subtitle: blogPost.subtitle || null,
        category: blogPost.category || 'news',
        excerpt: blogPost.excerpt,
        content: blogPost.content,
        content_html: contentHtml,
        featured_image: blogPost.featuredImage,
        featured_image_alt: blogPost.featuredImageAlt || blogPost.title,
        featured_image_width: blogPost.featuredImageWidth || 1200,
        featured_image_height: blogPost.featuredImageHeight || 630,
        author: blogPost.author || 'Uptrade Media',
        keywords: blogPost.keywords || [],
        reading_time: blogPost.readingTime || 5,
        meta_title: blogPost.metaTitle || blogPost.title,
        meta_description: blogPost.metaDescription || blogPost.excerpt,
        faq_items: blogPost.faqItems || null,
        service_callouts: blogPost.serviceCallouts || null,
        status: blogPost.status || 'draft',
        published_at: blogPost.publishedAt ? new Date(blogPost.publishedAt) : new Date()
      })
      .select('id, slug, title, status')
      .single()

    if (insertError) {
      throw insertError
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        data,
        message: 'Blog post created successfully'
      })
    }
  } catch (error) {
    console.error('Blog create error:', error)

    // Check for duplicate slug
    if (error.message.includes('duplicate') || error.code === '23505') {
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
