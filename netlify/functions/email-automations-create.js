import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    // Verify authentication
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    // Only admins can create automations
    if (contact.role !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Admin access required' }) }
    }

    const orgId = contact.org_id || 'default'
    const body = JSON.parse(event.body || '{}')

    const {
      name,
      description,
      trigger_type,
      trigger_config,
      list_ids = [],
      steps = []
    } = body

    if (!name || !trigger_type) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Name and trigger type are required' }) 
      }
    }

    // Validate trigger type
    const validTriggers = [
      'subscriber_added', 'tag_added', 'tag_removed', 'date_field',
      'form_submitted', 'campaign_opened', 'campaign_clicked', 'manual'
    ]
    if (!validTriggers.includes(trigger_type)) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: `Invalid trigger type. Must be one of: ${validTriggers.join(', ')}` }) 
      }
    }

    const supabase = createSupabaseAdmin()

    // Create the automation
    const { data: automation, error: createError } = await supabase
      .from('email_automations')
      .insert({
        org_id: orgId,
        name,
        description,
        trigger_type,
        trigger_config,
        list_ids,
        status: 'draft',
        created_by: contact.id
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating automation:', createError)
      return { statusCode: 500, body: JSON.stringify({ error: createError.message }) }
    }

    // Create steps if provided
    if (steps.length > 0) {
      const stepsWithAutomationId = steps.map((step, index) => ({
        automation_id: automation.id,
        step_order: index + 1,
        step_type: step.step_type,
        config: step.config
      }))

      const { error: stepsError } = await supabase
        .from('email_automation_steps')
        .insert(stepsWithAutomationId)

      if (stepsError) {
        console.error('Error creating automation steps:', stepsError)
        // Don't fail the whole operation, automation was created
      }
    }

    // Fetch the automation with steps
    const { data: fullAutomation, error: fetchError } = await supabase
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
      .eq('id', automation.id)
      .single()

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ automation: fullAutomation || automation })
    }
  } catch (error) {
    console.error('Email automations create error:', error)
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to create automation' })
    }
  }
}
