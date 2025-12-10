import { Resend } from 'resend'
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  try {
    // Verify auth using Supabase
    const { user, contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    if (contact.role !== 'admin') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin only' }) }
    }

    const body = JSON.parse(event.body || '{}')
    const { contactId, mailboxId, subject, html } = body

    if (!contactId || !subject || !html) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Get contact
    const { data: targetContact, error: contactError } = await supabase
      .from('contacts')
      .select('email, name')
      .eq('id', contactId)
      .single()

    if (contactError || !targetContact) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Contact not found' })
      }
    }

    // Send test email
    const fromEmail = process.env.SENDING_DOMAIN 
      ? `portal@${process.env.SENDING_DOMAIN}`
      : 'portal@send.uptrademedia.com'

    const response = await resend.emails.send({
      from: fromEmail,
      to: targetContact.email,
      subject: `[TEST] ${subject}`,
      html: `<p><strong>[This is a test email]</strong></p>${html}`,
    })

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        messageId: response.data?.id,
        email: targetContact.email
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
