// netlify/functions/invoices-create.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, desc } from 'drizzle-orm'
import { Client, Environment } from 'square'
import { Resend } from 'resend'
import * as schema from '../../src/db/schema.ts'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'um_session'
const JWT_SECRET = process.env.AUTH_JWT_SECRET
const DATABASE_URL = process.env.DATABASE_URL
const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN
const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT || 'sandbox'
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'portal@uptrademedia.com'

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
    
    // Only admins can create invoices
    if (payload.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only admins can create invoices' })
      }
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}')
    const { 
      contactId,
      projectId,
      amount,
      taxRate = 0,
      description,
      dueDate
    } = body

    // Validate required fields
    if (!contactId || !amount) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'contactId and amount are required' })
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

    // Verify contact exists
    const contact = await db.query.contacts.findFirst({
      where: eq(schema.contacts.id, contactId)
    })

    if (!contact) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Contact not found' })
      }
    }

    // If projectId provided, verify it exists
    if (projectId) {
      const project = await db.query.projects.findFirst({
        where: eq(schema.projects.id, projectId)
      })

      if (!project) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Project not found' })
        }
      }
    }

    // Calculate amounts
    const amountValue = parseFloat(amount)
    const taxRateValue = parseFloat(taxRate)
    const taxAmountValue = amountValue * (taxRateValue / 100)
    const totalAmountValue = amountValue + taxAmountValue

    // Generate invoice number
    const lastInvoice = await db.query.invoices.findFirst({
      orderBy: [desc(schema.invoices.createdAt)]
    })
    
    const lastNumber = lastInvoice?.invoiceNumber 
      ? parseInt(lastInvoice.invoiceNumber.replace(/\D/g, '')) 
      : 0
    const invoiceNumber = `INV-${String(lastNumber + 1).padStart(5, '0')}`

    // Create invoice in Square (if configured)
    let squareInvoiceId = null
    if (SQUARE_ACCESS_TOKEN) {
      try {
        const squareClient = new Client({
          accessToken: SQUARE_ACCESS_TOKEN,
          environment: SQUARE_ENVIRONMENT === 'production' 
            ? Environment.Production 
            : Environment.Sandbox
        })

        const invoiceResponse = await squareClient.invoicesApi.createInvoice({
          invoice: {
            locationId: process.env.SQUARE_LOCATION_ID,
            orderId: null, // Can be linked to an order if needed
            primaryRecipient: {
              customerId: contact.squareCustomerId || null,
              givenName: contact.name?.split(' ')[0],
              familyName: contact.name?.split(' ').slice(1).join(' '),
              emailAddress: contact.email
            },
            paymentRequests: [{
              requestType: 'BALANCE',
              dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            }],
            deliveryMethod: 'EMAIL',
            invoiceNumber,
            title: description || 'Services Rendered',
            description: description || '',
            scheduledAt: new Date().toISOString()
          },
          idempotencyKey: `invoice-${Date.now()}-${contactId}`
        })

        squareInvoiceId = invoiceResponse.result.invoice?.id || null
      } catch (squareError) {
        console.error('Square invoice creation failed:', squareError)
        // Continue with local invoice creation even if Square fails
      }
    }

    // Create invoice in database
    const [invoice] = await db.insert(schema.invoices).values({
      contactId,
      projectId: projectId || null,
      invoiceNumber,
      squareInvoiceId,
      amount: String(amountValue),
      taxRate: String(taxRateValue),
      taxAmount: String(taxAmountValue),
      totalAmount: String(totalAmountValue),
      status: 'pending',
      description,
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }).returning()

    // Send email notification to client
    if (RESEND_API_KEY && contact.email) {
      try {
        const resend = new Resend(RESEND_API_KEY)
        await resend.emails.send({
          from: RESEND_FROM_EMAIL,
          to: contact.email,
          subject: `Invoice ${invoiceNumber} - $${totalAmountValue.toFixed(2)}`,
          html: `
            <h2>New Invoice</h2>
            <p>Hello ${contact.name},</p>
            <p>You have a new invoice:</p>
            <table style="border-collapse: collapse; margin: 20px 0;">
              <tr><td style="padding: 8px;"><strong>Invoice Number:</strong></td><td style="padding: 8px;">${invoiceNumber}</td></tr>
              <tr><td style="padding: 8px;"><strong>Amount:</strong></td><td style="padding: 8px;">$${amountValue.toFixed(2)}</td></tr>
              <tr><td style="padding: 8px;"><strong>Tax (${taxRateValue}%):</strong></td><td style="padding: 8px;">$${taxAmountValue.toFixed(2)}</td></tr>
              <tr><td style="padding: 8px;"><strong>Total:</strong></td><td style="padding: 8px;"><strong>$${totalAmountValue.toFixed(2)}</strong></td></tr>
              <tr><td style="padding: 8px;"><strong>Due Date:</strong></td><td style="padding: 8px;">${invoice.dueDate.toLocaleDateString()}</td></tr>
            </table>
            ${description ? `<p><strong>Description:</strong> ${description}</p>` : ''}
            <p><a href="${process.env.URL}/billing/invoices/${invoice.id}">View & Pay Invoice</a></p>
          `
        })
      } catch (emailError) {
        console.error('Failed to send invoice email:', emailError)
        // Don't fail the request if email fails
      }
    }

    // Format response
    const formattedInvoice = {
      id: invoice.id,
      contactId: invoice.contactId,
      projectId: invoice.projectId,
      invoiceNumber: invoice.invoiceNumber,
      squareInvoiceId: invoice.squareInvoiceId,
      amount: parseFloat(invoice.amount),
      taxRate: parseFloat(invoice.taxRate),
      taxAmount: parseFloat(invoice.taxAmount),
      totalAmount: parseFloat(invoice.totalAmount),
      status: invoice.status,
      description: invoice.description,
      dueDate: invoice.dueDate,
      paidAt: invoice.paidAt,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        invoice: formattedInvoice,
        message: 'Invoice created successfully'
      })
    }

  } catch (error) {
    console.error('Error creating invoice:', error)
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired session' })
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to create invoice',
        message: error.message 
      })
    }
  }
}
