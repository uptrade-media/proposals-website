// .netlify/functions/auth-google.js
const { OAuth2Client } = require('google-auth-library')
const { SignJWT } = require('jose')

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

const COOKIE_NAME = 'um_session'
const MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  }

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { credential } = JSON.parse(event.body || '{}')

    if (!credential) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing Google credential' })
      }
    }

    // Verify the Google ID token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    })

    const payload = ticket.getPayload()
    const { email, name, picture, sub: googleId, email_verified } = payload

    if (!email_verified) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email not verified with Google' })
      }
    }

    // Connect to database and create/update user
    const { neon } = require('@neondatabase/serverless')
    const sql = neon(process.env.DATABASE_URL)
    
    // Check if user exists
    const existingUsers = await sql`
      SELECT id, email, name, role 
      FROM contacts 
      WHERE email = ${email}
    `
    
    let userId
    let userRole = 'client'
    
    if (existingUsers.length > 0) {
      // Update existing user
      const updated = await sql`
        UPDATE contacts 
        SET 
          name = ${name},
          google_id = ${googleId},
          avatar = ${picture},
          last_login = NOW()
        WHERE email = ${email}
        RETURNING id, role
      `
      userId = updated[0].id
      userRole = updated[0].role || 'client'
    } else {
      // Create new user
      const newUser = await sql`
        INSERT INTO contacts (email, name, google_id, avatar, account_setup, role, last_login, created_at)
        VALUES (${email}, ${name}, ${googleId}, ${picture}, 'true', 'client', NOW(), NOW())
        RETURNING id, role
      `
      userId = newUser[0].id
      userRole = newUser[0].role || 'client'
    }

    // Create JWT session token
    const secret = new TextEncoder().encode(process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET || 'fallback-secret-key')
    const sessionToken = await new SignJWT({
      userId,
      email,
      name,
      picture,
      googleId,
      role: userRole,
      type: 'google'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret)

    // Set HttpOnly cookie
    const isProd = process.env.CONTEXT === 'production' || process.env.URL?.includes('netlify.app')
    const cookieOptions = [
      `${COOKIE_NAME}=${sessionToken}`,
      `Max-Age=${MAX_AGE}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      isProd ? 'Secure' : ''
    ].filter(Boolean).join('; ')

    // Determine redirect based on role
    const redirect = userRole === 'admin' ? '/admin' : '/dashboard'

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Set-Cookie': cookieOptions
      },
      body: JSON.stringify({
        success: true,
        user: {
          email,
          name,
          picture,
          role: userRole
        },
        redirect
      })
    }

  } catch (error) {
    console.error('Google OAuth error:', error)
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        error: 'Invalid Google authentication',
        details: error.message
      })
    }
  }
}
