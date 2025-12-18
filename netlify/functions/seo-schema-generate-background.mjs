/**
 * SEO Schema Generate Background Function
 * 
 * Generates schema markup for multiple pages using AI.
 * Background functions can run up to 15 minutes.
 * 
 * Triggered by POST from seo-schema-generate.js
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const SEO_AI_MODEL = process.env.SEO_AI_MODEL || 'gpt-4o'

export default async function handler(req) {
  console.log('[seo-schema-generate-background] Starting...')

  try {
    const { 
      siteId, 
      pageIds, // Can generate for multiple pages
      generateForAll = false,
      jobId 
    } = await req.json()

    if (!siteId) {
      return new Response(JSON.stringify({ error: 'siteId required' }), { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // Update job status if jobId provided
    if (jobId) {
      await supabase
        .from('seo_background_jobs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', jobId)
    }

    console.log(`[seo-schema-generate-background] Generating schemas for site ${siteId}`)

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

    // Determine pages to process
    let pagesToProcess = []
    
    if (pageIds?.length > 0) {
      const { data: pages } = await supabase
        .from('seo_pages')
        .select('*')
        .in('id', pageIds)
      pagesToProcess = pages || []
    } else if (generateForAll) {
      // Get pages without schema
      const { data: pages } = await supabase
        .from('seo_pages')
        .select('*')
        .eq('site_id', siteId)
        .eq('has_schema', false)
        .order('clicks_28d', { ascending: false })
        .limit(50)
      pagesToProcess = pages || []
    }

    console.log(`[seo-schema-generate-background] Processing ${pagesToProcess.length} pages...`)

    const results = []

    for (const page of pagesToProcess) {
      // Determine schema type
      let schemaType = 'auto'
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
      } else if (urlLower.endsWith('/') && urlLower.split('/').length <= 4) {
        schemaType = 'organization'
      }

      // Generate schema with AI
      const context = {
        page: {
          url: page.url,
          title: page.title,
          h1: page.h1,
          metaDescription: page.meta_description,
          pageType: page.page_type || schemaType,
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
        }
      }

      const schemaResult = await generateSchemaWithAI(openai, context, schemaType)

      if (schemaResult.primarySchema) {
        // Create recommendation
        await supabase
          .from('seo_ai_recommendations')
          .insert({
            site_id: siteId,
            page_id: page.id,
            category: 'schema',
            priority: 'medium',
            title: `Add ${schemaResult.primarySchema?.['@type'] || schemaType} schema`,
            description: `Adding structured data can enable rich results in search`,
            suggested_value: JSON.stringify({
              '@context': 'https://schema.org',
              ...schemaResult.primarySchema
            }, null, 2),
            auto_fixable: false,
            one_click_fixable: true,
            ai_model: SEO_AI_MODEL,
            status: 'pending',
            created_at: new Date().toISOString()
          })

        results.push({
          pageId: page.id,
          url: page.url,
          schemaType: schemaResult.primarySchema?.['@type'],
          richResultEligibility: schemaResult.richResultEligibility,
          success: true
        })
      }
    }

    const result = {
      success: true,
      pagesProcessed: results.length,
      schemasGenerated: results.filter(r => r.success).length,
      byType: results.reduce((acc, r) => {
        acc[r.schemaType] = (acc[r.schemaType] || 0) + 1
        return acc
      }, {}),
      results: results.slice(0, 20) // Return first 20 for summary
    }

    console.log('[seo-schema-generate-background] Complete')

    // Update job status
    if (jobId) {
      await supabase
        .from('seo_background_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          result
        })
        .eq('id', jobId)
    }

    return new Response(JSON.stringify(result), { status: 200 })

  } catch (error) {
    console.error('[seo-schema-generate-background] Error:', error)

    try {
      const { jobId } = await req.json().catch(() => ({}))
      if (jobId) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        await supabase
          .from('seo_background_jobs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error: error.message
          })
          .eq('id', jobId)
      }
    } catch (e) {
      // Ignore
    }

    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}

async function generateSchemaWithAI(openai, context, schemaType) {
  try {
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

Generate complete, valid JSON-LD schema that:
1. Uses the most appropriate schema.org types
2. Includes all relevant properties
3. Is optimized for rich results
4. Follows Google's structured data guidelines

Return as JSON:
{
  "primarySchema": {
    // The main schema object
  },
  "additionalSchemas": [],
  "richResultEligibility": ["Article", "FAQ", "LocalBusiness"],
  "recommendations": []
}`

    const completion = await openai.chat.completions.create({
      model: SEO_AI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert in schema.org structured data and Google rich results. Generate valid, comprehensive JSON-LD schema.'
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    })

    return JSON.parse(completion.choices[0].message.content)
  } catch (error) {
    console.error('[seo-schema-generate-background] AI error:', error)
    return { primarySchema: null }
  }
}
