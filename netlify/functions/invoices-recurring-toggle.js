// netlify/functions/invoices-recurring-toggle.js
// Toggle pause/resume for recurring invoices
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Verify authentication
    const { user, contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Not authenticated' })
      }
    }

    // Only admins can toggle recurring invoices
    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only admins can manage recurring invoices' })
      }
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}')
    const { invoiceId, paused } = body

    if (!invoiceId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'invoiceId is required' })
      }
    }

    if (typeof paused !== 'boolean') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'paused must be a boolean' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Get the invoice
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('id, is_recurring, recurring_paused')
      .eq('id', invoiceId)
      .single()

    if (fetchError || !invoice) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Invoice not found' })
      }
    }

    if (!invoice.is_recurring) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invoice is not a recurring invoice' })
      }
    }

    // Update the recurring status
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({ 
        recurring_paused: paused,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .select('id, is_recurring, recurring_paused, recurring_interval, next_recurring_date')
      .single()

    if (updateError) {
      console.error('[invoices-recurring-toggle] Update error:', updateError)
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
          isRecurring: updatedInvoice.is_recurring,
          recurringPaused: updatedInvoice.recurring_paused,
          recurringInterval: updatedInvoice.recurring_interval,
          nextRecurringDate: updatedInvoice.next_recurring_date
        },
        message: paused 
          ? 'Recurring invoice paused' 
          : 'Recurring invoice resumed'
      })
    }

  } catch (error) {
    console.error('[invoices-recurring-toggle] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
