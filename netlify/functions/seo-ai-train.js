// netlify/functions/seo-ai-train.js
// Trigger AI training - validates request and kicks off background function
// Returns immediately, actual training happens in seo-ai-train-background.mjs
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const { contact, isSuperAdmin, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  // Only admins can train
  const isAdmin = contact.role === 'admin' || contact.role === 'super_admin' || isSuperAdmin
  if (!isAdmin) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin access required' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { siteId, forceRefresh = false } = body

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId is required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Get site info
    const { data: site, error: siteError } = await supabase
      .from('seo_sites')
      .select('*, org:organizations(domain)')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Site not found' }) }
    }

    // Check existing knowledge base
    const { data: existingKb } = await supabase
      .from('seo_knowledge_base')
      .select('*')
      .eq('site_id', siteId)
      .single()

    // If already training, return status
    if (existingKb?.training_status === 'in_progress') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          status: 'in_progress',
          message: 'Training already in progress',
          knowledge: existingKb
        })
      }
    }

    // If already trained and not forcing refresh
    if (existingKb && !forceRefresh && existingKb.training_status === 'completed') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          status: 'completed',
          message: 'Site already trained. Use forceRefresh to retrain.',
          knowledge: existingKb
        })
      }
    }

    // Set status to in_progress immediately
    await supabase
      .from('seo_knowledge_base')
      .upsert({
        site_id: siteId,
        training_status: 'in_progress',
        updated_at: new Date().toISOString()
      }, { onConflict: 'site_id' })

    // Trigger background function
    const baseUrl = process.env.URL || `https://${event.headers.host}`
    const backgroundUrl = `${baseUrl}/.netlify/functions/seo-ai-train-background`

    // Fire and forget - don't await
    fetch(backgroundUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        siteId,
        userId: contact.id,
        forceRefresh
      })
    }).catch(err => {
      console.error('[AI Train] Failed to trigger background function:', err)
    })

    return {
      statusCode: 202, // Accepted
      headers,
      body: JSON.stringify({
        success: true,
        status: 'in_progress',
        message: 'AI training started. This may take a few minutes.',
        siteId
      })
    }

  } catch (error) {
    console.error('[AI Train] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
