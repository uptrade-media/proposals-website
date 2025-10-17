// netlify/functions/invoices-webhook.js
import crypto from 'crypto'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import { Resend } from 'resend'
import * as schema from '../../src/db/schema.js'

const SQUARE_WEBHOOK_SIGNATURE_KEY = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY
const DATABASE_URL = process.env.DATABASE_URL
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'portal@uptrademedia.com'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL

export async function handler(event) {
  // Webhook endpoints don't need CORS
  const headers = {
    'Content-Type': 'application/json'
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Verify webhook signature
    if (!SQUARE_WEBHOOK_SIGNATURE_KEY) {
      console.error('Square webhook signature key not configured')
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Webhook not configured' })
      }
    }

    const signature = event.headers['x-square-hmacsha256-signature'] || event.headers['X-Square-HmacSHA256-Signature']
    const body = event.body

    if (!signature || !body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing signature or body' })
      }
    }

    // Verify signature using HMAC-SHA256
    const hmac = crypto.createHmac('sha256', SQUARE_WEBHOOK_SIGNATURE_KEY)
    hmac.update(event.headers['x-square-delivery-timestamp'] || event.headers['X-Square-Delivery-Timestamp'] || '')
    hmac.update('.')
    hmac.update(body)
    const expectedSignature = hmac.digest('base64')

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature')
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid signature' })
      }
    }

    // Parse webhook payload
    const payload = JSON.parse(body)
    const { type, data } = payload

    console.log('Received Square webhook:', type)

    // Connect to database
    if (!DATABASE_URL) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database not configured' })
      }
    }

    const sql = neon(DATABASE_URL)
    const db = drizzle(sql, { schema })

    // Handle different webhook event types
    switch (type) {
      case 'payment.created':
      case 'payment.updated': {
        const payment = data.object.payment
        const referenceId = payment.referenceId // This should be our invoice ID
        
        if (!referenceId) {
          console.log('Payment has no reference ID, skipping')
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'No reference ID' })
          }
        }

        // Find invoice by ID
        const invoice = await db.query.invoices.findFirst({
          where: eq(schema.invoices.id, referenceId),
          with: {
            contact: true
          }
        })

        if (!invoice) {
          console.log(`Invoice ${referenceId} not found`)
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Invoice not found' })
          }
        }

        // Update invoice status based on payment status
        let newStatus = invoice.status
        let paidAt = invoice.paidAt

        if (payment.status === 'COMPLETED') {
          newStatus = 'paid'
          paidAt = new Date()
        } else if (payment.status === 'FAILED' || payment.status === 'CANCELED') {
          newStatus = 'failed'
        }

        // Only update if status changed
        if (newStatus !== invoice.status) {
          await db.update(schema.invoices)
            .set({
              status: newStatus,
              paidAt,
              squarePaymentId: payment.id,
              updatedAt: new Date()
            })
            .where(eq(schema.invoices.id, referenceId))

          console.log(`Updated invoice ${invoice.invoiceNumber} to status: ${newStatus}`)

          // Send notification if payment failed
          if (newStatus === 'failed' && RESEND_API_KEY && invoice.contact.email) {
            try {
              const resend = new Resend(RESEND_API_KEY)
              await resend.emails.send({
                from: RESEND_FROM_EMAIL,
                to: invoice.contact.email,
                subject: `Payment Failed - Invoice ${invoice.invoiceNumber}`,
                html: `
                  <h2>Payment Failed</h2>
                  <p>Hello ${invoice.contact.name},</p>
                  <p>Unfortunately, your payment for invoice ${invoice.invoiceNumber} was not successful.</p>
                  <p><strong>Amount:</strong> $${parseFloat(invoice.totalAmount).toFixed(2)}</p>
                  <p>Please try again or contact us if you need assistance.</p>
                  <p><a href="${process.env.URL}/billing/invoices/${invoice.id}">Retry Payment</a></p>
                `
              })
            } catch (emailError) {
              console.error('Failed to send payment failure email:', emailError)
            }
          }
        }

        break
      }

      case 'invoice.published':
      case 'invoice.payment_made': {
        const invoiceData = data.object.invoice
        const squareInvoiceId = invoiceData.id

        // Find our invoice by Square invoice ID
        const invoice = await db.query.invoices.findFirst({
          where: eq(schema.invoices.squareInvoiceId, squareInvoiceId),
          with: {
            contact: true
          }
        })

        if (!invoice) {
          console.log(`Invoice with Square ID ${squareInvoiceId} not found`)
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Invoice not found' })
          }
        }

        // Update status based on Square invoice status
        let newStatus = invoice.status
        let paidAt = invoice.paidAt

        if (invoiceData.status === 'PAID') {
          newStatus = 'paid'
          paidAt = new Date()
        } else if (invoiceData.status === 'CANCELED') {
          newStatus = 'cancelled'
        }

        if (newStatus !== invoice.status) {
          await db.update(schema.invoices)
            .set({
              status: newStatus,
              paidAt,
              updatedAt: new Date()
            })
            .where(eq(schema.invoices.squareInvoiceId, squareInvoiceId))

          console.log(`Updated invoice ${invoice.invoiceNumber} to status: ${newStatus}`)

          // Send receipt if paid via Square invoice
          if (newStatus === 'paid' && RESEND_API_KEY && invoice.contact.email) {
            try {
              const resend = new Resend(RESEND_API_KEY)
              await resend.emails.send({
                from: RESEND_FROM_EMAIL,
                to: invoice.contact.email,
                subject: `Receipt for Invoice ${invoice.invoiceNumber}`,
                html: `
                  <h2>Payment Receipt</h2>
                  <p>Hello ${invoice.contact.name},</p>
                  <p>Thank you for your payment!</p>
                  <table style="border-collapse: collapse; margin: 20px 0;">
                    <tr><td style="padding: 8px;"><strong>Invoice Number:</strong></td><td style="padding: 8px;">${invoice.invoiceNumber}</td></tr>
                    <tr><td style="padding: 8px;"><strong>Amount Paid:</strong></td><td style="padding: 8px;"><strong>$${parseFloat(invoice.totalAmount).toFixed(2)}</strong></td></tr>
                    <tr><td style="padding: 8px;"><strong>Payment Date:</strong></td><td style="padding: 8px;">${new Date().toLocaleDateString()}</td></tr>
                  </table>
                  <p>You can view your receipt anytime at <a href="${process.env.URL}/billing/invoices/${invoice.id}">your billing portal</a>.</p>
                  <p>Thank you for your business!</p>
                `
              })

              // Notify admin
              if (ADMIN_EMAIL) {
                await resend.emails.send({
                  from: RESEND_FROM_EMAIL,
                  to: ADMIN_EMAIL,
                  subject: `Payment Received - Invoice ${invoice.invoiceNumber}`,
                  html: `
                    <h2>Payment Received via Square Invoice</h2>
                    <p>Invoice ${invoice.invoiceNumber} has been paid.</p>
                    <p><strong>Client:</strong> ${invoice.contact.name}</p>
                    <p><strong>Amount:</strong> $${parseFloat(invoice.totalAmount).toFixed(2)}</p>
                    <p><a href="https://squareup.com/dashboard/invoices/${squareInvoiceId}">View in Square</a></p>
                  `
                })
              }
            } catch (emailError) {
              console.error('Failed to send receipt email:', emailError)
            }
          }
        }

        break
      }

      default:
        console.log(`Unhandled webhook type: ${type}`)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Webhook processed' })
    }

  } catch (error) {
    console.error('Error processing webhook:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to process webhook',
        message: error.message 
      })
    }
  }
}
