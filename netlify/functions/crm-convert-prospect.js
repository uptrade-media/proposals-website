/**
 * CRM Convert Prospect to User Function
 * 
 * Converts a prospect into a portal user and sends magic link
 * Optionally attaches a proposal
 */

import { createSupabaseAdmin } from './utils/supabase.js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

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
    const supabase = createSupabaseAdmin()
    const body = JSON.parse(event.body || '{}')
    
    const {
      prospectId,
      proposalId,      // Optional: attach a proposal
      sendMagicLink = true,
      customMessage    // Optional custom message in email
    } = body

    if (!prospectId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Prospect ID required' })
      }
    }

    // Get prospect
    const { data: prospect, error: prospectError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', prospectId)
      .single()

    if (prospectError || !prospect) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Prospect not found' })
      }
    }

    if (!prospect.email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Prospect must have an email address to convert' })
      }
    }

    // Check if already a portal user
    if (prospect.auth_user_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Prospect is already a portal user' })
      }
    }

    // Generate magic link token
    const crypto = await import('crypto')
    const magicToken = crypto.randomBytes(32).toString('hex')
    const magicTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Update prospect with magic link token and mark as converting
    const { data: updatedProspect, error: updateError } = await supabase
      .from('contacts')
      .update({
        magic_link_token: magicToken,
        magic_link_expires: magicTokenExpiry.toISOString(),
        pipeline_stage: 'proposal_sent',
        account_setup: 'false',
        updated_at: new Date().toISOString()
      })
      .eq('id', prospectId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // If proposal specified, link it to the prospect
    if (proposalId) {
      await supabase
        .from('proposals')
        .update({ contact_id: prospectId })
        .eq('id', proposalId)
    }

    // Build magic link URL
    const baseUrl = process.env.URL || 'https://portal.uptrademedia.com'
    const magicLink = proposalId
      ? `${baseUrl}/setup?token=${magicToken}&proposal=${proposalId}`
      : `${baseUrl}/setup?token=${magicToken}`

    // Send magic link email
    if (sendMagicLink) {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
            .content { background: #f9fafb; border-radius: 12px; padding: 30px; margin-bottom: 30px; }
            .button { display: inline-block; background: #2563eb; color: white !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .button:hover { background: #1d4ed8; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; }
            .message { background: white; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Uptrade Media</div>
            </div>
            <div class="content">
              <h2>Welcome to Your Client Portal</h2>
              <p>Hi ${prospect.name || 'there'},</p>
              
              ${customMessage ? `<div class="message">${customMessage}</div>` : ''}
              
              <p>We've set up a personalized client portal for you where you can:</p>
              <ul>
                <li>View and accept proposals</li>
                <li>Track project progress</li>
                <li>Access files and documents</li>
                <li>Message our team directly</li>
              </ul>
              
              ${proposalId ? '<p><strong>You have a proposal waiting for your review!</strong></p>' : ''}
              
              <p style="text-align: center;">
                <a href="${magicLink}" class="button">Access Your Portal</a>
              </p>
              
              <p style="font-size: 14px; color: #6b7280;">
                This link expires in 7 days. If you didn't expect this email, you can safely ignore it.
              </p>
            </div>
            <div class="footer">
              <p>Uptrade Media • Digital Marketing Excellence</p>
              <p>Questions? Reply to this email or call us anytime.</p>
            </div>
          </div>
        </body>
        </html>
      `

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'portal@send.uptrademedia.com',
        to: prospect.email,
        subject: proposalId 
          ? 'Your Proposal is Ready - Uptrade Media' 
          : 'Welcome to Your Client Portal - Uptrade Media',
        html: emailHtml
      })
    }

    // Log activity
    await supabase.from('activity_log').insert({
      contact_id: prospectId,
      activity_type: 'converted_to_user',
      description: `Prospect converted to user. ${proposalId ? 'Proposal attached.' : ''} Magic link sent.`
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        prospect: updatedProspect,
        magicLinkSent: sendMagicLink,
        proposalAttached: !!proposalId
      })
    }

  } catch (error) {
    console.error('CRM convert prospect error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    }
  }
}
