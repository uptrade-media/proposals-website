/**
 * CRM Follow-up Update Function
 * 
 * Mark follow-ups as completed, reschedule, or cancel
 */

import { createSupabaseAdmin } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
    'Access-Control-Allow-Methods': 'PUT, PATCH, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'PUT' && event.httpMethod !== 'PATCH') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const supabase = createSupabaseAdmin()
    const body = JSON.parse(event.body || '{}')
    
    const {
      id,
      status,           // 'pending' | 'completed' | 'cancelled' | 'rescheduled'
      scheduledFor,     // New scheduled date/time
      actualMessage,    // What was actually sent/said
      completedBy       // User ID who completed it
    } = body

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Follow-up ID required' })
      }
    }

    // Build update object
    const updates = {
      updated_at: new Date().toISOString()
    }

    if (status !== undefined) {
      updates.status = status
      
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString()
        if (completedBy) updates.completed_by = completedBy
        if (actualMessage) updates.actual_message = actualMessage
      }
    }
    
    if (scheduledFor !== undefined) {
      updates.scheduled_for = scheduledFor
      // If rescheduling, mark as rescheduled
      if (status !== 'completed' && status !== 'cancelled') {
        updates.status = 'rescheduled'
      }
    }

    // Update follow-up
    // Use explicit FK relationship for contacts
    const { data: followUp, error } = await supabase
      .from('call_follow_ups')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        contact:contacts!call_follow_ups_contact_id_fkey(id, name, email, company, phone),
        call_log:call_logs(id, phone_number, direction)
      `)
      .single()

    if (error) {
      throw error
    }

    // If completed, log activity
    if (status === 'completed' && followUp.contact_id) {
      await supabase.from('activity_log').insert({
        contact_id: followUp.contact_id,
        activity_type: 'follow_up_completed',
        description: `Completed ${followUp.follow_up_type} follow-up`
      })
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ followUp })
    }

  } catch (error) {
    console.error('CRM follow-up update error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    }
  }
}
