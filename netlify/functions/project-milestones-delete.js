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

    // Only admins can delete milestones
    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only admins can delete milestones' })
      }
    }

    // Get IDs from query
    const projectId = event.queryStringParameters?.projectId
    const milestoneId = event.queryStringParameters?.milestoneId

    if (!projectId || !milestoneId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Project ID and Milestone ID required' })
      }
    }

    // Verify milestone exists and belongs to project
    const { data: milestone, error: fetchError } = await supabase
      .from('project_milestones')
      .select('id, project_id')
      .eq('id', milestoneId)
      .single()

    if (fetchError || !milestone || milestone.project_id !== projectId) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Milestone not found' })
      }
    }

    // Delete the milestone
    const { error: deleteError } = await supabase
      .from('project_milestones')
      .delete()
      .eq('id', milestoneId)

    if (deleteError) {
      throw deleteError
    }

    // Reorder remaining milestones
    const { data: remainingMilestones } = await supabase
      .from('project_milestones')
      .select('id')
      .eq('project_id', projectId)
      .order('order')

    // Update orders for remaining milestones
    for (let i = 0; i < (remainingMilestones?.length || 0); i++) {
      await supabase
        .from('project_milestones')
        .update({ order: i })
        .eq('id', remainingMilestones[i].id)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Milestone deleted successfully'
      })
    }
  } catch (error) {
    console.error('Error deleting milestone:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to delete milestone',
        message: error.message
      })
    }
  }
}
