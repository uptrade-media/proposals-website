import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as schema from '../../src/db/schema.ts'
import { Resend } from 'resend'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'um_session'
const JWT_SECRET = process.env.AUTH_JWT_SECRET
const DATABASE_URL = process.env.DATABASE_URL
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'portal@uptrademedia.com'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ramsey@uptrademedia.com'
const PORTAL_BASE_URL = process.env.PORTAL_BASE_URL || 'https://portal.uptrademedia.com'

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

    const payload = jwt.verify(token, JWT_SECRET)

    // Only admins can send proposals
    if (payload.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only admins can send proposals' })
      }
    }

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
    const { clientEmail, clientName, message } = body

    if (!clientEmail) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Client email is required' })
      }
    }

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

    // Update proposal status and timestamps
    const updated = await db
      .update(schema.proposals)
      .set({
        status: 'sent',
        sentAt: new Date(),
        clientEmail: clientEmail,
        version: proposal.version + 1,
        updatedAt: new Date()
      })
      .where(eq(schema.proposals.id, proposalId))
      .returning()

    const updatedProposal = updated[0]

    // Log activity: proposal sent
    await db.insert(schema.proposalActivity).values({
      proposalId: proposalId,
      action: 'sent',
      performedBy: payload.userId,
      metadata: JSON.stringify({
        recipientEmail: clientEmail,
        timestamp: new Date().toISOString()
      })
    }).catch(err => console.error('Error logging proposal send:', err))

    // Send email to client
    if (RESEND_API_KEY) {
      try {
        const resend = new Resend(RESEND_API_KEY)
        const proposalUrl = `${PORTAL_BASE_URL}/p/${proposal.slug}`

        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Proposal: ${proposal.title}</h2>
            ${clientName ? `<p>Hi ${clientName},</p>` : '<p>Hi,</p>'}
            
            <p>${message || `We've sent you a proposal for your review. Please click the link below to view it.`}</p>
            
            <p>
              <a href="${proposalUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
                View Proposal
              </a>
            </p>
            
            <p style="color: #666; font-size: 14px;">
              Proposal ID: ${proposal.id}<br>
              Valid until: ${proposal.validUntil ? new Date(proposal.validUntil).toLocaleDateString() : 'No expiration'}
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">
              © Uptrade Media. All rights reserved.
            </p>
          </div>
        `

        await resend.emails.send({
          from: RESEND_FROM_EMAIL,
          to: clientEmail,
          subject: `Proposal: ${proposal.title}`,
          html: emailHtml
        })

        // Send notification to admin
        await resend.emails.send({
          from: RESEND_FROM_EMAIL,
          to: ADMIN_EMAIL,
          subject: `Proposal Sent: ${proposal.title}`,
          html: `<p>Proposal "${proposal.title}" has been sent to ${clientEmail}</p>`
        }).catch(err => console.error('Error sending admin notification:', err))
      } catch (emailError) {
        console.error('Error sending email:', emailError)
        // Don't fail the request if email fails
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
          sentAt: updatedProposal.sentAt,
          clientEmail: updatedProposal.clientEmail,
          version: updatedProposal.version
        },
        emailSent: true,
        message: 'Proposal sent successfully'
      })
    }
  } catch (error) {
    console.error('Error sending proposal:', error)

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
        error: 'Failed to send proposal',
        message: error.message
      })
    }
  }
}
