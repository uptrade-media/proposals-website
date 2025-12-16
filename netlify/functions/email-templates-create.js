// netlify/functions/email-templates-create.js
// Create a new email template

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

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
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const { contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  if (contact.role !== 'admin') {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin access required' }) }
  }

  const supabase = createSupabaseAdmin()

  try {
    const body = JSON.parse(event.body || '{}')
    const {
      name,
      description,
      subject,
      preheader,
      grapesjs_data,
      html_content,
      text_content,
      category = 'general',
      orgId
    } = body

    if (!name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Template name is required' })
      }
    }

    const targetOrgId = orgId || contact.org_id || '00000000-0000-0000-0000-000000000001'

    const { data: template, error } = await supabase
      .from('email_templates')
      .insert({
        org_id: targetOrgId,
        name,
        description,
        subject,
        preheader,
        grapesjs_data,
        html_content,
        text_content,
        category,
        created_by: contact.id,
        is_active: true,
        is_system: false
      })
      .select()
      .single()

    if (error) throw error

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ template })
    }

  } catch (error) {
    console.error('[email-templates-create] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
