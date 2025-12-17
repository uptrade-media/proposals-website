/**
 * Blog Auto-Optimizer Function
 * 
 * Automatically optimizes existing blog posts:
 * - Removes em dashes and replaces with appropriate punctuation
 * - Improves conversational tone
 * - Adds source citations where claims are made
 * - Optimizes for SEO based on target keywords
 * - Adds internal links to Uptrade services
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import OpenAI from 'openai'

const SEO_AI_MODEL = process.env.SEO_AI_MODEL || 'gpt-4o'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/**
 * Remove em dashes and fix punctuation
 */
function removeEmDashes(content) {
  if (!content) return content
  
  // Replace em dash with comma or period based on context
  let fixed = content
    // Em dash at start of clause (usually can be a comma)
    .replace(/\s—\s/g, ', ')
    // Em dash used for parenthetical (replace with parentheses or commas)
    .replace(/—([^—]+)—/g, '($1)')
    // Single em dash (usually can be a colon or comma)
    .replace(/—/g, ', ')
    // En dash (keep for ranges, replace others)
    .replace(/(\d)–(\d)/g, '$1-$2') // Keep as hyphen in number ranges
    .replace(/\s–\s/g, ', ')
  
  // Clean up any double commas or spaces
  fixed = fixed
    .replace(/,\s*,/g, ',')
    .replace(/\s{2,}/g, ' ')
  
  return fixed
}

/**
 * Uptrade Services for internal linking
 */
const UPTRADE_SERVICES = {
  'seo': { url: '/marketing/seo/', title: 'SEO & Local SEO' },
  'ad-management': { url: '/marketing/ad-management/', title: 'Paid Ads Management' },
  'content-marketing': { url: '/marketing/content-marketing/', title: 'Content Marketing' },
  'web-design': { url: '/design/web-design/', title: 'Custom Web Design' },
  'branding': { url: '/design/branding/', title: 'Brand Identity Design' },
  'video-production': { url: '/media/video-production/', title: 'Video Production' },
  'ai-automation': { url: '/ai-automation/', title: 'AI & Automation' }
}

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  try {
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    // Admin only
    if (contact.role !== 'admin') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin access required' }) }
    }

    const supabase = createSupabaseAdmin()
    const body = JSON.parse(event.body || '{}')
    const { action, postId, options = {} } = body

    switch (action) {
      case 'analyze': {
        // Analyze a single post for issues
        const { data: post, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('id', postId)
          .single()

        if (error || !post) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Post not found' }) }
        }

        const issues = analyzePostIssues(post)
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            post: { id: post.id, title: post.title, slug: post.slug },
            issues,
            canAutoFix: issues.some(i => i.autoFixable)
          })
        }
      }

      case 'analyze-all': {
        // Analyze all published posts for issues
        const { data: posts, error } = await supabase
          .from('blog_posts')
          .select('id, title, slug, content, meta_description')
          .eq('status', 'published')
          .order('published_at', { ascending: false })

        if (error) {
          return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
        }

        const results = posts.map(post => ({
          id: post.id,
          title: post.title,
          slug: post.slug,
          issues: analyzePostIssues(post)
        }))

        const postsWithIssues = results.filter(r => r.issues.length > 0)

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            totalPosts: posts.length,
            postsWithIssues: postsWithIssues.length,
            results: postsWithIssues
          })
        }
      }

      case 'fix-em-dashes': {
        // Quick fix: remove all em dashes from a post
        const { data: post, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('id', postId)
          .single()

        if (error || !post) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Post not found' }) }
        }

        const fixedContent = removeEmDashes(post.content)
        const fixedMetaDesc = removeEmDashes(post.meta_description)
        const fixedExcerpt = removeEmDashes(post.excerpt)

        const { error: updateError } = await supabase
          .from('blog_posts')
          .update({
            content: fixedContent,
            meta_description: fixedMetaDesc,
            excerpt: fixedExcerpt,
            updated_at: new Date().toISOString()
          })
          .eq('id', postId)

        if (updateError) {
          return { statusCode: 500, headers, body: JSON.stringify({ error: updateError.message }) }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Em dashes removed successfully',
            changes: {
              content: post.content !== fixedContent,
              metaDescription: post.meta_description !== fixedMetaDesc,
              excerpt: post.excerpt !== fixedExcerpt
            }
          })
        }
      }

      case 'fix-all-em-dashes': {
        // Batch fix: remove em dashes from all posts
        const { data: posts, error } = await supabase
          .from('blog_posts')
          .select('id, content, meta_description, excerpt')

        if (error) {
          return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
        }

        let fixed = 0
        for (const post of posts) {
          const hasEmDash = 
            (post.content && post.content.includes('—')) ||
            (post.meta_description && post.meta_description.includes('—')) ||
            (post.excerpt && post.excerpt.includes('—'))

          if (hasEmDash) {
            await supabase
              .from('blog_posts')
              .update({
                content: removeEmDashes(post.content),
                meta_description: removeEmDashes(post.meta_description),
                excerpt: removeEmDashes(post.excerpt),
                updated_at: new Date().toISOString()
              })
              .eq('id', post.id)
            fixed++
          }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `Fixed ${fixed} posts with em dashes`,
            totalChecked: posts.length,
            fixed
          })
        }
      }

      case 'optimize-post': {
        // Full AI optimization of a post
        const { data: post, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('id', postId)
          .single()

        if (error || !post) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Post not found' }) }
        }

        const optimizationResult = await optimizePostWithAI(post, options)

        if (options.applyChanges) {
          await supabase
            .from('blog_posts')
            .update({
              content: optimizationResult.optimizedContent,
              meta_description: optimizationResult.optimizedMetaDescription,
              excerpt: optimizationResult.optimizedExcerpt,
              updated_at: new Date().toISOString()
            })
            .eq('id', postId)
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            applied: options.applyChanges || false,
            optimization: optimizationResult
          })
        }
      }

      case 'add-citations': {
        // AI-powered citation addition
        const { data: post, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('id', postId)
          .single()

        if (error || !post) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Post not found' }) }
        }

        const citedContent = await addCitationsWithAI(post.content, post.category)

        if (options.applyChanges) {
          await supabase
            .from('blog_posts')
            .update({
              content: citedContent,
              updated_at: new Date().toISOString()
            })
            .eq('id', postId)
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            applied: options.applyChanges || false,
            content: citedContent
          })
        }
      }

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Unknown action: ${action}` })
        }
    }
  } catch (error) {
    console.error('[Blog Optimizer] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}

/**
 * Analyze a post for common issues
 */
function analyzePostIssues(post) {
  const issues = []
  const content = post.content || ''

  // Check for em dashes
  const emDashCount = (content.match(/—/g) || []).length
  if (emDashCount > 0) {
    issues.push({
      type: 'em-dashes',
      severity: 'warning',
      message: `Found ${emDashCount} em dashes that should be replaced`,
      autoFixable: true
    })
  }

  // Check for formal openers
  if (content.match(/^(In today's|In this article|This article will)/i)) {
    issues.push({
      type: 'weak-opener',
      severity: 'warning',
      message: 'Post starts with a generic opener instead of a compelling hook',
      autoFixable: false
    })
  }

  // Check for missing citations (claims without sources)
  const claimPatterns = [
    /studies show/i,
    /research indicates/i,
    /\d+%\s+of/i,
    /according to/i,
    /experts say/i
  ]
  const hasClaims = claimPatterns.some(p => p.test(content))
  const hasSourceLinks = content.includes('](http') || content.includes('Source:')
  if (hasClaims && !hasSourceLinks) {
    issues.push({
      type: 'missing-citations',
      severity: 'info',
      message: 'Post makes claims but may lack specific source citations',
      autoFixable: false
    })
  }

  // Check for long paragraphs
  const paragraphs = content.split(/\n\n+/)
  const longParagraphs = paragraphs.filter(p => {
    const sentences = p.split(/[.!?]+/).filter(Boolean)
    return sentences.length > 4
  })
  if (longParagraphs.length > 2) {
    issues.push({
      type: 'long-paragraphs',
      severity: 'info',
      message: `Found ${longParagraphs.length} paragraphs that could be broken up for readability`,
      autoFixable: false
    })
  }

  // Check meta description
  if (!post.meta_description || post.meta_description.length < 100) {
    issues.push({
      type: 'short-meta-description',
      severity: 'warning',
      message: 'Meta description is missing or too short (should be 150-160 chars)',
      autoFixable: false
    })
  }

  // Check for internal links
  const hasInternalLinks = Object.values(UPTRADE_SERVICES).some(s => 
    content.includes(s.url)
  )
  if (!hasInternalLinks) {
    issues.push({
      type: 'no-internal-links',
      severity: 'info',
      message: 'Post has no internal links to Uptrade services',
      autoFixable: false
    })
  }

  return issues
}

/**
 * Full AI optimization of a post
 */
async function optimizePostWithAI(post, options = {}) {
  const optimizationPrompt = `Optimize this blog post for better engagement and SEO while maintaining the core message.

CURRENT CONTENT:
${post.content}

OPTIMIZATION GOALS:
1. Remove ALL em dashes (—) and replace with appropriate punctuation (commas, periods, parentheses)
2. Improve the opening hook if it starts generically
3. Make the tone more conversational (like teaching a friend)
4. Break up any paragraphs longer than 3 sentences
5. Add natural transition phrases between sections
6. Ensure the conclusion has a clear, actionable takeaway

CONSTRAINTS:
- Keep the same overall structure and topics
- Maintain approximately the same word count
- Don't add fictional statistics or sources
- Keep existing source citations intact

Return the optimized content in Markdown format.`

  const response = await openai.chat.completions.create({
    model: SEO_AI_MODEL,
    messages: [
      { 
        role: 'system', 
        content: 'You are an expert blog editor. Improve content while maintaining accuracy and the author\'s voice.' 
      },
      { role: 'user', content: optimizationPrompt }
    ],
    temperature: 0.5,
    max_tokens: 8000
  })

  const optimizedContent = response.choices[0].message.content

  // Also optimize meta description if needed
  let optimizedMetaDescription = post.meta_description
  if (!post.meta_description || post.meta_description.length < 120 || post.meta_description.includes('—')) {
    const metaResponse = await openai.chat.completions.create({
      model: SEO_AI_MODEL,
      messages: [
        {
          role: 'user',
          content: `Write a compelling meta description (150-160 characters) for this blog post. No em dashes. Make it click-worthy.

Title: ${post.title}
Topic: ${post.content?.substring(0, 500)}

Return ONLY the meta description text, nothing else.`
        }
      ],
      temperature: 0.7,
      max_tokens: 100
    })
    optimizedMetaDescription = metaResponse.choices[0].message.content.trim()
  }

  // Optimize excerpt if needed
  let optimizedExcerpt = post.excerpt
  if (post.excerpt?.includes('—')) {
    optimizedExcerpt = removeEmDashes(post.excerpt)
  }

  return {
    optimizedContent,
    optimizedMetaDescription,
    optimizedExcerpt,
    changes: {
      contentChanged: optimizedContent !== post.content,
      metaChanged: optimizedMetaDescription !== post.meta_description,
      excerptChanged: optimizedExcerpt !== post.excerpt
    }
  }
}

/**
 * Add citations to content using AI
 */
async function addCitationsWithAI(content, category) {
  const citationPrompt = `Add credible source citations to this blog post where claims are made.

CONTENT:
${content}

INSTRUCTIONS:
1. Identify statements that make claims about statistics, research, or industry facts
2. Add realistic, credible citations from well-known sources in this industry
3. Format citations naturally, e.g., "According to HubSpot's 2024 State of Marketing Report..."
4. For statistics, add the source in parentheses or inline
5. Don't add citations to obvious common knowledge
6. Don't make up fake studies or statistics

Return the content with citations added in Markdown format.`

  const response = await openai.chat.completions.create({
    model: SEO_AI_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are a research editor adding credible citations to content. Only add realistic, verifiable sources from well-known industry publications, studies, and companies.'
      },
      { role: 'user', content: citationPrompt }
    ],
    temperature: 0.3,
    max_tokens: 8000
  })

  return response.choices[0].message.content
}
