/**
 * Forms Submit - Public endpoint for submitting form responses
 * Used by tenant sites (GWA, Uptrade main site, etc.) to submit form data
 * 
 * Supports:
 * - Auto-creating forms if they don't exist (autoCreateForm: true)
 * - Auto-creating/updating contacts (createContact: true)
 * - Email notifications to form owner
 * - Confirmation emails to submitter
 */

import { createSupabaseAdmin } from './utils/supabase.js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function handler(event) {
  // CORS headers - allow all origins for public form submissions
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Tenant-ID, X-Project-Id, X-Organization-Id',
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
      metadata = {},
      autoCreateForm = false,
      createContact = false,
      projectId,
      orgId
    } = body

    const tenantId = event.headers['x-tenant-id'] || body.tenantId
    const headerProjectId = event.headers['x-project-id'] || projectId
    const headerOrgId = event.headers['x-organization-id'] || orgId

    if (!formSlug && !formId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'formSlug or formId is required' })
      }
    }

    // Get or create form configuration
    let form = null
    
    // First try to find existing form
    let query = supabase
      .from('forms')
      .select('*')
      .eq('is_active', true)

    if (formSlug) {
      query = query.eq('slug', formSlug)
    } else {
      query = query.eq('id', formId)
    }

    // Filter by tenant/project if specified
    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    } else if (headerProjectId) {
      // Also check for null tenant_id (global forms)
      query = query.or(`tenant_id.eq.${headerProjectId},tenant_id.is.null`)
    }

    const { data: existingForm } = await query.maybeSingle()
    form = existingForm

    // Auto-create form if it doesn't exist and autoCreateForm is true
    if (!form && autoCreateForm && formSlug) {
      console.log('[Forms Submit] Auto-creating form:', formSlug)
      
      // Determine notify email based on tenant/org
      let notifyEmail = process.env.ADMIN_EMAIL || 'hello@uptrademedia.com'
      
      const { data: newForm, error: createError } = await supabase
        .from('forms')
        .insert({
          slug: formSlug,
          name: formSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          tenant_id: headerProjectId || tenantId || null,
          org_id: headerOrgId || null,
          notify_email: notifyEmail,
          send_confirmation: true,
          success_message: 'Thank you for your submission! We\'ll be in touch soon.',
          is_active: true,
          fields: [
            { name: 'email', type: 'email', label: 'Email', required: true },
            { name: 'name', type: 'text', label: 'Name', required: false },
            { name: 'phone', type: 'tel', label: 'Phone', required: false },
            { name: 'message', type: 'textarea', label: 'Message', required: false }
          ]
        })
        .select()
        .single()

      if (createError) {
        console.error('[Forms Submit] Failed to auto-create form:', createError)
      } else {
        form = newForm
        console.log('[Forms Submit] Auto-created form:', newForm.id)
      }
    }

    if (!form) {
      console.error('[Forms Submit] Form not found:', formSlug || formId)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Form not found or inactive' })
      }
    }

    // Create or update contact if requested
    let contactId = null
    if (createContact && formData.email) {
      try {
        const email = formData.email.toLowerCase().trim()
        
        // Check if contact exists
        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('email', email)
          .maybeSingle()

        if (existingContact) {
          contactId = existingContact.id
          // Update with any new info
          await supabase
            .from('contacts')
            .update({
              name: formData.name || undefined,
              phone: formData.phone || undefined,
              company: formData.company || undefined,
              updated_at: new Date().toISOString()
            })
            .eq('id', contactId)
        } else {
          // Create new contact
          const { data: newContact } = await supabase
            .from('contacts')
            .insert({
              email,
              name: formData.name || null,
              phone: formData.phone || null,
              company: formData.company || null,
              org_id: headerOrgId || form.org_id || null,
              role: 'client',
              source: `website_${formSlug}`,
              pipeline_stage: 'new_lead',
              notes: formData.service_interest ? `Interested in: ${formData.service_interest}` : null
            })
            .select('id')
            .single()
          
          contactId = newContact?.id
          console.log('[Forms Submit] Created contact:', contactId)
        }
      } catch (contactError) {
        console.error('[Forms Submit] Contact creation error (non-blocking):', contactError)
      }
    }

    // Validate required fields (if form has field definitions)
    if (form.fields && Array.isArray(form.fields)) {
      const requiredFields = form.fields
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
    }

    // Get client info
    const clientIp = event.headers['x-forwarded-for']?.split(',')[0] || 
                     event.headers['client-ip'] || 
                     'unknown'
    const userAgent = event.headers['user-agent'] || metadata.userAgent || 'unknown'

    // Store submission
    const { data: submission, error: submitError } = await supabase
      .from('form_submissions')
      .insert({
        form_id: form.id,
        tenant_id: form.tenant_id,
        contact_id: contactId || null,
        email: formData.email || null,
        name: formData.name || null,
        phone: formData.phone || null,
        company: formData.company || null,
        message: formData.message || null,
        fields: formData,
        source_page: metadata.sourcePage || null,
        source_url: metadata.sourceUrl || null,
        referrer: metadata.referrer || event.headers.referer || event.headers.origin || null,
        user_agent: userAgent,
        ip_address: clientIp,
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
          from: process.env.RESEND_FROM || 'Uptrade Media <portal@uptrademedia.com>',
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
          from: process.env.RESEND_FROM || 'Uptrade Media <portal@uptrademedia.com>',
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
