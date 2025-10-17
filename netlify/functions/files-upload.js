// netlify/functions/files-upload.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import { getStore } from '@netlify/blobs'
import * as schema from '../../src/db/schema.js'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'um_session'
const JWT_SECRET = process.env.AUTH_JWT_SECRET
const DATABASE_URL = process.env.DATABASE_URL

// File size limit: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

// Allowed MIME types
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv'
]

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
    
    // Only Google OAuth users can upload files
    if (payload.type !== 'google') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only authenticated users can upload files' })
      }
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}')
    const { 
      filename,
      mimeType,
      fileSize,
      base64Data,
      projectId,
      category = 'general',
      isPublic = false
    } = body

    // Validate required fields
    if (!filename || !mimeType || !fileSize || !base64Data) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'filename, mimeType, fileSize, and base64Data are required' })
      }
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` })
      }
    }

    // Validate MIME type
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'File type not allowed' })
      }
    }

    // Sanitize filename
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')

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

    // If projectId provided, verify it exists and user has access
    if (projectId) {
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

      // Check authorization
      if (payload.role !== 'admin' && project.contactId !== payload.userId) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Not authorized to upload files to this project' })
        }
      }
    }

    // Upload to Netlify Blobs
    const store = getStore('uploads')
    const timestamp = Date.now()
    const blobPath = `${category}/${timestamp}-${sanitizedFilename}`
    
    // Convert base64 to buffer
    const fileBuffer = Buffer.from(base64Data, 'base64')
    
    // Store in Netlify Blobs
    await store.set(blobPath, fileBuffer, {
      metadata: {
        originalFilename: filename,
        mimeType,
        uploadedBy: payload.userId,
        projectId: projectId || '',
        category
      }
    })

    // Save metadata to database
    const [file] = await db.insert(schema.files).values({
      contactId: payload.userId,
      projectId: projectId || null,
      filename: sanitizedFilename,
      blobPath,
      mimeType,
      fileSize,
      category,
      isPublic,
      uploadedBy: payload.userId
    }).returning()

    // Format response
    const formattedFile = {
      id: file.id,
      filename: file.filename,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      category: file.category,
      isPublic: file.isPublic,
      blobPath: file.blobPath,
      uploadedAt: file.uploadedAt,
      projectId: file.projectId
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        file: formattedFile,
        message: 'File uploaded successfully'
      })
    }

  } catch (error) {
    console.error('Error uploading file:', error)
    
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
        error: 'Failed to upload file',
        message: error.message 
      })
    }
  }
}
