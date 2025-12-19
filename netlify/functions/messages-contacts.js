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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id',
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
    
    // Check if in project tenant context
    if (orgId) {
      console.log('[messages-contacts] Project tenant context, org_id:', orgId)
      
      // For project tenants, fetch:
      // 1. Uptrade Media team members assigned to their project
      // 2. Other members of their own organization
      // 3. Echo (future - when Signal is enabled)
      
      // Get the project to find assigned team members
      const { data: project } = await supabase
        .from('projects')
        .select('id, contact_id, assigned_to')
        .eq('id', orgId)
        .single()
      
      // Build list of team members to show
      const teamMemberIds = []
      
      if (project?.assigned_to) {
        // assigned_to is the Uptrade team member assigned to this project
        teamMemberIds.push(project.assigned_to)
      }
      
      // Also get Uptrade admin contacts who have messaged this project's contacts
      const { data: existingConversations } = await supabase
        .from('messages')
        .select('sender_id, recipient_id')
        .eq('project_id', orgId)
      
      // Extract unique Uptrade team member IDs from conversations
      const conversationParticipants = new Set()
      existingConversations?.forEach(msg => {
        conversationParticipants.add(msg.sender_id)
        conversationParticipants.add(msg.recipient_id)
      })
      
      // Fetch Uptrade team members (admins) who are assigned or have conversed
      const allTeamIds = [...new Set([...teamMemberIds, ...conversationParticipants])]
      
      if (allTeamIds.length > 0) {
        const { data: teamContacts } = await supabase
          .from('contacts')
          .select('id, name, email, company, role, avatar')
          .in('id', allTeamIds)
          .eq('role', 'admin')
          .order('name')
        
        if (teamContacts) {
          contacts.push(...teamContacts.map(c => ({ ...c, contactType: 'uptrade_team' })))
        }
      }
      
      // Also fetch contacts in the same organization (org_id matches the project)
      const { data: orgContacts } = await supabase
        .from('contacts')
        .select('id, name, email, company, role, avatar')
        .eq('org_id', orgId)
        .neq('id', userId) // Exclude self
        .order('name')
      
      if (orgContacts) {
        contacts.push(...orgContacts.map(c => ({ ...c, contactType: 'organization' })))
      }
      
      // TODO: Add Echo contact when Signal is enabled for this tenant
      // const tenantFeatures = project?.tenant_features || []
      // if (tenantFeatures.includes('signal')) {
      //   contacts.push({ id: 'echo', name: 'Echo (AI Assistant)', contactType: 'ai' })
      // }
      
      // Remove duplicates
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
