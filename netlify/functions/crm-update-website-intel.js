/**
 * CRM Update Website Intel Function
 * 
 * Receives website intelligence data pushed from the Chrome extension.
 * Updates the contact record with tech stack, performance metrics, etc.
 * 
 * The extension captures this data while the user browses a prospect's website.
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

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

    // Only admins can push website intel
    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      }
    }

    const body = JSON.parse(event.body || '{}')
    const { 
      contactId, 
      url,
      techStack,
      healthMetrics,
      rebuildScore,
      aiSummary,
      // Optional: extension can provide these
      screenshotUrl,
      pageTitle,
      metaDescription
    } = body

    if (!contactId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'contactId is required' })
      }
    }

    // At least one piece of intel should be provided
    if (!techStack && !healthMetrics && !rebuildScore && !aiSummary) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'At least one intel field is required (techStack, healthMetrics, rebuildScore, or aiSummary)' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Verify contact exists
    const { data: existingContact, error: contactError } = await supabase
      .from('contacts')
      .select('id, website, tech_stack, health_metrics')
      .eq('id', contactId)
      .single()

    if (contactError || !existingContact) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Contact not found' })
      }
    }

    console.log(`[crm-update-website-intel] Updating contact ${contactId} from extension`)

    // Build update object - merge with existing data where appropriate
    const updateData = {
      website_analyzed_at: new Date().toISOString()
    }

    // Update URL if provided
    if (url) {
      try {
        const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
        updateData.website = urlObj.origin
      } catch {
        // Invalid URL, ignore
      }
    }

    // Tech stack - merge with existing
    if (techStack) {
      const existingTech = existingContact.tech_stack || {}
      updateData.tech_stack = {
        ...existingTech,
        ...techStack,
        // Keep track of when extension updated this
        extensionUpdatedAt: new Date().toISOString()
      }
    }

    // Health metrics - merge with existing
    if (healthMetrics) {
      const existingMetrics = existingContact.health_metrics || {}
      updateData.health_metrics = {
        ...existingMetrics,
        ...healthMetrics,
        extensionUpdatedAt: new Date().toISOString()
      }
    }

    // Rebuild score - use new value
    if (typeof rebuildScore === 'number') {
      updateData.rebuild_score = Math.max(0, Math.min(100, rebuildScore))
    }

    // AI summary - use new value
    if (aiSummary) {
      updateData.ai_summary = aiSummary
    }

    // Optional metadata in notes or separate fields
    // We can store extension-provided metadata in tech_stack
    if (screenshotUrl || pageTitle || metaDescription) {
      updateData.tech_stack = {
        ...(updateData.tech_stack || existingContact.tech_stack || {}),
        pageTitle,
        metaDescription,
        screenshotUrl
      }
    }

    // Update the contact
    const { error: updateError } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', contactId)

    if (updateError) {
      console.error('[crm-update-website-intel] Update error:', updateError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update contact' })
      }
    }

    console.log(`[crm-update-website-intel] Updated contact ${contactId} successfully`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        updated: Object.keys(updateData)
      })
    }

  } catch (error) {
    console.error('[crm-update-website-intel] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
