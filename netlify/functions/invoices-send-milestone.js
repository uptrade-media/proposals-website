// netlify/functions/invoices-send-milestone.js
// Sends a milestone invoice when a project milestone is completed
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getAuthenticatedUser } from './utils/supabase.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM = process.env.RESEND_FROM || 'Uptrade Media <portal@send.uptrademedia.com>'
const PORTAL_URL = process.env.URL || 'https://portal.uptrademedia.com'

export async function handler(event) {
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
        body: JSON.stringify({ error: 'Admin access required' })
      }
    }

    const { invoiceId } = JSON.parse(event.body || '{}')
    
    if (!invoiceId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'invoiceId is required' })
      }
    }

    // Fetch invoice with project and contact
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        project:projects!invoices_project_id_fkey (*),
        contact:contacts!invoices_contact_id_fkey (*)
      `)
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Invoice not found' })
      }
    }

    // Check if already sent
    if (invoice.sent_at) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invoice already sent' })
      }
    }

    if (!RESEND_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Email service not configured' })
      }
    }

    const now = new Date().toISOString()
    const resend = new Resend(RESEND_API_KEY)
    const paymentLink = `${PORTAL_URL}/pay/${invoice.payment_token || invoice.id}`

    // Send invoice email
    await resend.emails.send({
      from: RESEND_FROM,
      to: invoice.contact.email,
      subject: `Invoice ${invoice.invoice_number} - Milestone Complete`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a1a;">Invoice ${invoice.invoice_number}</h2>
          
          <p>Hi ${invoice.contact.name || 'there'},</p>
          
          <p>A milestone has been completed on your project${invoice.project ? ` <strong>${invoice.project.title}</strong>` : ''}.</p>
          
          <div style="background: #f5f5f7; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0; color: #666;">Milestone Invoice</p>
            <p style="margin: 0; font-size: 14px;"><strong>Description:</strong> ${invoice.description}</p>
            <p style="margin: 8px 0 0 0; font-size: 14px;"><strong>Amount:</strong> $${parseFloat(invoice.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            <p style="margin: 8px 0 0 0; font-size: 14px;"><strong>Due Date:</strong> ${new Date(invoice.due_at || invoice.due_date).toLocaleDateString()}</p>
          </div>
          
          <a href="${paymentLink}" 
             style="display: inline-block; background: #4bbf39; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Pay Invoice
          </a>
          
          <p style="margin-top: 32px; color: #666; font-size: 14px;">
            If you have any questions, just reply to this email.
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 32px;">
            Uptrade Media • ${PORTAL_URL}
          </p>
        </div>
      `
    })

    // Update invoice status
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({ 
        status: 'pending',
        sent_at: now,
        sent_to: invoice.contact.email
      })
      .eq('id', invoiceId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    console.log(`[invoices-send-milestone] Sent invoice ${invoice.invoice_number} to ${invoice.contact.email}`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Invoice sent successfully',
        invoice: {
          id: updatedInvoice.id,
          invoiceNumber: updatedInvoice.invoice_number,
          status: updatedInvoice.status,
          sentAt: updatedInvoice.sent_at,
          sentTo: updatedInvoice.sent_to
        }
      })
    }

  } catch (error) {
    console.error('Error sending milestone invoice:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to send invoice',
        message: error.message
      })
    }
  }
}
