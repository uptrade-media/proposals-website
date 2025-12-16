/**
 * List calls for a specific contact
 * 
 * GET /.netlify/functions/calls-list?contactId=xxx
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  try {
    // Verify authentication
    const { contact: user, error: authError } = await getAuthenticatedUser(event)
    if (authError || !user) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    const { contactId } = event.queryStringParameters || {}

    if (!contactId) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'contactId is required' }) 
      }
    }

    const supabase = createSupabaseAdmin()

    // Fetch calls with related tasks and follow-ups
    const { data: calls, error } = await supabase
      .from('call_logs')
      .select(`
        *,
        tasks:call_tasks(*),
        follow_up:call_follow_ups(*)
      `)
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Failed to fetch calls:', error)
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: 'Failed to fetch calls' }) 
      }
    }

    // Parse JSON fields
    const formattedCalls = (calls || []).map(call => ({
      ...call,
      ai_key_points: typeof call.ai_key_points === 'string' 
        ? JSON.parse(call.ai_key_points) 
        : call.ai_key_points,
      follow_up: call.follow_up?.[0] || null, // Get first follow-up
      tasks: call.tasks || []
    }))

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        calls: formattedCalls,
        count: formattedCalls.length
      })
    }

  } catch (error) {
    console.error('Calls list error:', error)
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: error.message }) 
    }
  }
}
