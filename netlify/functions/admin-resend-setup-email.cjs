const jwt = require('jsonwebtoken')
const { neon } = require('@neondatabase/serverless')
const { Resend } = require('resend')

const resend = new Resend(process.env.RESEND_API_KEY)

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Verify admin authentication
    const token = event.headers.cookie?.match(/um_session=([^;]+)/)?.[1]
    if (!token) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET)
    if (payload.role !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Admin access required' }) }
    }

    // Parse request
    const { clientId } = JSON.parse(event.body || '{}')
    if (!clientId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Client ID is required' }) }
    }

    // Get client from database
    const sql = neon(process.env.DATABASE_URL)
    const contacts = await sql`
      SELECT id, email, name, "accountSetup"
      FROM contacts
      WHERE id = ${clientId}
      LIMIT 1
    `

    if (contacts.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Client not found' }) }
    }

    const contact = contacts[0]

    // Generate setup token (valid for 24 hours)
    const setupToken = jwt.sign(
      { 
        email: contact.email,
        name: contact.name,
        type: 'account_setup'
      },
      process.env.AUTH_JWT_SECRET,
      { expiresIn: '24h' }
    )

    const PORTAL_URL = process.env.PORTAL_BASE_URL || 'http://localhost:8888'
    const setupUrl = `${PORTAL_URL}/setup?token=${setupToken}`

    // Check if account is already set up
    const isSetup = contact.accountSetup === 'true' || contact.accountSetup === true
    const emailSubject = isSetup 
      ? 'Your Uptrade Media Portal Access Link' 
      : 'Complete Your Uptrade Media Portal Setup'

    // Send email via Resend
    if (process.env.RESEND_API_KEY) {
      console.log('[admin-resend-setup-email] Sending email to:', contact.email)
      console.log('[admin-resend-setup-email] Setup status:', isSetup ? 'complete' : 'pending')

      try {
        const emailResult = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'portal@uptrademedia.com',
          to: contact.email,
          subject: emailSubject,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #4bbf39 0%, #39bfb0 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">Uptrade Media</h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Client Portal</p>
                </div>
                
                <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                  <h2 style="color: #1f2937; margin-top: 0;">${isSetup ? 'Portal Access Link' : 'Complete Your Account Setup'}</h2>
                  
                  <p style="color: #4b5563; margin-bottom: 24px;">
                    Hi ${contact.name},
                  </p>
                  
                  <p style="color: #4b5563; margin-bottom: 24px;">
                    ${isSetup 
                      ? 'Here is your secure access link to the Uptrade Media Client Portal:'
                      : 'Your account has been created in the Uptrade Media Client Portal. Click the button below to complete your setup and access your portal:'
                    }
                  </p>
                  
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${setupUrl}" 
                       style="background: linear-gradient(135deg, #4bbf39 0%, #39bfb0 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                      ${isSetup ? 'Access Portal' : 'Complete Setup'}
                    </a>
                  </div>
                  
                  ${!isSetup ? `
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 24px 0;">
                      <p style="margin: 0 0 12px 0; color: #374151; font-weight: 600;">What's included:</p>
                      <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
                        <li style="margin-bottom: 8px;">View and track your projects</li>
                        <li style="margin-bottom: 8px;">Access important documents and files</li>
                        <li style="margin-bottom: 8px;">Message our team directly</li>
                        <li style="margin-bottom: 8px;">Review proposals and invoices</li>
                        <li>Monitor project progress and analytics</li>
                      </ul>
                    </div>
                  ` : ''}
                  
                  <p style="color: #6b7280; font-size: 14px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                    This link is valid for 24 hours. If you have any questions, please don't hesitate to reach out.
                  </p>
                  
                  <p style="color: #6b7280; font-size: 14px; margin: 16px 0 0 0;">
                    Best regards,<br>
                    <strong style="color: #4bbf39;">Uptrade Media Team</strong>
                  </p>
                </div>
                
                <div style="text-align: center; margin-top: 24px; color: #9ca3af; font-size: 12px;">
                  <p>© ${new Date().getFullYear()} Uptrade Media. All rights reserved.</p>
                </div>
              </body>
            </html>
          `
        })

        console.log('[admin-resend-setup-email] Email sent successfully:', emailResult.id)
      } catch (emailError) {
        console.error('[admin-resend-setup-email] Failed to send email:', emailError)
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: 'Failed to send email',
            details: emailError.message 
          })
        }
      }
    } else {
      console.warn('[admin-resend-setup-email] RESEND_API_KEY not configured')
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Email service not configured' })
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: 'Account setup email sent successfully'
      })
    }
  } catch (error) {
    console.error('[admin-resend-setup-email] Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    }
  }
}
