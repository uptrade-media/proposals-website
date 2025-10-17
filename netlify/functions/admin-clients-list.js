// netlify/functions/admin-clients-list.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, ilike, or, sql, desc } from 'drizzle-orm'
import * as schema from '../../src/db/schema.ts'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'um_session'
const JWT_SECRET = process.env.AUTH_JWT_SECRET
const DATABASE_URL = process.env.DATABASE_URL

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Verify authentication
  if (!JWT_SECRET) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server not configured' })
    }
  }

  const rawCookie = event.headers.cookie || ''
  const token = rawCookie.split('; ').find(c => c.startsWith(`${COOKIE_NAME}=`))?.split('=')[1]
  
  if (!token) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET)

    // Only admins can list clients
    if (payload.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      }
    }

    // Connect to database
    if (!DATABASE_URL) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database not configured' })
      }
    }

    const db = neon(DATABASE_URL)
    const drizzleDb = drizzle(db, { schema })

    // Parse query parameters (for future filtering)
    const params = new URLSearchParams(event.queryStringParameters || {})
    const search = params.get('search') || ''
    const role = params.get('role') // 'client' or 'admin'
    const accountSetup = params.get('accountSetup') // 'true' or 'false'

    // Simple query using tagged-template syntax (required by Neon serverless)
    // Note: Complex joins and dynamic filtering removed for now due to Neon limitations
    const result = await db`
      SELECT 
        id,
        email,
        name,
        company,
        role,
        account_setup,
        google_id,
        avatar,
        created_at
      FROM contacts
      WHERE role != 'admin'
      ORDER BY created_at DESC
    `

    // Format results
    const clients = result.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      company: row.company,
      role: row.role,
      accountSetup: row.accountSetup,
      hasGoogleAuth: !!row.googleId,
      avatar: row.avatar,
      createdAt: row.createdAt,
      stats: {
        projectCount: 0,
        proposalCount: 0,
        invoiceCount: 0,
        pendingAmount: 0,
        paidAmount: 0,
        lastProjectActivity: null,
        lastMessageActivity: null
      }
    }))

    // Calculate summary stats
    const summary = {
      totalClients: clients.length,
      totalClientsWithProjects: clients.filter(c => c.stats.projectCount > 0).length,
      totalPendingAmount: clients.reduce((sum, c) => sum + c.stats.pendingAmount, 0),
      totalPaidAmount: clients.reduce((sum, c) => sum + c.stats.paidAmount, 0),
      clientsWithAccountSetup: clients.filter(c => c.accountSetup).length,
      clientsWithGoogleAuth: clients.filter(c => c.hasGoogleAuth).length
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        clients,
        summary,
        filters: {
          search,
          role,
          accountSetup
        }
      })
    }

  } catch (error) {
    console.error('Error listing clients:', error)
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired session' })
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to list clients',
        message: error.message 
      })
    }
  }
}
