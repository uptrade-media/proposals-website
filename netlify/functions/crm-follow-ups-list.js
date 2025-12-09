/**
 * CRM Follow-ups List Function
 * 
 * Lists all scheduled follow-ups with filtering
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
    const params = event.queryStringParameters || {}
    
    const {
      status,         // 'pending' | 'completed' | 'cancelled' | 'rescheduled'
      type,           // 'email' | 'call' | 'sms' | 'meeting'
      contactId,      // Filter by contact
      upcoming,       // 'today' | 'week' | 'overdue'
      limit = '50',
      offset = '0'
    } = params

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Build query
    // Use explicit FK relationship for contacts: call_follow_ups_contact_id_fkey
    let query = supabase
      .from('call_follow_ups')
      .select(`
        *,
        contact:contacts!call_follow_ups_contact_id_fkey(id, name, email, company, phone),
        call_log:call_logs(id, phone_number, direction, ai_summary, sentiment)
      `, { count: 'exact' })
      .order('scheduled_for', { ascending: true })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    } else {
      // Default: show pending only
      query = query.eq('status', 'pending')
    }
    
    if (type) {
      query = query.eq('follow_up_type', type)
    }
    
    if (contactId) {
      query = query.eq('contact_id', contactId)
    }
    
    if (upcoming === 'today') {
      query = query
        .gte('scheduled_for', today.toISOString())
        .lt('scheduled_for', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString())
    } else if (upcoming === 'week') {
      query = query
        .gte('scheduled_for', today.toISOString())
        .lt('scheduled_for', nextWeek.toISOString())
    } else if (upcoming === 'overdue') {
      query = query.lt('scheduled_for', now.toISOString())
    }

    // Pagination
    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

    const { data: followUps, count, error } = await query

    if (error) {
      throw error
    }

    // Get summary stats
    const { data: allFollowUps } = await supabase
      .from('call_follow_ups')
      .select('status, scheduled_for, follow_up_type')
      .eq('status', 'pending')
    
    const summary = {
      total: allFollowUps?.length || 0,
      overdue: allFollowUps?.filter(f => new Date(f.scheduled_for) < now).length || 0,
      today: allFollowUps?.filter(f => {
        const d = new Date(f.scheduled_for)
        return d >= today && d < new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }).length || 0,
      thisWeek: allFollowUps?.filter(f => {
        const d = new Date(f.scheduled_for)
        return d >= today && d < nextWeek
      }).length || 0,
      byType: {
        email: allFollowUps?.filter(f => f.follow_up_type === 'email').length || 0,
        call: allFollowUps?.filter(f => f.follow_up_type === 'call').length || 0,
        sms: allFollowUps?.filter(f => f.follow_up_type === 'sms').length || 0,
        meeting: allFollowUps?.filter(f => f.follow_up_type === 'meeting').length || 0
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        followUps,
        total: count,
        summary,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: count > parseInt(offset) + parseInt(limit)
        }
      })
    }

  } catch (error) {
    console.error('CRM follow-ups list error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    }
  }
}
