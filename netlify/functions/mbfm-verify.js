import crypto from 'node:crypto'
const SECRET = process.env.MBFM_SECRET || 'change-me-long-random'
const json = (s, b) => ({ statusCode: s, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })

export async function handler(event) {
  const cookies = event.headers.cookie || ''
  const m = cookies.match(/(?:^|;\s*)mbfm_session=([^;]+)/)
  if (!m) return json(401, { error: 'No session' })
  const token = decodeURIComponent(m[1])
  const [payloadB64, sig] = token.split('.')
  if (!payloadB64 || !sig) return json(401, { error: 'Bad token' })
  const expect = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url')
  if (sig !== expect) return json(401, { error: 'Bad signature' })
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
  if (payload.exp < Math.floor(Date.now() / 1000)) return json(401, { error: 'Expired' })
  return json(200, { ok: true, sub: payload.sub, exp: payload.exp })
}
