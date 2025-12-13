import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getAuthenticatedUser, createSupabaseAdmin } from './utils/supabase.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'portal@send.uptrademedia.com'
const RESEND_FROM = `Uptrade Media <${RESEND_FROM_EMAIL}>`
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ramsey@uptrademedia.com'
const PORTAL_BASE_URL = process.env.URL || process.env.PORTAL_BASE_URL || 'https://portal.uptrademedia.com'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    const { contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: authError || 'Not authenticated' })
      }
    }

    // Only admins can send proposals
    if (contact.role !== 'admin') {
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
    const { email, clientEmail, clientName, message, personalMessage, subject, recipients: recipientList } = body
    
    // Support both single email and array of recipients
    let recipients = []
    if (recipientList && Array.isArray(recipientList)) {
      recipients = recipientList.filter(e => e && typeof e === 'string')
    } else if (email || clientEmail) {
      recipients = [email || clientEmail]
    }

    if (recipients.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'At least one recipient email is required' })
      }
    }

    // Use the first recipient as the primary for database storage
    const primaryEmail = recipients[0]

    // Fetch proposal with contact
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select(`
        *,
        contact:contacts!proposals_contact_id_fkey (*)
      `)
      .eq('id', proposalId)
      .single()

    if (proposalError || !proposal) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Proposal not found' })
      }
    }

    // Update proposal status and timestamps
    const { data: updatedProposal, error: updateError } = await supabase
      .from('proposals')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        client_email: primaryEmail,
        sent_to_recipients: recipients, // Store all recipients for contract signed emails
        version: (proposal.version || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', proposalId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Log activity: proposal sent
    await supabase
      .from('proposal_activity')
      .insert({
        proposal_id: proposalId,
        action: 'sent',
        performed_by: contact.id,
        metadata: JSON.stringify({
          recipients: recipients,
          recipientCount: recipients.length,
          timestamp: new Date().toISOString()
        })
      })
      .then(({ error }) => {
        if (error) console.error('Error logging proposal send:', error)
      })

    // Calculate days until expiry for urgency messaging
    const daysLeft = proposal.valid_until 
      ? Math.ceil((new Date(proposal.valid_until) - new Date()) / (1000 * 60 * 60 * 24))
      : null
    const validUntilFormatted = proposal.valid_until 
      ? new Date(proposal.valid_until).toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        })
      : null

    // Track email send results
    const emailResults = []
    const supabaseAdmin = createSupabaseAdmin()

    // Send email to each recipient
    if (RESEND_API_KEY) {
      const resend = new Resend(RESEND_API_KEY)
      const personalMsg = personalMessage || message
      const recipientName = clientName || proposal.contact?.name?.split(' ')[0] || ''

      for (const recipientEmail of recipients) {
        try {
          // Direct proposal URL (no magic link needed - proposals are public with slug)
          const proposalUrl = `${PORTAL_BASE_URL}/p/${proposal.slug}`

          // Build email HTML with email best practices:
          // - Table-based layout for compatibility
          // - Inline styles only (no CSS classes for email)
          // - Web-safe fonts with fallbacks
          // - High contrast text colors
          // - Mobile-friendly widths
          const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Your Proposal is Ready</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    .button-link { padding: 16px 40px !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    /* Mobile Styles */
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .stack-column { display: block !important; width: 100% !important; }
      .stack-column-center { display: block !important; width: 100% !important; text-align: center !important; }
      .mobile-padding { padding: 24px 20px !important; }
      .mobile-padding-header { padding: 32px 20px 24px !important; }
      .mobile-hide { display: none !important; }
      .mobile-center { text-align: center !important; }
      .mobile-full-width { width: 100% !important; padding-right: 0 !important; padding-bottom: 16px !important; }
      .mobile-font-lg { font-size: 22px !important; }
      .mobile-font-xl { font-size: 24px !important; }
      .cta-button { padding: 14px 32px !important; font-size: 15px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  
  <!-- Wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        
        <!-- Email Container -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td align="center" class="mobile-padding-header" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 40px 32px;">
              <img src="https://portal.uptrademedia.com/logo.png" alt="Uptrade Media" width="140" style="display: block; margin-bottom: 20px; max-width: 140px; height: auto;" />
              <h1 class="mobile-font-lg" style="margin: 0; color: #94a3b8; font-size: 26px; font-weight: 700; line-height: 1.3;">Your Proposal is Ready</h1>
              <p style="margin: 10px 0 0; color: #94a3b8; font-size: 15px; line-height: 1.5;">A custom proposal prepared just for you</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td class="mobile-padding" style="padding: 40px;">
              
              ${personalMsg ? `
              <!-- Personal Message -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 28px;">
                <tr>
                  <td style="background-color: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 8px; padding: 20px;">
                    <p style="margin: 0; color: #166534; font-size: 15px; line-height: 1.6;">${personalMsg.replace(/\n/g, '<br>')}</p>
                  </td>
                </tr>
              </table>
              ` : recipientName ? `
              <!-- Greeting -->
              <p style="margin: 0 0 16px; color: #1f2937; font-size: 16px; line-height: 1.6;">Hi ${recipientName},</p>
              <p style="margin: 0 0 28px; color: #4b5563; font-size: 15px; line-height: 1.6;">We've put together a custom proposal based on our conversation. Click below to review the details and take the next step.</p>
              ` : `
              <p style="margin: 0 0 28px; color: #4b5563; font-size: 15px; line-height: 1.6;">We've prepared a custom proposal for you. Click below to review the details.</p>
              `}
              
              <!-- Proposal Card -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 24px;">
                    <h2 class="mobile-font-lg" style="margin: 0 0 20px; color: #0f172a; font-size: 20px; font-weight: 700; line-height: 1.3;">${proposal.title}</h2>
                    
                    <!-- Meta Info Row -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td class="mobile-full-width" width="50%" valign="top" style="padding-right: 16px;">
                          <p style="margin: 0 0 4px; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Investment</p>
                          <p class="mobile-font-xl" style="margin: 0; color: #059669; font-size: 28px; font-weight: 700;">$${parseFloat(proposal.total_amount || 0).toLocaleString()}</p>
                        </td>
                        ${validUntilFormatted ? `
                        <td class="mobile-full-width" width="50%" valign="top">
                          <p style="margin: 0 0 4px; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Valid Until</p>
                          <p style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 600;">${validUntilFormatted}</p>
                        </td>
                        ` : ''}
                      </tr>
                    </table>
                    
                    ${daysLeft && daysLeft <= 7 && daysLeft > 0 ? `
                    <!-- Urgency Banner -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 20px;">
                      <tr>
                        <td align="center" style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 14px 20px;">
                          <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">⏰ Only ${daysLeft} day${daysLeft > 1 ? 's' : ''} left to accept this offer</p>
                        </td>
                      </tr>
                    </table>
                    ` : ''}
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${proposalUrl}" target="_blank" class="cta-button" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 700; box-shadow: 0 4px 14px rgba(34, 197, 94, 0.35);">View Your Proposal →</a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; color: #64748b; font-size: 13px;">Click the button above to view the full proposal</p>
                  </td>
                </tr>
              </table>
              
              <!-- Divider -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 28px 0;">
                <tr>
                  <td style="border-top: 1px solid #e2e8f0;"></td>
                </tr>
              </table>
              
              <!-- Help Text -->
              <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6; text-align: center;">Questions? Simply reply to this email or give us a call.</p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td class="mobile-padding" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 28px 40px; text-align: center;">
              <p style="margin: 0 0 4px; color: #0f172a; font-size: 15px; font-weight: 700;">Uptrade Media</p>
              <p style="margin: 0 0 16px; color: #64748b; font-size: 13px;">Premium Digital Marketing & Web Design</p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">This email was sent to ${recipientEmail}</p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>`

          const emailSubject = subject || `${recipientName ? recipientName + ', your' : 'Your'} proposal is ready`

          await resend.emails.send({
            from: RESEND_FROM,
            to: recipientEmail,
            subject: emailSubject,
            html: emailHtml,
            replyTo: ADMIN_EMAIL
          })

          emailResults.push({ email: recipientEmail, success: true })
        } catch (emailError) {
          console.error(`Error sending email to ${recipientEmail}:`, emailError)
          emailResults.push({ email: recipientEmail, success: false, error: emailError.message })
        }
      }

      // Send single admin notification for all recipients
      try {
        const recipientsList = recipients.map(e => `<li>${e}</li>`).join('')
        await resend.emails.send({
          from: RESEND_FROM,
          to: ADMIN_EMAIL,
          subject: `✅ Proposal Sent: ${proposal.title} (${recipients.length} recipient${recipients.length > 1 ? 's' : ''})`,
          html: `
            <div style="font-family: -apple-system, sans-serif; max-width: 500px;">
              <h3>Proposal Sent Successfully</h3>
              <p><strong>Proposal:</strong> ${proposal.title}</p>
              <p><strong>Sent to:</strong></p>
              <ul>${recipientsList}</ul>
              <p><strong>Amount:</strong> $${parseFloat(proposal.total_amount || 0).toLocaleString()}</p>
              <p><strong>Sent by:</strong> ${contact.email}</p>
              <p style="margin-top: 20px;">
                <a href="${PORTAL_BASE_URL}/p/${proposal.slug}" style="color: #667eea;">View Proposal</a>
              </p>
            </div>
          `
        })
      } catch (err) {
        console.error('Error sending admin notification:', err)
      }
    }

    const successCount = emailResults.filter(r => r.success).length
    const failedCount = emailResults.filter(r => !r.success).length

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
          sentAt: updatedProposal.sent_at,
          clientEmail: updatedProposal.client_email,
          version: updatedProposal.version
        },
        recipients: recipients,
        emailResults: emailResults,
        successCount: successCount,
        failedCount: failedCount,
        message: failedCount > 0 
          ? `Proposal sent to ${successCount} of ${recipients.length} recipients`
          : `Proposal sent successfully to ${recipients.length} recipient${recipients.length > 1 ? 's' : ''}`
      })
    }
  } catch (error) {
    console.error('Error sending proposal:', error)

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
