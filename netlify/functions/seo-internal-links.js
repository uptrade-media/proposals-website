// netlify/functions/seo-internal-links.js
// Internal Linking Analysis - Optimize site architecture and link equity flow
// Identifies orphan pages, hub opportunities, and strategic linking gaps
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

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

  // GET - Fetch internal link analysis
  if (event.httpMethod === 'GET') {
    return await getInternalLinkAnalysis(event, headers)
  }

  // POST - Run internal link analysis
  if (event.httpMethod === 'POST') {
    return await analyzeInternalLinks(event, headers)
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
}

// Get internal link analysis
async function getInternalLinkAnalysis(event, headers) {
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

    // Get pages with link data
    const { data: pages, error } = await supabase
      .from('seo_pages')
      .select('id, url, title, internal_links_in, internal_links_out, clicks_28d, impressions_28d')
      .eq('site_id', siteId)
      .order('clicks_28d', { ascending: false, nullsFirst: false })

    if (error) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
    }

    // Identify orphan pages (no internal links pointing to them)
    const orphanPages = pages.filter(p => 
      (p.internal_links_in || 0) === 0 && 
      !p.url.includes('sitemap') &&
      !p.url.includes('privacy') &&
      !p.url.includes('terms')
    )

    // Identify hub pages (high number of outgoing links)
    const hubPages = pages.filter(p => (p.internal_links_out || 0) >= 10)
      .sort((a, b) => (b.internal_links_out || 0) - (a.internal_links_out || 0))

    // Identify high-value pages that need more internal links
    const underlinkedHighValue = pages.filter(p => 
      p.clicks_28d > 10 && 
      (p.internal_links_in || 0) < 3
    )

    // Calculate link distribution stats
    const totalInternalLinks = pages.reduce((sum, p) => sum + (p.internal_links_out || 0), 0)
    const avgLinksPerPage = pages.length > 0 ? totalInternalLinks / pages.length : 0

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        totalPages: pages.length,
        totalInternalLinks,
        avgLinksPerPage: Math.round(avgLinksPerPage * 10) / 10,
        orphanPages: orphanPages.slice(0, 20),
        hubPages: hubPages.slice(0, 10),
        underlinkedHighValue,
        summary: {
          orphanCount: orphanPages.length,
          hubCount: hubPages.length,
          underlinkedCount: underlinkedHighValue.length,
          healthScore: Math.max(0, 100 - (orphanPages.length * 5) - (underlinkedHighValue.length * 3))
        }
      })
    }

  } catch (error) {
    console.error('[Internal Links] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}

// Analyze internal links and generate recommendations
// This is now a thin wrapper - the heavy lifting is done in background function
async function analyzeInternalLinks(event, headers) {
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { siteId, crawlLinks = false } = body

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Get pages to compute current link count for immediate response
    const { data: pages } = await supabase
      .from('seo_pages')
      .select('internal_links_out')
      .eq('site_id', siteId)

    // Get site to get org_id
    const { data: site, error: siteError } = await supabase
      .from('seo_sites')
      .select('org_id')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Site not found' }) }
    }

    // Compute total from current database values
    const totalInternalLinks = pages?.reduce((sum, p) => sum + (p.internal_links_out || 0), 0) || 0

    // Create background job for tracking
    const { data: job, error: jobError } = await supabase
      .from('seo_background_jobs')
      .insert({
        site_id: siteId,
        job_type: 'internal_links_analyze',
        status: 'pending'
      })
      .select()
      .single()

    if (jobError || !job) {
      console.error('[Internal Links] Failed to create job:', JSON.stringify({
        error: jobError?.message,
        details: jobError?.details,
        hint: jobError?.hint,
        code: jobError?.code,
        site_id: siteId
      }))
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to queue job' }) }
    }

    // Trigger the background function asynchronously
    fetch(`${process.env.URL}/.netlify/functions/seo-internal-links-background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteId,
        jobId: job.id,
        crawlLinks: true  // Always crawl in background for setup wizard
      })
    }).catch(err => console.error('[Internal Links] Failed to trigger background job:', err))

    return {
      statusCode: 202,
      headers,
      body: JSON.stringify({
        success: true,
        jobId: job.id,
        totalLinks: totalInternalLinks,
        message: 'Internal link analysis queued - running in background'
      })
    }

  } catch (error) {
    console.error('[Internal Links] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}
