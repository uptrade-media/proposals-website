/**
 * Blog Create with AI Function
 * 
 * Creates a new blog post with AI-generated content
 * Enhanced with Uptrade service callouts and comprehensive SEO
 */

import { createSupabaseAdmin } from './utils/supabase.js'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/**
 * Uptrade Media Services Map
 * Complete services from sitemap.xml for internal linking and service callouts
 */
const UPTRADE_SERVICES = {
  // Design Services
  'web-design': {
    url: '/design/web-design/',
    title: 'Custom Web Design',
    description: 'Beautiful, conversion-focused websites built for growth',
    cta: 'Get a Custom Website',
    keywords: ['web design', 'website', 'custom design', 'responsive design', 'UI/UX']
  },
  'seo': {
    url: '/design/seo/',
    title: 'SEO Services',
    description: 'Dominate search results and drive organic traffic',
    cta: 'Boost Your Rankings',
    keywords: ['SEO', 'search engine optimization', 'rankings', 'organic traffic', 'Google']
  },
  'branding': {
    url: '/design/branding/',
    title: 'Brand Identity Design',
    description: 'Create a memorable brand that connects with your audience',
    cta: 'Build Your Brand',
    keywords: ['branding', 'brand identity', 'logo', 'brand strategy', 'visual identity']
  },
  'ux-design': {
    url: '/design/ux-design/',
    title: 'UX Design',
    description: 'User experiences that convert visitors into customers',
    cta: 'Improve Your UX',
    keywords: ['UX', 'user experience', 'usability', 'conversion optimization', 'interface']
  },
  
  // Marketing Services
  'social-media': {
    url: '/marketing/social-media/',
    title: 'Social Media Marketing',
    description: 'Build your audience and engagement across platforms',
    cta: 'Grow Your Social Presence',
    keywords: ['social media', 'Instagram', 'Facebook', 'LinkedIn', 'social marketing']
  },
  'ppc': {
    url: '/marketing/ppc/',
    title: 'PPC Advertising',
    description: 'Targeted ads that deliver measurable ROI',
    cta: 'Start Your Campaign',
    keywords: ['PPC', 'Google Ads', 'paid advertising', 'SEM', 'ad campaigns']
  },
  'email-marketing': {
    url: '/marketing/email/',
    title: 'Email Marketing',
    description: 'Nurture leads and drive conversions with strategic email',
    cta: 'Launch Email Campaigns',
    keywords: ['email marketing', 'newsletters', 'email automation', 'drip campaigns']
  },
  'content-marketing': {
    url: '/marketing/content/',
    title: 'Content Marketing',
    description: 'Strategic content that attracts and engages your audience',
    cta: 'Create Better Content',
    keywords: ['content marketing', 'blog', 'content strategy', 'copywriting']
  },
  
  // Media Services
  'video-production': {
    url: '/media/video/',
    title: 'Video Production',
    description: 'Professional video content that tells your story',
    cta: 'Create Video Content',
    keywords: ['video', 'video production', 'video marketing', 'YouTube', 'commercials']
  },
  'photography': {
    url: '/media/photography/',
    title: 'Professional Photography',
    description: 'Stunning visuals that elevate your brand',
    cta: 'Book a Photoshoot',
    keywords: ['photography', 'product photos', 'brand photography', 'visual content']
  },
  'drone': {
    url: '/media/drone/',
    title: 'Drone Services',
    description: 'Aerial photography and videography for unique perspectives',
    cta: 'Get Aerial Content',
    keywords: ['drone', 'aerial photography', 'drone video', 'aerial footage']
  },
  
  // Main Category Pages
  'design': {
    url: '/design/',
    title: 'Design Services',
    description: 'Full-service design solutions for digital and print',
    cta: 'Explore Design Services',
    keywords: ['design', 'creative services', 'digital design']
  },
  'marketing': {
    url: '/marketing/',
    title: 'Marketing Services',
    description: 'Data-driven marketing strategies that grow your business',
    cta: 'Explore Marketing Services',
    keywords: ['marketing', 'digital marketing', 'marketing strategy']
  },
  'media': {
    url: '/media/',
    title: 'Media Production',
    description: 'Professional content creation for all platforms',
    cta: 'Explore Media Services',
    keywords: ['media', 'content creation', 'production']
  }
}

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
- Meta-optimized introduction

UPTRADE SERVICES (for internal linking and callouts):
${Object.entries(UPTRADE_SERVICES).map(([key, service]) => 
  `- ${service.title}: ${service.url} - ${service.description}`
).join('\n')}`

/**
 * Find related services based on topic keywords
 */
function findRelatedServices(topic, category, keywords) {
  const searchText = `${topic} ${category} ${keywords || ''}`.toLowerCase()
  const matches = []
  
  for (const [key, service] of Object.entries(UPTRADE_SERVICES)) {
    const matchScore = service.keywords.filter(kw => 
      searchText.includes(kw.toLowerCase())
    ).length
    
    if (matchScore > 0) {
      matches.push({ key, ...service, score: matchScore })
    }
  }
  
  // Sort by match score and return top 3
  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

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

    // Find related services for this topic
    const relatedServices = findRelatedServices(
      formData.topic, 
      formData.category, 
      formData.keywords
    )
    
    const servicesContext = relatedServices.length > 0
      ? `\n\nRELATED UPTRADE SERVICES TO FEATURE:
${relatedServices.map(s => `- ${s.title} (${s.url}): ${s.description} | CTA: "${s.cta}"`).join('\n')}

Include 2-3 natural callout sections in the content that reference these services. Format each callout as:
<!-- SERVICE_CALLOUT: service-key -->
Place these strategically after relevant sections to provide value, not just promote.`
      : ''

    // Generate AI content
    const response = await openai.chat.completions.create({
      model: 'gpt-5.1',
      messages: [
        { role: 'system', content: UPTRADE_WRITING_STYLE },
        { 
          role: 'user', 
          content: `Create a comprehensive, world-class blog post:

Topic: ${formData.topic}
Category: ${formData.category}
Keywords: ${formData.keywords || 'Not specified'}
Key Points: ${formData.keyPoints || 'Comprehensive coverage'}
${servicesContext}

CONTENT REQUIREMENTS:
1. Minimum 1500 words for depth and SEO value
2. Include statistics, data points, or industry insights where relevant
3. Add practical examples or case studies
4. Structure with clear H2 and H3 headings
5. Include a FAQ section with 3-5 common questions (for FAQ schema)
6. End with actionable takeaways and a compelling CTA

Return JSON with:
- title: SEO-optimized title (60-70 chars, includes primary keyword)
- excerpt: Engaging preview (150-160 chars)
- content: Full markdown blog post with <!-- SERVICE_CALLOUT: key --> markers
- keywords: Array of 8-12 SEO keywords (mix of short and long-tail)
- readingTime: Minutes (integer)
- metaTitle: Meta title for SEO (different from title, 55-60 chars)
- metaDescription: Meta description with CTA (150-160 chars)
- ogTitle: Social media title (60 chars max, engaging)
- ogDescription: Social description (120 chars, with emoji if appropriate)
- focusKeyphrase: Primary SEO keyphrase (2-4 words)
- tableOfContents: Array of {heading: string, slug: string, level: 2|3}
- faqItems: Array of {question: string, answer: string} for FAQ schema
- internalLinks: Array of {text: string, url: string, context: string}
- serviceCallouts: Array of service keys to feature (e.g., ["seo", "web-design"])
- schema: Schema.org Article JSON-LD object (include FAQ if faqItems exist)
- featuredImageAlt: Descriptive alt text with keyword
- estimatedValue: SEO content value estimate ("$500-1000 equivalent")
- targetAudience: Who this article is for

Return ONLY valid JSON.`
        }
      ],
      temperature: 0.7,
      max_completion_tokens: 8000,
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

    // Process service callouts - replace markers with actual service data
    let processedContent = aiContent.content
    const serviceCalloutsData = []
    
    if (aiContent.serviceCallouts && Array.isArray(aiContent.serviceCallouts)) {
      for (const serviceKey of aiContent.serviceCallouts) {
        if (UPTRADE_SERVICES[serviceKey]) {
          serviceCalloutsData.push({
            key: serviceKey,
            ...UPTRADE_SERVICES[serviceKey]
          })
        }
      }
    }

    // Convert markdown to HTML (enhanced)
    const contentHtml = processedContent
      .replace(/^### (.*?)$/gm, '<h3 id="$1">$1</h3>')
      .replace(/^## (.*?)$/gm, '<h2 id="$1">$1</h2>')
      .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      // Add heading slugs for table of contents
      .replace(/<h2 id="(.*?)">/g, (match, heading) => {
        const slug = heading.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
        return `<h2 id="${slug}">`
      })
      .replace(/<h3 id="(.*?)">/g, (match, heading) => {
        const slug = heading.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
        return `<h3 id="${slug}">`
      })

    // Build enhanced schema with FAQ if present
    let schemaMarkup = aiContent.schema || {}
    if (aiContent.faqItems && aiContent.faqItems.length > 0) {
      schemaMarkup = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Article',
            headline: aiContent.title,
            description: aiContent.excerpt,
            author: {
              '@type': 'Organization',
              name: 'Uptrade Media'
            },
            publisher: {
              '@type': 'Organization',
              name: 'Uptrade Media',
              logo: {
                '@type': 'ImageObject',
                url: 'https://uptrademedia.com/logo.png'
              }
            }
          },
          {
            '@type': 'FAQPage',
            mainEntity: aiContent.faqItems.map(faq => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer
              }
            }))
          }
        ]
      }
    }

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
        schema_markup: JSON.stringify(schemaMarkup),
        table_of_contents: aiContent.tableOfContents ? JSON.stringify(aiContent.tableOfContents) : null,
        faq_items: aiContent.faqItems ? JSON.stringify(aiContent.faqItems) : null,
        service_callouts: serviceCalloutsData.length > 0 ? JSON.stringify(serviceCalloutsData) : null,
        target_audience: aiContent.targetAudience || null,
        estimated_value: aiContent.estimatedValue || null,
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
        previewUrl: `https://uptrademedia.com/insights/${slug}`,
        stats: {
          wordCount: aiContent.content.split(/\s+/).length,
          readingTime: aiContent.readingTime,
          keywordsCount: aiContent.keywords?.length || 0,
          faqCount: aiContent.faqItems?.length || 0,
          serviceCallouts: serviceCalloutsData.length,
          estimatedValue: aiContent.estimatedValue
        }
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
