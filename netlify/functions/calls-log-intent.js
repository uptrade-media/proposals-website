/**
 * Log call intent before initiating a call
 * 
 * This creates a pending call_logs record with the user's intent/purpose
 * so when the OpenPhone webhook fires, we can match it up.
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  try {
    // Verify authentication
    const { contact: user, error: authError } = await getAuthenticatedUser(event)
    if (authError || !user) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    const { contactId, phoneNumber, purpose, notes } = JSON.parse(event.body || '{}')

    if (!contactId || !phoneNumber) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'contactId and phoneNumber are required' }) 
      }
    }

    const supabase = createSupabaseAdmin()

    // Normalize phone number to E.164 format
    const normalizedPhone = normalizePhoneNumber(phoneNumber)

    // Create a pending call log with intent
    const { data: callLog, error } = await supabase
      .from('call_logs')
      .insert({
        contact_id: contactId,
        phone_number: normalizedPhone,
        direction: 'outgoing',
        status: 'pending', // Will be updated when webhook fires
        call_intent: purpose || null,
        pre_call_notes: notes || null,
        initiated_by: user.id,
        initiated_at: new Date().toISOString(),
        processing_status: 'awaiting_call'
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to log call intent:', error)
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: 'Failed to log call intent' }) 
      }
    }

    // Also log activity on the contact
    await supabase
      .from('contact_activities')
      .insert({
        contact_id: contactId,
        activity_type: 'call_initiated',
        title: `Call initiated: ${purpose || 'General call'}`,
        description: notes || null,
        performed_by: user.id
      })
      .catch(err => console.error('Failed to log activity:', err))

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true,
        callLogId: callLog.id,
        message: 'Call intent logged. Proceed with call.'
      })
    }

  } catch (error) {
    console.error('Call intent error:', error)
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: error.message }) 
    }
  }
}

/**
 * Normalize phone number to E.164 format
 */
function normalizePhoneNumber(phone) {
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '')
  
  // If it starts with 1 and is 11 digits, it's likely US
  if (digits.length === 11 && digits.startsWith('1')) {
    return '+' + digits
  }
  
  // If it's 10 digits, assume US and add +1
  if (digits.length === 10) {
    return '+1' + digits
  }
  
  // Already has country code or is international
  if (!phone.startsWith('+')) {
    return '+' + digits
  }
  
  return phone
}
