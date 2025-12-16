// netlify/functions/email-automations-list.js
// List email automations for the current org

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const { contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  if (contact.role !== 'admin') {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin access required' }) }
  }

  const supabase = createSupabaseAdmin()

  try {
    const {
      orgId,
      status
    } = event.queryStringParameters || {}

    const targetOrgId = orgId || contact.org_id || '00000000-0000-0000-0000-000000000001'

    let query = supabase
      .from('email_automations')
      .select('*')
      .eq('org_id', targetOrgId)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: automations, error } = await query

    if (error) throw error

    // Get step counts for each automation
    const automationsWithCounts = await Promise.all((automations || []).map(async (automation) => {
      const { count: stepsCount } = await supabase
        .from('email_automation_steps')
        .select('*', { count: 'exact', head: true })
        .eq('automation_id', automation.id)

      return {
        ...automation,
        steps_count: stepsCount || 0
      }
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ automations: automationsWithCounts })
    }

  } catch (error) {
    console.error('[email-automations-list] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
