/**
 * Tenant Customers List - Get customers for a specific tenant
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

    const { tenant_id, search, status } = event.queryStringParameters || {}

    if (!tenant_id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'tenant_id is required' }) }
    }

    // Verify user has access to this tenant
    const isSuperAdmin = contact.role === 'admin'
    const isOrgMember = contact.id === tenant_id // Simple check for now
    
    if (!isSuperAdmin && !isOrgMember) {
      // TODO: Check organization membership table for proper access control
    }

    const supabase = createSupabaseAdmin()

    // Get customers that belong to this tenant
    // These are contacts where the tenant is tracking them as their customers
    let query = supabase
      .from('contacts')
      .select('id, name, email, phone, company, status, created_at')
      .eq('tenant_owner_id', tenant_id)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`)
    }

    const { data: customers, error } = await query

    if (error) {
      console.error('Error fetching customers:', error)
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }

    // Get total spent for each customer from invoices
    const customerIds = customers.map(c => c.id)
    if (customerIds.length > 0) {
      const { data: invoiceTotals } = await supabase
        .from('invoices')
        .select('customer_id, amount')
        .in('customer_id', customerIds)
        .eq('status', 'paid')

      const spentMap = {}
      invoiceTotals?.forEach(inv => {
        spentMap[inv.customer_id] = (spentMap[inv.customer_id] || 0) + inv.amount
      })

      customers.forEach(c => {
        c.total_spent = (spentMap[c.id] || 0) / 100 // Convert cents to dollars
      })
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customers })
    }
  } catch (error) {
    console.error('Tenant customers error:', error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
