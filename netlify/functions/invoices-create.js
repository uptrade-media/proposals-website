// netlify/functions/invoices-create.js
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { Resend } from 'resend'
import crypto from 'crypto'
import { invoiceEmail } from './utils/email-templates.js'

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN
const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT || 'sandbox'
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'portal@send.uptrademedia.com'
const RESEND_FROM = `Uptrade Media <${RESEND_FROM_EMAIL}>`

// Dynamic import Square to avoid esbuild bundling issues
let squareClientInstance = null
async function getSquareClient() {
  if (!squareClientInstance) {
    const squareModule = await import('square')
    const Client = squareModule.Client || squareModule.default?.Client
    squareClientInstance = new Client({
      accessToken: SQUARE_ACCESS_TOKEN,
      environment: SQUARE_ENVIRONMENT === 'production' ? 'production' : 'sandbox'
    })
  }
  return squareClientInstance
}

// Helper function to calculate next recurring date
function calculateNextRecurringDate(baseDate, interval, dayOfMonth, dayOfWeek) {
  const date = new Date(baseDate)
  
  switch (interval) {
    case 'weekly':
      date.setDate(date.getDate() + 7)
      break
    case 'bi-weekly':
      date.setDate(date.getDate() + 14)
      break
    case 'monthly':
      date.setMonth(date.getMonth() + 1)
      if (dayOfMonth) {
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
        date.setDate(Math.min(dayOfMonth, lastDay))
      }
      break
    case 'quarterly':
      date.setMonth(date.getMonth() + 3)
      if (dayOfMonth) {
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
        date.setDate(Math.min(dayOfMonth, lastDay))
      }
      break
    case 'semi-annual':
      date.setMonth(date.getMonth() + 6)
      if (dayOfMonth) {
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
        date.setDate(Math.min(dayOfMonth, lastDay))
      }
      break
    case 'annual':
      date.setFullYear(date.getFullYear() + 1)
      if (dayOfMonth) {
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
        date.setDate(Math.min(dayOfMonth, lastDay))
      }
      break
  }
  
  return date.toISOString()
}

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
      organizationId,
      contactId,
      projectId,
      amount,
      taxRate = 0,
      description,
      dueDate,
      // Recurring invoice fields
      isRecurring = false,
      recurringInterval,
      recurringDayOfMonth,
      recurringDayOfWeek,
      recurringEndDate,
      recurringCount
    } = body

    // Validate required fields
    if (!contactId || !amount) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'contactId and amount are required' })
      }
    }
    
    // Get organization ID from body or headers
    const orgId = organizationId || event.headers['x-organization-id'] || null

    // Validate recurring invoice fields
    if (isRecurring) {
      const validIntervals = ['weekly', 'bi-weekly', 'monthly', 'quarterly', 'semi-annual', 'annual']
      if (!recurringInterval || !validIntervals.includes(recurringInterval)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Valid recurringInterval is required for recurring invoices' })
        }
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

    // Generate invoice number (starting from 1085)
    const INVOICE_START_NUMBER = 1084 // Next invoice will be 1085
    const { data: lastInvoice } = await supabase
      .from('invoices')
      .select('invoice_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    const lastNumber = lastInvoice?.invoice_number 
      ? parseInt(lastInvoice.invoice_number.replace(/\D/g, '')) 
      : INVOICE_START_NUMBER
    const invoiceNumber = `INV-${String(lastNumber + 1).padStart(5, '0')}`

    // Create invoice in Square (if configured)
    let squareInvoiceId = null
    if (SQUARE_ACCESS_TOKEN) {
      try {
        const squareClient = await getSquareClient()

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

    // Generate payment token for magic payment link
    const paymentToken = crypto.randomBytes(32).toString('hex')
    const paymentTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    // Calculate next recurring date if this is a recurring invoice
    let nextRecurringDate = null
    if (isRecurring) {
      const baseDate = dueDate ? new Date(dueDate) : new Date()
      nextRecurringDate = calculateNextRecurringDate(baseDate, recurringInterval, recurringDayOfMonth, recurringDayOfWeek)
    }

    // Create invoice in database
    const { data: newInvoice, error: insertError } = await supabase
      .from('invoices')
      .insert({
        contact_id: contactId,
        project_id: projectId || null,
        org_id: orgId,
        invoice_number: invoiceNumber,
        amount: amountValue,
        tax_amount: taxAmountValue,
        // Note: total_amount is a generated column, don't insert it
        description: description || null,
        due_at: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'sent',
        square_invoice_id: squareInvoiceId,
        issued_at: new Date().toISOString(),
        created_by: contact.id,
        // Payment magic link token
        payment_token: paymentToken,
        payment_token_expires: paymentTokenExpires.toISOString(),
        // Recurring invoice fields
        is_recurring: isRecurring,
        recurring_interval: isRecurring ? recurringInterval : null,
        recurring_end_date: isRecurring && recurringEndDate ? recurringEndDate : null,
        next_invoice_date: nextRecurringDate ? nextRecurringDate.split('T')[0] : null // DATE type, not TIMESTAMPTZ
      })
      .select()
      .single()

    if (insertError) {
      console.error('[invoices-create] Database error:', insertError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create invoice' })
      }
    }
    
    // Attach contact and project data we already fetched
    newInvoice.contact = targetContact
    if (projectId) {
      const { data: project } = await supabase
        .from('projects')
        .select('id, title')
        .eq('id', projectId)
        .single()
      newInvoice.project = project
    }

    // Send email notification to client with magic payment link
    if (RESEND_API_KEY && targetContact.email) {
      try {
        const resend = new Resend(RESEND_API_KEY)
        await resend.emails.send({
          from: RESEND_FROM,
          to: targetContact.email,
          subject: `Invoice ${invoiceNumber} from Uptrade Media - $${totalAmountValue.toFixed(2)}`,
          html: invoiceEmail({
            recipientName: targetContact.name || targetContact.email.split('@')[0],
            invoiceNumber: invoiceNumber,
            description: description,
            amount: amountValue,
            taxAmount: taxAmountValue,
            totalAmount: totalAmountValue,
            dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            paymentToken: paymentToken,
            invoiceId: newInvoice.id
          })
        })
        console.log(`[invoices-create] Sent invoice email to ${targetContact.email}`)
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
          createdAt: newInvoice.created_at,
          // Recurring fields
          isRecurring: newInvoice.is_recurring,
          recurringInterval: newInvoice.recurring_interval,
          recurringDayOfMonth: newInvoice.recurring_day_of_month,
          recurringDayOfWeek: newInvoice.recurring_day_of_week,
          recurringEndDate: newInvoice.recurring_end_date,
          recurringCount: newInvoice.recurring_count,
          nextRecurringDate: newInvoice.next_recurring_date
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
