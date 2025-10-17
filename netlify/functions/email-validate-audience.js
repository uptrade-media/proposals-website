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

    const body = JSON.parse(event.body || '{}')
    const { lists = [], tags = [] } = body

    if (lists.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No lists selected' })
      }
    }

    // Count opt-in contacts in selected lists
    try {
      const result = await sql`
        SELECT COUNT(DISTINCT c.id) as count
        FROM contacts c
        WHERE c.consent_status = 'opt_in'
          AND c.id IN (
            SELECT contact_id FROM contact_list
            WHERE list_id = ANY(${lists}::text[])
          )
          ${tags.length > 0 ? sql`AND c.tags @> ${JSON.stringify(tags)}::jsonb` : sql``}
      `

      const count = result[0]?.count || 0

      return {
        statusCode: 200,
        body: JSON.stringify({ count }),
        headers: { 'Content-Type': 'application/json' }
      }
    } catch (err) {
      // If query fails, return 0
      console.error('Audience count error:', err)
      return {
        statusCode: 200,
        body: JSON.stringify({ count: 0 }),
        headers: { 'Content-Type': 'application/json' }
      }
    }
  } catch (err) {
    console.error('Validate audience error:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to validate audience' })
    }
  }
}
