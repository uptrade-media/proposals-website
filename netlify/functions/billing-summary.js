// netlify/functions/billing-summary.js
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

  // Verify authentication using Supabase
  const { user, contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  try {
    const supabase = createSupabaseAdmin()

    // Build query based on role
    let query = supabase
      .from('invoices')
      .select(`
        *,
        contact:contacts!contact_id(id, name, email, company),
        project:projects!project_id(id, name)
      `)

    if (contact.role !== 'admin') {
      // Clients only see their own invoices
      query = query.eq('contact_id', contact.id)
    }

    const { data: allInvoices, error } = await query

    if (error) {
      throw error
    }

    // Calculate summary statistics
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    let totalRevenue = 0
    let thisMonthRevenue = 0
    let pendingAmount = 0
    let overdueCount = 0
    let recentInvoices = []

    ;(allInvoices || []).forEach(invoice => {
      const total = parseFloat(invoice.total_amount) || 0

      // Total revenue (all paid invoices)
      if (invoice.status === 'paid') {
        totalRevenue += total

        // This month's revenue
        const paidDate = invoice.paid_at ? new Date(invoice.paid_at) : null
        if (paidDate && paidDate >= thisMonthStart) {
          thisMonthRevenue += total
        }
      }

      // Pending amount (pending + overdue invoices)
      if (invoice.status === 'pending' || invoice.status === 'overdue') {
        pendingAmount += total

        // Count overdue
        if (invoice.status === 'pending') {
          const dueDate = invoice.due_date ? new Date(invoice.due_date) : null
          if (dueDate && dueDate < now) {
            overdueCount += 1
          }
        }
      }
    })

    // Get recent invoices (5 most recent)
    const sortedInvoices = (allInvoices || []).sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
      return dateB - dateA
    }).slice(0, 5)

    recentInvoices = sortedInvoices.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      amount: inv.amount ? parseFloat(inv.amount) : 0,
      totalAmount: inv.total_amount ? parseFloat(inv.total_amount) : 0,
      status: inv.status,
      contactName: inv.contact?.name,
      projectName: inv.project?.name,
      dueDate: inv.due_date,
      createdAt: inv.created_at
    }))

    // Get payment method breakdown (paid invoices)
    const paidInvoices = (allInvoices || []).filter(inv => inv.status === 'paid')
    const squarePayments = paidInvoices.filter(inv => inv.square_payment_id).length
    const otherPayments = paidInvoices.length - squarePayments

    const summary = {
      totalRevenue: totalRevenue,
      thisMonthRevenue: thisMonthRevenue,
      pendingAmount: pendingAmount,
      overdueCount: overdueCount,
      invoiceCount: (allInvoices || []).length,
      paidCount: (allInvoices || []).filter(inv => inv.status === 'paid').length,
      pendingCount: (allInvoices || []).filter(inv => inv.status === 'pending').length,
      overdueAmount: (allInvoices || [])
        .filter(inv => inv.status === 'pending' && inv.due_date && new Date(inv.due_date) < now)
        .reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0),
      paymentMethods: {
        square: squarePayments,
        other: otherPayments,
        total: paidInvoices.length
      },
      recentInvoices: recentInvoices,
      generatedAt: new Date().toISOString()
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ summary })
    }

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired session' })
      }
    }

    console.error('Error fetching billing summary:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch billing summary',
        message: error.message 
      })
    }
  }
}
