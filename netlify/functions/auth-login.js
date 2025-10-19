// netlify/functions/auth-login.js  (CommonJS)
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

const COOKIE     = process.env.SESSION_COOKIE_NAME || 'um_session'
const JWT_SECRET = process.env.AUTH_JWT_SECRET
const MAX_AGE    = 60 * 60 * 8 // 8h

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders(event) }
  if (event.httpMethod !== 'POST')    return json(405, { error: 'METHOD_NOT_ALLOWED' }, event)

  if (!JWT_SECRET) return json(500, { error: 'SERVER_NOT_CONFIGURED' }, event)

  let body = {}
  try { body = JSON.parse(event.body || '{}') } catch {}
  const email = String(body.email || '').toLowerCase().trim()
  const password = String(body.password || '')
  const rawNext = typeof body.next === 'string' ? body.next : ''

  if (!email || !password) return json(400, { error: 'MISSING_CREDENTIALS' }, event)

  // Sanitise next: only honor meaningful paths
  const isSafeNext = rawNext.startsWith('/') && rawNext !== '/' && rawNext !== '/login'
  const next = isSafeNext ? rawNext : ''

  // 1. Try database-backed user first (admin/client accounts)
  const { neon } = require('@neondatabase/serverless')
  if (process.env.DATABASE_URL) {
    try {
      const sql = neon(process.env.DATABASE_URL)
      const users = await sql`
        SELECT id, email, name, role, password, google_id as "googleId", totp_enabled as "totpEnabled"
        FROM contacts
        WHERE email = ${email}
      `
      
      if (users.length > 0) {
        const user = users[0]
        
        // Check if user has a password set (not OAuth-only)
        if (user.password) {
          const ok = await bcrypt.compare(password, user.password)
          if (!ok) return json(401, { error: 'INVALID_PASSWORD' }, event)
          
          // Check if 2FA is enabled
          if (user.totpEnabled) {
            // Create temporary 2FA session token (2-minute expiration)
            const tempToken = jwt.sign({
              sub: user.id,
              userId: user.id,
              email: user.email,
              name: user.name,
              role: user.role || 'client',
              type: 'database',
              temp: true
            }, JWT_SECRET, { expiresIn: '2m' })
            
            const isDev =
              process.env.NETLIFY_LOCAL === 'true' ||
              /localhost|127\.0\.0\.1/.test(event.headers.host || '') ||
              /:8888$/.test(event.headers.host || '')

            const cookie = [
              `um_session_temp=${encodeURIComponent(tempToken)}`,
              'HttpOnly',
              'SameSite=Lax',
              'Path=/',
              'Max-Age=120',
              ...(isDev ? [] : ['Secure']),
            ].join('; ')
            
            return {
              statusCode: 200,
              headers: { 'Set-Cookie': cookie, ...corsHeaders(event) },
              body: JSON.stringify({ requiresMfa: true, redirect: '/auth/verify-2fa' }),
            }
          }
          
          // 2FA not enabled - create full session
          // Generate JWT token for database user
          const token = jwt.sign({
            sub: user.id,
            userId: user.id,
            email: user.email,
            name: user.name,
            role: user.role || 'client',
            type: 'database'
          }, JWT_SECRET, { expiresIn: MAX_AGE })
          
          const isDev =
            process.env.NETLIFY_LOCAL === 'true' ||
            /localhost|127\.0\.0\.1/.test(event.headers.host || '') ||
            /:8888$/.test(event.headers.host || '')

          const cookie = [
            `${encodeURIComponent(COOKIE)}=${encodeURIComponent(token)}`,
            'HttpOnly',
            'SameSite=Lax',
            'Path=/',
            `Max-Age=${MAX_AGE}`,
            ...(isDev ? [] : ['Secure']),
          ].join('; ')
          
          // Redirect based on role
          const redirect = next || (user.role === 'admin' ? '/dashboard' : '/projects')
          
          return {
            statusCode: 200,
            headers: { 'Set-Cookie': cookie, ...corsHeaders(event) },
            body: JSON.stringify({ redirect }),
          }
        } else if (user.googleId) {
          // User exists but is OAuth-only
          return json(400, { error: 'PLEASE_USE_GOOGLE_SIGNIN' }, event)
        }
      }
    } catch (dbErr) {
      console.error('[auth-login] Database error:', dbErr)
      return json(500, { error: 'DATABASE_ERROR' }, event)
    }
  }

  return json(403, { error: 'INVALID_CREDENTIALS' }, event)
}

/* helpers */
function json(statusCode, body, event) {
  return { statusCode, headers: { 'Content-Type': 'application/json', ...corsHeaders(event) }, body: JSON.stringify(body) }
}

// CORS: reflect localhost origin in dev; lock to prod
const PROD_ORIGIN = 'https://portal.uptrademedia.com'
function corsHeaders(event) {
  const reqOrigin = event.headers.origin || ''
  const isLocal =
    process.env.NETLIFY_LOCAL === 'true' ||
    /^https?:\/\/localhost(:\d+)?$/i.test(reqOrigin)
  
  // Allow Netlify preview deployments
  const isNetlifyPreview = /^https:\/\/[a-z0-9-]+--uptradeproposals\.netlify\.app$/i.test(reqOrigin)

  const origin = (isLocal || isNetlifyPreview) ? (reqOrigin || 'http://localhost:8888') : PROD_ORIGIN
  return {
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}
