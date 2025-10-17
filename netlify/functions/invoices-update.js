// netlify/functions/invoices-update.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as schema from '../../src/db/schema.js'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'um_session'
const JWT_SECRET = process.env.AUTH_JWT_SECRET
const DATABASE_URL = process.env.DATABASE_URL

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'PUT') {
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

    // Only admins can update invoices
    if (payload.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Not authorized - admin only' })
      }
    }

    // Parse request
    const { invoiceId, amount, taxRate, description, dueDate } = JSON.parse(event.body || '{}')

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

    // Fetch current invoice
    const currentInvoice = await db.query.invoices.findFirst({
      where: eq(schema.invoices.id, invoiceId),
      with: {
        contact: true,
        project: true
      }
    })

    if (!currentInvoice) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Invoice not found' })
      }
    }

    // Prevent updating paid invoices
    if (currentInvoice.status === 'paid') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Cannot update paid invoices' })
      }
    }

    // Prepare update data
    const updateData = {}

    // Validate and set amount
    if (amount !== undefined) {
      const amountValue = parseFloat(amount)
      if (isNaN(amountValue) || amountValue < 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid amount' })
        }
      }
      updateData.amount = String(amountValue)
    }

    // Validate and set tax rate
    if (taxRate !== undefined) {
      const taxRateValue = parseFloat(taxRate)
      if (isNaN(taxRateValue) || taxRateValue < 0 || taxRateValue > 100) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid tax rate (must be 0-100)' })
        }
      }
      updateData.taxRate = String(taxRateValue)
    }

    // Validate and set description
    if (description !== undefined) {
      if (typeof description !== 'string' || description.length > 1000) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid description (max 1000 chars)' })
        }
      }
      updateData.description = description
    }

    // Validate and set due date
    if (dueDate !== undefined) {
      const dueDateObj = new Date(dueDate)
      if (isNaN(dueDateObj.getTime())) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid due date' })
        }
      }
      updateData.dueDate = dueDateObj
    }

    // If amount or taxRate changed, recalculate totals
    if (updateData.amount || updateData.taxRate) {
      const finalAmount = updateData.amount 
        ? parseFloat(updateData.amount)
        : parseFloat(currentInvoice.amount)
      
      const finalTaxRate = updateData.taxRate 
        ? parseFloat(updateData.taxRate)
        : parseFloat(currentInvoice.taxRate)

      const taxAmount = finalAmount * (finalTaxRate / 100)
      const totalAmount = finalAmount + taxAmount

      updateData.taxAmount = String(taxAmount)
      updateData.totalAmount = String(totalAmount)
    }

    // Add updated timestamp
    updateData.updatedAt = new Date()

    // Only update if there's something to update
    if (Object.keys(updateData).length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No fields to update' })
      }
    }

    // Update invoice
    const [updatedInvoice] = await db.update(schema.invoices)
      .set(updateData)
      .where(eq(schema.invoices.id, invoiceId))
      .returning()

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
        id: currentInvoice.contact?.id,
        name: currentInvoice.contact?.name,
        email: currentInvoice.contact?.email,
        company: currentInvoice.contact?.company
      },
      project: currentInvoice.project ? {
        id: currentInvoice.project.id,
        name: currentInvoice.project.name
      } : null
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        message: 'Invoice updated successfully',
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

    console.error('Error updating invoice:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to update invoice',
        message: error.message 
      })
    }
  }
}
