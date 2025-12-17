// netlify/functions/seo-sites-get-org.js
// Get the SEO site for an organization (1:1 relationship)
// Each org has at most one SEO site tracking their domain
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    const { orgId } = event.queryStringParameters || {}
    
    // Also check header
    const headerOrgId = event.headers['x-organization-id'] || event.headers['X-Organization-Id']
    const targetOrgId = orgId || headerOrgId

    if (!targetOrgId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Organization ID is required' }) }
    }

    const supabase = createSupabaseAdmin()

    // First get the organization to verify access and get domain
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, domain, slug, features')
      .eq('id', targetOrgId)
      .single()

    if (orgError || !org) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Organization not found' }) }
    }

    // Check if SEO feature is enabled
    const features = org.features || {}
    if (!features.seo) {
      return { 
        statusCode: 403, 
        headers, 
        body: JSON.stringify({ 
          error: 'SEO module not enabled for this organization',
          org: { id: org.id, name: org.name, domain: org.domain }
        }) 
      }
    }

    // Fetch the SEO site for this org
    const { data: site, error: siteError } = await supabase
      .from('seo_sites')
      .select('*')
      .eq('org_id', targetOrgId)
      .single()

    // If no site exists yet, return org info so frontend can offer to create
    if (siteError || !site) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          site: null,
          org: { id: org.id, name: org.name, domain: org.domain },
          message: 'No SEO site configured yet. Create one to start tracking.'
        })
      }
    }

    // Get page count
    const { count: pageCount } = await supabase
      .from('seo_pages')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', site.id)

    // Get open opportunities count
    const { count: oppCount } = await supabase
      .from('seo_opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', site.id)
      .eq('status', 'open')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        site: {
          ...site,
          pages_count: pageCount || 0,
          open_opportunities: oppCount || 0
        },
        org: { id: org.id, name: org.name, domain: org.domain }
      })
    }
  } catch (err) {
    console.error('[seo-sites-get-org] Error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
