/**
 * CRM Generate Audit Function
 * 
 * Triggers a full website audit for a CRM contact.
 * Uses the existing audit infrastructure via audits-request pattern.
 * Links the audit to the contact via contact_id.
 */

import crypto from 'crypto'
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { requireTeamMember } from './utils/permissions.js'

// Use www subdomain to avoid CORS redirect issues
const MAIN_SITE_AUDIT_ENDPOINT = process.env.MAIN_SITE_AUDIT_ENDPOINT || 'https://www.uptrademedia.com/api/audit-request'

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
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Verify authentication
    const { contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Not authenticated' })
      }
    }

    // Require team member access
    try {
      requireTeamMember(contact)
    } catch (err) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: err.message })
      }
    }

    const { contactId, url } = JSON.parse(event.body || '{}')

    if (!contactId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'contactId is required' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Get contact details
    const { data: targetContact, error: contactError } = await supabase
      .from('contacts')
      .select('id, email, name, website')
      .eq('id', contactId)
      .single()

    if (contactError || !targetContact) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Contact not found' })
      }
    }

    // Use provided URL or fall back to contact's website
    const targetUrl = url || targetContact.website
    
    if (!targetUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No URL provided and contact has no website' })
      }
    }

    // Validate URL format
    let normalizedUrl
    try {
      const urlObj = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`)
      normalizedUrl = urlObj.toString()
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid URL format' })
      }
    }

    console.log(`[crm-generate-audit] Creating audit for contact ${contactId}: ${normalizedUrl}`)

    // Generate magic token for the audit (allows viewing without login)
    const magicToken = crypto.randomBytes(32).toString('hex')
    const magicTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    // Create audit record
    const auditData = {
      contact_id: contactId,
      target_url: normalizedUrl,
      status: 'pending',
      device_type: 'mobile',
      throttling_profile: '4g',
      magic_token: magicToken,
      magic_token_expires: magicTokenExpires.toISOString(),
      created_by: contact.id, // Track who created this audit
      source: 'portal', // Track source (portal vs extension vs api)
      created_at: new Date().toISOString()
    }

    const { data: newAudit, error: insertError } = await supabase
      .from('audits')
      .insert(auditData)
      .select('id')
      .single()

    if (insertError) {
      console.error('[crm-generate-audit] Insert error:', insertError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create audit record' })
      }
    }

    console.log(`[crm-generate-audit] Created audit ${newAudit.id}, triggering main site`)

    // Trigger audit on main website
    try {
      const triggerResponse = await fetch(MAIN_SITE_AUDIT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          auditId: newAudit.id,
          source: 'portal-crm',
          skipEmail: true  // CRM audits don't auto-send emails
        })
      })

      if (!triggerResponse.ok) {
        const errorText = await triggerResponse.text()
        console.error('[crm-generate-audit] Main site error:', errorText)
        
        // Update audit status to failed
        await supabase
          .from('audits')
          .update({ status: 'failed' })
          .eq('id', newAudit.id)
        
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Failed to start audit analysis',
            details: errorText
          })
        }
      }

      console.log(`[crm-generate-audit] Audit ${newAudit.id} triggered successfully`)

    } catch (triggerError) {
      console.error('[crm-generate-audit] Trigger error:', triggerError.message)
      
      // Update audit status to failed
      await supabase
        .from('audits')
        .update({ status: 'failed' })
        .eq('id', newAudit.id)
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to trigger audit: ' + triggerError.message })
      }
    }

    // Update contact's last_audit_id
    await supabase
      .from('contacts')
      .update({ 
        last_audit_id: newAudit.id,
        website: normalizedUrl // Ensure website is set
      })
      .eq('id', contactId)

    // Build magic link URL for the audit
    const portalBaseUrl = process.env.PORTAL_BASE_URL || 'https://portal.uptrademedia.com'
    const auditUrl = `${portalBaseUrl}/audit/${newAudit.id}?token=${magicToken}`

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        audit: {
          id: newAudit.id,
          url: normalizedUrl,
          status: 'pending',
          magicLink: auditUrl
        }
      })
    }

  } catch (error) {
    console.error('[crm-generate-audit] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
