// netlify/functions/admin-clients-update.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import * as schema from '../../src/db/schema.ts'

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

    // Only admins can update clients
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

    // Parse request body
    const body = JSON.parse(event.body || '{}')
    const { name, company, role, password } = body

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

    // Build update object
    const updates = {}

    if (name !== undefined) {
      updates.name = name
    }

    if (company !== undefined) {
      updates.company = company
    }

    if (role !== undefined) {
      // Validate role
      if (!['client', 'admin'].includes(role)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid role. Must be "client" or "admin"' })
        }
      }
      updates.role = role
    }

    // Handle password update
    if (password) {
      if (password.length < 8) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Password must be at least 8 characters' })
        }
      }
      
      const hashedPassword = await bcrypt.hash(password, 10)
      updates.password = hashedPassword
    }

    // Perform update
    const [updatedClient] = await db.update(schema.contacts)
      .set(updates)
      .where(eq(schema.contacts.id, clientId))
      .returning()

    // Format response (exclude password)
    const formattedClient = {
      id: updatedClient.id,
      email: updatedClient.email,
      name: updatedClient.name,
      company: updatedClient.company,
      role: updatedClient.role,
      accountSetup: updatedClient.accountSetup,
      hasGoogleAuth: !!updatedClient.googleId,
      avatar: updatedClient.avatar,
      createdAt: updatedClient.createdAt
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        client: formattedClient,
        message: 'Client updated successfully'
      })
    }

  } catch (error) {
    console.error('Error updating client:', error)
    
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
        error: 'Failed to update client',
        message: error.message 
      })
    }
  }
}
