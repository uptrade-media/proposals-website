// netlify/functions/messages-read.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as schema from '../../src/db/schema.ts'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'um_session'
const JWT_SECRET = process.env.AUTH_JWT_SECRET
const DATABASE_URL = process.env.DATABASE_URL

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

  // Get message ID from path
  const messageId = event.path.split('/').filter(p => p).pop()
  if (!messageId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Message ID required' })
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
    
    // Verify user is authenticated (accept all auth types: google, password, email, etc)
    if (!payload.userId && !payload.email) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Invalid session' })
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

    // Fetch message
    const message = await db.query.messages.findFirst({
      where: eq(schema.messages.id, messageId)
    })

    if (!message) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Message not found' })
      }
    }

    // Verify user is the recipient
    if (message.recipientId !== payload.userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only the recipient can mark this message as read' })
      }
    }

    // Check if already read
    if (message.readAt) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          message: 'Message already marked as read',
          readAt: message.readAt
        })
      }
    }

    // Mark as read
    const [updatedMessage] = await db
      .update(schema.messages)
      .set({ readAt: new Date() })
      .where(eq(schema.messages.id, messageId))
      .returning()

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Message marked as read',
        readAt: updatedMessage.readAt
      })
    }

  } catch (error) {
    console.error('Error marking message as read:', error)
    
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
        error: 'Failed to mark message as read',
        message: error.message 
      })
    }
  }
}
