// netlify/functions/admin-clients-delete.js
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
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'DELETE') {
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

    // Only admins can delete clients
    if (payload.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      }
    }

    // Get client ID from path
    const clientId = event.path.split('/').pop()

    if (!clientId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Client ID is required' })
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

    // Verify client exists
    const existingClient = await db.query.contacts.findFirst({
      where: eq(schema.contacts.id, clientId)
    })

    if (!existingClient) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Client not found' })
      }
    }

    // Prevent deleting yourself
    if (clientId === payload.userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Cannot delete your own account' })
      }
    }

    // Check if client has related data
    const projects = await db.query.projects.findMany({
      where: eq(schema.projects.contactId, clientId)
    })

    const invoices = await db.query.invoices.findMany({
      where: eq(schema.invoices.contactId, clientId)
    })

    const proposals = await db.query.proposals.findMany({
      where: eq(schema.proposals.contactId, clientId)
    })

    const messages = await db.query.messages.findMany({
      where: eq(schema.messages.contactId, clientId)
    })

    const files = await db.query.files.findMany({
      where: eq(schema.files.contactId, clientId)
    })

    // If client has data, we should archive instead of delete
    // For now, we'll return info about what would be deleted
    const hasRelatedData = 
      projects.length > 0 || 
      invoices.length > 0 || 
      proposals.length > 0 || 
      messages.length > 0 || 
      files.length > 0

    if (hasRelatedData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Cannot delete client with existing data',
          details: {
            projects: projects.length,
            invoices: invoices.length,
            proposals: proposals.length,
            messages: messages.length,
            files: files.length
          },
          suggestion: 'Consider updating the client role or company name instead of deleting'
        })
      }
    }

    // Delete client (only if no related data)
    await db.delete(schema.contacts)
      .where(eq(schema.contacts.id, clientId))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Client deleted successfully',
        clientId
      })
    }

  } catch (error) {
    console.error('Error deleting client:', error)
    
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
        error: 'Failed to delete client',
        message: error.message 
      })
    }
  }
}
