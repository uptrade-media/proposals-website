// netlify/functions/signal-learning.js
// Signal Module: AI-suggested improvements requiring approval
// Safe learning pipeline with human-in-the-loop

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
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
  const projectId = event.queryStringParameters?.projectId || 
                   JSON.parse(event.body || '{}').projectId
  const suggestionId = event.queryStringParameters?.id
  const action = event.queryStringParameters?.action

  if (!projectId && event.httpMethod === 'GET') {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Project ID is required' })
    }
  }

  try {
    // GET - List learning suggestions
    if (event.httpMethod === 'GET') {
      const { status, type, page = 1, limit = 20 } = event.queryStringParameters || {}
      
      let query = supabase
        .from('signal_learning')
        .select('*', { count: 'exact' })
        .eq('project_id', projectId)
        .order('confidence', { ascending: false })
        .order('occurrence_count', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      } else {
        // Default to pending
        query = query.eq('status', 'pending')
      }
      if (type) {
        query = query.eq('suggestion_type', type)
      }

      const offset = (parseInt(page) - 1) * parseInt(limit)
      query = query.range(offset, offset + parseInt(limit) - 1)

      const { data: suggestions, error, count } = await query

      if (error) throw error

      // Get stats
      const { data: stats } = await supabase
        .from('signal_learning')
        .select('status, suggestion_type')
        .eq('project_id', projectId)

      const statusCounts = stats?.reduce((acc, s) => {
        acc.byStatus[s.status] = (acc.byStatus[s.status] || 0) + 1
        acc.byType[s.suggestion_type] = (acc.byType[s.suggestion_type] || 0) + 1
        return acc
      }, { byStatus: {}, byType: {} }) || { byStatus: {}, byType: {} }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          suggestions,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            pages: Math.ceil(count / parseInt(limit))
          },
          stats: statusCounts
        })
      }
    }

    // POST - Actions on suggestions (approve, reject, defer, apply)
    if (event.httpMethod === 'POST') {
      if (!suggestionId) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Suggestion ID is required' })
        }
      }

      // Get the suggestion
      const { data: suggestion, error: fetchError } = await supabase
        .from('signal_learning')
        .select('*')
        .eq('id', suggestionId)
        .single()

      if (fetchError || !suggestion) {
        return {
          statusCode: 404,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Suggestion not found' })
        }
      }

      const body = JSON.parse(event.body || '{}')

      // APPROVE - Mark as approved but don't apply yet
      if (action === 'approve') {
        const { data: updated, error } = await supabase
          .from('signal_learning')
          .update({
            status: 'approved',
            reviewed_by: contact.id,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', suggestionId)
          .select()
          .single()

        if (error) throw error

        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ suggestion: updated, message: 'Suggestion approved' })
        }
      }

      // APPLY - Approve and apply the change
      if (action === 'apply') {
        // Apply based on suggestion type
        let applyResult = null

        switch (suggestion.suggestion_type) {
          case 'faq': {
            // Create FAQ from suggestion
            const faqData = suggestion.suggestion_data
            const { data: newFaq, error: faqError } = await supabase
              .from('signal_faqs')
              .insert({
                project_id: suggestion.project_id,
                org_id: suggestion.org_id,
                question: faqData.question,
                answer: faqData.answer,
                category: faqData.category,
                is_auto_generated: true,
                source_conversation_id: suggestion.source_conversation_ids?.[0],
                status: 'approved',
                approved_by: contact.id,
                approved_at: new Date().toISOString()
              })
              .select()
              .single()

            if (faqError) throw faqError
            applyResult = { faqId: newFaq.id }
            break
          }

          case 'profile_update': {
            // Update profile snapshot
            const { data: config } = await supabase
              .from('signal_config')
              .select('profile_snapshot')
              .eq('project_id', suggestion.project_id)
              .single()

            const currentSnapshot = config?.profile_snapshot || {}
            const updates = suggestion.suggestion_data

            // Merge updates into snapshot
            const newSnapshot = { ...currentSnapshot }
            for (const [key, value] of Object.entries(updates)) {
              if (Array.isArray(currentSnapshot[key])) {
                newSnapshot[key] = [...new Set([...currentSnapshot[key], ...value])]
              } else {
                newSnapshot[key] = value
              }
            }

            await supabase
              .from('signal_config')
              .update({
                profile_snapshot: newSnapshot,
                updated_at: new Date().toISOString()
              })
              .eq('project_id', suggestion.project_id)

            applyResult = { updatedFields: Object.keys(updates) }
            break
          }

          case 'knowledge_gap': {
            // Flag as applied - admin should add content manually
            applyResult = { note: 'Knowledge gap flagged for manual content addition' }
            break
          }

          default:
            applyResult = { note: 'Applied without specific action' }
        }

        const { data: updated, error } = await supabase
          .from('signal_learning')
          .update({
            status: 'applied',
            reviewed_by: contact.id,
            reviewed_at: new Date().toISOString(),
            applied_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', suggestionId)
          .select()
          .single()

        if (error) throw error

        // Audit log
        await supabase
          .from('signal_widget_audit')
          .insert({
            project_id: suggestion.project_id,
            org_id: suggestion.org_id,
            action: 'learning_applied',
            action_data: {
              suggestion_id: suggestionId,
              suggestion_type: suggestion.suggestion_type,
              applied_by: contact.id,
              result: applyResult
            }
          })

        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ 
            suggestion: updated, 
            message: 'Suggestion applied',
            result: applyResult
          })
        }
      }

      // REJECT
      if (action === 'reject') {
        const { data: updated, error } = await supabase
          .from('signal_learning')
          .update({
            status: 'rejected',
            reviewed_by: contact.id,
            reviewed_at: new Date().toISOString(),
            rejection_reason: body.reason || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', suggestionId)
          .select()
          .single()

        if (error) throw error

        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ suggestion: updated, message: 'Suggestion rejected' })
        }
      }

      // DEFER - Push to later
      if (action === 'defer') {
        const { data: updated, error } = await supabase
          .from('signal_learning')
          .update({
            status: 'deferred',
            reviewed_by: contact.id,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', suggestionId)
          .select()
          .single()

        if (error) throw error

        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ suggestion: updated, message: 'Suggestion deferred' })
        }
      }

      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Invalid action. Use approve, apply, reject, or defer' })
      }
    }

    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('Signal learning error:', error)
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message })
    }
  }
}
