// netlify/functions/mbfm-forgot.js
import nodemailer from 'nodemailer'

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return okCors('')
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' })
  }

  let email = ''
  try {
    const b = JSON.parse(event.body || '{}')
    email = String(b.email || '').trim().toLowerCase()
  } catch {
    return json(400, { error: 'Invalid payload' })
  }

  if (!email) return json(400, { error: 'Email required' })

  // allow-list logic (same as login)
  const PASS = process.env.MBFM_PASS // not used here, but domain is
  const domains = (process.env.MBFM_DOMAINS || process.env.MBFM_DOMAIN || 'mbfm.com')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  const at = email.lastIndexOf('@')
  const dom = at !== -1 ? email.slice(at + 1) : ''
  const allowed = domains.includes(dom)

  // Always return a generic message, but only notify support if allowed
  if (allowed) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      })

      const from = process.env.SMTP_FROM || 'no-reply@uptrademedia.com'
      const to = process.env.SUPPORT_TO || 'ramsey@uptrademedia.com'

      await transporter.sendMail({
        from,
        to,
        subject: 'Password reset request (MBFM Portal)',
        text: `User requested password reset:\n\nEmail: ${email}\nTime: ${new Date().toISOString()}\n\nPlease follow your internal procedure to reset shared credentials or user-specific password.`,
      })
    } catch (e) {
      // Do not leak SMTP errors; we still return generic success
      console.error('forgot mail error:', e?.message || e)
    }
  }

  return okCors({ ok: true, message: 'If your account exists, we emailed instructions to reset access.' })
}

function json(code, body) {
  return { statusCode: code, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}
function okCors(body) {
  const b = typeof body === 'string' ? body : JSON.stringify(body)
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Content-Type': 'application/json',
    },
    body: b,
  }
}
