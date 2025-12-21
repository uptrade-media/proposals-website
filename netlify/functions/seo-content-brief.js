// netlify/functions/seo-content-brief.js
// Generate AI-powered content briefs for SEO
// Creates comprehensive briefs based on keyword analysis and site knowledge
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { google } from 'googleapis'
import { SEOSkill } from './skills/seo-skill.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  // GET - Fetch content briefs
  if (event.httpMethod === 'GET') {
    return await getContentBriefs(event, headers)
  }

  // POST - Generate new content brief
  if (event.httpMethod === 'POST') {
    return await generateContentBrief(event, headers)
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
}

// Get content briefs
async function getContentBriefs(event, headers) {
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const { siteId, status, limit = 20 } = event.queryStringParameters || {}

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
    }

    const supabase = createSupabaseAdmin()

    let query = supabase
      .from('seo_content_briefs')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))

    if (status) {
      query = query.eq('status', status)
    }

    const { data: briefs, error } = await query

    if (error) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ briefs })
    }

  } catch (error) {
    console.error('[Content Brief] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}

// Generate content brief
async function generateContentBrief(event, headers) {
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { 
      siteId, 
      targetKeyword,
      contentType = 'blog', // blog, service_page, landing_page, guide, case_study
      additionalContext = ''
    } = body

    if (!siteId || !targetKeyword) {
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ error: 'siteId and targetKeyword required' }) 
      }
    }

    const supabase = createSupabaseAdmin()

    // Fetch site details and knowledge
    const { data: site, error: siteError } = await supabase
      .from('seo_sites')
      .select('*, org_id, org:organizations(domain, name)')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Site not found' }) }
    }

    // Initialize SEOSkill for AI operations
    const seoSkill = new SEOSkill(supabase, site.org_id, siteId, { userId: contact.id })

    const { data: knowledge } = await supabase
      .from('seo_knowledge_base')
      .select('*')
      .eq('site_id', siteId)
      .single()

    // Get related keywords from GSC
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}'),
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
    })
    const searchConsole = google.searchconsole({ version: 'v1', auth })
    const domain = site.org?.domain || site.domain
    const siteUrl = `sc-domain:${domain.replace(/^(https?:\/\/)?(www\.)?/, '')}`

    const today = new Date()
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() - 3)
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - 28)

    let relatedKeywords = []
    let existingPageData = null

    try {
      // Find related keywords
      const response = await searchConsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          dimensions: ['query'],
          rowLimit: 50,
          dimensionFilterGroups: [{
            filters: [{
              dimension: 'query',
              operator: 'contains',
              expression: targetKeyword.split(' ')[0] // Search for first word
            }]
          }]
        }
      })
      relatedKeywords = (response.data.rows || []).map(r => ({
        keyword: r.keys[0],
        position: r.position,
        impressions: r.impressions
      }))

      // Check if we already rank for the target keyword
      const targetResponse = await searchConsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          dimensions: ['query', 'page'],
          dimensionFilterGroups: [{
            filters: [{
              dimension: 'query',
              operator: 'equals',
              expression: targetKeyword
            }]
          }]
        }
      })
      
      if (targetResponse.data.rows?.length > 0) {
        const row = targetResponse.data.rows[0]
        existingPageData = {
          url: row.keys[1],
          position: row.position,
          clicks: row.clicks,
          impressions: row.impressions
        }
      }
    } catch (e) {
      console.error('[Content Brief] GSC error:', e)
    }

    // Get existing pages for internal linking opportunities
    const { data: existingPages } = await supabase
      .from('seo_pages')
      .select('url, title, h1')
      .eq('site_id', siteId)
      .limit(50)

    // Generate brief with SEOSkill
    const brief = await seoSkill.generateContentBriefSync(targetKeyword, {
      contentType,
      knowledge,
      relatedKeywords,
      existingPageData,
      existingPages,
      additionalContext
    })

    if (!brief) {
      return { 
        statusCode: 500, 
        headers, 
        body: JSON.stringify({ error: 'Failed to generate brief' }) 
      }
    }

    // Store the brief
    const briefData = {
      site_id: siteId,
      target_keyword: targetKeyword,
      content_type: contentType,
      status: 'draft',
      title_tag: brief.title_tag,
      meta_description: brief.meta_description,
      h1: brief.h1,
      target_word_count: brief.target_word_count,
      search_intent: brief.search_intent,
      brief_content: brief,
      related_keywords: relatedKeywords.slice(0, 20),
      existing_page_url: existingPageData?.url || null,
      existing_position: existingPageData?.position || null,
      created_by: contact.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: savedBrief, error: saveError } = await supabase
      .from('seo_content_briefs')
      .insert(briefData)
      .select()
      .single()

    if (saveError) {
      console.error('[Content Brief] Save error:', saveError)
      // Still return the brief even if save fails
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        brief: savedBrief || briefData,
        content: brief,
        relatedKeywords: relatedKeywords.slice(0, 20),
        existingPageData
      })
    }

  } catch (error) {
    console.error('[Content Brief] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}
