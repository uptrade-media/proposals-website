// netlify/functions/analytics-debug.js
// Debug endpoint to check raw analytics data in database
// Requires admin authentication

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !contact || contact.role !== 'admin') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Admin authentication required' })
      }
    }

    const supabase = createSupabaseAdmin()
    const { table = 'analytics_page_views' } = event.queryStringParameters || {}

    // Get counts by table
    const { data: pageViewsCount, error: pvError } = await supabase
      .from('analytics_page_views')
      .select('id', { count: 'exact', head: true })

    const { data: sessionsCount, error: sessError } = await supabase
      .from('analytics_sessions')
      .select('id', { count: 'exact', head: true })

    const { data: eventsCount, error: evError } = await supabase
      .from('analytics_events')
      .select('id', { count: 'exact', head: true })

    // Get projects with is_tenant=true
    const { data: tenantProjects } = await supabase
      .from('projects')
      .select('id, title, tenant_tracking_id, tenant_domain, is_tenant')
      .eq('is_tenant', true)

    // Get sample records by tenant_id
    const { data: pageViewSamples } = await supabase
      .from('analytics_page_views')
      .select('id, tenant_id, org_id, path, created_at')
      .limit(5)
      .order('created_at', { ascending: false })

    const { data: sessionSamples } = await supabase
      .from('analytics_sessions')
      .select('id, tenant_id, org_id, started_at')
      .limit(5)
      .order('started_at', { ascending: false })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        counts: {
          pageViews: pageViewsCount?.length || 0,
          sessions: sessionsCount?.length || 0,
          events: eventsCount?.length || 0
        },
        tenantProjects: tenantProjects?.map(p => ({
          id: p.id,
          title: p.title,
          tracking_id: p.tenant_tracking_id,
          domain: p.tenant_domain
        })),
        samples: {
          pageViews: pageViewSamples || [],
          sessions: sessionSamples || []
        },
        tenantIdBreakdown: {
          pageViews: pageViewSamples?.reduce((acc, pv) => {
            acc[pv.tenant_id || 'null'] = (acc[pv.tenant_id || 'null'] || 0) + 1
            return acc
          }, {}),
          sessions: sessionSamples?.reduce((acc, s) => {
            acc[s.tenant_id || 'null'] = (acc[s.tenant_id || 'null'] || 0) + 1
            return acc
          }, {})
        }
      })
    }
  } catch (error) {
    console.error('[analytics-debug] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
