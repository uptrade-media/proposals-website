// netlify/functions/proposals-accept.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import { Resend } from 'resend'
import * as schema from '../../src/db/schema.js'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'um_session'
const JWT_SECRET = process.env.AUTH_JWT_SECRET
const DATABASE_URL = process.env.DATABASE_URL
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'portal@send.uptrademedia.com'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL

export async function handler(event) {
  // CORS headers
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

  // Get proposal ID from path
  const proposalId = event.path.split('/').pop()?.replace('/accept', '')
  if (!proposalId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Proposal ID required' })
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
    
    // Verify user is authenticated (accept all auth types: google, password, email, etc)
    if (!payload.userId && !payload.email) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Invalid session' })
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

    // Fetch proposal
    const proposal = await db.query.proposals.findFirst({
      where: eq(schema.proposals.id, proposalId),
      with: {
        contact: true
      }
    })

    if (!proposal) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Proposal not found' })
      }
    }

    // Verify user owns this proposal
    if (proposal.contactId !== payload.userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Not authorized to accept this proposal' })
      }
    }

    // Check if already accepted
    if (proposal.status === 'accepted' || proposal.signedAt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Proposal already accepted' })
      }
    }

    // Start transaction: update proposal and create project
    const now = new Date()
    
    // Update proposal status
    const [updatedProposal] = await db
      .update(schema.proposals)
      .set({
        status: 'accepted',
        signedAt: now,
        updatedAt: now
      })
      .where(eq(schema.proposals.id, proposalId))
      .returning()

    // Create project if not already linked
    let project = null
    if (!proposal.projectId) {
      const [newProject] = await db.insert(schema.projects).values({
        contactId: proposal.contactId,
        title: proposal.title,
        description: `Project created from proposal: ${proposal.title}`,
        status: 'planning',
        budget: proposal.totalAmount,
        startDate: now
      }).returning()
      
      project = newProject

      // Link proposal to project
      await db
        .update(schema.proposals)
        .set({ projectId: project.id })
        .where(eq(schema.proposals.id, proposalId))
    } else {
      // Fetch existing project
      project = await db.query.projects.findFirst({
        where: eq(schema.projects.id, proposal.projectId)
      })
    }

    // Send email notification to admin
    if (RESEND_API_KEY && ADMIN_EMAIL) {
      try {
        const resend = new Resend(RESEND_API_KEY)
        await resend.emails.send({
          from: RESEND_FROM_EMAIL,
          to: ADMIN_EMAIL,
          subject: `Proposal Accepted: ${proposal.title}`,
          html: `
            <h2>Proposal Accepted</h2>
            <p><strong>${proposal.contact.name}</strong> (${proposal.contact.email}) has accepted the proposal:</p>
            <p><strong>Title:</strong> ${proposal.title}</p>
            <p><strong>Amount:</strong> $${proposal.totalAmount ? parseFloat(proposal.totalAmount).toFixed(2) : '0.00'}</p>
            <p><strong>Accepted:</strong> ${now.toLocaleString()}</p>
            ${project ? `<p><strong>Project Created:</strong> ${project.title}</p>` : ''}
            <p><a href="${process.env.URL}/admin/proposals/${proposal.id}">View Proposal</a></p>
          `
        })
      } catch (emailError) {
        console.error('Failed to send acceptance email:', emailError)
        // Don't fail the request if email fails
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Proposal accepted successfully',
        proposal: {
          id: updatedProposal.id,
          status: updatedProposal.status,
          signedAt: updatedProposal.signedAt
        },
        project: project ? {
          id: project.id,
          title: project.title,
          status: project.status
        } : null
      })
    }

  } catch (error) {
    console.error('Error accepting proposal:', error)
    
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
        error: 'Failed to accept proposal',
        message: error.message 
      })
    }
  }
}
