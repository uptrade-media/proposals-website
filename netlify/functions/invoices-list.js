// netlify/functions/invoices-list.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, desc, and } from 'drizzle-orm'
import * as schema from '../../src/db/schema.ts'

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
    
    // Only Google OAuth users can access invoices
    if (payload.type !== 'google') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only authenticated users can access invoices' })
      }
    }

    // Parse query parameters
    const queryParams = event.queryStringParameters || {}
    const { projectId, status } = queryParams

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
    let whereConditions = []
    
    if (payload.role !== 'admin') {
      // Clients see only their invoices
      whereConditions.push(eq(schema.invoices.contactId, payload.userId))
    }
    
    if (projectId) {
      whereConditions.push(eq(schema.invoices.projectId, projectId))
    }
    
    if (status) {
      whereConditions.push(eq(schema.invoices.status, status))
    }

    // Fetch invoices
    const invoices = await db.query.invoices.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      orderBy: [desc(schema.invoices.createdAt)],
      with: {
        contact: {
          columns: {
            id: true,
            name: true,
            email: true,
            company: true
          }
        },
        project: {
          columns: {
            id: true,
            title: true
          }
        }
      }
    })

    // Format response
    const formattedInvoices = invoices.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      squareInvoiceId: inv.squareInvoiceId,
      amount: inv.amount ? parseFloat(inv.amount) : 0,
      taxRate: inv.taxRate ? parseFloat(inv.taxRate) : 0,
      taxAmount: inv.taxAmount ? parseFloat(inv.taxAmount) : 0,
      totalAmount: inv.totalAmount ? parseFloat(inv.totalAmount) : 0,
      status: inv.status,
      description: inv.description,
      dueDate: inv.dueDate,
      paidAt: inv.paidAt,
      createdAt: inv.createdAt,
      updatedAt: inv.updatedAt,
      // Include contact info for admin view
      ...(payload.role === 'admin' && inv.contact ? {
        contact: {
          id: inv.contact.id,
          name: inv.contact.name,
          email: inv.contact.email,
          company: inv.contact.company
        }
      } : {}),
      // Include project info if linked
      ...(inv.project ? {
        project: {
          id: inv.project.id,
          title: inv.project.title
        }
      } : {})
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        invoices: formattedInvoices,
        total: formattedInvoices.length
      })
    }

  } catch (error) {
    console.error('Error fetching invoices:', error)
    
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
        error: 'Failed to fetch invoices',
        message: error.message 
      })
    }
  }
}
