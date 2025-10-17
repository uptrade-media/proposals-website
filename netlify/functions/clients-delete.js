// netlify/functions/clients-delete.js
import { neon } from '@neondatabase/serverless'
import jwt from 'jsonwebtoken'

const sql = neon(process.env.DATABASE_URL)

export async function handler(event) {
  // CORS headers
  const origin = event.headers.origin || 'http://localhost:8888'
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  }

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
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
    const token = event.headers.cookie?.match(/um_session=([^;]+)/)?.[1]
    if (!token) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }

    const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET)

    // Verify admin role
    if (payload.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      }
    }

    // Extract ID from path or body
    const pathMatch = event.path?.match(/\/clients-delete\/([^/]+)/)
    const { id } = JSON.parse(event.body || '{}')
    const clientId = pathMatch?.[1] || id

    if (!clientId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing client ID' })
      }
    }

    // Get client before deletion (for logging)
    const clientResult = await sql`
      SELECT id, email, name, company FROM contacts
      WHERE id = ${clientId}::uuid AND role = 'client'
    `

    if (clientResult.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Client not found' })
      }
    }

    const client = clientResult[0]

    // Soft delete: Set password and googleId to NULL, mark as archived via notes
    const deleteResult = await sql`
      UPDATE contacts
      SET 
        password = NULL,
        googleId = NULL,
        notes = CONCAT(notes, ' [ARCHIVED: ', NOW(), ']'),
        updated_at = NOW()
      WHERE id = ${clientId}::uuid AND role = 'client'
      RETURNING id, email, name, company, updated_at
    `

    if (deleteResult.length === 0) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to archive client' })
      }
    }

    // Log activity
    try {
      await sql`
        INSERT INTO client_activity (contact_id, activity_type, description, metadata)
        VALUES (
          ${clientId}::uuid,
          'client_archived',
          'Client archived by admin',
          ${JSON.stringify({ email: client.email, name: client.name, by: 'admin', timestamp: new Date().toISOString() })}
        )
      `
    } catch (logError) {
      console.error('Failed to log delete activity:', logError)
      // Don't fail the request if logging fails
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Client ${client.email} has been archived`,
        client: deleteResult[0]
      })
    }
  } catch (error) {
    console.error('Client delete error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to archive client',
        details: error.message
      })
    }
  }
}
