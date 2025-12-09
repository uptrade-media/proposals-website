import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as schema from '../../src/db/schema.js'
import { Resend } from 'resend'

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'um_session'
const JWT_SECRET = process.env.AUTH_JWT_SECRET
const PROPOSAL_SECRET = process.env.PROPOSAL_TOKEN_SECRET || JWT_SECRET
const DATABASE_URL = process.env.DATABASE_URL
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'portal@send.uptrademedia.com'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ramsey@uptrademedia.com'
const PORTAL_BASE_URL = process.env.URL || process.env.PORTAL_BASE_URL || 'https://portal.uptrademedia.com'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
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

    // Get proposal ID from query or body
    const proposalId = event.queryStringParameters?.id || JSON.parse(event.body || '{}').proposalId
    if (!proposalId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Proposal ID required' })
      }
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}')
    const { email, clientEmail, clientName, message, personalMessage, subject } = body
    const recipientEmail = email || clientEmail

    if (!recipientEmail) {
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
        clientEmail: recipientEmail,
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
        recipientEmail: recipientEmail,
        timestamp: new Date().toISOString()
      })
    }).catch(err => console.error('Error logging proposal send:', err))

    // Generate magic link token (7 days expiry)
    const magicToken = jwt.sign(
      {
        proposalId: proposal.id,
        email: recipientEmail,
        contactId: proposal.contactId,
        type: 'proposal_view',
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
      },
      PROPOSAL_SECRET
    )

    // Generate magic link URL
    const proposalUrl = `${PORTAL_BASE_URL}/p/${proposal.slug}?token=${magicToken}`

    // Calculate days until expiry for urgency messaging
    const daysLeft = proposal.validUntil 
      ? Math.ceil((new Date(proposal.validUntil) - new Date()) / (1000 * 60 * 60 * 24))
      : null
    const validUntilFormatted = proposal.validUntil 
      ? new Date(proposal.validUntil).toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        })
      : null

    // Send email to client
    if (RESEND_API_KEY) {
      try {
        const resend = new Resend(RESEND_API_KEY)
        const personalMsg = personalMessage || message
        const recipientName = clientName || proposal.contact?.name?.split(' ')[0] || ''

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background: #f3f4f6; }
    .wrapper { background: #f3f4f6; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 48px 40px; text-align: center; }
    .logo { height: 44px; margin-bottom: 24px; }
    .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.9); margin: 12px 0 0; font-size: 16px; }
    .content { padding: 48px 40px; }
    .message-box { background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%); border-radius: 12px; padding: 24px; margin-bottom: 32px; border-left: 4px solid #3b82f6; }
    .message-box p { margin: 0; color: #374151; white-space: pre-line; }
    .proposal-card { background: #f9fafb; border-radius: 16px; padding: 32px; margin: 32px 0; border: 1px solid #e5e7eb; }
    .proposal-title { font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 20px; }
    .proposal-meta { display: flex; gap: 32px; flex-wrap: wrap; }
    .meta-item { display: flex; flex-direction: column; gap: 4px; }
    .meta-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; }
    .meta-value { font-size: 18px; font-weight: 600; color: #111827; }
    .price { color: #059669 !important; font-size: 24px !important; }
    .cta-section { text-align: center; padding: 32px 0; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; padding: 18px 48px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 18px; box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4); }
    .cta-hint { color: #6b7280; font-size: 14px; margin-top: 16px; }
    .urgency-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; border-radius: 12px; padding: 20px; margin-top: 24px; text-align: center; }
    .urgency-box p { margin: 0; color: #92400e; font-weight: 600; }
    .urgency-box span { font-size: 13px; font-weight: 400; display: block; margin-top: 4px; }
    .footer { background: #f9fafb; padding: 32px 40px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer p { margin: 4px 0; color: #6b7280; font-size: 14px; }
    .footer .brand { font-weight: 700; color: #374151; font-size: 16px; margin-bottom: 8px; }
    .divider { height: 1px; background: #e5e7eb; margin: 24px 0; }
    @media (max-width: 600px) {
      .content, .header, .footer { padding-left: 24px; padding-right: 24px; }
      .proposal-meta { flex-direction: column; gap: 16px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <img src="https://portal.uptrademedia.com/uptrade_media_logo_white.png" alt="Uptrade Media" class="logo" />
        <h1>Your Proposal is Ready</h1>
        <p>A custom proposal prepared exclusively for you</p>
      </div>
      
      <div class="content">
        ${personalMsg ? `
          <div class="message-box">
            <p>${personalMsg.replace(/\n/g, '<br>')}</p>
          </div>
        ` : recipientName ? `
          <p>Hi ${recipientName},</p>
          <p>We've put together a custom proposal for you. Click below to view it and take the next step.</p>
        ` : ''}
        
        <div class="proposal-card">
          <h2 class="proposal-title">${proposal.title}</h2>
          <div class="proposal-meta">
            <div class="meta-item">
              <span class="meta-label">Investment</span>
              <span class="meta-value price">$${parseFloat(proposal.totalAmount || 0).toLocaleString()}</span>
            </div>
            ${validUntilFormatted ? `
              <div class="meta-item">
                <span class="meta-label">Valid Until</span>
                <span class="meta-value">${validUntilFormatted}</span>
              </div>
            ` : ''}
          </div>
          
          ${daysLeft && daysLeft <= 7 && daysLeft > 0 ? `
            <div class="urgency-box">
              <p>⏰ Only ${daysLeft} day${daysLeft > 1 ? 's' : ''} left!
              <span>Review and accept before this offer expires</span></p>
            </div>
          ` : ''}
        </div>
        
        <div class="cta-section">
          <a href="${proposalUrl}" class="cta-button">View Your Proposal →</a>
          <p class="cta-hint">Click the button above to view the full proposal and accept</p>
        </div>
        
        <div class="divider"></div>
        
        <p style="text-align: center; color: #6b7280; font-size: 14px;">
          Questions? Simply reply to this email or give us a call.
        </p>
      </div>
      
      <div class="footer">
        <p class="brand">Uptrade Media</p>
        <p>Premium Digital Marketing & Web Design</p>
        <p style="margin-top: 16px; font-size: 12px; color: #9ca3af;">
          This email was sent to ${recipientEmail}
        </p>
      </div>
    </div>
  </div>
</body>
</html>
        `

        const emailSubject = subject || `${recipientName ? recipientName + ', your' : 'Your'} proposal is ready`

        await resend.emails.send({
          from: RESEND_FROM_EMAIL,
          to: recipientEmail,
          subject: emailSubject,
          html: emailHtml,
          replyTo: ADMIN_EMAIL
        })

        // Send notification to admin
        await resend.emails.send({
          from: RESEND_FROM_EMAIL,
          to: ADMIN_EMAIL,
          subject: `✅ Proposal Sent: ${proposal.title}`,
          html: `
            <div style="font-family: -apple-system, sans-serif; max-width: 500px;">
              <h3>Proposal Sent Successfully</h3>
              <p><strong>Proposal:</strong> ${proposal.title}</p>
              <p><strong>Sent to:</strong> ${recipientEmail}</p>
              <p><strong>Amount:</strong> $${parseFloat(proposal.totalAmount || 0).toLocaleString()}</p>
              <p><strong>Sent by:</strong> ${payload.email}</p>
              <p style="margin-top: 20px;">
                <a href="${proposalUrl}" style="color: #667eea;">View Proposal</a>
              </p>
            </div>
          `
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
        success: true,
        proposal: {
          id: updatedProposal.id,
          slug: updatedProposal.slug,
          title: updatedProposal.title,
          status: updatedProposal.status,
          sentAt: updatedProposal.sentAt,
          clientEmail: updatedProposal.clientEmail,
          version: updatedProposal.version
        },
        magicLink: proposalUrl,
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
