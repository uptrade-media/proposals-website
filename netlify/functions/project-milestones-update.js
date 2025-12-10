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
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'PUT') {
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

    // Only admins can update milestones
    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only admins can update milestones' })
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

    // Parse request body
    const body = JSON.parse(event.body || '{}')
    const { title, description, status, dueDate, completedAt, order } = body

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

    // Build update object
    const updateData = {
      updated_at: new Date().toISOString()
    }

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (status !== undefined) updateData.status = status
    if (dueDate !== undefined) updateData.due_date = dueDate ? new Date(dueDate).toISOString() : null
    if (completedAt !== undefined) updateData.completed_at = completedAt ? new Date(completedAt).toISOString() : null
    if (order !== undefined) updateData.order = order

    // Update milestone
    const { data: updatedMilestone, error: updateError } = await supabase
      .from('project_milestones')
      .update(updateData)
      .eq('id', milestoneId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        milestone: {
          id: updatedMilestone.id,
          projectId: updatedMilestone.project_id,
          title: updatedMilestone.title,
          description: updatedMilestone.description,
          status: updatedMilestone.status,
          dueDate: updatedMilestone.due_date,
          completedAt: updatedMilestone.completed_at,
          order: updatedMilestone.order,
          createdAt: updatedMilestone.created_at,
          updatedAt: updatedMilestone.updated_at
        }
      })
    }
  } catch (error) {
    console.error('Error updating milestone:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to update milestone',
        message: error.message
      })
    }
  }
}
