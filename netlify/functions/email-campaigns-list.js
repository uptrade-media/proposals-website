// netlify/functions/email-campaigns-list.js
// List email campaigns for the current org

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
      status,
      limit = 50,
      offset = 0
    } = event.queryStringParameters || {}

    const targetOrgId = orgId || contact.org_id || '00000000-0000-0000-0000-000000000001'

    let query = supabase
      .from('email_campaigns')
      .select('*', { count: 'exact' })
      .eq('org_id', targetOrgId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: campaigns, error, count } = await query

    if (error) throw error

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        campaigns: campaigns || [],
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      })
    }

  } catch (error) {
    console.error('[email-campaigns-list] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
