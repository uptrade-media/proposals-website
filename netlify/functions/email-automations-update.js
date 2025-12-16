import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'PUT, OPTIONS'
      },
      body: ''
    }
  }

  if (event.httpMethod !== 'PUT') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    // Verify authentication
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    // Only admins can update automations
    if (contact.role !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Admin access required' }) }
    }

    const orgId = contact.org_id || 'default'
    const automationId = event.path.split('/').pop()
    const body = JSON.parse(event.body || '{}')

    if (!automationId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Automation ID required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Check automation exists and belongs to org
    const { data: existing, error: fetchError } = await supabase
      .from('email_automations')
      .select('id, status')
      .eq('id', automationId)
      .eq('org_id', orgId)
      .single()

    if (fetchError || !existing) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Automation not found' }) }
    }

    const {
      name,
      description,
      trigger_type,
      trigger_config,
      list_ids,
      status,
      steps
    } = body

    // Build update object with only provided fields
    const updates = {}
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (trigger_type !== undefined) updates.trigger_type = trigger_type
    if (trigger_config !== undefined) updates.trigger_config = trigger_config
    if (list_ids !== undefined) updates.list_ids = list_ids
    if (status !== undefined && ['draft', 'active', 'paused', 'archived'].includes(status)) {
      updates.status = status
    }

    updates.updated_at = new Date().toISOString()

    // Update automation
    const { data: automation, error: updateError } = await supabase
      .from('email_automations')
      .update(updates)
      .eq('id', automationId)
      .eq('org_id', orgId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating automation:', updateError)
      return { statusCode: 500, body: JSON.stringify({ error: updateError.message }) }
    }

    // Update steps if provided
    if (steps !== undefined) {
      // Delete existing steps
      await supabase
        .from('email_automation_steps')
        .delete()
        .eq('automation_id', automationId)

      // Insert new steps
      if (steps.length > 0) {
        const stepsWithAutomationId = steps.map((step, index) => ({
          automation_id: automationId,
          step_order: index + 1,
          step_type: step.step_type,
          config: step.config
        }))

        const { error: stepsError } = await supabase
          .from('email_automation_steps')
          .insert(stepsWithAutomationId)

        if (stepsError) {
          console.error('Error updating automation steps:', stepsError)
        }
      }
    }

    // Fetch updated automation with steps
    const { data: fullAutomation, error: fetchFullError } = await supabase
      .from('email_automations')
      .select(`
        *,
        email_automation_steps (
          id,
          step_order,
          step_type,
          config,
          times_executed
        )
      `)
      .eq('id', automationId)
      .single()

    if (fullAutomation?.email_automation_steps) {
      fullAutomation.email_automation_steps.sort((a, b) => a.step_order - b.step_order)
      fullAutomation.steps = fullAutomation.email_automation_steps
      delete fullAutomation.email_automation_steps
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ automation: fullAutomation || automation })
    }
  } catch (error) {
    console.error('Email automations update error:', error)
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to update automation' })
    }
  }
}
