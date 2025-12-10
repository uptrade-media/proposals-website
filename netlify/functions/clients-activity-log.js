// netlify/functions/clients-activity-log.js
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  // CORS headers
  const origin = event.headers.origin || 'http://localhost:8888'
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  }

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  // Verify authentication using Supabase
  const { user, contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    }
  }

  // Verify admin role
  if (contact.role !== 'admin') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Admin access required' })
    }
  }

  try {
    const supabase = createSupabaseAdmin()

    // GET: Fetch activity log
    if (event.httpMethod === 'GET') {
      const clientId = event.queryStringParameters?.clientId
      const limit = Math.min(parseInt(event.queryStringParameters?.limit || 50), 500)
      const offset = parseInt(event.queryStringParameters?.offset || 0)

      if (!clientId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing clientId' })
        }
      }

      // Verify client exists
      const { data: clientExists, error: clientError } = await supabase
        .from('contacts')
        .select('id')
        .eq('id', clientId)
        .eq('role', 'client')
        .single()

      if (clientError || !clientExists) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Client not found' })
        }
      }

      // Fetch activity log
      const { data: activity, error: activityError } = await supabase
        .from('client_activity')
        .select('id, contact_id, activity_type, description, metadata, created_at')
        .eq('contact_id', clientId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (activityError) {
        throw activityError
      }

      // Get total count
      const { count: total, error: countError } = await supabase
        .from('client_activity')
        .select('*', { count: 'exact', head: true })
        .eq('contact_id', clientId)

      if (countError) {
        throw countError
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          activity: activity || [],
          total: total || 0,
          count: (activity || []).length,
          limit,
          offset
        })
      }
    }

    // POST: Create activity log entry
    if (event.httpMethod === 'POST') {
      const { clientId, activityType, description, metadata } = JSON.parse(event.body || '{}')

      if (!clientId || !activityType || !description) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing required fields: clientId, activityType, description' })
        }
      }

      // Verify client exists
      const { data: clientExists, error: clientError } = await supabase
        .from('contacts')
        .select('id')
        .eq('id', clientId)
        .eq('role', 'client')
        .single()

      if (clientError || !clientExists) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Client not found' })
        }
      }

      // Validate activity type
      const validTypes = [
        'client_created',
        'client_updated',
        'client_archived',
        'subscription_toggled',
        'bulk_subscription_update',
        'note_added',
        'proposal_sent',
        'proposal_accepted',
        'invoice_created',
        'payment_received',
        'email_sent',
        'call_made',
        'meeting_scheduled',
        'document_sent',
        'custom_event'
      ]

      if (!validTypes.includes(activityType)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: `Invalid activityType. Allowed: ${validTypes.join(', ')}` 
          })
        }
      }

      // Create activity record
      const { data: result, error: insertError } = await supabase
        .from('client_activity')
        .insert({
          contact_id: clientId,
          activity_type: activityType,
          description: description,
          metadata: metadata || null
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Activity logged successfully',
          activity: result
        })
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Activity log error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to process activity log',
        details: error.message
      })
    }
  }
}
