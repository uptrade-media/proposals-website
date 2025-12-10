// netlify/functions/clients-add-note.js
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

    const { clientId, note } = JSON.parse(event.body || '{}')

    if (!clientId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing client ID' })
      }
    }

    if (!note || note.trim().length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing or empty note' })
      }
    }

    // Truncate note if too long (max 5000 chars)
    const truncatedNote = note.substring(0, 5000)

    const supabase = createSupabaseAdmin()

    // Get current client
    const { data: client, error: clientError } = await supabase
      .from('contacts')
      .select('id, notes')
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

    const currentNotes = client.notes || ''

    // Format new note with timestamp
    const timestamp = new Date().toISOString()
    const newNote = currentNotes
      ? `${currentNotes}\n\n[${timestamp}] ${truncatedNote}`
      : `[${timestamp}] ${truncatedNote}`

    // Update client with new note
    const { data: updateResult, error: updateError } = await supabase
      .from('contacts')
      .update({ notes: newNote, updated_at: new Date().toISOString() })
      .eq('id', clientId)
      .eq('role', 'client')
      .select('id, email, name, company, notes, updated_at')
      .single()

    if (updateError || !updateResult) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to add note' })
      }
    }

    // Log activity
    try {
      await supabase
        .from('client_activity')
        .insert({
          contact_id: clientId,
          activity_type: 'note_added',
          description: 'Internal note added',
          metadata: { note: truncatedNote.substring(0, 200), by: 'admin' }
        })
    } catch (logError) {
      console.error('Failed to log note activity:', logError)
      // Don't fail the request if logging fails
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Note added successfully',
        client: updateResult
      })
    }
  } catch (error) {
    console.error('Add note error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to add note',
        details: error.message
      })
    }
  }
}
