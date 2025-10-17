// netlify/functions/invoices-pay.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import { Client, Environment } from 'square'
import { Resend } from 'resend'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import * as schema from '../../src/db/schema.js'

// Rate limiter: 5 payment attempts per minute per user
const rateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60, // 60 seconds
  blockDurationMs: 60000 // block for 60 seconds after limit exceeded
})

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'um_session'
const JWT_SECRET = process.env.AUTH_JWT_SECRET
const DATABASE_URL = process.env.DATABASE_URL
const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID
const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT || 'sandbox'
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'portal@uptrademedia.com'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL

export async function handler(event) {
  // CORS headers
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
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Verify authentication
  if (!JWT_SECRET) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server not configured' })
    }
  }

  const rawCookie = event.headers.cookie || ''
  const token = rawCookie.split('; ').find(c => c.startsWith(`${COOKIE_NAME}=`))?.split('=')[1]
  
  if (!token) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET)

    // Check rate limit per user
    try {
      await rateLimiter.consume(payload.userId || payload.email)
    } catch (rateLimitError) {
      if (rateLimitError.isFirstInDuration) {
        // Just started consuming
      } else {
        return {
          statusCode: 429,
          headers,
          body: JSON.stringify({ 
            error: 'Too many payment attempts. Please wait before trying again.',
            retryAfter: Math.ceil(rateLimitError.msBeforeNext / 1000)
          })
        }
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

    // Fetch invoice with contact info
    const invoice = await db.query.invoices.findFirst({
      where: eq(schema.invoices.id, invoiceId),
      with: {
        contact: true,
        project: true
      }
    })

    if (!invoice) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Invoice not found' })
      }
    }

    // Verify user has permission to pay this invoice
    if (payload.role !== 'admin' && payload.userId !== invoice.contactId) {
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

    // Create Square client
    const squareClient = new Client({
      accessToken: SQUARE_ACCESS_TOKEN,
      environment: SQUARE_ENVIRONMENT === 'production' 
        ? Environment.Production 
        : Environment.Sandbox
    })

    // Convert amount to cents (Square requires integer cents)
    const totalAmount = parseFloat(invoice.totalAmount)
    const amountInCents = Math.round(totalAmount * 100)

    // Create payment in Square
    const paymentResponse = await squareClient.paymentsApi.createPayment({
      sourceId,
      idempotencyKey: `${invoiceId}-${Date.now()}`,
      amountMoney: {
        amount: BigInt(amountInCents),
        currency: 'USD'
      },
      locationId: SQUARE_LOCATION_ID,
      note: `Payment for invoice ${invoice.invoiceNumber}`,
      referenceId: invoiceId
    })

    const payment = paymentResponse.result.payment

    if (payment.status !== 'COMPLETED') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Payment failed',
          status: payment.status 
        })
      }
    }

    // Update invoice in database
    const [updatedInvoice] = await db.update(schema.invoices)
      .set({
        status: 'paid',
        paidAt: new Date(),
        squarePaymentId: payment.id,
        updatedAt: new Date()
      })
      .where(eq(schema.invoices.id, invoiceId))
      .returning()

    // Send receipt email to client
    if (RESEND_API_KEY && invoice.contact.email) {
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
              <tr><td style="padding: 8px;"><strong>Payment ID:</strong></td><td style="padding: 8px;">${payment.id}</td></tr>
              <tr><td style="padding: 8px;"><strong>Amount Paid:</strong></td><td style="padding: 8px;"><strong>$${totalAmount.toFixed(2)}</strong></td></tr>
              <tr><td style="padding: 8px;"><strong>Payment Date:</strong></td><td style="padding: 8px;">${new Date().toLocaleDateString()}</td></tr>
              <tr><td style="padding: 8px;"><strong>Payment Method:</strong></td><td style="padding: 8px;">${payment.cardDetails?.card?.cardBrand || 'Card'} ending in ${payment.cardDetails?.card?.last4 || '****'}</td></tr>
            </table>
            ${invoice.description ? `<p><strong>Description:</strong> ${invoice.description}</p>` : ''}
            <p>You can view your receipt anytime at <a href="${process.env.URL}/billing/invoices/${invoice.id}">your billing portal</a>.</p>
            <p>Thank you for your business!</p>
          `
        })
      } catch (emailError) {
        console.error('Failed to send receipt email to client:', emailError)
      }
    }

    // Send payment notification to admin
    if (RESEND_API_KEY && ADMIN_EMAIL) {
      try {
        const resend = new Resend(RESEND_API_KEY)
        await resend.emails.send({
          from: RESEND_FROM_EMAIL,
          to: ADMIN_EMAIL,
          subject: `Payment Received - Invoice ${invoice.invoiceNumber}`,
          html: `
            <h2>Payment Received</h2>
            <p>A payment has been processed:</p>
            <table style="border-collapse: collapse; margin: 20px 0;">
              <tr><td style="padding: 8px;"><strong>Invoice Number:</strong></td><td style="padding: 8px;">${invoice.invoiceNumber}</td></tr>
              <tr><td style="padding: 8px;"><strong>Client:</strong></td><td style="padding: 8px;">${invoice.contact.name} (${invoice.contact.email})</td></tr>
              <tr><td style="padding: 8px;"><strong>Amount:</strong></td><td style="padding: 8px;"><strong>$${totalAmount.toFixed(2)}</strong></td></tr>
              <tr><td style="padding: 8px;"><strong>Payment ID:</strong></td><td style="padding: 8px;">${payment.id}</td></tr>
              ${invoice.project ? `<tr><td style="padding: 8px;"><strong>Project:</strong></td><td style="padding: 8px;">${invoice.project.name}</td></tr>` : ''}
            </table>
            <p><a href="https://squareup.com/dashboard/sales/transactions/${payment.id}">View in Square Dashboard</a></p>
          `
        })
      } catch (emailError) {
        console.error('Failed to send payment notification to admin:', emailError)
      }
    }

    // Format response
    const formattedInvoice = {
      id: updatedInvoice.id,
      contactId: updatedInvoice.contactId,
      projectId: updatedInvoice.projectId,
      invoiceNumber: updatedInvoice.invoiceNumber,
      squareInvoiceId: updatedInvoice.squareInvoiceId,
      squarePaymentId: updatedInvoice.squarePaymentId,
      amount: parseFloat(updatedInvoice.amount),
      taxRate: parseFloat(updatedInvoice.taxRate),
      taxAmount: parseFloat(updatedInvoice.taxAmount),
      totalAmount: parseFloat(updatedInvoice.totalAmount),
      status: updatedInvoice.status,
      description: updatedInvoice.description,
      dueDate: updatedInvoice.dueDate,
      paidAt: updatedInvoice.paidAt,
      createdAt: updatedInvoice.createdAt,
      updatedAt: updatedInvoice.updatedAt
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        invoice: formattedInvoice,
        payment: {
          id: payment.id,
          status: payment.status,
          cardBrand: payment.cardDetails?.card?.cardBrand,
          last4: payment.cardDetails?.card?.last4
        },
        message: 'Payment processed successfully'
      })
    }

  } catch (error) {
    console.error('Error processing payment:', error)
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired session' })
      }
    }

    // Handle Square API errors
    if (error.errors) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Payment processing failed',
          details: error.errors
        })
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to process payment',
        message: error.message 
      })
    }
  }
}
