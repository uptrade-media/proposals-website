// netlify/functions/auth-magic-validate.js
// Validates database-stored magic link tokens (7-day expiry)
// If valid and account is set up, creates a session cookie
import jwt from 'jsonwebtoken'
import { createSupabaseAdmin } from './utils/supabase.js'

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

export async function handler(event) {
  // Get origin for CORS - cookies require specific origin, not '*'
  const origin = event.headers.origin || event.headers.Origin || 'https://portal.uptrademedia.com'
  const allowedOrigins = [
    'https://portal.uptrademedia.com',
    'http://localhost:8888',
    'http://localhost:5173'
  ]
  const corsOrigin = allowedOrigins.includes(origin) ? origin : 'https://portal.uptrademedia.com'
  
  const headers = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
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

    // Find contact with this magic link token
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, email, name, role, avatar, account_setup, magic_link_token, magic_link_expires')
      .eq('magic_link_token', token)
      .single()

    if (contactError || !contact) {
      console.log('[auth-magic-validate] Token not found:', token.substring(0, 16) + '...')
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ valid: false, error: 'Invalid or expired link' })
      }
    }

    // Check if token has expired
    if (contact.magic_link_expires) {
      const expiresAt = new Date(contact.magic_link_expires)
      if (expiresAt < new Date()) {
        console.log('[auth-magic-validate] Token expired for:', contact.email)
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ valid: false, error: 'This link has expired. Please request a new one.' })
        }
      }
    }

    console.log('[auth-magic-validate] Token valid for:', contact.email)

    // Determine if we should create a session
    const accountSetUp = contact.account_setup === 'true' || contact.account_setup === true
    
    // Build response headers
    const responseHeaders = { ...headers }
    
    // If account is set up, create a session cookie
    let sessionToken = null
    if (accountSetUp) {
      sessionToken = jwt.sign(
        { 
          contactId: contact.id, 
          email: contact.email, 
          role: contact.role 
        },
        process.env.AUTH_JWT_SECRET,
        { expiresIn: '7d' }
      )
      responseHeaders['Set-Cookie'] = `um_session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${COOKIE_MAX_AGE}`
      console.log('[auth-magic-validate] Session created for:', contact.email)
    }

    // Return the contact info (without sensitive fields)
    return {
      statusCode: 200,
      headers: responseHeaders,
      body: JSON.stringify({
        valid: true,
        sessionCreated: accountSetUp,
        contact: {
          id: contact.id,
          email: contact.email,
          name: contact.name,
          role: contact.role,
          avatar: contact.avatar,
          account_setup: contact.account_setup
        }
      })
    }

  } catch (error) {
    console.error('[auth-magic-validate] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ valid: false, error: 'Server error validating token' })
    }
  }
}
