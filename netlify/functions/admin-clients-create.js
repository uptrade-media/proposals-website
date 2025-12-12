// netlify/functions/admin-clients-create.js
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { Resend } from 'resend'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'portal@send.uptrademedia.com'
const RESEND_FROM = `Uptrade Media <${RESEND_FROM_EMAIL}>`
const PORTAL_URL = process.env.URL || 'http://localhost:8888'

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

  // Verify authentication using Supabase
  const { user, contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  try {
    // Only admins can create clients
    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only admins can create clients' })
      }
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}')
    const { name, email, company, phone, website, source, pipeline_stage, notes, type, contactType } = body

    console.log('Creating client with data:', {
      name,
      email,
      company,
      phone,
      website,
      source,
      pipeline_stage,
      notes,
      type,
      contactType
    })

    // Determine whether this is a prospect vs full client.
    // Historically some callers used `pipeline_stage: 'new_lead'` for prospects.
    const resolvedContactType = (contactType || type || (pipeline_stage === 'new_lead' ? 'prospect' : 'client'))

    // Validate required fields (name is required, email is optional for prospects)
    if (!name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'name is required' })
      }
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid email format' })
        }
      }
    }

    const supabase = createSupabaseAdmin()

    // Check if contact already exists (only if email provided)
    if (email) {
      const { data: existingContact, error: checkError } = await supabase
        .from('contacts')
        .select('id')
        .eq('email', email.toLowerCase())
        .single()

      if (existingContact) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ error: 'Contact with this email already exists' })
        }
      }
    }

    // Create contact with account_setup = 'false'
    const { data: newContact, error: insertError } = await supabase
      .from('contacts')
      .insert({
        email: email ? email.toLowerCase() : null,
        name,
        company: company || null,
        phone: phone || null,
        website: website || null,
        source: source || null,
        notes: notes || null,
        pipeline_stage: pipeline_stage || null,
        role: 'client',
        account_setup: 'false',
        google_id: null
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating contact:', insertError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create contact', message: insertError.message })
      }
    }

    // Only send email and generate magic link if email is provided and contact is not a prospect
    // Prospects typically don't need account setup emails immediately
    if (newContact.email && resolvedContactType !== 'prospect') {
      // Generate Supabase magic link for account setup
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: newContact.email,
        options: {
          redirectTo: `${PORTAL_URL}/account-setup`
        }
      })

      if (linkError) {
        console.error('Error generating magic link:', linkError)
      }

      const setupUrl = linkData?.properties?.action_link || `${PORTAL_URL}/login`

      // Send account setup email
      if (RESEND_API_KEY) {
        try {
          const resend = new Resend(RESEND_API_KEY)
          
          await resend.emails.send({
            from: RESEND_FROM,
            to: newContact.email,
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
                  <p>Hi ${newContact.name},</p>
                  
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
        // Don't fail the request if email fails
      }
    } else {
      console.warn('[admin-clients-create] RESEND_API_KEY not configured, skipping email')
    }
    } // End of email sending conditional for non-prospect contacts

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        contact: {
          id: newContact.id,
          email: newContact.email,
          name: newContact.name,
          company: newContact.company,
          role: newContact.role,
          contactType: resolvedContactType,
          pipelineStage: newContact.pipeline_stage,
          accountSetup: newContact.account_setup,
          createdAt: newContact.created_at
        },
        message: resolvedContactType === 'prospect' ? 'Prospect created successfully' : 'Client created and account setup email sent'
      })
    }

  } catch (error) {
    console.error('Error creating client:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', JSON.stringify(error, null, 2))

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to create client',
        message: error.message,
        details: error.toString()
      })
    }
  }
}
