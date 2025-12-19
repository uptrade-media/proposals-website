/**
 * Forms Submit - Public endpoint for submitting form responses
 * Used by tenant sites (GWA, etc.) to submit form data
 */

import { createSupabaseAdmin } from './utils/supabase.js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function handler(event) {
  // CORS headers - allow all origins for public form submissions
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Tenant-ID',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const supabase = createSupabaseAdmin()
    
    const body = JSON.parse(event.body || '{}')
    const {
      formSlug,
      formId,
      data: formData = {},
      metadata = {}
    } = body

    const tenantId = event.headers['x-tenant-id'] || body.tenantId

    if (!formSlug && !formId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'formSlug or formId is required' })
      }
    }

    // Get form configuration
    let query = supabase
      .from('forms')
      .select('*')
      .eq('is_active', true)

    if (formSlug) {
      query = query.eq('slug', formSlug)
    } else {
      query = query.eq('id', formId)
    }

    // Filter by tenant if specified
    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }

    const { data: form, error: formError } = await query.single()

    if (formError || !form) {
      console.error('[Forms Submit] Form not found:', formSlug || formId)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Form not found or inactive' })
      }
    }

    // Validate required fields
    const requiredFields = (form.fields || [])
      .filter(f => f.required)
      .map(f => f.name)
    
    const missingFields = requiredFields.filter(field => !formData[field])
    
    if (missingFields.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          fields: missingFields
        })
      }
    }

    // Get client info
    const clientIp = event.headers['x-forwarded-for']?.split(',')[0] || 
                     event.headers['client-ip'] || 
                     'unknown'
    const userAgent = event.headers['user-agent'] || 'unknown'

    // Store submission
    const { data: submission, error: submitError } = await supabase
      .from('form_submissions')
      .insert({
        form_id: form.id,
        tenant_id: form.tenant_id,
        data: formData,
        metadata: {
          ...metadata,
          ip: clientIp,
          userAgent,
          submittedAt: new Date().toISOString(),
          referrer: event.headers.referer || event.headers.origin
        },
        status: 'new'
      })
      .select()
      .single()

    if (submitError) {
      console.error('[Forms Submit] Error storing submission:', submitError)
      throw submitError
    }

    console.log(`[Forms Submit] New submission for form "${form.name}":`, submission.id)

    // Send notification email to form owner
    if (form.notify_email) {
      try {
        const fieldLabels = (form.fields || []).reduce((acc, f) => {
          acc[f.name] = f.label || f.name
          return acc
        }, {})

        const formDataHtml = Object.entries(formData)
          .map(([key, value]) => `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">
                ${fieldLabels[key] || key}
              </td>
              <td style="padding: 8px; border-bottom: 1px solid #eee;">
                ${value}
              </td>
            </tr>
          `)
          .join('')

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'portal@uptrademedia.com',
          to: form.notify_email,
          subject: `New ${form.name} Submission`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <h2 style="color: #333;">New Form Submission</h2>
              <p>A new submission was received for <strong>${form.name}</strong>.</p>
              
              <table style="width: 100%; max-width: 600px; border-collapse: collapse; margin: 20px 0;">
                <tbody>
                  ${formDataHtml}
                </tbody>
              </table>
              
              <p style="color: #666; font-size: 12px;">
                Submitted from: ${metadata.pageUrl || 'Unknown'}<br>
                Time: ${new Date().toLocaleString()}
              </p>
            </div>
          `
        })
        console.log('[Forms Submit] Notification sent to:', form.notify_email)
      } catch (emailError) {
        console.error('[Forms Submit] Email notification failed:', emailError)
        // Don't fail the submission if email fails
      }
    }

    // Send confirmation email to submitter (if configured and email provided)
    if (form.send_confirmation && formData.email) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'portal@uptrademedia.com',
          to: formData.email,
          subject: `Thank you for your submission`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <h2 style="color: #333;">Thank You!</h2>
              <p>${form.success_message || 'We have received your submission and will get back to you soon.'}</p>
            </div>
          `
        })
        console.log('[Forms Submit] Confirmation sent to:', formData.email)
      } catch (emailError) {
        console.error('[Forms Submit] Confirmation email failed:', emailError)
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: form.success_message || 'Thank you for your submission!',
        submissionId: submission.id,
        redirectUrl: form.redirect_url || null
      })
    }
  } catch (error) {
    console.error('Forms submit error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to submit form',
        details: error.message
      })
    }
  }
}
