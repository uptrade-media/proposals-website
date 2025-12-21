// netlify/functions/auth-validate-setup-token.js
// Validates setup tokens - supports both JWT tokens and database hex tokens
import jwt from 'jsonwebtoken'
import { createSupabaseAdmin } from './utils/supabase.js'

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
    const { token } = JSON.parse(event.body || '{}')

    if (!token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ valid: false, error: 'Token is required' })
      }
    }

    const supabase = createSupabaseAdmin()
    let contact = null

    // First, try JWT token verification
    try {
      const decoded = jwt.verify(token, process.env.AUTH_JWT_SECRET)
      
      // Check if this is a setup token
      if (decoded.type === 'account_setup') {
        // Verify the contact exists in the database
        const { data, error } = await supabase
          .from('contacts')
          .select('id, email, name, account_setup')
          .eq('email', decoded.email)
          .single()

        if (!error && data) {
          contact = data
          console.log('[auth-validate-setup-token] JWT token valid for:', contact.email)
        }
      }
    } catch (jwtError) {
      // JWT failed - try database token lookup
      console.log('[auth-validate-setup-token] JWT failed, trying database token lookup')
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
            console.log('[auth-validate-setup-token] Database token expired for:', data.email)
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({ 
                valid: false, 
                error: 'This setup link has expired. Please request a new one.' 
              })
            }
          }
        }
        contact = data
        console.log('[auth-validate-setup-token] Database token valid for:', contact.email)
      }
    }

    // No valid token found
    if (!contact) {
      console.log('[auth-validate-setup-token] No valid token found')
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ valid: false, error: 'Invalid or expired setup link' })
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
    console.error('[auth-validate-setup-token] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ valid: false, error: 'Server error validating token' })
    }
  }
}
