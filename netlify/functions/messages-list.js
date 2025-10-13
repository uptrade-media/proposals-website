// netlify/functions/messages-list.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, desc, and, or, isNull } from 'drizzle-orm'
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
    
    // Only Google OAuth users can access messages
    if (payload.type !== 'google') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only authenticated users can access messages' })
      }
    }

    // Parse query parameters
    const queryParams = event.queryStringParameters || {}
    const { projectId, unreadOnly } = queryParams

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
    
    // Only fetch root messages (not replies) for list view
    whereConditions.push(isNull(schema.messages.parentId))
    
    if (payload.role !== 'admin') {
      // Clients see messages where they are sender or recipient
      whereConditions.push(
        or(
          eq(schema.messages.senderId, payload.userId),
          eq(schema.messages.recipientId, payload.userId)
        )
      )
    }
    
    if (projectId) {
      whereConditions.push(eq(schema.messages.projectId, projectId))
    }
    
    if (unreadOnly === 'true') {
      whereConditions.push(isNull(schema.messages.readAt))
    }

    // Fetch messages
    const messages = await db.query.messages.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      orderBy: [desc(schema.messages.createdAt)],
      with: {
        sender: {
          columns: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        recipient: {
          columns: {
            id: true,
            name: true,
            email: true,
            avatar: true
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

    // Get reply counts for each message
    const messagesWithReplies = await Promise.all(
      messages.map(async (msg) => {
        const replies = await db.query.messages.findMany({
          where: eq(schema.messages.parentId, msg.id)
        })
        
        return {
          id: msg.id,
          subject: msg.subject,
          content: msg.content,
          readAt: msg.readAt,
          createdAt: msg.createdAt,
          replyCount: replies.length,
          sender: msg.sender ? {
            id: msg.sender.id,
            name: msg.sender.name,
            email: msg.sender.email,
            avatar: msg.sender.avatar
          } : null,
          recipient: msg.recipient ? {
            id: msg.recipient.id,
            name: msg.recipient.name,
            email: msg.recipient.email,
            avatar: msg.recipient.avatar
          } : null,
          project: msg.project ? {
            id: msg.project.id,
            title: msg.project.title
          } : null
        }
      })
    )

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        messages: messagesWithReplies,
        total: messagesWithReplies.length
      })
    }

  } catch (error) {
    console.error('Error fetching messages:', error)
    
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
        error: 'Failed to fetch messages',
        message: error.message 
      })
    }
  }
}
