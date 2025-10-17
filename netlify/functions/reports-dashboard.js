// netlify/functions/reports-dashboard.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, sql, and, gte, lte } from 'drizzle-orm'
import * as schema from '../../src/db/schema.js'

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

    // Connect to database
    if (!DATABASE_URL) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database not configured' })
      }
    }

    const sqlClient = neon(DATABASE_URL)
    const db = drizzle(sqlClient, { schema })

    // Parse date range from query params
    const params = new URLSearchParams(event.queryStringParameters || {})
    const period = params.get('period') || '30' // days
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(period))

    // Base filter for client vs admin
    const contactFilter = payload.role === 'admin' 
      ? undefined 
      : eq(schema.projects.contactId, payload.userId)

    // Fetch overview metrics
    const metrics = {}

    // Total active projects
    const projectsResult = await db.execute(
      payload.role === 'admin'
        ? sql`SELECT COUNT(*) as count FROM projects WHERE status = 'active'`
        : sql`SELECT COUNT(*) as count FROM projects WHERE status = 'active' AND contact_id = ${payload.userId}`
    )
    metrics.activeProjects = parseInt(projectsResult[0]?.count || 0)

    // Total pending proposals
    const proposalsResult = await db.execute(
      payload.role === 'admin'
        ? sql`SELECT COUNT(*) as count FROM proposals WHERE status = 'sent'`
        : sql`SELECT COUNT(*) as count FROM proposals WHERE status = 'sent' AND contact_id = ${payload.userId}`
    )
    metrics.pendingProposals = parseInt(proposalsResult[0]?.count || 0)

    // Total pending invoices amount
    const invoicesResult = await db.execute(
      payload.role === 'admin'
        ? sql`SELECT COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total FROM invoices WHERE status = 'pending'`
        : sql`SELECT COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total FROM invoices WHERE status = 'pending' AND contact_id = ${payload.userId}`
    )
    metrics.pendingInvoices = parseFloat(invoicesResult[0]?.total || 0)

    // Total revenue (paid invoices)
    const revenueResult = await db.execute(
      payload.role === 'admin'
        ? sql`SELECT COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total FROM invoices WHERE status = 'paid' AND paid_at >= ${startDate.toISOString()}`
        : sql`SELECT COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total FROM invoices WHERE status = 'paid' AND contact_id = ${payload.userId} AND paid_at >= ${startDate.toISOString()}`
    )
    metrics.revenue = parseFloat(revenueResult[0]?.total || 0)

    // Unread messages count
    const messagesResult = await db.execute(
      payload.role === 'admin'
        ? sql`SELECT COUNT(*) as count FROM messages WHERE sender_id != recipient_id AND read_at IS NULL`
        : sql`SELECT COUNT(*) as count FROM messages WHERE recipient_id = ${payload.userId} AND read_at IS NULL`
    )
    metrics.unreadMessages = parseInt(messagesResult[0]?.count || 0)

    // Recent activity (last 7 days)
    const activityStartDate = new Date()
    activityStartDate.setDate(activityStartDate.getDate() - 7)

    // Projects activity
    const recentProjectsResult = await db.execute(
      payload.role === 'admin'
        ? sql`SELECT COUNT(*) as count FROM projects WHERE updated_at >= ${activityStartDate.toISOString()}`
        : sql`SELECT COUNT(*) as count FROM projects WHERE contact_id = ${payload.userId} AND updated_at >= ${activityStartDate.toISOString()}`
    )
    metrics.recentProjectActivity = parseInt(recentProjectsResult[0]?.count || 0)

    // Messages activity
    const recentMessagesResult = await db.execute(
      payload.role === 'admin'
        ? sql`SELECT COUNT(*) as count FROM messages WHERE created_at >= ${activityStartDate.toISOString()}`
        : sql`SELECT COUNT(*) as count FROM messages WHERE sender_id = ${payload.userId} OR recipient_id = ${payload.userId} AND created_at >= ${activityStartDate.toISOString()}`
    )
    metrics.recentMessages = parseInt(recentMessagesResult[0]?.count || 0)

    // Project status breakdown
    const statusBreakdownResult = await db.execute(
      payload.role === 'admin'
        ? sql`SELECT status, COUNT(*) as count FROM projects GROUP BY status`
        : sql`SELECT status, COUNT(*) as count FROM projects WHERE contact_id = ${payload.userId} GROUP BY status`
    )
    metrics.projectStatusBreakdown = statusBreakdownResult.map(row => ({
      status: row.status,
      count: parseInt(row.count)
    }))

    // Invoice status breakdown
    const invoiceBreakdownResult = await db.execute(
      payload.role === 'admin'
        ? sql`SELECT status, COUNT(*) as count, COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total FROM invoices GROUP BY status`
        : sql`SELECT status, COUNT(*) as count, COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total FROM invoices WHERE contact_id = ${payload.userId} GROUP BY status`
    )
    metrics.invoiceStatusBreakdown = invoiceBreakdownResult.map(row => ({
      status: row.status,
      count: parseInt(row.count),
      total: parseFloat(row.total)
    }))

    // Monthly revenue trend (last 6 months) - admin only
    if (payload.role === 'admin') {
      const monthlyRevenueResult = await db.execute(sql`
        SELECT 
          DATE_TRUNC('month', paid_at) as month,
          COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total
        FROM invoices
        WHERE status = 'paid' AND paid_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', paid_at)
        ORDER BY month ASC
      `)
      metrics.monthlyRevenue = monthlyRevenueResult.map(row => ({
        month: row.month,
        total: parseFloat(row.total)
      }))
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        metrics,
        period: parseInt(period),
        generatedAt: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Error fetching dashboard metrics:', error)
    
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
        error: 'Failed to fetch dashboard metrics',
        message: error.message 
      })
    }
  }
}
