// netlify/functions/messages-thread.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, or, desc } from 'drizzle-orm'
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
    
    // Only Google OAuth users can access message threads
    if (payload.type !== 'google') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only authenticated users can access message threads' })
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

    // Fetch root message
    const rootMessage = await db.query.messages.findFirst({
      where: eq(schema.messages.id, messageId),
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

    if (!rootMessage) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Message not found' })
      }
    }

    // Check authorization
    // User must be sender or recipient
    if (payload.role !== 'admin' && 
        rootMessage.senderId !== payload.userId && 
        rootMessage.recipientId !== payload.userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Not authorized to view this thread' })
      }
    }

    // If this is a reply, fetch the root message
    let threadRoot = rootMessage
    if (rootMessage.parentId) {
      threadRoot = await db.query.messages.findFirst({
        where: eq(schema.messages.id, rootMessage.parentId),
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
    }

    // Fetch all replies to the root message
    const replies = await db.query.messages.findMany({
      where: eq(schema.messages.parentId, threadRoot.id),
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
        }
      }
    })

    // Format thread
    const thread = {
      root: {
        id: threadRoot.id,
        senderId: threadRoot.senderId,
        recipientId: threadRoot.recipientId,
        subject: threadRoot.subject,
        content: threadRoot.content,
        readAt: threadRoot.readAt,
        createdAt: threadRoot.createdAt,
        sender: threadRoot.sender ? {
          id: threadRoot.sender.id,
          name: threadRoot.sender.name,
          email: threadRoot.sender.email,
          avatar: threadRoot.sender.avatar
        } : null,
        recipient: threadRoot.recipient ? {
          id: threadRoot.recipient.id,
          name: threadRoot.recipient.name,
          email: threadRoot.recipient.email,
          avatar: threadRoot.recipient.avatar
        } : null,
        project: threadRoot.project ? {
          id: threadRoot.project.id,
          title: threadRoot.project.title
        } : null
      },
      replies: replies.map(r => ({
        id: r.id,
        senderId: r.senderId,
        recipientId: r.recipientId,
        subject: r.subject,
        content: r.content,
        readAt: r.readAt,
        createdAt: r.createdAt,
        sender: r.sender ? {
          id: r.sender.id,
          name: r.sender.name,
          email: r.sender.email,
          avatar: r.sender.avatar
        } : null,
        recipient: r.recipient ? {
          id: r.recipient.id,
          name: r.recipient.name,
          email: r.recipient.email,
          avatar: r.recipient.avatar
        } : null
      })),
      totalMessages: 1 + replies.length
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ thread })
    }

  } catch (error) {
    console.error('Error fetching message thread:', error)
    
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
        error: 'Failed to fetch message thread',
        message: error.message 
      })
    }
  }
}
