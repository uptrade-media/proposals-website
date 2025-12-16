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

    // Only admins can create lists
    if (contact.role !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Admin access required' }) }
    }

    const orgId = contact.org_id || 'default'
    const body = JSON.parse(event.body || '{}')

    const {
      name,
      description,
      type = 'manual',
      segment_rules,
      double_optin = false,
      welcome_email_enabled = false,
      welcome_automation_id
    } = body

    if (!name) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Name is required' }) 
      }
    }

    const supabase = createSupabaseAdmin()

    // Create the list
    const { data: list, error: createError } = await supabase
      .from('email_lists')
      .insert({
        org_id: orgId,
        name,
        description,
        type,
        segment_rules,
        double_optin,
        welcome_email_enabled,
        welcome_automation_id,
        subscriber_count: 0,
        active_count: 0
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating list:', createError)
      return { statusCode: 500, body: JSON.stringify({ error: createError.message }) }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ list })
    }
  } catch (error) {
    console.error('Email lists create error:', error)
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to create list' })
    }
  }
}
