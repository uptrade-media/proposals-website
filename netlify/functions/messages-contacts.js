// netlify/functions/messages-contacts.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'

const JWT_SECRET = process.env.AUTH_JWT_SECRET
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'um_session'

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
      body: JSON.stringify({ error: 'METHOD_NOT_ALLOWED' })
    }
  }

  // Verify authentication
  const cookie = event.headers.cookie || ''
  const token = cookie.split('; ').find(c => c.startsWith(`${COOKIE_NAME}=`))?.split('=')[1]
  
  if (!token) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'UNAUTHORIZED' })
    }
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const userId = payload.userId || payload.sub

    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'INVALID_TOKEN' })
      }
    }

    // Connect to database
    const sql = neon(process.env.DATABASE_URL)

    // Get all contacts (users who can receive messages)
    // For admin users, get all clients
    // For client users, get admin users
    const userRole = payload.role || 'client'

    let contacts
    if (userRole === 'admin') {
      // Admin can message all clients
      contacts = await sql`
        SELECT 
          id,
          name,
          email,
          company,
          role
        FROM contacts
        WHERE role = 'client'
        ORDER BY name ASC
      `
    } else {
      // Clients can message admins
      contacts = await sql`
        SELECT 
          id,
          name,
          email,
          company,
          role
        FROM contacts
        WHERE role = 'admin'
        ORDER BY name ASC
      `
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        contacts: contacts.map(c => ({
          id: c.id,
          name: c.name,
          email: c.email,
          company: c.company,
          role: c.role
        }))
      })
    }
  } catch (error) {
    console.error('[messages-contacts] Error:', error)
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'INVALID_TOKEN' })
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'INTERNAL_SERVER_ERROR' })
    }
  }
}
