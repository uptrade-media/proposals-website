// netlify/functions/email-subscribers-list.js
// List email subscribers for the current org

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
      listId,
      status,
      search,
      tag,
      limit = 100,
      offset = 0
    } = event.queryStringParameters || {}

    const targetOrgId = orgId || contact.org_id || '00000000-0000-0000-0000-000000000001'

    let query = supabase
      .from('email_subscribers')
      .select('*', { count: 'exact' })
      .eq('org_id', targetOrgId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

    // Filter by status
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // Search by email or name
    if (search) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
    }

    // Filter by tag
    if (tag) {
      query = query.contains('tags', [tag])
    }

    const { data: subscribers, error, count } = await query

    if (error) throw error

    // If filtering by list, we need to join with email_list_subscribers
    let filteredSubscribers = subscribers
    if (listId) {
      const { data: listMembers } = await supabase
        .from('email_list_subscribers')
        .select('subscriber_id')
        .eq('list_id', listId)

      const memberIds = new Set(listMembers?.map(m => m.subscriber_id) || [])
      filteredSubscribers = subscribers.filter(s => memberIds.has(s.id))
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        subscribers: filteredSubscribers || [],
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      })
    }

  } catch (error) {
    console.error('[email-subscribers-list] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
