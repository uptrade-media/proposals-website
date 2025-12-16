// netlify/functions/admin-contacts-assign.js
// Assigns contacts to team members (single or bulk)
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { requireAdmin } from './utils/permissions.js'
import { Resend } from 'resend'

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
    // Only admins and managers can assign contacts
    requireAdmin(contact)

    const { 
      contactIds,  // Array of contact IDs or single ID
      assignedTo,  // Team member ID to assign to (null to unassign)
      notify = true // Send notification to assignee
    } = JSON.parse(event.body || '{}')

    if (!contactIds || (Array.isArray(contactIds) && contactIds.length === 0)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Contact IDs required' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Normalize to array
    const ids = Array.isArray(contactIds) ? contactIds : [contactIds]

    // If assigning to someone, verify they're a team member
    let assignee = null
    if (assignedTo) {
      const { data: teamMember, error: teamError } = await supabase
        .from('contacts')
        .select('id, email, name, is_team_member, team_role, team_status')
        .eq('id', assignedTo)
        .single()

      if (teamError || !teamMember) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Team member not found' })
        }
      }

      if (!teamMember.is_team_member || teamMember.team_status !== 'active') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Can only assign to active team members' })
        }
      }

      assignee = teamMember
    }

    // Get contact details before assignment
    const { data: contactsToAssign, error: fetchError } = await supabase
      .from('contacts')
      .select('id, email, name, company, assigned_to')
      .in('id', ids)
      .eq('is_team_member', false) // Only assign actual clients

    if (fetchError || !contactsToAssign || contactsToAssign.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'No valid contacts found' })
      }
    }

    // Perform assignment
    const { data: updatedContacts, error: updateError } = await supabase
      .from('contacts')
      .update({ 
        assigned_to: assignedTo || null,
        updated_at: new Date().toISOString()
      })
      .in('id', ids)
      .select()

    if (updateError) {
      console.error('Error assigning contacts:', updateError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to assign contacts' })
      }
    }

    // Log assignment history
    const assignmentLogs = contactsToAssign.map(c => ({
      contact_id: c.id,
      assigned_by: contact.id,
      assigned_to: assignedTo || null,
      previous_assignee: c.assigned_to,
      assigned_at: new Date().toISOString()
    }))

    await supabase
      .from('lead_assignments')
      .insert(assignmentLogs)

    // Send notification to assignee if requested
    if (notify && assignee && assignee.email) {
      await sendAssignmentNotification(assignee, contactsToAssign, contact.name)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        contacts: updatedContacts,
        message: assignedTo 
          ? `${updatedContacts.length} contact(s) assigned to ${assignee?.name || 'team member'}`
          : `${updatedContacts.length} contact(s) unassigned`,
        assignedCount: updatedContacts.length
      })
    }

  } catch (error) {
    console.error('Error in admin-contacts-assign:', error)
    return {
      statusCode: error.message?.includes('required') ? 403 : 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    }
  }
}

async function sendAssignmentNotification(assignee, contacts, assignerName) {
  try {
    const contactList = contacts.map(c => `• ${c.name || c.email} ${c.company ? `(${c.company})` : ''}`).join('\n')
    const count = contacts.length
    const plural = count > 1 ? 's' : ''

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'portal@uptrademedia.com',
      to: assignee.email,
      subject: `${count} New Lead${plural} Assigned to You`,
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
                      <h1 style="margin:0 0 16px;font-size:28px;font-weight:700;color:#ffffff;">New Lead${plural} Assigned</h1>
                      <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:rgba(255,255,255,0.7);">
                        ${assignerName} has assigned <strong style="color:#ffffff;">${count} new lead${plural}</strong> to you.
                      </p>
                      
                      <div style="background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:20px;margin-bottom:24px;">
                        <pre style="margin:0;font-size:14px;line-height:1.8;color:rgba(255,255,255,0.9);white-space:pre-wrap;">${contactList}</pre>
                      </div>
                      
                      <p style="margin:0 0 32px;font-size:16px;line-height:1.6;color:rgba(255,255,255,0.7);">
                        Log in to the portal to start engaging with ${count > 1 ? 'these leads' : 'this lead'}.
                      </p>
                      
                      <a href="${process.env.SITE_URL || 'https://portal.uptrademedia.com'}/dashboard" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;border-radius:12px;">
                        View My Leads
                      </a>
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

    console.log(`Assignment notification sent to ${assignee.email}`)
  } catch (error) {
    console.error('Error sending assignment notification:', error)
    // Don't fail the whole operation if email fails
  }
}
