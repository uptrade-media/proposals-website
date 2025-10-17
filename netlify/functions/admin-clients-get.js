// netlify/functions/admin-clients-get.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
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

    // Only admins can view client details
    if (payload.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      }
    }

    // Get client ID from path
    const clientId = event.path.split('/').pop()

    if (!clientId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Client ID is required' })
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

    const sql = neon(DATABASE_URL)
    const db = drizzle(sql, { schema })

    // Fetch client with all related data
    const client = await db.query.contacts.findFirst({
      where: eq(schema.contacts.id, clientId),
      with: {
        projects: {
          orderBy: (projects, { desc }) => [desc(projects.createdAt)],
          limit: 5
        },
        proposals: {
          orderBy: (proposals, { desc }) => [desc(proposals.createdAt)],
          limit: 5
        },
        invoices: {
          orderBy: (invoices, { desc }) => [desc(invoices.createdAt)],
          limit: 5
        },
        messages: {
          where: (messages, { isNull }) => isNull(messages.parentId),
          orderBy: (messages, { desc }) => [desc(messages.createdAt)],
          limit: 5
        },
        files: {
          orderBy: (files, { desc }) => [desc(files.uploadedAt)],
          limit: 5
        }
      }
    })

    if (!client) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Client not found' })
      }
    }

    // Calculate statistics
    const allProjects = await db.query.projects.findMany({
      where: eq(schema.projects.contactId, clientId)
    })

    const allInvoices = await db.query.invoices.findMany({
      where: eq(schema.invoices.contactId, clientId)
    })

    const allMessages = await db.query.messages.findMany({
      where: eq(schema.messages.contactId, clientId)
    })

    const stats = {
      totalProjects: allProjects.length,
      activeProjects: allProjects.filter(p => p.status === 'active').length,
      completedProjects: allProjects.filter(p => p.status === 'completed').length,
      totalProposals: client.proposals.length,
      pendingProposals: client.proposals.filter(p => p.status === 'sent').length,
      acceptedProposals: client.proposals.filter(p => p.status === 'accepted').length,
      totalInvoices: allInvoices.length,
      pendingInvoices: allInvoices.filter(i => i.status === 'pending').length,
      paidInvoices: allInvoices.filter(i => i.status === 'paid').length,
      totalPendingAmount: allInvoices
        .filter(i => i.status === 'pending')
        .reduce((sum, i) => sum + parseFloat(i.totalAmount), 0),
      totalPaidAmount: allInvoices
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + parseFloat(i.totalAmount), 0),
      totalMessages: allMessages.length,
      unreadMessages: allMessages.filter(m => m.sender === 'client' && !m.readAt).length,
      totalFiles: client.files.length
    }

    // Format response
    const formattedClient = {
      id: client.id,
      email: client.email,
      name: client.name,
      company: client.company,
      role: client.role,
      accountSetup: client.accountSetup,
      hasGoogleAuth: !!client.googleId,
      avatar: client.avatar,
      createdAt: client.createdAt,
      stats,
      recentProjects: client.projects.map(p => ({
        id: p.id,
        name: p.name,
        status: p.status,
        budget: p.budget ? parseFloat(p.budget) : null,
        startDate: p.startDate,
        endDate: p.endDate,
        createdAt: p.createdAt
      })),
      recentProposals: client.proposals.map(p => ({
        id: p.id,
        title: p.title,
        status: p.status,
        totalAmount: parseFloat(p.totalAmount),
        validUntil: p.validUntil,
        createdAt: p.createdAt
      })),
      recentInvoices: client.invoices.map(i => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        status: i.status,
        totalAmount: parseFloat(i.totalAmount),
        dueDate: i.dueDate,
        paidAt: i.paidAt,
        createdAt: i.createdAt
      })),
      recentMessages: client.messages.map(m => ({
        id: m.id,
        subject: m.subject,
        sender: m.sender,
        readAt: m.readAt,
        createdAt: m.createdAt
      })),
      recentFiles: client.files.map(f => ({
        id: f.id,
        filename: f.filename,
        category: f.category,
        size: f.size,
        uploadedAt: f.uploadedAt
      }))
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ client: formattedClient })
    }

  } catch (error) {
    console.error('Error fetching client details:', error)
    
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
        error: 'Failed to fetch client details',
        message: error.message 
      })
    }
  }
}
