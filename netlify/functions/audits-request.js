// netlify/functions/audits-request.js
import crypto from 'crypto'
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

// Use www subdomain to avoid CORS redirect issues
const MAIN_SITE_AUDIT_ENDPOINT = process.env.MAIN_SITE_AUDIT_ENDPOINT || 'https://www.uptrademedia.com/api/audit-request'

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    // Verify authentication via Supabase
    const { contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Not authenticated' })
      }
    }

    // Parse request body
    const { url, projectId, recipientEmail, recipientName } = JSON.parse(event.body || '{}')

    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URL is required' })
      }
    }

    // Admins can send to any email, clients need a project
    const isAdmin = contact.role === 'admin'
    
    if (!isAdmin && !projectId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Project ID is required' })
      }
    }

    if (isAdmin && !recipientEmail && !projectId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Recipient email or project is required' })
      }
    }

    // Validate URL format
    let targetUrl
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
      targetUrl = urlObj.toString()
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid URL format' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Determine the contact_id for the audit
    let auditContactId = contact.id
    
    // If admin is sending to a specific email, find or create that contact
    if (isAdmin && recipientEmail) {
      // Check if contact exists
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id')
        .eq('email', recipientEmail.toLowerCase())
        .single()

      if (existingContact) {
        auditContactId = existingContact.id
      } else {
        // Create new prospect contact
        const { data: newContact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            email: recipientEmail.toLowerCase(),
            name: recipientName || null,
            role: 'client',
            source: 'audit',
            created_at: new Date().toISOString()
          })
          .select('id')
          .single()

        if (contactError) {
          console.error('Failed to create contact:', contactError)
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to create contact' })
          }
        }
        auditContactId = newContact.id
      }
    }

    // Generate magic token for the audit
    const magicToken = crypto.randomBytes(32).toString('hex')
    const magicTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    // Create audit record with magic token
    const auditData = {
      contact_id: auditContactId,
      target_url: targetUrl,
      status: 'pending',
      device_type: 'mobile',
      throttling_profile: '4g',
      magic_token: magicToken,
      magic_token_expires: magicTokenExpires.toISOString(),
      created_at: new Date().toISOString()
    }
    
    // Only include project_id if provided (column may have NOT NULL constraint)
    if (projectId) {
      auditData.project_id = projectId
    }

    const { data: newAudit, error: insertError } = await supabase
      .from('audits')
      .insert(auditData)
      .select('id')
      .single()

    if (insertError) {
      console.error('Failed to create audit:', insertError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create audit record' })
      }
    }

    // Trigger audit on main website using Portal Mode
    // Main site will run the analysis and update the record
    console.log('[audits-request] Triggering main site audit:', MAIN_SITE_AUDIT_ENDPOINT)
    console.log('[audits-request] Audit ID:', newAudit.id)
    
    try {
      const triggerResponse = await fetch(MAIN_SITE_AUDIT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          auditId: newAudit.id,
          source: 'portal',
          skipEmail: true  // Portal audits don't auto-send emails
        })
      })
      
      console.log('[audits-request] Main site response status:', triggerResponse.status)
      
      if (!triggerResponse.ok) {
        const errorText = await triggerResponse.text()
        console.error('[audits-request] Main site error:', errorText)
        
        // Update audit status to failed if main site rejects
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
      
      const result = await triggerResponse.json()
      console.log('[audits-request] Main site success:', result)
      
    } catch (err) {
      console.error('[audits-request] Failed to trigger audit on main site:', err)
      
      // Update audit status to failed
      await supabase
        .from('audits')
        .update({ status: 'failed' })
        .eq('id', newAudit.id)
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to connect to audit service',
          details: err.message
        })
      }
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        auditId: newAudit.id,
        status: 'pending',
        message: 'Audit queued for processing. This usually takes 2-3 minutes.'
      })
    }

  } catch (error) {
    console.error('Error requesting audit:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to request audit' })
    }
  }
}
