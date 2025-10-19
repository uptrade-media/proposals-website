// netlify/functions/proposals-get.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, or } from 'drizzle-orm'
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

  // Get proposal slug or ID from query parameter or path
  const identifier = event.queryStringParameters?.id || event.path.split('/').pop()
  if (!identifier || identifier === 'proposals-get') {
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
    
    // Verify user is authenticated (accept all auth types: google, password, email, etc)
    if (!payload.userId && !payload.email) {
      console.error('Invalid session token')
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Invalid session' })
      }
    }

    // Connect to database
    if (!DATABASE_URL) {
      console.error('DATABASE_URL not configured')
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
        },
        activity: {
          orderBy: (activity) => [activity.createdAt],
          with: {
            performer: {
              columns: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            }
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
      description: proposal.description,
      mdxContent: proposal.mdxContent,
      status: proposal.status,
      version: proposal.version,
      totalAmount: proposal.totalAmount ? parseFloat(proposal.totalAmount) : null,
      validUntil: proposal.validUntil,
      sentAt: proposal.sentAt,
      viewedAt: proposal.viewedAt,
      clientEmail: proposal.clientEmail,
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
      } : null,
      activity: proposal.activity?.map(a => ({
        id: a.id,
        action: a.action,
        performedBy: a.performedBy,
        performer: a.performer ? {
          id: a.performer.id,
          name: a.performer.name,
          email: a.performer.email,
          avatar: a.performer.avatar
        } : null,
        metadata: a.metadata ? JSON.parse(a.metadata) : null,
        createdAt: a.createdAt
      })) || []
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ proposal: formattedProposal })
    }

  } catch (error) {
    console.error('=== ERROR IN PROPOSALS-GET ===')
    console.error('Error type:', error.constructor.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
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
