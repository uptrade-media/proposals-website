// netlify/functions/invoices-delete.js
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Verify authentication - admin only
    const { contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Not authenticated' })
      }
    }

    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only admins can delete invoices' })
      }
    }

    // Get invoice ID from path
    const invoiceId = event.path.split('/').pop()
    
    if (!invoiceId || invoiceId === 'invoices-delete') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invoice ID is required' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Check if invoice exists and get details for logging
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('id, invoice_number, status, total_amount')
      .eq('id', invoiceId)
      .single()

    if (fetchError || !invoice) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Invoice not found' })
      }
    }

    // Prevent deletion of paid invoices (optional safety check)
    if (invoice.status === 'paid') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Cannot delete paid invoices. Please archive or void instead.',
          suggestion: 'Update status to "void" or "cancelled" to keep records.' 
        })
      }
    }

    // Delete the invoice
    const { error: deleteError } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId)

    if (deleteError) {
      console.error('[invoices-delete] Delete error:', deleteError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to delete invoice' })
      }
    }

    console.log(`[invoices-delete] Deleted invoice ${invoice.invoice_number} by admin ${contact.email}`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Invoice ${invoice.invoice_number} deleted successfully`
      })
    }

  } catch (error) {
    console.error('[invoices-delete] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
