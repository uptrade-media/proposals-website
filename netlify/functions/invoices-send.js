// netlify/functions/invoices-send.js
// Send invoice email with magic payment link
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { randomBytes } from 'crypto'
import { Resend } from 'resend'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'portal@send.uptrademedia.com'
const RESEND_FROM = `Uptrade Media <${RESEND_FROM_EMAIL}>`
const PORTAL_URL = process.env.URL || 'https://portal.uptrademedia.com'

// Generate secure random token
function generatePaymentToken() {
  return randomBytes(32).toString('hex')
}

// Calculate next reminder date (3 days from now, then 7 days, then 14 days)
function calculateNextReminderDate(reminderCount) {
  const days = reminderCount === 0 ? 3 : reminderCount === 1 ? 7 : reminderCount === 2 ? 14 : null
  if (!days) return null // Max 3 reminders
  
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

// Generate invoice email HTML
function generateInvoiceEmailHTML(invoice, contact, paymentUrl) {
  const dueDate = invoice.due_date 
    ? new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Upon Receipt'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoice_number}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4bbf39 0%, #3a9c2d 100%); padding: 32px 40px; text-align: center;">
              <img src="https://uptrademedia.com/logo-white.png" alt="Uptrade Media" height="40" style="max-height: 40px;">
              <h1 style="color: #ffffff; margin: 16px 0 0; font-size: 24px; font-weight: 600;">Invoice ${invoice.invoice_number}</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Hi ${contact.name || 'there'},
              </p>
              
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
                Please find your invoice details below. Click the button to view and pay securely online.
              </p>
              
              <!-- Invoice Summary Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-bottom: 12px; border-bottom: 1px solid #e9ecef;">
                          <span style="color: #666; font-size: 14px;">Invoice Number</span><br>
                          <span style="color: #333; font-size: 16px; font-weight: 600;">${invoice.invoice_number}</span>
                        </td>
                        <td align="right" style="padding-bottom: 12px; border-bottom: 1px solid #e9ecef;">
                          <span style="color: #666; font-size: 14px;">Due Date</span><br>
                          <span style="color: #333; font-size: 16px; font-weight: 600;">${dueDate}</span>
                        </td>
                      </tr>
                      ${invoice.description ? `
                      <tr>
                        <td colspan="2" style="padding-top: 16px;">
                          <span style="color: #666; font-size: 14px;">Description</span><br>
                          <span style="color: #333; font-size: 15px;">${invoice.description}</span>
                        </td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td colspan="2" style="padding-top: 16px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="color: #666; font-size: 14px; padding: 4px 0;">Subtotal</td>
                              <td align="right" style="color: #333; font-size: 14px; padding: 4px 0;">${formatCurrency(invoice.amount)}</td>
                            </tr>
                            ${invoice.tax_amount && invoice.tax_amount > 0 ? `
                            <tr>
                              <td style="color: #666; font-size: 14px; padding: 4px 0;">Tax</td>
                              <td align="right" style="color: #333; font-size: 14px; padding: 4px 0;">${formatCurrency(invoice.tax_amount)}</td>
                            </tr>
                            ` : ''}
                            <tr>
                              <td style="color: #333; font-size: 18px; font-weight: 700; padding: 12px 0 0; border-top: 2px solid #e9ecef;">Total Due</td>
                              <td align="right" style="color: #4bbf39; font-size: 24px; font-weight: 700; padding: 12px 0 0; border-top: 2px solid #e9ecef;">${formatCurrency(invoice.total_amount)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${paymentUrl}" style="display: inline-block; background: linear-gradient(135deg, #4bbf39 0%, #3a9c2d 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(75, 191, 57, 0.3);">
                      View & Pay Invoice
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 32px 0 0; text-align: center;">
                This link is unique to you and expires in 30 days. No login required.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 24px 40px; border-top: 1px solid #e9ecef;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="color: #666; font-size: 13px; line-height: 1.5;">
                    <strong>Uptrade Media</strong><br>
                    Questions? Reply to this email or contact us at<br>
                    <a href="mailto:hello@uptrademedia.com" style="color: #4bbf39; text-decoration: none;">hello@uptrademedia.com</a>
                  </td>
                  <td align="right" style="color: #999; font-size: 12px;">
                    © ${new Date().getFullYear()} Uptrade Media<br>
                    All rights reserved
                  </td>
                </tr>
              </table>
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

// Generate reminder email HTML
function generateReminderEmailHTML(invoice, contact, paymentUrl, reminderNumber, daysFromSend) {
  const dueDate = invoice.due_date 
    ? new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Upon Receipt'

  const urgencyColor = reminderNumber === 3 ? '#dc2626' : reminderNumber === 2 ? '#ea580c' : '#f59e0b'
  const urgencyText = reminderNumber === 3 ? 'Final Reminder' : reminderNumber === 2 ? 'Second Reminder' : 'Friendly Reminder'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
                ${urgencyText}: Invoice ${invoice.invoice_number}
              </span>
            </td>
          </tr>
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4bbf39 0%, #3a9c2d 100%); padding: 24px 40px; text-align: center;">
              <img src="https://uptrademedia.com/logo-white.png" alt="Uptrade Media" height="36" style="max-height: 36px;">
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Hi ${contact.name || 'there'},
              </p>
              
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                This is a friendly reminder that invoice <strong>${invoice.invoice_number}</strong> for ${formatCurrency(invoice.total_amount)} is still outstanding.
              </p>
              
              <!-- Amount Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fef2f2; border: 2px solid ${urgencyColor}; border-radius: 8px; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <span style="color: #666; font-size: 14px;">Amount Due</span><br>
                    <span style="color: ${urgencyColor}; font-size: 36px; font-weight: 700;">${formatCurrency(invoice.total_amount)}</span>
                    <br>
                    <span style="color: #666; font-size: 14px;">Due: ${dueDate}</span>
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
                Questions? Reply to this email or contact<br>
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
    const { contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !contact) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
    }

    // Only admins can send invoices
    if (contact.role !== 'admin') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Only admins can send invoices' }) }
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
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invoice is already paid' }) }
    }

    if (!invoice.contact?.email) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Contact has no email address' }) }
    }

    // Generate payment token
    const paymentToken = generatePaymentToken()
    const tokenExpires = new Date()
    tokenExpires.setDate(tokenExpires.getDate() + 30) // 30 day expiry

    // Calculate next reminder date
    const nextReminderDate = calculateNextReminderDate(0)

    // Update invoice with token and send tracking
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        payment_token: paymentToken,
        payment_token_expires: tokenExpires.toISOString(),
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_to_email: invoice.contact.email,
        next_reminder_date: nextReminderDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)

    if (updateError) {
      console.error('[invoices-send] Update error:', updateError)
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to update invoice' }) }
    }

    // Generate payment URL
    const paymentUrl = `${PORTAL_URL}/pay/${paymentToken}`

    // Send email
    if (!RESEND_API_KEY) {
      console.warn('[invoices-send] RESEND_API_KEY not configured')
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: 'Invoice marked as sent (email not configured)',
          paymentUrl 
        })
      }
    }

    const resend = new Resend(RESEND_API_KEY)
    const emailHtml = generateInvoiceEmailHTML(invoice, invoice.contact, paymentUrl)

    // Send the initial invoice email immediately
    const { error: emailError } = await resend.emails.send({
      from: RESEND_FROM,
      to: invoice.contact.email,
      subject: `Invoice ${invoice.invoice_number} from Uptrade Media - ${formatCurrency(invoice.total_amount)}`,
      html: emailHtml
    })

    if (emailError) {
      console.error('[invoices-send] Email error:', emailError)
      return { 
        statusCode: 500, 
        headers, 
        body: JSON.stringify({ error: 'Invoice saved but email failed to send', details: emailError.message }) 
      }
    }

    // Schedule 3 reminder emails using Resend's scheduledAt feature
    // Reminder 1: 3 days from now
    // Reminder 2: 7 days from now (if not paid)
    // Reminder 3: 14 days from now (if not paid)
    const reminderSchedule = [3, 7, 14] // days from now
    const scheduledReminders = []

    for (let i = 0; i < reminderSchedule.length; i++) {
      const days = reminderSchedule[i]
      const reminderDate = new Date()
      reminderDate.setDate(reminderDate.getDate() + days)
      reminderDate.setHours(9, 0, 0, 0) // 9 AM

      const reminderNumber = i + 1
      const reminderHtml = generateReminderEmailHTML(invoice, invoice.contact, paymentUrl, reminderNumber, days)

      try {
        const { data: scheduled, error: scheduleError } = await resend.emails.send({
          from: RESEND_FROM,
          to: invoice.contact.email,
          subject: `${days > 7 ? '⚠️ ' : ''}Reminder: Invoice ${invoice.invoice_number} - ${formatCurrency(invoice.total_amount)} Due`,
          html: reminderHtml,
          scheduledAt: reminderDate.toISOString(),
          tags: [
            { name: 'type', value: 'invoice_reminder' },
            { name: 'invoice_id', value: invoiceId },
            { name: 'reminder_number', value: String(reminderNumber) }
          ]
        })

        if (!scheduleError && scheduled?.id) {
          scheduledReminders.push({
            reminderNumber,
            scheduledFor: reminderDate.toISOString(),
            emailId: scheduled.id
          })
          console.log(`[invoices-send] Scheduled reminder ${reminderNumber} for ${reminderDate.toISOString()}`)
        }
      } catch (schedErr) {
        console.error(`[invoices-send] Failed to schedule reminder ${reminderNumber}:`, schedErr)
        // Continue - don't fail the whole operation if scheduling fails
      }
    }

    // Store scheduled reminder email IDs in database (for cancellation on payment)
    if (scheduledReminders.length > 0) {
      const emailIds = scheduledReminders.map(r => r.emailId)
      await supabase
        .from('invoices')
        .update({
          scheduled_reminder_ids: emailIds,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)
    }

    console.log(`[invoices-send] Invoice ${invoice.invoice_number} sent to ${invoice.contact.email}`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Invoice sent successfully',
        invoiceNumber: invoice.invoice_number,
        sentTo: invoice.contact.email,
        paymentUrl,
        scheduledReminders
      })
    }

  } catch (error) {
    console.error('[invoices-send] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to send invoice', details: error.message })
    }
  }
}
