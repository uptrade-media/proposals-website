// netlify/functions/admin-team-create.js
// Creates a new team member and sends invite email
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { requireAdmin } from './utils/permissions.js'
import { Resend } from 'resend'
import crypto from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)

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

  const { contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  try {
    // Only admins can create team members
    requireAdmin(contact)

    const { 
      email, 
      name, 
      teamRole = 'sales_rep',
      openphoneNumber,
      gmailAddress 
    } = JSON.parse(event.body || '{}')

    // Validate required fields
    if (!email || !name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email and name are required' })
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

    // Validate team role
    const validRoles = ['admin', 'manager', 'sales_rep']
    if (!validRoles.includes(teamRole)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid team role' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Check if email already exists
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id, email, is_team_member')
      .eq('email', email.toLowerCase())
      .single()

    if (existingContact) {
      if (existingContact.is_team_member) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ error: 'This email is already a team member' })
        }
      }
      
      // Upgrade existing contact to team member
      const { data: upgraded, error: upgradeError } = await supabase
        .from('contacts')
        .update({
          is_team_member: true,
          team_role: teamRole,
          team_status: 'pending',
          openphone_number: openphoneNumber || null,
          gmail_address: gmailAddress || null,
          name: name, // Update name if provided
          account_setup: 'false'
        })
        .eq('id', existingContact.id)
        .select()
        .single()

      if (upgradeError) {
        console.error('Error upgrading contact:', upgradeError)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to upgrade contact to team member' })
        }
      }

      // Send invite email
      await sendTeamInviteEmail(upgraded, contact.name)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          teamMember: formatTeamMember(upgraded),
          message: 'Existing contact upgraded to team member',
          upgraded: true
        })
      }
    }

    // Create new team member
    const { data: newMember, error: createError } = await supabase
      .from('contacts')
      .insert({
        email: email.toLowerCase(),
        name,
        role: 'admin', // Team members get admin role for portal access
        is_team_member: true,
        team_role: teamRole,
        team_status: 'pending',
        openphone_number: openphoneNumber || null,
        gmail_address: gmailAddress || null,
        account_setup: 'false',
        pipeline_stage: 'lead' // Default stage
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating team member:', createError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create team member' })
      }
    }

    // Send invite email
    await sendTeamInviteEmail(newMember, contact.name)

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        teamMember: formatTeamMember(newMember),
        message: 'Team member created and invite sent'
      })
    }

  } catch (error) {
    console.error('Error in admin-team-create:', error)
    return {
      statusCode: error.message?.includes('required') ? 403 : 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    }
  }
}

function formatTeamMember(member) {
  return {
    id: member.id,
    email: member.email,
    name: member.name,
    avatar: member.avatar,
    hasGoogleAuth: !!member.google_id,
    teamRole: member.team_role,
    teamStatus: member.team_status,
    openphoneNumber: member.openphone_number,
    gmailAddress: member.gmail_address,
    createdAt: member.created_at,
    metrics: {
      auditsCreated: 0,
      proposalsCreated: 0,
      proposalsAccepted: 0,
      clientsAssigned: 0,
      conversionRate: 0
    }
  }
}

async function sendTeamInviteEmail(member, inviterName) {
  try {
    // Generate magic link token for easy setup
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    
    // Store the setup token (reuse account setup flow)
    const supabase = createSupabaseAdmin()
    await supabase
      .from('contacts')
      .update({ 
        setup_token: token,
        setup_token_expires: expiresAt.toISOString()
      })
      .eq('id', member.id)

    const setupUrl = `${process.env.SITE_URL || 'https://portal.uptrademedia.com'}/auth/magic?token=${token}&setup=team`
    const roleLabel = {
      admin: 'Administrator',
      manager: 'Team Manager',
      sales_rep: 'Sales Representative'
    }[member.team_role] || 'Team Member'

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'portal@uptrademedia.com',
      to: member.email,
      subject: `You've been invited to join Uptrade Media`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Team Invitation</title>
        </head>
        <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02));border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden;">
                  
                  <!-- Header -->
                  <tr>
                    <td style="padding:32px 40px;border-bottom:1px solid rgba(255,255,255,0.1);">
                      <img src="https://portal.uptrademedia.com/favicon.svg" width="48" height="48" alt="Uptrade Media" style="display:block;">
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding:40px;">
                      <h1 style="margin:0 0 16px;font-size:28px;font-weight:700;color:#ffffff;">Welcome to the Team!</h1>
                      <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:rgba(255,255,255,0.7);">
                        ${inviterName} has invited you to join Uptrade Media as a <strong style="color:#ffffff;">${roleLabel}</strong>.
                      </p>
                      
                      <p style="margin:0 0 32px;font-size:16px;line-height:1.6;color:rgba(255,255,255,0.7);">
                        Click the button below to set up your account and get started. You can sign in with Google or create a password.
                      </p>
                      
                      <!-- CTA Button -->
                      <a href="${setupUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;border-radius:12px;">
                        Set Up My Account
                      </a>
                      
                      <p style="margin:32px 0 0;font-size:14px;color:rgba(255,255,255,0.5);">
                        This link expires in 7 days.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding:24px 40px;border-top:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.2);">
                      <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.4);">
                        Uptrade Media • Houston, TX
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
    })

    console.log(`Team invite email sent to ${member.email}`)
  } catch (error) {
    console.error('Error sending team invite email:', error)
    // Don't fail the whole operation if email fails
  }
}
