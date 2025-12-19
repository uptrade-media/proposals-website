/**
 * Blog Create with AI Function
 * 
 * Creates a new blog post with AI-generated content
 * Enhanced with Uptrade service callouts and comprehensive SEO
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
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

const UPTRADE_WRITING_STYLE = `You are a master educator writing for intelligent friends who want to learn. Your writing style is warm, conversational, and deeply informative.

## CRITICAL WRITING RULES

### NEVER USE:
- Em dashes (—) - use commas, periods, or parentheses instead
- En dashes (–) except in number ranges (2020-2024)
- Overly formal academic language
- Sales-heavy or pushy language
- Filler phrases like "In today's digital landscape" or "In this article, we'll explore"
- Buzzwords without substance
- Passive voice when active is better

### ALWAYS DO:
1. **Write like you're teaching a smart friend** - Assume intelligence, explain complexity
2. **Cite credible sources** - Reference studies, statistics, expert quotes with attribution
3. **Be conversational but authoritative** - You know your stuff, share it warmly
4. **Use contractions** - "you'll", "we've", "it's" - it's how people talk
5. **Short paragraphs** - 2-3 sentences max for readability
6. **Start with a hook** - Address the reader's problem or curiosity immediately
7. **Provide actionable insights** - Every section should teach something useful
8. **Use examples** - Real scenarios make abstract concepts concrete
9. **Include data points** - Numbers and statistics build credibility

### TONE EXAMPLES:
❌ WRONG: "In today's ever-evolving digital marketing landscape — where competition is fierce — businesses must leverage innovative strategies to achieve success."

✅ RIGHT: "Here's the truth about digital marketing in 2025: the businesses winning aren't doing more. They're doing less, but doing it better. Let me show you exactly how."

❌ WRONG: "It is imperative that organizations implement comprehensive SEO strategies to maximize their online visibility."

✅ RIGHT: "Google processes 8.5 billion searches every day (Search Engine Land, 2024). If your website isn't showing up when people search for what you offer, you're invisible to most of your potential customers."

### CITING SOURCES:
- Name the source directly: "According to HubSpot's 2024 State of Marketing Report..."
- Include specific data: "A Stanford study found that 75% of users judge credibility based on design..."
- Link when online: "Research from Moz shows..." (we'll add the link)

### CONTENT STRUCTURE:
1. **Hook** - Grab attention with an insight, question, or surprising fact
2. **Promise** - Tell them what they'll learn and why it matters
3. **Teach** - Deliver value in scannable, practical chunks
4. **Prove** - Back claims with data, examples, case studies
5. **Connect** - Relate to Uptrade services where natural (not forced)
6. **Close** - Actionable next steps, not generic CTAs

## BRAND CONTEXT: UPTRADE MEDIA
A digital marketing agency specializing in web design, SEO, and digital marketing.
Voice: Professional yet approachable, expert without being condescending
Tone: Confident, helpful, solutions-focused

## AVAILABLE COMPONENTS

1. **Service Callouts** - Contextual CTAs to related services
   Format: <!-- SERVICE_CALLOUT: service-key -->
   Place after sections where a service naturally relates

2. **FAQ Sections** - Will render as accordions
   Use H2 "Frequently Asked Questions" with Q&A format

3. **Key Takeaways** - Summarize main points
   Use bullet points under H2 "Key Takeaways"

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

/**
 * God's Workout Apparel Writing Style
 */
const GWA_WRITING_STYLE = `You are writing for God's Workout Apparel, a faith-driven fitness brand. Your audience is Christian athletes and fitness enthusiasts who see physical discipline as spiritual discipline.

## CRITICAL WRITING RULES

### NEVER USE:
- Em dashes (—) - use commas, periods, or parentheses instead
- En dashes (–) except in number ranges
- Generic fitness clichés without spiritual depth
- Preachy or judgmental language
- Filler phrases like "In today's world" or "In this article"

### ALWAYS DO:
1. **Weave faith and fitness together naturally** - The body is a temple, training is worship
2. **Ground content in Scripture** - Reference verses that support the message
3. **Be encouraging, not preachy** - Inspire through example, not lecture
4. **Use contractions** - Write conversationally (you'll, we've, it's)
5. **Short paragraphs** - 2-3 sentences max for readability
6. **Start with a hook** - Address the reader's struggle or aspiration
7. **Provide actionable insights** - Every section should teach something useful
8. **Include workout tips** - Practical training advice alongside spiritual truth
9. **Reference the GWA lifestyle** - Discipline, dedication, devotion

### TONE EXAMPLES:
❌ WRONG: "In today's fitness-obsessed culture, Christians must navigate the balance between physical health and spiritual growth."

✅ RIGHT: "Your body is a temple. Not because some pastor told you so, but because God crafted it with His own hands. When you train, you're not just building muscle. You're honoring the craftsmanship of the Creator."

❌ WRONG: "It is important for believers to maintain physical fitness as part of their spiritual journey."

✅ RIGHT: "David didn't defeat Goliath sitting on a couch. The shepherd king trained his body in the wilderness, slinging stones until his aim was true. Your training matters. God uses prepared people."

### SCRIPTURE INTEGRATION:
- Weave verses naturally, don't just drop them in
- Explain how they apply to training
- Use NIV, ESV, or NKJV translations
- Key verses: 1 Corinthians 6:19-20, Philippians 4:13, 1 Timothy 4:8, Hebrews 12:1-2

### CONTENT STRUCTURE:
1. **Hook** - Grab attention with relatable struggle or bold truth
2. **Biblical Foundation** - Connect to Scripture
3. **Practical Training** - Actionable fitness/discipline advice
4. **Spiritual Application** - How this transforms daily life
5. **Call to Action** - Inspire the next step

## BRAND CONTEXT: GOD'S WORKOUT APPAREL
A faith-driven fitness apparel brand for Christian athletes.
Voice: Warrior-poet meets humble servant
Tone: Bold, encouraging, biblically grounded, never preachy
Tagline: "Train Like Your Body is a Temple"`

/**
 * Get tenant-specific configuration
 */
function getTenantConfig(org) {
  if (!org) return { writingStyle: UPTRADE_WRITING_STYLE, services: UPTRADE_SERVICES, isGWA: false }
  
  const slug = org.slug?.toLowerCase() || ''
  const name = org.name?.toLowerCase() || ''
  
  if (slug.includes('gods-workout') || slug.includes('gwa') || name.includes("god's workout")) {
    return { writingStyle: GWA_WRITING_STYLE, services: null, isGWA: true }
  }
  
  return { writingStyle: UPTRADE_WRITING_STYLE, services: UPTRADE_SERVICES, isGWA: false }
}

/**
 * Process a blog generation job in the background
 * Called internally by blog-create-ai.js
 */
export async function processJobInBackground(jobId) {
  const supabase = createSupabaseAdmin()
  
  try {
    // Get job
    const { data: job, error: jobError } = await supabase
      .from('blog_generation_jobs')
      .select('*')
      .eq('id', jobId)
      .single()
    
    if (jobError || !job) {
      console.error('[Blog AI Worker] Job not found:', jobId)
      return
    }
    
    console.log('[Blog AI Worker] Processing job:', jobId)
    const startTime = Date.now()
    
    // Update to processing
    await supabase
      .from('blog_generation_jobs')
      .update({
        status: 'processing',
        started_at: new Date(),
        progress: { stage: 1, message: 'Writing content...' }
      })
      .eq('id', jobId)
    
    const formData = job.form_data
    
    // Get org context
    let org = null
    if (job.org_id) {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('id, slug, name')
        .eq('id', job.org_id)
        .single()
      
      org = orgData
    }

    // Auth and form data already handled by job creation
    // Skip auth checks here
    
    // Get tenant-specific config
    const tenantConfig = getTenantConfig(org)
    
    console.log('[Blog AI] Generating content for:', formData.topic, '| Tenant:', org?.name || 'Uptrade Media')

    // Find related services for this topic (only for Uptrade)
    let servicesContext = ''
    if (!tenantConfig.isGWA && tenantConfig.services) {
      const relatedServices = findRelatedServices(
        formData.topic, 
        formData.category, 
        formData.keywords
      )
      
      servicesContext = relatedServices.length > 0
        ? `\n\nRELATED UPTRADE SERVICES TO FEATURE:
${relatedServices.map(s => `- ${s.title} (${s.url}): ${s.description} | CTA: "${s.cta}"`).join('\n')}

Include 2-3 natural callout sections in the content that reference these services. Format each callout as:
<!-- SERVICE_CALLOUT: service-key -->
Place these strategically after relevant sections to provide value, not just promote.`
        : ''
    }

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
        { role: 'system', content: tenantConfig.writingStyle },
        { 
          role: 'user', 
          content: `Write a comprehensive, world-class blog post:

Topic: ${formData.topic}
Category: ${formData.category}
Target Audience: ${formData.targetAudience || 'Small business owners and marketing professionals'}
Keywords to naturally include: ${formData.keywords || 'Generate based on topic'}
Key Points to Cover: ${formData.keyPoints || 'Cover comprehensively based on topic'}
Tone: ${formData.tone || 'conversational and educational'}
Target Word Count: ${formData.wordCount || '1200-1500'}
${servicesContext}
${contentOptionsText}

CRITICAL REQUIREMENTS:
1. NEVER use em dashes (—) or en dashes (–). Use commas, periods, or parentheses instead.
2. Start with a compelling hook, NOT "In today's..." or "In this article..."
3. Write like you're teaching a smart friend, not lecturing
4. Cite credible sources with specific data points (e.g., "According to HubSpot's 2024 report...")
5. Use contractions naturally (you'll, we've, it's)
6. Keep paragraphs to 2-3 sentences max

STRUCTURE:
1. Hook - Grab attention immediately with insight or surprising fact
2. Use H2 (##) for main sections, H3 (###) for subsections
3. Short, scannable paragraphs
4. Include bullet points and numbered lists
5. Add real examples and case studies
6. End with actionable takeaways
${formData.includeFAQ ? '7. Include a ## Frequently Asked Questions section at the end with 4-6 Q&As' : ''}

Write the full blog post content in Markdown format. Be genuinely helpful and educational.
${!tenantConfig.isGWA ? 'Include <!-- SERVICE_CALLOUT: service-key --> markers after sections where an Uptrade service naturally relates.' : ''}

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
    
    // Generate slug with uniqueness check
    let baseSlug = aiContent.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100)
    
    let slug = baseSlug
    let counter = 1
    
    // Check if slug exists and append counter if needed
    while (true) {
      const { data: existing } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
      
      if (!existing) break
      
      slug = `${baseSlug}-${counter}`
      counter++
    }
    
    console.log('[Blog AI Worker] Using slug:', slug)
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100)

    // Process service callouts - replace markers with actual service data (Uptrade only)
    let processedContent = aiContent.content
    const serviceCalloutsData = []
    
    if (!tenantConfig.isGWA && aiContent.serviceCallouts && Array.isArray(aiContent.serviceCallouts)) {
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

    // Save to database (reuse supabase client from earlier)
    const { data: blogPost, error: insertError } = await supabase
      .from('blog_posts')
      .insert({
        org_id: org?.id || null,
        slug,
        title: aiContent.title,
        subtitle: aiContent.subtitle || null,
        category: formData.category,
        excerpt: aiContent.excerpt,
        content: aiContent.content,
        content_html: contentHtml,
        featured_image: formData.featuredImage || null,
        featured_image_alt: aiContent.featuredImageAlt || aiContent.title,
        author: formData.author || (tenantConfig.isGWA ? "God's Workout Apparel" : 'Uptrade Media'),
        keywords: Array.isArray(aiContent.keywords) ? aiContent.keywords : [],
        reading_time: aiContent.readingTime || 5,
        meta_title: aiContent.metaTitle || aiContent.title,
        meta_description: aiContent.metaDescription || aiContent.excerpt,
        focus_keyphrase: aiContent.focusKeyphrase || null,
        schema_markup: JSON.stringify(schemaMarkup),
        table_of_contents: aiContent.tableOfContents || null,
        faq_items: aiContent.faqItems && aiContent.faqItems.length > 0 ? aiContent.faqItems : null,
        service_callouts: tenantConfig.isGWA ? null : (serviceCalloutsData.length > 0 ? serviceCalloutsData : null),
        target_audience: aiContent.targetAudience || formData.targetAudience || null,
        status: formData.publishImmediately ? 'published' : 'draft',
        published_at: formData.publishImmediately ? new Date() : null
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    console.log('[Blog AI Worker] Blog post created:', blogPost.id, blogPost.title)

    const duration = Date.now() - startTime

    // Determine preview URL based on tenant
    const previewUrl = tenantConfig.isGWA 
      ? `https://godsworkoutapparel.com/articles/${slug}`
      : `https://uptrademedia.com/insights/${slug}`

    const result = {
      id: blogPost.id,
      title: blogPost.title,
      slug: blogPost.slug,
      previewUrl,
      stats: {
        wordCount: aiContent.content.split(/\s+/).length,
        readingTime: aiContent.readingTime,
        keywordsCount: aiContent.keywords?.length || 0,
        faqCount: aiContent.faqItems?.length || 0,
        serviceCallouts: serviceCalloutsData.length
      }
    }

    // Update job as completed
    await supabase
      .from('blog_generation_jobs')
      .update({
        status: 'completed',
        completed_at: new Date(),
        duration_ms: duration,
        blog_post_id: blogPost.id,
        result: result,
        progress: { stage: 4, message: 'Complete!' }
      })
      .eq('id', jobId)
    
    console.log('[Blog AI Worker] Job completed:', jobId, 'in', duration, 'ms')

  } catch (error) {
    console.error('[Blog AI Worker] Job failed:', jobId, error)
    
    await supabase
      .from('blog_generation_jobs')
      .update({
        status: 'failed',
        completed_at: new Date(),
        error: error.message,
        progress: { stage: -1, message: 'Failed: ' + error.message }
      })
      .eq('id', jobId)
  }
}
