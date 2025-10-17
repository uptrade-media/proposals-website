// netlify/functions/clients-list.js
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

    // Parse query parameters
    const url = new URL(event.rawUrl || `http://localhost${event.rawPath}`)
    const search = url.searchParams.get('search')
    const filterSubscribed = url.searchParams.get('subscribed') // 'true', 'false', or null for all
    const role = url.searchParams.get('role') // 'client', 'admin', or null for all
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500)
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const sortBy = url.searchParams.get('sortBy') || 'created_at' // created_at, name, email
    const sortOrder = url.searchParams.get('sortOrder') || 'DESC'

    // Build dynamic query
    let query = 'SELECT id, email, name, company, phone, role, subscribed, source, last_login, created_at, updated_at FROM contacts WHERE role != \'admin\''
    const params = []
    let paramCount = 1

    // Search filter
    if (search) {
      query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount} OR company ILIKE $${paramCount})`
      params.push(`%${search}%`)
      paramCount++
    }

    // Subscription filter
    if (filterSubscribed === 'true') {
      query += ` AND subscribed = true`
    } else if (filterSubscribed === 'false') {
      query += ` AND subscribed = false`
    }

    // Role filter
    if (role) {
      query += ` AND role = $${paramCount}`
      params.push(role)
      paramCount++
    }

    // Sorting
    const validSortFields = ['created_at', 'name', 'email', 'last_login']
    const validSortOrder = ['ASC', 'DESC']
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at'
    const safeSortOrder = validSortOrder.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC'

    query += ` ORDER BY ${safeSortBy} ${safeSortOrder}`
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`
    params.push(limit, offset)

    const result = await sql(query, params)

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM contacts WHERE role != \'admin\''
    const countParams = []
    let countParamCount = 1

    if (search) {
      countQuery += ` AND (name ILIKE $${countParamCount} OR email ILIKE $${countParamCount} OR company ILIKE $${countParamCount})`
      countParams.push(`%${search}%`)
      countParamCount++
    }

    if (filterSubscribed === 'true') {
      countQuery += ` AND subscribed = true`
    } else if (filterSubscribed === 'false') {
      countQuery += ` AND subscribed = false`
    }

    if (role) {
      countQuery += ` AND role = $${countParamCount}`
      countParams.push(role)
      countParamCount++
    }

    const countResult = await sql(countQuery, countParams)
    const total = countResult[0]?.count || 0

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        clients: result,
        total: parseInt(total),
        count: result.length,
        limit,
        offset
      })
    }
  } catch (error) {
    console.error('Clients list error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch clients',
        details: error.message
      })
    }
  }
}
