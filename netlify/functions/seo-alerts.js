// netlify/functions/seo-alerts.js
// Intelligent SEO alerting system
// Monitors ranking changes, traffic drops, and issues
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import { google } from 'googleapis'
import { Resend } from 'resend'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id',
    'Access-Control-Allow-Methods': 'POST, GET, PUT, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  // GET - Fetch alerts
  if (event.httpMethod === 'GET') {
    return await getAlerts(event, headers)
  }

  // POST - Check for new alerts or create manual alert
  if (event.httpMethod === 'POST') {
    return await checkAlerts(event, headers)
  }

  // PUT - Update alert (dismiss, acknowledge)
  if (event.httpMethod === 'PUT') {
    return await updateAlert(event, headers)
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
}

// Get alerts for a site
async function getAlerts(event, headers) {
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const { siteId, status, severity, limit = 50 } = event.queryStringParameters || {}

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
    }

    const supabase = createSupabaseAdmin()

    let query = supabase
      .from('seo_alerts')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))

    if (status) {
      query = query.eq('status', status)
    }
    if (severity) {
      query = query.eq('severity', severity)
    }

    const { data: alerts, error } = await query

    if (error) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
    }

    // Get summary
    const { data: summary } = await supabase
      .from('seo_alerts')
      .select('status, severity')
      .eq('site_id', siteId)

    const stats = {
      total: summary?.length || 0,
      active: summary?.filter(a => a.status === 'active').length || 0,
      critical: summary?.filter(a => a.severity === 'critical' && a.status === 'active').length || 0,
      warning: summary?.filter(a => a.severity === 'warning' && a.status === 'active').length || 0
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ alerts, stats })
    }

  } catch (error) {
    console.error('[Alerts] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}

// Check for new alerts
async function checkAlerts(event, headers) {
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { siteId, sendNotifications = false } = body

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
    }

    const supabase = createSupabaseAdmin()

    // Fetch site details
    const { data: site, error: siteError } = await supabase
      .from('seo_sites')
      .select('*, org:organizations(domain, name)')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Site not found' }) }
    }

    const domain = site.org?.domain || site.domain
    const alerts = []

    // Initialize GSC
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}'),
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
    })
    const searchConsole = google.searchconsole({ version: 'v1', auth })
    const siteUrl = `sc-domain:${domain.replace(/^(https?:\/\/)?(www\.)?/, '')}`

    const today = new Date()
    
    // Check 1: Traffic drop (compare last 7 days to previous 7 days)
    try {
      const recentEnd = new Date(today)
      recentEnd.setDate(recentEnd.getDate() - 3)
      const recentStart = new Date(recentEnd)
      recentStart.setDate(recentStart.getDate() - 7)
      
      const previousEnd = new Date(recentStart)
      previousEnd.setDate(previousEnd.getDate() - 1)
      const previousStart = new Date(previousEnd)
      previousStart.setDate(previousStart.getDate() - 7)

      const [recentData, previousData] = await Promise.all([
        searchConsole.searchanalytics.query({
          siteUrl,
          requestBody: {
            startDate: recentStart.toISOString().split('T')[0],
            endDate: recentEnd.toISOString().split('T')[0],
            dimensions: ['date']
          }
        }),
        searchConsole.searchanalytics.query({
          siteUrl,
          requestBody: {
            startDate: previousStart.toISOString().split('T')[0],
            endDate: previousEnd.toISOString().split('T')[0],
            dimensions: ['date']
          }
        })
      ])

      const recentClicks = (recentData.data.rows || []).reduce((sum, r) => sum + r.clicks, 0)
      const previousClicks = (previousData.data.rows || []).reduce((sum, r) => sum + r.clicks, 0)

      if (previousClicks > 0) {
        const changePercent = ((recentClicks - previousClicks) / previousClicks) * 100
        
        if (changePercent <= -30) {
          alerts.push({
            type: 'traffic_drop',
            severity: 'critical',
            title: 'Significant Traffic Drop Detected',
            description: `Organic clicks dropped ${Math.abs(changePercent).toFixed(0)}% (${previousClicks} → ${recentClicks}) compared to the previous week.`,
            data: { recentClicks, previousClicks, changePercent }
          })
        } else if (changePercent <= -15) {
          alerts.push({
            type: 'traffic_drop',
            severity: 'warning',
            title: 'Traffic Decline Detected',
            description: `Organic clicks dropped ${Math.abs(changePercent).toFixed(0)}% compared to the previous week.`,
            data: { recentClicks, previousClicks, changePercent }
          })
        }
      }
    } catch (e) {
      console.error('[Alerts] Traffic check error:', e)
    }

    // Check 2: Position drops for tracked keywords
    try {
      const { data: trackedKeywords } = await supabase
        .from('seo_keyword_universe')
        .select('*')
        .eq('site_id', siteId)

      for (const kw of (trackedKeywords || [])) {
        const history = kw.position_history || []
        if (history.length >= 2) {
          const recent = history[history.length - 1]
          const previous = history[history.length - 2]
          
          const positionChange = recent.position - previous.position
          
          // Alert if keyword drops more than 10 positions
          if (positionChange >= 10) {
            alerts.push({
              type: 'ranking_drop',
              severity: positionChange >= 20 ? 'critical' : 'warning',
              title: `Ranking Drop: "${kw.keyword}"`,
              description: `Position dropped from ${previous.position.toFixed(0)} to ${recent.position.toFixed(0)} (${positionChange.toFixed(0)} positions).`,
              data: { keyword: kw.keyword, previousPosition: previous.position, newPosition: recent.position }
            })
          }
          
          // Also alert if we lost first page ranking
          if (previous.position <= 10 && recent.position > 10) {
            alerts.push({
              type: 'lost_first_page',
              severity: 'critical',
              title: `Lost First Page: "${kw.keyword}"`,
              description: `Keyword dropped from page 1 (position ${previous.position.toFixed(0)}) to position ${recent.position.toFixed(0)}.`,
              data: { keyword: kw.keyword, previousPosition: previous.position, newPosition: recent.position }
            })
          }
        }
      }
    } catch (e) {
      console.error('[Alerts] Keyword check error:', e)
    }

    // Check 3: Pages with declining performance
    try {
      const { data: pages } = await supabase
        .from('seo_pages')
        .select('*')
        .eq('site_id', siteId)

      for (const page of (pages || [])) {
        // Check for significant CTR drop
        if (page.ctr_28d !== null && page.prev_ctr_28d !== null) {
          const ctrChange = ((page.ctr_28d - page.prev_ctr_28d) / page.prev_ctr_28d) * 100
          if (ctrChange <= -50 && page.impressions_28d > 100) {
            alerts.push({
              type: 'ctr_drop',
              severity: 'warning',
              title: 'CTR Drop Detected',
              description: `Page CTR dropped ${Math.abs(ctrChange).toFixed(0)}% - may need title/meta optimization.`,
              data: { 
                pageUrl: page.url, 
                previousCtr: page.prev_ctr_28d, 
                newCtr: page.ctr_28d 
              }
            })
          }
        }
      }
    } catch (e) {
      console.error('[Alerts] Page check error:', e)
    }

    // Check 4: Technical issues (from pages table)
    try {
      const { data: issues } = await supabase
        .from('seo_pages')
        .select('url, has_https, has_canonical, is_indexable')
        .eq('site_id', siteId)
        .or('has_https.eq.false,has_canonical.eq.false,is_indexable.eq.false')
        .limit(10)

      if (issues && issues.length > 5) {
        alerts.push({
          type: 'technical_issues',
          severity: 'warning',
          title: 'Multiple Technical SEO Issues',
          description: `${issues.length} pages have technical SEO issues that may affect rankings.`,
          data: { issueCount: issues.length }
        })
      }
    } catch (e) {
      console.error('[Alerts] Technical check error:', e)
    }

    // Save new alerts (avoiding duplicates for same day)
    const todayStr = today.toISOString().split('T')[0]
    const savedAlerts = []

    for (const alert of alerts) {
      // Check for existing similar alert from today
      const { data: existing } = await supabase
        .from('seo_alerts')
        .select('id')
        .eq('site_id', siteId)
        .eq('type', alert.type)
        .gte('created_at', todayStr)
        .single()

      if (!existing) {
        const { data: saved, error: saveError } = await supabase
          .from('seo_alerts')
          .insert({
            site_id: siteId,
            type: alert.type,
            severity: alert.severity,
            title: alert.title,
            description: alert.description,
            data: alert.data,
            status: 'active',
            created_at: new Date().toISOString()
          })
          .select()
          .single()

        if (!saveError && saved) {
          savedAlerts.push(saved)
        }
      }
    }

    // Send email notifications for critical alerts
    if (sendNotifications && savedAlerts.some(a => a.severity === 'critical')) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        
        const criticalAlerts = savedAlerts.filter(a => a.severity === 'critical')
        
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'noreply@uptrademedia.com',
          to: process.env.ADMIN_EMAIL || 'admin@uptrademedia.com',
          subject: `🚨 Critical SEO Alert: ${site.org?.name || domain}`,
          html: `
            <h2>Critical SEO Alerts for ${site.org?.name || domain}</h2>
            <p>The following critical issues were detected:</p>
            <ul>
              ${criticalAlerts.map(a => `<li><strong>${a.title}</strong><br>${a.description}</li>`).join('')}
            </ul>
            <p><a href="https://portal.uptrademedia.com/seo">View in Dashboard</a></p>
          `
        })
      } catch (e) {
        console.error('[Alerts] Email error:', e)
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        alertsChecked: alerts.length,
        newAlerts: savedAlerts.length,
        alerts: savedAlerts
      })
    }

  } catch (error) {
    console.error('[Alerts] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}

// Update alert status
async function updateAlert(event, headers) {
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { alertId, status, notes } = body

    if (!alertId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'alertId required' }) }
    }

    const supabase = createSupabaseAdmin()

    const updates = {
      updated_at: new Date().toISOString()
    }

    if (status) {
      updates.status = status
      if (status === 'acknowledged') {
        updates.acknowledged_at = new Date().toISOString()
        updates.acknowledged_by = contact.id
      } else if (status === 'resolved') {
        updates.resolved_at = new Date().toISOString()
        updates.resolved_by = contact.id
      }
    }

    if (notes !== undefined) {
      updates.notes = notes
    }

    const { data: alert, error } = await supabase
      .from('seo_alerts')
      .update(updates)
      .eq('id', alertId)
      .select()
      .single()

    if (error) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, alert })
    }

  } catch (error) {
    console.error('[Alerts] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}
