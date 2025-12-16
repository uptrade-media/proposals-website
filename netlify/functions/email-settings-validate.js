// netlify/functions/email-settings-validate.js
// Validate a Resend API key

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { Resend } from 'resend'

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

  try {
    const body = JSON.parse(event.body || '{}')
    const { resend_api_key, orgId } = body

    if (!resend_api_key) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'API key is required' })
      }
    }

    // Test the API key by listing domains
    const resend = new Resend(resend_api_key)
    
    try {
      const { data: domains, error: resendError } = await resend.domains.list()
      
      if (resendError) {
        console.error('[email-settings-validate] Resend error:', resendError)
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            valid: false, 
            error: resendError.message || 'Invalid API key'
          })
        }
      }

      // API key is valid - update the database
      const supabase = createSupabaseAdmin()
      const targetOrgId = orgId || contact.org_id || '00000000-0000-0000-0000-000000000001'

      await supabase
        .from('tenant_email_settings')
        .upsert({
          org_id: targetOrgId,
          resend_api_key: resend_api_key,
          resend_api_key_valid: true,
          verified_at: new Date().toISOString(),
          is_verified: true
        }, { onConflict: 'org_id' })

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          valid: true,
          domains: domains?.data?.map(d => ({
            id: d.id,
            name: d.name,
            status: d.status
          })) || []
        })
      }

    } catch (resendError) {
      console.error('[email-settings-validate] API call failed:', resendError)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          valid: false, 
          error: 'Failed to validate API key'
        })
      }
    }

  } catch (error) {
    console.error('[email-settings-validate] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
