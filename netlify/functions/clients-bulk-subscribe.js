// netlify/functions/clients-bulk-subscribe.js
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  // CORS headers
  const origin = event.headers.origin || 'http://localhost:8888'
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  }

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
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

    const { clientIds, subscribed } = JSON.parse(event.body || '{}')

    if (!Array.isArray(clientIds) || clientIds.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing or empty clientIds array' })
      }
    }

    if (subscribed === undefined || subscribed === null) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing subscribed status' })
      }
    }

    // Validate array length (prevent abuse)
    if (clientIds.length > 1000) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Maximum 1000 clients per request' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Update subscription status for multiple clients
    const { data: updateResult, error: updateError } = await supabase
      .from('contacts')
      .update({ subscribed: subscribed, updated_at: new Date().toISOString() })
      .in('id', clientIds)
      .eq('role', 'client')
      .select('id, email, name, subscribed')

    if (updateError) {
      throw updateError
    }

    const updated = (updateResult || []).length

    // Log activity for each update (batch operation)
    try {
      const description = `Bulk subscription update to ${subscribed ? 'subscribed' : 'unsubscribed'} (${clientIds.length} clients)`
      await supabase
        .from('client_activity')
        .insert({
          contact_id: clientIds[0],
          activity_type: 'bulk_subscription_update',
          description: description,
          metadata: { count: clientIds.length, new_status: subscribed, by: 'admin' }
        })
    } catch (logError) {
      console.error('Failed to log bulk activity:', logError)
      // Don't fail the request if logging fails
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Updated ${updated} client(s) successfully`,
        requested: clientIds.length,
        updated,
        status: subscribed ? 'subscribed' : 'unsubscribed',
        clients: updateResult || []
      })
    }
  } catch (error) {
    console.error('Bulk subscription error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to update subscriptions',
        details: error.message
      })
    }
  }
}
