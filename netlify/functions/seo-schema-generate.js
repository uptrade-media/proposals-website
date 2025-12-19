// netlify/functions/seo-schema-generate.js
// Schema Markup Generator - Generate, validate, and fix structured data
// Creates optimal JSON-LD schema for different page types
// Validates existing schema and provides fix recommendations
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import OpenAI from 'openai'

// Use env variable for model - easily update when new models release
const SEO_AI_MODEL = process.env.SEO_AI_MODEL || 'gpt-4o'

// Common schema validation rules based on Google's requirements
const SCHEMA_RULES = {
  Article: {
    required: ['headline', 'author', 'datePublished'],
    recommended: ['image', 'dateModified', 'publisher'],
    maxHeadlineLength: 110
  },
  LocalBusiness: {
    required: ['name', 'address'],
    recommended: ['telephone', 'openingHours', 'geo', 'priceRange', 'image'],
    addressRequired: ['streetAddress', 'addressLocality', 'addressRegion', 'postalCode']
  },
  Product: {
    required: ['name'],
    recommended: ['image', 'description', 'offers', 'review', 'aggregateRating'],
    offersRequired: ['price', 'priceCurrency', 'availability']
  },
  FAQPage: {
    required: ['mainEntity'],
    mainEntityRequired: ['name', 'acceptedAnswer']
  },
  Organization: {
    required: ['name'],
    recommended: ['logo', 'url', 'sameAs', 'contactPoint']
  },
  BreadcrumbList: {
    required: ['itemListElement'],
    itemRequired: ['position', 'name', 'item']
  },
  Service: {
    required: ['name'],
    recommended: ['description', 'provider', 'areaServed', 'serviceType']
  }
}

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
    const { action } = event.queryStringParameters || {}
    
    if (action === 'validate') {
      return await validateSchema(event, headers)
    }
    
    return await getSchemaStatus(event, headers)
  }

  // POST - Generate or fix schema for a page
  if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body || '{}')
    
    if (body.action === 'validate') {
      return await validateSchema(event, headers)
    }
    
    if (body.action === 'fix') {
      return await fixSchema(event, headers)
    }
    
    if (body.action === 'bulk-validate') {
      return await bulkValidateSchema(event, headers)
    }
    
    return await generateSchema(event, headers)
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
}

// Validate schema markup and return errors/warnings
function validateSchemaObject(schema, schemaType) {
  const errors = []
  const warnings = []
  const fixes = []
  
  const rules = SCHEMA_RULES[schemaType]
  if (!rules) {
    warnings.push(`No validation rules defined for ${schemaType}`)
    return { errors, warnings, fixes }
  }
  
  // Check required fields
  for (const field of rules.required || []) {
    if (!schema[field]) {
      errors.push({
        type: 'missing_required',
        field,
        message: `Missing required field: ${field}`,
        severity: 'error'
      })
      fixes.push({
        field,
        action: 'add',
        suggestion: `Add ${field} property to your ${schemaType} schema`
      })
    }
  }
  
  // Check recommended fields
  for (const field of rules.recommended || []) {
    if (!schema[field]) {
      warnings.push({
        type: 'missing_recommended',
        field,
        message: `Missing recommended field: ${field}`,
        severity: 'warning'
      })
    }
  }
  
  // Type-specific validations
  if (schemaType === 'Article') {
    if (schema.headline && schema.headline.length > rules.maxHeadlineLength) {
      errors.push({
        type: 'value_too_long',
        field: 'headline',
        message: `Headline exceeds ${rules.maxHeadlineLength} characters (${schema.headline.length} chars)`,
        severity: 'error'
      })
      fixes.push({
        field: 'headline',
        action: 'truncate',
        suggestion: `Shorten headline to ${rules.maxHeadlineLength} characters or less`
      })
    }
    
    // Check author format
    if (schema.author && typeof schema.author === 'string') {
      warnings.push({
        type: 'invalid_format',
        field: 'author',
        message: 'Author should be an object with @type and name properties',
        severity: 'warning'
      })
      fixes.push({
        field: 'author',
        action: 'convert',
        suggestion: 'Convert author to: { "@type": "Person", "name": "..." }'
      })
    }
  }
  
  if (schemaType === 'LocalBusiness') {
    // Check address format
    if (schema.address) {
      if (typeof schema.address === 'string') {
        errors.push({
          type: 'invalid_format',
          field: 'address',
          message: 'Address should be a PostalAddress object, not a string',
          severity: 'error'
        })
        fixes.push({
          field: 'address',
          action: 'convert',
          suggestion: 'Convert to PostalAddress with streetAddress, addressLocality, etc.'
        })
      } else {
        for (const addrField of rules.addressRequired || []) {
          if (!schema.address[addrField]) {
            warnings.push({
              type: 'missing_address_field',
              field: `address.${addrField}`,
              message: `Address missing ${addrField}`,
              severity: 'warning'
            })
          }
        }
      }
    }
  }
  
  if (schemaType === 'Product' && schema.offers) {
    const offers = Array.isArray(schema.offers) ? schema.offers : [schema.offers]
    for (const offer of offers) {
      for (const offerField of rules.offersRequired || []) {
        if (!offer[offerField]) {
          errors.push({
            type: 'missing_offer_field',
            field: `offers.${offerField}`,
            message: `Offer missing required field: ${offerField}`,
            severity: 'error'
          })
        }
      }
    }
  }
  
  if (schemaType === 'FAQPage' && schema.mainEntity) {
    const items = Array.isArray(schema.mainEntity) ? schema.mainEntity : [schema.mainEntity]
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item.name && !item['@type']?.includes('Question')) {
        errors.push({
          type: 'invalid_faq_item',
          field: `mainEntity[${i}]`,
          message: 'FAQ items must have name (question) and acceptedAnswer',
          severity: 'error'
        })
      }
    }
  }
  
  return { errors, warnings, fixes }
}

// Validate existing schema on a page
async function validateSchema(event, headers) {
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const params = event.queryStringParameters || {}
    const body = event.httpMethod === 'POST' ? JSON.parse(event.body || '{}') : {}
    const { siteId, pageId, pageUrl, schemaJson } = { ...params, ...body }

    if (!siteId && !schemaJson) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId or schemaJson required' }) }
    }

    const supabase = createSupabaseAdmin()
    
    // If schemaJson is provided directly, validate it
    if (schemaJson) {
      let schema
      try {
        schema = typeof schemaJson === 'string' ? JSON.parse(schemaJson) : schemaJson
      } catch (e) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            valid: false,
            errors: [{ type: 'parse_error', message: 'Invalid JSON: ' + e.message }],
            warnings: [],
            fixes: []
          })
        }
      }
      
      const schemaType = schema['@type']
      const validation = validateSchemaObject(schema, schemaType)
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          valid: validation.errors.length === 0,
          schemaType,
          ...validation
        })
      }
    }

    // Get page with existing schema
    let page
    if (pageId) {
      const { data } = await supabase
        .from('seo_pages')
        .select('id, url, title, schema_json, schema_types, has_schema')
        .eq('id', pageId)
        .single()
      page = data
    } else if (pageUrl) {
      const { data } = await supabase
        .from('seo_pages')
        .select('id, url, title, schema_json, schema_types, has_schema')
        .eq('site_id', siteId)
        .eq('url', pageUrl)
        .single()
      page = data
    }

    if (!page) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Page not found' }) }
    }

    if (!page.has_schema || !page.schema_json) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          valid: false,
          hasSchema: false,
          errors: [{ type: 'no_schema', message: 'Page has no schema markup' }],
          warnings: [],
          fixes: [{ action: 'generate', suggestion: 'Generate schema markup for this page' }]
        })
      }
    }

    // Parse and validate the schema
    let schemas
    try {
      schemas = typeof page.schema_json === 'string' ? JSON.parse(page.schema_json) : page.schema_json
    } catch (e) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          valid: false,
          errors: [{ type: 'parse_error', message: 'Invalid JSON in stored schema' }],
          warnings: [],
          fixes: [{ action: 'regenerate', suggestion: 'Regenerate schema markup' }]
        })
      }
    }

    // Handle both single schema and array of schemas
    const schemaArray = Array.isArray(schemas) ? schemas : [schemas]
    const allErrors = []
    const allWarnings = []
    const allFixes = []
    const validatedTypes = []

    for (const schema of schemaArray) {
      const schemaType = schema['@type']
      validatedTypes.push(schemaType)
      const validation = validateSchemaObject(schema, schemaType)
      allErrors.push(...validation.errors.map(e => ({ ...e, schemaType })))
      allWarnings.push(...validation.warnings.map(w => ({ ...w, schemaType })))
      allFixes.push(...validation.fixes.map(f => ({ ...f, schemaType })))
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        valid: allErrors.length === 0,
        hasSchema: true,
        schemaTypes: validatedTypes,
        errors: allErrors,
        warnings: allWarnings,
        fixes: allFixes,
        page: { id: page.id, url: page.url, title: page.title }
      })
    }

  } catch (error) {
    console.error('[Schema Validate] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}

// Bulk validate all schemas for a site
async function bulkValidateSchema(event, headers) {
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const { siteId } = JSON.parse(event.body || '{}')

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Get all pages with schema
    const { data: pages, error } = await supabase
      .from('seo_pages')
      .select('id, url, title, schema_json, schema_types, clicks_28d')
      .eq('site_id', siteId)
      .eq('has_schema', true)
      .not('schema_json', 'is', null)
      .order('clicks_28d', { ascending: false, nullsFirst: false })
      .limit(100)

    if (error) throw error

    const results = {
      totalPages: pages?.length || 0,
      validPages: 0,
      invalidPages: 0,
      pagesWithWarnings: 0,
      errors: [],
      pages: []
    }

    for (const page of pages || []) {
      let schemas
      try {
        schemas = typeof page.schema_json === 'string' ? JSON.parse(page.schema_json) : page.schema_json
      } catch (e) {
        results.invalidPages++
        results.errors.push({
          pageId: page.id,
          url: page.url,
          type: 'parse_error',
          message: 'Invalid JSON'
        })
        continue
      }

      const schemaArray = Array.isArray(schemas) ? schemas : [schemas]
      let pageErrors = []
      let pageWarnings = []

      for (const schema of schemaArray) {
        const validation = validateSchemaObject(schema, schema['@type'])
        pageErrors.push(...validation.errors)
        pageWarnings.push(...validation.warnings)
      }

      if (pageErrors.length > 0) {
        results.invalidPages++
        results.errors.push(...pageErrors.map(e => ({ 
          pageId: page.id, 
          url: page.url, 
          ...e 
        })))
      } else {
        results.validPages++
      }

      if (pageWarnings.length > 0) {
        results.pagesWithWarnings++
      }

      results.pages.push({
        id: page.id,
        url: page.url,
        title: page.title,
        schemaTypes: page.schema_types,
        valid: pageErrors.length === 0,
        errorCount: pageErrors.length,
        warningCount: pageWarnings.length,
        clicks: page.clicks_28d
      })
    }

    // Sort pages by error count (most errors first)
    results.pages.sort((a, b) => b.errorCount - a.errorCount)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results)
    }

  } catch (error) {
    console.error('[Schema Bulk Validate] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}

// Fix schema issues using AI
async function fixSchema(event, headers) {
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const { siteId, pageId, pageUrl, schemaJson, errors: providedErrors } = JSON.parse(event.body || '{}')

    if (!siteId || (!pageId && !pageUrl && !schemaJson)) {
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ error: 'siteId and pageId/pageUrl/schemaJson required' }) 
      }
    }

    const supabase = createSupabaseAdmin()
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    let page, existingSchema
    
    if (schemaJson) {
      existingSchema = typeof schemaJson === 'string' ? JSON.parse(schemaJson) : schemaJson
    } else {
      // Get page with existing schema
      if (pageId) {
        const { data } = await supabase.from('seo_pages').select('*').eq('id', pageId).single()
        page = data
      } else if (pageUrl) {
        const { data } = await supabase.from('seo_pages').select('*').eq('site_id', siteId).eq('url', pageUrl).single()
        page = data
      }

      if (!page) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Page not found' }) }
      }

      if (!page.schema_json) {
        // No schema to fix, generate new one
        return await generateSchema(event, headers)
      }

      existingSchema = typeof page.schema_json === 'string' ? JSON.parse(page.schema_json) : page.schema_json
    }

    // Validate to get errors
    const schemaArray = Array.isArray(existingSchema) ? existingSchema : [existingSchema]
    let allErrors = providedErrors || []
    
    if (allErrors.length === 0) {
      for (const schema of schemaArray) {
        const validation = validateSchemaObject(schema, schema['@type'])
        allErrors.push(...validation.errors)
      }
    }

    if (allErrors.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'No errors to fix',
          schema: existingSchema
        })
      }
    }

    // Get business context
    const { data: knowledge } = await supabase
      .from('seo_knowledge_base')
      .select('*')
      .eq('site_id', siteId)
      .single()

    // Use AI to fix the schema
    const prompt = `Fix the following JSON-LD schema markup based on these validation errors:

CURRENT SCHEMA:
${JSON.stringify(existingSchema, null, 2)}

VALIDATION ERRORS:
${JSON.stringify(allErrors, null, 2)}

${page ? `PAGE CONTEXT:
URL: ${page.url}
Title: ${page.title}
H1: ${page.h1}
Description: ${page.meta_description}` : ''}

${knowledge ? `BUSINESS CONTEXT:
Name: ${knowledge.business_name}
Type: ${knowledge.business_type}
Location: ${knowledge.primary_location || 'Not specified'}` : ''}

Fix all the errors while:
1. Preserving existing valid data
2. Adding missing required fields with appropriate values
3. Correcting format issues
4. Following Google's structured data guidelines

Return the fixed schema as valid JSON in this format:
{
  "fixedSchema": { ... the complete fixed schema ... },
  "changesMade": ["description of each fix"]
}`

    const completion = await openai.chat.completions.create({
      model: SEO_AI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert in schema.org structured data. Fix schema validation errors while preserving valid data and following Google guidelines.'
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    })

    const result = JSON.parse(completion.choices[0].message.content)

    // Optionally update the page with the fixed schema
    if (page && result.fixedSchema) {
      await supabase
        .from('seo_pages')
        .update({
          schema_json: result.fixedSchema,
          schema_validated_at: new Date().toISOString()
        })
        .eq('id', page.id)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        originalErrors: allErrors.length,
        fixedSchema: result.fixedSchema,
        changesMade: result.changesMade || [],
        htmlSnippet: `<script type="application/ld+json">\n${JSON.stringify(result.fixedSchema, null, 2)}\n</script>`
      })
    }

  } catch (error) {
    console.error('[Schema Fix] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}

// Get schema status for site pages
async function getSchemaStatus(event, headers) {
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
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
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
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
