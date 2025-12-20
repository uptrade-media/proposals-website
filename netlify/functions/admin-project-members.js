// netlify/functions/admin-project-members.js
// Manage project members - assign Uptrade employees and manage project-level access
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
    const projectId = event.queryStringParameters?.projectId || event.headers['x-project-id']
    
    // Check authorization: Must be Uptrade admin OR organization admin with org-level access
    const isUptradeAdmin = contact.role === 'admin'
    let isOrgAdmin = false
    
    if (projectId && !isUptradeAdmin) {
      // Get the project's organization
      const { data: project } = await supabase
        .from('projects')
        .select('organization_id')
        .eq('id', projectId)
        .single()
      
      if (project?.organization_id) {
        // Check if user is an admin/owner of this organization with org-level access
        const { data: membership } = await supabase
          .from('organization_members')
          .select('role, access_level')
          .eq('organization_id', project.organization_id)
          .eq('contact_id', contact.id)
          .single()
        
        isOrgAdmin = membership && 
          ['owner', 'admin'].includes(membership.role) && 
          membership.access_level === 'organization'
      }
    }
    
    if (!isUptradeAdmin && !isOrgAdmin) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required to manage project members' })
      }
    }

    // GET - List project members
    if (event.httpMethod === 'GET') {
      if (!projectId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'projectId required' })
        }
      }

      const { data: members, error } = await supabase
        .from('project_members')
        .select(`
          id,
          role,
          created_at,
          contact:contacts!project_members_contact_id_fkey (
            id,
            name,
            email,
            company,
            avatar,
            role
          )
        `)
        .eq('project_id', projectId)
        .order('role', { ascending: true }) // uptrade_assigned first

      if (error) throw error

      // Group by role for easier UI consumption
      const grouped = {
        uptradeTeam: members.filter(m => m.role === 'uptrade_assigned'),
        owners: members.filter(m => m.role === 'owner'),
        admins: members.filter(m => m.role === 'admin'),
        members: members.filter(m => m.role === 'member'),
        viewers: members.filter(m => m.role === 'viewer')
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ members, grouped })
      }
    }

    // POST - Add member to project
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const { 
        contactId,
        role = 'member' // owner, admin, member, viewer, uptrade_assigned
      } = body

      if (!projectId || !contactId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'projectId and contactId required' })
        }
      }

      // Validate role
      const validRoles = ['owner', 'admin', 'member', 'viewer', 'uptrade_assigned']
      if (!validRoles.includes(role)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` })
        }
      }

      // If assigning uptrade_assigned, verify the contact is an admin
      if (role === 'uptrade_assigned') {
        const { data: targetContact } = await supabase
          .from('contacts')
          .select('role')
          .eq('id', contactId)
          .single()

        if (targetContact?.role !== 'admin') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Only Uptrade admins can be assigned as uptrade_assigned' })
          }
        }
      }

      // Add to project_members
      const { data: membership, error } = await supabase
        .from('project_members')
        .upsert({
          project_id: projectId,
          contact_id: contactId,
          role
        }, {
          onConflict: 'project_id,contact_id'
        })
        .select(`
          id,
          role,
          contact:contacts!project_members_contact_id_fkey (
            id,
            name,
            email
          )
        `)
        .single()

      if (error) throw error

      // If non-uptrade role, ensure user has org membership with project access
      if (role !== 'uptrade_assigned') {
        const { data: project } = await supabase
          .from('projects')
          .select('organization_id')
          .eq('id', projectId)
          .single()

        if (project?.organization_id) {
          // Ensure they have organization_members entry with project access_level
          await supabase
            .from('organization_members')
            .upsert({
              organization_id: project.organization_id,
              contact_id: contactId,
              role: role === 'owner' ? 'owner' : 'member',
              access_level: 'project'
            }, {
              onConflict: 'organization_id,contact_id',
              ignoreDuplicates: true // Don't downgrade existing org-level access
            })
        }
      }

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ 
          success: true,
          membership,
          message: `User assigned to project as ${role}`
        })
      }
    }

    // PUT - Update member role
    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}')
      const { contactId, role } = body

      if (!projectId || !contactId || !role) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'projectId, contactId, and role required' })
        }
      }

      const { error } = await supabase
        .from('project_members')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('project_id', projectId)
        .eq('contact_id', contactId)

      if (error) throw error

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Member role updated' })
      }
    }

    // DELETE - Remove member from project
    if (event.httpMethod === 'DELETE') {
      const { contactId } = event.queryStringParameters || {}

      if (!projectId || !contactId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'projectId and contactId required' })
        }
      }

      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .eq('contact_id', contactId)

      if (error) throw error

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Member removed from project' })
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('[admin-project-members] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    }
  }
}
