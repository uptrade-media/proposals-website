// netlify/functions/projects-checklist.js
// CRUD operations for project checklist items
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
    console.error('Error in projects-checklist:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', message: error.message })
    }
  }
}

// GET - List checklist items for a project
async function handleGet(event, contact) {
  const { projectId, milestoneId } = event.queryStringParameters || {}
  
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

  let query = supabase
    .from('project_checklist_items')
    .select(`
      *,
      completed_by_contact:contacts!project_checklist_items_completed_by_fkey (
        id, name, avatar
      )
    `)
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  // Optionally filter by milestone
  if (milestoneId) {
    query = query.eq('milestone_id', milestoneId)
  }

  const { data: items, error } = await query

  if (error) {
    console.error('Error fetching checklist items:', error)
    throw error
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      items: items.map(formatChecklistItem)
    })
  }
}

// POST - Create a new checklist item
async function handleCreate(event, contact) {
  const body = JSON.parse(event.body || '{}')
  const { projectId, milestoneId, title, sortOrder } = body

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

  const { data: item, error } = await supabase
    .from('project_checklist_items')
    .insert({
      project_id: projectId,
      milestone_id: milestoneId || null,
      title,
      sort_order: sortOrder || 0,
      completed: false
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating checklist item:', error)
    throw error
  }

  // Log activity
  await logActivity(projectId, contact.id, 'checklist_item_created', {
    itemId: item.id,
    title: item.title
  })

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({ item: formatChecklistItem(item) })
  }
}

// PUT - Update a checklist item (toggle completion, rename, etc.)
async function handleUpdate(event, contact) {
  const body = JSON.parse(event.body || '{}')
  const { id, title, completed, milestoneId, sortOrder } = body

  if (!id) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Checklist item id is required' })
    }
  }

  // Get the item to verify access
  const { data: existing, error: fetchError } = await supabase
    .from('project_checklist_items')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Checklist item not found' })
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
  if (milestoneId !== undefined) updates.milestone_id = milestoneId
  if (sortOrder !== undefined) updates.sort_order = sortOrder
  
  // Handle completion toggle
  if (completed !== undefined) {
    updates.completed = completed
    if (completed && !existing.completed) {
      // Mark as completed
      updates.completed_at = new Date().toISOString()
      updates.completed_by = contact.id
    } else if (!completed && existing.completed) {
      // Mark as incomplete
      updates.completed_at = null
      updates.completed_by = null
    }
  }

  const { data: item, error } = await supabase
    .from('project_checklist_items')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      completed_by_contact:contacts!project_checklist_items_completed_by_fkey (
        id, name, avatar
      )
    `)
    .single()

  if (error) {
    console.error('Error updating checklist item:', error)
    throw error
  }

  // Log activity if completion status changed
  if (completed !== undefined && completed !== existing.completed) {
    await logActivity(existing.project_id, contact.id, 
      completed ? 'checklist_item_completed' : 'checklist_item_uncompleted', 
      { itemId: item.id, title: item.title }
    )
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ item: formatChecklistItem(item) })
  }
}

// DELETE - Remove a checklist item
async function handleDelete(event, contact) {
  const { id } = event.queryStringParameters || {}

  if (!id) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Checklist item id is required' })
    }
  }

  // Get item first to verify access and log deletion
  const { data: existing, error: fetchError } = await supabase
    .from('project_checklist_items')
    .select('project_id, title')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Checklist item not found' })
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

  const { error } = await supabase
    .from('project_checklist_items')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting checklist item:', error)
    throw error
  }

  await logActivity(existing.project_id, contact.id, 'checklist_item_deleted', {
    title: existing.title
  })

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

// Helper: Format checklist item for response
function formatChecklistItem(item) {
  return {
    id: item.id,
    projectId: item.project_id,
    milestoneId: item.milestone_id,
    title: item.title,
    completed: item.completed,
    completedAt: item.completed_at,
    completedBy: item.completed_by_contact ? {
      id: item.completed_by_contact.id,
      name: item.completed_by_contact.name,
      avatar: item.completed_by_contact.avatar
    } : null,
    sortOrder: item.sort_order,
    createdAt: item.created_at,
    updatedAt: item.updated_at
  }
}
