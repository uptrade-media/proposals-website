// netlify/functions/clients-update.js
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  // CORS headers
  const origin = event.headers.origin || 'http://localhost:8888'
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  }

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'PUT') {
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

    const { id, name, email, company, phone, subscribed, notes, source, tags } = JSON.parse(event.body || '{}')

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing client ID' })
      }
    }

    // Build update object with only provided fields
    const updates = {}
    
    if (name !== undefined) updates.name = name
    if (email !== undefined) updates.email = email
    if (company !== undefined) updates.company = company
    if (phone !== undefined) updates.phone = phone
    if (subscribed !== undefined) updates.subscribed = subscribed
    if (notes !== undefined) updates.notes = notes
    if (source !== undefined) updates.source = source
    if (tags !== undefined) updates.tags = tags

    if (Object.keys(updates).length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No fields to update' })
      }
    }

    updates.updated_at = new Date().toISOString()

    const supabase = createSupabaseAdmin()

    const { data: result, error: updateError } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .eq('role', 'client')
      .select('id, email, name, company, phone, role, subscribed, source, notes, tags, created_at, updated_at')
      .single()

    if (updateError || !result) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Client not found' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        client: result,
        message: 'Client updated successfully'
      })
    }
  } catch (error) {
    console.error('Clients update error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to update client',
        details: error.message
      })
    }
  }
}
