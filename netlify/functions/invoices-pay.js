// netlify/functions/invoices-pay.js
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { Client } from 'square'
import { Resend } from 'resend'
import { paymentConfirmationEmail, paymentNotificationAdminEmail } from './utils/email-templates.js'

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID
const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT || 'sandbox'
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM = process.env.RESEND_FROM || 'Uptrade Media <portal@send.uptrademedia.com>'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL

// Simple in-memory rate limiting (resets on function cold start)
const rateLimitMap = new Map()

function checkRateLimit(userId) {
  const now = Date.now()
  const windowMs = 60000 // 1 minute
  const maxAttempts = 5
  
  const userKey = userId
  const userAttempts = rateLimitMap.get(userKey) || []
  
  // Filter to only recent attempts
  const recentAttempts = userAttempts.filter(t => now - t < windowMs)
  
  if (recentAttempts.length >= maxAttempts) {
    return false
  }
  
  recentAttempts.push(now)
  rateLimitMap.set(userKey, recentAttempts)
  return true
}

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
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

  try {
    // Verify authentication with Supabase
    const { user, contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Not authenticated' })
      }
    }

    // Check rate limit
    if (!checkRateLimit(contact.id)) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ 
          error: 'Too many payment attempts. Please wait before trying again.',
          retryAfter: 60
        })
      }
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}')
    const { invoiceId, sourceId } = body

    // Validate required fields
    if (!invoiceId || !sourceId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'invoiceId and sourceId are required' })
      }
    }

    // Verify Square is configured
    if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Payment processing not configured' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Fetch invoice
    // Use explicit FK name because invoices has multiple FK to contacts
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select(`
        *,
        contact:contacts!invoices_contact_id_fkey(id, name, email, company),
        project:projects(id, title)
      `)
      .eq('id', invoiceId)
      .single()

    if (fetchError || !invoice) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Invoice not found' })
      }
    }

    // Verify the user can pay this invoice (must be the contact or admin)
    if (contact.role !== 'admin' && invoice.contact_id !== contact.id) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Not authorized to pay this invoice' })
      }
    }

    // Check if already paid
    if (invoice.status === 'paid') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invoice already paid' })
      }
    }

    // Process payment with Square
    const squareClient = new Client({
      accessToken: SQUARE_ACCESS_TOKEN,
      environment: SQUARE_ENVIRONMENT === 'production' ? 'production' : 'sandbox'
    })

    // Create payment
    const amountInCents = Math.round(invoice.total_amount * 100)
    const idempotencyKey = `${invoiceId}-${Date.now()}`

    const { result: paymentResult, errors: paymentErrors } = await squareClient.paymentsApi.createPayment({
      sourceId: sourceId,
      idempotencyKey: idempotencyKey,
      amountMoney: {
        amount: BigInt(amountInCents),
        currency: 'USD'
      },
      locationId: SQUARE_LOCATION_ID,
      referenceId: invoice.invoice_number,
      note: `Payment for invoice ${invoice.invoice_number}`
    })

    if (paymentErrors && paymentErrors.length > 0) {
      console.error('[invoices-pay] Square payment errors:', paymentErrors)
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Payment failed: ' + (paymentErrors[0]?.detail || 'Unknown error')
        })
      }
    }

    const payment = paymentResult.payment

    // Update invoice to paid status
    const now = new Date().toISOString()
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: now,
        payment_method: 'square',
        square_payment_id: payment.id,
        next_reminder_date: null, // Clear any scheduled reminders
        scheduled_reminder_ids: [], // Clear stored IDs
        updated_at: now
      })
      .eq('id', invoiceId)
      .select(`
        *,
        contact:contacts!invoices_contact_id_fkey(id, name, email, company),
        project:projects(id, title)
      `)
      .single()

    // Create portal notification for admin
    try {
      await supabase
        .from('smart_notifications')
        .insert({
          contact_id: invoice.contact_id,
          type: 'invoice_paid',
          priority: 'normal',
          title: `💰 Payment received: $${parseFloat(invoice.total_amount).toFixed(2)}`,
          message: `Invoice ${invoice.invoice_number} paid by ${invoice.contact?.name || 'client'}`,
          metadata: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoice_number,
            amount: invoice.total_amount,
            paymentId: payment.id,
            paidAt: now
          }
        })
      console.log('[invoices-pay] Created payment notification')
    } catch (notifyErr) {
      console.error('[invoices-pay] Notification error:', notifyErr)
    }

    // Cancel any scheduled reminder emails
    if (RESEND_API_KEY && invoice.scheduled_reminder_ids && invoice.scheduled_reminder_ids.length > 0) {
      const resend = new Resend(RESEND_API_KEY)
      for (const emailId of invoice.scheduled_reminder_ids) {
        try {
          await resend.emails.cancel(emailId)
          console.log(`[invoices-pay] Cancelled scheduled email: ${emailId}`)
        } catch (cancelErr) {
          console.log(`[invoices-pay] Could not cancel email ${emailId}:`, cancelErr.message)
        }
      }
    }

    if (updateError) {
      console.error('[invoices-pay] Database error:', updateError)
      // Payment succeeded but database update failed - log for manual reconciliation
      console.error('[invoices-pay] CRITICAL: Payment succeeded but DB update failed!', {
        invoiceId,
        squarePaymentId: payment.id,
        amount: invoice.total_amount
      })
    }

    // Send confirmation emails with branded templates
    if (RESEND_API_KEY) {
      const resend = new Resend(RESEND_API_KEY)
      
      // Email to client
      const clientEmail = invoice.contact?.email || invoice.sent_to_email
      if (clientEmail) {
        try {
          await resend.emails.send({
            from: RESEND_FROM,
            to: clientEmail,
            subject: `Payment Confirmed - Invoice ${invoice.invoice_number}`,
            html: paymentConfirmationEmail({
              recipientName: invoice.contact?.name || clientEmail.split('@')[0],
              invoiceNumber: invoice.invoice_number,
              amount: invoice.total_amount,
              transactionId: payment.id,
              paidDate: now
            })
          })
          console.log(`[invoices-pay] Sent payment confirmation to ${clientEmail}`)
        } catch (emailError) {
          console.error('[invoices-pay] Client email error:', emailError)
        }
      }

      // Email to admin
      if (ADMIN_EMAIL) {
        try {
          await resend.emails.send({
            from: RESEND_FROM,
            to: ADMIN_EMAIL,
            subject: `💰 Payment Received - ${invoice.invoice_number} ($${invoice.total_amount.toFixed(2)})`,
            html: paymentNotificationAdminEmail({
              clientName: invoice.contact?.name || 'Quick Invoice Customer',
              clientEmail: clientEmail || 'N/A',
              invoiceNumber: invoice.invoice_number,
              amount: invoice.total_amount,
              transactionId: payment.id
            })
          })
          console.log(`[invoices-pay] Sent payment notification to admin`)
        } catch (emailError) {
          console.error('[invoices-pay] Admin email error:', emailError)
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        payment: {
          id: payment.id,
          status: payment.status,
          amount: invoice.total_amount
        },
        invoice: updatedInvoice ? {
          id: updatedInvoice.id,
          invoiceNumber: updatedInvoice.invoice_number,
          status: updatedInvoice.status,
          paidAt: updatedInvoice.paid_at
        } : null
      })
    }

  } catch (error) {
    console.error('[invoices-pay] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Payment processing failed' })
    }
  }
}
