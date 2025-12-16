/**
 * Forms List - Get all forms for a tenant or global
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*' } }
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    // Auth check
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    const supabase = createSupabaseAdmin()
    const { tenant_id, include_global } = event.queryStringParameters || {}

    // Build query
    let query = supabase
      .from('forms')
      .select(`
        *,
        submission_count:form_submissions(count)
      `)
      .order('created_at', { ascending: false })

    // Filter by tenant or get global forms
    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id)
    } else if (include_global === 'true') {
      // Get global forms (tenant_id is null)
      query = query.is('tenant_id', null)
    } else if (contact.role === 'admin') {
      // Admins see all forms
    } else {
      // Clients only see their tenant's forms
      query = query.eq('tenant_id', contact.id)
    }

    const { data: forms, error } = await query

    if (error) {
      console.error('Error fetching forms:', error)
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }

    // Get submission counts for each form
    const formIds = forms.map(f => f.id)
    if (formIds.length > 0) {
      const { data: counts } = await supabase
        .from('form_submissions')
        .select('form_id, status')
        .in('form_id', formIds)

      // Aggregate counts
      const countMap = {}
      counts?.forEach(s => {
        if (!countMap[s.form_id]) {
          countMap[s.form_id] = { total: 0, new: 0 }
        }
        countMap[s.form_id].total++
        if (s.status === 'new') countMap[s.form_id].new++
      })

      // Attach counts to forms
      forms.forEach(f => {
        f.submission_count = countMap[f.id]?.total || 0
        f.new_count = countMap[f.id]?.new || 0
      })
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ forms })
    }
  } catch (error) {
    console.error('Forms list error:', error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
