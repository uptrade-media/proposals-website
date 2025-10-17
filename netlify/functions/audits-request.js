// netlify/functions/audits-request.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as schema from '../../src/db/schema.js'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'um_session'
const JWT_SECRET = process.env.AUTH_JWT_SECRET
const DATABASE_URL = process.env.DATABASE_URL
const MAIN_SITE_AUDIT_ENDPOINT = process.env.MAIN_SITE_AUDIT_ENDPOINT || 'https://uptrademedia.com/.netlify/functions/audit-request'

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
    const userId = payload.userId || payload.sub

    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      }
    }

    // Parse request body
    const { url, projectId } = JSON.parse(event.body || '{}')

    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URL is required' })
      }
    }

    // projectId is optional - if not provided, we'll create a default project or skip it
    // For now, projectId is required by schema
    if (!projectId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Project ID is required' })
      }
    }

    // Validate URL format
    let targetUrl
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
      targetUrl = urlObj.toString()
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid URL format' })
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

    // Get user info
    const user = await db.query.contacts.findFirst({
      where: eq(schema.contacts.id, userId)
    })

    if (!user) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      }
    }

    // Create audit record
    const [newAudit] = await db
      .insert(schema.audits)
      .values({
        projectId,
        contactId: userId,
        targetUrl,
        status: 'pending',
        deviceType: 'mobile',
        throttlingProfile: '4g',
        createdAt: new Date()
      })
      .returning()

    // Trigger audit on main website (async, don't wait)
    fetch(MAIN_SITE_AUDIT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: user.email,
        url: targetUrl,
        auditId: newAudit.id,
        source: 'portal'
      })
    }).catch(err => {
      console.error('Failed to trigger audit on main site:', err)
    })

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        auditId: newAudit.id,
        status: 'pending',
        message: 'Audit queued for processing. This usually takes 2-3 minutes.'
      })
    }

  } catch (error) {
    console.error('Error requesting audit:', error)
    
    if (error.name === 'JsonWebTokenError') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to request audit' })
    }
  }
}
