/**
 * CRM Call Get Function
 * 
 * Get detailed call information including transcript, tasks, and analysis
 */

import { createSupabaseAdmin } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const supabase = createSupabaseAdmin()
    const { id } = event.queryStringParameters || {}

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Call ID required' })
      }
    }

    // Get call with all related data
    // Use explicit FK relationship for contacts: call_logs_contact_id_fkey
    const { data: call, error: callError } = await supabase
      .from('call_logs')
      .select(`
        *,
        contact:contacts!call_logs_contact_id_fkey(id, name, email, company, phone, website, avatar, role, source)
      `)
      .eq('id', id)
      .single()

    if (callError || !call) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Call not found' })
      }
    }

    // Get related tasks
    const { data: tasks } = await supabase
      .from('call_tasks')
      .select('*')
      .eq('call_log_id', id)
      .order('due_date', { ascending: true })

    // Get contact extractions
    const { data: extractions } = await supabase
      .from('call_contact_extractions')
      .select('*')
      .eq('call_log_id', id)

    // Get topics
    const { data: topics } = await supabase
      .from('call_topics')
      .select('*')
      .eq('call_log_id', id)
      .order('relevance_score', { ascending: false })

    // Get follow-ups
    const { data: followUps } = await supabase
      .from('call_follow_ups')
      .select('*')
      .eq('call_log_id', id)
      .order('scheduled_for', { ascending: true })

    // Parse AI key points if stored as JSON string
    let aiKeyPoints = call.ai_key_points
    if (typeof aiKeyPoints === 'string') {
      try {
        aiKeyPoints = JSON.parse(aiKeyPoints)
      } catch {
        aiKeyPoints = null
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        call: {
          ...call,
          ai_key_points: aiKeyPoints
        },
        tasks: tasks || [],
        extractions: extractions || [],
        topics: topics || [],
        followUps: followUps || []
      })
    }

  } catch (error) {
    console.error('CRM call get error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    }
  }
}
