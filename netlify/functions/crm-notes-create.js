// netlify/functions/crm-notes-create.js
// Create notes for prospects/contacts in the CRM
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from './utils/supabase.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Verify authentication using Supabase
  const { user, contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  try {
    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      }
    }

    const body = JSON.parse(event.body || '{}')
    const { contactId, content, noteType = 'general', isPinned = false } = body

    if (!contactId || !content?.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'contactId and content are required' })
      }
    }

    // Create note in activity_log table with type 'note'
    const { data: note, error } = await supabase
      .from('activity_log')
      .insert({
        contact_id: contactId,
        activity_type: 'note',
        description: content.trim(),
        metadata: {
          note_type: noteType, // 'general', 'call_follow_up', 'meeting', 'email'
          is_pinned: isPinned,
          created_by: payload.userId,
          created_by_email: payload.email
        }
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create note:', error)
      throw error
    }

    // Also update the contact's last_contact_at
    await supabase
      .from('contacts')
      .update({ last_contact_at: new Date().toISOString() })
      .eq('id', contactId)

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        note,
        message: 'Note added successfully'
      })
    }

  } catch (error) {
    console.error('Error creating note:', error)
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired session' })
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to create note' })
    }
  }
}
