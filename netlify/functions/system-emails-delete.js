/**
 * System Emails Delete API
 * 
 * Deletes a custom system email template, reverting to the default.
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  if (event.httpMethod !== 'DELETE') {
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

    // Get email ID from path
    const emailId = event.path.split('/').pop()
    if (!emailId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email ID required' }) }
    }

    const supabase = createSupabaseAdmin()
    const orgId = contact.org_id || '00000000-0000-0000-0000-000000000001'

    // Delete the custom template
    const { error } = await supabase
      .from('system_email_templates')
      .delete()
      .eq('org_id', orgId)
      .eq('email_id', emailId)

    if (error) throw error

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: 'Template reset to default'
      })
    }

  } catch (error) {
    console.error('[system-emails-delete] Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to delete system email template' })
    }
  }
}
