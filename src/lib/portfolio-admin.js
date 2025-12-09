/**
 * Portfolio Admin Utilities
 * 
 * This module provides functions for creating portfolio items using:
 * 1. OpenAI for content generation
 * 2. Puppeteer/Playwright for trifolio screenshot capture
 * 3. Supabase for image storage and database
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import puppeteer from 'puppeteer'
import sharp from 'sharp'

// Initialize clients (will use environment variables)
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/**
 * System prompt for OpenAI content generation
 */
const SYSTEM_PROMPT = `You are an expert copywriter for Uptrade Media, a digital marketing agency specializing in web design, SEO, and media production. Your task is to generate compelling portfolio content that showcases successful client projects.

Style Guidelines:
- Professional yet conversational tone
- Focus on tangible results and benefits
- Use active voice and strong action verbs
- Keep paragraphs concise (2-3 sentences max)
- Emphasize ROI and business impact
- Include specific metrics when available

Content Structure:
- Start with a strong project overview
- Highlight the challenge or opportunity
- Explain the strategic approach
- Showcase key services and implementations
- Emphasize measurable results
- Include technical innovations when relevant`

/**
 * Generate AI-powered portfolio content from form data
 * 
 * @param {Object} formData - Form input from the admin portal
 * @returns {Promise<Object>} Generated content with subtitle, description, strategic_approach, etc.
 */
export async function generatePortfolioContent(formData) {
  const prompt = `
Generate a comprehensive portfolio case study for the following project:

**Company:** ${formData.companyName}
**Industry:** ${formData.industry}
**Location:** ${formData.location}
**Website:** ${formData.websiteUrl}
**Services:** ${formData.servicesProvided.join(', ')}
**Goals:** ${formData.projectGoals}
**Challenges:** ${formData.challengesSolved}
**Target Audience:** ${formData.targetAudience}
${formData.trafficIncrease ? `**Traffic Increase:** ${formData.trafficIncrease}%` : ''}
${formData.rankingImprovements ? `**Ranking Improvements:** ${formData.rankingImprovements}` : ''}
${formData.conversionIncrease ? `**Conversion Increase:** ${formData.conversionIncrease}%` : ''}
${formData.engagementIncrease ? `**Engagement Increase:** ${formData.engagementIncrease}%` : ''}
${formData.uniqueFeatures ? `**Unique Features:** ${formData.uniqueFeatures}` : ''}
${formData.clientTestimonial ? `**Client Testimonial:** "${formData.clientTestimonial}"` : ''}

Generate the following sections in JSON format:

1. **subtitle**: A catchy 5-8 word tagline (e.g., "Modern Restaurant Website & Local SEO Success")

2. **description**: A compelling 2-3 sentence overview (150-200 characters) suitable for meta descriptions and previews

3. **content**: A detailed markdown case study with these sections:
   - ## Project Overview (2-3 paragraphs)
   - ## Services Provided (bulleted list)
   - ## Key Features & Improvements (bulleted list with details)
   - ## Results (bulleted list with specific metrics if available)
   - ## Technical Notes (optional, if relevant)
   
   ${formData.clientTestimonial ? 'Include a blockquote testimonial.' : ''}

4. **strategic_approach**: Array of 3-4 phases with:
   - phase: "Phase 1", "Phase 2", etc.
   - title: Short phase name
   - description: 1-2 sentences
   - icon: Suggested Lucide icon name (Search, Palette, Code, Rocket, BarChart, etc.)

5. **services_showcase**: Array of 2-4 services with:
   - service: Service name
   - description: 1 sentence about implementation
   - highlights: Array of 3-4 bullet points

6. **comprehensive_results**: Array of 3-5 metrics with:
   - metric: Metric name (e.g., "Organic Traffic")
   - value: Change with symbol (e.g., "+150%", "1st Position")
   - description: 1 sentence explaining the metric

7. **technical_innovations**: Array of 2-4 technologies with:
   - technology: Technology name
   - implementation: How it was used (1 sentence)
   - benefit: Why it matters (1 sentence)

8. **seo**: Object with:
   - title: SEO-optimized page title (60 chars max)
   - description: Meta description (150-160 chars)
   - keywords: Array of 5-8 relevant keywords

Return ONLY valid JSON. Do not include markdown code fences or explanations.
`

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' }
  })

  return JSON.parse(response.choices[0].message.content)
}

/**
 * Capture a screenshot of the DeviceTrifolio component
 * 
 * IMPORTANT: The portfolio item must exist in the database before calling this,
 * because the trifolio route reads from the database to get the live_url.
 * 
 * @param {string} slug - Portfolio item slug
 * @param {string} baseUrl - Base URL of the main website (default: localhost:3000)
 * @returns {Promise<Object>} Screenshot buffer, filename, and dimensions
 */
export async function captureTrifolioScreenshot(slug, baseUrl = 'http://localhost:3000') {
  let browser = null
  
  try {
    console.log('[Portfolio] Launching browser for screenshot...')
    
    // Launch headless browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    })

    const page = await browser.newPage()
    
    // Set viewport to desktop size with extra height for full device visibility
    await page.setViewport({
      width: 1920,
      height: 1400,
      deviceScaleFactor: 2 // For retina quality
    })

    // Navigate to the trifolio page on the main site
    const url = `${baseUrl}/portfolio/${slug}/trifolio`
    console.log(`[Portfolio] Capturing trifolio at ${url}...`)
    
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 60000
    })

    // Wait for the DeviceTrifolio component's iframes to load
    await page.waitForSelector('iframe', { timeout: 30000 })
    
    // Wait for animations and iframes to fully load (important!)
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Get the bounds of the DeviceTrifolio container
    const trifolioBounds = await page.evaluate(() => {
      // The DeviceTrifolio component should be in a container
      const container = document.querySelector('.max-w-6xl')
      if (!container) return null
      
      const rect = container.getBoundingClientRect()
      return {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      }
    })

    if (!trifolioBounds) {
      throw new Error('Could not find DeviceTrifolio container')
    }

    console.log(`[Portfolio] Capturing ${Math.round(trifolioBounds.width)}x${Math.round(trifolioBounds.height)}`)

    // Take screenshot as buffer (PNG for quality)
    const screenshotBuffer = await page.screenshot({
      type: 'png',
      clip: {
        x: trifolioBounds.x,
        y: trifolioBounds.y,
        width: trifolioBounds.width,
        height: trifolioBounds.height
      }
    })

    await browser.close()

    // Convert PNG to JPEG with Sharp for smaller file size
    const optimizedBuffer = await sharp(screenshotBuffer)
      .jpeg({ quality: 90, progressive: true })
      .toBuffer()

    return {
      buffer: optimizedBuffer,
      filename: `${slug}.jpg`,
      contentType: 'image/jpeg',
      width: Math.round(trifolioBounds.width),
      height: Math.round(trifolioBounds.height)
    }

  } catch (error) {
    if (browser) await browser.close()
    throw new Error(`Screenshot capture failed: ${error.message}`)
  }
}

/**
 * Upload portfolio image to Supabase Storage
 * 
 * @param {Buffer} buffer - Image buffer
 * @param {string} filename - Filename (e.g., "project-slug.jpg")
 * @param {string} folder - Storage folder (default: "design")
 * @returns {Promise<Object>} Upload result with path and public URL
 */
export async function uploadPortfolioImage(buffer, filename, folder = 'design') {
  try {
    const filePath = `${folder}/${filename}`
    
    console.log(`[Portfolio] Uploading to Supabase: ${filePath}`)
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('portfolio-images')
      .upload(filePath, buffer, {
        contentType: 'image/jpeg',
        upsert: true, // Overwrite if exists
        cacheControl: '31536000' // Cache for 1 year
      })

    if (error) throw error

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('portfolio-images')
      .getPublicUrl(filePath)

    console.log(`[Portfolio] Upload successful: ${publicUrl}`)

    return {
      path: filePath,
      publicUrl: publicUrl,
      width: 1200,
      height: 800
    }

  } catch (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }
}

/**
 * Main function to create a portfolio item
 * 
 * WORKFLOW ORDER (CRITICAL):
 * 1. Generate AI content
 * 2. Insert portfolio item with temporary hero_image
 * 3. Wait for database to commit
 * 4. Capture trifolio screenshot (requires item to exist in DB)
 * 5. Upload screenshot to storage
 * 6. Update portfolio item with final hero_image URL
 * 
 * @param {Object} formData - Form input from admin portal
 * @returns {Promise<Object>} Result with success status and data
 */
export async function createPortfolioItem(formData) {
  try {
    console.log('[Portfolio] 🚀 Starting portfolio creation...')
    
    // 1. Generate slug from company name
    const slug = formData.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    
    console.log(`[Portfolio] 📝 Generated slug: ${slug}`)

    // Check for duplicate slug
    const { data: existing } = await supabase
      .from('portfolio_items')
      .select('slug')
      .eq('slug', slug)
      .single()

    if (existing) {
      throw new Error(`Portfolio item with slug "${slug}" already exists`)
    }

    // 2. Generate AI content
    console.log('[Portfolio] 🤖 Generating AI content...')
    const aiContent = await generatePortfolioContent(formData)
    
    // 3. Prepare database record with TEMPORARY hero_image
    const portfolioRecord = {
      slug: slug,
      title: formData.companyName,
      subtitle: aiContent.subtitle,
      category: formData.industry,
      services: formData.servicesProvided,
      description: aiContent.description,
      
      // TEMPORARY placeholder - will be replaced after screenshot
      hero_image: '/portfolio-previews/placeholder.jpg',
      hero_image_alt: `${formData.companyName} website showcase`,
      hero_image_width: null,
      hero_image_height: null,
      
      // Website URL (REQUIRED for trifolio screenshot)
      live_url: formData.websiteUrl,
      
      // KPIs from form data
      kpis: {
        ...(formData.trafficIncrease && { traffic: formData.trafficIncrease }),
        ...(formData.rankingImprovements && { rankings: formData.rankingImprovements }),
        ...(formData.engagementIncrease && { engagement: formData.engagementIncrease }),
        ...(formData.conversionIncrease && { conversions: formData.conversionIncrease })
      },
      
      // AI-generated content
      strategic_approach: aiContent.strategic_approach,
      services_showcase: aiContent.services_showcase,
      comprehensive_results: aiContent.comprehensive_results,
      technical_innovations: aiContent.technical_innovations,
      
      // Additional details
      details: {
        industry: formData.industry,
        location: formData.location,
        website: formData.websiteUrl,
        ...(formData.projectTimeline && { timeline: formData.projectTimeline }),
        ...(formData.teamSize && { team_size: formData.teamSize })
      },
      
      // SEO data
      seo: aiContent.seo,
      
      // Content
      content: aiContent.content,
      content_html: null,
      
      // Status - start as draft
      status: 'draft',
      featured: false,
      order: 0,
      published_at: null
    }
    
    // 4. Insert into database with temporary image
    console.log('[Portfolio] 💾 Inserting into database (with temporary image)...')
    const { data: insertedItem, error: insertError } = await supabase
      .from('portfolio_items')
      .insert(portfolioRecord)
      .select()
      .single()
    
    if (insertError) {
      console.error('[Portfolio] Database error:', insertError)
      throw insertError
    }
    
    console.log(`[Portfolio] ✅ Portfolio item created with ID: ${insertedItem.id}`)
    
    // 5. NOW capture the trifolio screenshot (item exists in DB now)
    console.log('[Portfolio] 📸 Capturing trifolio screenshot...')
    console.log('[Portfolio]    Waiting 2 seconds for database replication...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const screenshot = await captureTrifolioScreenshot(
      slug,
      process.env.VITE_MAIN_SITE_URL || 'https://uptrademedia.com'
    )
    
    // 6. Upload screenshot to Supabase Storage
    console.log('[Portfolio] ☁️  Uploading screenshot to Supabase...')
    const imageData = await uploadPortfolioImage(
      screenshot.buffer,
      screenshot.filename,
      'design' // or determine based on formData.servicesProvided
    )
    
    // 7. Update the portfolio item with the final hero_image
    console.log('[Portfolio] 🔄 Updating portfolio with screenshot URL...')
    const { data: updatedItem, error: updateError } = await supabase
      .from('portfolio_items')
      .update({
        hero_image: imageData.publicUrl,
        hero_image_width: screenshot.width || imageData.width,
        hero_image_height: screenshot.height || imageData.height
      })
      .eq('id', insertedItem.id)
      .select()
      .single()
    
    if (updateError) {
      console.error('[Portfolio] Update error:', updateError)
      // Don't throw - item was created successfully, just log the error
      console.warn('[Portfolio] ⚠️  Screenshot uploaded but failed to update database')
    }
    
    console.log('[Portfolio] ✅ Portfolio item created successfully!')
    
    return {
      success: true,
      data: updatedItem || insertedItem,
      message: `Portfolio item "${formData.companyName}" created successfully`,
      previewUrl: `https://uptrademedia.com/portfolio/${slug}/`,
      trifolioUrl: `https://uptrademedia.com/portfolio/${slug}/trifolio/`,
      screenshotUrl: imageData.publicUrl
    }
    
  } catch (error) {
    console.error('[Portfolio] ❌ Portfolio creation failed:', error)
    
    return {
      success: false,
      error: error.message,
      message: 'Failed to create portfolio item'
    }
  }
}

/**
 * Helper function to publish a draft portfolio item
 */
export async function publishPortfolioItem(portfolioId) {
  const { data, error } = await supabase
    .from('portfolio_items')
    .update({ 
      status: 'published',
      published_at: new Date().toISOString()
    })
    .eq('id', portfolioId)
    .select()
    .single()
    
  if (error) throw error
  return data
}

/**
 * Helper function to update portfolio order
 */
export async function updatePortfolioOrder(portfolioId, newOrder) {
  const { data, error } = await supabase
    .from('portfolio_items')
    .update({ order: newOrder })
    .eq('id', portfolioId)
    .select()
    .single()
    
  if (error) throw error
  return data
}

/**
 * Helper function to list all portfolio items
 */
export async function listPortfolioItems(status = null) {
  let query = supabase
    .from('portfolio_items')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (status) {
    query = query.eq('status', status)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  return data
}
