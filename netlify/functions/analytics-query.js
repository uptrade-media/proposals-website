// netlify/functions/analytics-query.js
// Query analytics data for the Portal dashboard
// Supports both tenant-specific and aggregate queries
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
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
  const { user, contact, isSuperAdmin, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !user) {
    console.log('[analytics-query] Auth failed:', authError?.message || 'No user')
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }
  
  console.log('[analytics-query] Auth success:', { email: user.email, isSuperAdmin })

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

      case 'web-vitals': {
        let query = supabase
          .from('analytics_web_vitals')
          .select('*')
          .gte('created_at', startDateStr)
        
        if (orgId) {
          query = query.eq('org_id', orgId)
        }

        const { data: vitals, error } = await query

        if (error) throw error

        // Calculate averages for each metric
        const metrics = { lcp: [], fid: [], cls: [], inp: [], ttfb: [], fcp: [] }
        vitals?.forEach(v => {
          if (v.metric_name && metrics[v.metric_name.toLowerCase()]) {
            metrics[v.metric_name.toLowerCase()].push(v.value)
          }
        })

        const calcAvg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null
        const calcP75 = (arr) => {
          if (!arr.length) return null
          const sorted = [...arr].sort((a, b) => a - b)
          return sorted[Math.floor(sorted.length * 0.75)]
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            lcp: { avg: calcAvg(metrics.lcp), p75: calcP75(metrics.lcp), samples: metrics.lcp.length },
            fid: { avg: calcAvg(metrics.fid), p75: calcP75(metrics.fid), samples: metrics.fid.length },
            cls: { avg: calcAvg(metrics.cls), p75: calcP75(metrics.cls), samples: metrics.cls.length },
            inp: { avg: calcAvg(metrics.inp), p75: calcP75(metrics.inp), samples: metrics.inp.length },
            ttfb: { avg: calcAvg(metrics.ttfb), p75: calcP75(metrics.ttfb), samples: metrics.ttfb.length },
            fcp: { avg: calcAvg(metrics.fcp), p75: calcP75(metrics.fcp), samples: metrics.fcp.length }
          })
        }
      }

      case 'sessions': {
        let query = supabase
          .from('analytics_page_views')
          .select('visitor_id, session_id, created_at, path, referrer, device_type, browser')
          .gte('created_at', startDateStr)
        
        if (orgId) {
          query = query.eq('org_id', orgId)
        }

        const { data: pageViews, error } = await query
          .order('created_at', { ascending: false })

        if (error) throw error

        // Group by session
        const sessions = {}
        pageViews?.forEach(pv => {
          const sessionKey = pv.session_id || pv.visitor_id
          if (!sessions[sessionKey]) {
            sessions[sessionKey] = {
              sessionId: sessionKey,
              visitorId: pv.visitor_id,
              pages: [],
              startTime: pv.created_at,
              endTime: pv.created_at,
              deviceType: pv.device_type,
              browser: pv.browser,
              referrer: pv.referrer
            }
          }
          sessions[sessionKey].pages.push(pv.path)
          if (new Date(pv.created_at) < new Date(sessions[sessionKey].startTime)) {
            sessions[sessionKey].startTime = pv.created_at
          }
          if (new Date(pv.created_at) > new Date(sessions[sessionKey].endTime)) {
            sessions[sessionKey].endTime = pv.created_at
          }
        })

        const sessionList = Object.values(sessions)
          .map(s => ({
            ...s,
            pageCount: s.pages.length,
            duration: (new Date(s.endTime) - new Date(s.startTime)) / 1000
          }))
          .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
          .slice(0, 100)

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            sessions: sessionList,
            totalSessions: Object.keys(sessions).length,
            avgPagesPerSession: sessionList.length ? 
              Math.round(sessionList.reduce((a, b) => a + b.pageCount, 0) / sessionList.length * 10) / 10 : 0
          })
        }
      }

      case 'heatmap': {
        // Heatmap data from click events
        let query = supabase
          .from('analytics_events')
          .select('*')
          .eq('event_name', 'click')
          .gte('created_at', startDateStr)
        
        if (orgId) {
          query = query.eq('org_id', orgId)
        }

        const { data: clicks, error } = await query

        if (error) throw error

        // Group clicks by element/path
        const clickMap = {}
        clicks?.forEach(c => {
          const key = `${c.path}:${c.properties?.element || 'unknown'}`
          if (!clickMap[key]) {
            clickMap[key] = { path: c.path, element: c.properties?.element, count: 0 }
          }
          clickMap[key].count++
        })

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            data: Object.values(clickMap).sort((a, b) => b.count - a.count).slice(0, 50)
          })
        }
      }

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid endpoint. Use: overview, page-views, events, scroll-depth, web-vitals, sessions, heatmap' })
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
