import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as schema from '../../src/db/schema.js'
import { Resend } from 'resend'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'um_session'
const JWT_SECRET = process.env.AUTH_JWT_SECRET
const DATABASE_URL = process.env.DATABASE_URL
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'portal@uptrademedia.com'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ramsey@uptrademedia.com'

export async function handler(event) {
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

  try {
    // Verify authentication - can be called by client or admin
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

    const payload = jwt.verify(token, JWT_SECRET)

    // Get proposal ID from query
    const proposalId = event.queryStringParameters?.id
    if (!proposalId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Proposal ID required' })
      }
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}')
    const { reason } = body

    if (!DATABASE_URL) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database not configured' })
      }
    }

    const sql = neon(DATABASE_URL)
    const db = drizzle(sql, { schema })

    // Verify proposal exists
    const proposal = await db.query.proposals.findFirst({
      where: eq(schema.proposals.id, proposalId),
      with: { contact: true }
    })

    if (!proposal) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Proposal not found' })
      }
    }

    // Verify authorization: client can only decline their own, admin can decline any
    if (payload.role !== 'admin' && proposal.contactId !== payload.userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Not authorized to decline this proposal' })
      }
    }

    // Update proposal status
    const updated = await db
      .update(schema.proposals)
      .set({
        status: 'declined',
        version: proposal.version + 1,
        updatedAt: new Date()
      })
      .where(eq(schema.proposals.id, proposalId))
      .returning()

    const updatedProposal = updated[0]

    // Log activity: proposal declined
    await db.insert(schema.proposalActivity).values({
      proposalId: proposalId,
      action: 'declined',
      performedBy: payload.userId,
      metadata: JSON.stringify({
        reason: reason || 'No reason provided',
        timestamp: new Date().toISOString()
      })
    }).catch(err => console.error('Error logging proposal decline:', err))

    // Send emails
    if (RESEND_API_KEY) {
      try {
        const resend = new Resend(RESEND_API_KEY)

        // Email to client
        await resend.emails.send({
          from: RESEND_FROM_EMAIL,
          to: proposal.contact.email,
          subject: `Proposal Declined: ${proposal.title}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Proposal Declined</h2>
              <p>We received your response regarding the proposal "${proposal.title}"</p>
              
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
              
              <p>We're happy to discuss your needs further. Feel free to reach out if you'd like to explore other options.</p>
              
              <p style="color: #999; font-size: 12px;">
                © Uptrade Media. All rights reserved.
              </p>
            </div>
          `
        })

        // Email to admin
        await resend.emails.send({
          from: RESEND_FROM_EMAIL,
          to: ADMIN_EMAIL,
          subject: `Proposal Declined: ${proposal.title}`,
          html: `
            <p><strong>${proposal.contact.name}</strong> (${proposal.contact.email}) declined the proposal "<strong>${proposal.title}</strong>"</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          `
        }).catch(err => console.error('Error sending admin notification:', err))
      } catch (emailError) {
        console.error('Error sending emails:', emailError)
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        proposal: {
          id: updatedProposal.id,
          slug: updatedProposal.slug,
          title: updatedProposal.title,
          status: updatedProposal.status,
          version: updatedProposal.version
        },
        message: 'Proposal declined successfully'
      })
    }
  } catch (error) {
    console.error('Error declining proposal:', error)

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
        error: 'Failed to decline proposal',
        message: error.message
      })
    }
  }
}
