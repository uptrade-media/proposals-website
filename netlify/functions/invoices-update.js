// netlify/functions/invoices-update.js
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'PUT') {
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

    // Only admins can update invoices
    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Not authorized - admin only' })
      }
    }

    // Parse request
    const { invoiceId, amount, taxRate, description, dueDate, status } = JSON.parse(event.body || '{}')

    // Validate required fields
    if (!invoiceId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'invoiceId is required' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Fetch current invoice
    const { data: currentInvoice, error: fetchError } = await supabase
      .from('invoices')
      .select(`
        *,
        contact:contacts(id, name, email, company),
        project:projects(id, title)
      `)
      .eq('id', invoiceId)
      .single()

    if (fetchError || !currentInvoice) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Invoice not found' })
      }
    }

    // Prevent updating paid invoices (unless just changing status back)
    if (currentInvoice.status === 'paid' && status !== 'pending') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Cannot update paid invoices' })
      }
    }

    // Prepare update data
    const updateData = {
      updated_at: new Date().toISOString()
    }

    // Validate and set amount
    if (amount !== undefined) {
      const amountValue = parseFloat(amount)
      if (isNaN(amountValue) || amountValue < 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid amount' })
        }
      }
      updateData.amount = amountValue
      
      // Recalculate tax and total
      const taxRateValue = taxRate !== undefined ? parseFloat(taxRate) : currentInvoice.tax_rate
      updateData.tax_amount = amountValue * (taxRateValue / 100)
      updateData.total_amount = amountValue + updateData.tax_amount
    }

    // Validate and set tax rate
    if (taxRate !== undefined) {
      const taxRateValue = parseFloat(taxRate)
      if (isNaN(taxRateValue) || taxRateValue < 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid tax rate' })
        }
      }
      updateData.tax_rate = taxRateValue
      
      // Recalculate tax and total
      const amountValue = amount !== undefined ? parseFloat(amount) : currentInvoice.amount
      updateData.tax_amount = amountValue * (taxRateValue / 100)
      updateData.total_amount = amountValue + updateData.tax_amount
    }

    if (description !== undefined) {
      updateData.description = description
    }

    if (dueDate !== undefined) {
      updateData.due_at = dueDate
    }

    if (status !== undefined) {
      const validStatuses = ['pending', 'paid', 'cancelled', 'overdue']
      if (!validStatuses.includes(status)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid status' })
        }
      }
      updateData.status = status
    }

    // Update invoice
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId)
      .select(`
        *,
        contact:contacts(id, name, email, company),
        project:projects(id, title)
      `)
      .single()

    if (updateError) {
      console.error('[invoices-update] Database error:', updateError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update invoice' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        invoice: {
          id: updatedInvoice.id,
          invoiceNumber: updatedInvoice.invoice_number,
          amount: updatedInvoice.amount,
          taxRate: updatedInvoice.tax_rate,
          taxAmount: updatedInvoice.tax_amount,
          totalAmount: updatedInvoice.total_amount,
          description: updatedInvoice.description,
          dueDate: updatedInvoice.due_at || updatedInvoice.due_date,
          status: updatedInvoice.status,
          contact: updatedInvoice.contact,
          project: updatedInvoice.project,
          createdAt: updatedInvoice.created_at,
          updatedAt: updatedInvoice.updated_at
        }
      })
    }

  } catch (error) {
    console.error('[invoices-update] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
