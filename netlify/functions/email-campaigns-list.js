import { neon } from '@neondatabase/serverless'
import jwt from 'jsonwebtoken'

const sql = neon(process.env.DATABASE_URL)

export async function handler(event) {
  try {
    // Verify auth
    const token = event.headers.cookie?.match(/um_session=([^;]+)/)?.[1]
    if (!token) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    const user = jwt.verify(token, process.env.AUTH_JWT_SECRET)
    if (user.role !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Admin only' }) }
    }

    // Get query params
    const type = event.queryStringParameters?.type || 'all'
    const limit = parseInt(event.queryStringParameters?.limit || '50')
    const offset = parseInt(event.queryStringParameters?.offset || '0')

    // Build query
    let typeWhere = ''
    if (type !== 'all') {
      typeWhere = `AND type = '${type}'`
    }

    const campaigns = await sql`
      SELECT 
        id, type, name, status, scheduled_start,
        created_at, updated_at
      FROM campaigns
      WHERE 1=1 ${type !== 'all' ? sql`AND type = ${type}` : sql``}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    const countResult = await sql`
      SELECT COUNT(*) as count FROM campaigns
      WHERE 1=1 ${type !== 'all' ? sql`AND type = ${type}` : sql``}
    `

    return {
      statusCode: 200,
      body: JSON.stringify({
        campaigns,
        total: countResult[0]?.count || 0,
        limit,
        offset
      }),
      headers: { 'Content-Type': 'application/json' }
    }
  } catch (err) {
    console.error('List campaigns error:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to list campaigns' })
    }
  }
}
