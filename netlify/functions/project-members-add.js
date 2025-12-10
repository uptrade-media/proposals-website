import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from './utils/supabase.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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

  try {
    // Verify authentication using Supabase
    const { user, contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Not authenticated' })
      }
    }

    // Only admins can add team members
    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only admins can add team members' })
      }
    }

    // Get project ID from query
    const projectId = event.queryStringParameters?.projectId || event.queryStringParameters?.id
    if (!projectId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Project ID required' })
      }
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}')
    const { memberId, role = 'member' } = body

    if (!memberId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Member ID is required' })
      }
    }

    if (!['lead', 'member', 'viewer'].includes(role)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid role. Must be: lead, member, or viewer' })
      }
    }

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Project not found' })
      }
    }

    // Verify member exists
    const { data: member, error: memberError } = await supabase
      .from('contacts')
      .select('id, name, email, avatar')
      .eq('id', memberId)
      .single()

    if (memberError || !member) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Member not found' })
      }
    }

    // Check if member is already on project
    const { data: existingMembership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('member_id', memberId)
      .single()

    if (existingMembership) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'Member is already on this project' })
      }
    }

    // Add team member
    const { data: created, error: insertError } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        member_id: memberId,
        role
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        member: {
          id: created.id,
          projectId: created.project_id,
          memberId: created.member_id,
          role: created.role,
          joinedAt: created.joined_at,
          member
        }
      })
    }
  } catch (error) {
    console.error('Error adding team member:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to add team member',
        message: error.message
      })
    }
  }
}
