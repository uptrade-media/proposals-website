// netlify/functions/invoices-list.js
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
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
    
    // Organization-level filtering (invoices are billed to the organization)
    // X-Organization-Id is the business entity (GWA LLC)
    const orgId = event.headers['x-organization-id']

    const supabase = createSupabaseAdmin()

    // Check if user has org-level access for billing
    // Project-level users cannot access billing
    if (orgId && contact.role !== 'admin') {
      const { data: hasOrgAccess } = await supabase.rpc('user_has_org_access', {
        user_id: contact.id,
        org_id: orgId
      })
      
      if (!hasOrgAccess) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ 
            error: 'ACCESS_DENIED',
            message: 'Billing access requires organization-level permissions' 
          })
        }
      }
    }

    // Build query - use simple select first, then join relations if they exist
    let query = supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply filters based on context
    if (orgId) {
      // Organization context: show all invoices for this org
      // Match by org_id, project_id (projects in org), or contact who is an org member
      // First get the org's projects and contacts
      const { data: orgProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('organization_id', orgId)
      
      const { data: orgMembers } = await supabase
        .from('organization_members')
        .select('contact_id')
        .eq('organization_id', orgId)
      
      const projectIds = (orgProjects || []).map(p => p.id)
      const contactIds = (orgMembers || []).map(m => m.contact_id)
      
      // Build OR filter for all possible matches
      let orFilters = [`org_id.eq.${orgId}`]
      if (projectIds.length > 0) {
        orFilters.push(`project_id.in.(${projectIds.join(',')})`)
      }
      if (contactIds.length > 0) {
        orFilters.push(`contact_id.in.(${contactIds.join(',')})`)
      }
      
      query = query.or(orFilters.join(','))
      console.log('[invoices-list] Organization context, filtering with:', orFilters.join(' OR '))
    } else if (contact.role !== 'admin') {
      // Clients can only see their own invoices
      query = query.eq('contact_id', contact.id)
    } else if (contactId) {
      // Admin filtering by specific contact
      query = query.eq('contact_id', contactId)
    }

    if (projectId && !orgId) {
      // Only apply projectId filter if not already in tenant context
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

    // Check if user is admin (for exposing payment token)
    const isAdmin = contact.role === 'admin'

    // Format response
    const formattedInvoices = (invoices || []).map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      amount: inv.amount,
      taxRate: inv.tax_rate,
      taxAmount: inv.tax_amount,
      totalAmount: inv.total_amount,
      description: inv.description,
      dueDate: inv.due_at || inv.due_date, // Support both column names
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
      // Token info - expose actual token to admins for View button
      hasPaymentToken: !!inv.payment_token,
      paymentToken: isAdmin ? inv.payment_token : undefined,
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
