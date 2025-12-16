// netlify/functions/invoices-generate-recurring.js
// Generate invoices from recurring templates
// Can be run manually or via scheduled function

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { randomBytes } from 'crypto'
import { Resend } from 'resend'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'portal@send.uptrademedia.com'
const RESEND_FROM = `Uptrade Media <${RESEND_FROM_EMAIL}>`
const PORTAL_URL = process.env.URL || 'https://portal.uptrademedia.com'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hello@uptrademedia.com'

// Calculate next recurring date based on frequency
function calculateNextDate(currentDate, frequency, interval, intervalUnit) {
  const date = new Date(currentDate)
  
  switch (frequency) {
    case 'monthly':
      date.setMonth(date.getMonth() + 1)
      break
    case 'quarterly':
      date.setMonth(date.getMonth() + 3)
      break
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1)
      break
    case 'custom':
      if (intervalUnit === 'days') {
        date.setDate(date.getDate() + interval)
      } else if (intervalUnit === 'weeks') {
        date.setDate(date.getDate() + (interval * 7))
      } else if (intervalUnit === 'months') {
        date.setMonth(date.getMonth() + interval)
      }
      break
    default:
      date.setMonth(date.getMonth() + 1) // Default to monthly
  }
  
  return date.toISOString()
}

// Generate invoice number
async function generateInvoiceNumber(supabase) {
  const { data: lastInvoice } = await supabase
    .from('invoices')
    .select('invoice_number')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  const lastNumber = lastInvoice?.invoice_number 
    ? parseInt(lastInvoice.invoice_number.replace(/\D/g, '')) 
    : 0
  return `INV-${String(lastNumber + 1).padStart(5, '0')}`
}

// Generate payment token
function generatePaymentToken() {
  return randomBytes(32).toString('hex')
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

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

  // Allow both GET (scheduled) and POST (manual)
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  // For POST requests, verify admin auth
  if (event.httpMethod === 'POST') {
    const { contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact || contact.role !== 'admin') {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Admin access required' }) }
    }
  }

  try {
    const supabase = createSupabaseAdmin()
    const now = new Date()

    // Find recurring invoices that need to generate a new invoice
    const { data: recurringTemplates, error: queryError } = await supabase
      .from('invoices')
      .select(`
        *,
        contact:contacts!contact_id(id, name, email, company)
      `)
      .eq('is_recurring', true)
      .lte('recurring_next_date', now.toISOString())
      .or('recurring_end_date.is.null,recurring_end_date.gt.' + now.toISOString())

    if (queryError) {
      console.error('[invoices-generate-recurring] Query error:', queryError)
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to query recurring invoices' }) }
    }

    console.log(`[invoices-generate-recurring] Found ${recurringTemplates?.length || 0} recurring invoices to process`)

    if (!recurringTemplates || recurringTemplates.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'No recurring invoices due', generated: 0 })
      }
    }

    const results = []
    const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

    for (const template of recurringTemplates) {
      try {
        // Generate new invoice number
        const invoiceNumber = await generateInvoiceNumber(supabase)
        
        // Calculate due date (same offset from billing date as original)
        const originalDueOffset = template.due_date 
          ? Math.round((new Date(template.due_date) - new Date(template.created_at)) / (1000 * 60 * 60 * 24))
          : 30 // Default 30 days
        
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + originalDueOffset)

        // Generate payment token
        const paymentToken = generatePaymentToken()
        const tokenExpires = new Date()
        tokenExpires.setDate(tokenExpires.getDate() + 30)

        // Create the new invoice
        const { data: newInvoice, error: insertError } = await supabase
          .from('invoices')
          .insert({
            contact_id: template.contact_id,
            project_id: template.project_id,
            invoice_number: invoiceNumber,
            status: 'sent', // Auto-send recurring invoices
            amount: template.amount,
            tax_rate: template.tax_rate,
            tax_amount: template.tax_amount,
            total_amount: template.total_amount,
            description: template.description,
            due_date: dueDate.toISOString(),
            line_items: template.line_items,
            notes: template.notes,
            // Payment token for magic link
            payment_token: paymentToken,
            payment_token_expires: tokenExpires.toISOString(),
            sent_at: now.toISOString(),
            sent_to_email: template.contact?.email,
            // Link to parent recurring template
            recurring_parent_id: template.id,
            is_recurring: false // The generated invoice is not itself recurring
          })
          .select()
          .single()

        if (insertError) {
          console.error(`[invoices-generate-recurring] Failed to create invoice for ${template.id}:`, insertError)
          results.push({ templateId: template.id, status: 'error', error: insertError.message })
          continue
        }

        // Calculate next recurring date
        const nextDate = calculateNextDate(
          template.recurring_next_date,
          template.recurring_frequency,
          template.recurring_interval,
          template.recurring_interval_unit
        )

        // Update the template with new next date and increment count
        await supabase
          .from('invoices')
          .update({
            recurring_next_date: nextDate,
            recurring_count: (template.recurring_count || 0) + 1,
            updated_at: now.toISOString()
          })
          .eq('id', template.id)

        // Send invoice email
        if (resend && template.contact?.email) {
          const paymentUrl = `${PORTAL_URL}/pay/${paymentToken}`
          
          try {
            await resend.emails.send({
              from: RESEND_FROM,
              to: template.contact.email,
              subject: `Invoice ${invoiceNumber} from Uptrade Media - ${formatCurrency(template.total_amount)}`,
              html: `
                <p>Hi ${template.contact.name || 'there'},</p>
                <p>Your recurring invoice is ready:</p>
                <ul>
                  <li><strong>Invoice:</strong> ${invoiceNumber}</li>
                  <li><strong>Amount:</strong> ${formatCurrency(template.total_amount)}</li>
                  <li><strong>Due:</strong> ${dueDate.toLocaleDateString()}</li>
                </ul>
                <p><a href="${paymentUrl}" style="background:#4bbf39;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Pay Now</a></p>
                <p>Thank you for your business!</p>
              `
            })

            // Schedule reminders (3, 7, 14 days)
            const reminderSchedule = [3, 7, 14]
            const scheduledIds = []

            for (const days of reminderSchedule) {
              const reminderDate = new Date()
              reminderDate.setDate(reminderDate.getDate() + days)
              reminderDate.setHours(9, 0, 0, 0)

              try {
                const { data: scheduled } = await resend.emails.send({
                  from: RESEND_FROM,
                  to: template.contact.email,
                  subject: `Reminder: Invoice ${invoiceNumber} - ${formatCurrency(template.total_amount)} Due`,
                  html: `
                    <p>Hi ${template.contact.name || 'there'},</p>
                    <p>This is a reminder that invoice ${invoiceNumber} for ${formatCurrency(template.total_amount)} is due.</p>
                    <p><a href="${paymentUrl}" style="background:#4bbf39;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Pay Now</a></p>
                  `,
                  scheduledAt: reminderDate.toISOString()
                })
                if (scheduled?.id) scheduledIds.push(scheduled.id)
              } catch (schedErr) {
                console.log(`[invoices-generate-recurring] Could not schedule reminder:`, schedErr.message)
              }
            }

            // Save scheduled reminder IDs
            if (scheduledIds.length > 0) {
              await supabase
                .from('invoices')
                .update({ scheduled_reminder_ids: scheduledIds })
                .eq('id', newInvoice.id)
            }

          } catch (emailErr) {
            console.error(`[invoices-generate-recurring] Email failed:`, emailErr)
          }
        }

        console.log(`[invoices-generate-recurring] Generated ${invoiceNumber} from template ${template.id}`)
        results.push({
          templateId: template.id,
          newInvoiceId: newInvoice.id,
          invoiceNumber,
          status: 'generated',
          nextDate
        })

      } catch (err) {
        console.error(`[invoices-generate-recurring] Error processing ${template.id}:`, err)
        results.push({ templateId: template.id, status: 'error', error: err.message })
      }
    }

    // Notify admin of generated invoices
    if (resend && results.filter(r => r.status === 'generated').length > 0) {
      try {
        const generated = results.filter(r => r.status === 'generated')
        await resend.emails.send({
          from: RESEND_FROM,
          to: ADMIN_EMAIL,
          subject: `📋 ${generated.length} Recurring Invoice(s) Generated`,
          html: `
            <p>The following recurring invoices were automatically generated:</p>
            <ul>
              ${generated.map(r => `<li>${r.invoiceNumber} - Next: ${new Date(r.nextDate).toLocaleDateString()}</li>`).join('')}
            </ul>
          `
        })
      } catch (notifyErr) {
        console.log('[invoices-generate-recurring] Admin notification failed:', notifyErr.message)
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Recurring invoice generation completed',
        processed: recurringTemplates.length,
        generated: results.filter(r => r.status === 'generated').length,
        results
      })
    }

  } catch (error) {
    console.error('[invoices-generate-recurring] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to generate recurring invoices', details: error.message })
    }
  }
}
