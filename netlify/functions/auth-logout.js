// netlify/functions/auth-logout.js (CommonJS)

const COOKIE = process.env.SESSION_COOKIE_NAME || 'um_session'

const corsHeaders = (event) => ({
  'Access-Control-Allow-Origin': event.headers.origin || '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true'
})

function json(statusCode, body, event) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(event)
    },
    body: JSON.stringify(body)
  }
}

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders(event)
    }
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'METHOD_NOT_ALLOWED' }, event)
  }

  // Determine if we're in development
  const isDev =
    process.env.NETLIFY_LOCAL === 'true' ||
    /localhost|127\.0\.0\.1/.test(event.headers.host || '') ||
    /:8888$/.test(event.headers.host || '')

  // Clear the session cookie
  const cookie = [
    `${encodeURIComponent(COOKIE)}=`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    'Max-Age=0', // Expire immediately
    ...(isDev ? [] : ['Secure'])
  ].join('; ')

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookie,
      ...corsHeaders(event)
    },
    body: JSON.stringify({ 
      ok: true,
      message: 'Logged out successfully'
    })
  }
}
