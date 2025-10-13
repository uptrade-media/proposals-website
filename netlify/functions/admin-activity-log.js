// netlify/functions/admin-activity-log.js
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

    // Only admins can view activity log
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
    const limit = parseInt(params.get('limit') || '50')
    const activityType = params.get('type') // 'all', 'projects', 'proposals', 'invoices', 'messages', 'files'
    const contactId = params.get('contactId')

    // Build activity log from multiple sources
    const activities = []

    // Recent projects (created/updated)
    let projectsQuery = `
      SELECT 
        'project_created' as type,
        p.id as entity_id,
        p.name as entity_name,
        p.contact_id,
        c.name as contact_name,
        c.company as contact_company,
        p.created_at as timestamp,
        p.status as status
      FROM projects p
      JOIN contacts c ON c.id = p.contact_id
      WHERE 1=1
    `

    if (contactId) {
      projectsQuery += ` AND p.contact_id = '${contactId}'`
    }

    if (!activityType || activityType === 'all' || activityType === 'projects') {
      const projectsResult = await db(projectsQuery + ` ORDER BY p.created_at DESC LIMIT ${Math.min(limit, 50)}`)
      activities.push(...projectsResult.map(row => ({
        type: row.type,
        entityId: row.entity_id,
        entityName: row.entity_name,
        contactId: row.contact_id,
        contactName: row.contact_name,
        contactCompany: row.contact_company,
        timestamp: row.timestamp,
        status: row.status,
        description: `Project "${row.entity_name}" created`
      })))
    }

    // Recent proposals
    let proposalsQuery = `
      SELECT 
        CASE 
          WHEN pr.status = 'accepted' THEN 'proposal_accepted'
          ELSE 'proposal_created'
        END as type,
        pr.id as entity_id,
        pr.title as entity_name,
        pr.contact_id,
        c.name as contact_name,
        c.company as contact_company,
        pr.created_at as timestamp,
        pr.status as status
      FROM proposals pr
      JOIN contacts c ON c.id = pr.contact_id
      WHERE 1=1
    `

    if (contactId) {
      proposalsQuery += ` AND pr.contact_id = '${contactId}'`
    }

    if (!activityType || activityType === 'all' || activityType === 'proposals') {
      const proposalsResult = await db(proposalsQuery + ` ORDER BY pr.created_at DESC LIMIT ${Math.min(limit, 50)}`)
      activities.push(...proposalsResult.map(row => ({
        type: row.type,
        entityId: row.entity_id,
        entityName: row.entity_name,
        contactId: row.contact_id,
        contactName: row.contact_name,
        contactCompany: row.contact_company,
        timestamp: row.timestamp,
        status: row.status,
        description: row.type === 'proposal_accepted' 
          ? `Proposal "${row.entity_name}" accepted` 
          : `Proposal "${row.entity_name}" created`
      })))
    }

    // Recent invoices
    let invoicesQuery = `
      SELECT 
        CASE 
          WHEN i.status = 'paid' THEN 'invoice_paid'
          ELSE 'invoice_created'
        END as type,
        i.id as entity_id,
        i.invoice_number as entity_name,
        i.contact_id,
        c.name as contact_name,
        c.company as contact_company,
        i.created_at as timestamp,
        i.status as status,
        i.total_amount
      FROM invoices i
      JOIN contacts c ON c.id = i.contact_id
      WHERE 1=1
    `

    if (contactId) {
      invoicesQuery += ` AND i.contact_id = '${contactId}'`
    }

    if (!activityType || activityType === 'all' || activityType === 'invoices') {
      const invoicesResult = await db(invoicesQuery + ` ORDER BY i.created_at DESC LIMIT ${Math.min(limit, 50)}`)
      activities.push(...invoicesResult.map(row => ({
        type: row.type,
        entityId: row.entity_id,
        entityName: row.entity_name,
        contactId: row.contact_id,
        contactName: row.contact_name,
        contactCompany: row.contact_company,
        timestamp: row.timestamp,
        status: row.status,
        amount: parseFloat(row.total_amount),
        description: row.type === 'invoice_paid'
          ? `Invoice ${row.entity_name} paid ($${parseFloat(row.total_amount).toFixed(2)})`
          : `Invoice ${row.entity_name} created ($${parseFloat(row.total_amount).toFixed(2)})`
      })))
    }

    // Recent messages
    let messagesQuery = `
      SELECT 
        'message_sent' as type,
        m.id as entity_id,
        m.subject as entity_name,
        m.contact_id,
        c.name as contact_name,
        c.company as contact_company,
        m.created_at as timestamp,
        m.sender as sender
      FROM messages m
      JOIN contacts c ON c.id = m.contact_id
      WHERE m.parent_id IS NULL
    `

    if (contactId) {
      messagesQuery += ` AND m.contact_id = '${contactId}'`
    }

    if (!activityType || activityType === 'all' || activityType === 'messages') {
      const messagesResult = await db(messagesQuery + ` ORDER BY m.created_at DESC LIMIT ${Math.min(limit, 50)}`)
      activities.push(...messagesResult.map(row => ({
        type: row.type,
        entityId: row.entity_id,
        entityName: row.entity_name,
        contactId: row.contact_id,
        contactName: row.contact_name,
        contactCompany: row.contact_company,
        timestamp: row.timestamp,
        sender: row.sender,
        description: `Message "${row.entity_name}" from ${row.sender === 'client' ? row.contact_name : 'team'}`
      })))
    }

    // Recent file uploads
    let filesQuery = `
      SELECT 
        'file_uploaded' as type,
        f.id as entity_id,
        f.filename as entity_name,
        f.contact_id,
        c.name as contact_name,
        c.company as contact_company,
        f.uploaded_at as timestamp,
        f.category as category,
        f.size as size
      FROM files f
      JOIN contacts c ON c.id = f.contact_id
      WHERE 1=1
    `

    if (contactId) {
      filesQuery += ` AND f.contact_id = '${contactId}'`
    }

    if (!activityType || activityType === 'all' || activityType === 'files') {
      const filesResult = await db(filesQuery + ` ORDER BY f.uploaded_at DESC LIMIT ${Math.min(limit, 50)}`)
      activities.push(...filesResult.map(row => ({
        type: row.type,
        entityId: row.entity_id,
        entityName: row.entity_name,
        contactId: row.contact_id,
        contactName: row.contact_name,
        contactCompany: row.contact_company,
        timestamp: row.timestamp,
        category: row.category,
        size: row.size,
        description: `File "${row.entity_name}" uploaded (${row.category})`
      })))
    }

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    // Limit results
    const limitedActivities = activities.slice(0, limit)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        activities: limitedActivities,
        total: limitedActivities.length,
        filters: {
          type: activityType || 'all',
          contactId: contactId || null,
          limit
        }
      })
    }

  } catch (error) {
    console.error('Error fetching activity log:', error)
    
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
        error: 'Failed to fetch activity log',
        message: error.message 
      })
    }
  }
}
