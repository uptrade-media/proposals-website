// netlify/functions/projects-get.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, desc } from 'drizzle-orm'
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

  // Get project ID from path
  const projectId = event.path.split('/').pop()
  if (!projectId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Project ID required' })
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
    
    // Only support Google OAuth users
    if (payload.type !== 'google') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only Google OAuth users can access projects' })
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

    // Fetch project with all related data
    const project = await db.query.projects.findFirst({
      where: eq(schema.projects.id, projectId),
      with: {
        contact: {
          columns: {
            id: true,
            name: true,
            email: true,
            company: true,
            avatar: true
          }
        },
        milestones: {
          orderBy: [desc(schema.projectMilestones.order)],
          columns: {
            id: true,
            title: true,
            description: true,
            status: true,
            dueDate: true,
            completedAt: true,
            order: true,
            createdAt: true
          }
        },
        members: {
          with: {
            member: {
              columns: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            }
          }
        },
        proposals: {
          orderBy: [desc(schema.proposals.createdAt)],
          columns: {
            id: true,
            slug: true,
            title: true,
            status: true,
            totalAmount: true,
            signedAt: true,
            fullyExecutedAt: true,
            createdAt: true
          }
        },
        files: {
          orderBy: [desc(schema.files.uploadedAt)],
          columns: {
            id: true,
            filename: true,
            mimeType: true,
            fileSize: true,
            category: true,
            isPublic: true,
            uploadedAt: true
          },
          with: {
            uploader: {
              columns: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        messages: {
          orderBy: [desc(schema.messages.createdAt)],
          limit: 10, // Most recent 10 messages
          columns: {
            id: true,
            subject: true,
            content: true,
            readAt: true,
            createdAt: true
          },
          with: {
            sender: {
              columns: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            }
          }
        },
        invoices: {
          orderBy: [desc(schema.invoices.createdAt)],
          columns: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            status: true,
            dueDate: true,
            paidAt: true,
            createdAt: true
          }
        }
      }
    })

    if (!project) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Project not found' })
      }
    }

    // Check authorization
    // Admins can see all projects, clients can only see their own
    if (payload.role !== 'admin' && project.contactId !== payload.userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Not authorized to view this project' })
      }
    }

    // Format response
    const formattedProject = {
      id: project.id,
      title: project.title,
      description: project.description,
      status: project.status,
      budget: project.budget ? parseFloat(project.budget) : null,
      startDate: project.startDate,
      endDate: project.endDate,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      contact: project.contact ? {
        id: project.contact.id,
        name: project.contact.name,
        email: project.contact.email,
        company: project.contact.company,
        avatar: project.contact.avatar
      } : null,
      milestones: project.milestones.map(m => ({
        id: m.id,
        title: m.title,
        description: m.description,
        status: m.status,
        dueDate: m.dueDate,
        completedAt: m.completedAt,
        order: m.order,
        createdAt: m.createdAt
      })),
      members: project.members.map(m => ({
        id: m.id,
        memberId: m.memberId,
        role: m.role,
        joinedAt: m.joinedAt,
        member: m.member ? {
          id: m.member.id,
          name: m.member.name,
          email: m.member.email,
          avatar: m.member.avatar
        } : null
      })),
      proposals: project.proposals.map(p => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        status: p.status,
        totalAmount: p.totalAmount ? parseFloat(p.totalAmount) : null,
        signedAt: p.signedAt,
        fullyExecutedAt: p.fullyExecutedAt,
        createdAt: p.createdAt
      })),
      files: project.files.map(f => ({
        id: f.id,
        filename: f.filename,
        mimeType: f.mimeType,
        fileSize: f.fileSize,
        category: f.category,
        isPublic: f.isPublic,
        uploadedAt: f.uploadedAt,
        uploader: f.uploader ? {
          id: f.uploader.id,
          name: f.uploader.name,
          email: f.uploader.email
        } : null
      })),
      messages: project.messages.map(m => ({
        id: m.id,
        subject: m.subject,
        content: m.content,
        readAt: m.readAt,
        createdAt: m.createdAt,
        sender: m.sender ? {
          id: m.sender.id,
          name: m.sender.name,
          email: m.sender.email,
          avatar: m.sender.avatar
        } : null
      })),
      invoices: project.invoices.map(i => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        totalAmount: i.totalAmount ? parseFloat(i.totalAmount) : null,
        status: i.status,
        dueDate: i.dueDate,
        paidAt: i.paidAt,
        createdAt: i.createdAt
      }))
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ project: formattedProject })
    }

  } catch (error) {
    console.error('Error fetching project:', error)
    
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
        error: 'Failed to fetch project',
        message: error.message 
      })
    }
  }
}
