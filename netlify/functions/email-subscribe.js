/**
 * Email Subscribe - Public endpoint for email subscriptions from tenant sites
 * No authentication required - for newsletter signups, footer forms, etc.
 */

import { createSupabaseAdmin } from './utils/supabase.js'

export async function handler(event) {
  // CORS headers - allow all origins for public form submissions
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Tenant-ID, X-Organization-Id',
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
    const body = JSON.parse(event.body || '{}')
    const {
      email,
      first_name,
      firstName,
      last_name,
      lastName,
      source = 'website',
      tags = [],
      tenant_id,
      tenantId,
    } = body

    // Support both snake_case and camelCase
    const finalEmail = email
    const finalFirstName = first_name || firstName
    const finalLastName = last_name || lastName
    const finalTenantId = tenant_id || tenantId || event.headers['x-tenant-id']
    const orgId = event.headers['x-organization-id']

    if (!finalEmail) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email is required' })
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(finalEmail)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid email format' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Look up org_id from tenant if provided
    let subscriberOrgId = orgId
    if (!subscriberOrgId && finalTenantId) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('org_id')
        .eq('id', finalTenantId)
        .single()
      
      if (tenant?.org_id) {
        subscriberOrgId = tenant.org_id
      }
    }

    // Check if subscriber already exists
    let query = supabase
      .from('email_subscribers')
      .select('id, status, tags')
      .eq('email', finalEmail.toLowerCase())

    if (subscriberOrgId) {
      query = query.eq('org_id', subscriberOrgId)
    }

    const { data: existing } = await query.single()

    let subscriber

    if (existing) {
      // Update existing subscriber - resubscribe if unsubscribed
      const existingTags = existing.tags || []
      const mergedTags = [...new Set([...existingTags, ...tags])]

      const { data, error: updateError } = await supabase
        .from('email_subscribers')
        .update({
          first_name: finalFirstName,
          last_name: finalLastName,
          status: 'subscribed',
          tags: mergedTags,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (updateError) {
        console.error('[Email Subscribe] Update error:', updateError)
        throw updateError
      }

      subscriber = data
      console.log('[Email Subscribe] Updated existing subscriber:', finalEmail)
    } else {
      // Create new subscriber
      const { data, error: createError } = await supabase
        .from('email_subscribers')
        .insert({
          org_id: subscriberOrgId || null,
          email: finalEmail.toLowerCase(),
          first_name: finalFirstName,
          last_name: finalLastName,
          tags,
          source,
          source_details: {
            tenant_id: finalTenantId,
            referrer: event.headers.referer || event.headers.origin
          },
          status: 'subscribed',
          subscribed_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        console.error('[Email Subscribe] Create error:', createError)
        throw createError
      }

      subscriber = data
      console.log('[Email Subscribe] Created new subscriber:', finalEmail)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Successfully subscribed!',
        subscriber: {
          id: subscriber.id,
          email: subscriber.email
        }
      })
    }
  } catch (error) {
    console.error('[Email Subscribe] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to subscribe',
        details: error.message
      })
    }
  }
}
