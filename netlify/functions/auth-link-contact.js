// netlify/functions/auth-link-contact.js
// Links a Supabase auth user to their contact record by email
// Called after magic link/invite authentication

import { createSupabaseAdmin } from './utils/supabase.js'

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

  try {
    const { email, authUserId, name } = JSON.parse(event.body || '{}')

    if (!email || !authUserId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'email and authUserId are required' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Find the contact by email
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, email, name, auth_user_id, account_setup')
      .eq('email', email.toLowerCase())
      .single()

    if (contactError || !contact) {
      // Contact doesn't exist - this might be a new user signing up directly
      console.log('[auth-link-contact] No contact found for:', email)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          linked: false, 
          message: 'No contact record found for this email'
        })
      }
    }

    // Check if already linked
    if (contact.auth_user_id === authUserId) {
      console.log('[auth-link-contact] Contact already linked:', email)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          linked: true, 
          message: 'Contact already linked'
        })
      }
    }

    // Link the contact to the auth user
    const updateData = {
      auth_user_id: authUserId,
      account_setup: 'true',
      updated_at: new Date().toISOString()
    }

    // Update name if provided and contact doesn't have one
    if (name && !contact.name) {
      updateData.name = name
    }

    const { error: updateError } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', contact.id)

    if (updateError) {
      console.error('[auth-link-contact] Update error:', updateError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to link contact' })
      }
    }

    console.log('[auth-link-contact] Successfully linked:', email, 'to auth user:', authUserId)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        linked: true,
        contactId: contact.id,
        message: 'Contact linked successfully'
      })
    }
  } catch (error) {
    console.error('[auth-link-contact] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to link contact' })
    }
  }
}
