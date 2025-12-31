// netlify/functions/seo-sites-create.js
// Create a new SEO site to track
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    // Only admins can create sites
    if (contact.role !== 'admin' && contact.role !== 'super_admin') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin access required' }) }
    }

    // Get org_id from header or request body
    const orgIdFromHeader = event.headers['x-organization-id'] || event.headers['X-Organization-Id']
    const { domain, siteName, sitemapUrl, contactId, org_id: orgIdFromBody, project_id: projectId } = JSON.parse(event.body || '{}')
    const orgId = orgIdFromBody || orgIdFromHeader

    if (!domain) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Domain is required' }) }
    }

    // Normalize domain (remove protocol, trailing slash)
    const normalizedDomain = domain
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .toLowerCase()

    const supabase = createSupabaseAdmin()

    // Check if domain already exists for this org
    const { data: existing } = await supabase
      .from('seo_sites')
      .select('id')
      .eq('domain', normalizedDomain)
      .eq('org_id', orgId)
      .single()

    if (existing) {
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'Domain already exists' }) }
    }

    // If contactId provided, verify it exists
    if (contactId) {
      const { data: targetContact, error: contactError } = await supabase
        .from('contacts')
        .select('id')
        .eq('id', contactId)
        .single()

      if (contactError || !targetContact) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Contact not found' }) }
      }
    }

    // Create the site
    const { data: site, error: createError } = await supabase
      .from('seo_sites')
      .insert({
        domain: normalizedDomain,
        site_name: siteName || normalizedDomain,
        sitemap_url: sitemapUrl || `https://${normalizedDomain}/sitemap.xml`,
        contact_id: contactId || null,
        org_id: orgId || null,
        project_id: projectId || null,
        auto_sync_enabled: true,
        sync_frequency_hours: 24
      })
      .select()
      .single()

    if (createError) {
      console.error('[seo-sites-create] Error:', createError)
      return { statusCode: 500, headers, body: JSON.stringify({ error: createError.message }) }
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        site: {
          id: site.id,
          domain: site.domain,
          site_name: site.site_name,
          sitemap_url: site.sitemap_url,
          contact_id: site.contact_id,
          org_id: site.org_id,
          created_at: site.created_at
        },
        message: 'Site created successfully. Run a sitemap crawl to import pages.'
      })
    }
  } catch (err) {
    console.error('[seo-sites-create] Error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
