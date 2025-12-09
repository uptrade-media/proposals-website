/**
 * CRM Tasks List Function
 * 
 * Lists all AI-generated and manual tasks with filtering
 */

import { createSupabaseAdmin } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const supabase = createSupabaseAdmin()
    const params = event.queryStringParameters || {}
    
    const {
      status,         // 'pending' | 'in_progress' | 'completed' | 'cancelled'
      priority,       // 'low' | 'medium' | 'high' | 'urgent'
      taskType,       // 'follow_up' | 'send_proposal' | 'schedule_meeting' | 'research'
      assignedTo,     // User ID
      contactId,      // Filter by contact
      overdue,        // 'true' to show only overdue
      limit = '50',
      offset = '0'
    } = params

    // Build query
    // Use explicit FK relationships for contacts (contact_id and assigned_to)
    let query = supabase
      .from('call_tasks')
      .select(`
        *,
        contact:contacts!call_tasks_contact_id_fkey(id, name, email, company),
        call_log:call_logs(id, phone_number, direction, created_at),
        assigned_user:contacts!call_tasks_assigned_to_fkey(id, name, email)
      `, { count: 'exact' })
      .order('due_date', { ascending: true, nullsFirst: false })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    } else {
      // Default: show non-completed tasks
      query = query.in('status', ['pending', 'in_progress'])
    }
    
    if (priority) {
      query = query.eq('priority', priority)
    }
    
    if (taskType) {
      query = query.eq('task_type', taskType)
    }
    
    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo)
    }
    
    if (contactId) {
      query = query.eq('contact_id', contactId)
    }
    
    if (overdue === 'true') {
      query = query.lt('due_date', new Date().toISOString())
    }

    // Pagination
    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

    const { data: tasks, count, error } = await query

    if (error) {
      throw error
    }

    // Get summary stats
    const { data: allTasks } = await supabase
      .from('call_tasks')
      .select('status, priority, due_date')
    
    const now = new Date()
    const summary = {
      total: allTasks?.length || 0,
      pending: allTasks?.filter(t => t.status === 'pending').length || 0,
      inProgress: allTasks?.filter(t => t.status === 'in_progress').length || 0,
      completed: allTasks?.filter(t => t.status === 'completed').length || 0,
      overdue: allTasks?.filter(t => 
        t.due_date && new Date(t.due_date) < now && t.status !== 'completed'
      ).length || 0,
      urgent: allTasks?.filter(t => t.priority === 'urgent' && t.status !== 'completed').length || 0
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        tasks,
        total: count,
        summary,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: count > parseInt(offset) + parseInt(limit)
        }
      })
    }

  } catch (error) {
    console.error('CRM tasks list error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    }
  }
}
