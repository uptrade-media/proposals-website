// netlify/functions/invoices-get-public.js
// Get invoice by payment token (no auth required) - for public payment page
import { createSupabaseAdmin } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { token } = event.queryStringParameters || {}

    if (!token) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Payment token is required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Fetch invoice by payment token
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('payment_token', token)
      .single()

    if (invoiceError || !invoice) {
      console.error('[invoices-get-public] Invoice not found for token:', invoiceError?.message)
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Invoice not found or link has expired' }) }
    }

    // Check if token is expired
    if (invoice.payment_token_expires && new Date(invoice.payment_token_expires) < new Date()) {
      return { statusCode: 410, headers, body: JSON.stringify({ error: 'Payment link has expired. Please contact us for a new invoice.' }) }
    }

    // Fetch related data separately
    let contactData = null
    let projectData = null

    if (invoice.contact_id) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('id, name, email, company')
        .eq('id', invoice.contact_id)
        .single()
      contactData = contact
    }

    if (invoice.project_id) {
      const { data: project } = await supabase
        .from('projects')
        .select('id, title')
        .eq('id', invoice.project_id)
        .single()
      projectData = project
    }

    // Track view
    const now = new Date().toISOString()
    const updateData = {
      view_count: (invoice.view_count || 0) + 1,
      last_viewed_at: now,
      updated_at: now
    }
    
    // Set first viewed if not set
    if (!invoice.first_viewed_at) {
      updateData.first_viewed_at = now
    }

    await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoice.id)

    // Format response (camelCase)
    const formattedInvoice = {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      amount: parseFloat(invoice.amount) || 0,
      taxAmount: parseFloat(invoice.tax_amount) || 0,
      totalAmount: parseFloat(invoice.total_amount) || 0,
      description: invoice.description,
      dueDate: invoice.due_at || invoice.due_date, // Support both column names
      status: invoice.status,
      paidAt: invoice.paid_at,
      sentToEmail: invoice.sent_to_email,
      contact: contactData ? {
        name: contactData.name,
        company: contactData.company
      } : null,
      project: projectData ? {
        title: projectData.title
      } : null
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ invoice: formattedInvoice })
    }

  } catch (error) {
    console.error('[invoices-get-public] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch invoice' })
    }
  }
}
