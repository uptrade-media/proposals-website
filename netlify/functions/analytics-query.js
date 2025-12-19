// netlify/functions/analytics-query.js
// Query analytics data for the Portal dashboard
// Supports both tenant-specific and aggregate queries
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id',
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

  // Verify authentication
  const { user, contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !user) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  try {
    const params = event.queryStringParameters || {}
    const { endpoint, days = '30', tenantId, domain } = params

    const supabase = createSupabaseAdmin()
    
    // Calculate date range
    const daysNum = parseInt(days) || 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysNum)
    const startDateStr = startDate.toISOString()

    // Get org context from header or params
    const orgId = event.headers['x-organization-id'] || tenantId

    // Route to appropriate query
    switch (endpoint) {
      case 'overview': {
        // Get summary metrics
        const [pageViewsResult, sessionsResult, eventsResult] = await Promise.all([
          supabase
            .from('analytics_page_views')
            .select('id', { count: 'exact' })
            .gte('created_at', startDateStr)
            .eq(orgId ? 'org_id' : 'tenant_id', orgId || 'uptrade'),
          
          supabase
            .from('analytics_page_views')
            .select('visitor_id')
            .gte('created_at', startDateStr)
            .eq(orgId ? 'org_id' : 'tenant_id', orgId || 'uptrade'),
          
          supabase
            .from('analytics_events')
            .select('id', { count: 'exact' })
            .gte('created_at', startDateStr)
            .eq(orgId ? 'org_id' : 'tenant_id', orgId || 'uptrade')
        ])

        // Calculate unique visitors
        const uniqueVisitors = new Set(sessionsResult.data?.map(r => r.visitor_id) || []).size

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            summary: {
              pageViews: pageViewsResult.count || 0,
              uniqueSessions: uniqueVisitors,
              totalSessions: sessionsResult.data?.length || 0,
              events: eventsResult.count || 0
            },
            period: { days: daysNum, startDate: startDateStr }
          })
        }
      }

      case 'page-views': {
        const { groupBy = 'path', limit = '20' } = params
        
        let query = supabase
          .from('analytics_page_views')
          .select('*')
          .gte('created_at', startDateStr)
        
        if (orgId) {
          query = query.eq('org_id', orgId)
        }

        const { data: pageViews, error } = await query
          .order('created_at', { ascending: false })
          .limit(parseInt(limit))

        if (error) throw error

        // Group by the specified field
        let grouped = []
        if (groupBy === 'path') {
          const pathCounts = {}
          pageViews?.forEach(pv => {
            pathCounts[pv.path] = (pathCounts[pv.path] || 0) + 1
          })
          grouped = Object.entries(pathCounts)
            .map(([path, count]) => ({ path, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, parseInt(limit))
        } else if (groupBy === 'day') {
          const dayCounts = {}
          pageViews?.forEach(pv => {
            const day = new Date(pv.created_at).toISOString().split('T')[0]
            dayCounts[day] = (dayCounts[day] || 0) + 1
          })
          grouped = Object.entries(dayCounts)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date))
        } else if (groupBy === 'hour') {
          const hourCounts = {}
          pageViews?.forEach(pv => {
            const hour = new Date(pv.created_at).getHours()
            hourCounts[hour] = (hourCounts[hour] || 0) + 1
          })
          grouped = Object.entries(hourCounts)
            .map(([hour, count]) => ({ hour: parseInt(hour), count }))
            .sort((a, b) => a.hour - b.hour)
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ data: grouped })
        }
      }

      case 'events': {
        const { limit = '50' } = params
        
        let query = supabase
          .from('analytics_events')
          .select('*')
          .gte('created_at', startDateStr)
        
        if (orgId) {
          query = query.eq('org_id', orgId)
        }

        const { data: events, error } = await query
          .order('created_at', { ascending: false })
          .limit(parseInt(limit))

        if (error) throw error

        // Group by event name
        const eventCounts = {}
        events?.forEach(e => {
          eventCounts[e.event_name] = (eventCounts[e.event_name] || 0) + 1
        })
        
        const grouped = Object.entries(eventCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ data: grouped, events })
        }
      }

      case 'scroll-depth': {
        let query = supabase
          .from('analytics_scroll_depth')
          .select('*')
          .gte('created_at', startDateStr)
        
        if (orgId) {
          query = query.eq('org_id', orgId)
        }

        const { data: scrollData, error } = await query

        if (error) throw error

        // Calculate average scroll depth per path
        const pathDepths = {}
        scrollData?.forEach(s => {
          if (!pathDepths[s.path]) {
            pathDepths[s.path] = { total: 0, count: 0 }
          }
          pathDepths[s.path].total += s.depth
          pathDepths[s.path].count += 1
        })

        const avgDepths = Object.entries(pathDepths)
          .map(([path, { total, count }]) => ({
            path,
            avgDepth: Math.round(total / count),
            samples: count
          }))
          .sort((a, b) => b.samples - a.samples)

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ data: avgDepths })
        }
      }

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid endpoint. Use: overview, page-views, events, scroll-depth' })
        }
    }

  } catch (error) {
    console.error('[analytics-query] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Failed to query analytics' })
    }
  }
}
