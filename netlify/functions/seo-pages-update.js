// netlify/functions/seo-pages-update.js
// Update SEO page metadata (managed_title, managed_meta_description, etc.)
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
    'Access-Control-Allow-Methods': 'PUT, PATCH, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'PUT' && event.httpMethod !== 'PATCH') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const { contact, isSuperAdmin, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  // Only admins can update
  const isAdmin = contact.role === 'admin' || contact.role === 'super_admin' || isSuperAdmin
  if (!isAdmin) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin access required' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { 
      pageId,
      managed_title,
      managed_meta_description,
      managed_canonical_url,
      managed_robots_meta,
      managed_schema,
      target_keywords,
      // Allow updating multiple fields at once
      updates = {}
    } = body

    if (!pageId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'pageId is required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Build update object
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    // Add individual fields if provided
    if (managed_title !== undefined) updateData.managed_title = managed_title
    if (managed_meta_description !== undefined) updateData.managed_meta_description = managed_meta_description
    if (managed_canonical_url !== undefined) updateData.managed_canonical_url = managed_canonical_url
    if (managed_robots_meta !== undefined) updateData.managed_robots_meta = managed_robots_meta
    if (managed_schema !== undefined) updateData.managed_schema = managed_schema
    if (target_keywords !== undefined) updateData.target_keywords = target_keywords

    // Update the page
    const { data: page, error: updateError } = await supabase
      .from('seo_pages')
      .update(updateData)
      .eq('id', pageId)
      .select()
      .single()

    if (updateError) {
      console.error('[SEO Pages] Update error:', updateError)
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to update page' }) }
    }

    // Log the change for audit trail
    await supabase.from('activity_logs').insert({
      contact_id: contact.id,
      action: 'seo_page_updated',
      entity_type: 'seo_page',
      entity_id: pageId,
      metadata: {
        changes: Object.keys(updateData).filter(k => k !== 'updated_at'),
        updatedBy: contact.email
      },
      created_at: new Date().toISOString()
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        page,
        message: 'Page updated successfully'
      })
    }

  } catch (error) {
    console.error('[SEO Pages] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
