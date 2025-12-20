/**
 * Branded email templates for Uptrade Media
 * Uses Uptrade brand colors and consistent styling
 */

const BRAND_GREEN = '#4bbf39'
const PORTAL_URL = process.env.PORTAL_URL || process.env.URL || 'https://portal.uptrademedia.com'

/**
 * Base email wrapper with Uptrade branding
 */
export function emailWrapper(content) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f7;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f7; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, ${BRAND_GREEN} 0%, #3a9f2d 100%); padding: 40px 30px; text-align: center;">
                  <img src="https://portal.uptrademedia.com/uptrade_media_logo_white.png" alt="Uptrade Media" width="180" height="auto" style="display: block; margin: 0 auto 15px auto;" />
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                    Uptrade Media
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  ${content}
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f5f5f7; padding: 30px; text-align: center;">
                  <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                    <strong>Uptrade Media</strong>
                  </p>
                  <p style="margin: 0 0 15px 0; color: #666; font-size: 14px;">
                    Digital Marketing & Web Design
                  </p>
                  <p style="margin: 0; color: #999; font-size: 12px;">
                    © ${new Date().getFullYear()} Uptrade Media. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}

/**
 * Invoice email with magic payment link (no login required)
 */
export function invoiceEmail({ 
  recipientName, 
  invoiceNumber, 
  description, 
  amount, 
  taxAmount = 0, 
  totalAmount, 
  dueDate, 
  paymentToken,
  invoiceId 
}) {
  const dueDateFormatted = new Date(dueDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  const paymentLink = `${PORTAL_URL}/pay/${invoiceId}?token=${paymentToken}`
  
  const content = `
    <p style="margin: 0 0 20px 0; font-size: 16px; color: #1d1d1f; line-height: 1.5;">
      Hi ${recipientName},
    </p>
    
    <p style="margin: 0 0 30px 0; font-size: 16px; color: #1d1d1f; line-height: 1.5;">
      You have a new invoice from Uptrade Media. Click the button below to view and pay online.
    </p>
    
    <!-- Invoice Details Card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f7; border-radius: 12px; margin-bottom: 30px;">
      <tr>
        <td style="padding: 24px;">
          <table width="100%" cellpadding="8" cellspacing="0">
            <tr>
              <td style="color: #666; font-size: 14px; padding: 8px 0;">Invoice Number</td>
              <td style="text-align: right; font-weight: 600; font-size: 14px; color: #1d1d1f; padding: 8px 0;">${invoiceNumber}</td>
            </tr>
            ${description ? `
            <tr>
              <td style="color: #666; font-size: 14px; padding: 8px 0;">Description</td>
              <td style="text-align: right; font-size: 14px; color: #1d1d1f; padding: 8px 0;">${description}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="color: #666; font-size: 14px; padding: 8px 0;">Due Date</td>
              <td style="text-align: right; font-size: 14px; color: #1d1d1f; padding: 8px 0;">${dueDateFormatted}</td>
            </tr>
            <tr>
              <td style="color: #666; font-size: 14px; padding: 8px 0;">Amount</td>
              <td style="text-align: right; font-size: 14px; color: #1d1d1f; padding: 8px 0;">$${amount.toFixed(2)}</td>
            </tr>
            ${taxAmount > 0 ? `
            <tr>
              <td style="color: #666; font-size: 14px; padding: 8px 0;">Tax</td>
              <td style="text-align: right; font-size: 14px; color: #1d1d1f; padding: 8px 0;">$${taxAmount.toFixed(2)}</td>
            </tr>
            ` : ''}
            <tr style="border-top: 2px solid #ddd;">
              <td style="padding: 16px 0 8px 0; font-weight: 600; font-size: 18px; color: #1d1d1f;">Amount Due</td>
              <td style="text-align: right; padding: 16px 0 8px 0; font-weight: 700; font-size: 24px; color: ${BRAND_GREEN};">$${totalAmount.toFixed(2)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
      <tr>
        <td align="center">
          <a href="${paymentLink}" 
             style="display: inline-block; background: ${BRAND_GREEN}; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(75, 191, 57, 0.3);">
            View & Pay Invoice
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0 0 10px 0; color: #666; font-size: 14px; line-height: 1.5;">
      <strong>Important:</strong> This link is secure and unique to you. No login required.
    </p>
    
    <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.5;">
      If you have any questions about this invoice, please reply to this email.
    </p>
  `
  
  return emailWrapper(content)
}

/**
 * Payment confirmation email (sent to client)
 */
export function paymentConfirmationEmail({ 
  recipientName, 
  invoiceNumber, 
  amount, 
  transactionId,
  paidDate 
}) {
  const paidDateFormatted = new Date(paidDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="display: inline-block; background-color: #e8f5e6; border-radius: 50%; width: 60px; height: 60px; line-height: 60px;">
        <span style="color: ${BRAND_GREEN}; font-size: 30px;">✓</span>
      </div>
    </div>
    
    <h2 style="margin: 0 0 20px 0; color: #1d1d1f; font-size: 24px; font-weight: 600; text-align: center;">
      Payment Successful!
    </h2>
    
    <p style="margin: 0 0 30px 0; font-size: 16px; color: #1d1d1f; line-height: 1.5; text-align: center;">
      Thank you for your payment, ${recipientName}. We've received your payment successfully.
    </p>
    
    <!-- Payment Details Card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f7; border-radius: 12px; margin-bottom: 30px;">
      <tr>
        <td style="padding: 24px;">
          <table width="100%" cellpadding="8" cellspacing="0">
            <tr>
              <td style="color: #666; font-size: 14px; padding: 8px 0;">Invoice Number</td>
              <td style="text-align: right; font-weight: 600; font-size: 14px; color: #1d1d1f; padding: 8px 0;">${invoiceNumber}</td>
            </tr>
            <tr>
              <td style="color: #666; font-size: 14px; padding: 8px 0;">Amount Paid</td>
              <td style="text-align: right; font-weight: 700; font-size: 18px; color: ${BRAND_GREEN}; padding: 8px 0;">$${amount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="color: #666; font-size: 14px; padding: 8px 0;">Payment Date</td>
              <td style="text-align: right; font-size: 14px; color: #1d1d1f; padding: 8px 0;">${paidDateFormatted}</td>
            </tr>
            <tr>
              <td style="color: #666; font-size: 14px; padding: 8px 0;">Transaction ID</td>
              <td style="text-align: right; font-size: 12px; font-family: monospace; color: #666; padding: 8px 0;">${transactionId}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
      <tr>
        <td align="center">
          <a href="${PORTAL_URL}/billing" 
             style="display: inline-block; background: ${BRAND_GREEN}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
            View Receipt
          </a>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.5; text-align: center;">
      A copy of your receipt is available in your portal account.
    </p>
  `
  
  return emailWrapper(content)
}

/**
 * Payment notification email (sent to admin)
 */
export function paymentNotificationAdminEmail({ 
  clientName, 
  clientEmail, 
  invoiceNumber, 
  amount, 
  transactionId 
}) {
  const content = `
    <h2 style="margin: 0 0 20px 0; color: #1d1d1f; font-size: 22px; font-weight: 600;">
      💰 Payment Received
    </h2>
    
    <p style="margin: 0 0 30px 0; font-size: 16px; color: #1d1d1f; line-height: 1.5;">
      A client has just made a payment:
    </p>
    
    <!-- Payment Details Card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f7; border-radius: 12px; margin-bottom: 30px;">
      <tr>
        <td style="padding: 24px;">
          <table width="100%" cellpadding="8" cellspacing="0">
            <tr>
              <td style="color: #666; font-size: 14px; padding: 8px 0;">Client</td>
              <td style="text-align: right; font-weight: 600; font-size: 14px; color: #1d1d1f; padding: 8px 0;">${clientName}</td>
            </tr>
            <tr>
              <td style="color: #666; font-size: 14px; padding: 8px 0;">Email</td>
              <td style="text-align: right; font-size: 14px; color: #1d1d1f; padding: 8px 0;">${clientEmail}</td>
            </tr>
            <tr>
              <td style="color: #666; font-size: 14px; padding: 8px 0;">Invoice</td>
              <td style="text-align: right; font-weight: 600; font-size: 14px; color: #1d1d1f; padding: 8px 0;">${invoiceNumber}</td>
            </tr>
            <tr>
              <td style="color: #666; font-size: 14px; padding: 8px 0;">Amount</td>
              <td style="text-align: right; font-weight: 700; font-size: 20px; color: ${BRAND_GREEN}; padding: 8px 0;">$${amount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="color: #666; font-size: 14px; padding: 8px 0;">Transaction ID</td>
              <td style="text-align: right; font-size: 11px; font-family: monospace; color: #666; padding: 8px 0;">${transactionId}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <a href="${PORTAL_URL}/admin/billing" 
             style="display: inline-block; background: ${BRAND_GREEN}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
            View in Portal
          </a>
        </td>
      </tr>
    </table>
  `
  
  return emailWrapper(content)
}
