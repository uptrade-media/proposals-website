// netlify/functions/email-lists-list.js
// List email lists/audiences for the current org

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
    const orgId = event.queryStringParameters?.orgId || contact.org_id || '00000000-0000-0000-0000-000000000001'

    const { data: lists, error } = await supabase
      .from('email_lists')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Get subscriber counts for each list
    const listsWithCounts = await Promise.all((lists || []).map(async (list) => {
      const { count } = await supabase
        .from('email_list_subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', list.id)

      return {
        ...list,
        subscriber_count: count || 0
      }
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ lists: listsWithCounts })
    }

  } catch (error) {
    console.error('[email-lists-list] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
