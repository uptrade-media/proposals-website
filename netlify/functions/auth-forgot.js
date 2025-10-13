// netlify/functions/auth-forgot.js
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as schema from '../../src/db/schema.ts'
import { Resend } from 'resend'

const JWT_SECRET = process.env.AUTH_JWT_SECRET
const DATABASE_URL = process.env.DATABASE_URL
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'portal@uptrademedia.com'
const PORTAL_URL = process.env.URL || 'http://localhost:8888'

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
    const { email } = JSON.parse(event.body || '{}')

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email required' })
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      // Return generic success to avoid email enumeration
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'If your account exists, we emailed instructions to reset your password.'
        })
      }
    }

    const sql = neon(DATABASE_URL)
    const db = drizzle(sql, { schema })

    // Check if user exists
    const user = await db.query.contacts.findFirst({
      where: eq(schema.contacts.email, email.toLowerCase())
    })

    // Always return success to avoid email enumeration
    if (!user) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'If your account exists, we emailed instructions to reset your password.'
        })
      }
    }

    // Don't send reset for Google-only users (no password)
    if (user.googleId && !user.password) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'If your account exists, we emailed instructions to reset your password.'
        })
      }
    }

    // Generate password reset token (24-hour expiration)
    const resetToken = jwt.sign(
      {
        email: user.email,
        userId: user.id,
        type: 'password-reset'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    // Send password reset email
    if (RESEND_API_KEY) {
      try {
        const resend = new Resend(RESEND_API_KEY)
        const resetUrl = `${PORTAL_URL}/reset-password?token=${resetToken}`

        await resend.emails.send({
          from: RESEND_FROM_EMAIL,
          to: user.email,
          subject: 'Reset Your Password - Uptrade Media Portal',
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
                .warning-box {
                  background: #fff3cd;
                  border-left: 4px solid #ffc107;
                  padding: 16px 20px;
                  margin: 20px 0;
                  border-radius: 4px;
                }
                .warning-box p {
                  margin: 0;
                  font-size: 14px;
                  color: #856404;
                }
                .security-notice {
                  background: #e7f3ff;
                  border-left: 4px solid #2196F3;
                  padding: 16px 20px;
                  margin: 20px 0;
                  border-radius: 4px;
                }
                .security-notice p {
                  margin: 0;
                  font-size: 14px;
                  color: #0c5592;
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
                  <h1>🔐 Password Reset Request</h1>
                </div>
                
                <div class="content">
                  <p>Hi ${user.name},</p>
                  
                  <p>We received a request to reset your password for your Uptrade Media Portal account.</p>
                  
                  <p>Click the button below to create a new password:</p>
                  
                  <div style="text-align: center;">
                    <a href="${resetUrl}" class="cta-button">Reset My Password</a>
                  </div>
                  
                  <div class="warning-box">
                    <p>⏰ <strong>Important:</strong> This link expires in 24 hours for security. If it expires, you can request a new one from the login page.</p>
                  </div>
                  
                  <div class="security-notice">
                    <p>🛡️ <strong>Security Tip:</strong> If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                  </div>
                  
                  <p>For security reasons, we can't reset your password over email. You must use the link above to set a new password.</p>
                  
                  <p>If you're having trouble clicking the button, copy and paste this link into your browser:</p>
                  <p style="word-break: break-all; font-size: 12px; color: #666;">${resetUrl}</p>
                  
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

        console.log(`Password reset email sent to ${user.email}`)
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError)
        // Still return success to avoid leaking info
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'If your account exists, we emailed instructions to reset your password.'
      })
    }

  } catch (error) {
    console.error('Password reset error:', error)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'If your account exists, we emailed instructions to reset your password.'
      })
    }
  }
}
