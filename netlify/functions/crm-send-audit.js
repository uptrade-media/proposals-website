/**
 * CRM Send Audit Email Function
 * 
 * Sends an audit report to a contact with tracking.
 * - Supports personal "from" email addresses
 * - Tracks opens and clicks via Resend webhooks
 * - Records in email_tracking table
 */

import { Resend } from 'resend'
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

const resend = new Resend(process.env.RESEND_API_KEY)
const PORTAL_BASE_URL = process.env.PORTAL_BASE_URL || 'https://portal.uptrademedia.com'

/**
 * Generate audit email HTML
 */
function generateAuditEmailHtml(options) {
  const { 
    recipientName, 
    auditUrl, 
    websiteUrl, 
    mobileScore, 
    desktopScore, 
    senderName 
  } = options

  const firstName = recipientName?.split(' ')[0] || 'there'
  const scoreColor = mobileScore < 50 ? '#ef4444' : mobileScore < 75 ? '#f59e0b' : '#22c55e'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Website Performance Report</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="text-align: center; margin-bottom: 30px;">
    <img src="https://portal.uptrademedia.com/uptrade-logo.png" alt="Uptrade Media" style="height: 40px;" />
  </div>

  <p>Hi ${firstName},</p>

  <p>I just ran a quick performance analysis on <strong>${websiteUrl}</strong> and wanted to share some insights with you.</p>

  <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
    <p style="color: #a5b4fc; margin: 0 0 8px 0; font-size: 14px;">Mobile Performance Score</p>
    <p style="color: ${scoreColor}; font-size: 48px; font-weight: bold; margin: 0;">${mobileScore}<span style="font-size: 24px; color: #a5b4fc;">/100</span></p>
    ${mobileScore < 50 ? '<p style="color: #fca5a5; margin: 8px 0 0 0; font-size: 12px;">⚠️ Needs Improvement</p>' : ''}
  </div>

  <p>The full report includes:</p>
  <ul style="color: #4b5563; padding-left: 20px;">
    <li>Core Web Vitals breakdown (LCP, FID, CLS)</li>
    <li>Page load time analysis</li>
    <li>SEO audit with actionable recommendations</li>
    <li>Mobile vs Desktop comparison</li>
    <li>Performance opportunities ranked by impact</li>
  </ul>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${auditUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">View Full Report →</a>
  </div>

  <p>I'd love to walk you through the findings and discuss how we could improve your site's performance and search rankings. Would you have 15 minutes this week for a quick call?</p>

  <p>Best,<br/>${senderName || 'The Uptrade Team'}</p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
  
  <p style="font-size: 12px; color: #9ca3af; text-align: center;">
    Uptrade Media | Web Design & Digital Marketing<br/>
    <a href="https://uptrademedia.com" style="color: #6366f1;">uptrademedia.com</a>
  </p>

</body>
</html>
  `.trim()
}

/**
 * Generate plain text version
 */
function generateAuditEmailText(options) {
  const { recipientName, auditUrl, websiteUrl, mobileScore, senderName } = options
  const firstName = recipientName?.split(' ')[0] || 'there'

  return `
Hi ${firstName},

I just ran a quick performance analysis on ${websiteUrl} and wanted to share some insights with you.

Mobile Performance Score: ${mobileScore}/100

The full report includes:
- Core Web Vitals breakdown (LCP, FID, CLS)
- Page load time analysis
- SEO audit with actionable recommendations
- Mobile vs Desktop comparison
- Performance opportunities ranked by impact

View the full report: ${auditUrl}

I'd love to walk you through the findings and discuss how we could improve your site's performance and search rankings. Would you have 15 minutes this week for a quick call?

Best,
${senderName || 'The Uptrade Team'}

---
Uptrade Media | Web Design & Digital Marketing
https://uptrademedia.com
  `.trim()
}

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
    const { contact: senderContact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !senderContact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Not authenticated' })
      }
    }

    // Only admins can send audit emails
    if (senderContact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      }
    }

    const { auditId, contactId, customSubject, customMessage } = JSON.parse(event.body || '{}')

    if (!auditId || !contactId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'auditId and contactId are required' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Get audit details
    const { data: audit, error: auditError } = await supabase
      .from('audits')
      .select('id, target_url, magic_token, status, psi_data')
      .eq('id', auditId)
      .single()

    if (auditError || !audit) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Audit not found' })
      }
    }

    // Get contact details
    const { data: targetContact, error: contactError } = await supabase
      .from('contacts')
      .select('id, email, name')
      .eq('id', contactId)
      .single()

    if (contactError || !targetContact) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Contact not found' })
      }
    }

    // Get sender details for personal from address
    const { data: sender } = await supabase
      .from('contacts')
      .select('id, name, personal_from_email')
      .eq('id', senderContact.id)
      .single()

    // Build audit URL with magic token
    const auditUrl = `${PORTAL_BASE_URL}/audit/${audit.id}?token=${audit.magic_token}`

    // Extract scores from PSI data
    const psiData = audit.psi_data || {}
    const mobileScore = Math.round((psiData.mobileCategories?.performance?.score || 0) * 100)
    const desktopScore = Math.round((psiData.desktopCategories?.performance?.score || 0) * 100)

    // Determine from email
    // Priority: sender's personal_from_email > default portal email
    const defaultFromEmail = process.env.RESEND_FROM_EMAIL || 'portal@send.uptrademedia.com'
    const fromEmail = sender?.personal_from_email || defaultFromEmail
    const fromName = sender?.name || 'Uptrade Media'
    const fromAddress = `${fromName} <${fromEmail}>`

    console.log(`[crm-send-audit] Sending audit ${auditId} to ${targetContact.email} from ${fromAddress}`)

    // Generate email content
    const emailOptions = {
      recipientName: targetContact.name,
      auditUrl,
      websiteUrl: audit.target_url,
      mobileScore,
      desktopScore,
      senderName: sender?.name
    }

    const subject = customSubject || `Your Website Performance Report - ${mobileScore}/100`
    const html = customMessage 
      ? `<div style="font-family: sans-serif; line-height: 1.6;">${customMessage}<br/><br/><a href="${auditUrl}">View Full Report →</a></div>`
      : generateAuditEmailHtml(emailOptions)
    const text = generateAuditEmailText(emailOptions)

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: fromAddress,
      to: targetContact.email,
      subject,
      html,
      text,
      tags: [
        { name: 'type', value: 'audit' },
        { name: 'audit_id', value: auditId },
        { name: 'contact_id', value: contactId }
      ]
    })

    if (emailResponse.error) {
      console.error('[crm-send-audit] Resend error:', emailResponse.error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to send email: ' + emailResponse.error.message })
      }
    }

    console.log(`[crm-send-audit] Email sent, Resend ID: ${emailResponse.data?.id}`)

    // Record in email_tracking table
    const { error: trackingError } = await supabase
      .from('email_tracking')
      .insert({
        contact_id: contactId,
        audit_id: auditId,
        email_type: 'audit',
        subject,
        recipient_email: targetContact.email,
        sender_id: senderContact.id,
        sender_email: fromEmail,
        resend_email_id: emailResponse.data?.id,
        status: 'sent',
        sent_at: new Date().toISOString()
      })

    if (trackingError) {
      console.error('[crm-send-audit] Tracking insert error:', trackingError)
      // Don't fail the request, email was sent successfully
    }

    // Update audit status if it was pending
    if (audit.status === 'completed') {
      // Mark as sent
      await supabase
        .from('audits')
        .update({ 
          sent_at: new Date().toISOString(),
          sent_to: targetContact.email
        })
        .eq('id', auditId)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          emailId: emailResponse.data?.id,
          sentTo: targetContact.email,
          subject,
          auditUrl
        }
      })
    }

  } catch (error) {
    console.error('[crm-send-audit] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
