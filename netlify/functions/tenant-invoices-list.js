/**
 * Tenant Invoices List - Get invoices created by a specific tenant
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

    const { tenant_id, status, page = '1', limit = '50' } = event.queryStringParameters || {}

    if (!tenant_id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'tenant_id is required' }) }
    }

    const supabase = createSupabaseAdmin()
    const pageNum = parseInt(page, 10)
    const limitNum = parseInt(limit, 10)
    const offset = (pageNum - 1) * limitNum

    // Get invoices created by this tenant for their customers
    let query = supabase
      .from('invoices')
      .select(`
        *,
        customer:contacts!invoices_customer_id_fkey(id, name, email, company)
      `, { count: 'exact' })
      .eq('tenant_id', tenant_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: invoices, error, count } = await query

    if (error) {
      console.error('Error fetching invoices:', error)
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }

    const totalPages = Math.ceil((count || 0) / limitNum)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        invoices,
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
    console.error('Tenant invoices error:', error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
