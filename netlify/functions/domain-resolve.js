// netlify/functions/domain-resolve.js
// Resolves a domain to a tenant ID (for tracking script)
// Public endpoint - no auth required

import { createSupabaseAdmin } from './utils/supabase.js'

export async function handler(event) {
  const { domain } = event.queryStringParameters || {}

  if (!domain) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Domain required' })
    }
  }

  try {
    const supabase = createSupabaseAdmin()

    // Look up project by tenant_domain
    const { data: project } = await supabase
      .from('projects')
      .select('id, tenant_tracking_id, is_tenant')
      .eq('tenant_domain', domain)
      .eq('is_tenant', true)
      .single()

    if (project) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400' // Cache 24 hours
        },
        body: JSON.stringify({
          domain,
          tenantId: project.tenant_tracking_id || project.id,
          found: true
        })
      }
    }

    // Not found - return domain as fallback
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        domain,
        tenantId: null,
        found: false
      })
    }
  } catch (error) {
    console.error('[domain-resolve] Error:', error)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    }
  }
}
