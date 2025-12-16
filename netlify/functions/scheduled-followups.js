// netlify/functions/scheduled-followups.js
// CRUD operations for scheduled follow-ups

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  // Verify authentication
  const { contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  // Only admins can manage follow-ups
  if (contact.role !== 'admin') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Admin access required' })
    }
  }

  const supabase = createSupabaseAdmin()

  try {
    // GET - List scheduled follow-ups for a contact
    if (event.httpMethod === 'GET') {
      const contactId = event.queryStringParameters?.contactId

      if (!contactId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'contactId is required' })
        }
      }

      const { data: followups, error } = await supabase
        .from('scheduled_followups')
        .select('*')
        .eq('contact_id', contactId)
        .order('scheduled_for', { ascending: true })

      if (error) throw error

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ followups })
      }
    }

    // DELETE - Cancel a scheduled follow-up
    if (event.httpMethod === 'DELETE') {
      const { id, cancelAll } = JSON.parse(event.body || '{}')

      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Follow-up id is required' })
        }
      }

      // If cancelAll is true, cancel this and all subsequent follow-ups
      if (cancelAll) {
        // First get the follow-up to find the original email and sequence
        const { data: followup, error: fetchError } = await supabase
          .from('scheduled_followups')
          .select('original_email_id, sequence_number')
          .eq('id', id)
          .single()

        if (fetchError) throw fetchError

        // Cancel all pending follow-ups from this sequence onwards
        const { error: updateError } = await supabase
          .from('scheduled_followups')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancelled_reason: 'manual'
          })
          .eq('original_email_id', followup.original_email_id)
          .gte('sequence_number', followup.sequence_number)
          .eq('status', 'pending')

        if (updateError) throw updateError

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: 'All subsequent follow-ups cancelled' 
          })
        }
      }

      // Cancel just this one follow-up
      const { error } = await supabase
        .from('scheduled_followups')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_reason: 'manual'
        })
        .eq('id', id)
        .eq('status', 'pending')

      if (error) throw error

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('[scheduled-followups] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
