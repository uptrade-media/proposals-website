// netlify/functions/projects-update.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as schema from '../../src/db/schema.ts'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'um_session'
const JWT_SECRET = process.env.AUTH_JWT_SECRET
const DATABASE_URL = process.env.DATABASE_URL

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'PUT, PATCH, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'PUT' && event.httpMethod !== 'PATCH') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Get project ID from path
  const projectId = event.path.split('/').pop()
  if (!projectId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Project ID required' })
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
    
    // Only admins can update projects
    if (payload.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only admins can update projects' })
      }
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}')
    const { 
      title, 
      description, 
      status,
      budget,
      startDate,
      endDate
    } = body

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

    // Check if project exists
    const existingProject = await db.query.projects.findFirst({
      where: eq(schema.projects.id, projectId)
    })

    if (!existingProject) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Project not found' })
      }
    }

    // Build update object (only include fields that were provided)
    const updates = {
      updatedAt: new Date()
    }

    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (status !== undefined) updates.status = status
    if (budget !== undefined) updates.budget = budget ? String(budget) : null
    if (startDate !== undefined) updates.startDate = startDate ? new Date(startDate) : null
    if (endDate !== undefined) updates.endDate = endDate ? new Date(endDate) : null

    // Update project
    const [updatedProject] = await db
      .update(schema.projects)
      .set(updates)
      .where(eq(schema.projects.id, projectId))
      .returning()

    // Format response
    const formattedProject = {
      id: updatedProject.id,
      contactId: updatedProject.contactId,
      title: updatedProject.title,
      description: updatedProject.description,
      status: updatedProject.status,
      budget: updatedProject.budget ? parseFloat(updatedProject.budget) : null,
      startDate: updatedProject.startDate,
      endDate: updatedProject.endDate,
      createdAt: updatedProject.createdAt,
      updatedAt: updatedProject.updatedAt
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        project: formattedProject,
        message: 'Project updated successfully'
      })
    }

  } catch (error) {
    console.error('Error updating project:', error)
    
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
        error: 'Failed to update project',
        message: error.message 
      })
    }
  }
}
