// netlify/functions/auth-validate-setup-token.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as schema from '../../src/db/schema.ts'

const JWT_SECRET = process.env.AUTH_JWT_SECRET
const DATABASE_URL = process.env.DATABASE_URL

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

    // Verify token
    const payload = jwt.verify(token, JWT_SECRET)

    if (payload.type !== 'account-setup') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid token type' })
      }
    }

    // Verify contact exists and hasn't set up yet
    const sql = neon(DATABASE_URL)
    const db = drizzle(sql, { schema })

    const contact = await db.query.contacts.findFirst({
      where: eq(schema.contacts.id, payload.contactId)
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
        body: JSON.stringify({ error: 'Account already set up. Please login normally.' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        valid: true,
        email: contact.email,
        name: contact.name,
        redirectTo: payload.redirectTo || '/dashboard'
      })
    }

  } catch (error) {
    console.error('Token validation error:', error)

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
      body: JSON.stringify({ error: 'Failed to validate token' })
    }
  }
}
