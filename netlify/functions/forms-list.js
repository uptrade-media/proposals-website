/**
 * Forms List - Get all forms for a tenant or global
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    // Auth check
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    const supabase = createSupabaseAdmin()
    const { tenant_id, include_global } = event.queryStringParameters || {}
    
    // Check for org context from header (project tenant)
    const orgId = event.headers['x-organization-id']

    // Build query
    let query = supabase
      .from('forms')
      .select(`
        *,
        submission_count:form_submissions(count)
      `)
      .order('created_at', { ascending: false })

    // Priority: org header > query param > role-based filtering
    if (orgId) {
      // Project tenant context - show their forms
      query = query.eq('tenant_id', orgId)
      console.log('[Forms API] Filtering by tenant_id (org header):', orgId)
    } else if (tenant_id) {
      query = query.eq('tenant_id', tenant_id)
    } else if (include_global === 'true') {
      // Get global forms (tenant_id is null)
      query = query.is('tenant_id', null)
    } else if (contact.role === 'admin') {
      // Admins see all forms (Uptrade Media's global forms)
      query = query.is('tenant_id', null)
    } else {
      // Clients only see their tenant's forms
      query = query.eq('tenant_id', contact.id)
    }

    const { data: forms, error } = await query

    if (error) {
      console.error('Error fetching forms:', error)
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
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
      headers,
      body: JSON.stringify({ forms })
    }
  } catch (error) {
    console.error('Forms list error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
