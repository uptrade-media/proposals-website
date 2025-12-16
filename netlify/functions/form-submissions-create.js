/**
 * Form Submissions Create - Record a new form submission
 * This is the main endpoint for website forms to submit to
 */

import { createSupabaseAdmin } from './utils/supabase.js'

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders }
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }) 
    }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const {
      // Form identification
      form_slug,
      form_id,
      tenant_id,
      
      // Core contact info
      email,
      name,
      phone,
      company,
      message,
      
      // All form fields as object
      fields = {},
      
      // Source tracking
      source_page,
      source_url,
      referrer,
      
      // UTM parameters
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      
      // Device info (can be populated by frontend)
      user_agent,
      device_type
    } = body

    // Validate required fields
    if (!email) {
      return { 
        statusCode: 400, 
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Email is required' }) 
      }
    }

    if (!form_slug && !form_id) {
      return { 
        statusCode: 400, 
        headers: corsHeaders,
        body: JSON.stringify({ error: 'form_slug or form_id is required' }) 
      }
    }

    const supabase = createSupabaseAdmin()

    // Find or create the form
    let resolvedFormId = form_id

    if (!resolvedFormId && form_slug) {
      // Look up form by slug
      let formQuery = supabase
        .from('forms')
        .select('id, name, notify_email, send_confirmation')
        .eq('slug', form_slug)
        .eq('is_active', true)

      if (tenant_id) {
        formQuery = formQuery.eq('tenant_id', tenant_id)
      } else {
        formQuery = formQuery.is('tenant_id', null)
      }

      const { data: form, error: formError } = await formQuery.single()

      if (formError || !form) {
        // Auto-create form if it doesn't exist (for flexibility)
        const { data: newForm, error: createError } = await supabase
          .from('forms')
          .insert({
            slug: form_slug,
            name: form_slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            tenant_id: tenant_id || null,
            website_url: source_url ? new URL(source_url).origin : null,
            form_type: 'lead-capture',
            is_active: true
          })
          .select('id')
          .single()

        if (createError) {
          console.error('Error creating form:', createError)
        } else {
          resolvedFormId = newForm.id
        }
      } else {
        resolvedFormId = form.id
      }
    }

    // Find or create contact
    let contactId = null
    const normalizedEmail = email.toLowerCase().trim()

    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', normalizedEmail)
      .single()

    if (existingContact) {
      contactId = existingContact.id
      // Update contact with any new info
      await supabase
        .from('contacts')
        .update({
          name: name || undefined,
          phone: phone || undefined,
          company: company || undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', contactId)
    } else {
      // Create new contact
      const { data: newContact } = await supabase
        .from('contacts')
        .insert({
          email: normalizedEmail,
          name: name || null,
          phone: phone || null,
          company: company || null,
          role: 'client',
          source: `form_${form_slug || 'direct'}`,
          pipeline_stage: 'new_lead',
          created_at: new Date().toISOString()
        })
        .select('id')
        .single()

      contactId = newContact?.id
    }

    // Determine device info from user agent
    const ua = user_agent || event.headers['user-agent'] || ''
    let detectedDevice = device_type || 'desktop'
    if (/mobile/i.test(ua)) detectedDevice = 'mobile'
    else if (/tablet|ipad/i.test(ua)) detectedDevice = 'tablet'

    // Detect browser
    let browser = 'unknown'
    if (/chrome/i.test(ua)) browser = 'Chrome'
    else if (/firefox/i.test(ua)) browser = 'Firefox'
    else if (/safari/i.test(ua)) browser = 'Safari'
    else if (/edge/i.test(ua)) browser = 'Edge'

    // Detect OS
    let os = 'unknown'
    if (/windows/i.test(ua)) os = 'Windows'
    else if (/mac/i.test(ua)) os = 'macOS'
    else if (/linux/i.test(ua)) os = 'Linux'
    else if (/android/i.test(ua)) os = 'Android'
    else if (/ios|iphone|ipad/i.test(ua)) os = 'iOS'

    // Create form submission
    const { data: submission, error: submitError } = await supabase
      .from('form_submissions')
      .insert({
        form_id: resolvedFormId,
        contact_id: contactId,
        email: normalizedEmail,
        name,
        phone,
        company,
        message,
        fields,
        source_page,
        source_url: source_url || event.headers.referer,
        referrer: referrer || event.headers.referer,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        user_agent: ua,
        device_type: detectedDevice,
        browser,
        os,
        ip_address: event.headers['x-forwarded-for']?.split(',')[0] || event.headers['client-ip'],
        status: 'new'
      })
      .select('id')
      .single()

    if (submitError) {
      console.error('Error creating submission:', submitError)
      return { 
        statusCode: 500, 
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Failed to save submission' }) 
      }
    }

    // Also create a lead record for backward compatibility
    await supabase
      .from('leads')
      .insert({
        email: normalizedEmail,
        name,
        phone,
        company,
        form_type: form_slug || 'direct',
        source_page,
        service_interest: fields.service || fields.serviceInterest,
        message,
        metadata: fields,
        status: 'new',
        contact_id: contactId
      })
      .catch(err => console.error('Lead sync error (non-blocking):', err))

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({ 
        success: true,
        submission_id: submission.id,
        message: 'Form submitted successfully'
      })
    }
  } catch (error) {
    console.error('Form submission error:', error)
    return { 
      statusCode: 500, 
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' }) 
    }
  }
}
