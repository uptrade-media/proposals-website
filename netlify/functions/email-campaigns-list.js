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

  try {
    // Verify auth using Supabase
    const { user, contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    if (contact.role !== 'admin') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin only' }) }
    }

    // Get query params
    const type = event.queryStringParameters?.type || 'all'
    const limit = parseInt(event.queryStringParameters?.limit || '50')
    const offset = parseInt(event.queryStringParameters?.offset || '0')

    const supabase = createSupabaseAdmin()

    // Build query
    let query = supabase
      .from('campaigns')
      .select('id, type, name, status, scheduled_start, created_at, updated_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (type !== 'all') {
      query = query.eq('type', type)
    }

    const { data: campaigns, count, error } = await query

    if (error) {
      console.error('Query error:', error)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to list campaigns' })
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        campaigns: campaigns || [],
        total: count || 0,
        limit,
        offset
      }),
      headers: { 'Content-Type': 'application/json' }
    }
  } catch (err) {
    console.error('List campaigns error:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to list campaigns' })
    }
  }
}
