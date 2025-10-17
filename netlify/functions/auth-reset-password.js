// netlify/functions/auth-reset-password.js
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
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
    const { token, newPassword } = JSON.parse(event.body || '{}')

    if (!token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Reset token required' })
      }
    }

    if (!newPassword || newPassword.length < 8) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Password must be at least 8 characters' })
      }
    }

    // Verify reset token
    const payload = jwt.verify(token, JWT_SECRET)

    if (payload.type !== 'password-reset') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid token type' })
      }
    }

    const sql = neon(DATABASE_URL)
    const db = drizzle(sql, { schema })

    // Get user
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

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password
    const [updatedUser] = await db
      .update(schema.contacts)
      .set({ 
        password: hashedPassword,
        accountSetup: 'true' // Ensure account is marked as set up
      })
      .where(eq(schema.contacts.id, user.id))
      .returning()

    // Create new session token
    const sessionToken = jwt.sign(
      {
        userId: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        name: updatedUser.name
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
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role
        },
        message: 'Password reset successful'
      })
    }

  } catch (error) {
    console.error('Password reset error:', error)

    if (error.name === 'JsonWebTokenError') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid reset link' })
      }
    }

    if (error.name === 'TokenExpiredError') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Reset link has expired' })
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to reset password' })
    }
  }
}
