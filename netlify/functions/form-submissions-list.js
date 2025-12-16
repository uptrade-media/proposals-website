/**
 * Form Submissions List - Get submissions for a form with filtering
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

    const { 
      form_id,
      tenant_id, 
      status, 
      search,
      page = '1', 
      limit = '50',
      sort_by = 'created_at',
      sort_order = 'desc'
    } = event.queryStringParameters || {}

    const supabase = createSupabaseAdmin()
    const pageNum = parseInt(page, 10)
    const limitNum = parseInt(limit, 10)
    const offset = (pageNum - 1) * limitNum

    // Build query
    let query = supabase
      .from('form_submissions')
      .select(`
        *,
        form:forms(id, name, slug, form_type, tenant_id),
        contact:contacts(id, name, email, company)
      `, { count: 'exact' })

    // Filter by tenant (for "My Sales" view)
    if (tenant_id) {
      // Get submissions from forms belonging to this tenant
      query = query.eq('form.tenant_id', tenant_id)
    }

    // Filter by form
    if (form_id) {
      query = query.eq('form_id', form_id)
    }

    // Filter by status
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // Search by email, name, or company
    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%,company.ilike.%${search}%`)
    }

    // Sorting
    const ascending = sort_order === 'asc'
    query = query.order(sort_by, { ascending })

    // Pagination
    query = query.range(offset, offset + limitNum - 1)

    const { data: submissions, error, count } = await query

    if (error) {
      console.error('Error fetching submissions:', error)
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }

    // Calculate pagination info
    const totalPages = Math.ceil((count || 0) / limitNum)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        submissions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count,
          totalPages,
          hasMore: pageNum < totalPages
        }
      })
    }
  } catch (error) {
    console.error('Submissions list error:', error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
