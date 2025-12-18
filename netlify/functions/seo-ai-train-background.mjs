// netlify/functions/seo-ai-train-background.mjs
// Background function for AI site training - runs up to 15 minutes
// Train AI on site content - crawl entire site, extract business knowledge
import OpenAI from 'openai'
import * as cheerio from 'cheerio'
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export const config = {
  type: 'background'
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Use env variable for model - easily update when new models release
const SEO_AI_MODEL = process.env.SEO_AI_MODEL || 'gpt-4o'

export async function handler(event) {
  // Background functions don't return responses to the client
  // They run asynchronously and update status in the database
  
  try {
    const body = JSON.parse(event.body || '{}')
    const { siteId, userId, forceRefresh = false } = body

    if (!siteId) {
      console.error('[AI Train BG] No siteId provided')
      return
    }

    const supabase = createSupabaseAdmin()

    // Update training status to 'in_progress'
    await supabase
      .from('seo_knowledge_base')
      .upsert({
        site_id: siteId,
        training_status: 'in_progress',
        updated_at: new Date().toISOString()
      }, { onConflict: 'site_id' })

    // Get site info
    const { data: site, error: siteError } = await supabase
      .from('seo_sites')
      .select('*, org:organizations(name, domain)')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      console.error('[AI Train BG] Site not found:', siteError)
      await updateTrainingStatus(supabase, siteId, 'failed', 'Site not found')
      return
    }

    const domain = site.org?.domain || site.domain
    if (!domain) {
      await updateTrainingStatus(supabase, siteId, 'failed', 'No domain configured')
      return
    }

    console.log(`[AI Train BG] Starting training for ${domain}`)

    // Step 1: Fetch sitemap
    let urls = []
    try {
      const sitemapUrl = `https://${domain}/sitemap.xml`
      const response = await fetch(sitemapUrl)
      const xml = await response.text()
      const $ = cheerio.load(xml, { xmlMode: true })
      
      $('url loc').each((_, el) => {
        urls.push($(el).text())
      })
      
      // Also check sitemap index
      $('sitemap loc').each(async (_, el) => {
        const indexUrl = $(el).text()
        try {
          const indexRes = await fetch(indexUrl)
          const indexXml = await indexRes.text()
          const $index = cheerio.load(indexXml, { xmlMode: true })
          $index('url loc').each((_, urlEl) => {
            urls.push($index(urlEl).text())
          })
        } catch (e) {
          console.log(`[AI Train BG] Could not fetch sitemap index: ${indexUrl}`)
        }
      })
    } catch (e) {
      console.log('[AI Train BG] No sitemap found, will use existing pages from DB')
    }

    // If no sitemap, get pages from DB
    if (urls.length === 0) {
      const { data: pages } = await supabase
        .from('seo_pages')
        .select('url')
        .eq('site_id', siteId)
        .limit(100)
      
      urls = pages?.map(p => p.url) || []
    }

    console.log(`[AI Train BG] Found ${urls.length} URLs to analyze`)

    // Step 2: Crawl and extract content from each page
    const pageContents = []
    const maxPages = 50 // Limit for training
    const pagesToCrawl = urls.slice(0, maxPages)

    for (const url of pagesToCrawl) {
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'UptradeBot/1.0 (SEO Training)' }
        })
        const html = await response.text()
        const $ = cheerio.load(html)

        // Remove non-content elements
        $('script, style, nav, footer, header, aside, .sidebar, #sidebar').remove()

        const pageData = {
          url,
          title: $('title').text().trim(),
          h1: $('h1').first().text().trim(),
          metaDescription: $('meta[name="description"]').attr('content') || '',
          headings: [],
          content: ''
        }

        // Extract headings
        $('h2, h3').each((_, el) => {
          pageData.headings.push({
            tag: el.tagName,
            text: $(el).text().trim()
          })
        })

        // Extract main content
        const mainContent = $('main, article, .content, #content, .main').first()
        pageData.content = (mainContent.length ? mainContent.text() : $('body').text())
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 3000)

        pageContents.push(pageData)
      } catch (e) {
        console.log(`[AI Train BG] Failed to crawl ${url}: ${e.message}`)
      }
    }

    console.log(`[AI Train BG] Crawled ${pageContents.length} pages`)

    // Step 3: Use GPT-4.5-preview to analyze and extract business knowledge
    const analysisPrompt = buildAnalysisPrompt(domain, site.org?.name, pageContents)

    const completion = await openai.chat.completions.create({
      model: SEO_AI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an expert SEO and business analyst. Analyze website content to deeply understand the business - their services, target audience, unique value proposition, service areas, and competitive positioning. Extract comprehensive knowledge that will power AI-driven SEO recommendations.`
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 4000
    })

    let knowledge
    try {
      knowledge = JSON.parse(completion.choices[0].message.content)
    } catch (e) {
      console.error('[AI Train BG] Failed to parse AI response:', e)
      await updateTrainingStatus(supabase, siteId, 'failed', 'AI response parse error')
      return
    }

    // Step 4: Save knowledge to database
    const knowledgeData = {
      site_id: siteId,
      business_name: knowledge.business_name || site.org?.name,
      business_type: knowledge.business_type,
      industry: knowledge.industry,
      industry_keywords: knowledge.industry_keywords || [],
      primary_services: knowledge.primary_services || [],
      secondary_services: knowledge.secondary_services || [],
      unique_selling_points: knowledge.unique_selling_points || [],
      differentiators: knowledge.differentiators || [],
      target_personas: knowledge.target_personas || [],
      primary_location: knowledge.primary_location,
      service_areas: knowledge.service_areas || [],
      is_local_business: knowledge.is_local_business || false,
      brand_voice_description: knowledge.brand_voice,
      tone_keywords: knowledge.tone_keywords || [],
      primary_competitors: knowledge.competitors || [],
      content_pillars: knowledge.content_pillars || [],
      content_gaps_identified: knowledge.content_gaps || [],
      site_content_summary: knowledge.site_summary,
      key_topics_extracted: knowledge.key_topics || [],
      faq_patterns: knowledge.faq_patterns || [],
      last_trained_at: new Date().toISOString(),
      training_completeness: 100,
      pages_analyzed: pageContents.length,
      training_status: 'completed',
      updated_at: new Date().toISOString()
    }

    const { error: saveError } = await supabase
      .from('seo_knowledge_base')
      .upsert(knowledgeData, { onConflict: 'site_id' })

    if (saveError) {
      console.error('[AI Train BG] Failed to save knowledge:', saveError)
      await updateTrainingStatus(supabase, siteId, 'failed', saveError.message)
      return
    }

    console.log(`[AI Train BG] Training complete for ${domain}`)

    // Optionally trigger AI brain analysis now that training is complete
    // This could be done via another background function call

  } catch (error) {
    console.error('[AI Train BG] Error:', error)
    
    // Try to update status to failed
    try {
      const supabase = createSupabaseAdmin()
      const body = JSON.parse(event.body || '{}')
      if (body.siteId) {
        await updateTrainingStatus(supabase, body.siteId, 'failed', error.message)
      }
    } catch (e) {
      console.error('[AI Train BG] Could not update failure status:', e)
    }
  }
}

async function updateTrainingStatus(supabase, siteId, status, errorMessage = null) {
  await supabase
    .from('seo_knowledge_base')
    .upsert({
      site_id: siteId,
      training_status: status,
      ...(errorMessage && { error_message: errorMessage }),
      updated_at: new Date().toISOString()
    }, { onConflict: 'site_id' })
}

function buildAnalysisPrompt(domain, orgName, pageContents) {
  const pagesInfo = pageContents.map(p => `
URL: ${p.url}
Title: ${p.title}
H1: ${p.h1}
Meta: ${p.metaDescription}
Headings: ${p.headings.map(h => `${h.tag}: ${h.text}`).join(', ')}
Content excerpt: ${p.content.substring(0, 500)}...
`).join('\n---\n')

  return `Analyze this website and extract comprehensive business knowledge for SEO optimization.

DOMAIN: ${domain}
ORGANIZATION: ${orgName || 'Unknown'}

PAGES ANALYZED:
${pagesInfo}

Extract and return JSON with:
{
  "business_name": "Official business name",
  "business_type": "local_service|ecommerce|saas|agency|professional_services|etc",
  "industry": "Primary industry",
  "industry_keywords": ["core", "industry", "terms"],
  "primary_services": [
    {"name": "Service Name", "description": "Brief description", "keywords": ["related", "keywords"]}
  ],
  "secondary_services": [{"name": "", "description": ""}],
  "unique_selling_points": ["USP 1", "USP 2"],
  "differentiators": ["What makes them different"],
  "target_personas": [
    {"name": "Persona name", "description": "Who they are", "pain_points": ["Pain 1"], "search_behavior": "How they search"}
  ],
  "is_local_business": true/false,
  "primary_location": {"city": "", "state": "", "country": ""},
  "service_areas": [{"name": "City/Region", "type": "city|county|state", "priority": "primary|secondary"}],
  "brand_voice": "Description of their brand voice and tone",
  "tone_keywords": ["professional", "friendly", etc],
  "competitors": [{"domain": "", "name": "", "why_competitor": ""}],
  "content_pillars": ["Main topic 1", "Main topic 2"],
  "content_gaps": ["Topic they should cover but don't"],
  "site_summary": "2-3 sentence summary of the entire website and business",
  "key_topics": ["topic1", "topic2"],
  "faq_patterns": ["Common question pattern 1", "Common question pattern 2"]
}`
}
