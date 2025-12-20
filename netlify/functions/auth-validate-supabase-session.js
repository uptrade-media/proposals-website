// netlify/functions/auth-validate-supabase-session.js
// Validates a Supabase authenticated session and returns contact info
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
    // Get the current user from Supabase auth
    const supabase = createSupabaseAdmin()
    const { data: { user }, error: authError } = await supabase.auth.getSession()

    if (authError || !user?.email) {
      console.error('[auth-validate-supabase-session] No authenticated session')
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ valid: false, error: 'Not authenticated' })
      }
    }

    // Find contact in database by email
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, email, name, account_setup')
      .eq('email', user.email.toLowerCase())
      .single()

    if (contactError || !contact) {
      console.error('[auth-validate-supabase-session] Contact not found:', user.email)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ valid: false, error: 'Account not found' })
      }
    }

    // Check if already set up
    const isAlreadySetup = contact.account_setup === 'true' || contact.account_setup === true

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        valid: true,
        email: contact.email,
        name: contact.name,
        contactId: contact.id,
        isAlreadySetup
      })
    }
  } catch (error) {
    console.error('[auth-validate-supabase-session] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
