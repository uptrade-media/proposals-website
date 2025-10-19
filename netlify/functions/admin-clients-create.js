// netlify/functions/admin-clients-create.js
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
    
    // Only admins can create clients
    if (payload.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only admins can create clients' })
      }
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}')
    const { name, email, company, phone, website, source } = body

    // Validate required fields
    if (!name || !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'name and email are required' })
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid email format' })
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

    // Check if contact already exists
    const existingContact = await db.query.contacts.findFirst({
      where: eq(schema.contacts.email, email.toLowerCase())
    })

    if (existingContact) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'Contact with this email already exists' })
      }
    }

    // Create contact with accountSetup = 'false'
    const [contact] = await db.insert(schema.contacts).values({
      email: email.toLowerCase(),
      name,
      company: company || null,
      phone: phone || null,
      website: website || null,
      source: source || null,
      role: 'client',
      accountSetup: 'false', // Client needs to set up account
      password: null, // No password yet
      googleId: null
    }).returning()

    // Generate magic link token (24 hour expiration)
    const magicToken = jwt.sign(
      {
        email: contact.email,
        type: 'account-setup',
        contactId: contact.id
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    // Send account setup email
    if (RESEND_API_KEY) {
      try {
        const resend = new Resend(RESEND_API_KEY)
        const setupUrl = `${PORTAL_URL}/account-setup?token=${magicToken}`
        
        const emailResult = await resend.emails.send({
          from: RESEND_FROM_EMAIL,
          to: contact.email,
          subject: 'Welcome to Uptrade Media Portal - Set Up Your Account',
          html: `
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
                .features {
                  background: #f8f9fa;
                  padding: 24px;
                  border-radius: 6px;
                  margin: 24px 0;
                }
                .features h3 {
                  margin: 0 0 16px;
                  font-size: 18px;
                  color: #2d7a24;
                }
                .features ul {
                  margin: 0;
                  padding-left: 20px;
                }
                .features li {
                  margin: 8px 0;
                  color: #555;
                }
                .auth-options {
                  background: #fff8e6;
                  border-left: 4px solid #ffc107;
                  padding: 16px 20px;
                  margin: 20px 0;
                  border-radius: 4px;
                }
                .auth-options p {
                  margin: 0;
                  font-size: 14px;
                  color: #666;
                }
                .footer {
                  background: #f8f9fa;
                  padding: 24px 30px;
                  text-align: center;
                  font-size: 14px;
                  color: #666;
                  border-top: 1px solid #e0e0e0;
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
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 Welcome to Uptrade Media!</h1>
                </div>
                
                <div class="content">
                  <p>Hi ${contact.name},</p>
                  
                  <p>Your client portal account has been created. Get started by setting up your account credentials to access:</p>
                  
                  <div class="features">
                    <h3>What's Inside Your Portal:</h3>
                    <ul>
                      <li><strong>Proposals</strong> - Review and sign project proposals</li>
                      <li><strong>Projects</strong> - Track progress and milestones</li>
                      <li><strong>Files</strong> - Access deliverables and documents</li>
                      <li><strong>Messages</strong> - Direct communication with your team</li>
                      <li><strong>Billing</strong> - View and pay invoices online</li>
                    </ul>
                  </div>
                  
                  <div style="text-align: center;">
                    <a href="${setupUrl}" class="cta-button">Set Up Your Account</a>
                  </div>
                  
                  <div class="auth-options">
                    <p><strong>💡 Pro Tip:</strong> You can set up a password or use "Sign in with Google" for quick access. Choose whichever works best for you!</p>
                  </div>
                  
                  <div class="expiry-notice">
                    ⏰ <strong>Important:</strong> This setup link expires in 24 hours. If it expires, contact your account manager for a new link.
                  </div>
                  
                  <p>If you have any questions, just reply to this email or contact us at <a href="mailto:support@uptrademedia.com">support@uptrademedia.com</a>.</p>
                  
                  <p>Looking forward to working with you!</p>
                  
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
        })
      } catch (emailError) {
        console.error('[admin-clients-create] Failed to send account setup email:', emailError)
        console.error('[admin-clients-create] Error details:', emailError.message, emailError.stack)
        // Don't fail the request if email fails
      }
    } else {
      console.warn('[admin-clients-create] RESEND_API_KEY not configured, skipping email')
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        contact: {
          id: contact.id,
          email: contact.email,
          name: contact.name,
          company: contact.company,
          role: contact.role,
          accountSetup: contact.accountSetup,
          createdAt: contact.createdAt
        },
        message: 'Client created and account setup email sent'
      })
    }

  } catch (error) {
    console.error('Error creating client:', error)
    
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
        error: 'Failed to create client',
        message: error.message 
      })
    }
  }
}
