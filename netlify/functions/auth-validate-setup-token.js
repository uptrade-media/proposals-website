// netlify/functions/auth-validate-setup-token.js
// Validates a setup token from the magic link email
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

    // Verify the JWT token
    let decoded
    try {
      decoded = jwt.verify(token, process.env.AUTH_JWT_SECRET)
    } catch (jwtError) {
      console.error('[auth-validate-setup-token] JWT verification failed:', jwtError.message)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          valid: false, 
          error: jwtError.name === 'TokenExpiredError' 
            ? 'This setup link has expired. Please request a new one.'
            : 'Invalid setup link'
        })
      }
    }

    // Check if this is a setup token
    if (decoded.type !== 'account_setup') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ valid: false, error: 'Invalid token type' })
      }
    }

    // Verify the contact exists in the database
    const supabase = createSupabaseAdmin()
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, email, name, account_setup')
      .eq('email', decoded.email)
      .single()

    if (contactError || !contact) {
      console.error('[auth-validate-setup-token] Contact not found:', decoded.email)
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
    console.error('[auth-validate-setup-token] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ valid: false, error: 'Server error validating token' })
    }
  }
}
