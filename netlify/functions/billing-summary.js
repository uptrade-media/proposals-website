// netlify/functions/billing-summary.js
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

    // Build where conditions based on role
    let whereConditions = []

    if (payload.role !== 'admin') {
      // Clients only see their own invoices
      whereConditions.push(eq(schema.invoices.contactId, payload.userId))
    }

    // Get all invoices for calculations
    const allInvoices = await db.query.invoices.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      with: {
        contact: {
          columns: { id: true, name: true, email: true, company: true }
        },
        project: {
          columns: { id: true, name: true }
        }
      }
    })

    // Calculate summary statistics
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    let totalRevenue = 0
    let thisMonthRevenue = 0
    let pendingAmount = 0
    let overdueCount = 0
    let recentInvoices = []

    allInvoices.forEach(invoice => {
      const total = parseFloat(invoice.totalAmount) || 0

      // Total revenue (all paid invoices)
      if (invoice.status === 'paid') {
        totalRevenue += total

        // This month's revenue
        const paidDate = invoice.paidAt ? new Date(invoice.paidAt) : null
        if (paidDate && paidDate >= thisMonthStart) {
          thisMonthRevenue += total
        }
      }

      // Pending amount (pending + overdue invoices)
      if (invoice.status === 'pending' || invoice.status === 'overdue') {
        pendingAmount += total

        // Count overdue
        if (invoice.status === 'pending') {
          const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null
          if (dueDate && dueDate < now) {
            overdueCount += 1
          }
        }
      }
    })

    // Get recent invoices (5 most recent)
    const sortedInvoices = allInvoices.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return dateB - dateA
    }).slice(0, 5)

    recentInvoices = sortedInvoices.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      amount: inv.amount ? parseFloat(inv.amount) : 0,
      totalAmount: inv.totalAmount ? parseFloat(inv.totalAmount) : 0,
      status: inv.status,
      contactName: inv.contact?.name,
      projectName: inv.project?.name,
      dueDate: inv.dueDate?.toISOString(),
      createdAt: inv.createdAt?.toISOString()
    }))

    // Get payment method breakdown (paid invoices)
    const paidInvoices = allInvoices.filter(inv => inv.status === 'paid')
    const squarePayments = paidInvoices.filter(inv => inv.squarePaymentId).length
    const otherPayments = paidInvoices.length - squarePayments

    const summary = {
      totalRevenue: totalRevenue,
      thisMonthRevenue: thisMonthRevenue,
      pendingAmount: pendingAmount,
      overdueCount: overdueCount,
      invoiceCount: allInvoices.length,
      paidCount: allInvoices.filter(inv => inv.status === 'paid').length,
      pendingCount: allInvoices.filter(inv => inv.status === 'pending').length,
      overdueAmount: allInvoices
        .filter(inv => inv.status === 'pending' && inv.dueDate && new Date(inv.dueDate) < now)
        .reduce((sum, inv) => sum + (parseFloat(inv.totalAmount) || 0), 0),
      paymentMethods: {
        square: squarePayments,
        other: otherPayments,
        total: paidInvoices.length
      },
      recentInvoices: recentInvoices,
      generatedAt: new Date().toISOString()
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ summary })
    }

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired session' })
      }
    }

    console.error('Error fetching billing summary:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch billing summary',
        message: error.message 
      })
    }
  }
}
