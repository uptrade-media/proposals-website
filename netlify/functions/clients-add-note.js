// netlify/functions/clients-add-note.js
import { neon } from '@neondatabase/serverless'
import jwt from 'jsonwebtoken'

const sql = neon(process.env.DATABASE_URL)

export async function handler(event) {
  // CORS headers
  const origin = event.headers.origin || 'http://localhost:8888'
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  }

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
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

    const { clientId, note } = JSON.parse(event.body || '{}')

    if (!clientId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing client ID' })
      }
    }

    if (!note || note.trim().length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing or empty note' })
      }
    }

    // Truncate note if too long (max 5000 chars)
    const truncatedNote = note.substring(0, 5000)

    // Get current client
    const clientResult = await sql`
      SELECT id, notes FROM contacts
      WHERE id = ${clientId}::uuid AND role = 'client'
    `

    if (clientResult.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Client not found' })
      }
    }

    const currentNotes = clientResult[0].notes || ''

    // Format new note with timestamp
    const timestamp = new Date().toISOString()
    const newNote = currentNotes
      ? `${currentNotes}\n\n[${timestamp}] ${truncatedNote}`
      : `[${timestamp}] ${truncatedNote}`

    // Update client with new note
    const updateResult = await sql`
      UPDATE contacts
      SET notes = ${newNote}, updated_at = NOW()
      WHERE id = ${clientId}::uuid AND role = 'client'
      RETURNING id, email, name, company, notes, updated_at
    `

    if (updateResult.length === 0) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to add note' })
      }
    }

    // Log activity
    try {
      await sql`
        INSERT INTO client_activity (contact_id, activity_type, description, metadata)
        VALUES (
          ${clientId}::uuid,
          'note_added',
          'Internal note added',
          ${JSON.stringify({ note: truncatedNote.substring(0, 200), by: 'admin' })}
        )
      `
    } catch (logError) {
      console.error('Failed to log note activity:', logError)
      // Don't fail the request if logging fails
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Note added successfully',
        client: updateResult[0]
      })
    }
  } catch (error) {
    console.error('Add note error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to add note',
        details: error.message
      })
    }
  }
}
