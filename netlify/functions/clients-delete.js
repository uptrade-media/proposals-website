// netlify/functions/clients-delete.js
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  // CORS headers
  const origin = event.headers.origin || 'http://localhost:8888'
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  }

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'DELETE') {
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

    // Extract ID from path or body
    const pathMatch = event.path?.match(/\/clients-delete\/([^/]+)/)
    const { id } = JSON.parse(event.body || '{}')
    const clientId = pathMatch?.[1] || id

    if (!clientId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing client ID' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Get client before deletion (for logging)
    const { data: client, error: clientError } = await supabase
      .from('contacts')
      .select('id, email, name, company')
      .eq('id', clientId)
      .eq('role', 'client')
      .single()

    if (clientError || !client) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Client not found' })
      }
    }

    // Soft delete: Set password and google_id to NULL, mark as archived via notes
    const { data: deleteResult, error: deleteError } = await supabase
      .from('contacts')
      .update({
        password: null,
        google_id: null,
        notes: `${client.notes || ''} [ARCHIVED: ${new Date().toISOString()}]`,
        updated_at: new Date().toISOString()
      })
      .eq('id', clientId)
      .eq('role', 'client')
      .select('id, email, name, company, updated_at')
      .single()

    if (deleteError || !deleteResult) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to archive client' })
      }
    }

    // Log activity
    try {
      await supabase
        .from('client_activity')
        .insert({
          contact_id: clientId,
          activity_type: 'client_archived',
          description: 'Client archived by admin',
          metadata: { email: client.email, name: client.name, by: 'admin', timestamp: new Date().toISOString() }
        })
    } catch (logError) {
      console.error('Failed to log delete activity:', logError)
      // Don't fail the request if logging fails
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Client ${client.email} has been archived`,
        client: deleteResult
      })
    }
  } catch (error) {
    console.error('Client delete error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to archive client',
        details: error.message
      })
    }
  }
}
