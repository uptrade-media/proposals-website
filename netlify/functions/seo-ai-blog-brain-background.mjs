/**
 * SEO AI Blog Brain - Background Function
 * 
 * Long-running AI blog operations with 15-minute timeout:
 * - Topic generation with full SEO analysis
 * - Post optimization with source citations
 * - Batch content generation
 * - Auto-optimization of multiple posts
 * 
 * This is the background processor. Triggered via seo-ai-blog-brain.js
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// Background function config - 15 min timeout
export const config = {
  type: 'background'
}

const SEO_AI_MODEL = process.env.SEO_AI_MODEL || 'gpt-4o'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/**
 * Uptrade Media Services - Complete catalog for internal linking
 */
const UPTRADE_SERVICES = {
  'seo': { url: '/marketing/seo/', title: 'SEO & Local SEO', keywords: ['SEO', 'search engine optimization', 'rankings', 'organic traffic', 'Google', 'local SEO'] },
  'ad-management': { url: '/marketing/ad-management/', title: 'Paid Ads Management', keywords: ['PPC', 'Google Ads', 'paid advertising', 'SEM'] },
  'content-marketing': { url: '/marketing/content-marketing/', title: 'Content Marketing', keywords: ['content marketing', 'blog', 'content strategy'] },
  'email-social-marketing': { url: '/marketing/email-social-marketing/', title: 'Email & Social Marketing', keywords: ['social media', 'email marketing'] },
  'web-design': { url: '/design/web-design/', title: 'Custom Web Design', keywords: ['web design', 'website', 'custom design'] },
  'branding': { url: '/design/branding/', title: 'Brand Identity Design', keywords: ['branding', 'brand identity', 'logo'] },
  'video-production': { url: '/media/video-production/', title: 'Video Production', keywords: ['video', 'video production'] },
  'ai-automation': { url: '/ai-automation/', title: 'AI & Automation', keywords: ['AI', 'automation', 'artificial intelligence'] }
}

const BLOG_WRITING_SYSTEM_PROMPT = `You are a master educator writing for intelligent friends who want to learn.

## CRITICAL RULES
- NEVER use em dashes (—) - use commas, periods, or parentheses
- NEVER use en dashes (–) except in number ranges
- ALWAYS cite credible sources with specific data
- Write conversationally like teaching a smart friend
- Use contractions naturally
- Keep paragraphs to 2-3 sentences
- Start with a hook, not a generic opener
- Provide actionable insights
- Use real examples and data points

## TONE EXAMPLE
✅ RIGHT: "Google processes 8.5 billion searches every day (Search Engine Land, 2024). If your website isn't showing up when people search for what you offer, you're invisible to most of your potential customers."
❌ WRONG: "In today's digital landscape — where competition is fierce — businesses must leverage innovative SEO strategies."
`

/**
 * Get SEO context from knowledge base
 */
async function getSeoContext(siteId) {
  const [knowledge, keywords, gaps, competitors, recentPosts] = await Promise.all([
    supabase.from('seo_knowledge_base').select('*').eq('site_id', siteId).single(),
    supabase.from('seo_keyword_universe')
      .select('keyword, search_volume_monthly, current_position, intent, opportunity_score')
      .eq('site_id', siteId)
      .order('opportunity_score', { ascending: false })
      .limit(50),
    supabase.from('seo_content_gaps')
      .select('*')
      .eq('site_id', siteId)
      .eq('status', 'identified')
      .order('ai_importance_score', { ascending: false })
      .limit(20),
    supabase.from('seo_competitor_analysis')
      .select('competitor_domain, keyword_gap_data')
      .eq('site_id', siteId)
      .eq('is_primary', true)
      .limit(3),
    supabase.from('blog_posts')
      .select('id, title, slug, category, keywords, focus_keyphrase')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(20)
  ])

  return {
    knowledge: knowledge.data,
    keywords: keywords.data || [],
    gaps: gaps.data || [],
    competitors: competitors.data || [],
    recentPosts: recentPosts.data || []
  }
}

/**
 * Update job status
 */
async function updateJobStatus(jobId, status, data = {}) {
  await supabase
    .from('seo_background_jobs')
    .update({
      status,
      result: data.result || null,
      error: data.error || null,
      progress: data.progress || null,
      completed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId)
}

/**
 * Generate topic recommendations using SEO intelligence
 */
async function generateTopicRecommendations(jobId, siteId, options = {}) {
  await updateJobStatus(jobId, 'processing', { progress: 10 })

  const seoContext = await getSeoContext(siteId)
  await updateJobStatus(jobId, 'processing', { progress: 30 })

  const { knowledge, keywords, gaps, competitors, recentPosts } = seoContext

  const existingTopics = recentPosts.map(p => p.title).join('\n')
  const keywordOpportunities = keywords
    .filter(k => k.opportunity_score > 50)
    .slice(0, 20)
    .map(k => `${k.keyword} (vol: ${k.search_volume_monthly}, pos: ${k.current_position || 'not ranking'})`)
    .join('\n')
  
  const gapTopics = gaps.slice(0, 10).map(g => `${g.topic}: ${g.ai_reasoning}`).join('\n')
  const competitorKeywords = competitors.flatMap(c => (c.keyword_gap_data || []).slice(0, 5).map(k => k.keyword)).join(', ')

  const prompt = `Based on this SEO intelligence, recommend 10 blog post topics.

## BUSINESS CONTEXT
${knowledge?.business_name ? `Business: ${knowledge.business_name}` : 'Business: Uptrade Media (digital marketing agency)'}
${knowledge?.industry ? `Industry: ${knowledge.industry}` : 'Industry: Digital Marketing & Web Design'}
${knowledge?.primary_services ? `Services: ${JSON.stringify(knowledge.primary_services)}` : ''}

## KEYWORD OPPORTUNITIES
${keywordOpportunities || 'No keyword data available - recommend general industry topics'}

## CONTENT GAPS IDENTIFIED
${gapTopics || 'No gaps identified'}

## COMPETITOR KEYWORDS WE DON\'T RANK FOR
${competitorKeywords || 'No competitor data'}

## RECENTLY PUBLISHED (avoid duplicates)
${existingTopics || 'No recent posts'}

${options.category ? `## FOCUS ON CATEGORY: ${options.category}` : ''}

Generate 10 topic recommendations. Return JSON with "topics" array containing objects with:
- title (compelling, keyword-rich, 50-60 chars)
- primary_keyword
- search_intent (informational/commercial/transactional)
- traffic_potential (low/medium/high)
- content_angle
- related_services (array of service keys from: seo, ad-management, content-marketing, web-design, branding, video-production, ai-automation)
- reasoning`

  await updateJobStatus(jobId, 'processing', { progress: 50 })

  const response = await openai.chat.completions.create({
    model: SEO_AI_MODEL,
    messages: [
      { role: 'system', content: 'You are an SEO content strategist. Generate data-driven topic recommendations. Return valid JSON.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' }
  })

  await updateJobStatus(jobId, 'processing', { progress: 90 })

  const result = JSON.parse(response.choices[0].message.content)
  
  await updateJobStatus(jobId, 'completed', {
    result: {
      topics: result.topics,
      seoContext: {
        keywordCount: keywords.length,
        gapsCount: gaps.length,
        recentPostsCount: recentPosts.length
      }
    }
  })
}

/**
 * Analyze and optimize a blog post
 */
async function analyzeAndOptimizePost(jobId, postId, siteId) {
  await updateJobStatus(jobId, 'processing', { progress: 10 })

  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', postId)
    .single()

  if (error || !post) {
    throw new Error('Blog post not found')
  }

  await updateJobStatus(jobId, 'processing', { progress: 20 })

  const seoContext = siteId ? await getSeoContext(siteId) : { keywords: [], knowledge: null }
  
  await updateJobStatus(jobId, 'processing', { progress: 40 })

  // Find relevant keywords
  const relevantKeywords = seoContext.keywords
    .filter(k => {
      const postText = `${post.title} ${post.content}`.toLowerCase()
      return postText.includes(k.keyword.toLowerCase())
    })
    .slice(0, 10)

  const analysisPrompt = `Analyze this blog post and provide optimization recommendations.

## CURRENT POST
Title: ${post.title}
Meta Title: ${post.meta_title || post.title}
Meta Description: ${post.meta_description || ''}
Focus Keyphrase: ${post.focus_keyphrase || 'none set'}
Word Count: ${post.content?.split(/\\s+/).length || 0}

Content:
${post.content?.substring(0, 8000)}${post.content?.length > 8000 ? '...[truncated]' : ''}

## RELEVANT KEYWORDS WE COULD TARGET
${relevantKeywords.map(k => `- ${k.keyword} (vol: ${k.search_volume_monthly}, intent: ${k.intent})`).join('\n') || 'No keyword data'}

## CRITICAL STYLE CHECKS
1. Does it use em dashes (—)? Must be replaced with commas/periods/parentheses
2. Is the tone conversational or stiff?
3. Are credible sources cited?
4. Are paragraphs short (2-3 sentences)?
5. Does it have a compelling hook?

Return JSON with:
- seo_score (0-100)
- content_score (0-100)
- style_score (0-100)
- issues (array of {type, description, severity})
- optimized_title (improved version)
- optimized_meta_description (150-160 chars)
- recommended_focus_keyphrase
- content_improvements (array of specific changes)
- internal_links (array of {service_key, anchor_text, reasoning})
- faq_suggestions (array of Q&A pairs to add)
- em_dash_count (number found)
- source_citations_needed (array of claims that need sources)`

  await updateJobStatus(jobId, 'processing', { progress: 60 })

  const response = await openai.chat.completions.create({
    model: SEO_AI_MODEL,
    messages: [
      { role: 'system', content: BLOG_WRITING_SYSTEM_PROMPT + '\n\nYou are analyzing blog posts for optimization. Return valid JSON.' },
      { role: 'user', content: analysisPrompt }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' }
  })

  await updateJobStatus(jobId, 'processing', { progress: 90 })

  const analysis = JSON.parse(response.choices[0].message.content)

  await updateJobStatus(jobId, 'completed', {
    result: {
      post: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        status: post.status
      },
      analysis,
      services: UPTRADE_SERVICES
    }
  })
}

/**
 * Auto-optimize multiple blog posts
 */
async function autoOptimizeAllPosts(jobId, options = {}) {
  await updateJobStatus(jobId, 'processing', { progress: 5 })

  // Get posts to optimize
  let query = supabase.from('blog_posts').select('*')
  
  if (options.status) {
    query = query.eq('status', options.status)
  }
  if (options.limit) {
    query = query.limit(options.limit)
  }

  const { data: posts, error } = await query.order('updated_at', { ascending: true })

  if (error || !posts?.length) {
    throw new Error('No posts found to optimize')
  }

  await updateJobStatus(jobId, 'processing', { progress: 10 })

  const results = []
  const totalPosts = posts.length

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i]
    const progress = 10 + Math.floor((i / totalPosts) * 80)
    
    await updateJobStatus(jobId, 'processing', { progress })

    try {
      // Quick optimization - fix em dashes and basic issues
      let content = post.content || ''
      let contentHtml = post.content_html || ''
      
      // Remove em dashes
      const emDashCount = (content.match(/—/g) || []).length
      content = content
        .replace(/\s—\s/g, ', ')
        .replace(/—([^—]+)—/g, '($1)')
        .replace(/—/g, ', ')
        .replace(/,\s*,/g, ',')
        .replace(/\s{2,}/g, ' ')
      
      contentHtml = contentHtml
        .replace(/\s—\s/g, ', ')
        .replace(/—([^—]+)—/g, '($1)')
        .replace(/—/g, ', ')
        .replace(/,\s*,/g, ',')

      // Update post if changes made
      if (emDashCount > 0) {
        await supabase
          .from('blog_posts')
          .update({
            content,
            content_html: contentHtml,
            updated_at: new Date().toISOString()
          })
          .eq('id', post.id)

        results.push({
          id: post.id,
          title: post.title,
          status: 'optimized',
          changes: { emDashesRemoved: emDashCount }
        })
      } else {
        results.push({
          id: post.id,
          title: post.title,
          status: 'no_changes',
          changes: {}
        })
      }
    } catch (err) {
      results.push({
        id: post.id,
        title: post.title,
        status: 'error',
        error: err.message
      })
    }
  }

  await updateJobStatus(jobId, 'completed', {
    result: {
      totalProcessed: posts.length,
      optimized: results.filter(r => r.status === 'optimized').length,
      unchanged: results.filter(r => r.status === 'no_changes').length,
      errors: results.filter(r => r.status === 'error').length,
      details: results
    }
  })
}

/**
 * Main handler
 */
export async function handler(event) {
  console.log('[SEO Blog Brain Background] Starting job')
  
  try {
    const body = JSON.parse(event.body || '{}')
    const { jobId, action, siteId, postId, options } = body

    if (!jobId) {
      console.error('[SEO Blog Brain Background] No jobId provided')
      return { statusCode: 400 }
    }

    // Mark job as started
    await updateJobStatus(jobId, 'processing', { progress: 0 })

    switch (action) {
      case 'recommend-topics':
        await generateTopicRecommendations(jobId, siteId, options)
        break

      case 'analyze-post':
        await analyzeAndOptimizePost(jobId, postId, siteId)
        break

      case 'auto-optimize-all':
        await autoOptimizeAllPosts(jobId, options)
        break

      default:
        await updateJobStatus(jobId, 'failed', { error: `Unknown action: ${action}` })
    }

    console.log('[SEO Blog Brain Background] Job completed:', jobId)
    return { statusCode: 200 }

  } catch (error) {
    console.error('[SEO Blog Brain Background] Error:', error)
    
    try {
      const body = JSON.parse(event.body || '{}')
      if (body.jobId) {
        await updateJobStatus(body.jobId, 'failed', { error: error.message })
      }
    } catch (e) {
      console.error('[SEO Blog Brain Background] Failed to update job status:', e)
    }

    return { statusCode: 500 }
  }
}
