// netlify/functions/billing-overdue.js
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

    // Build query for pending invoices
    let query = supabase
      .from('invoices')
      .select(`
        *,
        contact:contacts!contact_id(id, name, email, company),
        project:projects!project_id(id, title)
      `)
      .eq('status', 'pending')

    // Clients only see their own invoices
    if (contact.role !== 'admin') {
      query = query.eq('contact_id', contact.id)
    }

    const { data: allInvoices, error } = await query

    if (error) {
      throw error
    }

    // Filter for overdue and calculate days overdue
    const now = new Date()
    now.setHours(0, 0, 0, 0) // Start of today

    const overdueInvoices = (allInvoices || [])
      .filter(invoice => {
        const dueDate = invoice.due_date ? new Date(invoice.due_date) : null
        return dueDate && dueDate < now
      })
      .map(invoice => {
        const dueDate = new Date(invoice.due_date)
        const diffTime = now - dueDate
        const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        return {
          id: invoice.id,
          invoiceNumber: invoice.invoice_number,
          amount: invoice.amount ? parseFloat(invoice.amount) : 0,
          totalAmount: invoice.total_amount ? parseFloat(invoice.total_amount) : 0,
          status: invoice.status,
          daysOverdue: daysOverdue,
          dueDate: invoice.due_date,
          contactName: invoice.contact?.name,
          contactEmail: invoice.contact?.email,
          company: invoice.contact?.company,
          projectName: invoice.project?.name,
          createdAt: invoice.created_at
        }
      })
      // Sort by days overdue (most overdue first)
      .sort((a, b) => b.daysOverdue - a.daysOverdue)

    // Calculate summary
    const totalOverdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        overdueInvoices: overdueInvoices,
        summary: {
          count: overdueInvoices.length,
          totalAmount: totalOverdueAmount,
          oldestDaysOverdue: overdueInvoices.length > 0 ? overdueInvoices[0].daysOverdue : 0
        },
        generatedAt: new Date().toISOString()
      })
    }

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired session' })
      }
    }

    console.error('Error fetching overdue invoices:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch overdue invoices',
        message: error.message 
      })
    }
  }
}
