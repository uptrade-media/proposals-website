/**
 * Tenant Sales Stats - Get aggregated sales metrics for a tenant
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

    const { tenant_id } = event.queryStringParameters || {}

    if (!tenant_id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'tenant_id is required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Calculate date ranges
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get tenant's forms
    const { data: forms } = await supabase
      .from('forms')
      .select('id')
      .eq('tenant_id', tenant_id)

    const formIds = forms?.map(f => f.id) || []

    // Get lead counts
    let totalLeads = 0
    let newLeads = 0
    let convertedLeads = 0

    if (formIds.length > 0) {
      const { count: total } = await supabase
        .from('form_submissions')
        .select('*', { count: 'exact', head: true })
        .in('form_id', formIds)
      
      const { count: newCount } = await supabase
        .from('form_submissions')
        .select('*', { count: 'exact', head: true })
        .in('form_id', formIds)
        .gte('created_at', weekAgo.toISOString())

      const { count: converted } = await supabase
        .from('form_submissions')
        .select('*', { count: 'exact', head: true })
        .in('form_id', formIds)
        .eq('status', 'converted')

      totalLeads = total || 0
      newLeads = newCount || 0
      convertedLeads = converted || 0
    }

    // Get customer counts
    const { count: totalCustomers } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_owner_id', tenant_id)

    const { count: activeCustomers } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_owner_id', tenant_id)
      .eq('status', 'active')

    // Get revenue from paid invoices
    const { data: paidInvoices } = await supabase
      .from('invoices')
      .select('amount, paid_at')
      .eq('tenant_id', tenant_id)
      .eq('status', 'paid')

    const totalRevenue = paidInvoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0
    const monthlyRevenue = paidInvoices
      ?.filter(inv => inv.paid_at && new Date(inv.paid_at) >= monthStart)
      ?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0

    // Calculate conversion rate
    const conversionRate = totalLeads > 0 
      ? Math.round((convertedLeads / totalLeads) * 100) 
      : 0

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        stats: {
          totalLeads,
          newLeads,
          convertedLeads,
          totalCustomers: totalCustomers || 0,
          activeCustomers: activeCustomers || 0,
          totalRevenue: totalRevenue / 100, // Convert cents to dollars
          monthlyRevenue: monthlyRevenue / 100,
          conversionRate
        }
      })
    }
  } catch (error) {
    console.error('Tenant stats error:', error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
