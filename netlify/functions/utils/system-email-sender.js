/**
 * System Email Sender Utility
 * 
 * Multi-tenant email sending for transactional/system emails.
 * - Looks up org-specific templates from database
 * - Falls back to default templates if no custom template exists
 * - Sends via Resend with variable substitution
 * - Supports all system email types (auth, audit, billing, etc.)
 */

import { Resend } from 'resend'
import { createSupabaseAdmin } from './supabase.js'

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Default templates for all system emails
 * These are used when no org-specific template exists
 */
const DEFAULT_TEMPLATES = {
  // ============================================
  // AUTHENTICATION EMAILS
  // ============================================
  'account-setup-invite': {
    subject: 'Set up your {{company_name}} portal account',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, {{brand_color}} 0%, {{brand_color_dark}} 100%); padding: 30px; text-align: center;">
              {{#if logo_url}}<img src="{{logo_url}}" alt="{{company_name}}" width="180" style="display: block; margin: 0 auto;" />{{/if}}
              <h1 style="color: #ffffff; margin: 20px 0 0 0; font-size: 24px;">Welcome to {{company_name}}!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                Hi {{first_name}},
              </p>
              <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                You've been invited to join the {{company_name}} client portal. Click the button below to set up your account and get started.
              </p>
              <table role="presentation" style="margin: 30px auto;">
                <tr>
                  <td style="border-radius: 8px; background: {{brand_color}};">
                    <a href="{{setup_link}}" style="display: inline-block; padding: 16px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      Set Up My Account
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; color: #666; font-size: 14px; text-align: center;">
                This link expires in 7 days.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; color: #999; font-size: 12px;">
                {{company_name}} {{#if business_address}}• {{business_address}}{{/if}}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },

  'magic-link-login': {
    subject: 'Your login link for {{company_name}}',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: {{brand_color}}; padding: 30px; text-align: center;">
              {{#if logo_url}}<img src="{{logo_url}}" alt="{{company_name}}" width="160" style="display: block; margin: 0 auto;" />{{/if}}
            </td>
          </tr>
          <tr>
            <td style="padding: 40px; text-align: center;">
              <div style="width: 60px; height: 60px; background-color: rgba(75, 191, 57, 0.1); border-radius: 50%; margin: 0 auto 20px; line-height: 60px; font-size: 28px;">🔐</div>
              <h1 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 24px;">Sign in to {{company_name}}</h1>
              <p style="margin: 0 0 30px 0; color: #666; font-size: 16px; line-height: 1.6;">
                Hi {{first_name}}, click the button below to securely sign in to your account. No password needed!
              </p>
              <table role="presentation" style="margin: 0 auto 30px;">
                <tr>
                  <td style="border-radius: 8px; background: {{brand_color}};">
                    <a href="{{magic_link}}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      Sign In →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; color: #999; font-size: 14px;">
                This link expires in {{expires_in}}.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; color: #666; font-size: 13px;">
                If you didn't request this email, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },

  'password-reset': {
    subject: 'Reset your {{company_name}} password',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="padding: 40px; text-align: center;">
              <div style="width: 60px; height: 60px; background-color: rgba(0, 122, 255, 0.1); border-radius: 50%; margin: 0 auto 20px; line-height: 60px; font-size: 28px;">🔑</div>
              <h1 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 24px;">Reset Your Password</h1>
              <p style="margin: 0 0 30px 0; color: #666; font-size: 16px; line-height: 1.6;">
                Hi {{first_name}}, we received a request to reset your password. Click below to create a new one.
              </p>
              <table role="presentation" style="margin: 0 auto 30px;">
                <tr>
                  <td style="border-radius: 8px; background: #007AFF;">
                    <a href="{{reset_link}}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; color: #999; font-size: 14px;">
                This link expires in {{expires_in}}. If you didn't request this, you can ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },

  // ============================================
  // AUDIT EMAILS
  // ============================================
  'audit-complete': {
    subject: '{{first_name}}, Your Website Audit is Ready - Grade: {{grade}}',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, {{brand_color}} 0%, {{brand_color_dark}} 100%); padding: 30px; text-align: center;">
              {{#if logo_url}}<img src="{{logo_url}}" alt="{{company_name}}" width="180" style="display: block; margin: 0 auto 20px;" />{{/if}}
              <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 28px;">Your Website Audit is Ready! 🎉</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">
                Hi {{first_name}}, we've completed a comprehensive analysis of your website
              </p>
            </td>
          </tr>
          {{#if personalized_message}}
          <tr>
            <td style="padding: 25px 30px 15px 30px; background-color: #f8fafc; border-bottom: 1px solid #e5e7eb;">
              <p style="color: #374151; font-size: 16px; line-height: 1.7; margin: 0;">
                {{personalized_message}}
              </p>
              <p style="color: #6b7280; font-size: 14px; margin: 12px 0 0 0;">
                — The {{company_name}} Team
              </p>
            </td>
          </tr>
          {{/if}}
          <tr>
            <td style="padding: 30px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <div style="display: inline-block; background-color: {{grade_color}}; color: white; font-size: 64px; font-weight: bold; width: 100px; height: 100px; line-height: 100px; border-radius: 20px; margin-bottom: 15px;">
                {{grade}}
              </div>
              <p style="color: #374151; font-size: 18px; margin: 0; font-weight: 600;">
                Overall Grade: {{grade_label}}
              </p>
              <p style="color: #6b7280; font-size: 14px; margin: 8px 0 0 0;">
                {{target_url}}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="width: 25%; text-align: center; padding: 15px;">
                    <div style="font-size: 28px; font-weight: bold; color: {{performance_color}};">{{performance_score}}</div>
                    <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Performance</div>
                  </td>
                  <td style="width: 25%; text-align: center; padding: 15px;">
                    <div style="font-size: 28px; font-weight: bold; color: {{seo_color}};">{{seo_score}}</div>
                    <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">SEO</div>
                  </td>
                  <td style="width: 25%; text-align: center; padding: 15px;">
                    <div style="font-size: 28px; font-weight: bold; color: {{accessibility_color}};">{{accessibility_score}}</div>
                    <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Accessibility</div>
                  </td>
                  <td style="width: 25%; text-align: center; padding: 15px;">
                    <div style="font-size: 28px; font-weight: bold; color: {{security_color}};">{{security_score}}</div>
                    <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Security</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 30px 40px 30px; text-align: center;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                View your complete audit report with detailed findings and recommendations.
              </p>
              <table role="presentation" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 12px; background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                    <a href="{{magic_link}}" style="display: inline-block; padding: 18px 40px; color: #ffffff; text-decoration: none; font-size: 18px; font-weight: bold;">
                      View Full Report →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0 0;">
                This link expires in 30 days.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #111827; padding: 30px; text-align: center;">
              <p style="color: #9ca3af; font-size: 13px; margin: 0 0 5px 0;">
                <strong style="color: #fff;">{{company_name}}</strong>
              </p>
              {{#if business_address}}
              <p style="color: #6b7280; font-size: 12px; margin: 0;">{{business_address}}</p>
              {{/if}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },

  // ============================================
  // BILLING EMAILS
  // ============================================
  'invoice-sent': {
    subject: 'Invoice #{{invoice_number}} from {{company_name}}',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="padding: 30px; border-bottom: 1px solid #e5e5e5;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td>{{#if logo_url}}<img src="{{logo_url}}" alt="{{company_name}}" height="40" />{{else}}<strong style="font-size: 20px;">{{company_name}}</strong>{{/if}}</td>
                  <td style="text-align: right; color: #666; font-size: 14px;">Invoice #{{invoice_number}}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; color: #333; font-size: 16px;">
                Hi {{first_name}},
              </p>
              <p style="margin: 0 0 30px 0; color: #333; font-size: 16px; line-height: 1.6;">
                Here's your invoice for {{amount}}. Payment is due by {{due_date}}.
              </p>
              
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                {{line_items}}
                <div style="border-top: 2px solid #e5e5e5; margin-top: 15px; padding-top: 15px;">
                  <table role="presentation" style="width: 100%;">
                    <tr>
                      <td style="font-weight: bold; font-size: 18px;">Total Due</td>
                      <td style="text-align: right; font-weight: bold; font-size: 18px; color: {{brand_color}};">{{amount}}</td>
                    </tr>
                  </table>
                </div>
              </div>
              
              <table role="presentation" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 8px; background: {{brand_color}};">
                    <a href="{{payment_link}}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      Pay Now →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; color: #666; font-size: 13px;">
                Questions? Just reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },

  'payment-received': {
    subject: 'Payment received - Invoice #{{invoice_number}}',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="padding: 50px 40px; text-align: center;">
              <div style="width: 70px; height: 70px; background-color: rgba(16, 185, 129, 0.1); border-radius: 50%; margin: 0 auto 24px; line-height: 70px; font-size: 32px;">✓</div>
              <h1 style="margin: 0 0 12px 0; font-size: 28px; color: #1a1a1a;">Payment Successful!</h1>
              <p style="margin: 0 0 30px 0; color: #666; font-size: 16px;">
                Thanks for your payment, {{first_name}}!
              </p>
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; text-align: left;">
                <table role="presentation" style="width: 100%;">
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Invoice</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600;">#{{invoice_number}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Amount Paid</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #10b981;">{{amount}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Payment Method</td>
                    <td style="padding: 8px 0; text-align: right;">{{payment_method}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Date</td>
                    <td style="padding: 8px 0; text-align: right;">{{payment_date}}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; color: #999; font-size: 12px;">
                {{company_name}} {{#if business_address}}• {{business_address}}{{/if}}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  }
}

/**
 * Get org-specific branding settings
 */
async function getOrgBranding(supabase, orgId) {
  // Try to get org-specific email settings first
  const { data: settings } = await supabase
    .from('organization_secrets')
    .select('resend_from_email')
    .eq('organization_id', orgId)
    .single()
  
  const { data: org } = await supabase
    .from('organizations')
    .select('name, logo_url, brand_color, business_address')
    .eq('id', orgId)
    .single()
  
  return {
    company_name: org?.name || 'Uptrade Media',
    logo_url: org?.logo_url || 'https://portal.uptrademedia.com/uptrade_media_logo_white.png',
    brand_color: org?.brand_color || '#4bbf39',
    brand_color_dark: org?.brand_color ? darkenColor(org.brand_color, 20) : '#3a9c2d',
    business_address: org?.business_address || '',
    from_email: settings?.resend_from_email || process.env.RESEND_FROM || 'Uptrade Media <noreply@send.uptrademedia.com>'
  }
}

/**
 * Simple color darkening function
 */
function darkenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.max((num >> 16) - amt, 0)
  const G = Math.max((num >> 8 & 0x00FF) - amt, 0)
  const B = Math.max((num & 0x0000FF) - amt, 0)
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)
}

/**
 * Get score color based on value
 */
function getScoreColor(score) {
  if (score >= 90) return '#10b981' // green
  if (score >= 70) return '#f59e0b' // amber
  return '#ef4444' // red
}

/**
 * Get grade info (color and label)
 */
function getGradeInfo(grade) {
  const grades = {
    'A': { color: '#10b981', label: 'Excellent!' },
    'B': { color: '#3b82f6', label: 'Good' },
    'C': { color: '#f59e0b', label: 'Needs Work' },
    'D': { color: '#f97316', label: 'Poor' },
    'F': { color: '#ef4444', label: 'Critical' }
  }
  return grades[grade] || grades['C']
}

/**
 * Simple template variable replacement
 * Supports: {{variable}}, {{#if variable}}...{{/if}}
 */
function renderTemplate(template, variables) {
  let result = template
  
  // Handle {{#if variable}}...{{/if}} blocks
  const ifRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g
  result = result.replace(ifRegex, (match, varName, content) => {
    return variables[varName] ? content : ''
  })
  
  // Replace all {{variable}} placeholders
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    result = result.replace(regex, value ?? '')
  })
  
  // Remove any remaining unmatched variables
  result = result.replace(/\{\{[^}]+\}\}/g, '')
  
  return result
}

/**
 * Send a system email
 * 
 * @param {Object} options
 * @param {string} options.emailId - The system email type (e.g., 'audit-complete', 'magic-link-login')
 * @param {string} options.to - Recipient email address
 * @param {string} options.orgId - Organization ID for multi-tenant template lookup
 * @param {Object} options.variables - Template variables to substitute
 * @param {string} [options.replyTo] - Optional reply-to address
 * @returns {Promise<{success: boolean, emailId?: string, error?: string}>}
 */
export async function sendSystemEmail({ emailId, to, orgId, variables, replyTo }) {
  try {
    const supabase = createSupabaseAdmin()
    
    // Get org branding
    const branding = await getOrgBranding(supabase, orgId)
    
    // Check for custom template in database
    let template = null
    const { data: customTemplate } = await supabase
      .from('system_email_templates')
      .select('subject, html')
      .eq('org_id', orgId)
      .eq('email_id', emailId)
      .single()
    
    if (customTemplate?.html) {
      template = customTemplate
    } else {
      // Fall back to default template
      template = DEFAULT_TEMPLATES[emailId]
      if (!template) {
        console.error(`[sendSystemEmail] No template found for: ${emailId}`)
        return { success: false, error: `Unknown email type: ${emailId}` }
      }
    }
    
    // Merge branding with provided variables
    const allVariables = {
      ...branding,
      ...variables,
      // Add computed fields for audit emails
      ...(variables.performance_score !== undefined && {
        performance_color: getScoreColor(variables.performance_score),
        seo_color: getScoreColor(variables.seo_score),
        accessibility_color: getScoreColor(variables.accessibility_score),
        security_color: getScoreColor(variables.security_score)
      }),
      ...(variables.grade && {
        grade_color: getGradeInfo(variables.grade).color,
        grade_label: getGradeInfo(variables.grade).label
      })
    }
    
    // Render templates
    const subject = renderTemplate(template.subject, allVariables)
    const html = renderTemplate(template.html, allVariables)
    
    // Send via Resend
    const result = await resend.emails.send({
      from: branding.from_email,
      to,
      subject,
      html,
      replyTo: replyTo || 'hello@uptrademedia.com'
    })
    
    console.log(`[sendSystemEmail] Sent ${emailId} to ${to}:`, result.data?.id)
    
    return { success: true, emailId: result.data?.id }
    
  } catch (error) {
    console.error(`[sendSystemEmail] Error sending ${emailId}:`, error)
    return { success: false, error: error.message }
  }
}

/**
 * Generate a Supabase auth link without sending an email
 * Then send via our own template system
 * 
 * @param {Object} options
 * @param {string} options.type - 'magiclink' | 'invite' | 'recovery'
 * @param {string} options.email - User email
 * @param {string} options.redirectTo - Where to redirect after auth
 * @param {string} options.orgId - Organization ID
 * @param {Object} options.userData - Additional user data (first_name, etc.)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendAuthEmail({ type, email, redirectTo, orgId, userData = {} }) {
  try {
    const supabase = createSupabaseAdmin()
    
    // Generate the auth link without sending
    const { data, error } = await supabase.auth.admin.generateLink({
      type: type === 'invite' ? 'invite' : type === 'recovery' ? 'recovery' : 'magiclink',
      email,
      options: {
        redirectTo,
        data: userData
      }
    })
    
    if (error) {
      console.error('[sendAuthEmail] generateLink error:', error)
      return { success: false, error: error.message }
    }
    
    const actionLink = data.properties?.action_link
    if (!actionLink) {
      return { success: false, error: 'No action link generated' }
    }
    
    // Determine which email template to use
    const emailIdMap = {
      magiclink: 'magic-link-login',
      invite: 'account-setup-invite',
      recovery: 'password-reset'
    }
    const emailId = emailIdMap[type] || 'magic-link-login'
    
    // Send via our system
    const result = await sendSystemEmail({
      emailId,
      to: email,
      orgId,
      variables: {
        first_name: userData.first_name || email.split('@')[0],
        magic_link: actionLink,
        setup_link: actionLink,
        reset_link: actionLink,
        expires_in: type === 'recovery' ? '1 hour' : '24 hours'
      }
    })
    
    return result
    
  } catch (error) {
    console.error('[sendAuthEmail] Error:', error)
    return { success: false, error: error.message }
  }
}

export default { sendSystemEmail, sendAuthEmail }
