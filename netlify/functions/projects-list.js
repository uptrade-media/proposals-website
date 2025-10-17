// netlify/functions/projects-list.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, desc } from 'drizzle-orm'
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
    
    // Only support Google OAuth users (database-backed)
    if (payload.type !== 'google') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only Google OAuth users can access projects' })
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

    // Get query parameters for filtering and sorting
    const queryParams = event.queryStringParameters || {}
    const status = queryParams.status
    const sortBy = queryParams.sortBy || 'updated'
    const limit = Math.min(parseInt(queryParams.limit) || 50, 100)
    const offset = parseInt(queryParams.offset) || 0

    // Fetch user's projects with relationships
    let projects

    if (payload.role === 'admin') {
      // Admin sees all projects
      projects = await db.query.projects.findMany({
        orderBy: [desc(schema.projects.updatedAt)],
        with: {
          contact: true,
          milestones: true,
          members: {
            with: {
              member: true
            }
          },
          invoices: true,
          files: true
        }
      })
    } else {
      // Client sees only their projects
      projects = await db.query.projects.findMany({
        where: eq(schema.projects.contactId, payload.userId),
        orderBy: [desc(schema.projects.updatedAt)],
        with: {
          milestones: true,
          members: {
            with: {
              member: true
            }
          },
          invoices: true,
          files: true
        }
      })
    }

    // Apply status filter
    if (status) {
      projects = projects.filter(p => p.status === status)
    }

    // Apply sorting
    if (sortBy === 'created') {
      projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    } else if (sortBy === 'title') {
      projects.sort((a, b) => a.title.localeCompare(b.title))
    } else if (sortBy === 'dueDate') {
      projects.sort((a, b) => {
        if (!a.endDate) return 1
        if (!b.endDate) return -1
        return new Date(b.endDate) - new Date(a.endDate)
      })
    }

    // Apply pagination
    const paginatedProjects = projects.slice(offset, offset + limit)

    // Format response
    const formattedProjects = paginatedProjects.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      status: p.status,
      budget: p.budget ? parseFloat(p.budget) : null,
      startDate: p.startDate,
      endDate: p.endDate,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      milestoneCount: p.milestones?.length || 0,
      memberCount: p.members?.length || 0,
      invoiceCount: p.invoices?.length || 0,
      fileCount: p.files?.length || 0,
      // Include contact info for admin view
      ...(payload.role === 'admin' && p.contact ? {
        contact: {
          id: p.contact.id,
          name: p.contact.name,
          email: p.contact.email,
          company: p.contact.company
        }
      } : {})
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        projects: formattedProjects,
        pagination: {
          limit,
          offset,
          total: projects.length,
          returned: formattedProjects.length
        }
      })
    }

  } catch (error) {
    console.error('Error fetching projects:', error)
    
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
        error: 'Failed to fetch projects',
        message: error.message 
      })
    }
  }
}
