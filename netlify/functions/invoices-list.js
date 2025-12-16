// netlify/functions/invoices-list.js
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
    // Verify authentication with Supabase
    const { user, contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Not authenticated' })
      }
    }

    // Parse query parameters
    const queryParams = event.queryStringParameters || {}
    const { projectId, status, contactId } = queryParams

    const supabase = createSupabaseAdmin()

    // Build query - use simple select first, then join relations if they exist
    let query = supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply filters based on role
    if (contact.role !== 'admin') {
      // Clients can only see their own invoices
      query = query.eq('contact_id', contact.id)
    } else if (contactId) {
      // Admin filtering by specific contact
      query = query.eq('contact_id', contactId)
    }

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: invoices, error: queryError } = await query

    if (queryError) {
      console.error('[invoices-list] Database error:', queryError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to fetch invoices',
          details: queryError.message,
          code: queryError.code
        })
      }
    }

    // Fetch related contact and project data if we have invoices
    const contactIds = [...new Set((invoices || []).filter(i => i.contact_id).map(i => i.contact_id))]
    const projectIds = [...new Set((invoices || []).filter(i => i.project_id).map(i => i.project_id))]

    let contactsMap = {}
    let projectsMap = {}

    if (contactIds.length > 0) {
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, name, email, company')
        .in('id', contactIds)
      
      contacts?.forEach(c => { contactsMap[c.id] = c })
    }

    if (projectIds.length > 0) {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, title')
        .in('id', projectIds)
      
      projects?.forEach(p => { projectsMap[p.id] = p })
    }

    // Format response
    const formattedInvoices = (invoices || []).map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      amount: inv.amount,
      taxRate: inv.tax_rate,
      taxAmount: inv.tax_amount,
      totalAmount: inv.total_amount,
      description: inv.description,
      dueDate: inv.due_date,
      status: inv.status,
      paidAt: inv.paid_at,
      paymentMethod: inv.payment_method,
      squareInvoiceId: inv.square_invoice_id,
      squarePaymentId: inv.square_payment_id,
      contactId: inv.contact_id,
      projectId: inv.project_id,
      contact: contactsMap[inv.contact_id] || null,
      project: projectsMap[inv.project_id] || null,
      // Send tracking
      sentAt: inv.sent_at,
      sentToEmail: inv.sent_to_email,
      // Reminder tracking (admin only)
      reminderCount: inv.reminder_count || 0,
      lastReminderSent: inv.last_reminder_sent,
      nextReminderDate: inv.next_reminder_date,
      // View tracking (admin only)
      viewCount: inv.view_count || 0,
      firstViewedAt: inv.first_viewed_at,
      lastViewedAt: inv.last_viewed_at,
      // Token info (admin only - don't expose actual token)
      hasPaymentToken: !!inv.payment_token,
      paymentTokenExpires: inv.payment_token_expires,
      // Recurring invoice fields
      isRecurring: inv.is_recurring || false,
      recurringInterval: inv.recurring_interval,
      recurringDayOfMonth: inv.recurring_day_of_month,
      recurringDayOfWeek: inv.recurring_day_of_week,
      recurringEndDate: inv.recurring_end_date,
      recurringCount: inv.recurring_count,
      recurringPaused: inv.recurring_paused || false,
      nextRecurringDate: inv.next_recurring_date,
      lastRecurringGenerated: inv.last_recurring_generated,
      parentInvoiceId: inv.parent_invoice_id,
      createdAt: inv.created_at,
      updatedAt: inv.updated_at
    }))

    // Calculate summary stats
    const summary = {
      total: formattedInvoices.length,
      pending: formattedInvoices.filter(i => i.status === 'pending').length,
      paid: formattedInvoices.filter(i => i.status === 'paid').length,
      overdue: formattedInvoices.filter(i => 
        i.status === 'pending' && new Date(i.dueDate) < new Date()
      ).length,
      totalAmount: formattedInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0),
      paidAmount: formattedInvoices
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + (i.totalAmount || 0), 0),
      pendingAmount: formattedInvoices
        .filter(i => i.status === 'pending')
        .reduce((sum, i) => sum + (i.totalAmount || 0), 0)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        invoices: formattedInvoices,
        summary
      })
    }

  } catch (error) {
    console.error('[invoices-list] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
