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
      .select(`
        id,
        invoice_number,
        amount,
        tax_amount,
        total_amount,
        description,
        due_date,
        status,
        paid_at,
        view_count,
        payment_token_expires,
        contact:contacts(id, name, email, company),
        project:projects(id, title)
      `)
      .eq('payment_token', token)
      .single()

    if (invoiceError || !invoice) {
      console.error('[invoices-get-public] Invoice not found for token')
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Invoice not found or link has expired' }) }
    }

    // Check if token is expired
    if (invoice.payment_token_expires && new Date(invoice.payment_token_expires) < new Date()) {
      return { statusCode: 410, headers, body: JSON.stringify({ error: 'Payment link has expired. Please contact us for a new invoice.' }) }
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
      dueDate: invoice.due_date,
      status: invoice.status,
      paidAt: invoice.paid_at,
      contact: invoice.contact ? {
        name: invoice.contact.name,
        company: invoice.contact.company
      } : null,
      project: invoice.project ? {
        title: invoice.project.title
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
