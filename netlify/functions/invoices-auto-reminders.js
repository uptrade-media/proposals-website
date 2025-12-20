// netlify/functions/invoices-auto-reminders.js
// 
// NOTE: This is now a BACKUP function. Primary reminders are scheduled via Resend's
// scheduledAt feature when the invoice is sent (see invoices-send.js).
// 
// This function can be used as:
// 1. A fallback for any invoices that didn't get scheduled reminders
// 2. A manual trigger to send reminders for old invoices
// 3. A scheduled cleanup function (optional)
//
// To enable as scheduled: Configure in Netlify UI > Functions > Scheduled Functions
// Recommended schedule if needed: Daily at 9 AM ET (0 14 * * *)

import { createSupabaseAdmin } from './utils/supabase.js'
import { Resend } from 'resend'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'portal@send.uptrademedia.com'
const RESEND_FROM = `Uptrade Media <${RESEND_FROM_EMAIL}>`
const PORTAL_URL = process.env.URL || 'https://portal.uptrademedia.com'

const MAX_REMINDERS = 3

// Remove scheduled config - this is now an optional backup
// export const config = { schedule: '@daily' }

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function calculateNextReminderDate(reminderCount) {
  if (reminderCount >= MAX_REMINDERS) return null
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
  console.log('[invoices-auto-reminders] Starting scheduled reminder check...')

  const headers = {
    'Content-Type': 'application/json'
  }

  try {
    const supabase = createSupabaseAdmin()
    const now = new Date().toISOString()

    // Find invoices that need reminders:
    // - status is 'sent' (not paid)
    // - has a payment token
    // - next_reminder_date is in the past or today
    // - reminder_count < MAX_REMINDERS
    const { data: invoices, error: queryError } = await supabase
      .from('invoices')
      .select(`
        *,
        contact:contacts(id, name, email, company)
      `)
      .eq('status', 'sent')
      .not('payment_token', 'is', null)
      .lt('next_reminder_date', now)
      .lt('reminder_count', MAX_REMINDERS)

    if (queryError) {
      console.error('[invoices-auto-reminders] Query error:', queryError)
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch invoices' }) }
    }

    console.log(`[invoices-auto-reminders] Found ${invoices?.length || 0} invoices needing reminders`)

    if (!invoices || invoices.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'No invoices need reminders', processed: 0 })
      }
    }

    if (!RESEND_API_KEY) {
      console.warn('[invoices-auto-reminders] RESEND_API_KEY not configured')
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Email not configured', invoicesNeedingReminders: invoices.length })
      }
    }

    const resend = new Resend(RESEND_API_KEY)
    const results = []

    for (const invoice of invoices) {
      try {
        // Support quick invoices that have sent_to_email instead of contact
        const recipientEmail = invoice.sent_to_email || invoice.contact?.email
        const contactForEmail = invoice.contact || { name: recipientEmail?.split('@')[0] || 'Customer', email: recipientEmail }

        if (!recipientEmail) {
          console.log(`[invoices-auto-reminders] Skipping ${invoice.invoice_number} - no email`)
          results.push({ invoiceNumber: invoice.invoice_number, status: 'skipped', reason: 'no email' })
          continue
        }

        // Calculate days overdue
        const daysOverdue = invoice.due_date 
          ? Math.max(0, Math.ceil((new Date() - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24)))
          : 0

        const newReminderCount = (invoice.reminder_count || 0) + 1
        const nextReminderDate = calculateNextReminderDate(newReminderCount)

        // Generate payment URL
        const paymentUrl = `${PORTAL_URL}/pay/${invoice.payment_token}`

        // Send email
        const emailHtml = generateReminderEmailHTML(invoice, contactForEmail, paymentUrl, newReminderCount, daysOverdue)

        const { error: emailError } = await resend.emails.send({
          from: RESEND_FROM,
          to: recipientEmail,
          subject: `${daysOverdue > 7 ? '⚠️ ' : ''}Reminder: Invoice ${invoice.invoice_number} - ${formatCurrency(invoice.total_amount)} Due`,
          html: emailHtml
        })

        if (emailError) {
          console.error(`[invoices-auto-reminders] Email failed for ${invoice.invoice_number}:`, emailError)
          results.push({ invoiceNumber: invoice.invoice_number, status: 'email_failed', error: emailError.message })
          continue
        }

        // Update invoice with new reminder count
        const { error: updateError } = await supabase
          .from('invoices')
          .update({
            reminder_count: newReminderCount,
            last_reminder_sent: now,
            next_reminder_date: nextReminderDate,
            updated_at: now
          })
          .eq('id', invoice.id)

        if (updateError) {
          console.error(`[invoices-auto-reminders] Update failed for ${invoice.invoice_number}:`, updateError)
        }

        console.log(`[invoices-auto-reminders] Sent reminder ${newReminderCount} for ${invoice.invoice_number} to ${recipientEmail}`)
        results.push({ 
          invoiceNumber: invoice.invoice_number, 
          status: 'sent', 
          reminderCount: newReminderCount,
          sentTo: recipientEmail
        })

      } catch (invoiceError) {
        console.error(`[invoices-auto-reminders] Error processing ${invoice.invoice_number}:`, invoiceError)
        results.push({ invoiceNumber: invoice.invoice_number, status: 'error', error: invoiceError.message })
      }
    }

    const sent = results.filter(r => r.status === 'sent').length
    console.log(`[invoices-auto-reminders] Completed: ${sent}/${invoices.length} reminders sent`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Reminder check completed',
        processed: invoices.length,
        sent,
        results
      })
    }

  } catch (error) {
    console.error('[invoices-auto-reminders] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to process reminders', details: error.message })
    }
  }
}
