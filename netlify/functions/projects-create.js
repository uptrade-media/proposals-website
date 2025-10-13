// netlify/functions/projects-create.js
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
    
    // Only admins can create projects
    if (payload.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only admins can create projects' })
      }
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}')
    const { 
      contactId, 
      title, 
      description, 
      status = 'planning',
      budget,
      startDate,
      endDate
    } = body

    // Validate required fields
    if (!contactId || !title) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'contactId and title are required' })
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

    // Verify contact exists
    const contact = await db.query.contacts.findFirst({
      where: eq(schema.contacts.id, contactId)
    })

    if (!contact) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Contact not found' })
      }
    }

    // Create project
    const [project] = await db.insert(schema.projects).values({
      contactId,
      title,
      description,
      status,
      budget: budget ? String(budget) : null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    }).returning()

    // Format response
    const formattedProject = {
      id: project.id,
      contactId: project.contactId,
      title: project.title,
      description: project.description,
      status: project.status,
      budget: project.budget ? parseFloat(project.budget) : null,
      startDate: project.startDate,
      endDate: project.endDate,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        project: formattedProject,
        message: 'Project created successfully'
      })
    }

  } catch (error) {
    console.error('Error creating project:', error)
    
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
        error: 'Failed to create project',
        message: error.message 
      })
    }
  }
}
