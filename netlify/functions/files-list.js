// netlify/functions/files-list.js
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
    
    // Only Google OAuth users can access files
    if (payload.type !== 'google') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only authenticated users can access files' })
      }
    }

    // Parse query parameters for filtering
    const queryParams = event.queryStringParameters || {}
    const { projectId, category, isPublic } = queryParams

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
      // Clients see only their files or public files
      whereConditions.push(eq(schema.files.contactId, payload.userId))
    }
    
    if (projectId) {
      whereConditions.push(eq(schema.files.projectId, projectId))
    }
    
    if (category) {
      whereConditions.push(eq(schema.files.category, category))
    }
    
    if (isPublic !== undefined) {
      whereConditions.push(eq(schema.files.isPublic, isPublic === 'true'))
    }

    // Fetch files
    const files = await db.query.files.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      orderBy: [desc(schema.files.uploadedAt)],
      with: {
        contact: {
          columns: {
            id: true,
            name: true,
            email: true
          }
        },
        uploader: {
          columns: {
            id: true,
            name: true,
            email: true
          }
        },
        project: {
          columns: {
            id: true,
            title: true
          }
        }
      }
    })

    // Format response
    const formattedFiles = files.map(f => ({
      id: f.id,
      filename: f.filename,
      mimeType: f.mimeType,
      fileSize: f.fileSize,
      category: f.category,
      isPublic: f.isPublic,
      uploadedAt: f.uploadedAt,
      contact: f.contact ? {
        id: f.contact.id,
        name: f.contact.name,
        email: f.contact.email
      } : null,
      uploader: f.uploader ? {
        id: f.uploader.id,
        name: f.uploader.name,
        email: f.uploader.email
      } : null,
      project: f.project ? {
        id: f.project.id,
        title: f.project.title
      } : null
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        files: formattedFiles,
        total: formattedFiles.length
      })
    }

  } catch (error) {
    console.error('Error fetching files:', error)
    
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
        error: 'Failed to fetch files',
        message: error.message 
      })
    }
  }
}
