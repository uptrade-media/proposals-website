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
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'DELETE') {
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

    // Only admins can remove team members
    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only admins can remove team members' })
      }
    }

    // Get IDs from query
    const projectId = event.queryStringParameters?.projectId
    const memberId = event.queryStringParameters?.memberId

    if (!projectId || !memberId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Project ID and Member ID required' })
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

    // Verify membership exists
    const { data: membership, error: membershipError } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('member_id', memberId)
      .single()

    if (membershipError || !membership) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Member not found on this project' })
      }
    }

    // Remove team member
    const { error: deleteError } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('member_id', memberId)

    if (deleteError) {
      throw deleteError
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Team member removed successfully'
      })
    }
  } catch (error) {
    console.error('Error removing team member:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to remove team member',
        message: error.message
      })
    }
  }
}
