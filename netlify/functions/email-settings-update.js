// netlify/functions/email-settings-update.js
// Update tenant email settings

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const { contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  if (contact.role !== 'admin') {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin access required' }) }
  }

  const supabase = createSupabaseAdmin()

  try {
    const body = JSON.parse(event.body || '{}')
    const {
      orgId,
      resend_api_key,
      default_from_name,
      default_from_email,
      default_reply_to,
      brand_color,
      brand_secondary_color,
      logo_url,
      business_address,
      track_opens,
      track_clicks
    } = body

    const targetOrgId = orgId || contact.org_id || '00000000-0000-0000-0000-000000000001'

    // Build update object, only including changed fields
    const updateData = {
      org_id: targetOrgId,
      updated_at: new Date().toISOString()
    }

    if (default_from_name !== undefined) updateData.default_from_name = default_from_name
    if (default_from_email !== undefined) updateData.default_from_email = default_from_email
    if (default_reply_to !== undefined) updateData.default_reply_to = default_reply_to
    if (brand_color !== undefined) updateData.brand_color = brand_color
    if (brand_secondary_color !== undefined) updateData.brand_secondary_color = brand_secondary_color
    if (logo_url !== undefined) updateData.logo_url = logo_url
    if (business_address !== undefined) updateData.business_address = business_address
    if (track_opens !== undefined) updateData.track_opens = track_opens
    if (track_clicks !== undefined) updateData.track_clicks = track_clicks

    // Only update API key if it's a new one (not masked)
    if (resend_api_key && !resend_api_key.startsWith('re_...')) {
      updateData.resend_api_key = resend_api_key
      updateData.resend_api_key_valid = false // Will need re-validation
    }

    // Upsert the settings
    const { data: settings, error } = await supabase
      .from('tenant_email_settings')
      .upsert(updateData, { 
        onConflict: 'org_id',
        ignoreDuplicates: false 
      })
      .select()
      .single()

    if (error) throw error

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        settings: {
          ...settings,
          resend_api_key: settings.resend_api_key 
            ? `re_...${settings.resend_api_key.slice(-4)}` 
            : ''
        }
      })
    }

  } catch (error) {
    console.error('[email-settings-update] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
