/**
 * Form Submissions Update - Update submission status and notes
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*' } }
  }

  if (event.httpMethod !== 'PUT' && event.httpMethod !== 'PATCH') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    // Auth check
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    const body = JSON.parse(event.body || '{}')
    const { id, status, notes, score } = body

    if (!id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Submission ID is required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Build update object
    const updates = {
      updated_at: new Date().toISOString()
    }

    if (status) {
      const validStatuses = ['new', 'contacted', 'qualified', 'converted', 'spam']
      if (!validStatuses.includes(status)) {
        return { 
          statusCode: 400, 
          body: JSON.stringify({ error: 'Invalid status. Must be: ' + validStatuses.join(', ') }) 
        }
      }
      updates.status = status
    }

    if (notes !== undefined) {
      updates.notes = notes
    }

    if (score !== undefined) {
      updates.score = score
    }

    // Mark as processed if status changes from 'new'
    const { data: existing } = await supabase
      .from('form_submissions')
      .select('status, processed_at')
      .eq('id', id)
      .single()

    if (existing?.status === 'new' && status && status !== 'new' && !existing.processed_at) {
      updates.processed_at = new Date().toISOString()
      updates.processed_by = contact.id
    }

    // Update submission
    const { data: submission, error } = await supabase
      .from('form_submissions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating submission:', error)
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission })
    }
  } catch (error) {
    console.error('Submission update error:', error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
