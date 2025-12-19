// netlify/functions/auth-complete-setup.js
// Completes account setup after user creates their Supabase auth account
import jwt from 'jsonwebtoken'
import { createSupabaseAdmin } from './utils/supabase.js'

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
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { token, method, googleId } = JSON.parse(event.body || '{}')

    if (!token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Token is required' })
      }
    }

    // Verify the JWT token
    let decoded
    try {
      decoded = jwt.verify(token, process.env.AUTH_JWT_SECRET)
    } catch (jwtError) {
      console.error('[auth-complete-setup] JWT verification failed:', jwtError.message)
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired setup token' })
      }
    }

    if (decoded.type !== 'account_setup') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid token type' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Find the contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, email, name, account_setup')
      .eq('email', decoded.email)
      .single()

    if (contactError || !contact) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Account not found' })
      }
    }

    // Update the contact to mark as setup complete
    const updateData = {
      account_setup: 'true',
      updated_at: new Date().toISOString()
    }

    // If Google auth was used, store the Google ID
    if (method === 'google' && googleId) {
      updateData.google_id = googleId
    }

    const { error: updateError } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', contact.id)

    if (updateError) {
      console.error('[auth-complete-setup] Failed to update contact:', updateError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to complete setup' })
      }
    }

    console.log('[auth-complete-setup] Account setup completed for:', contact.email, 'method:', method)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Account setup completed',
        email: contact.email
      })
    }

  } catch (error) {
    console.error('[auth-complete-setup] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server error completing setup' })
    }
  }
}
