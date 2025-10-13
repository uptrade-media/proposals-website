// netlify/functions/auth-verify.js
import jwt from 'jsonwebtoken'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'um_session'
const JWT_SECRET  = process.env.AUTH_JWT_SECRET

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders(event) }
  if (event.httpMethod !== 'GET')     return json(405, { error: 'METHOD_NOT_ALLOWED' }, event)

  if (!JWT_SECRET) return json(500, { error: 'SERVER_NOT_CONFIGURED' }, event)

  const rawCookie = event.headers.cookie || ''
  const token = readCookie(rawCookie, COOKIE_NAME)
  if (!token) return json(401, { error: 'NO_SESSION' }, event)

  try {
    const payload = jwt.verify(token, JWT_SECRET) // throws on bad/expired token
    const email = String(payload.email || payload.sub || '')
    
    // Handle two types of auth:
    // 1. Google OAuth (has userId, role, type='google')
    // 2. Legacy proposal auth (has slugs)
    
    if (payload.type === 'google') {
      // Google OAuth user from database
      if (!email) return json(403, { error: 'NOT_AUTHORIZED' }, event)
      
      return json(200, { 
        ok: true, 
        user: { 
          userId: payload.userId,
          email,
          name: payload.name,
          picture: payload.picture,
          role: payload.role || 'client',
          type: 'google',
          exp: payload.exp 
        } 
      }, event)
    } else {
      // Legacy proposal client
      const slugs = Array.isArray(payload.slugs) ? payload.slugs : []
      
      if (!email || slugs.length === 0) return json(403, { error: 'NOT_AUTHORIZED' }, event)
      
      return json(200, { ok: true, user: { email, slugs, type: 'proposal', exp: payload.exp } }, event)
    }
  } catch (err) {
    const code = err.name === 'TokenExpiredError' ? 'EXPIRED' : 'BAD_TOKEN'
    return json(401, { error: code }, event)
  }
}

/* ----------------- helpers ----------------- */

function readCookie(header, name) {
  const re = new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}=([^;]+)`)
  const m = header.match(re)
  return m ? decodeURIComponent(m[1]) : null
}

function json(statusCode, body, event) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(event) },
    body: JSON.stringify(body),
  }
}

// Reflect localhost origin in dev; lock to prod in production
const PROD_ORIGIN = 'https://portal.uptrademedia.com'
function corsHeaders(event) {
  const reqOrigin = event.headers.origin || ''
  const isLocal =
    process.env.NETLIFY_LOCAL === 'true' ||
    /^https?:\/\/localhost(:\d+)?$/i.test(reqOrigin)

  // If no Origin header (curl/tools), use the Netlify dev proxy origin in dev
  const origin = isLocal ? (reqOrigin || 'http://localhost:8888') : PROD_ORIGIN

  return {
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  }
}
