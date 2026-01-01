// netlify/functions/messages-contacts.js
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from './utils/supabase.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'METHOD_NOT_ALLOWED' })
    }
  }

  // Verify authentication using Supabase
  const { user, contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'UNAUTHORIZED' })
    }
  }

  try {
    const userId = contact.id
    const orgId = event.headers['x-organization-id']

    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'INVALID_TOKEN' })
      }
    }

    let contacts = []
    
    // Check if in organization context
    if (orgId) {
      console.log('[messages-contacts] Organization context, org_id:', orgId)
      
      // For organization members, fetch:
      // 1. Uptrade Media team members assigned to their project(s) via project_members
      // 2. Other members of their organization via organization_members
      // 3. Echo (future - when Signal is enabled)
      
      // Get the user's project context (from header or their membership)
      const projectId = event.headers['x-project-id']
      
      // 1. Get Uptrade team members assigned to user's projects
      let uptradeTeamQuery = supabase
        .from('project_members')
        .select(`
          contact:contacts!project_members_contact_id_fkey(id, name, email, company, role, avatar)
        `)
        .eq('role', 'uptrade_assigned')
      
      // If project-specific, filter to that project
      if (projectId) {
        uptradeTeamQuery = uptradeTeamQuery.eq('project_id', projectId)
      } else {
        // Get all projects in this organization
        const { data: orgProjects } = await supabase
          .from('projects')
          .select('id')
          .eq('organization_id', orgId)
        
        if (orgProjects?.length > 0) {
          uptradeTeamQuery = uptradeTeamQuery.in('project_id', orgProjects.map(p => p.id))
        }
      }
      
      const { data: uptradeMembers } = await uptradeTeamQuery
      
      if (uptradeMembers) {
        contacts.push(...uptradeMembers
          .filter(m => m.contact)
          .map(m => ({ ...m.contact, contactType: 'uptrade_team' }))
        )
      }
      
      // 2. Get all organization members (excluding self)
      const { data: orgMembers } = await supabase
        .from('organization_members')
        .select(`
          access_level,
          contact:contacts!organization_members_contact_id_fkey(id, name, email, company, role, avatar)
        `)
        .eq('organization_id', orgId)
        .neq('contact_id', userId)
      
      if (orgMembers) {
        contacts.push(...orgMembers
          .filter(m => m.contact)
          .map(m => ({ 
            ...m.contact, 
            contactType: 'organization',
            accessLevel: m.access_level 
          }))
        )
      }
      
      // 3. Get project-level members for shared projects (if user is project-level)
      const { data: userOrgMembership } = await supabase
        .from('organization_members')
        .select('access_level')
        .eq('organization_id', orgId)
        .eq('contact_id', userId)
        .single()
      
      if (userOrgMembership?.access_level === 'project') {
        // User is project-level, get other members of shared projects
        const { data: userProjects } = await supabase
          .from('project_members')
          .select('project_id')
          .eq('contact_id', userId)
        
        if (userProjects?.length > 0) {
          const { data: sharedProjectMembers } = await supabase
            .from('project_members')
            .select(`
              contact:contacts!project_members_contact_id_fkey(id, name, email, company, role, avatar)
            `)
            .in('project_id', userProjects.map(p => p.project_id))
            .neq('contact_id', userId)
            .neq('role', 'uptrade_assigned') // Already fetched above
          
          if (sharedProjectMembers) {
            contacts.push(...sharedProjectMembers
              .filter(m => m.contact)
              .map(m => ({ ...m.contact, contactType: 'project' }))
            )
          }
        }
      }
      
      // Add Echo contact for this organization
      const { data: echoContact } = await supabase
        .from('contacts')
        .select('id, name, email, company, role, avatar, is_ai, contact_type')
        .eq('org_id', orgId)
        .eq('is_ai', true)
        .eq('contact_type', 'ai')
        .single()
      
      if (echoContact) {
        contacts.push({ 
          ...echoContact, 
          contactType: 'echo',
          status: 'always_available'
        })
      }
      
      // Remove duplicates (keep first occurrence which has correct contactType)
      const uniqueContacts = Array.from(
        new Map(contacts.map(c => [c.id, c])).values()
      )
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ contacts: uniqueContacts })
      }
    }
    
    // Original logic for non-tenant context
    // Connect to database
    const targetRole = contact.role === 'admin' ? 'client' : 'admin'
    
    const { data: fetchedContacts, error: fetchError } = await supabase
      .from('contacts')
      .select('id, name, email, company, role, avatar')
      .eq('role', targetRole)
      .order('name')

    if (fetchError) {
      throw fetchError
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ contacts: fetchedContacts || [] })
    }
  } catch (error) {
    console.error('[messages-contacts] Error:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'INTERNAL_SERVER_ERROR' })
    }
  }
}
