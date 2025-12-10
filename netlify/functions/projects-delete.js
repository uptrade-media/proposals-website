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
    // Verify authentication via Supabase
    const { user, contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: authError || 'Not authenticated' })
      }
    }

    // Only admins can delete projects
    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only admins can delete projects' })
      }
    }

    // Get project ID from query
    const projectId = event.queryStringParameters?.id || event.queryStringParameters?.projectId
    if (!projectId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Project ID required' })
      }
    }

    // Verify project exists
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single()

    if (fetchError || !project) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Project not found' })
      }
    }

    // Delete project (cascade will handle milestones, members, etc)
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (deleteError) {
      throw deleteError
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Project deleted successfully'
      })
    }
  } catch (error) {
    console.error('Error deleting project:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to delete project',
        message: error.message
      })
    }
  }
}
