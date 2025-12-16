// netlify/functions/projects-milestones.js
// CRUD operations for project milestones
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from './utils/supabase.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  try {
    // Verify authentication
    const { user, contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: authError || 'Not authenticated' })
      }
    }

    const { httpMethod } = event

    switch (httpMethod) {
      case 'GET':
        return await handleGet(event, contact)
      case 'POST':
        return await handleCreate(event, contact)
      case 'PUT':
        return await handleUpdate(event, contact)
      case 'DELETE':
        return await handleDelete(event, contact)
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        }
    }
  } catch (error) {
    console.error('Error in projects-milestones:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', message: error.message })
    }
  }
}

// GET - List milestones for a project
async function handleGet(event, contact) {
  const { projectId } = event.queryStringParameters || {}
  
  if (!projectId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'projectId is required' })
    }
  }

  // Verify user has access to this project
  const hasAccess = await verifyProjectAccess(projectId, contact)
  if (!hasAccess) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Access denied to this project' })
    }
  }

  const { data: milestones, error } = await supabase
    .from('project_milestones')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })
    .order('due_date', { ascending: true })

  if (error) {
    console.error('Error fetching milestones:', error)
    throw error
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      milestones: milestones.map(formatMilestone)
    })
  }
}

// POST - Create a new milestone
async function handleCreate(event, contact) {
  if (contact.role !== 'admin' && contact.teamRole !== 'manager') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Only admins and managers can create milestones' })
    }
  }

  const body = JSON.parse(event.body || '{}')
  const { projectId, title, description, dueDate, sortOrder } = body

  if (!projectId || !title) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'projectId and title are required' })
    }
  }

  // Verify user has access to this project
  const hasAccess = await verifyProjectAccess(projectId, contact)
  if (!hasAccess) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Access denied to this project' })
    }
  }

  const { data: milestone, error } = await supabase
    .from('project_milestones')
    .insert({
      project_id: projectId,
      title,
      description: description || null,
      due_date: dueDate || null,
      sort_order: sortOrder || 0,
      status: 'pending'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating milestone:', error)
    throw error
  }

  // Log activity
  await logActivity(projectId, contact.id, 'milestone_created', {
    milestoneId: milestone.id,
    title: milestone.title
  })

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({ milestone: formatMilestone(milestone) })
  }
}

// PUT - Update a milestone
async function handleUpdate(event, contact) {
  const body = JSON.parse(event.body || '{}')
  const { id, title, description, dueDate, status, sortOrder, completedAt } = body

  if (!id) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Milestone id is required' })
    }
  }

  // Get the milestone to verify access
  const { data: existing, error: fetchError } = await supabase
    .from('project_milestones')
    .select('*, projects(contact_id)')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Milestone not found' })
    }
  }

  // Verify access
  const hasAccess = await verifyProjectAccess(existing.project_id, contact)
  if (!hasAccess) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Access denied' })
    }
  }

  // Build update object
  const updates = {}
  if (title !== undefined) updates.title = title
  if (description !== undefined) updates.description = description
  if (dueDate !== undefined) updates.due_date = dueDate
  if (status !== undefined) updates.status = status
  if (sortOrder !== undefined) updates.sort_order = sortOrder
  
  // Handle completion
  if (status === 'completed' && !existing.completed_at) {
    updates.completed_at = new Date().toISOString()
  } else if (completedAt !== undefined) {
    updates.completed_at = completedAt
  }

  const { data: milestone, error } = await supabase
    .from('project_milestones')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating milestone:', error)
    throw error
  }

  // Log activity if status changed to completed
  if (status === 'completed' && existing.status !== 'completed') {
    await logActivity(existing.project_id, contact.id, 'milestone_completed', {
      milestoneId: milestone.id,
      title: milestone.title
    })
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ milestone: formatMilestone(milestone) })
  }
}

// DELETE - Remove a milestone
async function handleDelete(event, contact) {
  if (contact.role !== 'admin') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Only admins can delete milestones' })
    }
  }

  const { id } = event.queryStringParameters || {}

  if (!id) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Milestone id is required' })
    }
  }

  // Get milestone first to log the deletion
  const { data: existing } = await supabase
    .from('project_milestones')
    .select('project_id, title')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('project_milestones')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting milestone:', error)
    throw error
  }

  if (existing) {
    await logActivity(existing.project_id, contact.id, 'milestone_deleted', {
      title: existing.title
    })
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true })
  }
}

// Helper: Verify user has access to project
async function verifyProjectAccess(projectId, contact) {
  if (contact.role === 'admin') return true

  const { data: project } = await supabase
    .from('projects')
    .select('contact_id, assigned_to')
    .eq('id', projectId)
    .single()

  if (!project) return false

  // Check if user owns the project or is assigned to it
  return project.contact_id === contact.id || project.assigned_to === contact.id
}

// Helper: Log project activity
async function logActivity(projectId, userId, action, details = {}) {
  try {
    await supabase
      .from('project_activities')
      .insert({
        project_id: projectId,
        user_id: userId,
        action,
        details
      })
  } catch (error) {
    console.error('Error logging activity:', error)
    // Don't throw - activity logging is not critical
  }
}

// Helper: Format milestone for response
function formatMilestone(m) {
  return {
    id: m.id,
    projectId: m.project_id,
    title: m.title,
    description: m.description,
    dueDate: m.due_date,
    completedAt: m.completed_at,
    status: m.status,
    sortOrder: m.sort_order,
    createdAt: m.created_at,
    updatedAt: m.updated_at
  }
}
