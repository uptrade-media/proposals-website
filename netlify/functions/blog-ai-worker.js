/**
 * Blog Create with AI Function
 * 
 * Creates a new blog post with AI-generated content
 * Enhanced with Uptrade service callouts and comprehensive SEO
 * 
 * Uses ContentSkill from Signal for AI generation
 * Block definitions are in utils/content-blocks.js
 */

import { createSupabaseAdmin } from './utils/supabase.js'
import { ContentSkill } from './skills/content-skill.js'
import { 
  UPTRADE_SERVICES, 
  getTenantWritingStyle
} from './utils/content-blocks.js'

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
    
    // Get tenant-specific config
    const tenantConfig = getTenantWritingStyle(org)
    
    console.log('[Blog AI Worker] Generating content for:', formData.topic, '| Tenant:', org?.name || 'Uptrade Media')

    // Initialize ContentSkill
    const contentSkill = new ContentSkill(supabase, job.org_id)
    
    // Update progress
    await supabase
      .from('blog_generation_jobs')
      .update({ progress: { stage: 2, message: 'Generating with AI...' } })
      .eq('id', jobId)

    // Generate blog using ContentSkill
    const aiContent = await contentSkill.generateBlog(formData.topic, {
      category: formData.category,
      keywords: formData.keywords,
      targetLength: formData.wordCount || '1200-1500',
      includeStats: formData.includeStats,
      includeExamples: formData.includeExamples,
      tone: formData.tone,
      targetAudience: formData.targetAudience,
      keyPoints: formData.keyPoints,
      includeFAQ: formData.includeFAQ
    })

    console.log('[Blog AI Worker] ContentSkill generation complete')

    // Update progress
    await supabase
      .from('blog_generation_jobs')
      .update({ progress: { stage: 3, message: 'Saving to database...' } })
      .eq('id', jobId)

    // Generate slug with uniqueness check
    let baseSlug = (aiContent.title || formData.topic)
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

    // Process service callouts - replace markers with actual service data (Uptrade only)
    let processedContent = aiContent.content || ''
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
        const headingSlug = heading.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
        return `<h2 id="${headingSlug}">`
      })
      .replace(/<h3 id="(.*?)">/g, (match, heading) => {
        const headingSlug = heading.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
        return `<h3 id="${headingSlug}">`
      })

    // Build FAQ items from AI content
    const faqItems = aiContent.faq || aiContent.faqItems || []
    
    // Build table of contents from content headers
    const tableOfContents = []
    const headerRegex = /^(#{2,3})\s+(.+)$/gm
    let headerMatch
    while ((headerMatch = headerRegex.exec(aiContent.content || '')) !== null) {
      const level = headerMatch[1].length
      const heading = headerMatch[2]
      const headingSlug = heading.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
      tableOfContents.push({ heading, slug: headingSlug, level })
    }

    // Build enhanced schema with FAQ if present
    let schemaMarkup = {}
    if (faqItems && faqItems.length > 0) {
      schemaMarkup = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Article',
            headline: aiContent.title,
            description: aiContent.excerpt,
            author: {
              '@type': 'Organization',
              name: tenantConfig.isGWA ? "God's Workout Apparel" : 'Uptrade Media'
            },
            publisher: {
              '@type': 'Organization',
              name: tenantConfig.isGWA ? "God's Workout Apparel" : 'Uptrade Media',
              logo: {
                '@type': 'ImageObject',
                url: tenantConfig.isGWA 
                  ? 'https://godsworkoutapparel.com/logo.png'
                  : 'https://uptrademedia.com/logo.png'
              }
            }
          },
          {
            '@type': 'FAQPage',
            mainEntity: faqItems.map(faq => ({
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

    // Calculate reading time
    const wordCount = (aiContent.content || '').split(/\s+/).length
    const readingTime = Math.ceil(wordCount / 200) || 5

    // Save to database
    const { data: blogPost, error: insertError } = await supabase
      .from('blog_posts')
      .insert({
        org_id: job.org_id,
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
        reading_time: readingTime,
        meta_title: aiContent.metaTitle || aiContent.title,
        meta_description: aiContent.metaDescription || aiContent.excerpt,
        focus_keyphrase: aiContent.focusKeyphrase || null,
        schema_markup: JSON.stringify(schemaMarkup),
        table_of_contents: tableOfContents.length > 0 ? tableOfContents : null,
        faq_items: faqItems.length > 0 ? faqItems : null,
        service_callouts: tenantConfig.isGWA ? null : (serviceCalloutsData.length > 0 ? serviceCalloutsData : null),
        target_audience: aiContent.targetAudience || formData.targetAudience || null,
        status: formData.publishImmediately ? 'published' : 'draft',
        published_at: formData.publishImmediately ? new Date() : null
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Blog AI Worker] Insert error:', insertError)
      throw insertError
    }

    console.log('[Blog AI Worker] ✅ Blog post created successfully!')
    console.log('[Blog AI Worker] - ID:', blogPost.id)
    console.log('[Blog AI Worker] - Title:', blogPost.title)
    console.log('[Blog AI Worker] - Slug:', blogPost.slug)
    console.log('[Blog AI Worker] - Status:', blogPost.status)
    console.log('[Blog AI Worker] - Org ID:', blogPost.org_id)

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
        wordCount,
        readingTime,
        keywordsCount: aiContent.keywords?.length || 0,
        faqCount: faqItems.length,
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
