// netlify/functions/reports-projects.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { sql } from 'drizzle-orm'
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

    const db = neon(DATABASE_URL)

    // Base filter for client vs admin
    const contactFilter = payload.role === 'admin' 
      ? '' 
      : `AND p.contact_id = '${payload.userId}'`

    // Projects summary
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_projects,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_projects,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_projects,
        COUNT(CASE WHEN status = 'on-hold' THEN 1 END) as on_hold_projects,
        COUNT(CASE WHEN status = 'planning' THEN 1 END) as planning_projects,
        COALESCE(SUM(CAST(budget AS DECIMAL)), 0) as total_budget,
        COALESCE(AVG(CAST(budget AS DECIMAL)), 0) as avg_budget
      FROM projects p
      WHERE 1=1 ${contactFilter}
    `
    
    const summaryResult = await db(summaryQuery)
    const summary = {
      totalProjects: parseInt(summaryResult[0]?.total_projects || 0),
      activeProjects: parseInt(summaryResult[0]?.active_projects || 0),
      completedProjects: parseInt(summaryResult[0]?.completed_projects || 0),
      onHoldProjects: parseInt(summaryResult[0]?.on_hold_projects || 0),
      planningProjects: parseInt(summaryResult[0]?.planning_projects || 0),
      totalBudget: parseFloat(summaryResult[0]?.total_budget || 0),
      avgBudget: parseFloat(summaryResult[0]?.avg_budget || 0)
    }

    // Project status breakdown
    const statusBreakdownQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(CAST(budget AS DECIMAL)), 0) as total_budget
      FROM projects p
      WHERE 1=1 ${contactFilter}
      GROUP BY status
      ORDER BY count DESC
    `
    
    const statusBreakdownResult = await db(statusBreakdownQuery)
    const statusBreakdown = statusBreakdownResult.map(row => ({
      status: row.status,
      count: parseInt(row.count),
      totalBudget: parseFloat(row.total_budget)
    }))

    // Projects by client (admin only)
    let projectsByClient = []
    if (payload.role === 'admin') {
      const clientQuery = `
        SELECT 
          c.id,
          c.name,
          c.company,
          COUNT(p.id) as project_count,
          COUNT(CASE WHEN p.status = 'active' THEN 1 END) as active_count,
          COALESCE(SUM(CAST(p.budget AS DECIMAL)), 0) as total_budget
        FROM contacts c
        LEFT JOIN projects p ON p.contact_id = c.id
        GROUP BY c.id, c.name, c.company
        HAVING COUNT(p.id) > 0
        ORDER BY project_count DESC
        LIMIT 10
      `
      
      const clientResult = await db(clientQuery)
      projectsByClient = clientResult.map(row => ({
        contactId: row.id,
        contactName: row.name,
        company: row.company,
        projectCount: parseInt(row.project_count),
        activeCount: parseInt(row.active_count),
        totalBudget: parseFloat(row.total_budget)
      }))
    }

    // Recent projects timeline
    const timelineQuery = `
      SELECT 
        DATE_TRUNC('month', start_date) as month,
        COUNT(*) as started_count,
        COUNT(CASE WHEN end_date IS NOT NULL THEN 1 END) as completed_count
      FROM projects p
      WHERE start_date IS NOT NULL ${contactFilter}
      GROUP BY DATE_TRUNC('month', start_date)
      ORDER BY month DESC
      LIMIT 12
    `
    
    const timelineResult = await db(timelineQuery)
    const timeline = timelineResult.map(row => ({
      month: row.month,
      startedCount: parseInt(row.started_count),
      completedCount: parseInt(row.completed_count)
    }))

    // Project duration analysis (completed projects only)
    const durationQuery = `
      SELECT 
        AVG(EXTRACT(EPOCH FROM (end_date - start_date)) / 86400) as avg_duration_days,
        MIN(EXTRACT(EPOCH FROM (end_date - start_date)) / 86400) as min_duration_days,
        MAX(EXTRACT(EPOCH FROM (end_date - start_date)) / 86400) as max_duration_days
      FROM projects p
      WHERE status = 'completed' 
        AND start_date IS NOT NULL 
        AND end_date IS NOT NULL
        ${contactFilter}
    `
    
    const durationResult = await db(durationQuery)
    const duration = {
      avgDurationDays: parseFloat(durationResult[0]?.avg_duration_days || 0),
      minDurationDays: parseFloat(durationResult[0]?.min_duration_days || 0),
      maxDurationDays: parseFloat(durationResult[0]?.max_duration_days || 0)
    }

    // Projects with pending invoices
    const pendingInvoicesQuery = `
      SELECT 
        p.id,
        p.name,
        COUNT(i.id) as pending_invoice_count,
        COALESCE(SUM(CAST(i.total_amount AS DECIMAL)), 0) as pending_amount
      FROM projects p
      JOIN invoices i ON i.project_id = p.id
      WHERE i.status = 'pending' ${contactFilter}
      GROUP BY p.id, p.name
      ORDER BY pending_amount DESC
      LIMIT 10
    `
    
    const pendingInvoicesResult = await db(pendingInvoicesQuery)
    const projectsWithPendingInvoices = pendingInvoicesResult.map(row => ({
      projectId: row.id,
      projectName: row.name,
      pendingInvoiceCount: parseInt(row.pending_invoice_count),
      pendingAmount: parseFloat(row.pending_amount)
    }))

    // Projects with recent activity (messages/files in last 7 days)
    const activityQuery = `
      SELECT 
        p.id,
        p.name,
        COUNT(DISTINCT m.id) as message_count,
        COUNT(DISTINCT f.id) as file_count,
        MAX(GREATEST(COALESCE(m.created_at, '1970-01-01'), COALESCE(f.uploaded_at, '1970-01-01'))) as last_activity
      FROM projects p
      LEFT JOIN messages m ON m.project_id = p.id AND m.created_at >= NOW() - INTERVAL '7 days'
      LEFT JOIN files f ON f.project_id = p.id AND f.uploaded_at >= NOW() - INTERVAL '7 days'
      WHERE 1=1 ${contactFilter}
      GROUP BY p.id, p.name
      HAVING COUNT(DISTINCT m.id) > 0 OR COUNT(DISTINCT f.id) > 0
      ORDER BY last_activity DESC
      LIMIT 10
    `
    
    const activityResult = await db(activityQuery)
    const recentActivity = activityResult.map(row => ({
      projectId: row.id,
      projectName: row.name,
      messageCount: parseInt(row.message_count),
      fileCount: parseInt(row.file_count),
      lastActivity: row.last_activity
    }))

    // Completion rate by month (admin only)
    let completionRate = []
    if (payload.role === 'admin') {
      const completionRateQuery = `
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as total_started,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL * 100, 2) as completion_percentage
        FROM projects
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC
      `
      
      const completionRateResult = await db(completionRateQuery)
      completionRate = completionRateResult.map(row => ({
        month: row.month,
        totalStarted: parseInt(row.total_started),
        completed: parseInt(row.completed),
        completionPercentage: parseFloat(row.completion_percentage || 0)
      }))
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        summary,
        statusBreakdown,
        projectsByClient,
        timeline,
        duration,
        projectsWithPendingInvoices,
        recentActivity,
        completionRate,
        generatedAt: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Error fetching project analytics:', error)
    
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
        error: 'Failed to fetch project analytics',
        message: error.message 
      })
    }
  }
}
