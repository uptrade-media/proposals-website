import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as schema from '../../src/db/schema.ts'

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

    // Only admins can create milestones
    if (payload.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only admins can create milestones' })
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
    const { title, description, dueDate, status = 'pending' } = body

    if (!title) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Title is required' })
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

    // Get next order number
    const existingMilestones = await db
      .select()
      .from(schema.projectMilestones)
      .where(eq(schema.projectMilestones.projectId, projectId))

    const nextOrder = existingMilestones.length

    // Create milestone
    const milestone = await db
      .insert(schema.projectMilestones)
      .values({
        projectId,
        title,
        description: description || null,
        status,
        dueDate: dueDate ? new Date(dueDate) : null,
        order: nextOrder
      })
      .returning()

    const createdMilestone = milestone[0]

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        milestone: {
          id: createdMilestone.id,
          projectId: createdMilestone.projectId,
          title: createdMilestone.title,
          description: createdMilestone.description,
          status: createdMilestone.status,
          dueDate: createdMilestone.dueDate,
          completedAt: createdMilestone.completedAt,
          order: createdMilestone.order,
          createdAt: createdMilestone.createdAt,
          updatedAt: createdMilestone.updatedAt
        }
      })
    }
  } catch (error) {
    console.error('Error creating milestone:', error)

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
        error: 'Failed to create milestone',
        message: error.message
      })
    }
  }
}
