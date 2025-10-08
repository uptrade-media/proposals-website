// /netlify/functions/mbfm-login.js
import crypto from 'node:crypto'

const PASS   = process.env.MBFM_PASS
const SECRET = process.env.MBFM_SECRET || 'change-me-long-random'
const MAX_AGE = 60 * 60 * 8 // 8h

function json(status, body, extraHeaders = {}) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body),
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' }
  }
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' })

  const { email, password } = JSON.parse(event.body || '{}')
  const emailOk = typeof email === 'string' && email.toLowerCase().endsWith('@mbfm.com')
  if (!emailOk || password !== PASS) return json(401, { error: 'Invalid credentials' })

  const exp = Math.floor(Date.now() / 1000) + MAX_AGE
  const payloadB64 = Buffer.from(JSON.stringify({ sub: email, exp }), 'utf8').toString('base64url')
  const sig = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url')
  const token = `${payloadB64}.${sig}`

  const cookie = [
    `mbfm_session=${encodeURIComponent(token)}`,
    `Path=/`,
    `HttpOnly`,
    `Secure`,
    `SameSite=Lax`,
    `Max-Age=${MAX_AGE}`,
  ].join('; ')

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookie },
    body: JSON.stringify({ ok: true, exp }),
  }
}
