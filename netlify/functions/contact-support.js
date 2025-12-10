// netlify/functions/contact-support.js
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return okCors('')
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' })
  }

  let email = '', message = ''
  try {
    const b = JSON.parse(event.body || '{}')
    email = String(b.email || '').trim()
    message = String(b.message || '').trim()
  } catch {
    return json(400, { error: 'Invalid payload' })
  }

  if (!message) return json(400, { error: 'Message required' })

  try {
    const from = process.env.RESEND_FROM_EMAIL || 'portal@send.uptrademedia.com'
    const to = process.env.ADMIN_EMAIL || 'ramsey@uptrademedia.com'

    await resend.emails.send({
      from,
      to,
      replyTo: email || undefined,
      subject: 'Portal Support Request',
      text: `From: ${email || '(no email provided)'}\n\n${message}\n\nTime: ${new Date().toISOString()}`
    })

    return okCors({ ok: true })
  } catch (e) {
    console.error('support mail error:', e?.message || e)
    return json(500, { error: 'Failed to send message' })
  }
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
