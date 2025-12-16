// netlify/functions/admin-team-update.js
// Updates a team member's role, status, or integration settings
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { requireAdmin } from './utils/permissions.js'
import { Resend } from 'resend'
import crypto from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'PUT, PATCH, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'PUT' && event.httpMethod !== 'PATCH') {
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
    // Only admins can update team members
    requireAdmin(contact)

    const {
      id,
      name,
      teamRole,
      teamStatus,
      openphoneNumber,
      gmailAddress,
      resendInvite
    } = JSON.parse(event.body || '{}')

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Team member ID is required' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Verify the target is a team member
    const { data: existingMember, error: fetchError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .eq('is_team_member', true)
      .single()

    if (fetchError || !existingMember) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Team member not found' })
      }
    }

    // Prevent demoting the last admin
    if (teamRole && teamRole !== 'admin' && existingMember.team_role === 'admin') {
      const { count: adminCount } = await supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('is_team_member', true)
        .eq('team_role', 'admin')
        .eq('team_status', 'active')

      if (adminCount <= 1) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Cannot demote the last active admin' })
        }
      }
    }

    // Prevent self-deactivation
    if (teamStatus === 'inactive' && existingMember.id === contact.id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Cannot deactivate your own account' })
      }
    }

    // Build update object
    const updates = {}
    if (name !== undefined) updates.name = name
    if (teamRole !== undefined) updates.team_role = teamRole
    if (teamStatus !== undefined) updates.team_status = teamStatus
    if (openphoneNumber !== undefined) updates.openphone_number = openphoneNumber || null
    if (gmailAddress !== undefined) updates.gmail_address = gmailAddress || null

    // Perform update
    const { data: updatedMember, error: updateError } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating team member:', updateError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update team member' })
      }
    }

    // Resend invite if requested
    if (resendInvite && updatedMember.team_status === 'pending') {
      await sendTeamInviteEmail(updatedMember, contact.name)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        teamMember: formatTeamMember(updatedMember),
        message: resendInvite ? 'Team member updated and invite resent' : 'Team member updated'
      })
    }

  } catch (error) {
    console.error('Error in admin-team-update:', error)
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
    createdAt: member.created_at
  }
}

async function sendTeamInviteEmail(member, inviterName) {
  try {
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    
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
      subject: `Reminder: Set up your Uptrade Media account`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02));border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden;">
                  <tr>
                    <td style="padding:32px 40px;border-bottom:1px solid rgba(255,255,255,0.1);">
                      <img src="https://portal.uptrademedia.com/favicon.svg" width="48" height="48" alt="Uptrade Media">
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:40px;">
                      <h1 style="margin:0 0 16px;font-size:28px;font-weight:700;color:#ffffff;">Account Setup Reminder</h1>
                      <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:rgba(255,255,255,0.7);">
                        ${inviterName} is reminding you to set up your Uptrade Media ${roleLabel} account.
                      </p>
                      <a href="${setupUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;border-radius:12px;">
                        Set Up My Account
                      </a>
                      <p style="margin:32px 0 0;font-size:14px;color:rgba(255,255,255,0.5);">
                        This link expires in 7 days.
                      </p>
                    </td>
                  </tr>
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

    console.log(`Team invite reminder sent to ${member.email}`)
  } catch (error) {
    console.error('Error sending team invite reminder:', error)
  }
}
