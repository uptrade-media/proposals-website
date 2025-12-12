// netlify/functions/invoices-create.js
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { Client, Environment } from 'square'
import { Resend } from 'resend'

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN
const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT || 'sandbox'
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'portal@send.uptrademedia.com'
const RESEND_FROM = `Uptrade Media <${RESEND_FROM_EMAIL}>`

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

    // Only admins can create invoices
    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only admins can create invoices' })
      }
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}')
    const { 
      contactId,
      projectId,
      amount,
      taxRate = 0,
      description,
      dueDate
    } = body

    // Validate required fields
    if (!contactId || !amount) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'contactId and amount are required' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Verify contact exists
    const { data: targetContact, error: contactError } = await supabase
      .from('contacts')
      .select('id, name, email, company')
      .eq('id', contactId)
      .single()

    if (contactError || !targetContact) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Contact not found' })
      }
    }

    // If projectId provided, verify it exists
    if (projectId) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, title')
        .eq('id', projectId)
        .single()

      if (projectError || !project) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Project not found' })
        }
      }
    }

    // Calculate amounts
    const amountValue = parseFloat(amount)
    const taxRateValue = parseFloat(taxRate)
    const taxAmountValue = amountValue * (taxRateValue / 100)
    const totalAmountValue = amountValue + taxAmountValue

    // Generate invoice number
    const { data: lastInvoice } = await supabase
      .from('invoices')
      .select('invoice_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    const lastNumber = lastInvoice?.invoice_number 
      ? parseInt(lastInvoice.invoice_number.replace(/\D/g, '')) 
      : 0
    const invoiceNumber = `INV-${String(lastNumber + 1).padStart(5, '0')}`

    // Create invoice in Square (if configured)
    let squareInvoiceId = null
    if (SQUARE_ACCESS_TOKEN) {
      try {
        const squareClient = new Client({
          accessToken: SQUARE_ACCESS_TOKEN,
          environment: SQUARE_ENVIRONMENT === 'production' 
            ? Environment.Production 
            : Environment.Sandbox
        })

        // Create Square invoice
        const { result } = await squareClient.invoicesApi.createInvoice({
          invoice: {
            locationId: process.env.SQUARE_LOCATION_ID,
            primaryRecipient: {
              customerId: targetContact.squareCustomerId || undefined,
              emailAddress: targetContact.email
            },
            paymentRequests: [{
              requestType: 'BALANCE',
              dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              automaticPaymentSource: 'NONE'
            }],
            title: description || `Invoice ${invoiceNumber}`,
            description: description,
            invoiceNumber: invoiceNumber
          },
          idempotencyKey: `${invoiceNumber}-${Date.now()}`
        })

        squareInvoiceId = result.invoice?.id
      } catch (squareError) {
        console.error('[invoices-create] Square error:', squareError)
        // Continue without Square - we'll still create local invoice
      }
    }

    // Create invoice in database
    const { data: newInvoice, error: insertError } = await supabase
      .from('invoices')
      .insert({
        contact_id: contactId,
        project_id: projectId || null,
        invoice_number: invoiceNumber,
        amount: amountValue,
        tax_rate: taxRateValue,
        tax_amount: taxAmountValue,
        total_amount: totalAmountValue,
        description: description || null,
        due_date: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        square_invoice_id: squareInvoiceId
      })
      .select(`
        *,
        contact:contacts(id, name, email, company),
        project:projects(id, title)
      `)
      .single()

    if (insertError) {
      console.error('[invoices-create] Database error:', insertError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create invoice' })
      }
    }

    // Send email notification to client
    if (RESEND_API_KEY && targetContact.email) {
      try {
        const resend = new Resend(RESEND_API_KEY)
        await resend.emails.send({
          from: RESEND_FROM,
          to: targetContact.email,
          subject: `New Invoice ${invoiceNumber} - $${totalAmountValue.toFixed(2)}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4bbf39;">New Invoice</h2>
              <p>Hi ${targetContact.name || 'there'},</p>
              <p>A new invoice has been created for you:</p>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
                <p><strong>Amount:</strong> $${amountValue.toFixed(2)}</p>
                ${taxAmountValue > 0 ? `<p><strong>Tax:</strong> $${taxAmountValue.toFixed(2)}</p>` : ''}
                <p><strong>Total:</strong> $${totalAmountValue.toFixed(2)}</p>
                <p><strong>Due Date:</strong> ${new Date(dueDate || Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                ${description ? `<p><strong>Description:</strong> ${description}</p>` : ''}
              </div>
              <p>
                <a href="https://portal.uptrademedia.com/billing" 
                   style="display: inline-block; background: #4bbf39; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                  View Invoice
                </a>
              </p>
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                Best regards,<br>Uptrade Media
              </p>
            </div>
          `
        })
      } catch (emailError) {
        console.error('[invoices-create] Email error:', emailError)
        // Don't fail the request if email fails
      }
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        invoice: {
          id: newInvoice.id,
          invoiceNumber: newInvoice.invoice_number,
          amount: newInvoice.amount,
          taxRate: newInvoice.tax_rate,
          taxAmount: newInvoice.tax_amount,
          totalAmount: newInvoice.total_amount,
          description: newInvoice.description,
          dueDate: newInvoice.due_date,
          status: newInvoice.status,
          squareInvoiceId: newInvoice.square_invoice_id,
          contact: newInvoice.contact,
          project: newInvoice.project,
          createdAt: newInvoice.created_at
        }
      })
    }

  } catch (error) {
    console.error('[invoices-create] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
