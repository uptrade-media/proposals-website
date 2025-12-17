// netlify/functions/seo-schema-generate.js
// Schema Markup Generator - Generate and validate structured data
// Creates optimal JSON-LD schema for different page types
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import OpenAI from 'openai'

// Use env variable for model - easily update when new models release
const SEO_AI_MODEL = process.env.SEO_AI_MODEL || 'gpt-5.2'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  // GET - Fetch schema status for pages
  if (event.httpMethod === 'GET') {
    return await getSchemaStatus(event, headers)
  }

  // POST - Generate schema for a page
  if (event.httpMethod === 'POST') {
    return await generateSchema(event, headers)
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
}

// Get schema status for site pages
async function getSchemaStatus(event, headers) {
  const { user, error: authError } = await getAuthenticatedUser(event)
  if (authError || !user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const { siteId } = event.queryStringParameters || {}

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Get pages with schema info
    const { data: pages, error } = await supabase
      .from('seo_pages')
      .select('id, url, title, page_type, has_schema, schema_types, clicks_28d')
      .eq('site_id', siteId)
      .order('clicks_28d', { ascending: false, nullsFirst: false })
      .limit(100)

    if (error) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
    }

    // Analyze schema coverage
    const withSchema = pages.filter(p => p.has_schema)
    const withoutSchema = pages.filter(p => !p.has_schema)

    // Group by schema types
    const schemaTypeCounts = {}
    withSchema.forEach(p => {
      (p.schema_types || []).forEach(type => {
        schemaTypeCounts[type] = (schemaTypeCounts[type] || 0) + 1
      })
    })

    // Identify high-priority pages missing schema
    const priorityMissing = withoutSchema
      .filter(p => p.clicks_28d > 0)
      .sort((a, b) => (b.clicks_28d || 0) - (a.clicks_28d || 0))
      .slice(0, 10)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        totalPages: pages.length,
        pagesWithSchema: withSchema.length,
        pagesWithoutSchema: withoutSchema.length,
        coveragePercent: Math.round((withSchema.length / pages.length) * 100),
        schemaTypeCounts,
        priorityMissing,
        byPageType: {
          homepage: pages.filter(p => p.page_type === 'homepage').length,
          service: pages.filter(p => p.page_type === 'service').length,
          blog: pages.filter(p => p.page_type === 'blog' || p.page_type === 'article').length,
          location: pages.filter(p => p.page_type === 'location').length,
          other: pages.filter(p => !['homepage', 'service', 'blog', 'article', 'location'].includes(p.page_type)).length
        }
      })
    }

  } catch (error) {
    console.error('[Schema Generate] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}

// Generate schema markup for a page
async function generateSchema(event, headers) {
  const { user, error: authError } = await getAuthenticatedUser(event)
  if (authError || !user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { 
      siteId, 
      pageId, 
      pageUrl, 
      pageType = 'auto', // 'auto', 'article', 'service', 'local_business', 'faq', 'product', 'organization'
      additionalData = {}
    } = body

    if (!siteId || (!pageId && !pageUrl)) {
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ error: 'siteId and either pageId or pageUrl required' }) 
      }
    }

    const supabase = createSupabaseAdmin()
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // Get page data
    let page
    if (pageId) {
      const { data } = await supabase
        .from('seo_pages')
        .select('*')
        .eq('id', pageId)
        .single()
      page = data
    } else if (pageUrl) {
      const { data } = await supabase
        .from('seo_pages')
        .select('*')
        .eq('site_id', siteId)
        .eq('url', pageUrl)
        .single()
      page = data
    }

    if (!page) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Page not found' }) }
    }

    // Get site knowledge
    const { data: knowledge } = await supabase
      .from('seo_knowledge_base')
      .select('*')
      .eq('site_id', siteId)
      .single()

    // Get site info
    const { data: site } = await supabase
      .from('seo_sites')
      .select('*, org:organizations(name, domain)')
      .eq('id', siteId)
      .single()

    // Build context for AI
    const context = {
      page: {
        url: page.url,
        title: page.title,
        h1: page.h1,
        metaDescription: page.meta_description,
        pageType: page.page_type || pageType,
        wordCount: page.word_count
      },
      business: knowledge ? {
        name: knowledge.business_name,
        type: knowledge.business_type,
        industry: knowledge.industry,
        isLocal: knowledge.is_local_business,
        location: knowledge.primary_location,
        services: knowledge.primary_services,
        serviceAreas: knowledge.service_areas
      } : null,
      organization: {
        name: site?.org?.name || knowledge?.business_name,
        domain: site?.org?.domain || site?.domain
      },
      additionalData
    }

    // Determine schema type if auto
    let schemaType = pageType
    if (schemaType === 'auto') {
      const urlLower = page.url.toLowerCase()
      if (urlLower.includes('/blog/') || urlLower.includes('/article/') || urlLower.includes('/post/')) {
        schemaType = 'article'
      } else if (urlLower.includes('/service') || urlLower.includes('/what-we-do')) {
        schemaType = 'service'
      } else if (urlLower.includes('/location') || urlLower.includes('/service-area') || urlLower.includes('/near-')) {
        schemaType = 'local_business'
      } else if (urlLower.includes('/faq') || urlLower.includes('/frequently-asked')) {
        schemaType = 'faq'
      } else if (urlLower.includes('/product')) {
        schemaType = 'product'
      } else if (urlLower === `https://${context.organization.domain}/` || urlLower.endsWith('/about')) {
        schemaType = 'organization'
      }
    }

    // Generate schema with AI
    const prompt = `Generate optimal JSON-LD schema markup for this page.

PAGE DETAILS:
URL: ${context.page.url}
Title: ${context.page.title}
H1: ${context.page.h1}
Description: ${context.page.metaDescription}
Page Type: ${schemaType}
Word Count: ${context.page.wordCount || 'Unknown'}

BUSINESS CONTEXT:
${context.business ? JSON.stringify(context.business, null, 2) : 'Not available'}

ORGANIZATION:
Name: ${context.organization.name}
Domain: ${context.organization.domain}

${Object.keys(additionalData).length > 0 ? `ADDITIONAL DATA:\n${JSON.stringify(additionalData, null, 2)}` : ''}

Generate complete, valid JSON-LD schema that:
1. Uses the most appropriate schema.org types
2. Includes all relevant properties
3. Is optimized for rich results
4. Follows Google's structured data guidelines

Return as JSON:
{
  "primarySchema": {
    // The main schema object (Article, LocalBusiness, Service, etc.)
  },
  "additionalSchemas": [
    // Any additional schemas that would benefit the page (BreadcrumbList, Organization, etc.)
  ],
  "richResultEligibility": ["Article", "FAQ", "LocalBusiness"],
  "recommendations": [
    "Any additional data that would enhance the schema"
  ]
}`

    const completion = await openai.chat.completions.create({
      model: SEO_AI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert in schema.org structured data and Google rich results. Generate valid, comprehensive JSON-LD schema that maximizes chances for rich results in search.'
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    })

    const result = JSON.parse(completion.choices[0].message.content)

    // Format as ready-to-use JSON-LD
    const jsonLd = {
      '@context': 'https://schema.org',
      ...result.primarySchema
    }

    // Create recommendation if page doesn't have schema
    if (!page.has_schema) {
      await supabase
        .from('seo_ai_recommendations')
        .insert({
          site_id: siteId,
          page_id: page.id,
          category: 'schema',
          priority: 'medium',
          title: `Add ${result.primarySchema?.['@type'] || schemaType} schema to page`,
          description: `Adding structured data can enable rich results in search and improve CTR`,
          suggested_value: JSON.stringify(jsonLd, null, 2),
          auto_fixable: false,
          one_click_fixable: true,
          ai_model: SEO_AI_MODEL,
          status: 'pending',
          created_at: new Date().toISOString()
        })
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        schemaType: result.primarySchema?.['@type'] || schemaType,
        jsonLd,
        additionalSchemas: result.additionalSchemas || [],
        richResultEligibility: result.richResultEligibility || [],
        recommendations: result.recommendations || [],
        // Ready to copy/paste
        htmlSnippet: `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`
      })
    }

  } catch (error) {
    console.error('[Schema Generate] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}
