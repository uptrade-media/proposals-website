// netlify/edge-functions/login-auth.js
// Deno/Edge runtime. Verifies HS256 JWT in cookie `um_session` and enforces
// that /p/:slug is in the token's `slugs`. If not, always send to /login.

const COOKIE_NAME = Deno.env.get('SESSION_COOKIE_NAME') || 'um_session'
const JWT_SECRET  = Deno.env.get('AUTH_JWT_SECRET') || 'change-me'

// Public routes that never need auth
const allowExact = new Set([
  '/', '/login', '/favicon.ico', '/site.webmanifest', '/robots.txt'
])
const allowPrefixes = [
  '/assets/', '/public/', '/__vite/', '/.well-known/',
  '/.netlify/functions/auth-login', '/.netlify/functions/auth-verify',
  '/.netlify/functions/contact-support'
]

export default async (request, context) => {
  const url = new URL(request.url)
  const { pathname, search } = url

  // allow public
  if (allowExact.has(pathname) || allowPrefixes.some(p => pathname.startsWith(p))) {
    return context.next()
  }

  // Only protect proposal pages
  if (!pathname.startsWith('/p/')) {
    return context.next()
  }

  // infer slug for branded login redirect
  const m = pathname.match(/^\/p\/([^\/?#]+)/)
  const slug = (m?.[1] ?? '').toLowerCase()

  // read JWT cookie
  const cookie = request.headers.get('cookie') || ''
  const token  = readCookie(cookie, COOKIE_NAME)
  if (!token) return redirectToLogin(url, slug)

  const verified = await verifyJwtHS256(token, JWT_SECRET)
  if (!verified.ok) return redirectToLogin(url, slug)

  const { payload } = verified

  // exp check
  if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) {
    return redirectToLogin(url, slug)
  }

  // per-slug authorization
  const slugs = Array.isArray(payload.slugs) ? payload.slugs.map(s => String(s).toLowerCase()) : []
  if (slug && !slugs.includes(slug)) {
    // Authenticated but not authorized -> force login for the target brand
    return redirectToLogin(url, slug)
  }

  return context.next()
}

/* helpers */

function redirectToLogin(url, brand) {
  const next   = encodeURIComponent(url.pathname + url.search)
  const prefix = brand ? `/?brand=${encodeURIComponent(brand)}&next=${next}` : `/?next=${next}`
  return Response.redirect(new URL(prefix, url), 302)
}

function readCookie(header, name) {
  const re = new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]+)`)
  const m = header.match(re)
  return m ? decodeURIComponent(m[1]) : null
}

async function verifyJwtHS256(token, secret) {
  try {
    const [h64, p64, s64] = token.split('.')
    if (!h64 || !p64 || !s64) return { ok: false }

    const header  = JSON.parse(decodeB64Url(h64))
    if (header.alg !== 'HS256' || header.typ !== 'JWT') return { ok: false }

    const payload = JSON.parse(decodeB64Url(p64))
    const data    = new TextEncoder().encode(`${h64}.${p64}`)

    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    )
    const sigBytes = b64urlToBytes(s64)
    const ok = await crypto.subtle.verify('HMAC', key, sigBytes, data)
    return ok ? { ok: true, payload } : { ok: false }
  } catch {
    return { ok: false }
  }
}

function decodeB64Url(s) {
  const bytes = b64urlToBytes(s)
  return new TextDecoder().decode(bytes)
}

function b64urlToBytes(b64url) {
  const b64 = b64url.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(b64url.length / 4) * 4, '=')
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
