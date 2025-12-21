/**
 * Scheduled function to send invoice emails for abandoned proposal payments
 * 
 * This function runs periodically (via Netlify scheduled function or cron)
 * and sends invoice emails for:
 * - Invoices with status 'pending'
 * - Have pending_email_to set (from proposal signing)
 * - No sent_at timestamp (email not yet sent)
 * - Created more than 1 hour ago (client abandoned payment page)
 * 
 * Schedule: Every hour
 * netlify.toml: [functions."invoices-send-abandoned"] schedule = "0 * * * *"
 */

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const resend = new Resend(process.env.RESEND_API_KEY)

const PORTAL_URL = process.env.PORTAL_URL || 'https://portal.uptrademedia.com'
const RESEND_FROM = process.env.RESEND_FROM || 'Uptrade Media <portal@uptrademedia.com>'

// Minimum age before sending abandoned invoice email (1 hour in milliseconds)
const ABANDONED_THRESHOLD_MS = 60 * 60 * 1000

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0)
}

function formatDate(dateString) {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

async function sendInvoiceEmail(invoice, contact) {
  const paymentUrl = `${PORTAL_URL}/pay/${invoice.payment_token}`
  const dueDate = invoice.due_at || invoice.due_date
  
  // Parse line items if stored as JSON string
  let lineItems = invoice.line_items
  if (typeof lineItems === 'string') {
    try {
      lineItems = JSON.parse(lineItems)
    } catch {
      lineItems = []
    }
  }
  
  const lineItemsHtml = (lineItems || []).map(item => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 12px; text-align: left;">${item.description || 'Service'}</td>
      <td style="padding: 12px; text-align: right;">${formatCurrency(item.total || item.unitPrice)}</td>
    </tr>
  `).join('')
  
  const emailContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px; text-align: center;">
        <img src="${PORTAL_URL}/logo.png" alt="Uptrade Media" style="height: 40px; margin-bottom: 20px;" />
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Invoice Ready for Payment</h1>
        <p style="color: #94a3b8; margin: 10px 0 0; font-size: 16px;">Invoice #${invoice.invoice_number}</p>
      </div>
      
      <div style="padding: 40px;">
        <p style="font-size: 18px; color: #333; margin-bottom: 24px;">
          Hi${contact?.name ? ` ${contact.name.split(' ')[0]}` : ''},
        </p>
        
        <p style="font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 24px;">
          Your invoice is ready and awaiting payment. Click the button below to complete your payment securely.
        </p>
        
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #e2e8f0;">
                <th style="padding: 12px; text-align: left; color: #64748b; font-size: 12px; text-transform: uppercase;">Description</th>
                <th style="padding: 12px; text-align: right; color: #64748b; font-size: 12px; text-transform: uppercase;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${lineItemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td style="padding: 16px 12px; font-weight: bold; font-size: 18px;">Total Due</td>
                <td style="padding: 16px 12px; font-weight: bold; font-size: 18px; text-align: right; color: #22c55e;">${formatCurrency(invoice.total_amount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            <strong>Due Date:</strong> ${formatDate(dueDate)}
          </p>
        </div>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${paymentUrl}" 
             style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); 
                    color: white; 
                    padding: 16px 40px; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    font-size: 16px; 
                    font-weight: 700;
                    display: inline-block;
                    box-shadow: 0 4px 14px rgba(34, 197, 94, 0.35);">
            Pay Now - ${formatCurrency(invoice.total_amount)}
          </a>
        </div>
        
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">
          Payment link expires in 30 days. If you have any questions, reply to this email.
        </p>
      </div>
      
      <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center;">
        <p style="margin: 0 0 4px; color: #0f172a; font-size: 14px; font-weight: 600;">Uptrade Media</p>
        <p style="margin: 0; color: #64748b; font-size: 12px;">Premium Digital Marketing & Web Design</p>
      </div>
    </div>
  `
  
  const result = await resend.emails.send({
    from: RESEND_FROM,
    to: invoice.pending_email_to,
    subject: `Invoice #${invoice.invoice_number} - ${formatCurrency(invoice.total_amount)} Due`,
    html: emailContent
  })
  
  return result
}

export async function handler(event) {
  console.log('[invoices-send-abandoned] Starting abandoned invoice check...')
  
  try {
    // Calculate threshold time (1 hour ago)
    const thresholdTime = new Date(Date.now() - ABANDONED_THRESHOLD_MS).toISOString()
    
    // Find invoices that:
    // - Have status 'pending'
    // - Have pending_email_to set (created from proposal signing)
    // - No sent_at (email not yet sent)
    // - Created before threshold (client abandoned payment page)
    const { data: abandonedInvoices, error: fetchError } = await supabase
      .from('invoices')
      .select('*, contact:contacts!invoices_contact_id_fkey(name, email)')
      .eq('status', 'pending')
      .not('pending_email_to', 'is', null)
      .is('sent_at', null)
      .lt('created_at', thresholdTime)
      .limit(50) // Process max 50 per run to avoid timeouts
    
    if (fetchError) {
      console.error('Error fetching abandoned invoices:', fetchError)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to fetch invoices' })
      }
    }
    
    if (!abandonedInvoices || abandonedInvoices.length === 0) {
      console.log('[invoices-send-abandoned] No abandoned invoices to process')
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: 'No abandoned invoices to process',
          processed: 0
        })
      }
    }
    
    console.log(`[invoices-send-abandoned] Found ${abandonedInvoices.length} abandoned invoices`)
    
    let sent = 0
    let failed = 0
    const results = []
    
    for (const invoice of abandonedInvoices) {
      try {
        // Send the email
        await sendInvoiceEmail(invoice, invoice.contact)
        
        // Update invoice status to 'sent' and mark email as sent
        const { error: updateError } = await supabase
          .from('invoices')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            sent_to_email: invoice.pending_email_to,
            pending_email_to: null, // Clear pending flag
            updated_at: new Date().toISOString()
          })
          .eq('id', invoice.id)
        
        if (updateError) {
          console.error(`Error updating invoice ${invoice.id}:`, updateError)
          failed++
          results.push({ id: invoice.id, status: 'update_failed', error: updateError.message })
        } else {
          sent++
          results.push({ id: invoice.id, invoice_number: invoice.invoice_number, status: 'sent' })
          console.log(`[invoices-send-abandoned] Sent email for invoice ${invoice.invoice_number} to ${invoice.pending_email_to}`)
        }
      } catch (emailError) {
        console.error(`Error sending email for invoice ${invoice.id}:`, emailError)
        failed++
        results.push({ id: invoice.id, status: 'email_failed', error: emailError.message })
      }
    }
    
    console.log(`[invoices-send-abandoned] Complete: ${sent} sent, ${failed} failed`)
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Processed ${abandonedInvoices.length} abandoned invoices`,
        sent,
        failed,
        results
      })
    }
    
  } catch (error) {
    console.error('[invoices-send-abandoned] Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    }
  }
}
