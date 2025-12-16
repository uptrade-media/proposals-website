import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: ''
    }
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    // Verify authentication
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    // Only admins can view automations
    if (contact.role !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Admin access required' }) }
    }

    const orgId = contact.org_id || 'default'
    const automationId = event.path.split('/').pop()

    if (!automationId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Automation ID required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Get automation with steps
    const { data: automation, error: fetchError } = await supabase
      .from('email_automations')
      .select(`
        *,
        email_automation_steps (
          id,
          step_order,
          step_type,
          config,
          times_executed,
          created_at,
          updated_at
        )
      `)
      .eq('id', automationId)
      .eq('org_id', orgId)
      .single()

    if (fetchError || !automation) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Automation not found' }) }
    }

    // Sort steps by order
    if (automation.email_automation_steps) {
      automation.email_automation_steps.sort((a, b) => a.step_order - b.step_order)
      // Rename for cleaner API
      automation.steps = automation.email_automation_steps
      delete automation.email_automation_steps
    }

    // Get enrollment stats
    const { count: enrolledCount } = await supabase
      .from('email_automation_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('automation_id', automationId)

    const { count: activeCount } = await supabase
      .from('email_automation_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('automation_id', automationId)
      .eq('status', 'active')

    const { count: completedCount } = await supabase
      .from('email_automation_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('automation_id', automationId)
      .eq('status', 'completed')

    automation.stats = {
      total_enrolled: enrolledCount || 0,
      active: activeCount || 0,
      completed: completedCount || 0
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ automation })
    }
  } catch (error) {
    console.error('Email automations get error:', error)
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to get automation' })
    }
  }
}
