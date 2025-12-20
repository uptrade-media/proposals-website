/**
 * CRM Calls List Function
 * 
 * Lists all calls with filtering and pagination
 */

import { createSupabaseAdmin } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
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
      direction,      // 'inbound' | 'outbound'
      status,         // 'completed' | 'missed' | 'voicemail'
      sentiment,      // 'positive' | 'neutral' | 'negative' | 'mixed'
      minScore,       // Minimum lead quality score
      contactId,      // Filter by contact
      search,         // Search phone number
      limit = '50',
      offset = '0'
    } = params

    // Build query
    // Use explicit FK relationship: contacts!call_logs_contact_id_fkey
    let query = supabase
      .from('call_logs')
      .select(`
        *,
        contact:contacts!call_logs_contact_id_fkey(id, name, email, company, phone)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
    if (direction) {
      query = query.eq('direction', direction)
    }
    
    if (status) {
      query = query.eq('status', status)
    }
    
    if (sentiment) {
      query = query.eq('sentiment', sentiment)
    }
    
    if (minScore) {
      query = query.gte('lead_quality_score', parseInt(minScore))
    }
    
    if (contactId) {
      query = query.eq('contact_id', contactId)
    }
    
    if (search) {
      query = query.ilike('phone_number', `%${search}%`)
    }

    // Pagination
    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

    const { data: calls, count, error } = await query

    if (error) {
      throw error
    }

    // Get summary stats
    const { data: stats } = await supabase
      .from('call_logs')
      .select('direction, sentiment, lead_quality_score')
    
    const summary = {
      total: stats?.length || 0,
      inbound: stats?.filter(c => c.direction === 'inbound').length || 0,
      outbound: stats?.filter(c => c.direction === 'outbound').length || 0,
      hotLeads: stats?.filter(c => c.lead_quality_score >= 71).length || 0,
      warmLeads: stats?.filter(c => c.lead_quality_score >= 41 && c.lead_quality_score < 71).length || 0,
      positive: stats?.filter(c => c.sentiment === 'positive').length || 0
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        calls,
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
    console.error('CRM calls list error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    }
  }
}
