// Dev-only login endpoint - creates admin session without Google OAuth
const jwt = require('jsonwebtoken')

const COOKIE_NAME = 'um_session'
const MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

exports.handler = async (event) => {
  // Only allow in development
  const isLocal = event.headers?.host?.includes('localhost')
  
  if (!isLocal) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Only available in development' })
    }
  }

  try {
    const AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET
    
    if (!AUTH_JWT_SECRET) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'AUTH_JWT_SECRET not configured' })
      }
    }

    // Create JWT session token for dev admin user
    const sessionToken = jwt.sign({
      userId: '9e29d44b-1c3b-4618-bf0f-2a6d527b2662',
      email: 'ramsey@uptrademedia.com',
      name: 'Ramsey',
      role: 'admin',
      type: 'google'
    }, AUTH_JWT_SECRET, { expiresIn: '7d' })

    // Set HttpOnly cookie
    const cookieOptions = [
      `${COOKIE_NAME}=${sessionToken}`,
      `Max-Age=${MAX_AGE}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax'
    ].join('; ')

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieOptions
      },
      body: JSON.stringify({
        success: true,
        message: 'Dev session created',
        redirect: '/admin'
      })
    }

  } catch (error) {
    console.error('Dev login error:', error)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to create session',
        message: error.message
      })
    }
  }
}
