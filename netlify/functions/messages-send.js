// netlify/functions/messages-send.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import { Resend } from 'resend'
import * as schema from '../../src/db/schema.js'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'um_session'
const JWT_SECRET = process.env.AUTH_JWT_SECRET
const DATABASE_URL = process.env.DATABASE_URL
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'portal@send.uptrademedia.com'

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
    
    // Only Google OAuth users can send messages
    if (payload.type !== 'google' && payload.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only authenticated users can send messages' })
      }
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}')
    const { 
      recipientId,
      subject,
      content,
      projectId,
      parentId
    } = body

    // Validate required fields
    if (!recipientId || !content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'recipientId and content are required' })
      }
    }

    // For new threads, subject is required
    if (!parentId && !subject) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'subject is required for new threads' })
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

    // Verify recipient exists
    const recipient = await db.query.contacts.findFirst({
      where: eq(schema.contacts.id, recipientId)
    })

    if (!recipient) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Recipient not found' })
      }
    }

    // If projectId provided, verify it exists
    if (projectId) {
      const project = await db.query.projects.findFirst({
        where: eq(schema.projects.id, projectId)
      })

      if (!project) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Project not found' })
        }
      }
    }

    // If parentId provided, verify parent message exists
    let parentMessage = null
    if (parentId) {
      parentMessage = await db.query.messages.findFirst({
        where: eq(schema.messages.id, parentId)
      })

      if (!parentMessage) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Parent message not found' })
        }
      }
    }

    // Get sender info for email
    const sender = await db.query.contacts.findFirst({
      where: eq(schema.contacts.id, payload.userId)
    })

    // Create message
    const [message] = await db.insert(schema.messages).values({
      senderId: payload.userId,
      recipientId,
      subject: subject || parentMessage?.subject || 'Re: Conversation',
      content,
      projectId: projectId || parentMessage?.projectId || null,
      parentId: parentId || null
    }).returning()

    // Send email notification to recipient
    if (RESEND_API_KEY && recipient.email) {
      try {
        const resend = new Resend(RESEND_API_KEY)
        const isReply = !!parentId
        
        await resend.emails.send({
          from: RESEND_FROM_EMAIL,
          to: recipient.email,
          subject: isReply ? `Re: ${message.subject}` : `New Message: ${message.subject}`,
          html: `
            <h2>${isReply ? 'New Reply' : 'New Message'}</h2>
            <p><strong>From:</strong> ${sender?.name || 'Team'} (${sender?.email || ''})</p>
            <p><strong>Subject:</strong> ${message.subject}</p>
            <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-left: 4px solid #007bff;">
              ${content.replace(/\n/g, '<br>')}
            </div>
            <p><a href="${process.env.URL}/messages/${message.id}">View Message</a></p>
          `
        })
      } catch (emailError) {
        console.error('Failed to send message notification:', emailError)
        // Don't fail the request if email fails
      }
    }

    // Format response
    const formattedMessage = {
      id: message.id,
      senderId: message.senderId,
      recipientId: message.recipientId,
      subject: message.subject,
      content: message.content,
      projectId: message.projectId,
      parentId: message.parentId,
      readAt: message.readAt,
      createdAt: message.createdAt
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        message: formattedMessage,
        notification: 'Message sent successfully'
      })
    }

  } catch (error) {
    console.error('Error sending message:', error)
    
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
        error: 'Failed to send message',
        message: error.message 
      })
    }
  }
}
