// netlify/functions/clients-subscribe-toggle.js
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

    const { id, subscribed } = JSON.parse(event.body || '{}')

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing client ID' })
      }
    }

    if (subscribed === undefined || subscribed === null) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing subscribed status' })
      }
    }

    // Update subscription status
    const result = await sql`
      UPDATE contacts
      SET subscribed = ${subscribed}, updated_at = NOW()
      WHERE id = ${id}::uuid AND role = 'client'
      RETURNING id, email, name, company, subscribed, updated_at
    `

    if (result.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Client not found' })
      }
    }

    const client = result[0]

    // Log activity
    try {
      const description = `Subscription status changed to ${subscribed ? 'subscribed' : 'unsubscribed'}`
      await sql`
        INSERT INTO client_activity (contact_id, activity_type, description, metadata)
        VALUES (
          ${id}::uuid,
          'subscription_toggled',
          ${description},
          ${JSON.stringify({ previous: !subscribed, new: subscribed, by: 'admin' })}
        )
      `
    } catch (logError) {
      console.error('Failed to log activity:', logError)
      // Don't fail the request if logging fails
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        client,
        message: `Client ${subscribed ? 'subscribed' : 'unsubscribed'} successfully`
      })
    }
  } catch (error) {
    console.error('Subscription toggle error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to toggle subscription',
        details: error.message
      })
    }
  }
}
