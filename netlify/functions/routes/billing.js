// netlify/functions/routes/billing.js
// ═══════════════════════════════════════════════════════════════════════════════
// Billing Routes - Invoices, payments
// ═══════════════════════════════════════════════════════════════════════════════

import { response } from '../api.js'

export async function handle(ctx) {
  const { method, segments, supabase, query, body, contact, orgId } = ctx
  const [, resource, id, action] = segments
  
  // Handle both /billing/* and /invoices/*
  const actualResource = resource === 'billing' ? segments[2] : resource
  const actualId = resource === 'billing' ? segments[3] : id
  const actualAction = resource === 'billing' ? segments[4] : action
  
  switch (actualResource || resource) {
    case 'invoices':
    case undefined:
      return await handleInvoices(ctx, actualId || id, actualAction || action)
    case 'summary':
      return await getBillingSummary(ctx)
    case 'overdue':
      return await getOverdueInvoices(ctx)
  }
  
  return response(404, { error: `Unknown billing resource: ${actualResource || resource}` })
}

async function handleInvoices(ctx, id, action) {
  const { method, supabase, query, body, contact, orgId } = ctx
  
  if (action) {
    switch (action) {
      case 'send':
        if (method === 'POST') return await sendInvoice(ctx, id)
        break
      case 'pay':
        if (method === 'POST') return await payInvoice(ctx, id)
        break
      case 'mark-paid':
        if (method === 'POST') return await markInvoicePaid(ctx, id)
        break
      case 'reminder':
        if (method === 'POST') return await sendReminder(ctx, id)
        break
    }
    return response(404, { error: `Unknown invoice action: ${action}` })
  }
  
  if (!id) {
    if (method === 'GET') {
      const { status, contactId, limit = 50 } = query
      
      let q = supabase
        .from('invoices')
        .select('*, contact:contacts(id, name, email, company)')
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (orgId) q = q.eq('org_id', orgId)
      if (status) q = q.eq('status', status)
      if (contactId) q = q.eq('contact_id', contactId)
      
      const { data, error } = await q
      
      if (error) return response(500, { error: error.message })
      return response(200, { invoices: data })
    }
    
    if (method === 'POST') {
      const { contactId, items, dueDate, notes } = body
      
      if (!contactId || !items || items.length === 0) {
        return response(400, { error: 'contactId and items are required' })
      }
      
      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
      const total = subtotal // Add tax logic if needed
      
      // Generate invoice number
      const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
      
      const invoiceNumber = `INV-${String((count || 0) + 1).padStart(5, '0')}`
      
      const { data, error } = await supabase
        .from('invoices')
        .insert({
          org_id: orgId,
          contact_id: contactId,
          invoice_number: invoiceNumber,
          items,
          subtotal,
          total,
          due_date: dueDate,
          notes,
          status: 'draft',
          created_by: contact.id
        })
        .select()
        .single()
      
      if (error) return response(500, { error: error.message })
      return response(201, { invoice: data })
    }
  } else {
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, contact:contacts(id, name, email, company, address)')
        .eq('id', id)
        .single()
      
      if (error) return response(error.code === 'PGRST116' ? 404 : 500, { error: error.message })
      return response(200, { invoice: data })
    }
    
    if (method === 'PUT' || method === 'PATCH') {
      const { data, error } = await supabase
        .from('invoices')
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      
      if (error) return response(500, { error: error.message })
      return response(200, { invoice: data })
    }
    
    if (method === 'DELETE') {
      const { error } = await supabase.from('invoices').delete().eq('id', id)
      if (error) return response(500, { error: error.message })
      return response(200, { success: true })
    }
  }
  
  return response(405, { error: 'Method not allowed' })
}

async function sendInvoice(ctx, id) {
  const { supabase } = ctx
  
  // Get invoice
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*, contact:contacts(id, name, email)')
    .eq('id', id)
    .single()
  
  if (error) return response(404, { error: 'Invoice not found' })
  
  // TODO: Send email via Resend
  // For now, just update status
  await supabase
    .from('invoices')
    .update({ 
      status: 'sent', 
      sent_at: new Date().toISOString() 
    })
    .eq('id', id)
  
  return response(200, { success: true, message: 'Invoice sent' })
}

async function payInvoice(ctx, id) {
  const { body, supabase } = ctx
  const { paymentMethod, paymentDetails } = body
  
  // TODO: Process payment via Square
  // For now, just update status
  await supabase
    .from('invoices')
    .update({ 
      status: 'paid', 
      paid_at: new Date().toISOString(),
      payment_method: paymentMethod 
    })
    .eq('id', id)
  
  return response(200, { success: true })
}

async function markInvoicePaid(ctx, id) {
  const { supabase, body } = ctx
  const { paidAt, paymentMethod = 'manual', notes } = body
  
  const { data, error } = await supabase
    .from('invoices')
    .update({ 
      status: 'paid', 
      paid_at: paidAt || new Date().toISOString(),
      payment_method: paymentMethod,
      payment_notes: notes,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) return response(500, { error: error.message })
  return response(200, { invoice: data })
}

async function sendReminder(ctx, id) {
  const { supabase } = ctx
  
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*, contact:contacts(id, name, email)')
    .eq('id', id)
    .single()
  
  if (error) return response(404, { error: 'Invoice not found' })
  
  // TODO: Send reminder email
  
  await supabase
    .from('invoices')
    .update({ 
      last_reminder_at: new Date().toISOString(),
      reminder_count: (invoice.reminder_count || 0) + 1
    })
    .eq('id', id)
  
  return response(200, { success: true })
}

async function getBillingSummary(ctx) {
  const { supabase, orgId, query } = ctx
  const { period = '30d' } = query
  
  // Calculate date range
  const days = parseInt(period) || 30
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  
  let q = supabase
    .from('invoices')
    .select('status, total')
  
  if (orgId) q = q.eq('org_id', orgId)
  
  const { data: invoices, error } = await q.gte('created_at', startDate)
  
  if (error) return response(500, { error: error.message })
  
  const summary = {
    total: invoices.reduce((sum, i) => sum + (i.total || 0), 0),
    paid: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total || 0), 0),
    pending: invoices.filter(i => ['sent', 'viewed'].includes(i.status)).reduce((sum, i) => sum + (i.total || 0), 0),
    overdue: invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + (i.total || 0), 0),
    count: {
      total: invoices.length,
      paid: invoices.filter(i => i.status === 'paid').length,
      pending: invoices.filter(i => ['sent', 'viewed'].includes(i.status)).length,
      overdue: invoices.filter(i => i.status === 'overdue').length
    }
  }
  
  return response(200, { summary })
}

async function getOverdueInvoices(ctx) {
  const { supabase, orgId } = ctx
  
  let q = supabase
    .from('invoices')
    .select('*, contact:contacts(id, name, email, company)')
    .eq('status', 'overdue')
    .order('due_date', { ascending: true })
  
  if (orgId) q = q.eq('org_id', orgId)
  
  const { data, error } = await q.limit(50)
  
  if (error) return response(500, { error: error.message })
  return response(200, { invoices: data })
}
