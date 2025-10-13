// netlify/functions/reports-revenue.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { sql } from 'drizzle-orm'
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

    // Only admins can access revenue reports
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

    // Parse query parameters
    const params = new URLSearchParams(event.queryStringParameters || {})
    const period = params.get('period') || 'year' // 'month', 'quarter', 'year', 'all'
    const groupBy = params.get('groupBy') || 'month' // 'day', 'week', 'month', 'year'

    // Calculate date range
    let dateFilter = ''
    const now = new Date()
    
    switch (period) {
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        dateFilter = `AND paid_at >= '${monthStart.toISOString()}'`
        break
      case 'quarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        dateFilter = `AND paid_at >= '${quarterStart.toISOString()}'`
        break
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1)
        dateFilter = `AND paid_at >= '${yearStart.toISOString()}'`
        break
      case 'all':
        dateFilter = ''
        break
    }

    // Revenue summary
    const summaryQuery = sql`
      SELECT 
        COUNT(*) as invoice_count,
        COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total_revenue,
        COALESCE(AVG(CAST(total_amount AS DECIMAL)), 0) as avg_invoice_amount,
        COALESCE(MIN(CAST(total_amount AS DECIMAL)), 0) as min_invoice_amount,
        COALESCE(MAX(CAST(total_amount AS DECIMAL)), 0) as max_invoice_amount,
        COALESCE(SUM(CAST(tax_amount AS DECIMAL)), 0) as total_tax
      FROM ${schema.invoices}
      WHERE status = 'paid' ${dateFilter}
    `
    
    const summaryResult = await db(summaryQuery.strings[0])
    const summary = {
      invoiceCount: parseInt(summaryResult[0]?.invoice_count || 0),
      totalRevenue: parseFloat(summaryResult[0]?.total_revenue || 0),
      avgInvoiceAmount: parseFloat(summaryResult[0]?.avg_invoice_amount || 0),
      minInvoiceAmount: parseFloat(summaryResult[0]?.min_invoice_amount || 0),
      maxInvoiceAmount: parseFloat(summaryResult[0]?.max_invoice_amount || 0),
      totalTax: parseFloat(summaryResult[0]?.total_tax || 0)
    }

    // Revenue trend over time
    let trendDateTrunc = 'month'
    switch (groupBy) {
      case 'day':
        trendDateTrunc = 'day'
        break
      case 'week':
        trendDateTrunc = 'week'
        break
      case 'month':
        trendDateTrunc = 'month'
        break
      case 'year':
        trendDateTrunc = 'year'
        break
    }

    const trendQuery = `
      SELECT 
        DATE_TRUNC('${trendDateTrunc}', paid_at) as period,
        COUNT(*) as invoice_count,
        COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as revenue
      FROM invoices
      WHERE status = 'paid' ${dateFilter}
      GROUP BY DATE_TRUNC('${trendDateTrunc}', paid_at)
      ORDER BY period ASC
    `
    
    const trendResult = await db(trendQuery)
    const trend = trendResult.map(row => ({
      period: row.period,
      invoiceCount: parseInt(row.invoice_count),
      revenue: parseFloat(row.revenue)
    }))

    // Revenue by project
    const projectRevenueQuery = `
      SELECT 
        p.id,
        p.name,
        COUNT(i.id) as invoice_count,
        COALESCE(SUM(CAST(i.total_amount AS DECIMAL)), 0) as total_revenue
      FROM projects p
      LEFT JOIN invoices i ON i.project_id = p.id AND i.status = 'paid' ${dateFilter}
      GROUP BY p.id, p.name
      HAVING COALESCE(SUM(CAST(i.total_amount AS DECIMAL)), 0) > 0
      ORDER BY total_revenue DESC
      LIMIT 10
    `
    
    const projectRevenueResult = await db(projectRevenueQuery)
    const revenueByProject = projectRevenueResult.map(row => ({
      projectId: row.id,
      projectName: row.name,
      invoiceCount: parseInt(row.invoice_count),
      totalRevenue: parseFloat(row.total_revenue)
    }))

    // Revenue by client
    const clientRevenueQuery = `
      SELECT 
        c.id,
        c.name,
        c.company,
        COUNT(i.id) as invoice_count,
        COALESCE(SUM(CAST(i.total_amount AS DECIMAL)), 0) as total_revenue
      FROM contacts c
      LEFT JOIN invoices i ON i.contact_id = c.id AND i.status = 'paid' ${dateFilter}
      GROUP BY c.id, c.name, c.company
      HAVING COALESCE(SUM(CAST(i.total_amount AS DECIMAL)), 0) > 0
      ORDER BY total_revenue DESC
      LIMIT 10
    `
    
    const clientRevenueResult = await db(clientRevenueQuery)
    const revenueByClient = clientRevenueResult.map(row => ({
      contactId: row.id,
      contactName: row.name,
      company: row.company,
      invoiceCount: parseInt(row.invoice_count),
      totalRevenue: parseFloat(row.total_revenue)
    }))

    // Outstanding invoices (pending/overdue)
    const outstandingQuery = `
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total,
        COUNT(CASE WHEN due_date < NOW() THEN 1 END) as overdue_count,
        COALESCE(SUM(CASE WHEN due_date < NOW() THEN CAST(total_amount AS DECIMAL) ELSE 0 END), 0) as overdue_total
      FROM invoices
      WHERE status = 'pending'
    `
    
    const outstandingResult = await db(outstandingQuery)
    const outstanding = {
      pendingCount: parseInt(outstandingResult[0]?.count || 0),
      pendingTotal: parseFloat(outstandingResult[0]?.total || 0),
      overdueCount: parseInt(outstandingResult[0]?.overdue_count || 0),
      overdueTotal: parseFloat(outstandingResult[0]?.overdue_total || 0)
    }

    // Payment method breakdown (from Square data)
    const paymentMethodQuery = `
      SELECT 
        COALESCE(square_payment_id IS NOT NULL, false) as has_square_payment,
        COUNT(*) as count,
        COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total
      FROM invoices
      WHERE status = 'paid' ${dateFilter}
      GROUP BY has_square_payment
    `
    
    const paymentMethodResult = await db(paymentMethodQuery)
    const paymentMethods = paymentMethodResult.map(row => ({
      method: row.has_square_payment ? 'Square' : 'Other',
      count: parseInt(row.count),
      total: parseFloat(row.total)
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        summary,
        trend,
        revenueByProject,
        revenueByClient,
        outstanding,
        paymentMethods,
        period,
        groupBy,
        generatedAt: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Error fetching revenue report:', error)
    
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
        error: 'Failed to fetch revenue report',
        message: error.message 
      })
    }
  }
}
