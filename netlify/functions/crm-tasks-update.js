/**
 * CRM Task Update Function
 * 
 * Update task status, assignment, due date, etc.
 */

import { createSupabaseAdmin } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'PUT, PATCH, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'PUT' && event.httpMethod !== 'PATCH') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const supabase = createSupabaseAdmin()
    const body = JSON.parse(event.body || '{}')
    
    const {
      id,
      status,
      priority,
      assignedTo,
      dueDate,
      title,
      description
    } = body

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Task ID required' })
      }
    }

    // Build update object
    const updates = {
      updated_at: new Date().toISOString()
    }

    if (status !== undefined) {
      updates.status = status
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString()
      }
    }
    
    if (priority !== undefined) updates.priority = priority
    if (assignedTo !== undefined) {
      updates.assigned_to = assignedTo
      updates.assigned_at = new Date().toISOString()
    }
    if (dueDate !== undefined) updates.due_date = dueDate
    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description

    // Update task
    // Use explicit FK relationship for contacts
    const { data: task, error } = await supabase
      .from('call_tasks')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        contact:contacts!call_tasks_contact_id_fkey(id, name, email, company),
        call_log:call_logs(id, phone_number, direction)
      `)
      .single()

    if (error) {
      throw error
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ task })
    }

  } catch (error) {
    console.error('CRM task update error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    }
  }
}
