// netlify/functions/billing-overdue.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, and, lt, desc } from 'drizzle-orm'
import * as schema from '../../src/db/schema.js'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'um_session'
const JWT_SECRET = process.env.AUTH_JWT_SECRET
const DATABASE_URL = process.env.DATABASE_URL

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
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

    // Build where conditions
    let whereConditions = [
      eq(schema.invoices.status, 'pending')
    ]

    // Clients only see their own invoices
    if (payload.role !== 'admin') {
      whereConditions.push(eq(schema.invoices.contactId, payload.userId))
    }

    // Get all pending invoices
    const allInvoices = await db.query.invoices.findMany({
      where: and(...whereConditions),
      with: {
        contact: {
          columns: { id: true, name: true, email: true, company: true }
        },
        project: {
          columns: { id: true, name: true }
        }
      }
    })

    // Filter for overdue and calculate days overdue
    const now = new Date()
    now.setHours(0, 0, 0, 0) // Start of today

    const overdueInvoices = allInvoices
      .filter(invoice => {
        const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null
        return dueDate && dueDate < now
      })
      .map(invoice => {
        const dueDate = new Date(invoice.dueDate)
        const diffTime = now - dueDate
        const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        return {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.amount ? parseFloat(invoice.amount) : 0,
          totalAmount: invoice.totalAmount ? parseFloat(invoice.totalAmount) : 0,
          status: invoice.status,
          daysOverdue: daysOverdue,
          dueDate: invoice.dueDate.toISOString(),
          contactName: invoice.contact?.name,
          contactEmail: invoice.contact?.email,
          company: invoice.contact?.company,
          projectName: invoice.project?.name,
          createdAt: invoice.createdAt?.toISOString()
        }
      })
      // Sort by days overdue (most overdue first)
      .sort((a, b) => b.daysOverdue - a.daysOverdue)

    // Calculate summary
    const totalOverdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        overdueInvoices: overdueInvoices,
        summary: {
          count: overdueInvoices.length,
          totalAmount: totalOverdueAmount,
          oldestDaysOverdue: overdueInvoices.length > 0 ? overdueInvoices[0].daysOverdue : 0
        },
        generatedAt: new Date().toISOString()
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

    console.error('Error fetching overdue invoices:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch overdue invoices',
        message: error.message 
      })
    }
  }
}
