// netlify/functions/seo-sites-update.js
// Update an SEO site
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'PUT') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    // Only admins can update sites
    if (contact.role !== 'admin' && contact.role !== 'super_admin') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin access required' }) }
    }

    const { 
      siteId,
      site_name,
      sitemap_url,
      gsc_property_url,
      auto_sync_enabled,
      sync_frequency_hours,
      priority_pages,
      setup_completed,
      setup_completed_at,
      seo_health_score,
      last_ai_analysis_at
    } = JSON.parse(event.body || '{}')

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId is required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Verify site exists
    const { data: existing, error: fetchError } = await supabase
      .from('seo_sites')
      .select('id, org_id')
      .eq('id', siteId)
      .single()

    if (fetchError || !existing) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Site not found' }) }
    }

    // Build update object (only include fields that were provided)
    const updateData = {
      updated_at: new Date().toISOString()
    }

    if (site_name !== undefined) updateData.site_name = site_name
    if (sitemap_url !== undefined) updateData.sitemap_url = sitemap_url
    if (gsc_property_url !== undefined) updateData.gsc_property_url = gsc_property_url
    if (auto_sync_enabled !== undefined) updateData.auto_sync_enabled = auto_sync_enabled
    if (sync_frequency_hours !== undefined) updateData.sync_frequency_hours = sync_frequency_hours
    if (priority_pages !== undefined) updateData.priority_pages = priority_pages
    if (setup_completed !== undefined) updateData.setup_completed = setup_completed
    if (setup_completed_at !== undefined) updateData.setup_completed_at = setup_completed_at
    if (seo_health_score !== undefined) updateData.seo_health_score = seo_health_score
    if (last_ai_analysis_at !== undefined) updateData.last_ai_analysis_at = last_ai_analysis_at

    // Update the site
    const { data: site, error: updateError } = await supabase
      .from('seo_sites')
      .update(updateData)
      .eq('id', siteId)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return { statusCode: 500, headers, body: JSON.stringify({ error: updateError.message }) }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ site })
    }

  } catch (error) {
    console.error('SEO sites update error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
