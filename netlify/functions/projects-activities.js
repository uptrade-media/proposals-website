// netlify/functions/projects-activities.js
// Get project activity/timeline log
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from './utils/supabase.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
}

export async function handler(event) {
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
    // Verify authentication
    const { user, contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: authError || 'Not authenticated' })
      }
    }

    const { projectId, limit: limitParam, offset: offsetParam } = event.queryStringParameters || {}
    
    if (!projectId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'projectId is required' })
      }
    }

    const limit = Math.min(parseInt(limitParam) || 50, 100)
    const offset = parseInt(offsetParam) || 0

    // Verify user has access to this project
    const hasAccess = await verifyProjectAccess(projectId, contact)
    if (!hasAccess) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Access denied to this project' })
      }
    }

    const { data: activities, error, count } = await supabase
      .from('project_activities')
      .select(`
        *,
        user:contacts!project_activities_user_id_fkey (
          id, name, email, avatar
        )
      `, { count: 'exact' })
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching activities:', error)
      throw error
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        activities: activities.map(formatActivity),
        total: count || activities.length,
        offset,
        limit
      })
    }

  } catch (error) {
    console.error('Error in projects-activities:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', message: error.message })
    }
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

  return project.contact_id === contact.id || project.assigned_to === contact.id
}

// Helper: Format activity for response with human-readable description
function formatActivity(a) {
  return {
    id: a.id,
    projectId: a.project_id,
    action: a.action,
    description: getActivityDescription(a.action, a.details),
    details: a.details,
    user: a.user ? {
      id: a.user.id,
      name: a.user.name,
      email: a.user.email,
      avatar: a.user.avatar
    } : null,
    createdAt: a.created_at
  }
}

// Helper: Get human-readable description for activity
function getActivityDescription(action, details) {
  const title = details?.title || 'item'
  
  const descriptions = {
    'created': 'Project created',
    'status_changed': `Status changed to ${details?.newStatus || 'unknown'}`,
    'milestone_created': `Added milestone: ${title}`,
    'milestone_completed': `Completed milestone: ${title}`,
    'milestone_deleted': `Deleted milestone: ${title}`,
    'checklist_item_created': `Added task: ${title}`,
    'checklist_item_completed': `Completed task: ${title}`,
    'checklist_item_uncompleted': `Reopened task: ${title}`,
    'checklist_item_deleted': `Deleted task: ${title}`,
    'converted_to_tenant': `Converted to web app with features: ${details?.features?.join(', ') || 'none'}`,
    'team_member_added': `Added team member: ${details?.memberName || 'unknown'}`,
    'team_member_removed': `Removed team member: ${details?.memberName || 'unknown'}`,
    'budget_updated': `Budget updated to $${details?.newBudget?.toLocaleString() || '0'}`,
    'deadline_updated': `Deadline updated to ${details?.newDeadline || 'unknown'}`,
  }
  
  return descriptions[action] || action.replace(/_/g, ' ')
}
