// netlify/functions/clients-subscribe-toggle.js
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

    const { id, subscribed } = JSON.parse(event.body || '{}')

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing client ID' })
      }
    }

    if (subscribed === undefined || subscribed === null) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing subscribed status' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Update subscription status
    const { data: result, error: updateError } = await supabase
      .from('contacts')
      .update({ subscribed: subscribed, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('role', 'client')
      .select('id, email, name, company, subscribed, updated_at')
      .single()

    if (updateError || !result) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Client not found' })
      }
    }

    // Log activity
    try {
      const description = `Subscription status changed to ${subscribed ? 'subscribed' : 'unsubscribed'}`
      await supabase
        .from('client_activity')
        .insert({
          contact_id: id,
          activity_type: 'subscription_toggled',
          description: description,
          metadata: { previous: !subscribed, new: subscribed, by: 'admin' }
        })
    } catch (logError) {
      console.error('Failed to log activity:', logError)
      // Don't fail the request if logging fails
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        client: result,
        message: `Client ${subscribed ? 'subscribed' : 'unsubscribed'} successfully`
      })
    }
  } catch (error) {
    console.error('Subscription toggle error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to toggle subscription',
        details: error.message
      })
    }
  }
}
