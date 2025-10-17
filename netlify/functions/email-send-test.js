import { Resend } from 'resend'
import { neon } from '@neondatabase/serverless'
import jwt from 'jsonwebtoken'

const resend = new Resend(process.env.RESEND_API_KEY)
const sql = neon(process.env.DATABASE_URL)

export async function handler(event) {
  try {
    // Verify auth
    const token = event.headers.cookie?.match(/um_session=([^;]+)/)?.[1]
    if (!token) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    const user = jwt.verify(token, process.env.AUTH_JWT_SECRET)
    if (user.role !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Admin only' }) }
    }

    const body = JSON.parse(event.body || '{}')
    const { contactId, mailboxId, subject, html } = body

    if (!contactId || !subject || !html) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      }
    }

    // Get contact
    const [contact] = await sql`
      SELECT email, name FROM contacts WHERE id = ${contactId}
    `

    if (!contact) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Contact not found' })
      }
    }

    // Send test email
    const fromEmail = process.env.SENDING_DOMAIN 
      ? `portal@${process.env.SENDING_DOMAIN}`
      : 'portal@uptrademedia.com'

    const response = await resend.emails.send({
      from: fromEmail,
      to: contact.email,
      subject: `[TEST] ${subject}`,
      html: `<p><strong>[This is a test email]</strong></p>${html}`,
    })

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        messageId: response.data?.id,
        email: contact.email
      }),
      headers: { 'Content-Type': 'application/json' }
    }
  } catch (err) {
    console.error('Send test error:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Failed to send test' })
    }
  }
}
