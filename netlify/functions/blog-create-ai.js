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
  // Marketing Services
  'seo': {
    url: '/marketing/seo/',
    title: 'SEO & Local SEO',
    description: 'Dominate search results and drive organic traffic',
    cta: 'Boost Your Rankings',
    keywords: ['SEO', 'search engine optimization', 'rankings', 'organic traffic', 'Google', 'local SEO']
  },
  'ad-management': {
    url: '/marketing/ad-management/',
    title: 'Paid Ads Management',
    description: 'Targeted ads that deliver measurable ROI',
    cta: 'Start Your Campaign',
    keywords: ['PPC', 'Google Ads', 'paid advertising', 'SEM', 'ad campaigns', 'paid ads']
  },
  'content-marketing': {
    url: '/marketing/content-marketing/',
    title: 'Content Marketing',
    description: 'Strategic content that attracts and engages your audience',
    cta: 'Create Better Content',
    keywords: ['content marketing', 'blog', 'content strategy', 'copywriting']
  },
  'email-social-marketing': {
    url: '/marketing/email-social-marketing/',
    title: 'Email & Social Marketing',
    description: 'Build your audience and nurture leads across platforms',
    cta: 'Grow Your Audience',
    keywords: ['social media', 'email marketing', 'Instagram', 'Facebook', 'LinkedIn', 'newsletters']
  },
  'reputation-management': {
    url: '/marketing/reputation-management/',
    title: 'Reputation Management',
    description: 'Protect and enhance your online reputation',
    cta: 'Manage Your Reputation',
    keywords: ['reputation', 'reviews', 'online reputation', 'brand protection']
  },
  'sales-funnels': {
    url: '/marketing/sales-funnels/',
    title: 'Sales Funnels',
    description: 'Convert visitors into customers with strategic funnels',
    cta: 'Build Your Funnel',
    keywords: ['sales funnel', 'conversion', 'lead generation', 'landing pages']
  },
  
  // Design Services
  'web-design': {
    url: '/design/web-design/',
    title: 'Custom Web Design',
    description: 'Beautiful, conversion-focused websites built for growth',
    cta: 'Get a Custom Website',
    keywords: ['web design', 'website', 'custom design', 'responsive design', 'UI/UX']
  },
  'branding': {
    url: '/design/branding/',
    title: 'Brand Identity Design',
    description: 'Create a memorable brand that connects with your audience',
    cta: 'Build Your Brand',
    keywords: ['branding', 'brand identity', 'logo', 'brand strategy', 'visual identity']
  },
  'ux': {
    url: '/design/ux/',
    title: 'UX Design',
    description: 'User experiences that convert visitors into customers',
    cta: 'Improve Your UX',
    keywords: ['UX', 'user experience', 'usability', 'conversion optimization', 'interface']
  },
  'graphic-design': {
    url: '/design/graphic-design/',
    title: 'Graphic Design',
    description: 'Eye-catching visuals for print and digital',
    cta: 'Get Stunning Graphics',
    keywords: ['graphic design', 'graphics', 'print design', 'visual design']
  },
  
  // Web Development (under Design)
  'web-development': {
    url: '/design/web-design/web-development/',
    title: 'Web Development',
    description: 'Custom-coded websites with cutting-edge technology',
    cta: 'Build Your Site',
    keywords: ['web development', 'coding', 'custom development', 'Next.js', 'React']
  },
  'ecommerce-development': {
    url: '/design/web-design/ecommerce-development/',
    title: 'E-commerce Development',
    description: 'Online stores that sell 24/7',
    cta: 'Launch Your Store',
    keywords: ['ecommerce', 'online store', 'Shopify', 'WooCommerce', 'e-commerce']
  },
  'landing-pages': {
    url: '/design/web-design/landing-pages/',
    title: 'Landing Pages',
    description: 'High-converting pages that capture leads',
    cta: 'Get a Landing Page',
    keywords: ['landing page', 'conversion', 'lead capture', 'squeeze page']
  },
  
  // Media Services
  'video-production': {
    url: '/media/video-production/',
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
  'video-testimonials': {
    url: '/media/video-testimonials/',
    title: 'Video Testimonials',
    description: 'Authentic customer stories that build trust',
    cta: 'Capture Testimonials',
    keywords: ['testimonials', 'customer reviews', 'social proof', 'video reviews']
  },
  'aerial-drone': {
    url: '/media/aerial-drone/',
    title: 'Aerial & Drone',
    description: 'Aerial photography and videography for unique perspectives',
    cta: 'Get Aerial Content',
    keywords: ['drone', 'aerial photography', 'drone video', 'aerial footage']
  },
  
  // AI & Automation
  'ai-automation': {
    url: '/ai-automation/',
    title: 'AI & Automation',
    description: 'Custom AI solutions to streamline your business',
    cta: 'Automate Your Business',
    keywords: ['AI', 'automation', 'artificial intelligence', 'chatbot', 'machine learning']
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

    // Build content options context
    const contentOptions = []
    if (formData.includeStats) contentOptions.push('Include industry statistics, data points, and research citations')
    if (formData.includeExamples) contentOptions.push('Include real-world examples and mini case studies')
    const contentOptionsText = contentOptions.length > 0 
      ? `\n\nCONTENT ENHANCEMENTS:\n${contentOptions.map(o => `- ${o}`).join('\n')}`
      : ''

    console.log('[Blog AI] Step 1: Generating body content...')

    // STEP 1: Generate the full body content
    const contentResponse = await openai.chat.completions.create({
      model: 'gpt-5.1',
      messages: [
        { role: 'system', content: UPTRADE_WRITING_STYLE },
        { 
          role: 'user', 
          content: `Write a comprehensive, world-class blog post:

Topic: ${formData.topic}
Category: ${formData.category}
Target Audience: ${formData.targetAudience || 'Small business owners and marketing professionals'}
Keywords to naturally include: ${formData.keywords || 'Generate based on topic'}
Key Points to Cover: ${formData.keyPoints || 'Cover comprehensively based on topic'}
Tone: ${formData.tone || 'professional'}
Target Word Count: ${formData.wordCount || '1200-1500'}
${servicesContext}
${contentOptionsText}

STRUCTURE REQUIREMENTS:
1. Start with a compelling hook that addresses a pain point or opportunity
2. Use H2 (##) for main sections, H3 (###) for subsections
3. Short, scannable paragraphs (2-4 sentences max)
4. Include bullet points and numbered lists where appropriate
5. Add transition sentences between sections
6. End with actionable takeaways and a compelling call-to-action
${formData.includeFAQ ? '7. Include a ## Frequently Asked Questions section at the end with 4-6 Q&As' : ''}

Write the full blog post content in Markdown format. Focus on being genuinely helpful and educational.
Include <!-- SERVICE_CALLOUT: service-key --> markers after sections where an Uptrade service naturally relates.

Return the blog post content ONLY - no JSON, no metadata, just the markdown content.`
        }
      ],
      temperature: 0.7,
      max_completion_tokens: 6000
    })

    const blogContent = contentResponse.choices[0].message.content

    console.log('[Blog AI] Step 2: Generating SEO metadata...')

    // STEP 2: Generate SEO metadata based on the written content
    const metadataResponse = await openai.chat.completions.create({
      model: 'gpt-5.1',
      messages: [
        { role: 'system', content: 'You are an SEO specialist analyzing blog content to generate optimal metadata for search engines and rich snippets.' },
        { 
          role: 'user', 
          content: `Analyze this blog post and generate SEO metadata:

---BEGIN CONTENT---
${blogContent}
---END CONTENT---

Original Topic: ${formData.topic}
Category: ${formData.category}
Target Audience: ${formData.targetAudience || 'Small business owners'}

Generate JSON with these fields:
{
  "title": "SEO-optimized title (50-60 chars, primary keyword near start)",
  "excerpt": "Compelling preview that makes people want to read (150-160 chars)",
  "keywords": ["array", "of", "8-12", "SEO", "keywords", "mix", "short", "and", "long-tail"],
  "readingTime": 5,
  "metaTitle": "Meta title for search results (different angle, 55-60 chars)",
  "metaDescription": "Meta description with value prop (150-160 chars)",
  "focusKeyphrase": "primary keyphrase 2-4 words",
  "tableOfContents": [{"heading": "Section Name", "slug": "section-name", "level": 2}],
  "faqItems": [{"question": "Common question?", "answer": "Comprehensive answer"}],
  "serviceCallouts": ["seo", "web-design"],
  "featuredImageAlt": "Descriptive alt text with primary keyword",
  "targetAudience": "One sentence describing ideal reader"
}

INSTRUCTIONS:
- Extract FAQ items from the content if a FAQ section exists, otherwise create 4-6 based on the content
- For serviceCallouts, list the service keys that appear in <!-- SERVICE_CALLOUT --> markers
- tableOfContents should list all H2 headers with URL-safe slugs
- All text should be compelling and click-worthy while being accurate

Return ONLY valid JSON.`
        }
      ],
      temperature: 0.5,
      max_completion_tokens: 2000,
      response_format: { type: 'json_object' }
    })

    const aiMetadata = JSON.parse(metadataResponse.choices[0].message.content)
    
    // Combine content with metadata
    const aiContent = {
      ...aiMetadata,
      content: blogContent
    }
    
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
        featured_image_width: 1200,
        featured_image_height: 630,
        author: formData.author || 'Uptrade Media',
        keywords: Array.isArray(aiContent.keywords) ? aiContent.keywords : [],
        reading_time: aiContent.readingTime || 5,
        meta_title: aiContent.metaTitle || aiContent.title,
        meta_description: aiContent.metaDescription || aiContent.excerpt,
        focus_keyphrase: aiContent.focusKeyphrase || null,
        schema_markup: JSON.stringify(schemaMarkup),
        table_of_contents: aiContent.tableOfContents || null,
        faq_items: aiContent.faqItems && aiContent.faqItems.length > 0 ? aiContent.faqItems : null,
        service_callouts: serviceCalloutsData.length > 0 ? serviceCalloutsData : null,
        target_audience: aiContent.targetAudience || formData.targetAudience || null,
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
