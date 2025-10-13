// netlify/functions/proposals-get.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, or } from 'drizzle-orm'
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

  // Get proposal slug or ID from path
  const identifier = event.path.split('/').pop()
  if (!identifier) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Proposal slug or ID required' })
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

    // Fetch proposal by slug or ID
    const proposal = await db.query.proposals.findFirst({
      where: or(
        eq(schema.proposals.slug, identifier),
        eq(schema.proposals.id, identifier)
      ),
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
            description: true,
            status: true,
            startDate: true,
            endDate: true
          }
        }
      }
    })

    if (!proposal) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Proposal not found' })
      }
    }

    // Check authorization
    // Admins can see all proposals, clients can only see their own
    if (payload.role !== 'admin' && proposal.contactId !== payload.userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Not authorized to view this proposal' })
      }
    }

    // Format response (include full MDX content)
    const formattedProposal = {
      id: proposal.id,
      slug: proposal.slug,
      title: proposal.title,
      mdxContent: proposal.mdxContent,
      status: proposal.status,
      totalAmount: proposal.totalAmount ? parseFloat(proposal.totalAmount) : null,
      validUntil: proposal.validUntil,
      signedAt: proposal.signedAt,
      adminSignedAt: proposal.adminSignedAt,
      fullyExecutedAt: proposal.fullyExecutedAt,
      createdAt: proposal.createdAt,
      updatedAt: proposal.updatedAt,
      contact: proposal.contact ? {
        id: proposal.contact.id,
        name: proposal.contact.name,
        email: proposal.contact.email,
        company: proposal.contact.company,
        avatar: proposal.contact.avatar
      } : null,
      project: proposal.project ? {
        id: proposal.project.id,
        title: proposal.project.title,
        description: proposal.project.description,
        status: proposal.project.status,
        startDate: proposal.project.startDate,
        endDate: proposal.project.endDate
      } : null
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ proposal: formattedProposal })
    }

  } catch (error) {
    console.error('Error fetching proposal:', error)
    
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
        error: 'Failed to fetch proposal',
        message: error.message 
      })
    }
  }
}
