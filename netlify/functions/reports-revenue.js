// netlify/functions/reports-revenue.js
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  // CORS headers
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
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Verify authentication via Supabase
    const { user, contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Not authenticated' })
      }
    }

    // Only admins can access revenue reports
    if (contact?.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Parse query parameters
    const params = new URLSearchParams(event.queryStringParameters || {})
    const period = params.get('period') || 'year' // 'month', 'quarter', 'year', 'all'
    const groupBy = params.get('groupBy') || 'month' // 'day', 'week', 'month', 'year'

    // Calculate date range
    let dateStart = null
    const now = new Date()
    
    switch (period) {
      case 'month':
        dateStart = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'quarter':
        dateStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        break
      case 'year':
        dateStart = new Date(now.getFullYear(), 0, 1)
        break
      case 'all':
        dateStart = null
        break
    }

    // Revenue summary - use Supabase query
    let summaryQuery = supabase
      .from('invoices')
      .select('total_amount, tax_amount')
      .eq('status', 'paid')
    
    if (dateStart) {
      summaryQuery = summaryQuery.gte('paid_at', dateStart.toISOString())
    }
    
    const { data: paidInvoices, error: summaryError } = await summaryQuery
    
    if (summaryError) {
      console.error('Summary query error:', summaryError)
      throw new Error('Failed to fetch invoice summary')
    }
    
    // Calculate summary from results
    const summary = {
      invoiceCount: paidInvoices?.length || 0,
      totalRevenue: paidInvoices?.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0) || 0,
      avgInvoiceAmount: paidInvoices?.length > 0 
        ? paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0) / paidInvoices.length 
        : 0,
      minInvoiceAmount: paidInvoices?.length > 0 
        ? Math.min(...paidInvoices.map(inv => parseFloat(inv.total_amount || 0)))
        : 0,
      maxInvoiceAmount: paidInvoices?.length > 0 
        ? Math.max(...paidInvoices.map(inv => parseFloat(inv.total_amount || 0)))
        : 0,
      totalTax: paidInvoices?.reduce((sum, inv) => sum + parseFloat(inv.tax_amount || 0), 0) || 0
    }

    // Revenue trend over time - fetch invoices with paid_at
    let trendQuery = supabase
      .from('invoices')
      .select('paid_at, total_amount')
      .eq('status', 'paid')
      .not('paid_at', 'is', null)
      .order('paid_at', { ascending: true })
    
    if (dateStart) {
      trendQuery = trendQuery.gte('paid_at', dateStart.toISOString())
    }
    
    const { data: trendInvoices, error: trendError } = await trendQuery
    
    // Group by period
    const trendMap = new Map()
    if (trendInvoices) {
      for (const inv of trendInvoices) {
        const date = new Date(inv.paid_at)
        let periodKey
        
        switch (groupBy) {
          case 'day':
            periodKey = date.toISOString().split('T')[0]
            break
          case 'week':
            const weekStart = new Date(date)
            weekStart.setDate(date.getDate() - date.getDay())
            periodKey = weekStart.toISOString().split('T')[0]
            break
          case 'year':
            periodKey = `${date.getFullYear()}-01-01`
            break
          default: // month
            periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
        }
        
        if (!trendMap.has(periodKey)) {
          trendMap.set(periodKey, { invoiceCount: 0, revenue: 0 })
        }
        const entry = trendMap.get(periodKey)
        entry.invoiceCount++
        entry.revenue += parseFloat(inv.total_amount || 0)
      }
    }
    
    const trend = Array.from(trendMap.entries()).map(([period, data]) => ({
      period,
      invoiceCount: data.invoiceCount,
      revenue: data.revenue
    }))

    // Revenue by project - fetch projects with their invoices
    let projectQuery = supabase
      .from('invoices')
      .select('project_id, total_amount, projects!inner(id, name)')
      .eq('status', 'paid')
    
    if (dateStart) {
      projectQuery = projectQuery.gte('paid_at', dateStart.toISOString())
    }
    
    const { data: projectInvoices, error: projectError } = await projectQuery
    
    // Group by project
    const projectMap = new Map()
    if (projectInvoices) {
      for (const inv of projectInvoices) {
        if (!inv.projects) continue
        const key = inv.projects.id
        if (!projectMap.has(key)) {
          projectMap.set(key, { 
            projectId: inv.projects.id, 
            projectName: inv.projects.name, 
            invoiceCount: 0, 
            totalRevenue: 0 
          })
        }
        const entry = projectMap.get(key)
        entry.invoiceCount++
        entry.totalRevenue += parseFloat(inv.total_amount || 0)
      }
    }
    
    const revenueByProject = Array.from(projectMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10)

    // Revenue by client
    let clientQuery = supabase
      .from('invoices')
      .select('contact_id, total_amount, contacts!inner(id, name, company)')
      .eq('status', 'paid')
    
    if (dateStart) {
      clientQuery = clientQuery.gte('paid_at', dateStart.toISOString())
    }
    
    const { data: clientInvoices, error: clientError } = await clientQuery
    
    // Group by client
    const clientMap = new Map()
    if (clientInvoices) {
      for (const inv of clientInvoices) {
        if (!inv.contacts) continue
        const key = inv.contacts.id
        if (!clientMap.has(key)) {
          clientMap.set(key, { 
            contactId: inv.contacts.id, 
            contactName: inv.contacts.name, 
            company: inv.contacts.company,
            invoiceCount: 0, 
            totalRevenue: 0 
          })
        }
        const entry = clientMap.get(key)
        entry.invoiceCount++
        entry.totalRevenue += parseFloat(inv.total_amount || 0)
      }
    }
    
    const revenueByClient = Array.from(clientMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10)

    // Outstanding invoices (pending/overdue)
    const { data: pendingInvoices, error: pendingError } = await supabase
      .from('invoices')
      .select('total_amount, due_date')
      .eq('status', 'pending')
    
    const nowDate = new Date()
    const outstanding = {
      pendingCount: pendingInvoices?.length || 0,
      pendingTotal: pendingInvoices?.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0) || 0,
      overdueCount: pendingInvoices?.filter(inv => inv.due_date && new Date(inv.due_date) < nowDate).length || 0,
      overdueTotal: pendingInvoices
        ?.filter(inv => inv.due_date && new Date(inv.due_date) < nowDate)
        .reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0) || 0
    }

    // Payment method breakdown
    let paymentQuery = supabase
      .from('invoices')
      .select('square_payment_id, total_amount')
      .eq('status', 'paid')
    
    if (dateStart) {
      paymentQuery = paymentQuery.gte('paid_at', dateStart.toISOString())
    }
    
    const { data: paymentInvoices, error: paymentError } = await paymentQuery
    
    const squarePayments = paymentInvoices?.filter(inv => inv.square_payment_id) || []
    const otherPayments = paymentInvoices?.filter(inv => !inv.square_payment_id) || []
    
    const paymentMethods = []
    if (squarePayments.length > 0) {
      paymentMethods.push({
        method: 'Square',
        count: squarePayments.length,
        total: squarePayments.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0)
      })
    }
    if (otherPayments.length > 0) {
      paymentMethods.push({
        method: 'Other',
        count: otherPayments.length,
        total: otherPayments.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0)
      })
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        summary,
        trend,
        revenueByProject,
        revenueByClient,
        outstanding,
        paymentMethods,
        period,
        groupBy,
        generatedAt: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Error fetching revenue report:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch revenue report',
        message: error.message 
      })
    }
  }
}
