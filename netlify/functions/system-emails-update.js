/**
 * System Emails Update API
 * 
 * Creates or updates a custom system email template.
 * This overrides the default template for that email type.
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    // Verify authentication
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    // Only admins can manage system emails
    if (contact.role !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Admin access required' }) }
    }

    const { emailId, subject, html } = JSON.parse(event.body || '{}')

    if (!emailId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email ID required' }) }
    }

    const supabase = createSupabaseAdmin()
    const orgId = contact.org_id || '00000000-0000-0000-0000-000000000001'

    // Check if template exists
    const { data: existing } = await supabase
      .from('system_email_templates')
      .select('id')
      .eq('org_id', orgId)
      .eq('email_id', emailId)
      .single()

    let result
    if (existing) {
      // Update existing template
      const { data, error } = await supabase
        .from('system_email_templates')
        .update({
          subject,
          html,
          updated_at: new Date().toISOString(),
          updated_by: contact.id
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Create new template
      const { data, error } = await supabase
        .from('system_email_templates')
        .insert({
          org_id: orgId,
          email_id: emailId,
          subject,
          html,
          created_by: contact.id,
          updated_by: contact.id
        })
        .select()
        .single()

      if (error) throw error
      result = data
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        template: result 
      })
    }

  } catch (error) {
    console.error('[system-emails-update] Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to save system email template' })
    }
  }
}
