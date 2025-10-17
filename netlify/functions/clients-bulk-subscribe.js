// netlify/functions/clients-bulk-subscribe.js
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

    const { clientIds, subscribed } = JSON.parse(event.body || '{}')

    if (!Array.isArray(clientIds) || clientIds.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing or empty clientIds array' })
      }
    }

    if (subscribed === undefined || subscribed === null) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing subscribed status' })
      }
    }

    // Validate array length (prevent abuse)
    if (clientIds.length > 1000) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Maximum 1000 clients per request' })
      }
    }

    // Update subscription status for multiple clients
    const updateResult = await sql`
      UPDATE contacts
      SET subscribed = ${subscribed}, updated_at = NOW()
      WHERE id = ANY(${clientIds}::uuid[])
      AND role = 'client'
      RETURNING id, email, name, subscribed
    `

    const updated = updateResult.length

    // Log activity for each update (batch operation)
    try {
      const description = `Bulk subscription update to ${subscribed ? 'subscribed' : 'unsubscribed'} (${clientIds.length} clients)`
      await sql`
        INSERT INTO client_activity (contact_id, activity_type, description, metadata)
        SELECT
          ${clientIds[0]}::uuid,
          'bulk_subscription_update',
          ${description},
          ${JSON.stringify({ count: clientIds.length, new_status: subscribed, by: 'admin' })}
        LIMIT 1
      `
    } catch (logError) {
      console.error('Failed to log bulk activity:', logError)
      // Don't fail the request if logging fails
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Updated ${updated} client(s) successfully`,
        requested: clientIds.length,
        updated,
        status: subscribed ? 'subscribed' : 'unsubscribed',
        clients: updateResult
      })
    }
  } catch (error) {
    console.error('Bulk subscription error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to update subscriptions',
        details: error.message
      })
    }
  }
}
