/**
 * System Emails Test API
 * 
 * Sends a test email to the current user for preview.
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Sample data for test emails
const TEST_DATA = {
  first_name: 'Test',
  last_name: 'User',
  company: 'Acme Corp',
  grade: 'B',
  performance_score: '75',
  seo_score: '82',
  accessibility_score: '91',
  security_score: '68',
  target_url: 'https://example.com',
  invoice_number: 'INV-2024-001',
  amount: '$1,500.00',
  due_date: 'January 15, 2025',
  project_name: 'Website Redesign',
  proposal_title: 'Web Development Proposal',
  magic_link: 'https://portal.uptrademedia.com/auth?token=test123',
  payment_link: 'https://portal.uptrademedia.com/pay/test123',
  view_link: 'https://portal.uptrademedia.com/view/test123',
  project_link: 'https://portal.uptrademedia.com/projects/test123',
  message_preview: 'This is a preview of the message content...',
  sender_name: 'John Smith',
  personalized_message: 'Your website shows strong potential with room for optimization in key areas.'
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    // Verify authentication
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    // Only admins can send test emails
    if (contact.role !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Admin access required' }) }
    }

    const { emailId } = JSON.parse(event.body || '{}')

    if (!emailId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email ID required' }) }
    }

    const supabase = createSupabaseAdmin()
    const orgId = contact.org_id || '00000000-0000-0000-0000-000000000001'

    // Check for custom template
    const { data: customTemplate } = await supabase
      .from('system_email_templates')
      .select('*')
      .eq('org_id', orgId)
      .eq('email_id', emailId)
      .single()

    // Get the default template info from the registry (we'll use a basic one for now)
    const defaultSubjects = {
      'account-setup-invite': 'Set up your Uptrade Media portal account',
      'magic-link-login': 'Your login link for Uptrade Portal',
      'password-reset': 'Reset your Uptrade Portal password',
      'audit-complete': '{{first_name}}, Your Website Audit is Ready - Grade: {{grade}}',
      'invoice-sent': 'Invoice #{{invoice_number}} from Uptrade Media',
      'invoice-reminder': 'Reminder: Invoice #{{invoice_number}} is due',
      'payment-received': 'Payment received - Invoice #{{invoice_number}}',
      'proposal-sent': 'New proposal from Uptrade Media: {{proposal_title}}',
      'proposal-accepted': 'Proposal accepted: {{proposal_title}}',
      'project-created': "Let's get started: {{project_name}}",
      'milestone-complete': 'Milestone complete: {{milestone_name}}',
      'project-complete': '🎉 Project complete: {{project_name}}',
      'new-message': 'New message from {{sender_name}}',
      'file-shared': '{{shared_by}} shared a file with you'
    }

    let subject = customTemplate?.subject || defaultSubjects[emailId] || `Test: ${emailId}`
    let html = customTemplate?.html || generateTestHtml(emailId)

    // Replace variables with test data
    Object.entries(TEST_DATA).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      subject = subject.replace(regex, value)
      html = html.replace(regex, value)
    })

    // Send test email
    const fromEmail = process.env.RESEND_FROM || 'Uptrade Media <noreply@send.uptrademedia.com>'
    
    await resend.emails.send({
      from: fromEmail,
      to: contact.email,
      subject: `[TEST] ${subject}`,
      html: `
        <div style="background-color: #fef3c7; padding: 12px 16px; border-bottom: 2px solid #f59e0b; margin-bottom: 0;">
          <p style="margin: 0; color: #92400e; font-size: 14px; font-family: sans-serif;">
            <strong>⚠️ TEST EMAIL</strong> - This is a preview of the "${emailId}" system email. 
            Variables have been replaced with sample data.
          </p>
        </div>
        ${html}
      `
    })

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: `Test email sent to ${contact.email}`
      })
    }

  } catch (error) {
    console.error('[system-emails-test] Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send test email' })
    }
  }
}

/**
 * Generate a basic test HTML template
 */
function generateTestHtml(emailId) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                
                <tr>
                  <td style="background: linear-gradient(135deg, #54b948 0%, #39bfb0 100%); padding: 30px; text-align: center;">
                    <img src="https://portal.uptrademedia.com/uptrade_media_logo_white.png" alt="Uptrade Media" width="180" height="auto" style="display: block; margin: 0 auto;" />
                  </td>
                </tr>
                
                <tr>
                  <td style="padding: 40px;">
                    <h1 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px;">
                      System Email: ${emailId}
                    </h1>
                    <p style="margin: 0 0 20px 0; color: #666; font-size: 16px; line-height: 1.6;">
                      This is a test template for the <strong>${emailId}</strong> system email. 
                      When you customize this email, your HTML will appear here instead.
                    </p>
                    <p style="margin: 0; color: #666; font-size: 14px;">
                      Available variables: {{first_name}}, {{last_name}}, {{company}}, and more.
                    </p>
                  </td>
                </tr>
                
                <tr>
                  <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e5e5e5;">
                    <p style="margin: 0; color: #999; font-size: 12px;">
                      Uptrade Media • Cincinnati & Northern Kentucky
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}
