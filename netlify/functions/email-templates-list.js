// netlify/functions/email-templates-list.js
// List email templates for the current org

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
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
    const orgId = event.queryStringParameters?.orgId || contact.org_id || '00000000-0000-0000-0000-000000000001'
    const category = event.queryStringParameters?.category

    let query = supabase
      .from('email_templates')
      .select('id, name, description, subject, preheader, category, is_system, is_active, times_used, last_used_at, thumbnail_url, created_at, updated_at')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })

    if (category) {
      query = query.eq('category', category)
    }

    const { data: templates, error } = await query

    if (error) throw error

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ templates: templates || [] })
    }

  } catch (error) {
    console.error('[email-templates-list] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
