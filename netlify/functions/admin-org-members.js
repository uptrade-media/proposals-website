// netlify/functions/admin-org-members.js
// Manage organization members - add/update/remove users with org or project level access
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { Resend } from 'resend'
import { randomBytes } from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  try {
    // Verify authentication
    const { contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }

    const supabase = createSupabaseAdmin()
    const orgId = event.queryStringParameters?.organizationId || event.headers['x-organization-id']
    
    // Check authorization: Must be Uptrade admin OR organization admin with org-level access
    const isUptradeAdmin = contact.role === 'admin'
    let isOrgAdmin = false
    
    if (orgId && !isUptradeAdmin) {
      // Check if user is an admin/owner of this organization with org-level access
      const { data: membership } = await supabase
        .from('organization_members')
        .select('role, access_level')
        .eq('organization_id', orgId)
        .eq('contact_id', contact.id)
        .single()
      
      isOrgAdmin = membership && 
        ['owner', 'admin'].includes(membership.role) && 
        membership.access_level === 'organization'
    }
    
    if (!isUptradeAdmin && !isOrgAdmin) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required to manage organization members' })
      }
    }

    // GET - List organization members
    if (event.httpMethod === 'GET') {
      if (!orgId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'organizationId required' })
        }
      }

      // Get all organization members with their project assignments
      const { data: members, error } = await supabase
        .from('organization_members')
        .select(`
          id,
          role,
          access_level,
          created_at,
          contact:contacts!organization_members_contact_id_fkey (
            id,
            name,
            email,
            company,
            avatar,
            role,
            account_setup
          )
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // For each member, get their project assignments if they're project-level
      const membersWithProjects = await Promise.all(
        members.map(async (member) => {
          if (member.access_level === 'project') {
            const { data: projectMemberships } = await supabase
              .from('project_members')
              .select(`
                id,
                role,
                project:projects!project_members_project_id_fkey (
                  id,
                  title
                )
              `)
              .eq('contact_id', member.contact?.id)

            return { ...member, projectMemberships }
          }
          return { ...member, projectMemberships: [] }
        })
      )

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ members: membersWithProjects })
      }
    }

    // POST - Add user to organization
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const { 
        contactId,
        email,          // Can create new contact by email
        name,           // Optional name for new contact
        role = 'member',
        accessLevel = 'organization',
        projectIds = [] // If accessLevel is 'project', assign to these projects
      } = body

      if (!orgId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'organizationId required' })
        }
      }

      let targetContactId = contactId

      // If no contactId, try to find or create by email
      if (!targetContactId && email) {
        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('email', email.toLowerCase())
          .single()

        if (existingContact) {
          targetContactId = existingContact.id
        } else {
          // Create new contact
          const { data: newContact, error: createError } = await supabase
            .from('contacts')
            .insert({
              email: email.toLowerCase(),
              name: name || email.split('@')[0],
              role: 'client',
              org_id: orgId,
              account_setup: 'false'
            })
            .select('id, email, name')
            .single()

          if (createError) throw createError
          targetContactId = newContact.id

          // Get organization name for the email
          const { data: org } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', orgId)
            .single()

          // Send account setup email - fail if email fails
          try {
            await sendOrgMemberInviteEmail(supabase, newContact, org?.name || 'your organization', contact.name)
          } catch (emailError) {
            console.error('[admin-org-members] Email failed for new member, rolling back:', emailError)
            // Delete the contact we just created since email failed
            await supabase.from('contacts').delete().eq('id', newContact.id)
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ 
                error: 'Failed to send invite email',
                details: emailError.message
              })
            }
          }
        }
      }

      if (!targetContactId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'contactId or email required' })
        }
      }

      // Add to organization_members
      const { data: membership, error: memberError } = await supabase
        .from('organization_members')
        .upsert({
          organization_id: orgId,
          contact_id: targetContactId,
          role,
          access_level: accessLevel
        }, {
          onConflict: 'organization_id,contact_id'
        })
        .select()
        .single()

      if (memberError) throw memberError

      // If project-level access, add to specified projects
      if (accessLevel === 'project' && projectIds.length > 0) {
        const projectMemberships = projectIds.map(projectId => ({
          project_id: projectId,
          contact_id: targetContactId,
          role: 'member'
        }))

        const { error: projectError } = await supabase
          .from('project_members')
          .upsert(projectMemberships, {
            onConflict: 'project_id,contact_id'
          })

        if (projectError) throw projectError
      }

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ 
          success: true,
          membership,
          message: `User added to organization with ${accessLevel} access`
        })
      }
    }

    // PUT - Update member access
    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}')
      const { 
        contactId,
        role,
        accessLevel,
        projectIds // New project assignments (replaces existing)
      } = body

      if (!orgId || !contactId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'organizationId and contactId required' })
        }
      }

      // Update organization_members
      const updates = {}
      if (role) updates.role = role
      if (accessLevel) updates.access_level = accessLevel

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('organization_members')
          .update(updates)
          .eq('organization_id', orgId)
          .eq('contact_id', contactId)

        if (updateError) throw updateError
      }

      // Update project assignments if provided
      if (projectIds !== undefined) {
        // Get projects in this org
        const { data: orgProjects } = await supabase
          .from('projects')
          .select('id')
          .eq('organization_id', orgId)

        const orgProjectIds = orgProjects?.map(p => p.id) || []

        // Remove existing project memberships for this org's projects
        if (orgProjectIds.length > 0) {
          await supabase
            .from('project_members')
            .delete()
            .eq('contact_id', contactId)
            .in('project_id', orgProjectIds)
            .neq('role', 'uptrade_assigned') // Don't remove Uptrade assignments
        }

        // Add new project memberships
        if (projectIds.length > 0) {
          const projectMemberships = projectIds.map(projectId => ({
            project_id: projectId,
            contact_id: contactId,
            role: 'member'
          }))

          await supabase
            .from('project_members')
            .upsert(projectMemberships, {
              onConflict: 'project_id,contact_id'
            })
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Member updated' })
      }
    }

    // PATCH - Resend invite to pending user
    if (event.httpMethod === 'PATCH') {
      const body = JSON.parse(event.body || '{}')
      const { contactId, action } = body

      if (!orgId || !contactId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'organizationId and contactId required' })
        }
      }

      if (action !== 'resend-invite') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action. Use "resend-invite"' })
        }
      }

      // Get contact and organization info
      const { data: memberContact, error: contactError } = await supabase
        .from('contacts')
        .select('id, email, name, account_setup')
        .eq('id', contactId)
        .single()

      if (contactError || !memberContact) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Contact not found' })
        }
      }

      // Only resend if account is not set up
      if (memberContact.account_setup !== 'false') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'User has already set up their account' })
        }
      }

      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .single()

      // Resend invite email
      try {
        await sendOrgMemberInviteEmail(supabase, memberContact, org?.name || 'your organization', contact.name)
        console.log(`[admin-org-members] Resent invite to ${memberContact.email}`)
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: `Invite resent to ${memberContact.email}` 
          })
        }
      } catch (emailError) {
        console.error('[admin-org-members] Failed to resend invite:', emailError)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Failed to resend invite email',
            details: emailError.message
          })
        }
      }
    }

    // DELETE - Remove user from organization
    if (event.httpMethod === 'DELETE') {
      const { contactId } = event.queryStringParameters || {}

      if (!orgId || !contactId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'organizationId and contactId required' })
        }
      }

      // Remove from organization_members (cascades to project_members via FK)
      const { error: deleteError } = await supabase
        .from('organization_members')
        .delete()
        .eq('organization_id', orgId)
        .eq('contact_id', contactId)

      if (deleteError) throw deleteError

      // Also remove from project_members for this org's projects
      const { data: orgProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('organization_id', orgId)

      if (orgProjects?.length > 0) {
        await supabase
          .from('project_members')
          .delete()
          .eq('contact_id', contactId)
          .in('project_id', orgProjects.map(p => p.id))
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Member removed from organization' })
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('[admin-org-members] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    }
  }
}

/**
 * Send invite email to new organization member with magic link for account setup
 */
async function sendOrgMemberInviteEmail(supabase, member, orgName, inviterName) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('[admin-org-members] RESEND_API_KEY not configured, cannot send invite email')
      throw new Error('Email service not configured')
    }

    // Generate 7-day magic link token and store in database
    const magicToken = randomBytes(32).toString('hex')
    const magicTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    
    const { error: tokenError } = await supabase
      .from('contacts')
      .update({
        magic_link_token: magicToken,
        magic_link_expires: magicTokenExpiry.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', member.id)

    if (tokenError) {
      console.error('[admin-org-members] Error storing magic link token:', tokenError)
      throw new Error('Failed to generate setup link')
    }

    const setupUrl = `${process.env.SITE_URL || 'https://portal.uptrademedia.com'}/auth/magic?token=${magicToken}&redirect=${encodeURIComponent('/account-setup?org=' + orgName)}`

    console.log(`[admin-org-members] Generated 7-day magic link for ${member.email}`)

    // Ensure from address has proper format with display name
    let fromEmail = process.env.RESEND_FROM || 'Uptrade Media <portal@send.uptrademedia.com>'
    // If env var is just an email address, wrap it with display name
    if (fromEmail && !fromEmail.includes('<')) {
      fromEmail = `Uptrade Media <${fromEmail}>`
    }
    
    console.log(`[admin-org-members] Sending org invite email to ${member.email} for ${orgName}`)
    console.log(`[admin-org-members] From: ${fromEmail}`)
    console.log(`[admin-org-members] To: ${member.email}`)
    console.log(`[admin-org-members] RESEND_API_KEY configured: ${!!process.env.RESEND_API_KEY}`)

    const { data: result, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: member.email,
      subject: `You've been invited to ${orgName} on Uptrade Media`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Organization Invitation</title>
        </head>
        <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg, #54b948 0%, #39bfb0 100%);padding:32px 40px;text-align:center;">
                      <img src="https://portal.uptrademedia.com/uptrade_media_logo_white.png" alt="Uptrade Media" width="180" height="auto" style="display:block;margin:0 auto;">
                      <h1 style="margin:16px 0 0;font-size:24px;font-weight:700;color:#ffffff;">Welcome to ${orgName}</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding:40px;">
                      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#333333;">
                        Hi${member.name ? ` ${member.name}` : ''},
                      </p>
                      <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#333333;">
                        ${inviterName} has invited you to join <strong>${orgName}</strong> on the Uptrade Media client portal.
                      </p>
                      
                      <p style="margin:0 0 32px;font-size:16px;line-height:1.6;color:#333333;">
                        Click the button below to set up your account. You can sign in with Google or create a password.
                      </p>
                      
                      <!-- CTA Button -->
                      <div style="text-align:center;">
                        <a href="${setupUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#54b948,#39bfb0);color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;border-radius:8px;">
                          Set Up My Account
                        </a>
                      </div>
                      
                      <p style="margin:32px 0 0;font-size:14px;color:#666666;text-align:center;">
                        This link expires in 7 days.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding:24px 40px;border-top:1px solid #eeeeee;background:#fafafa;">
                      <p style="margin:0;font-size:13px;color:#888888;text-align:center;">
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

    if (emailError) {
      console.error(`[admin-org-members] Resend error:`, emailError)
      throw new Error(`Failed to send email: ${emailError.message || JSON.stringify(emailError)}`)
    }

    if (result?.id) {
      console.log(`[admin-org-members] Invite email sent successfully to ${member.email}, email ID: ${result.id}`)
    } else {
      console.log(`[admin-org-members] Invite email sent to ${member.email} (no ID returned)`)
      throw new Error('Email sent but no ID returned from Resend')
    }
  } catch (error) {
    console.error(`[admin-org-members] Error sending invite email to ${member.email}:`, error)
    console.error('[admin-org-members] Error details:', {
      message: error.message,
      stack: error.stack,
      resendApiKeyConfigured: !!process.env.RESEND_API_KEY
    })
    // Re-throw so caller knows email failed
    throw error
  }
}