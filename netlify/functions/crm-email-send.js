// netlify/functions/crm-email-send.js
// Send tracked emails from CRM to contacts via Resend

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { Resend } from 'resend'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const PORTAL_URL = process.env.URL || 'http://localhost:8888'

// Allowed from addresses (must be verified in Resend under send.uptrademedia.com)
const ALLOWED_FROM_ADDRESSES = {
  'ramsey@send.uptrademedia.com': 'Ramsey Deal <ramsey@send.uptrademedia.com>',
  'hello@send.uptrademedia.com': 'Uptrade Media <hello@send.uptrademedia.com>',
  'portal@send.uptrademedia.com': 'Uptrade Portal <portal@send.uptrademedia.com>'
}

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Verify authentication
  const { user, contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  // Only admins can send CRM emails
  if (contact.role !== 'admin') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Only admins can send CRM emails' })
    }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { contactId, to, subject, content, fromAddress } = body

    // Validate required fields
    if (!contactId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'contactId is required' })
      }
    }

    if (!to || !subject || !content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'to, subject, and content are required' })
      }
    }

    // Validate from address
    const from = ALLOWED_FROM_ADDRESSES[fromAddress]
    if (!from) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid from address',
          allowed: Object.keys(ALLOWED_FROM_ADDRESSES)
        })
      }
    }

    const supabase = createSupabaseAdmin()

    // Verify the contact exists
    const { data: targetContact, error: contactError } = await supabase
      .from('contacts')
      .select('id, email, name, company')
      .eq('id', contactId)
      .single()

    if (contactError || !targetContact) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Contact not found' })
      }
    }

    // Initialize Resend
    if (!RESEND_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Email service not configured' })
      }
    }

    const resend = new Resend(RESEND_API_KEY)

    // Build HTML email with brand styling
    const htmlContent = buildEmailHtml({
      subject,
      content,
      recipientName: targetContact.name,
      senderName: contact.name || 'Uptrade Media'
    })

    // Send email via Resend
    const { data: emailResult, error: sendError } = await resend.emails.send({
      from,
      to,
      subject,
      html: htmlContent,
      text: content, // Plain text fallback
      reply_to: fromAddress
    })

    if (sendError) {
      console.error('[CRM Email] Resend error:', sendError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to send email', details: sendError.message })
      }
    }

    console.log('[CRM Email] Email sent:', emailResult.id)

    // Store email in email_tracking table for tracking
    const { data: savedEmail, error: saveError } = await supabase
      .from('email_tracking')
      .insert({
        contact_id: contactId,
        email_type: 'custom', // Custom CRM email
        subject,
        recipient_email: to,
        sender_id: contact.id,
        sender_email: fromAddress,
        resend_email_id: emailResult.id,
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .select()
      .single()

    if (saveError) {
      // Log but don't fail - email was still sent
      console.error('[CRM Email] Failed to save email record:', saveError)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        emailId: emailResult.id,
        savedEmail: savedEmail || null,
        message: `Email sent to ${to}`
      })
    }

  } catch (error) {
    console.error('[CRM Email] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}

/**
 * Build branded HTML email
 */
function buildEmailHtml({ subject, content, recipientName, senderName }) {
  // Convert line breaks to HTML
  const htmlBody = content
    .split('\n\n')
    .map(p => `<p style="margin: 0 0 16px 0; line-height: 1.6;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; color: #18181b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <tr>
      <td>
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #4bbf39 0%, #39bfb0 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">
            Uptrade Media
          </h1>
        </div>
        
        <!-- Body -->
        <div style="background: white; padding: 32px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          ${recipientName ? `<p style="margin: 0 0 16px 0; color: #71717a;">Hi ${recipientName},</p>` : ''}
          
          ${htmlBody}
          
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e4e4e7;">
            <p style="margin: 0; color: #71717a; font-size: 14px;">
              Best regards,<br>
              <strong style="color: #18181b;">${senderName}</strong><br>
              Uptrade Media
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; padding: 24px; color: #71717a; font-size: 12px;">
          <p style="margin: 0;">
            © ${new Date().getFullYear()} Uptrade Media. All rights reserved.
          </p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
`
}
