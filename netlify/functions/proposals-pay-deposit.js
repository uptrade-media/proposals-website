// netlify/functions/proposals-pay-deposit.js
// Handle deposit payments for signed proposals using Square
import { createClient } from '@supabase/supabase-js'
import { Client } from 'square'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID
const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT || 'sandbox'
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM = process.env.RESEND_FROM || 'Uptrade Media <portal@send.uptrademedia.com>'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@uptrademedia.com'
const PORTAL_URL = process.env.URL || 'https://portal.uptrademedia.com'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { proposalId, sourceId, verificationToken } = JSON.parse(event.body || '{}')

    if (!proposalId || !sourceId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing proposalId or sourceId' })
      }
    }

    // Get proposal with contact info
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select('*, contact:contacts!proposals_contact_id_fkey(*)')
      .eq('id', proposalId)
      .single()

    if (proposalError || !proposal) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Proposal not found' })
      }
    }

    // Check if already paid
    if (proposal.deposit_paid_at) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Deposit already paid', alreadyPaid: true })
      }
    }

    // Check if proposal is signed
    if (!proposal.signed_at && proposal.status !== 'accepted') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Proposal must be signed before payment' })
      }
    }

    const depositAmount = parseFloat(proposal.deposit_amount) || 0
    if (depositAmount <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid deposit amount' })
      }
    }

    // Initialize Square client
    const squareClient = new Client({
      accessToken: SQUARE_ACCESS_TOKEN,
      environment: SQUARE_ENVIRONMENT === 'production' ? 'production' : 'sandbox'
    })

    // Create payment
    const amountInCents = Math.round(depositAmount * 100)
    const idempotencyKey = `proposal-deposit-${proposalId}-${Date.now()}`

    const { result: paymentResult, statusCode: squareStatus } = await squareClient.paymentsApi.createPayment({
      sourceId,
      idempotencyKey,
      amountMoney: {
        amount: BigInt(amountInCents),
        currency: 'USD'
      },
      locationId: SQUARE_LOCATION_ID,
      referenceId: `proposal-${proposalId}`,
      note: `Deposit for: ${proposal.title}`,
      verificationToken: verificationToken || undefined,
      autocomplete: true
    })

    if (!paymentResult?.payment) {
      console.error('Square payment failed:', paymentResult)
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Payment failed',
          details: paymentResult?.errors || 'Unknown error'
        })
      }
    }

    const payment = paymentResult.payment

    // Update proposal with deposit payment info
    const { error: updateError } = await supabase
      .from('proposals')
      .update({
        deposit_paid_at: new Date().toISOString(),
        deposit_payment_id: payment.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', proposalId)

    if (updateError) {
      console.error('Error updating proposal:', updateError)
      // Payment succeeded but update failed - log this as critical
    }

    // Mark any pending deposit invoice as paid
    // Find invoice matching this proposal's deposit
    const { data: matchingInvoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('contact_id', proposal.contact?.id)
      .eq('status', 'sent')
      .ilike('notes', `%Proposal ID: ${proposalId}%`)
      .single()

    if (matchingInvoice) {
      await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          square_payment_id: payment.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', matchingInvoice.id)
      
      console.log('Marked invoice as paid:', matchingInvoice.id)
    }

    // Send thank you email to client
    if (RESEND_API_KEY && proposal.contact?.email) {
      const resend = new Resend(RESEND_API_KEY)
      const clientName = proposal.contact?.name?.split(' ')[0] || 'there'
      const projectTitle = proposal.title.replace(/^Proposal:\s*/i, '').replace(/\s*Proposal$/i, '')

      try {
        await resend.emails.send({
          from: RESEND_FROM,
          to: proposal.contact.email,
          subject: `🎉 Payment Received - Let's Get Started!`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root { color-scheme: light dark; }
    .logo-mark { fill: #0f172a; }
    @media (prefers-color-scheme: dark) { .logo-mark { fill: #ffffff; } }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px; text-align: center;">
              <div style="display:inline-flex; align-items:center; justify-content:center; width:96px; height:96px; border-radius:24px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); margin-bottom: 12px;">
                <svg width="48" height="48" viewBox="0 0 24 24" role="img" aria-label="Uptrade logo" class="logo-mark" style="display:block;">
                  <path d="M6 4h2v12a4 4 0 0 0 8 0V4h2v12a6 6 0 0 1-12 0V4z" />
                </svg>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">🎉 Payment Received!</h1>
              <p style="color: #94a3b8; margin: 8px 0 0; font-size: 16px;">Your project is officially underway</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="font-size: 18px; color: #333; margin: 0 0 24px;">
                Hi ${clientName},
              </p>
              
              <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 24px;">
                Thank you for your deposit payment! We're excited to kick off <strong>${projectTitle}</strong> 
                and can't wait to deliver something amazing for you.
              </p>
              
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 16px; color: #166534; font-size: 16px;">✓ Payment Confirmed</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #166534; font-size: 14px;">Amount Paid</td>
                    <td style="padding: 8px 0; color: #166534; font-size: 14px; font-weight: 600; text-align: right;">$${depositAmount.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #166534; font-size: 14px;">Project</td>
                    <td style="padding: 8px 0; color: #166534; font-size: 14px; font-weight: 600; text-align: right;">${projectTitle}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #166534; font-size: 14px;">Transaction ID</td>
                    <td style="padding: 8px 0; color: #166534; font-size: 14px; font-weight: 600; text-align: right;">${payment.id.slice(-8)}</td>
                  </tr>
                </table>
              </div>
              
              <h3 style="color: #0f172a; font-size: 18px; margin: 32px 0 16px;">What Happens Next?</h3>
              
              <div style="space-y: 16px;">
                <div style="display: flex; align-items: flex-start; margin-bottom: 16px;">
                  <div style="background: #22c55e; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; margin-right: 16px; flex-shrink: 0;">1</div>
                  <div>
                    <p style="margin: 0; font-weight: 600; color: #0f172a;">Kickoff Call</p>
                    <p style="margin: 4px 0 0; color: #64748b; font-size: 14px;">We'll reach out within 24 hours to schedule your kickoff call.</p>
                  </div>
                </div>
                
                <div style="display: flex; align-items: flex-start; margin-bottom: 16px;">
                  <div style="background: #22c55e; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; margin-right: 16px; flex-shrink: 0;">2</div>
                  <div>
                    <p style="margin: 0; font-weight: 600; color: #0f172a;">Discovery & Planning</p>
                    <p style="margin: 4px 0 0; color: #64748b; font-size: 14px;">We'll gather your brand assets, content, and requirements.</p>
                  </div>
                </div>
                
                <div style="display: flex; align-items: flex-start; margin-bottom: 16px;">
                  <div style="background: #22c55e; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; margin-right: 16px; flex-shrink: 0;">3</div>
                  <div>
                    <p style="margin: 0; font-weight: 600; color: #0f172a;">Work Begins</p>
                    <p style="margin: 4px 0 0; color: #64748b; font-size: 14px;">Our team gets to work bringing your vision to life.</p>
                  </div>
                </div>
              </div>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${PORTAL_URL}/projects" 
                   style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); 
                          color: white; 
                          padding: 16px 40px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          font-size: 16px; 
                    font-weight: 700;
                    display: inline-block;
                    box-shadow: 0 4px 14px rgba(34, 197, 94, 0.35);">
                  View Your Project
                </a>
              </div>
              
              <p style="font-size: 14px; color: #64748b; text-align: center; margin: 0;">
                Questions? Just reply to this email - we're here to help!
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center;">
              <p style="margin: 0 0 4px; color: #0f172a; font-size: 14px; font-weight: 600;">Uptrade Media</p>
              <p style="margin: 0; color: #64748b; font-size: 12px;">Premium Digital Marketing & Web Design</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
          `
        })
      } catch (emailError) {
        console.error('Failed to send thank you email:', emailError)
      }

      // Notify admin
      try {
        await resend.emails.send({
          from: RESEND_FROM,
          to: ADMIN_EMAIL,
          subject: `💰 Deposit Received: ${proposal.title} - $${depositAmount.toLocaleString()}`,
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root { color-scheme: light dark; }
    .logo-mark { fill: #0f172a; }
    @media (prefers-color-scheme: dark) { .logo-mark { fill: #ffffff; } }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 40px; text-align: center;">
              <div style="display:inline-flex; align-items:center; justify-content:center; width:96px; height:96px; border-radius:24px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); margin-bottom: 12px;">
                <svg width="48" height="48" viewBox="0 0 24 24" role="img" aria-label="Uptrade logo" class="logo-mark" style="display:block;">
                  <path d="M6 4h2v12a4 4 0 0 0 8 0V4h2v12a6 6 0 0 1-12 0V4z" />
                </svg>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">💰 Deposit Payment Received</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 8px 0; color: #166534; font-size: 14px;">Project</td>
                        <td align="right" style="padding: 8px 0; color: #166534; font-size: 14px; font-weight: 600;">${proposal.title}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #166534; font-size: 14px;">Client</td>
                        <td align="right" style="padding: 8px 0; color: #166534; font-size: 14px; font-weight: 600;">${proposal.contact?.name}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #166534; font-size: 14px;">Amount</td>
                        <td align="right" style="padding: 8px 0; color: #22c55e; font-size: 16px; font-weight: 700;">$${depositAmount.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #166534; font-size: 14px;">Transaction ID</td>
                        <td align="right" style="padding: 8px 0; color: #166534; font-size: 14px; font-weight: 600;">${payment.id.slice(-12)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #166534; font-size: 14px;">Email</td>
                        <td align="right" style="padding: 8px 0; color: #166534; font-size: 14px; font-weight: 600;">${proposal.contact?.email}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="color: #0f172a; font-size: 16px; font-weight: 600; margin: 24px 0 8px;">✅ Ready to kick off the project!</p>
              <p style="color: #64748b; font-size: 14px; margin: 0;">Next: Schedule kickoff call with client</p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">Uptrade Media Admin Portal</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
          `
        })
      } catch (emailError) {
        console.error('Failed to send admin notification:', emailError)
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Deposit payment successful',
        paymentId: payment.id,
        amountPaid: depositAmount
      })
    }

  } catch (error) {
    console.error('Error processing deposit payment:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to process payment',
        message: error.message
      })
    }
  }
}
