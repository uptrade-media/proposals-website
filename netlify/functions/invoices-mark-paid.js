// netlify/functions/invoices-mark-paid.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import { Resend } from 'resend'
import * as schema from '../../src/db/schema.ts'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'um_session'
const JWT_SECRET = process.env.AUTH_JWT_SECRET
const DATABASE_URL = process.env.DATABASE_URL
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

    // Only admins can mark invoices as paid
    if (payload.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Not authorized - admin only' })
      }
    }

    // Parse request
    const { invoiceId, paymentMethod } = JSON.parse(event.body || '{}')

    // Validate required fields
    if (!invoiceId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'invoiceId is required' })
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

    // Fetch invoice
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

    // Check if already paid
    if (invoice.status === 'paid') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invoice already paid' })
      }
    }

    // Update invoice to paid status
    const now = new Date()
    const [updatedInvoice] = await db.update(schema.invoices)
      .set({
        status: 'paid',
        paidAt: now,
        updatedAt: now
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
            <p>Thank you for your payment! We've received payment for your invoice.</p>
            <table style="border-collapse: collapse; margin: 20px 0;">
              <tr><td style="padding: 8px;"><strong>Invoice Number:</strong></td><td style="padding: 8px;">${invoice.invoiceNumber}</td></tr>
              <tr><td style="padding: 8px;"><strong>Amount:</strong></td><td style="padding: 8px;">$${parseFloat(invoice.totalAmount).toFixed(2)}</td></tr>
              <tr><td style="padding: 8px;"><strong>Payment Date:</strong></td><td style="padding: 8px;">${now.toLocaleDateString()}</td></tr>
              ${paymentMethod ? `<tr><td style="padding: 8px;"><strong>Payment Method:</strong></td><td style="padding: 8px;">${paymentMethod}</td></tr>` : ''}
              ${invoice.project ? `<tr><td style="padding: 8px;"><strong>Project:</strong></td><td style="padding: 8px;">${invoice.project.name}</td></tr>` : ''}
            </table>
            <p>You can view this invoice anytime in your billing portal.</p>
            <p>Thank you for your business!</p>
          `
        })
      } catch (emailError) {
        console.error('Failed to send receipt email:', emailError)
        // Don't fail the whole request if email fails
      }
    }

    // Send notification to admin
    if (RESEND_API_KEY && ADMIN_EMAIL) {
      try {
        const resend = new Resend(RESEND_API_KEY)
        await resend.emails.send({
          from: RESEND_FROM_EMAIL,
          to: ADMIN_EMAIL,
          subject: `Payment Marked - Invoice ${invoice.invoiceNumber}`,
          html: `
            <h2>Invoice Payment Marked</h2>
            <p>Admin has marked the following invoice as paid:</p>
            <table style="border-collapse: collapse; margin: 20px 0;">
              <tr><td style="padding: 8px;"><strong>Client:</strong></td><td style="padding: 8px;">${invoice.contact.name}</td></tr>
              <tr><td style="padding: 8px;"><strong>Invoice Number:</strong></td><td style="padding: 8px;">${invoice.invoiceNumber}</td></tr>
              <tr><td style="padding: 8px;"><strong>Amount:</strong></td><td style="padding: 8px;">$${parseFloat(invoice.totalAmount).toFixed(2)}</td></tr>
              <tr><td style="padding: 8px;"><strong>Marked Paid At:</strong></td><td style="padding: 8px;">${now.toLocaleString()}</td></tr>
              ${paymentMethod ? `<tr><td style="padding: 8px;"><strong>Payment Method:</strong></td><td style="padding: 8px;">${paymentMethod}</td></tr>` : ''}
            </table>
          `
        })
      } catch (emailError) {
        console.error('Failed to send admin notification:', emailError)
        // Don't fail the whole request if email fails
      }
    }

    // Format response
    const formattedInvoice = {
      id: updatedInvoice.id,
      contactId: updatedInvoice.contactId,
      projectId: updatedInvoice.projectId,
      invoiceNumber: updatedInvoice.invoiceNumber,
      squareInvoiceId: updatedInvoice.squareInvoiceId,
      amount: updatedInvoice.amount ? parseFloat(updatedInvoice.amount) : 0,
      taxRate: updatedInvoice.taxRate ? parseFloat(updatedInvoice.taxRate) : 0,
      taxAmount: updatedInvoice.taxAmount ? parseFloat(updatedInvoice.taxAmount) : 0,
      totalAmount: updatedInvoice.totalAmount ? parseFloat(updatedInvoice.totalAmount) : 0,
      status: updatedInvoice.status,
      description: updatedInvoice.description,
      dueDate: updatedInvoice.dueDate?.toISOString(),
      paidAt: updatedInvoice.paidAt?.toISOString(),
      createdAt: updatedInvoice.createdAt?.toISOString(),
      updatedAt: updatedInvoice.updatedAt?.toISOString(),
      contact: {
        id: invoice.contact?.id,
        name: invoice.contact?.name,
        email: invoice.contact?.email,
        company: invoice.contact?.company
      },
      project: invoice.project ? {
        id: invoice.project.id,
        name: invoice.project.name
      } : null
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        message: 'Invoice marked as paid successfully',
        invoice: formattedInvoice 
      })
    }

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired session' })
      }
    }

    console.error('Error marking invoice as paid:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to mark invoice as paid',
        message: error.message 
      })
    }
  }
}
