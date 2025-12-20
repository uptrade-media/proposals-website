// netlify/functions/auth-mark-setup-complete.js
// Marks account setup as complete for Supabase magic link users
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Get authenticated user from Supabase session
    const { user: supabaseUser, contact, error: authError } = await getAuthenticatedUser(event)

    if (authError || !contact) {
      console.error('[auth-mark-setup-complete] No authenticated session')
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Not authenticated' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Mark account as setup complete
    const { error: updateError } = await supabase
      .from('contacts')
      .update({
        account_setup: 'true',
        updated_at: new Date().toISOString()
      })
      .eq('id', contact.id)

    if (updateError) {
      console.error('[auth-mark-setup-complete] Failed to update contact:', updateError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to complete setup' })
      }
    }

    console.log('[auth-mark-setup-complete] Account setup completed for:', contact.email)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Account setup completed'
      })
    }
  } catch (error) {
    console.error('[auth-mark-setup-complete] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
