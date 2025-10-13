// netlify/functions/proposals-list.js
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
    
    // Only support Google OAuth users
    if (payload.type !== 'google') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only Google OAuth users can access proposals' })
      }
    }

    // Parse query parameters for filtering
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
      // Clients see only their proposals
      whereConditions.push(eq(schema.proposals.contactId, payload.userId))
    }
    
    if (projectId) {
      whereConditions.push(eq(schema.proposals.projectId, projectId))
    }
    
    if (status) {
      whereConditions.push(eq(schema.proposals.status, status))
    }

    // Fetch proposals
    const proposals = await db.query.proposals.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      orderBy: [desc(schema.proposals.createdAt)],
      with: {
        contact: {
          columns: {
            id: true,
            name: true,
            email: true,
            company: true,
            avatar: true
          }
        },
        project: {
          columns: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    })

    // Format response (exclude MDX content for list view)
    const formattedProposals = proposals.map(p => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      status: p.status,
      totalAmount: p.totalAmount ? parseFloat(p.totalAmount) : null,
      validUntil: p.validUntil,
      signedAt: p.signedAt,
      adminSignedAt: p.adminSignedAt,
      fullyExecutedAt: p.fullyExecutedAt,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      // Include contact info for admin view
      ...(payload.role === 'admin' && p.contact ? {
        contact: {
          id: p.contact.id,
          name: p.contact.name,
          email: p.contact.email,
          company: p.contact.company,
          avatar: p.contact.avatar
        }
      } : {}),
      // Include project info if linked
      ...(p.project ? {
        project: {
          id: p.project.id,
          title: p.project.title,
          status: p.project.status
        }
      } : {})
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        proposals: formattedProposals,
        total: formattedProposals.length
      })
    }

  } catch (error) {
    console.error('Error fetching proposals:', error)
    
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
        error: 'Failed to fetch proposals',
        message: error.message 
      })
    }
  }
}
