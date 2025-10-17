// netlify/functions/clients-get.js
import { neon } from '@neondatabase/serverless'
import jwt from 'jsonwebtoken'

const sql = neon(process.env.DATABASE_URL)

export async function handler(event) {
  // CORS headers
  const origin = event.headers.origin || 'http://localhost:8888'
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  }

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'GET') {
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

    // Get client ID from query params
    const url = new URL(event.rawUrl || `http://localhost${event.rawPath}`)
    const clientId = url.searchParams.get('id')

    if (!clientId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing client ID' })
      }
    }

    // Get client details
    const client = await sql`
      SELECT 
        id, email, name, company, phone, role, subscribed, source, 
        notes, tags, last_login, created_at, updated_at
      FROM contacts 
      WHERE id = ${clientId} AND role = 'client'
    `

    if (client.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Client not found' })
      }
    }

    // Get client activity (recent interactions)
    const activity = await sql`
      SELECT id, activity_type, description, metadata, created_at
      FROM client_activity
      WHERE contact_id = ${clientId}
      ORDER BY created_at DESC
      LIMIT 20
    `

    // Get client projects
    const projects = await sql`
      SELECT id, title, status, budget, start_date, end_date, created_at
      FROM projects
      WHERE contact_id = ${clientId}
      ORDER BY created_at DESC
    `

    // Get client proposals
    const proposals = await sql`
      SELECT id, slug, title, status, total_amount, sent_at, viewed_at, created_at
      FROM proposals
      WHERE contact_id = ${clientId}
      ORDER BY created_at DESC
    `

    // Get client invoices
    const invoices = await sql`
      SELECT id, invoice_number, amount, status, due_date, created_at
      FROM invoices
      WHERE contact_id = ${clientId}
      ORDER BY created_at DESC
    `

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        client: client[0],
        activity,
        projects,
        proposals,
        invoices
      })
    }
  } catch (error) {
    console.error('Clients get error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch client',
        details: error.message
      })
    }
  }
}
