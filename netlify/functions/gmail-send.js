// netlify/functions/gmail-send.js
// Send emails via Gmail API using domain-wide delegation
// Emails are sent as the actual user (ramsey@uptrademedia.com) and tracked in CRM

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { createGmailClient, buildRawEmail } from './utils/gmail.js'

// Default sender for Gmail (must be a real Google Workspace user)
const DEFAULT_GMAIL_SENDER = process.env.GMAIL_DELEGATED_USER || 'ramsey@uptrademedia.com'

export async function handler(event) {
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

  // Verify authentication
  const { user, contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  // Only admins can send emails
  if (contact.role !== 'admin') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Admin access required' })
    }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { 
      contactId,      // CRM contact ID to link email to
      to,             // Recipient email
      subject, 
      content,        // Plain text body
      html,           // Optional HTML body
      fromEmail,      // Which Gmail account to send from (default: ramsey@uptrademedia.com)
      inReplyTo,      // Message-ID for threading
      threadId,       // Gmail thread ID for replies
      auditId,        // Optional: Audit to attach with magic link
      proposalId,     // Optional: Proposal to attach with magic link
      includeSignature = true, // Whether to append Gmail signature
      scheduledFollowups // Optional: Array of {delayDays, subject, body, stopOnReply}
    } = body

    // Validate required fields
    if (!to || !subject || !content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'to, subject, and content are required' })
      }
    }

    // Determine sender
    const senderEmail = fromEmail || DEFAULT_GMAIL_SENDER
    
    // Only allow sending from @uptrademedia.com (Google Workspace domain)
    if (!senderEmail.endsWith('@uptrademedia.com')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Gmail API can only send from @uptrademedia.com addresses',
          hint: 'Use Resend for @send.uptrademedia.com addresses'
        })
      }
    }

    const supabase = createSupabaseAdmin()

    // Verify the contact exists if contactId provided
    let targetContact = null
    if (contactId) {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, email, name, company')
        .eq('id', contactId)
        .single()

      if (error) {
        console.warn('[gmail-send] Contact not found:', contactId)
      } else {
        targetContact = data
      }
    }

    // Create Gmail client with domain-wide delegation
    const { gmail } = await createGmailClient(senderEmail)

    // Build the email
    const fromName = contact.name || 'Uptrade Media'
    const fromHeader = `${fromName} <${senderEmail}>`

    // Generate audit magic link if auditId provided
    let auditMagicLink = null
    let auditHtml = ''
    if (auditId) {
      const { data: audit, error: auditError } = await supabase
        .from('audits')
        .select('id, target_url, score_overall, magic_token')
        .eq('id', auditId)
        .single()

      if (audit && !auditError) {
        // Generate a new magic token if needed
        let magicToken = audit.magic_token
        if (!magicToken) {
          const crypto = await import('crypto')
          magicToken = crypto.randomBytes(32).toString('hex')
          const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
          await supabase
            .from('audits')
            .update({ magic_token: magicToken, magic_token_expires: expires.toISOString() })
            .eq('id', auditId)
        }
        
        const portalUrl = process.env.URL || 'https://portal.uptrademedia.com'
        auditMagicLink = `${portalUrl}/audit/${auditId}?token=${magicToken}`
        
        // Build audit HTML block
        auditHtml = `
          <div style="margin: 24px 0; padding: 20px; background: linear-gradient(135deg, #4bbf39 0%, #39bfb0 100%); border-radius: 12px; text-align: center;">
            <p style="margin: 0 0 12px 0; color: white; font-weight: 600; font-size: 16px;">📊 Your Website Audit Results</p>
            ${audit.score_overall ? `<p style="margin: 0 0 16px 0; color: rgba(255,255,255,0.9); font-size: 14px;">Overall Score: ${audit.score_overall}/100</p>` : ''}
            <a href="${auditMagicLink}" style="display: inline-block; padding: 12px 24px; background: white; color: #4bbf39; text-decoration: none; border-radius: 8px; font-weight: 600;">View Full Audit Report →</a>
          </div>
        `
      }
    }

    // Generate proposal magic link if proposalId provided
    let proposalMagicLink = null
    let proposalHtml = ''
    if (proposalId) {
      const { data: proposal, error: proposalError } = await supabase
        .from('proposals')
        .select('id, title, slug, total_amount')
        .eq('id', proposalId)
        .single()

      if (proposal && !proposalError) {
        // Proposals use the slug for public access (no magic token needed)
        const portalUrl = process.env.URL || 'https://portal.uptrademedia.com'
        proposalMagicLink = `${portalUrl}/p/${proposal.slug}`
        
        // Build proposal HTML block - using brand teal colors
        proposalHtml = `
          <div style="margin: 24px 0; padding: 20px; background: linear-gradient(135deg, #39bfb0 0%, #4bbf39 100%); border-radius: 12px; text-align: center;">
            <p style="margin: 0 0 12px 0; color: white; font-weight: 600; font-size: 16px;">📄 Your Custom Proposal</p>
            ${proposal.title ? `<p style="margin: 0 0 8px 0; color: rgba(255,255,255,0.95); font-size: 15px;">${proposal.title}</p>` : ''}
            ${proposal.total_amount ? `<p style="margin: 0 0 16px 0; color: rgba(255,255,255,0.9); font-size: 14px;">Investment: $${Number(proposal.total_amount).toLocaleString()}</p>` : ''}
            <a href="${proposalMagicLink}" style="display: inline-block; padding: 12px 24px; background: white; color: #39bfb0; text-decoration: none; border-radius: 8px; font-weight: 600;">Review Proposal →</a>
          </div>
        `
      }
    }

    // Get Gmail signature if requested
    let signatureHtml = ''
    if (includeSignature) {
      try {
        const { data: sendAs } = await gmail.users.settings.sendAs.get({
          userId: 'me',
          sendAsEmail: senderEmail
        })
        if (sendAs?.signature) {
          signatureHtml = `<div style="margin-top: 24px;">${sendAs.signature}</div>`
        }
      } catch (sigError) {
        console.warn('[gmail-send] Could not fetch signature:', sigError.message)
      }
    }

    // Generate HTML with audit link, proposal link, and signature
    const htmlContent = html || buildDefaultHtml(content, fromName, auditHtml, proposalHtml, signatureHtml)

    const rawEmail = buildRawEmail({
      to,
      from: fromHeader,
      subject,
      body: content,
      html: htmlContent,
      inReplyTo,
      references: inReplyTo
    })

    // Send via Gmail API
    const sendParams = {
      userId: 'me',
      requestBody: {
        raw: rawEmail
      }
    }

    // If replying to existing thread, include threadId
    if (threadId) {
      sendParams.requestBody.threadId = threadId
    }

    const result = await gmail.users.messages.send(sendParams)

    console.log('[gmail-send] Email sent:', result.data.id)

    // Get the full message to extract Message-ID for threading
    const sentMessage = await gmail.users.messages.get({
      userId: 'me',
      id: result.data.id,
      format: 'metadata',
      metadataHeaders: ['Message-ID']
    })

    const messageId = sentMessage.data.payload?.headers?.find(
      h => h.name === 'Message-ID'
    )?.value

    // Store in email_tracking table
    const { data: savedEmail, error: saveError } = await supabase
      .from('email_tracking')
      .insert({
        contact_id: contactId || null,
        email_type: 'gmail',
        subject,
        recipient_email: to,
        sender_id: contact.id,
        sender_email: senderEmail,
        resend_email_id: null, // Not a Resend email
        status: 'sent',
        sent_at: new Date().toISOString(),
        // Store Gmail-specific data for threading
        metadata: {
          gmail_message_id: result.data.id,
          gmail_thread_id: result.data.threadId,
          message_id_header: messageId,
          via: 'gmail_api'
        }
      })
      .select()
      .single()

    if (saveError) {
      console.error('[gmail-send] Failed to save email record:', saveError)
    }

    // Schedule follow-up emails if provided
    if (scheduledFollowups && scheduledFollowups.length > 0 && savedEmail) {
      console.log('[gmail-send] Scheduling', scheduledFollowups.length, 'follow-up emails')
      
      const followupsToInsert = scheduledFollowups.map((followup, index) => {
        const scheduledFor = new Date()
        scheduledFor.setDate(scheduledFor.getDate() + followup.delayDays)
        
        return {
          contact_id: contactId,
          original_email_id: savedEmail.id,
          thread_id: result.data.threadId,
          sequence_number: index + 1,
          subject: followup.subject,
          body: followup.body,
          scheduled_for: scheduledFor.toISOString(),
          status: 'pending',
          stop_on_reply: followup.stopOnReply !== false, // Default true
          sender_email: senderEmail,
          recipient_email: to
        }
      })

      const { error: followupError } = await supabase
        .from('scheduled_followups')
        .insert(followupsToInsert)

      if (followupError) {
        console.error('[gmail-send] Failed to schedule follow-ups:', followupError)
      } else {
        console.log('[gmail-send] Scheduled', followupsToInsert.length, 'follow-up emails')
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        messageId: result.data.id,
        threadId: result.data.threadId,
        messageIdHeader: messageId,
        savedEmail: savedEmail || null,
        message: `Email sent via Gmail to ${to}`
      })
    }

  } catch (error) {
    console.error('[gmail-send] Error:', error)
    
    // Handle specific Gmail API errors
    if (error.code === 403) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ 
          error: 'Gmail API access denied',
          details: 'Check domain-wide delegation scopes'
        })
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}

/**
 * Build default HTML email template
 */
function buildDefaultHtml(content, senderName, auditHtml = '', proposalHtml = '', signatureHtml = '') {
  const htmlBody = content
    .split('\n\n')
    .map(p => `<p style="margin: 0 0 16px 0; line-height: 1.6;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('')

  // If we have a signature from Gmail, use it; otherwise use default
  const signatureBlock = signatureHtml || `
    <p style="margin: 32px 0 0 0; color: #666; font-size: 14px;">
      Best,<br>
      <strong>${senderName}</strong><br>
      Uptrade Media
    </p>
  `

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; line-height: 1.6;">
  ${htmlBody}
  ${auditHtml}
  ${proposalHtml}
  ${signatureBlock}
</body>
</html>
`
}
