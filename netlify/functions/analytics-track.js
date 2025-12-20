// netlify/functions/analytics-track.js
// Receives analytics events from tenant sites and stores them in the database
import { createSupabaseAdmin } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Tenant-ID, Authorization',
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
    // Parse the event data
    const data = JSON.parse(event.body || '{}')
    const { event: eventName, properties, tenantId, orgId: providedOrgId, timestamp, url, referrer, visitorId, sessionId } = data

    if (!eventName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Event name is required' })
      }
    }

    // Get tenant ID from header or body
    const tenant = event.headers['x-tenant-id'] || tenantId
    
    // Get org ID from header or body (prioritize explicit org_id)
    const orgIdFromHeader = event.headers['x-organization-id'] || providedOrgId
    
    if (!tenant && !orgIdFromHeader) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Tenant ID or Organization ID is required' })
      }
    }

    const supabase = createSupabaseAdmin()
    
    // Use provided org_id if available, otherwise try to look it up
    let orgId = orgIdFromHeader

    if (!orgId && tenant) {
      // Look up the project/tenant to get the org_id
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, org_id, tenant_tracking_id')
        .or(`tenant_tracking_id.eq.${tenant},id.eq.${tenant}`)
        .eq('is_tenant', true)
        .single()

      if (!projectError && project) {
        orgId = project.org_id || project.id
      } else {
        // Try organizations table as fallback
        const { data: org } = await supabase
          .from('organizations')
          .select('id, slug')
          .or(`slug.eq.${tenant},id.eq.${tenant}`)
          .single()

        if (org) {
          orgId = org.id
        } else {
          console.warn('[analytics-track] Unknown tenant:', tenant, '- storing with tenant_id only')
        }
      }
    }

    // Parse URL to get path
    let path = '/'
    try {
      const parsedUrl = new URL(url || 'https://example.com/')
      path = parsedUrl.pathname
    } catch (e) {
      // Keep default path
    }

    // Use tenant as fallback for org_id if still not found
    const effectiveOrgId = orgId || tenant

    if (eventName === 'page_view') {
      // Store page view in analytics_page_views
      await supabase.from('analytics_page_views').insert({
        tenant_id: tenant,
        org_id: effectiveOrgId,
        session_id: sessionId,
        visitor_id: visitorId,
        path,
        title: properties?.page || properties?.title,
        referrer,
        created_at: new Date(timestamp || Date.now()).toISOString()
      })
    } else if (eventName === 'scroll_depth') {
      // Store scroll depth
      await supabase.from('analytics_scroll_depth').insert({
        tenant_id: tenant,
        org_id: effectiveOrgId,
        session_id: sessionId,
        path,
        depth: properties?.depth || 0,
        created_at: new Date(timestamp || Date.now()).toISOString()
      })
    } else {
      // Store general event
      await supabase.from('analytics_events').insert({
        tenant_id: tenant,
        org_id: effectiveOrgId,
        session_id: sessionId,
        visitor_id: visitorId,
        event_name: eventName,
        properties: properties || {},
        path,
        referrer,
        created_at: new Date(timestamp || Date.now()).toISOString()
      })
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    }

  } catch (error) {
    console.error('[analytics-track] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to track event' })
    }
  }
}
