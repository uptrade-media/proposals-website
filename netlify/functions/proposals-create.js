// netlify/functions/proposals-create.js
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
const PORTAL_URL = process.env.URL || 'http://localhost:8888'

// Generate URL-safe slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 50)
}

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
    
    // Only admins can create proposals
    if (payload.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only admins can create proposals' })
      }
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}')
    const { 
      contactId,
      projectId,
      title,
      description,
      mdxContent,
      status = 'draft',
      totalAmount,
      validUntil,
      slug
    } = body

    // Validate required fields
    if (!contactId || !title || !mdxContent) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'contactId, title, and mdxContent are required' })
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

    // Verify contact exists
    const contact = await db.query.contacts.findFirst({
      where: eq(schema.contacts.id, contactId)
    })

    if (!contact) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Contact not found' })
      }
    }

    // If projectId provided, verify it exists
    if (projectId) {
      const project = await db.query.projects.findFirst({
        where: eq(schema.projects.id, projectId)
      })

      if (!project) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Project not found' })
        }
      }
    }

    // Generate or validate slug
    let proposalSlug = slug || generateSlug(title)
    
    // Ensure slug is unique
    const existingProposal = await db.query.proposals.findFirst({
      where: eq(schema.proposals.slug, proposalSlug)
    })

    if (existingProposal) {
      // Add timestamp to make it unique
      proposalSlug = `${proposalSlug}-${Date.now()}`
    }

    // Create proposal
    const [proposal] = await db.insert(schema.proposals).values({
      contactId,
      projectId: projectId || null,
      slug: proposalSlug,
      title,
      description: description || null,
      mdxContent,
      status,
      totalAmount: totalAmount ? String(totalAmount) : null,
      validUntil: validUntil ? new Date(validUntil) : null
    }).returning()

    // Log activity: proposal created
    await db.insert(schema.proposalActivity).values({
      proposalId: proposal.id,
      action: 'created',
      performedBy: payload.userId,
      metadata: JSON.stringify({
        status,
        timestamp: new Date().toISOString()
      })
    }).catch(err => console.error('Error logging proposal creation:', err))

    // Format response
    const formattedProposal = {
      id: proposal.id,
      contactId: proposal.contactId,
      projectId: proposal.projectId,
      slug: proposal.slug,
      title: proposal.title,
      mdxContent: proposal.mdxContent,
      status: proposal.status,
      totalAmount: proposal.totalAmount ? parseFloat(proposal.totalAmount) : null,
      validUntil: proposal.validUntil,
      signedAt: proposal.signedAt,
      adminSignedAt: proposal.adminSignedAt,
      fullyExecutedAt: proposal.fullyExecutedAt,
      createdAt: proposal.createdAt,
      updatedAt: proposal.updatedAt
    }

    // Send email notification to client
    if (RESEND_API_KEY && status !== 'draft') {
      try {
        const resend = new Resend(RESEND_API_KEY)
        
        // Check if client has completed account setup
        const needsSetup = contact.accountSetup === 'false'
        
        // Generate appropriate token (24 hour expiration)
        let authToken, emailSubject, emailBody
        
        if (needsSetup) {
          // Account setup token
          authToken = jwt.sign(
            {
              email: contact.email,
              type: 'account-setup',
              contactId: contact.id,
              redirectTo: `/proposals/${proposal.slug}`
            },
            JWT_SECRET,
            { expiresIn: '24h' }
          )
          emailSubject = 'New Proposal Ready - Set Up Your Account'
          const setupUrl = `${PORTAL_URL}/account-setup?token=${authToken}`
          
          emailBody = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  margin: 0;
                  padding: 0;
                  background-color: #f4f4f4;
                }
                .container {
                  max-width: 600px;
                  margin: 40px auto;
                  background: white;
                  border-radius: 8px;
                  overflow: hidden;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                .header {
                  background: linear-gradient(135deg, #4bbf39 0%, #2d7a24 100%);
                  color: white;
                  padding: 40px 30px;
                  text-align: center;
                }
                .header h1 {
                  margin: 0;
                  font-size: 28px;
                  font-weight: 600;
                }
                .content {
                  padding: 40px 30px;
                }
                .content p {
                  margin: 0 0 20px;
                  font-size: 16px;
                }
                .proposal-card {
                  background: #f8f9fa;
                  border-left: 4px solid #4bbf39;
                  padding: 20px;
                  border-radius: 6px;
                  margin: 24px 0;
                }
                .proposal-card h2 {
                  margin: 0 0 12px;
                  font-size: 20px;
                  color: #2d7a24;
                }
                .proposal-card .detail {
                  margin: 8px 0;
                  font-size: 14px;
                  color: #555;
                }
                .cta-button {
                  display: inline-block;
                  background: #4bbf39;
                  color: white !important;
                  text-decoration: none;
                  padding: 14px 32px;
                  border-radius: 6px;
                  font-weight: 600;
                  font-size: 16px;
                  margin: 20px 0;
                  transition: background 0.3s;
                }
                .cta-button:hover {
                  background: #3da930;
                }
                .setup-notice {
                  background: #fff8e6;
                  border-left: 4px solid #ffc107;
                  padding: 16px 20px;
                  margin: 20px 0;
                  border-radius: 4px;
                }
                .setup-notice p {
                  margin: 0;
                  font-size: 14px;
                  color: #856404;
                }
                .expiry-notice {
                  background: #fff3cd;
                  border: 1px solid #ffc107;
                  padding: 12px 16px;
                  border-radius: 4px;
                  margin: 20px 0;
                  font-size: 14px;
                  color: #856404;
                }
                .footer {
                  background: #f8f9fa;
                  padding: 24px 30px;
                  text-align: center;
                  font-size: 14px;
                  color: #666;
                  border-top: 1px solid #e0e0e0;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>📋 New Proposal Ready!</h1>
                </div>
                
                <div class="content">
                  <p>Hi ${contact.name},</p>
                  
                  <p>Great news! We've prepared a new proposal for you:</p>
                  
                  <div class="proposal-card">
                    <h2>${proposal.title}</h2>
                    ${proposal.totalAmount ? `<div class="detail"><strong>Total Investment:</strong> $${parseFloat(proposal.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>` : ''}
                    ${proposal.validUntil ? `<div class="detail"><strong>Valid Until:</strong> ${new Date(proposal.validUntil).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>` : ''}
                  </div>
                  
                  <div class="setup-notice">
                    <p><strong>🎯 First Time Here?</strong> You'll need to set up your portal account to view this proposal. It only takes a minute!</p>
                  </div>
                  
                  <div style="text-align: center;">
                    <a href="${setupUrl}" class="cta-button">Set Up Account & View Proposal</a>
                  </div>
                  
                  <div class="expiry-notice">
                    ⏰ <strong>Important:</strong> This link expires in 24 hours. If it expires, contact us for a new link.
                  </div>
                  
                  <p>Once you're set up, you can sign in anytime with your password or use "Sign in with Google" for quick access.</p>
                  
                  <p>Questions? Just reply to this email or give us a call.</p>
                  
                  <p style="margin-top: 30px;">
                    <strong>The Uptrade Media Team</strong><br>
                    <span style="color: #666; font-size: 14px;">Elevating Your Digital Presence</span>
                  </p>
                </div>
                
                <div class="footer">
                  <p>© ${new Date().getFullYear()} Uptrade Media. All rights reserved.</p>
                  <p style="margin-top: 8px;">
                    <a href="${PORTAL_URL}" style="color: #4bbf39; text-decoration: none;">Visit Portal</a> • 
                    <a href="https://uptrademedia.com" style="color: #4bbf39; text-decoration: none;">Website</a>
                  </p>
                </div>
              </div>
            </body>
            </html>
          `
        } else {
          // Magic link for existing users
          authToken = jwt.sign(
            {
              email: contact.email,
              userId: contact.id,
              role: contact.role,
              type: 'magic-link'
            },
            JWT_SECRET,
            { expiresIn: '24h' }
          )
          emailSubject = `New Proposal: ${proposal.title}`
          const magicUrl = `${PORTAL_URL}/auth/magic?token=${authToken}&redirect=/proposals/${proposal.slug}`
          
          emailBody = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  margin: 0;
                  padding: 0;
                  background-color: #f4f4f4;
                }
                .container {
                  max-width: 600px;
                  margin: 40px auto;
                  background: white;
                  border-radius: 8px;
                  overflow: hidden;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                .header {
                  background: linear-gradient(135deg, #4bbf39 0%, #2d7a24 100%);
                  color: white;
                  padding: 40px 30px;
                  text-align: center;
                }
                .header h1 {
                  margin: 0;
                  font-size: 28px;
                  font-weight: 600;
                }
                .content {
                  padding: 40px 30px;
                }
                .content p {
                  margin: 0 0 20px;
                  font-size: 16px;
                }
                .proposal-card {
                  background: #f8f9fa;
                  border-left: 4px solid #4bbf39;
                  padding: 20px;
                  border-radius: 6px;
                  margin: 24px 0;
                }
                .proposal-card h2 {
                  margin: 0 0 12px;
                  font-size: 20px;
                  color: #2d7a24;
                }
                .proposal-card .detail {
                  margin: 8px 0;
                  font-size: 14px;
                  color: #555;
                }
                .cta-button {
                  display: inline-block;
                  background: #4bbf39;
                  color: white !important;
                  text-decoration: none;
                  padding: 14px 32px;
                  border-radius: 6px;
                  font-weight: 600;
                  font-size: 16px;
                  margin: 20px 0;
                  transition: background 0.3s;
                }
                .cta-button:hover {
                  background: #3da930;
                }
                .expiry-notice {
                  background: #fff3cd;
                  border: 1px solid #ffc107;
                  padding: 12px 16px;
                  border-radius: 4px;
                  margin: 20px 0;
                  font-size: 14px;
                  color: #856404;
                }
                .footer {
                  background: #f8f9fa;
                  padding: 24px 30px;
                  text-align: center;
                  font-size: 14px;
                  color: #666;
                  border-top: 1px solid #e0e0e0;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>📋 New Proposal Ready!</h1>
                </div>
                
                <div class="content">
                  <p>Hi ${contact.name},</p>
                  
                  <p>We've prepared a new proposal for your review:</p>
                  
                  <div class="proposal-card">
                    <h2>${proposal.title}</h2>
                    ${proposal.totalAmount ? `<div class="detail"><strong>Total Investment:</strong> $${parseFloat(proposal.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>` : ''}
                    ${proposal.validUntil ? `<div class="detail"><strong>Valid Until:</strong> ${new Date(proposal.validUntil).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>` : ''}
                  </div>
                  
                  <div style="text-align: center;">
                    <a href="${magicUrl}" class="cta-button">View Proposal (Quick Login)</a>
                  </div>
                  
                  <div class="expiry-notice">
                    ⏰ <strong>Quick Login Link:</strong> This one-click login link expires in 24 hours for security. You can always sign in normally at <a href="${PORTAL_URL}/login">${PORTAL_URL}/login</a>
                  </div>
                  
                  <p>The proposal includes detailed information about the project scope, timeline, and investment. Take your time reviewing it, and let us know if you have any questions.</p>
                  
                  <p>We're excited to work with you on this project!</p>
                  
                  <p style="margin-top: 30px;">
                    <strong>The Uptrade Media Team</strong><br>
                    <span style="color: #666; font-size: 14px;">Elevating Your Digital Presence</span>
                  </p>
                </div>
                
                <div class="footer">
                  <p>© ${new Date().getFullYear()} Uptrade Media. All rights reserved.</p>
                  <p style="margin-top: 8px;">
                    <a href="${PORTAL_URL}" style="color: #4bbf39; text-decoration: none;">Visit Portal</a> • 
                    <a href="https://uptrademedia.com" style="color: #4bbf39; text-decoration: none;">Website</a>
                  </p>
                </div>
              </div>
            </body>
            </html>
          `
        }
        
        await resend.emails.send({
          from: RESEND_FROM_EMAIL,
          to: contact.email,
          subject: emailSubject,
          html: emailBody
        })

        console.log(`Proposal notification sent to ${contact.email} (accountSetup: ${contact.accountSetup})`)
      } catch (emailError) {
        console.error('Failed to send proposal notification email:', emailError)
        // Don't fail the request if email fails
      }
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        proposal: formattedProposal,
        message: 'Proposal created successfully'
      })
    }

  } catch (error) {
    console.error('Error creating proposal:', error)
    
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
        error: 'Failed to create proposal',
        message: error.message 
      })
    }
  }
}
