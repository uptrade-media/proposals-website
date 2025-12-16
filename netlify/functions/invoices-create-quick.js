/**
 * Quick Invoice Create - Create a one-off invoice for anyone (not just existing clients)
 * 
 * Features:
 * - Send invoice to any email address
 * - Generates magic payment link (no auth required)
 * - Optionally creates contact record
 * - Sends invoice email immediately
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { Resend } from 'resend'
import crypto from 'crypto'
import { invoiceEmail } from './utils/email-templates.js'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || 'Uptrade Media <billing@uptrademedia.com>'
const PORTAL_URL = process.env.PORTAL_URL || process.env.URL || 'https://portal.uptrademedia.com'

export async function handler(event) {
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
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    // Admin only
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact || contact.role !== 'admin') {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Admin access required' }) }
    }

    const {
      email,
      name,
      company,
      description,
      amount, // In dollars
      dueDate,
      lineItems = [], // Optional: [{ description, quantity, unitPrice }]
      notes,
      sendNow = true,
      createContact = false
    } = JSON.parse(event.body || '{}')

    // Validation
    if (!email || !email.includes('@')) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Valid email is required' }) }
    }

    if (!amount || amount <= 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Amount must be greater than 0' }) }
    }

    if (!description) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Description is required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Generate invoice number
    const year = new Date().getFullYear()
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .ilike('invoice_number', `INV-${year}-%`)

    const invoiceNumber = `INV-${year}-${String((count || 0) + 1).padStart(4, '0')}`

    // Generate payment token (magic link)
    const paymentToken = crypto.randomBytes(32).toString('hex')
    const paymentTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    // Calculate amounts (convert dollars to cents for storage)
    const amountCents = Math.round(parseFloat(amount) * 100)
    const taxRate = 0 // No tax by default for quick invoices
    const taxAmount = 0
    const totalAmount = amountCents

    // Check if contact exists
    let contactId = null
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id, name, email')
      .eq('email', email.toLowerCase())
      .single()

    if (existingContact) {
      contactId = existingContact.id
    } else if (createContact) {
      // Create new contact
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          email: email.toLowerCase(),
          name: name || null,
          company: company || null,
          source: 'quick_invoice',
          role: 'client',
          pipeline_stage: 'new_lead'
        })
        .select('id')
        .single()

      if (!contactError && newContact) {
        contactId = newContact.id
      }
    }

    // Create the invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        contact_id: contactId,
        description,
        amount: amountCents,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        due_date: dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days default
        status: sendNow ? 'sent' : 'draft',
        notes: notes || null,
        payment_token: paymentToken,
        payment_token_expires: paymentTokenExpires.toISOString(),
        sent_to_email: email.toLowerCase(),
        sent_at: sendNow ? new Date().toISOString() : null,
        line_items: lineItems.length > 0 ? lineItems : [{ description, quantity: 1, unitPrice: amountCents }],
        created_by: contact.id
      })
      .select()
      .single()

    if (invoiceError) {
      console.error('[quick-invoice] Create error:', invoiceError)
      return { 
        statusCode: 500, 
        headers, 
        body: JSON.stringify({ error: 'Failed to create invoice', details: invoiceError.message }) 
      }
    }

    // Generate payment link
    const paymentLink = `${PORTAL_URL}/pay/${invoice.id}?token=${paymentToken}`

    // Send email if requested
    if (sendNow && RESEND_API_KEY) {
      try {
        const resend = new Resend(RESEND_API_KEY)
        const recipientName = name || email.split('@')[0]
        const dueDateFormatted = new Date(invoice.due_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })

        await resend.emails.send({
          from: RESEND_FROM,
          to: email,
          subject: `Invoice ${invoiceNumber} from Uptrade Media - $${(amountCents / 100).toFixed(2)}`,
          html: invoiceEmail({
            recipientName: recipientName,
            invoiceNumber: invoiceNumber,
            description: description,
            amount: amountCents / 100,
            taxAmount: 0,
            totalAmount: totalAmount / 100,
            dueDate: invoice.due_date,
            paymentToken: paymentToken,
            invoiceId: invoice.id
          })
        })
        console.log(`[quick-invoice] Sent invoice email to ${email}`)
      } catch (emailError) {
        console.error('[quick-invoice] Email send error:', emailError)
        // Don't fail the request, invoice was still created
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoice_number,
          amount: totalAmount / 100,
          description,
          dueDate: invoice.due_date,
          status: invoice.status,
          sentTo: email
        },
        payment_url: paymentLink,
        contactCreated: createContact && !existingContact && contactId
      })
    }

  } catch (error) {
    console.error('[quick-invoice] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
