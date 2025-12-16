/**
 * Forms Create - Create a new form configuration
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*' } }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    // Auth check - admin only for global forms
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    const body = JSON.parse(event.body || '{}')
    const {
      slug,
      name,
      description,
      tenant_id,
      website_url,
      form_type = 'lead-capture',
      fields = [],
      success_message,
      redirect_url,
      notify_email,
      send_confirmation = true
    } = body

    // Validate required fields
    if (!slug || !name) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'slug and name are required' }) 
      }
    }

    // Only admins can create global forms
    if (!tenant_id && contact.role !== 'admin') {
      return { 
        statusCode: 403, 
        body: JSON.stringify({ error: 'Only admins can create global forms' }) 
      }
    }

    const supabase = createSupabaseAdmin()

    // Create the form
    const { data: form, error } = await supabase
      .from('forms')
      .insert({
        slug,
        name,
        description,
        tenant_id: tenant_id || null,
        website_url,
        form_type,
        fields,
        success_message,
        redirect_url,
        notify_email: notify_email || contact.email,
        send_confirmation,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating form:', error)
      if (error.code === '23505') {
        return { 
          statusCode: 409, 
          body: JSON.stringify({ error: 'A form with this slug already exists' }) 
        }
      }
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ form })
    }
  } catch (error) {
    console.error('Forms create error:', error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
