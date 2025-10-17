// netlify/functions/messages-conversations.js
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

    // Get conversations: unique users this person has messaged with
    // Include most recent message for each conversation
    const conversations = await sql`
      WITH latest_messages AS (
        SELECT DISTINCT ON (
          CASE 
            WHEN sender_id = ${userId} THEN recipient_id
            ELSE sender_id
          END
        )
          CASE 
            WHEN sender_id = ${userId} THEN recipient_id
            ELSE sender_id
          END as partner_id,
          id as message_id,
          subject,
          content,
          created_at,
          read_at,
          sender_id
        FROM messages
        WHERE sender_id = ${userId} OR recipient_id = ${userId}
        ORDER BY 
          CASE 
            WHEN sender_id = ${userId} THEN recipient_id
            ELSE sender_id
          END,
          created_at DESC
      )
      SELECT 
        lm.partner_id,
        lm.message_id,
        lm.subject,
        lm.content,
        lm.created_at,
        lm.read_at,
        lm.sender_id,
        c.name as partner_name,
        c.email as partner_email,
        c.company as partner_company,
        COUNT(CASE WHEN m.read_at IS NULL AND m.recipient_id = ${userId} THEN 1 END) as unread_count
      FROM latest_messages lm
      JOIN contacts c ON c.id = lm.partner_id
      LEFT JOIN messages m ON (
        (m.sender_id = lm.partner_id AND m.recipient_id = ${userId})
        OR (m.sender_id = ${userId} AND m.recipient_id = lm.partner_id)
      )
      GROUP BY 
        lm.partner_id, 
        lm.message_id, 
        lm.subject, 
        lm.content, 
        lm.created_at, 
        lm.read_at, 
        lm.sender_id,
        c.name,
        c.email,
        c.company
      ORDER BY lm.created_at DESC
    `

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        conversations: conversations.map(conv => ({
          partnerId: conv.partner_id,
          partnerName: conv.partner_name,
          partnerEmail: conv.partner_email,
          partnerCompany: conv.partner_company,
          lastMessage: {
            id: conv.message_id,
            subject: conv.subject,
            content: conv.content,
            createdAt: conv.created_at,
            readAt: conv.read_at,
            isFromMe: conv.sender_id === userId
          },
          unreadCount: parseInt(conv.unread_count) || 0
        }))
      })
    }
  } catch (error) {
    console.error('[messages-conversations] Error:', error)
    
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
      body: JSON.stringify({ 
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message 
      })
    }
  }
}
