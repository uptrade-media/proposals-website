// ============================================================================
// DEPRECATED: This function is now redundant - use Signal API directly
// ============================================================================
// Portal now calls Signal API (NestJS) instead of internal Signal implementation.
// This function remains for backward compatibility but should not be used in new code.
//
// Migration:
//   Old: /.netlify/functions/signal-xxx
//   New: Signal API endpoints (see SIGNAL-API-MIGRATION.md)
//
// Signal API Base URL: $SIGNAL_API_URL (http://localhost:3001 or https://signal-api.uptrademedia.com)
// ============================================================================


// netlify/functions/signal-conversations.js
// Signal Module: View and manage widget chat conversations

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Content-Type': 'application/json'
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS }
  }

  const { contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  const supabase = createSupabaseAdmin()
  const projectId = event.queryStringParameters?.projectId
  const conversationId = event.queryStringParameters?.id

  try {
    // GET single conversation with messages
    if (event.httpMethod === 'GET' && conversationId) {
      const { data: conversation, error } = await supabase
        .from('signal_widget_conversations')
        .select(`
          *,
          escalated_to_contact:contacts!signal_widget_conversations_escalated_to_fkey(id, name, email),
          lead_contact:contacts!signal_widget_conversations_lead_id_fkey(id, name, email)
        `)
        .eq('id', conversationId)
        .single()

      if (error) throw error

      if (!conversation) {
        return {
          statusCode: 404,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Conversation not found' })
        }
      }

      // Get messages
      const { data: messages, error: msgError } = await supabase
        .from('signal_widget_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (msgError) throw msgError

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          conversation,
          messages
        })
      }
    }

    // GET - List conversations
    if (event.httpMethod === 'GET') {
      if (!projectId) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Project ID is required' })
        }
      }

      const { 
        status, 
        hasLead, 
        startDate, 
        endDate, 
        search,
        page = 1, 
        limit = 25 
      } = event.queryStringParameters || {}
      
      let query = supabase
        .from('signal_widget_conversations')
        .select('*', { count: 'exact' })
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }
      if (hasLead === 'true') {
        query = query.eq('lead_created', true)
      }
      if (startDate) {
        query = query.gte('created_at', startDate)
      }
      if (endDate) {
        query = query.lte('created_at', endDate)
      }
      if (search) {
        query = query.or(`visitor_name.ilike.%${search}%,visitor_email.ilike.%${search}%`)
      }

      const offset = (parseInt(page) - 1) * parseInt(limit)
      query = query.range(offset, offset + parseInt(limit) - 1)

      const { data: conversations, error, count } = await query

      if (error) throw error

      // Get stats for this project
      const { data: stats } = await supabase
        .from('signal_widget_conversations')
        .select('status, lead_created, satisfaction_rating')
        .eq('project_id', projectId)

      const summary = stats?.reduce((acc, c) => {
        acc.byStatus[c.status] = (acc.byStatus[c.status] || 0) + 1
        if (c.lead_created) acc.leadsCreated++
        if (c.satisfaction_rating) {
          acc.totalRatings++
          acc.ratingSum += c.satisfaction_rating
        }
        return acc
      }, { 
        byStatus: { active: 0, closed: 0, escalated: 0, converted: 0 }, 
        leadsCreated: 0,
        totalRatings: 0,
        ratingSum: 0
      }) || { byStatus: {}, leadsCreated: 0, totalRatings: 0, ratingSum: 0 }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          conversations,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            pages: Math.ceil(count / parseInt(limit))
          },
          stats: {
            total: count,
            byStatus: summary.byStatus,
            leadsCreated: summary.leadsCreated,
            avgSatisfaction: summary.totalRatings > 0 
              ? (summary.ratingSum / summary.totalRatings).toFixed(1) 
              : null
          }
        })
      }
    }

    // PUT - Update conversation (close, rate, etc.)
    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}')
      const { id, status, satisfactionRating } = body

      if (!id) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Conversation ID is required' })
        }
      }

      const updates = { updated_at: new Date().toISOString() }

      if (status) {
        updates.status = status
        if (status === 'closed') {
          updates.closed_at = new Date().toISOString()
        }
      }

      if (satisfactionRating) {
        updates.satisfaction_rating = satisfactionRating
      }

      const { data: updated, error } = await supabase
        .from('signal_widget_conversations')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ conversation: updated })
      }
    }

    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('Signal conversations error:', error)
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message })
    }
  }
}
