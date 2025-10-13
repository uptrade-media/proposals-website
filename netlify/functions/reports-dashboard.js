// netlify/functions/reports-dashboard.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, sql, and, gte, lte } from 'drizzle-orm'
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
    const projectsQuery = payload.role === 'admin'
      ? sql`SELECT COUNT(*) as count FROM ${schema.projects} WHERE status = 'active'`
      : sql`SELECT COUNT(*) as count FROM ${schema.projects} WHERE status = 'active' AND contact_id = ${payload.userId}`
    
    const projectsResult = await db(projectsQuery)
    metrics.activeProjects = parseInt(projectsResult[0]?.count || 0)

    // Total pending proposals
    const proposalsQuery = payload.role === 'admin'
      ? sql`SELECT COUNT(*) as count FROM ${schema.proposals} WHERE status = 'sent'`
      : sql`SELECT COUNT(*) as count FROM ${schema.proposals} WHERE status = 'sent' AND contact_id = ${payload.userId}`
    
    const proposalsResult = await db(proposalsQuery)
    metrics.pendingProposals = parseInt(proposalsResult[0]?.count || 0)

    // Total pending invoices amount
    const invoicesQuery = payload.role === 'admin'
      ? sql`SELECT COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total FROM ${schema.invoices} WHERE status = 'pending'`
      : sql`SELECT COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total FROM ${schema.invoices} WHERE status = 'pending' AND contact_id = ${payload.userId}`
    
    const invoicesResult = await db(invoicesQuery)
    metrics.pendingInvoices = parseFloat(invoicesResult[0]?.total || 0)

    // Total revenue (paid invoices)
    const revenueQuery = payload.role === 'admin'
      ? sql`SELECT COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total FROM ${schema.invoices} WHERE status = 'paid' AND paid_at >= ${startDate.toISOString()}`
      : sql`SELECT COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total FROM ${schema.invoices} WHERE status = 'paid' AND contact_id = ${payload.userId} AND paid_at >= ${startDate.toISOString()}`
    
    const revenueResult = await db(revenueQuery)
    metrics.revenue = parseFloat(revenueResult[0]?.total || 0)

    // Unread messages count
    const messagesQuery = payload.role === 'admin'
      ? sql`SELECT COUNT(*) as count FROM ${schema.messages} WHERE sender = 'client' AND read_at IS NULL`
      : sql`SELECT COUNT(*) as count FROM ${schema.messages} WHERE contact_id = ${payload.userId} AND sender = 'team' AND read_at IS NULL`
    
    const messagesResult = await db(messagesQuery)
    metrics.unreadMessages = parseInt(messagesResult[0]?.count || 0)

    // Recent activity (last 7 days)
    const activityStartDate = new Date()
    activityStartDate.setDate(activityStartDate.getDate() - 7)

    // Projects activity
    const recentProjectsQuery = payload.role === 'admin'
      ? sql`SELECT COUNT(*) as count FROM ${schema.projects} WHERE updated_at >= ${activityStartDate.toISOString()}`
      : sql`SELECT COUNT(*) as count FROM ${schema.projects} WHERE contact_id = ${payload.userId} AND updated_at >= ${activityStartDate.toISOString()}`
    
    const recentProjectsResult = await db(recentProjectsQuery)
    metrics.recentProjectActivity = parseInt(recentProjectsResult[0]?.count || 0)

    // Messages activity
    const recentMessagesQuery = payload.role === 'admin'
      ? sql`SELECT COUNT(*) as count FROM ${schema.messages} WHERE created_at >= ${activityStartDate.toISOString()}`
      : sql`SELECT COUNT(*) as count FROM ${schema.messages} WHERE contact_id = ${payload.userId} AND created_at >= ${activityStartDate.toISOString()}`
    
    const recentMessagesResult = await db(recentMessagesQuery)
    metrics.recentMessages = parseInt(recentMessagesResult[0]?.count || 0)

    // Project status breakdown
    const statusBreakdownQuery = payload.role === 'admin'
      ? sql`
          SELECT status, COUNT(*) as count 
          FROM ${schema.projects} 
          GROUP BY status
        `
      : sql`
          SELECT status, COUNT(*) as count 
          FROM ${schema.projects} 
          WHERE contact_id = ${payload.userId}
          GROUP BY status
        `
    
    const statusBreakdownResult = await db(statusBreakdownQuery)
    metrics.projectStatusBreakdown = statusBreakdownResult.map(row => ({
      status: row.status,
      count: parseInt(row.count)
    }))

    // Invoice status breakdown
    const invoiceBreakdownQuery = payload.role === 'admin'
      ? sql`
          SELECT status, COUNT(*) as count, COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total
          FROM ${schema.invoices}
          GROUP BY status
        `
      : sql`
          SELECT status, COUNT(*) as count, COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total
          FROM ${schema.invoices}
          WHERE contact_id = ${payload.userId}
          GROUP BY status
        `
    
    const invoiceBreakdownResult = await db(invoiceBreakdownQuery)
    metrics.invoiceStatusBreakdown = invoiceBreakdownResult.map(row => ({
      status: row.status,
      count: parseInt(row.count),
      total: parseFloat(row.total)
    }))

    // Monthly revenue trend (last 6 months) - admin only
    if (payload.role === 'admin') {
      const monthlyRevenueQuery = sql`
        SELECT 
          DATE_TRUNC('month', paid_at) as month,
          COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total
        FROM ${schema.invoices}
        WHERE status = 'paid' AND paid_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', paid_at)
        ORDER BY month ASC
      `
      
      const monthlyRevenueResult = await db(monthlyRevenueQuery)
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
