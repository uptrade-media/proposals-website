// netlify/functions/invoices-pay-public.js
// Process payment for invoice via magic link (no auth required)
import { createSupabaseAdmin } from './utils/supabase.js'
import { Client, Environment } from 'square'
import { Resend } from 'resend'
import { randomUUID } from 'crypto'

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID
const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT || 'sandbox'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'portal@send.uptrademedia.com'
const RESEND_FROM = `Uptrade Media <${RESEND_FROM_EMAIL}>`
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hello@uptrademedia.com'

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function generateReceiptEmailHTML(invoice, contact, paymentId) {
  const paidDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  
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
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4bbf39 0%, #3a9c2d 100%); padding: 32px 40px; text-align: center;">
              <div style="display:inline-flex; align-items:center; justify-content:center; width:96px; height:96px; border-radius:24px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); margin-bottom: 12px;">
                <svg width="48" height="48" viewBox="0 0 24 24" role="img" aria-label="Uptrade logo" class="logo-mark" style="display:block;">
                  <path d="M6 4h2v12a4 4 0 0 0 8 0V4h2v12a6 6 0 0 1-12 0V4z" />
                </svg>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Payment Received ✓</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Hi ${contact.name || 'there'},
              </p>
              
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
                Thank you for your payment! This email serves as your receipt.
              </p>
              
              <!-- Receipt Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0fdf4; border: 2px solid #4bbf39; border-radius: 8px; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <span style="color: #666; font-size: 14px;">Invoice Number</span><br>
                          <span style="color: #333; font-size: 16px; font-weight: 600;">${invoice.invoice_number}</span>
                        </td>
                        <td align="right" style="padding-bottom: 12px;">
                          <span style="color: #666; font-size: 14px;">Payment Date</span><br>
                          <span style="color: #333; font-size: 16px; font-weight: 600;">${paidDate}</span>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top: 16px; border-top: 1px solid #d1fae5;">
                          <span style="color: #333; font-size: 18px; font-weight: 700;">Amount Paid</span>
                          <span style="float: right; color: #4bbf39; font-size: 24px; font-weight: 700;">${formatCurrency(invoice.total_amount)}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
                Payment ID: ${paymentId}<br>
                Keep this email for your records.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 24px 40px; border-top: 1px solid #e9ecef;">
              <p style="color: #666; font-size: 13px; margin: 0; text-align: center;">
                Questions? Contact us at <a href="mailto:hello@uptrademedia.com" style="color: #4bbf39;">hello@uptrademedia.com</a>
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
    'Access-Control-Allow-Headers': 'Content-Type',
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
    const { token, sourceId } = JSON.parse(event.body || '{}')

    if (!token || !sourceId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'token and sourceId are required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Fetch invoice by payment token
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        contact:contacts(id, name, email, company)
      `)
      .eq('payment_token', token)
      .single()

    if (invoiceError || !invoice) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Invoice not found or link has expired' }) }
    }

    // Check if token is expired
    if (invoice.payment_token_expires && new Date(invoice.payment_token_expires) < new Date()) {
      return { statusCode: 410, headers, body: JSON.stringify({ error: 'Payment link has expired' }) }
    }

    if (invoice.status === 'paid') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invoice is already paid' }) }
    }

    // Validate Square configuration
    if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
      console.error('[invoices-pay-public] Square not configured')
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Payment processing not configured' }) }
    }

    // Initialize Square client
    const squareClient = new Client({
      accessToken: SQUARE_ACCESS_TOKEN,
      environment: SQUARE_ENVIRONMENT === 'production' ? Environment.Production : Environment.Sandbox
    })

    // Convert to cents
    const amountInCents = Math.round(parseFloat(invoice.total_amount) * 100)

    // Create payment
    const idempotencyKey = randomUUID()
    
    const { result, statusCode } = await squareClient.paymentsApi.createPayment({
      sourceId,
      idempotencyKey,
      amountMoney: {
        amount: BigInt(amountInCents),
        currency: 'USD'
      },
      locationId: SQUARE_LOCATION_ID,
      referenceId: invoice.id,
      note: `Invoice ${invoice.invoice_number}`
    })

    if (!result.payment || result.payment.status === 'FAILED') {
      console.error('[invoices-pay-public] Payment failed:', result)
      return { 
        statusCode: 400, 
        headers, 
        body: JSON.stringify({ error: 'Payment failed', details: result.errors }) 
      }
    }

    const paymentId = result.payment.id

    // Update invoice as paid
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: now,
        square_payment_id: paymentId,
        next_reminder_date: null, // Clear any scheduled reminders
        scheduled_reminder_ids: [], // Clear stored IDs
        updated_at: now
      })
      .eq('id', invoice.id)

    if (updateError) {
      console.error('[invoices-pay-public] Update error:', updateError)
      // Payment went through but db update failed - log this critical issue
    }

    // Create portal notification for admin
    try {
      await supabase
        .from('smart_notifications')
        .insert({
          contact_id: invoice.contact_id,
          type: 'invoice_paid',
          priority: 'normal',
          title: `💰 Payment received: ${formatCurrency(invoice.total_amount)}`,
          message: `Invoice ${invoice.invoice_number} paid by ${invoice.contact?.name || 'client'}`,
          metadata: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoice_number,
            amount: invoice.total_amount,
            paymentId,
            paidAt: now
          }
        })
      console.log('[invoices-pay-public] Created payment notification')
    } catch (notifyErr) {
      console.error('[invoices-pay-public] Notification error:', notifyErr)
    }

    // Cancel any scheduled reminder emails via Resend API
    if (RESEND_API_KEY && invoice.scheduled_reminder_ids && invoice.scheduled_reminder_ids.length > 0) {
      const resend = new Resend(RESEND_API_KEY)
      for (const emailId of invoice.scheduled_reminder_ids) {
        try {
          await resend.emails.cancel(emailId)
          console.log(`[invoices-pay-public] Cancelled scheduled email: ${emailId}`)
        } catch (cancelErr) {
          // Email may have already been sent or doesn't exist
          console.log(`[invoices-pay-public] Could not cancel email ${emailId}:`, cancelErr.message)
        }
      }
    }

    // Send receipt email
    if (RESEND_API_KEY && invoice.contact?.email) {
      try {
        const resend = new Resend(RESEND_API_KEY)
        const receiptHtml = generateReceiptEmailHTML(invoice, invoice.contact, paymentId)

        await resend.emails.send({
          from: RESEND_FROM,
          to: invoice.contact.email,
          subject: `Payment Receipt - Invoice ${invoice.invoice_number}`,
          html: receiptHtml
        })

        // Also notify admin
        await resend.emails.send({
          from: RESEND_FROM,
          to: ADMIN_EMAIL,
          subject: `💰 Payment Received - ${invoice.invoice_number} - ${formatCurrency(invoice.total_amount)}`,
          html: `
            <p>Invoice ${invoice.invoice_number} has been paid.</p>
            <ul>
              <li><strong>Client:</strong> ${invoice.contact.name} (${invoice.contact.email})</li>
              <li><strong>Amount:</strong> ${formatCurrency(invoice.total_amount)}</li>
              <li><strong>Payment ID:</strong> ${paymentId}</li>
            </ul>
          `
        })
      } catch (emailError) {
        console.error('[invoices-pay-public] Email error:', emailError)
        // Don't fail the request if email fails
      }
    }

    console.log(`[invoices-pay-public] Invoice ${invoice.invoice_number} paid - ${formatCurrency(invoice.total_amount)}`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Payment successful',
        paymentId,
        invoiceNumber: invoice.invoice_number,
        amount: parseFloat(invoice.total_amount)
      })
    }

  } catch (error) {
    console.error('[invoices-pay-public] Error:', error)
    
    // Handle Square-specific errors
    if (error.errors) {
      const squareError = error.errors[0]
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Payment failed', 
          details: squareError?.detail || 'Card was declined'
        })
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Payment processing failed', details: error.message })
    }
  }
}
