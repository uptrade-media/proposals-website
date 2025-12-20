/**
 * CRM Emails List Function
 * 
 * Returns all tracked emails sent to a specific contact.
 * Used in the Emails tab of the prospect detail modal.
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Verify authentication
    const { contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Not authenticated' })
      }
    }

    // Only admins can view email tracking
    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      }
    }

    const contactId = event.queryStringParameters?.contactId

    if (!contactId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'contactId is required' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Fetch emails from email_tracking table
    const { data: emails, error } = await supabase
      .from('email_tracking')
      .select(`
        id,
        email_type,
        subject,
        recipient_email,
        sender_email,
        resend_email_id,
        sent_at,
        delivered_at,
        opened_at,
        open_count,
        last_opened_at,
        clicked_at,
        click_count,
        clicked_links,
        engagement_score,
        status,
        bounce_reason,
        audit_id,
        created_at
      `)
      .eq('contact_id', contactId)
      .order('sent_at', { ascending: false })

    if (error) {
      console.error('[crm-emails-list] Error:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch emails' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ emails: emails || [] })
    }

  } catch (error) {
    console.error('[crm-emails-list] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
