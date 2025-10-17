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
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'DELETE') {
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

    // Only admins can delete milestones
    if (payload.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only admins can delete milestones' })
      }
    }

    // Get IDs from query
    const projectId = event.queryStringParameters?.projectId
    const milestoneId = event.queryStringParameters?.milestoneId

    if (!projectId || !milestoneId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Project ID and Milestone ID required' })
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

    // Verify milestone exists and belongs to project
    const milestone = await db.query.projectMilestones.findFirst({
      where: eq(schema.projectMilestones.id, milestoneId)
    })

    if (!milestone || milestone.projectId !== projectId) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Milestone not found' })
      }
    }

    // Delete the milestone
    await db
      .delete(schema.projectMilestones)
      .where(eq(schema.projectMilestones.id, milestoneId))

    // Reorder remaining milestones
    const remainingMilestones = await db
      .select()
      .from(schema.projectMilestones)
      .where(eq(schema.projectMilestones.projectId, projectId))

    // Update orders for remaining milestones
    for (let i = 0; i < remainingMilestones.length; i++) {
      await db
        .update(schema.projectMilestones)
        .set({ order: i })
        .where(eq(schema.projectMilestones.id, remainingMilestones[i].id))
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Milestone deleted successfully'
      })
    }
  } catch (error) {
    console.error('Error deleting milestone:', error)

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
        error: 'Failed to delete milestone',
        message: error.message
      })
    }
  }
}
