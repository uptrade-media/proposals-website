// netlify/functions/auth-complete-setup.js
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as schema from '../../src/db/schema.ts'
import { OAuth2Client } from 'google-auth-library'

const JWT_SECRET = process.env.AUTH_JWT_SECRET
const DATABASE_URL = process.env.DATABASE_URL
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'um_session'
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID)

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
    const { token, password, googleCredential, method } = JSON.parse(event.body || '{}')

    if (!token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Setup token required' })
      }
    }

    if (!method || !['password', 'google'].includes(method)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid setup method' })
      }
    }

    // Verify setup token
    const setupPayload = jwt.verify(token, JWT_SECRET)

    if (setupPayload.type !== 'account-setup') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid token type' })
      }
    }

    const sql = neon(DATABASE_URL)
    const db = drizzle(sql, { schema })

    // Get contact
    const contact = await db.query.contacts.findFirst({
      where: eq(schema.contacts.id, setupPayload.contactId)
    })

    if (!contact) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Contact not found' })
      }
    }

    if (contact.accountSetup === 'true') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Account already set up' })
      }
    }

    let updateData = { accountSetup: 'true' }

    if (method === 'password') {
      // Password setup
      if (!password || password.length < 8) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Password must be at least 8 characters' })
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10)
      updateData.password = hashedPassword

    } else if (method === 'google') {
      // Google OAuth setup
      if (!googleCredential) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Google credential required' })
        }
      }

      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: googleCredential,
          audience: GOOGLE_CLIENT_ID
        })

        const googlePayload = ticket.getPayload()

        if (googlePayload.email.toLowerCase() !== contact.email.toLowerCase()) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Google account email does not match' })
          }
        }

        updateData.googleId = googlePayload.sub
        updateData.avatar = googlePayload.picture

      } catch (googleError) {
        console.error('Google verification failed:', googleError)
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid Google credential' })
        }
      }
    }

    // Update contact
    const [updatedContact] = await db
      .update(schema.contacts)
      .set(updateData)
      .where(eq(schema.contacts.id, contact.id))
      .returning()

    // Create session token
    const sessionToken = jwt.sign(
      {
        userId: updatedContact.id,
        email: updatedContact.email,
        role: updatedContact.role,
        name: updatedContact.name,
        type: updateData.googleId ? 'google' : 'password'
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
          id: updatedContact.id,
          email: updatedContact.email,
          name: updatedContact.name,
          role: updatedContact.role,
          avatar: updatedContact.avatar
        },
        message: 'Account setup complete'
      })
    }

  } catch (error) {
    console.error('Account setup error:', error)

    if (error.name === 'JsonWebTokenError') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      }
    }

    if (error.name === 'TokenExpiredError') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Setup link has expired' })
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to complete account setup' })
    }
  }
}
