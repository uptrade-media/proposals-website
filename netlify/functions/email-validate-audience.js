import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    const body = JSON.parse(event.body || '{}')
    const { lists = [], tags = [] } = body

    if (lists.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No lists selected' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Count opt-in contacts in selected lists
    try {
      // First get contact IDs from the selected lists
      const { data: contactListData } = await supabase
        .from('contact_list')
        .select('contact_id')
        .in('list_id', lists)

      const contactIds = [...new Set(contactListData?.map(cl => cl.contact_id) || [])]

      if (contactIds.length === 0) {
        return {
          statusCode: 200,
          body: JSON.stringify({ count: 0 }),
          headers: { 'Content-Type': 'application/json' }
        }
      }

      // Count contacts that are opted in and in the selected lists
      let query = supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('consent_status', 'opt_in')
        .in('id', contactIds)

      // If tags are specified, filter by tags
      if (tags.length > 0) {
        query = query.contains('tags', tags)
      }

      const { count } = await query

      return {
        statusCode: 200,
        body: JSON.stringify({ count: count || 0 }),
        headers: { 'Content-Type': 'application/json' }
      }
    } catch (err) {
      // If query fails, return 0
      console.error('Audience count error:', err)
      return {
        statusCode: 200,
        body: JSON.stringify({ count: 0 }),
        headers: { 'Content-Type': 'application/json' }
      }
    }
  } catch (err) {
    console.error('Validate audience error:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to validate audience' })
    }
  }
}
