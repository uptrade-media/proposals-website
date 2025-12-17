/**
 * SEO AI Blog Brain Function
 * 
 * Integrates the SEO AI Brain with blog content creation and optimization.
 * Leverages deep business knowledge, keyword intelligence, and content strategy
 * to create highly targeted, SEO-optimized blog content.
 * 
 * Writing Style: Educational, conversational - like a master educating a friend
 * Never uses: em dashes (—), overly formal language, sales-heavy tone
 * Always: References credible sources, cites data, provides actionable insights
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import OpenAI from 'openai'

const SEO_AI_MODEL = process.env.SEO_AI_MODEL || 'gpt-4o'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/**
 * Uptrade Media Services - Complete catalog for internal linking
 */
const UPTRADE_SERVICES = {
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
    keywords: ['PPC', 'Google Ads', 'paid advertising', 'SEM', 'ad campaigns']
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
    keywords: ['social media', 'email marketing', 'Instagram', 'Facebook', 'LinkedIn']
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
    keywords: ['branding', 'brand identity', 'logo', 'brand strategy']
  },
  'ux': {
    url: '/design/ux/',
    title: 'UX Design',
    description: 'User experiences that convert visitors into customers',
    cta: 'Improve Your UX',
    keywords: ['UX', 'user experience', 'usability', 'conversion optimization']
  },
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
    keywords: ['ecommerce', 'online store', 'Shopify', 'WooCommerce']
  },
  'video-production': {
    url: '/media/video-production/',
    title: 'Video Production',
    description: 'Professional video content that tells your story',
    cta: 'Create Video Content',
    keywords: ['video', 'video production', 'video marketing', 'YouTube']
  },
  'photography': {
    url: '/media/photography/',
    title: 'Professional Photography',
    description: 'Stunning visuals that elevate your brand',
    cta: 'Book a Photoshoot',
    keywords: ['photography', 'product photos', 'brand photography']
  },
  'ai-automation': {
    url: '/ai-automation/',
    title: 'AI & Automation',
    description: 'Custom AI solutions to streamline your business',
    cta: 'Automate Your Business',
    keywords: ['AI', 'automation', 'artificial intelligence', 'chatbot', 'machine learning']
  }
}

/**
 * CRITICAL: Writing Style Guidelines
 * This defines how ALL blog content should be written
 */
const BLOG_WRITING_SYSTEM_PROMPT = `You are a master educator writing for intelligent friends who want to learn. Your writing style is warm, conversational, and deeply informative.

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
1. **Hook** - Grab attention with a insight, question, or surprising fact
2. **Promise** - Tell them what they'll learn and why it matters
3. **Teach** - Deliver value in scannable, practical chunks
4. **Prove** - Back claims with data, examples, case studies
5. **Connect** - Relate to Uptrade services where natural (not forced)
6. **Close** - Actionable next steps, not generic CTAs

## AVAILABLE COMPONENTS

When writing blog posts, you can use these special markers that will render as interactive components:

1. **Service Callouts** - Contextual CTAs to related services
   Format: <!-- SERVICE_CALLOUT: service-key -->
   Place after sections where a service naturally relates

2. **FAQ Sections** - Expand into accordion FAQs
   Use standard H2 "Frequently Asked Questions" with Q&A format

3. **Key Takeaways** - Summarize main points
   Use bullet points under an H2 like "Key Takeaways" or "What You've Learned"

4. **Data Highlights** - Emphasize statistics
   Use blockquotes for standout stats: > "75% of users..."

## INTERNAL LINKING STRATEGY

Link to these Uptrade services naturally within content:
${Object.entries(UPTRADE_SERVICES).map(([key, s]) => `- ${s.title}: ${s.url}`).join('\n')}

Place links where they add value, not just for SEO. Ask: "Would a reader actually want to click this here?"
`

/**
 * Build SEO context from knowledge base
 */
async function getSeoContext(supabase, siteId) {
  // Get knowledge base
  const { data: knowledge } = await supabase
    .from('seo_knowledge_base')
    .select('*')
    .eq('site_id', siteId)
    .single()

  // Get top keywords
  const { data: keywords } = await supabase
    .from('seo_keyword_universe')
    .select('keyword, search_volume_monthly, current_position, intent, opportunity_score')
    .eq('site_id', siteId)
    .order('opportunity_score', { ascending: false })
    .limit(50)

  // Get content gaps
  const { data: gaps } = await supabase
    .from('seo_content_gaps')
    .select('*')
    .eq('site_id', siteId)
    .eq('status', 'identified')
    .order('ai_importance_score', { ascending: false })
    .limit(20)

  // Get competitor analysis
  const { data: competitors } = await supabase
    .from('seo_competitor_analysis')
    .select('competitor_domain, keyword_gap_data, content_update_frequency')
    .eq('site_id', siteId)
    .eq('is_primary', true)
    .limit(3)

  // Get recent blog posts for context
  const { data: recentPosts } = await supabase
    .from('blog_posts')
    .select('title, slug, category, keywords, focus_keyphrase')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(20)

  return {
    knowledge,
    keywords: keywords || [],
    gaps: gaps || [],
    competitors: competitors || [],
    recentPosts: recentPosts || []
  }
}

/**
 * Generate topic recommendations using SEO intelligence
 */
async function generateTopicRecommendations(seoContext, options = {}) {
  const { knowledge, keywords, gaps, competitors, recentPosts } = seoContext

  const existingTopics = recentPosts.map(p => p.title).join('\n')
  const keywordOpportunities = keywords
    .filter(k => k.opportunity_score > 50)
    .slice(0, 20)
    .map(k => `${k.keyword} (vol: ${k.search_volume_monthly}, pos: ${k.current_position || 'not ranking'})`)
    .join('\n')
  
  const gapTopics = gaps
    .slice(0, 10)
    .map(g => `${g.topic}: ${g.ai_reasoning}`)
    .join('\n')

  const competitorInsights = competitors
    .flatMap(c => (c.keyword_gap_data || []).slice(0, 5))
    .map(k => k.keyword)
    .join(', ')

  const prompt = `Based on this SEO intelligence, recommend 10 blog post topics that would drive organic traffic.

## BUSINESS CONTEXT
${knowledge?.business_name ? `Business: ${knowledge.business_name}` : ''}
${knowledge?.industry ? `Industry: ${knowledge.industry}` : ''}
${knowledge?.primary_services ? `Services: ${JSON.stringify(knowledge.primary_services)}` : ''}
${knowledge?.target_personas ? `Target Audience: ${JSON.stringify(knowledge.target_personas)}` : ''}

## KEYWORD OPPORTUNITIES
${keywordOpportunities || 'No keyword data available'}

## CONTENT GAPS IDENTIFIED
${gapTopics || 'No gaps identified'}

## COMPETITOR KEYWORDS WE DON'T RANK FOR
${competitorInsights || 'No competitor data'}

## RECENTLY PUBLISHED (avoid duplicates)
${existingTopics || 'No recent posts'}

## CATEGORY FOCUS
${options.category ? `Focus on: ${options.category}` : 'Any relevant category'}

Generate 10 topic recommendations. For each topic provide:
1. Title (compelling, keyword-rich, 50-60 chars)
2. Primary keyword to target
3. Search intent (informational, commercial, transactional)
4. Estimated traffic potential (low/medium/high)
5. Content angle (what makes this piece unique)
6. Related Uptrade services to link
7. Why this topic matters now

Return as JSON array.`

  const response = await openai.chat.completions.create({
    model: SEO_AI_MODEL,
    messages: [
      { role: 'system', content: 'You are an SEO content strategist. Generate data-driven topic recommendations.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' }
  })

  return JSON.parse(response.choices[0].message.content)
}

/**
 * Analyze and optimize an existing blog post
 */
async function analyzeAndOptimizeBlogPost(supabase, postId, seoContext) {
  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', postId)
    .single()

  if (error || !post) {
    throw new Error('Blog post not found')
  }

  const { knowledge, keywords } = seoContext

  // Find relevant keywords for this post's topic
  const relevantKeywords = keywords
    .filter(k => {
      const postText = `${post.title} ${post.content}`.toLowerCase()
      return postText.includes(k.keyword.toLowerCase())
    })
    .slice(0, 10)

  const analysisPrompt = `Analyze this blog post and provide specific optimization recommendations.

## CURRENT POST
Title: ${post.title}
Meta Title: ${post.meta_title}
Meta Description: ${post.meta_description}
Focus Keyphrase: ${post.focus_keyphrase}
Word Count: ${post.content?.split(/\s+/).length || 0}

Content:
${post.content}

## RELEVANT KEYWORDS WE COULD TARGET
${relevantKeywords.map(k => `- ${k.keyword} (vol: ${k.search_volume_monthly}, intent: ${k.intent})`).join('\n')}

## BUSINESS CONTEXT
${knowledge?.brand_voice_description || 'Professional and approachable'}

## CRITICAL STYLE CHECKS
1. Does it use em dashes (—)? These must be removed and replaced with commas, periods, or parentheses.
2. Is the tone conversational like teaching a friend, or stiff and formal?
3. Are there credible sources cited with specific data?
4. Are paragraphs short (2-3 sentences)?
5. Does it have a compelling hook, not a generic opener?

Provide:
1. SEO Score (0-100)
2. Content Quality Score (0-100)
3. Style Compliance Score (0-100) - based on our writing guidelines
4. Specific issues found (with line references if possible)
5. Optimized title (if current is suboptimal)
6. Optimized meta description
7. Better focus keyphrase recommendation
8. Content additions or improvements needed
9. Internal linking opportunities (to Uptrade services)
10. FAQ questions to add

Return as JSON.`

  const response = await openai.chat.completions.create({
    model: SEO_AI_MODEL,
    messages: [
      { role: 'system', content: BLOG_WRITING_SYSTEM_PROMPT },
      { role: 'user', content: analysisPrompt }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' }
  })

  return {
    post,
    analysis: JSON.parse(response.choices[0].message.content)
  }
}

/**
 * Generate optimized content for a blog post section
 */
async function generateOptimizedContent(options, seoContext) {
  const { knowledge } = seoContext

  const contentPrompt = `${options.instruction}

## CONTEXT
${options.existingContent ? `Existing content to improve:\n${options.existingContent}` : ''}
${options.targetKeyword ? `Target keyword: ${options.targetKeyword}` : ''}
${options.section ? `Section focus: ${options.section}` : ''}

## BUSINESS VOICE
${knowledge?.brand_voice_description || 'Professional, approachable, educational'}
${knowledge?.terminology ? `Use terms: ${JSON.stringify(knowledge.terminology)}` : ''}

Remember: Write like teaching a smart friend. No em dashes. Cite sources. Be conversational.`

  const response = await openai.chat.completions.create({
    model: SEO_AI_MODEL,
    messages: [
      { role: 'system', content: BLOG_WRITING_SYSTEM_PROMPT },
      { role: 'user', content: contentPrompt }
    ],
    temperature: 0.7
  })

  return response.choices[0].message.content
}

/**
 * Main handler
 */
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
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }

    const supabase = createSupabaseAdmin()
    const body = JSON.parse(event.body || '{}')
    const { action, siteId } = body

    // Get SEO context for intelligence
    const seoContext = siteId ? await getSeoContext(supabase, siteId) : null

    switch (action) {
      case 'recommend-topics': {
        if (!siteId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'siteId is required for topic recommendations' })
          }
        }

        const recommendations = await generateTopicRecommendations(seoContext, body.options || {})
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            recommendations,
            seoContext: {
              keywordCount: seoContext.keywords.length,
              gapsCount: seoContext.gaps.length,
              recentPostsCount: seoContext.recentPosts.length
            }
          })
        }
      }

      case 'analyze-post': {
        const { postId } = body
        if (!postId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'postId is required' })
          }
        }

        const analysis = await analyzeAndOptimizeBlogPost(supabase, postId, seoContext || {})
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(analysis)
        }
      }

      case 'generate-content': {
        const optimizedContent = await generateOptimizedContent(body.options || {}, seoContext || {})
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ content: optimizedContent })
        }
      }

      case 'get-writing-guidelines': {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            guidelines: BLOG_WRITING_SYSTEM_PROMPT,
            services: UPTRADE_SERVICES,
            components: {
              serviceCallout: '<!-- SERVICE_CALLOUT: service-key -->',
              faq: 'H2 "Frequently Asked Questions" with Q&A format',
              keyTakeaways: 'Bullet points under H2 "Key Takeaways"'
            }
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
    console.error('[SEO Blog Brain] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
