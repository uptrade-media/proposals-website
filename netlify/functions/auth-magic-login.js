// netlify/functions/auth-magic-login.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as schema from '../../src/db/schema.js'

const JWT_SECRET = process.env.AUTH_JWT_SECRET
const DATABASE_URL = process.env.DATABASE_URL
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'um_session'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { token } = JSON.parse(event.body || '{}')

    if (!token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Token required' })
      }
    }

    // Verify magic link token
    const payload = jwt.verify(token, JWT_SECRET)

    if (payload.type !== 'magic-link') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid token type' })
      }
    }

    // Verify user exists
    const sql = neon(DATABASE_URL)
    const db = drizzle(sql, { schema })

    const user = await db.query.contacts.findFirst({
      where: eq(schema.contacts.id, payload.userId)
    })

    if (!user) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      }
    }

    // Create new session token
    const sessionToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        type: user.googleId ? 'google' : 'email'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Set cookie
    const cookieHeader = `${COOKIE_NAME}=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Set-Cookie': cookieHeader
      },
      body: JSON.stringify({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          company: user.company,
          avatar: user.avatar
        }
      })
    }

  } catch (error) {
    console.error('Magic link error:', error)

    if (error.name === 'JsonWebTokenError') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid magic link' })
      }
    }

    if (error.name === 'TokenExpiredError') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Magic link has expired' })
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to authenticate' })
    }
  }
}
