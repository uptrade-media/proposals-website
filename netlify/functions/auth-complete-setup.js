// netlify/functions/auth-complete-setup.js
// Completes account setup after user creates their Supabase auth account
// Supports both JWT tokens and database hex tokens
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

    const supabase = createSupabaseAdmin()
    let contact = null

    // First, try JWT token verification
    try {
      const decoded = jwt.verify(token, process.env.AUTH_JWT_SECRET)
      
      if (decoded.type === 'account_setup') {
        // Find contact by email from JWT
        const { data, error } = await supabase
          .from('contacts')
          .select('id, email, name, account_setup')
          .eq('email', decoded.email)
          .single()

        if (!error && data) {
          contact = data
          console.log('[auth-complete-setup] JWT token valid for:', contact.email)
        }
      }
    } catch (jwtError) {
      // JWT failed - try database token lookup
      console.log('[auth-complete-setup] JWT failed, trying database token lookup')
    }

    // If JWT didn't work, try database hex token lookup
    if (!contact) {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, email, name, account_setup, magic_link_token, magic_link_expires')
        .eq('magic_link_token', token)
        .single()

      if (!error && data) {
        // Check if token has expired
        if (data.magic_link_expires) {
          const expiresAt = new Date(data.magic_link_expires)
          if (expiresAt < new Date()) {
            console.log('[auth-complete-setup] Database token expired for:', data.email)
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'Setup link has expired. Please request a new one.' })
            }
          }
        }
        contact = data
        console.log('[auth-complete-setup] Database token valid for:', contact.email)
      }
    }

    // No valid token found
    if (!contact) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired setup token' })
      }
    }

    // Update the contact to mark as setup complete
    const updateData = {
      account_setup: 'true',
      updated_at: new Date().toISOString(),
      // Clear the magic link token after use
      magic_link_token: null,
      magic_link_expires: null
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
