import { Resend } from 'resend'
import { neon } from '@neondatabase/serverless'
import jwt from 'jsonwebtoken'

const resend = new Resend(process.env.RESEND_API_KEY)
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

    if (event.httpMethod === 'GET') {
      // Search contacts
      const q = event.queryStringParameters?.q || ''
      
      if (q.length < 2) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Query too short' }) }
      }

      const contacts = await sql`
        SELECT id, email, name, company 
        FROM contacts 
        WHERE email ILIKE ${'%' + q + '%'} 
          OR name ILIKE ${'%' + q + '%'} 
          OR company ILIKE ${'%' + q + '%'}
        LIMIT 20
      `

      return {
        statusCode: 200,
        body: JSON.stringify({ contacts }),
        headers: { 'Content-Type': 'application/json' }
      }
    }

    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  } catch (err) {
    console.error('Search error:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to search contacts' })
    }
  }
}
