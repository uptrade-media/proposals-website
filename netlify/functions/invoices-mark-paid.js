// netlify/functions/invoices-mark-paid.js
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { Resend } from 'resend'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM = process.env.RESEND_FROM || 'Uptrade Media <portal@send.uptrademedia.com>'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL

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
    // Verify authentication with Supabase
    const { user, contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Not authenticated' })
      }
    }

    // Only admins can mark invoices as paid
    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Not authorized - admin only' })
      }
    }

    // Parse request
    const { invoiceId, paymentMethod } = JSON.parse(event.body || '{}')

    // Validate required fields
    if (!invoiceId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'invoiceId is required' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Fetch invoice
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select(`
        *,
        contact:contacts(id, name, email, company),
        project:projects(id, title)
      `)
      .eq('id', invoiceId)
      .single()

    if (fetchError || !invoice) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Invoice not found' })
      }
    }

    // Check if already paid
    if (invoice.status === 'paid') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invoice already paid' })
      }
    }

    // Update invoice to paid status
    const now = new Date().toISOString()
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: now,
        payment_method: paymentMethod || 'manual',
        updated_at: now
      })
      .eq('id', invoiceId)
      .select(`
        *,
        contact:contacts(id, name, email, company),
        project:projects(id, title)
      `)
      .single()

    if (updateError) {
      console.error('[invoices-mark-paid] Database error:', updateError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update invoice' })
      }
    }

    // Create portal notification for payment tracking
    try {
      await supabase
        .from('smart_notifications')
        .insert({
          contact_id: invoice.contact_id,
          type: 'invoice_paid',
          priority: 'normal',
          title: `💰 Payment recorded: $${parseFloat(invoice.total_amount).toFixed(2)}`,
          message: `Invoice ${invoice.invoice_number} marked as paid (${paymentMethod || 'manual'})`,
          metadata: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoice_number,
            amount: invoice.total_amount,
            paymentMethod: paymentMethod || 'manual',
            markedBy: contact.name || contact.email,
            paidAt: now
          }
        })
      console.log('[invoices-mark-paid] Created payment notification')
    } catch (notifyErr) {
      console.error('[invoices-mark-paid] Notification error:', notifyErr)
    }

    // Send payment confirmation email to client
    if (RESEND_API_KEY && invoice.contact?.email) {
      try {
        const resend = new Resend(RESEND_API_KEY)
        await resend.emails.send({
          from: RESEND_FROM,
          to: invoice.contact.email,
          subject: `Payment Received - Invoice ${invoice.invoice_number}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4bbf39;">Payment Confirmed</h2>
              <p>Hi ${invoice.contact.name || 'there'},</p>
              <p>We've received your payment. Thank you!</p>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
                <p><strong>Amount Paid:</strong> $${invoice.total_amount.toFixed(2)}</p>
                <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>Payment Method:</strong> ${paymentMethod || 'Manual'}</p>
              </div>
              <p>
                <a href="https://portal.uptrademedia.com/billing" 
                   style="display: inline-block; background: #4bbf39; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                  View Receipt
                </a>
              </p>
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                Best regards,<br>Uptrade Media
              </p>
            </div>
          `
        })
      } catch (emailError) {
        console.error('[invoices-mark-paid] Email error:', emailError)
        // Don't fail the request if email fails
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
          paidAt: updatedInvoice.paid_at,
          paymentMethod: updatedInvoice.payment_method,
          contact: updatedInvoice.contact,
          project: updatedInvoice.project,
          createdAt: updatedInvoice.created_at,
          updatedAt: updatedInvoice.updated_at
        }
      })
    }

  } catch (error) {
    console.error('[invoices-mark-paid] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
