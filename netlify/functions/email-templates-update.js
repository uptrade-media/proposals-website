// netlify/functions/email-templates-update.js
// Update an existing email template

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'PUT, POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'PUT' && event.httpMethod !== 'POST') {
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
      id,
      name,
      description,
      subject,
      preheader,
      grapesjs_data,
      html_content,
      text_content,
      category
    } = body

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Template ID is required' })
      }
    }

    // Build update object
    const updateData = {
      updated_at: new Date().toISOString()
    }

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (subject !== undefined) updateData.subject = subject
    if (preheader !== undefined) updateData.preheader = preheader
    if (grapesjs_data !== undefined) updateData.grapesjs_data = grapesjs_data
    if (html_content !== undefined) updateData.html_content = html_content
    if (text_content !== undefined) updateData.text_content = text_content
    if (category !== undefined) updateData.category = category

    const { data: template, error } = await supabase
      .from('email_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ template })
    }

  } catch (error) {
    console.error('[email-templates-update] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
