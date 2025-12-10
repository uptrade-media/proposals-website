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
    // Verify authentication via Supabase
    const { user, contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: authError || 'Not authenticated' })
      }
    }

    // Only admins can create milestones
    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only admins can create milestones' })
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
    const { title, description, dueDate, status = 'pending' } = body

    if (!title) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Title is required' })
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

    // Get next order number
    const { data: existingMilestones } = await supabase
      .from('project_milestones')
      .select('id')
      .eq('project_id', projectId)

    const nextOrder = existingMilestones?.length || 0

    // Create milestone
    const { data: createdMilestone, error: insertError } = await supabase
      .from('project_milestones')
      .insert({
        project_id: projectId,
        title,
        description: description || null,
        status,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        order: nextOrder
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
        milestone: {
          id: createdMilestone.id,
          projectId: createdMilestone.project_id,
          title: createdMilestone.title,
          description: createdMilestone.description,
          status: createdMilestone.status,
          dueDate: createdMilestone.due_date,
          completedAt: createdMilestone.completed_at,
          order: createdMilestone.order,
          createdAt: createdMilestone.created_at,
          updatedAt: createdMilestone.updated_at
        }
      })
    }
  } catch (error) {
    console.error('Error creating milestone:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create milestone',
        message: error.message
      })
    }
  }
}
