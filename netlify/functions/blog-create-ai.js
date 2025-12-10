/**
 * Blog Create with AI Function
 * 
 * Creates a new blog post with AI-generated content
 */

import { createSupabaseAdmin } from './utils/supabase.js'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const UPTRADE_WRITING_STYLE = `You are a professional content writer for Uptrade Media, a digital marketing agency specializing in web design, SEO, and digital marketing services.

BRAND VOICE:
- Professional yet approachable and conversational
- Educational and helpful, never pushy or sales-heavy
- Data-driven with concrete examples
- Optimistic and solutions-focused
- Clear, concise, and actionable

WRITING STYLE:
- Use active voice and strong action verbs
- Short paragraphs (2-4 sentences max)
- Subheadings every 2-3 paragraphs for scannability
- Bullet points and numbered lists for key takeaways
- Include real-world examples and case studies when relevant
- End with a clear call-to-action

TONE:
- Confident but humble
- Expert without being condescending
- Friendly and personable
- Encourage questions and engagement

SEO BEST PRACTICES:
- Natural keyword integration (never forced)
- Descriptive subheadings with H2 and H3 tags
- Meta-optimized introduction`

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  }

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
    const formData = JSON.parse(event.body || '{}')
    
    console.log('[Blog AI] Generating content for:', formData.topic)

    // Generate AI content
    const response = await openai.chat.completions.create({
      model: 'gpt-5.1',
      messages: [
        { role: 'system', content: UPTRADE_WRITING_STYLE },
        { 
          role: 'user', 
          content: `Create a comprehensive blog post:

Topic: ${formData.topic}
Category: ${formData.category}
Keywords: ${formData.keywords || 'Not specified'}
Key Points: ${formData.keyPoints || 'Comprehensive coverage'}

Return JSON with:
- title: SEO-optimized title (60-70 chars, includes primary keyword)
- excerpt: Engaging preview (150-160 chars)
- content: Full markdown blog post
- keywords: Array of SEO keywords
- readingTime: Minutes (integer)
- metaTitle: Meta title for SEO
- metaDescription: Meta description with CTA (150-160 chars)
- ogTitle: Social media title (60 chars max)
- ogDescription: Social description (120 chars)
- focusKeyphrase: Primary SEO keyphrase (2-4 words)
- internalLinks: Array of 3-5 related topic suggestions for internal linking
- schema: Schema.org Article JSON-LD object
- featuredImageAlt: Descriptive alt text

Return ONLY valid JSON.`
        }
      ],
      temperature: 0.7,
      max_tokens: 5000,
      response_format: { type: 'json_object' }
    })

    const aiContent = JSON.parse(response.choices[0].message.content)
    
    // Generate slug
    const slug = aiContent.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100)

    // Convert markdown to HTML (basic)
    const contentHtml = aiContent.content
      .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')

    // Save to database
    const supabase = createSupabaseAdmin()
    
    const { data: blogPost, error: insertError } = await supabase
      .from('blog_posts')
      .insert({
        slug,
        title: aiContent.title,
        subtitle: aiContent.subtitle || null,
        category: formData.category,
        excerpt: aiContent.excerpt,
        content: aiContent.content,
        content_html: contentHtml,
        featured_image: formData.featuredImage || null,
        featured_image_alt: aiContent.featuredImageAlt || aiContent.title,
        author: formData.author || 'Uptrade Media',
        keywords: Array.isArray(aiContent.keywords) ? aiContent.keywords : [],
        reading_time: aiContent.readingTime || 5,
        meta_title: aiContent.metaTitle || aiContent.title,
        meta_description: aiContent.metaDescription || aiContent.excerpt,
        og_title: aiContent.ogTitle || aiContent.title,
        og_description: aiContent.ogDescription || aiContent.excerpt,
        focus_keyphrase: aiContent.focusKeyphrase || null,
        internal_links: aiContent.internalLinks ? JSON.stringify(aiContent.internalLinks) : null,
        schema_markup: aiContent.schema ? JSON.stringify(aiContent.schema) : null,
        status: formData.publishImmediately ? 'published' : 'draft',
        published_at: formData.publishImmediately ? new Date() : null
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    console.log('[Blog AI] Blog post created:', blogPost.id, blogPost.title)

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        data: blogPost,
        message: `Blog post "${blogPost.title}" created successfully`,
        previewUrl: `https://uptrademedia.com/insights/${slug}`
      })
    }

  } catch (error) {
    console.error('[Blog AI] Error:', error)
    
    if (error.code === '23505') {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: 'A blog post with this title already exists'
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
