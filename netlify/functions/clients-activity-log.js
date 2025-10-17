// netlify/functions/clients-activity-log.js
import { neon } from '@neondatabase/serverless'
import jwt from 'jsonwebtoken'

const sql = neon(process.env.DATABASE_URL)

export async function handler(event) {
  // CORS headers
  const origin = event.headers.origin || 'http://localhost:8888'
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  }

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

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

  try {
    // GET: Fetch activity log
    if (event.httpMethod === 'GET') {
      const clientId = event.queryStringParameters?.clientId
      const limit = Math.min(parseInt(event.queryStringParameters?.limit || 50), 500)
      const offset = parseInt(event.queryStringParameters?.offset || 0)

      if (!clientId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing clientId' })
        }
      }

      // Verify client exists
      const clientExists = await sql`
        SELECT id FROM contacts WHERE id = ${clientId}::uuid AND role = 'client'
      `

      if (clientExists.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Client not found' })
        }
      }

      // Fetch activity log
      const activity = await sql`
        SELECT 
          id, 
          contact_id, 
          activity_type, 
          description, 
          metadata, 
          created_at
        FROM client_activity
        WHERE contact_id = ${clientId}::uuid
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `

      const totalResult = await sql`
        SELECT COUNT(*) as count FROM client_activity
        WHERE contact_id = ${clientId}::uuid
      `

      const total = totalResult[0].count

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          activity,
          total,
          count: activity.length,
          limit,
          offset
        })
      }
    }

    // POST: Create activity log entry
    if (event.httpMethod === 'POST') {
      const { clientId, activityType, description, metadata } = JSON.parse(event.body || '{}')

      if (!clientId || !activityType || !description) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing required fields: clientId, activityType, description' })
        }
      }

      // Verify client exists
      const clientExists = await sql`
        SELECT id FROM contacts WHERE id = ${clientId}::uuid AND role = 'client'
      `

      if (clientExists.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Client not found' })
        }
      }

      // Validate activity type
      const validTypes = [
        'client_created',
        'client_updated',
        'client_archived',
        'subscription_toggled',
        'bulk_subscription_update',
        'note_added',
        'proposal_sent',
        'proposal_accepted',
        'invoice_created',
        'payment_received',
        'email_sent',
        'call_made',
        'meeting_scheduled',
        'document_sent',
        'custom_event'
      ]

      if (!validTypes.includes(activityType)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: `Invalid activityType. Allowed: ${validTypes.join(', ')}` 
          })
        }
      }

      // Create activity record
      const result = await sql`
        INSERT INTO client_activity (contact_id, activity_type, description, metadata)
        VALUES (
          ${clientId}::uuid,
          ${activityType},
          ${description},
          ${metadata ? JSON.stringify(metadata) : null}
        )
        RETURNING id, contact_id, activity_type, description, metadata, created_at
      `

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Activity logged successfully',
          activity: result[0]
        })
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Activity log error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to process activity log',
        details: error.message
      })
    }
  }
}
