// netlify/functions/admin-org-members.js
// Manage organization members - add/update/remove users with org or project level access
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
            role
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
            .select('id')
            .single()

          if (createError) throw createError
          targetContactId = newContact.id

          // TODO: Send account setup email
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
