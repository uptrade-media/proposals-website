import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getAuthenticatedUser, createSupabaseAdmin } from './utils/supabase.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'portal@send.uptrademedia.com'
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
    const magicLinks = {}
    const supabaseAdmin = createSupabaseAdmin()

    // Send email to each recipient
    if (RESEND_API_KEY) {
      const resend = new Resend(RESEND_API_KEY)
      const personalMsg = personalMessage || message
      const recipientName = clientName || proposal.contact?.name?.split(' ')[0] || ''

      for (const recipientEmail of recipients) {
        try {
          // Generate magic link for this recipient
          const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: recipientEmail,
            options: {
              redirectTo: `${PORTAL_BASE_URL}/p/${proposal.slug}`
            }
          })

          // Use the generated link or fall back to direct URL
          const proposalUrl = linkData?.properties?.action_link || `${PORTAL_BASE_URL}/p/${proposal.slug}`
          magicLinks[recipientEmail] = proposalUrl

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
    .header { background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%); padding: 48px 40px; text-align: center; }
    .logo { height: 44px; margin-bottom: 24px; }
    .header h1 { color: #ffffff !important; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.9) !important; margin: 12px 0 0; font-size: 16px; }
    .content { padding: 48px 40px; }
    .message-box { background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%); border-radius: 12px; padding: 24px; margin-bottom: 32px; border-left: 4px solid #4ade80; }
    .message-box p { margin: 0; color: #374151; white-space: pre-line; }
    .proposal-card { background: #f9fafb; border-radius: 16px; padding: 32px; margin: 32px 0; border: 1px solid #e5e7eb; }
    .proposal-title { font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 20px; }
    .proposal-meta { display: flex; gap: 32px; flex-wrap: wrap; }
    .meta-item { display: flex; flex-direction: column; gap: 4px; }
    .meta-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; }
    .meta-value { font-size: 18px; font-weight: 600; color: #111827; }
    .price { color: #059669 !important; font-size: 24px !important; }
    .cta-section { text-align: center; padding: 32px 0; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #4ade80 0%, #2dd4bf 100%); color: #0a0a0a !important; padding: 18px 48px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 18px; box-shadow: 0 4px 14px rgba(74, 222, 128, 0.4); }
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
    @media (prefers-color-scheme: dark) {
      body { background: #0a0a0a !important; }
      .wrapper { background: #0a0a0a !important; }
      .container { background: #1a1a2e !important; }
      .proposal-card { background: #16213e !important; border-color: #2d3748 !important; }
      .proposal-title { color: #f3f4f6 !important; }
      .meta-value { color: #f3f4f6 !important; }
      .content p { color: #d1d5db !important; }
      .footer { background: #16213e !important; border-color: #2d3748 !important; }
      .footer p { color: #9ca3af !important; }
      .footer .brand { color: #f3f4f6 !important; }
      .message-box { background: rgba(74, 222, 128, 0.1) !important; }
      .message-box p { color: #d1d5db !important; }
      .divider { background: #2d3748 !important; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <img src="https://portal.uptrademedia.com/logo.png" alt="Uptrade Media" class="logo" />
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
          <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
            <tr>
              <td style="padding-right: 32px; vertical-align: top;">
                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; font-weight: 500; margin-bottom: 4px;">Investment</div>
                <div style="font-size: 24px; font-weight: 700; color: #059669;">$${parseFloat(proposal.total_amount || 0).toLocaleString()}</div>
              </td>
              ${validUntilFormatted ? `
              <td style="vertical-align: top;">
                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; font-weight: 500; margin-bottom: 4px;">Valid Until</div>
                <div style="font-size: 18px; font-weight: 600; color: #111827;">${validUntilFormatted}</div>
              </td>
              ` : ''}
            </tr>
          </table>
          
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
          from: RESEND_FROM_EMAIL,
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
