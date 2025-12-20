// netlify/functions/analytics-query.js
// Query analytics data for the Portal dashboard
// Supports both tenant-specific and aggregate queries
// Enhanced for multi-tenant architecture with full parity to main site
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id, X-Tenant-Id',
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
    const { endpoint, days = '30', tenantId, domain, path: filterPath } = params

    const supabase = createSupabaseAdmin()
    
    // Calculate date range
    const daysNum = parseInt(days) || 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysNum)
    const startDateStr = startDate.toISOString()
    
    // Calculate previous period for trend comparison
    const prevPeriodStart = new Date(startDate)
    prevPeriodStart.setDate(prevPeriodStart.getDate() - daysNum)
    const prevPeriodStartStr = prevPeriodStart.toISOString()

    // Get org context from header or params
    const orgId = event.headers['x-organization-id'] || event.headers['x-tenant-id'] || tenantId

    // Route to appropriate query
    switch (endpoint) {
      case 'overview': {
        // Build filter condition helper
        const buildFilter = (query) => {
          if (orgId) {
            return query.eq('org_id', orgId)
          } else if (domain) {
            return query.ilike('path', `%${domain}%`)
          }
          return query.eq('tenant_id', 'uptrade')
        }

        // Current period queries
        const [
          pageViewsResult,
          prevPageViewsResult,
          sessionsResult,
          prevSessionsResult,
          eventsResult,
          scrollResult,
          topPagesResult,
          referrersResult,
          deviceResult
        ] = await Promise.all([
          // Current period page views
          buildFilter(supabase
            .from('analytics_page_views')
            .select('id, visitor_id, device_type, browser, referrer, path, created_at')
            .gte('created_at', startDateStr)),
          
          // Previous period page views (for trend)
          buildFilter(supabase
            .from('analytics_page_views')
            .select('id', { count: 'exact' })
            .gte('created_at', prevPeriodStartStr)
            .lt('created_at', startDateStr)),
          
          // Current period sessions
          buildFilter(supabase
            .from('analytics_sessions')
            .select('id, visitor_id, duration_seconds, page_count, device_type, browser, os, utm_source, referrer, converted, started_at')
            .gte('started_at', startDateStr)),
          
          // Previous period sessions
          buildFilter(supabase
            .from('analytics_sessions')
            .select('id', { count: 'exact' })
            .gte('started_at', prevPeriodStartStr)
            .lt('started_at', startDateStr)),
          
          // Events
          buildFilter(supabase
            .from('analytics_events')
            .select('id, event_name, event_category', { count: 'exact' })
            .gte('created_at', startDateStr)),
          
          // Scroll depth (avg)
          buildFilter(supabase
            .from('analytics_scroll_depth')
            .select('depth, max_depth_percent, path')
            .gte('created_at', startDateStr)),
          
          // Top pages
          buildFilter(supabase
            .from('analytics_page_views')
            .select('path')
            .gte('created_at', startDateStr)),
          
          // Referrers
          buildFilter(supabase
            .from('analytics_page_views')
            .select('referrer')
            .gte('created_at', startDateStr)
            .not('referrer', 'is', null)),
          
          // Device breakdown
          buildFilter(supabase
            .from('analytics_page_views')
            .select('device_type')
            .gte('created_at', startDateStr))
        ])

        // Calculate unique visitors
        const pageViews = pageViewsResult.data || []
        const sessions = sessionsResult.data || []
        const uniqueVisitors = new Set(pageViews.map(r => r.visitor_id).filter(Boolean)).size
        const prevUniqueVisitors = new Set((prevSessionsResult.data || []).map(r => r.visitor_id)).size
        
        // Calculate page views trend
        const pageViewsTrend = prevPageViewsResult.count > 0 
          ? ((pageViews.length - prevPageViewsResult.count) / prevPageViewsResult.count * 100).toFixed(1)
          : 0
        
        // Avg session duration
        const avgDuration = sessions.length > 0
          ? Math.round(sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / sessions.length)
          : 0
        
        // Avg pages per session
        const avgPagesPerSession = sessions.length > 0
          ? (sessions.reduce((sum, s) => sum + (s.page_count || 0), 0) / sessions.length).toFixed(1)
          : 0
        
        // Bounce rate (sessions with only 1 page)
        const bounces = sessions.filter(s => (s.page_count || 1) <= 1).length
        const bounceRate = sessions.length > 0 ? ((bounces / sessions.length) * 100).toFixed(1) : 0
        
        // Conversion rate
        const conversions = sessions.filter(s => s.converted).length
        const conversionRate = sessions.length > 0 ? ((conversions / sessions.length) * 100).toFixed(2) : 0
        
        // Average scroll depth
        const scrollData = scrollResult.data || []
        const avgScrollDepth = scrollData.length > 0
          ? Math.round(scrollData.reduce((sum, s) => sum + (s.max_depth_percent || s.depth || 0), 0) / scrollData.length)
          : 0

        // Top pages aggregation
        const pageCounts = {}
        topPagesResult.data?.forEach(pv => {
          pageCounts[pv.path] = (pageCounts[pv.path] || 0) + 1
        })
        const topPages = Object.entries(pageCounts)
          .map(([path, count]) => ({ path, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
        
        // Referrer aggregation
        const referrerCounts = {}
        referrersResult.data?.forEach(r => {
          if (r.referrer) {
            try {
              const domain = new URL(r.referrer).hostname.replace('www.', '')
              referrerCounts[domain] = (referrerCounts[domain] || 0) + 1
            } catch {
              referrerCounts[r.referrer] = (referrerCounts[r.referrer] || 0) + 1
            }
          }
        })
        const topReferrers = Object.entries(referrerCounts)
          .map(([source, count]) => ({ source, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
        
        // Device breakdown
        const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 }
        deviceResult.data?.forEach(d => {
          const type = (d.device_type || 'desktop').toLowerCase()
          if (deviceCounts[type] !== undefined) {
            deviceCounts[type]++
          } else {
            deviceCounts.desktop++
          }
        })
        const totalDevices = Object.values(deviceCounts).reduce((a, b) => a + b, 0)
        const deviceBreakdown = Object.entries(deviceCounts).map(([device, count]) => ({
          device,
          count,
          percentage: totalDevices > 0 ? ((count / totalDevices) * 100).toFixed(1) : 0
        }))
        
        // Page views by day for chart
        const dailyCounts = {}
        pageViews.forEach(pv => {
          const day = new Date(pv.created_at).toISOString().split('T')[0]
          dailyCounts[day] = (dailyCounts[day] || 0) + 1
        })
        const dailyPageViews = Object.entries(dailyCounts)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date))

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            summary: {
              pageViews: pageViews.length,
              pageViewsTrend: parseFloat(pageViewsTrend),
              uniqueVisitors,
              totalSessions: sessions.length,
              avgSessionDuration: avgDuration,
              avgPagesPerSession: parseFloat(avgPagesPerSession),
              bounceRate: parseFloat(bounceRate),
              conversionRate: parseFloat(conversionRate),
              avgScrollDepth,
              events: eventsResult.count || 0,
              conversions
            },
            topPages,
            topReferrers,
            deviceBreakdown,
            dailyPageViews,
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
        
        if (filterPath) {
          query = query.eq('page_path', filterPath)
        }

        const { data: vitals, error } = await query

        if (error) throw error

        // Calculate P75 and ratings for each metric (matching main site behavior)
        const metrics = { LCP: [], FID: [], CLS: [], INP: [], TTFB: [], FCP: [] }
        const ratings = { LCP: { good: 0, 'needs-improvement': 0, poor: 0 }, FID: { good: 0, 'needs-improvement': 0, poor: 0 }, CLS: { good: 0, 'needs-improvement': 0, poor: 0 }, INP: { good: 0, 'needs-improvement': 0, poor: 0 }, TTFB: { good: 0, 'needs-improvement': 0, poor: 0 }, FCP: { good: 0, 'needs-improvement': 0, poor: 0 } }
        
        vitals?.forEach(v => {
          const name = (v.metric_name || '').toUpperCase()
          if (metrics[name]) {
            metrics[name].push(v.metric_value)
            if (v.metric_rating && ratings[name][v.metric_rating]) {
              ratings[name][v.metric_rating]++
            }
          }
        })

        const calcP75 = (arr) => {
          if (!arr.length) return null
          const sorted = [...arr].sort((a, b) => a - b)
          return sorted[Math.floor(sorted.length * 0.75)]
        }
        
        const calcAvg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null
        
        // Format result like main site
        const result = {}
        for (const [name, values] of Object.entries(metrics)) {
          const p75 = calcP75(values)
          result[name.toLowerCase()] = {
            p75: p75 !== null ? (name === 'CLS' ? parseFloat(p75.toFixed(3)) : Math.round(p75)) : null,
            avg: calcAvg(values) !== null ? (name === 'CLS' ? parseFloat(calcAvg(values).toFixed(3)) : Math.round(calcAvg(values))) : null,
            samples: values.length,
            ratings: ratings[name],
            // Threshold status
            status: p75 !== null ? getVitalStatus(name, p75) : 'no-data'
          }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(result)
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
        // Get heatmap data from the dedicated heatmap clicks table
        let query = supabase
          .from('analytics_heatmap_clicks')
          .select('*')
          .gte('created_at', startDateStr)
        
        if (orgId) {
          query = query.eq('org_id', orgId)
        }
        
        if (filterPath) {
          query = query.eq('page_path', filterPath)
        }

        const { data: clicks, error } = await query

        if (error) {
          // Fallback to events table if heatmap table doesn't exist yet
          console.log('[analytics-query] Falling back to events table for heatmap data')
          let fallbackQuery = supabase
            .from('analytics_events')
            .select('*')
            .eq('event_name', 'click')
            .gte('created_at', startDateStr)
          
          if (orgId) {
            fallbackQuery = fallbackQuery.eq('org_id', orgId)
          }
          
          const { data: eventClicks, error: fallbackError } = await fallbackQuery
          
          if (fallbackError) throw fallbackError
          
          // Group clicks by element/path
          const clickMap = {}
          eventClicks?.forEach(c => {
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

        // Group clicks by zones (10% x 10% grid)
        const zones = {}
        const topElements = {}
        
        clicks?.forEach(c => {
          // Zone aggregation (10% grid)
          const zoneX = Math.floor((c.x_percent || 0) / 10) * 10
          const zoneY = Math.floor((c.y_percent || 0) / 10) * 10
          const zoneKey = `${zoneX}-${zoneY}`
          
          if (!zones[zoneKey]) {
            zones[zoneKey] = { 
              x: zoneX, 
              y: zoneY, 
              count: 0,
              xRange: `${zoneX}-${zoneX + 10}%`,
              yRange: `${zoneY}-${zoneY + 10}%`
            }
          }
          zones[zoneKey].count++
          
          // Top elements aggregation
          const elemKey = `${c.element_tag || 'unknown'}:${c.element_id || c.element_class || 'no-id'}`
          if (!topElements[elemKey]) {
            topElements[elemKey] = {
              tag: c.element_tag,
              id: c.element_id,
              class: c.element_class,
              text: c.element_text?.slice(0, 50),
              count: 0,
              pages: new Set()
            }
          }
          topElements[elemKey].count++
          topElements[elemKey].pages.add(c.page_path)
        })

        // Convert to arrays and sort
        const sortedZones = Object.values(zones)
          .sort((a, b) => b.count - a.count)
        
        const sortedElements = Object.values(topElements)
          .map(e => ({ ...e, pages: Array.from(e.pages) }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 30)

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            zones: sortedZones,
            topElements: sortedElements,
            totalClicks: clicks?.length || 0
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

// Helper function to determine web vital status based on thresholds
function getVitalStatus(metric, value) {
  const thresholds = {
    LCP: { good: 2500, poor: 4000 },
    FID: { good: 100, poor: 300 },
    CLS: { good: 0.1, poor: 0.25 },
    INP: { good: 200, poor: 500 },
    TTFB: { good: 800, poor: 1800 },
    FCP: { good: 1800, poor: 3000 }
  }
  
  const t = thresholds[metric]
  if (!t) return 'unknown'
  
  if (value <= t.good) return 'good'
  if (value <= t.poor) return 'needs-improvement'
  return 'poor'
}
