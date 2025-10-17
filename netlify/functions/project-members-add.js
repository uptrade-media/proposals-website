import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, and } from 'drizzle-orm'
import * as schema from '../../src/db/schema.js'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'um_session'
const JWT_SECRET = process.env.AUTH_JWT_SECRET
const DATABASE_URL = process.env.DATABASE_URL

export async function handler(event) {
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

  try {
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

    const payload = jwt.verify(token, JWT_SECRET)

    // Only admins can add team members
    if (payload.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only admins can add team members' })
      }
    }

    // Get project ID from query
    const projectId = event.queryStringParameters?.projectId || event.queryStringParameters?.id
    if (!projectId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Project ID required' })
      }
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}')
    const { memberId, role = 'member' } = body

    if (!memberId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Member ID is required' })
      }
    }

    if (!['lead', 'member', 'viewer'].includes(role)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid role. Must be: lead, member, or viewer' })
      }
    }

    if (!DATABASE_URL) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database not configured' })
      }
    }

    const sql = neon(DATABASE_URL)
    const db = drizzle(sql, { schema })

    // Verify project exists
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

    // Verify member exists
    const member = await db.query.contacts.findFirst({
      where: eq(schema.contacts.id, memberId)
    })

    if (!member) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Member not found' })
      }
    }

    // Check if member is already on project
    const existingMembership = await db.query.projectMembers.findFirst({
      where: and(
        eq(schema.projectMembers.projectId, projectId),
        eq(schema.projectMembers.memberId, memberId)
      )
    })

    if (existingMembership) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'Member is already on this project' })
      }
    }

    // Add team member
    const projectMember = await db
      .insert(schema.projectMembers)
      .values({
        projectId,
        memberId,
        role
      })
      .returning()

    const created = projectMember[0]

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        member: {
          id: created.id,
          projectId: created.projectId,
          memberId: created.memberId,
          role: created.role,
          joinedAt: created.joinedAt,
          // Include member details
          member: {
            id: member.id,
            name: member.name,
            email: member.email,
            avatar: member.avatar
          }
        }
      })
    }
  } catch (error) {
    console.error('Error adding team member:', error)

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
        error: 'Failed to add team member',
        message: error.message
      })
    }
  }
}
