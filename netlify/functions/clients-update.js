// netlify/functions/clients-update.js
import { neon } from '@neondatabase/serverless'
import jwt from 'jsonwebtoken'

const sql = neon(process.env.DATABASE_URL)

export async function handler(event) {
  // CORS headers
  const origin = event.headers.origin || 'http://localhost:8888'
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  }

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'PUT') {
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

    const { id, name, email, company, phone, subscribed, notes, source, tags } = JSON.parse(event.body || '{}')

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing client ID' })
      }
    }

    // Build dynamic update query
    const updates = []
    const params = [id]
    let paramCount = 2

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`)
      params.push(name)
      paramCount++
    }

    if (email !== undefined) {
      updates.push(`email = $${paramCount}`)
      params.push(email)
      paramCount++
    }

    if (company !== undefined) {
      updates.push(`company = $${paramCount}`)
      params.push(company)
      paramCount++
    }

    if (phone !== undefined) {
      updates.push(`phone = $${paramCount}`)
      params.push(phone)
      paramCount++
    }

    if (subscribed !== undefined) {
      updates.push(`subscribed = $${paramCount}`)
      params.push(subscribed)
      paramCount++
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramCount}`)
      params.push(notes)
      paramCount++
    }

    if (source !== undefined) {
      updates.push(`source = $${paramCount}`)
      params.push(source)
      paramCount++
    }

    if (tags !== undefined) {
      updates.push(`tags = $${paramCount}`)
      params.push(tags ? JSON.stringify(tags) : null)
      paramCount++
    }

    if (updates.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No fields to update' })
      }
    }

    updates.push('updated_at = NOW()')

    const query = `
      UPDATE contacts
      SET ${updates.join(', ')}
      WHERE id = $1 AND role = 'client'
      RETURNING id, email, name, company, phone, role, subscribed, source, notes, tags, created_at, updated_at
    `

    const result = await sql(query, params)

    if (result.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Client not found' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        client: result[0],
        message: 'Client updated successfully'
      })
    }
  } catch (error) {
    console.error('Clients update error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to update client',
        details: error.message
      })
    }
  }
}
