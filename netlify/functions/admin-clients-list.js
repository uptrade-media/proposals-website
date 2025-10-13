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

    // Parse query parameters
    const params = new URLSearchParams(event.queryStringParameters || {})
    const search = params.get('search') || ''
    const role = params.get('role') // 'client' or 'admin'
    const accountSetup = params.get('accountSetup') // 'true' or 'false'

    // Build query
    let query = `
      SELECT 
        c.id,
        c.email,
        c.name,
        c.company,
        c.role,
        c.account_setup,
        c.google_id,
        c.avatar,
        c.created_at,
        COUNT(DISTINCT p.id) as project_count,
        COUNT(DISTINCT pr.id) as proposal_count,
        COUNT(DISTINCT i.id) as invoice_count,
        COALESCE(SUM(CASE WHEN i.status = 'pending' THEN CAST(i.total_amount AS DECIMAL) ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN i.status = 'paid' THEN CAST(i.total_amount AS DECIMAL) ELSE 0 END), 0) as paid_amount,
        MAX(p.updated_at) as last_project_activity,
        MAX(m.created_at) as last_message_activity
      FROM contacts c
      LEFT JOIN projects p ON p.contact_id = c.id
      LEFT JOIN proposals pr ON pr.contact_id = c.id
      LEFT JOIN invoices i ON i.contact_id = c.id
      LEFT JOIN messages m ON m.contact_id = c.id
      WHERE 1=1
    `

    const queryParams = []

    // Add search filter
    if (search) {
      query += ` AND (
        c.name ILIKE $${queryParams.length + 1} OR 
        c.email ILIKE $${queryParams.length + 1} OR 
        c.company ILIKE $${queryParams.length + 1}
      )`
      queryParams.push(`%${search}%`)
    }

    // Add role filter
    if (role) {
      query += ` AND c.role = $${queryParams.length + 1}`
      queryParams.push(role)
    }

    // Add account setup filter
    if (accountSetup) {
      query += ` AND c.account_setup = $${queryParams.length + 1}`
      queryParams.push(accountSetup === 'true')
    }

    query += `
      GROUP BY c.id, c.email, c.name, c.company, c.role, c.account_setup, c.google_id, c.avatar, c.created_at
      ORDER BY c.created_at DESC
    `

    // Execute query
    const result = await db(query, queryParams)

    // Format results
    const clients = result.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      company: row.company,
      role: row.role,
      accountSetup: row.account_setup,
      hasGoogleAuth: !!row.google_id,
      avatar: row.avatar,
      createdAt: row.created_at,
      stats: {
        projectCount: parseInt(row.project_count || 0),
        proposalCount: parseInt(row.proposal_count || 0),
        invoiceCount: parseInt(row.invoice_count || 0),
        pendingAmount: parseFloat(row.pending_amount || 0),
        paidAmount: parseFloat(row.paid_amount || 0),
        lastProjectActivity: row.last_project_activity,
        lastMessageActivity: row.last_message_activity
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
