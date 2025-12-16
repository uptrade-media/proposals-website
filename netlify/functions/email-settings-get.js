// netlify/functions/email-settings-get.js
// Get tenant email settings

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
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
    // Get org_id from query or use default (Uptrade Media for now)
    const orgId = event.queryStringParameters?.orgId || contact.org_id || '00000000-0000-0000-0000-000000000001'

    const { data: settings, error } = await supabase
      .from('tenant_email_settings')
      .select('*')
      .eq('org_id', orgId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    // If no settings exist, return defaults
    if (!settings) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          settings: {
            org_id: orgId,
            resend_api_key: '',
            resend_api_key_valid: false,
            default_from_name: '',
            default_from_email: '',
            default_reply_to: '',
            brand_color: '#4F46E5',
            brand_secondary_color: '#10B981',
            logo_url: '',
            business_address: '',
            track_opens: true,
            track_clicks: true,
            is_verified: false
          }
        })
      }
    }

    // Mask the API key for security
    const maskedSettings = {
      ...settings,
      resend_api_key: settings.resend_api_key 
        ? `re_...${settings.resend_api_key.slice(-4)}` 
        : ''
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ settings: maskedSettings })
    }

  } catch (error) {
    console.error('[email-settings-get] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
