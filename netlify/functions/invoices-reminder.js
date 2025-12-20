// netlify/functions/invoices-reminder.js
// Send manual reminder for unpaid invoice (admin only)
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { Resend } from 'resend'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'portal@send.uptrademedia.com'
const RESEND_FROM = `Uptrade Media <${RESEND_FROM_EMAIL}>`
const PORTAL_URL = process.env.URL || 'https://portal.uptrademedia.com'

const MAX_REMINDERS = 3

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

// Calculate next reminder date based on reminder count
function calculateNextReminderDate(reminderCount) {
  // After 3 reminders, no more automated reminders
  if (reminderCount >= MAX_REMINDERS) return null
  
  // Reminder schedule: 3 days, 7 days, 14 days
  const days = reminderCount === 0 ? 3 : reminderCount === 1 ? 7 : 14
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

function generateReminderEmailHTML(invoice, contact, paymentUrl, reminderCount, daysOverdue) {
  const dueDate = invoice.due_date 
    ? new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Upon Receipt'

  const urgencyColor = daysOverdue > 14 ? '#dc2626' : daysOverdue > 7 ? '#ea580c' : '#f59e0b'
  const urgencyText = daysOverdue > 14 ? 'Urgent' : daysOverdue > 7 ? 'Past Due' : 'Reminder'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root { color-scheme: light dark; }
    .logo-mark { fill: #0f172a; }
    @media (prefers-color-scheme: dark) { .logo-mark { fill: #ffffff; } }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Urgency Banner -->
          <tr>
            <td style="background-color: ${urgencyColor}; padding: 12px; text-align: center;">
              <span style="color: #ffffff; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                ${urgencyText}: Invoice ${daysOverdue > 0 ? `${daysOverdue} Days Past Due` : 'Payment Due'}
              </span>
            </td>
          </tr>
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4bbf39 0%, #3a9c2d 100%); padding: 24px 40px; text-align: center;">
              <div style="display:inline-flex; align-items:center; justify-content:center; width:80px; height:80px; border-radius:20px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);">
                <svg width="40" height="40" viewBox="0 0 24 24" role="img" aria-label="Uptrade logo" class="logo-mark" style="display:block;">
                  <path d="M6 4h2v12a4 4 0 0 0 8 0V4h2v12a6 6 0 0 1-12 0V4z" />
                </svg>
              </div>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Hi ${contact.name || 'there'},
              </p>
              
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                ${daysOverdue > 0 
                  ? `This is a friendly reminder that invoice <strong>${invoice.invoice_number}</strong> was due on ${dueDate} and is now ${daysOverdue} days past due.`
                  : `This is a friendly reminder that invoice <strong>${invoice.invoice_number}</strong> is due on ${dueDate}.`
                }
              </p>
              
              <!-- Amount Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fef2f2; border: 2px solid ${urgencyColor}; border-radius: 8px; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <span style="color: #666; font-size: 14px;">Amount Due</span><br>
                    <span style="color: ${urgencyColor}; font-size: 36px; font-weight: 700;">${formatCurrency(invoice.total_amount)}</span>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${paymentUrl}" style="display: inline-block; background: linear-gradient(135deg, #4bbf39 0%, #3a9c2d 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(75, 191, 57, 0.3);">
                      Pay Now
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 32px 0 0; text-align: center;">
                If you've already sent payment, please disregard this reminder.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 24px 40px; border-top: 1px solid #e9ecef;">
              <p style="color: #666; font-size: 13px; margin: 0; text-align: center;">
                Questions about this invoice? Reply to this email or contact<br>
                <a href="mailto:hello@uptrademedia.com" style="color: #4bbf39;">hello@uptrademedia.com</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

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

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    // Verify authentication
    const { contact: adminContact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !adminContact) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
    }

    // Only admins can send reminders
    if (adminContact.role !== 'admin') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Only admins can send reminders' }) }
    }

    const { invoiceId } = JSON.parse(event.body || '{}')

    if (!invoiceId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'invoiceId is required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Fetch invoice with contact info
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        contact:contacts(id, name, email, company)
      `)
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Invoice not found' }) }
    }

    if (invoice.status === 'paid') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Cannot send reminder for paid invoice' }) }
    }

    // Get recipient email - from contact or sent_to_email (for quick invoices)
    const recipientEmail = invoice.contact?.email || invoice.sent_to_email
    const recipientName = invoice.contact?.name || invoice.sent_to_email?.split('@')[0] || 'there'
    
    if (!recipientEmail) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No email address for this invoice' }) }
    }

    // Create a contact-like object for email template
    const contactForEmail = invoice.contact || { name: recipientName, email: recipientEmail }

    if (!invoice.payment_token) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invoice has not been sent yet. Send the invoice first.' }) }
    }

    // Calculate days overdue
    const daysOverdue = invoice.due_date 
      ? Math.max(0, Math.ceil((new Date() - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24)))
      : 0

    const newReminderCount = (invoice.reminder_count || 0) + 1
    const nextReminderDate = calculateNextReminderDate(newReminderCount)

    // Update invoice with reminder tracking
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        reminder_count: newReminderCount,
        last_reminder_sent: now,
        next_reminder_date: nextReminderDate,
        updated_at: now
      })
      .eq('id', invoiceId)

    if (updateError) {
      console.error('[invoices-reminder] Update error:', updateError)
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to update invoice' }) }
    }

    // Generate payment URL
    const paymentUrl = `${PORTAL_URL}/pay/${invoice.payment_token}`

    // Send reminder email
    if (!RESEND_API_KEY) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: 'Reminder tracked (email not configured)',
          reminderCount: newReminderCount
        })
      }
    }

    const resend = new Resend(RESEND_API_KEY)
    const emailHtml = generateReminderEmailHTML(invoice, contactForEmail, paymentUrl, newReminderCount, daysOverdue)

    const { error: emailError } = await resend.emails.send({
      from: RESEND_FROM,
      to: recipientEmail,
      subject: `${daysOverdue > 7 ? '⚠️ ' : ''}Reminder: Invoice ${invoice.invoice_number} - ${formatCurrency(invoice.total_amount)} Due`,
      html: emailHtml
    })

    if (emailError) {
      console.error('[invoices-reminder] Email error:', emailError)
      return { 
        statusCode: 500, 
        headers, 
        body: JSON.stringify({ error: 'Reminder tracked but email failed', details: emailError.message }) 
      }
    }

    console.log(`[invoices-reminder] Reminder ${newReminderCount} sent for ${invoice.invoice_number} to ${recipientEmail}`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Reminder sent successfully',
        reminderCount: newReminderCount,
        nextReminderDate,
        sentTo: recipientEmail
      })
    }

  } catch (error) {
    console.error('[invoices-reminder] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to send reminder', details: error.message })
    }
  }
}
