/**
 * System Emails List API
 * 
 * Returns all custom system email templates for the current org.
 * System emails are transactional (audit, invoice, etc.) not marketing emails.
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
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

    const supabase = createSupabaseAdmin()
    const orgId = contact.org_id || '00000000-0000-0000-0000-000000000001'

    // Fetch custom templates for this org
    const { data: templates, error } = await supabase
      .from('system_email_templates')
      .select('*')
      .eq('org_id', orgId)
      .order('updated_at', { ascending: false })

    if (error) {
      // Table might not exist yet - return empty array
      if (error.code === '42P01') {
        return {
          statusCode: 200,
          body: JSON.stringify({ templates: [] })
        }
      }
      throw error
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ templates: templates || [] })
    }

  } catch (error) {
    console.error('[system-emails-list] Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch system email templates' })
    }
  }
}
