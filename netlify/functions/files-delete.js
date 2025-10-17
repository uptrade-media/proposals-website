// netlify/functions/files-delete.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import { getStore } from '@netlify/blobs'
import * as schema from '../../src/db/schema.js'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'um_session'
const JWT_SECRET = process.env.AUTH_JWT_SECRET
const DATABASE_URL = process.env.DATABASE_URL

export async function handler(event) {
  // CORS headers
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

  // Get file ID from path
  const fileId = event.path.split('/').pop()
  if (!fileId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'File ID required' })
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
    
    // Only Google OAuth users can delete files
    if (payload.type !== 'google' && payload.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only authenticated users can delete files' })
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

    // Fetch file metadata
    const file = await db.query.files.findFirst({
      where: eq(schema.files.id, fileId)
    })

    if (!file) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'File not found' })
      }
    }

    // Check authorization
    // Admins can delete any file
    // Clients can only delete their own files
    if (payload.role !== 'admin' && file.uploadedBy !== payload.userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Not authorized to delete this file' })
      }
    }

    // Delete from Netlify Blobs
    const store = getStore('uploads')
    try {
      await store.delete(file.blobPath)
    } catch (blobError) {
      console.error('Error deleting from Netlify Blobs:', blobError)
      // Continue to delete from database even if blob deletion fails
    }

    // Delete from database
    await db
      .delete(schema.files)
      .where(eq(schema.files.id, fileId))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'File deleted successfully',
        fileId: fileId
      })
    }

  } catch (error) {
    console.error('Error deleting file:', error)
    
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
        error: 'Failed to delete file',
        message: error.message 
      })
    }
  }
}
