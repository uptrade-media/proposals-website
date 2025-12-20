// netlify/functions/analytics-ingest.js
// Unified analytics ingestion for multi-tenant architecture
// Handles: page views, events, sessions, scroll depth, web vitals, heatmap clicks
// Compatible with both tenant sites (GWA) and main site (Uptrade Media)

import { createSupabaseAdmin } from './utils/supabase.js'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Tenant-ID, X-Organization-Id, Authorization',
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
    const data = JSON.parse(event.body || '{}')
    const { 
      type = 'page_view', // page_view, event, session, scroll_depth, web_vitals, heatmap_click
      ...payload 
    } = data

    // Get tenant/org context
    const tenantId = event.headers['x-tenant-id'] || payload.tenantId
    const orgId = event.headers['x-organization-id'] || payload.orgId || tenantId

    if (!orgId && !tenantId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Organization or Tenant ID required' })
      }
    }

    const supabase = createSupabaseAdmin()
    
    // Resolve org_id if only tenant_id provided
    let resolvedOrgId = orgId
    if (!resolvedOrgId && tenantId) {
      resolvedOrgId = await resolveOrgId(supabase, tenantId)
    }

    // Route to appropriate handler
    switch (type) {
      case 'page_view':
        await handlePageView(supabase, resolvedOrgId, tenantId, payload)
        break
      case 'event':
        await handleEvent(supabase, resolvedOrgId, tenantId, payload)
        break
      case 'session':
        await handleSession(supabase, resolvedOrgId, tenantId, payload)
        break
      case 'scroll_depth':
        await handleScrollDepth(supabase, resolvedOrgId, tenantId, payload)
        break
      case 'web_vitals':
        await handleWebVitals(supabase, resolvedOrgId, tenantId, payload)
        break
      case 'heatmap_click':
        await handleHeatmapClick(supabase, resolvedOrgId, tenantId, payload)
        break
      case 'identify':
        await handleIdentify(supabase, resolvedOrgId, tenantId, payload)
        break
      default:
        // For backwards compatibility, treat unknown types as events
        await handleEvent(supabase, resolvedOrgId, tenantId, { ...payload, event: type })
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    }

  } catch (error) {
    console.error('[analytics-ingest] Error:', error)
    // Don't fail - analytics should never break the site
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, error: error.message })
    }
  }
}

/**
 * Resolve org_id from tenant_id by checking projects and organizations
 */
async function resolveOrgId(supabase, tenantId) {
  // Try projects first (for tenant sites like GWA)
  const { data: project } = await supabase
    .from('projects')
    .select('id, org_id, tenant_tracking_id')
    .or(`tenant_tracking_id.eq.${tenantId},id.eq.${tenantId}`)
    .eq('is_tenant', true)
    .single()

  if (project) {
    return project.org_id || project.id
  }

  // Try organizations
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .or(`slug.eq.${tenantId},id.eq.${tenantId}`)
    .single()

  return org?.id || tenantId
}

/**
 * Parse user agent for device info
 */
function parseUserAgent(ua) {
  if (!ua) return { deviceType: 'unknown', browser: 'unknown', os: 'unknown' }

  let deviceType = 'desktop'
  if (/mobile/i.test(ua)) deviceType = 'mobile'
  else if (/tablet|ipad/i.test(ua)) deviceType = 'tablet'

  let browser = 'unknown'
  if (/chrome/i.test(ua) && !/edge|edg/i.test(ua)) browser = 'Chrome'
  else if (/firefox/i.test(ua)) browser = 'Firefox'
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari'
  else if (/edge|edg/i.test(ua)) browser = 'Edge'

  let os = 'unknown'
  if (/windows/i.test(ua)) os = 'Windows'
  else if (/macintosh|mac os/i.test(ua)) os = 'macOS'
  else if (/linux/i.test(ua)) os = 'Linux'
  else if (/android/i.test(ua)) os = 'Android'
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS'

  return { deviceType, browser, os }
}

/**
 * Handle page view tracking
 */
async function handlePageView(supabase, orgId, tenantId, payload) {
  const {
    path,
    url,
    title,
    referrer,
    sessionId,
    visitorId,
    userAgent,
    timestamp,
    properties = {}
  } = payload

  const parsedPath = path || (url ? new URL(url).pathname : '/')
  const deviceInfo = parseUserAgent(userAgent)

  await supabase.from('analytics_page_views').insert({
    org_id: orgId,
    tenant_id: tenantId,
    session_id: sessionId,
    visitor_id: visitorId,
    path: parsedPath,
    title: title || properties.page || properties.title,
    referrer,
    user_agent: userAgent,
    device_type: deviceInfo.deviceType,
    browser: deviceInfo.browser,
    created_at: new Date(timestamp || Date.now()).toISOString()
  })
}

/**
 * Handle custom event tracking
 */
async function handleEvent(supabase, orgId, tenantId, payload) {
  const {
    event,
    eventName,
    eventCategory,
    eventAction,
    eventLabel,
    eventValue,
    path,
    url,
    sessionId,
    visitorId,
    referrer,
    properties = {},
    timestamp
  } = payload

  const name = event || eventName
  if (!name) return

  const parsedPath = path || (url ? new URL(url).pathname : '/')

  await supabase.from('analytics_events').insert({
    org_id: orgId,
    tenant_id: tenantId,
    session_id: sessionId,
    visitor_id: visitorId,
    event_name: name,
    event_category: eventCategory,
    event_action: eventAction,
    event_label: eventLabel,
    event_value: eventValue,
    path: parsedPath,
    referrer,
    properties: { ...properties },
    created_at: new Date(timestamp || Date.now()).toISOString()
  })
}

/**
 * Handle session tracking (start, update, end)
 */
async function handleSession(supabase, orgId, tenantId, payload) {
  const {
    sessionId,
    action = 'start', // start, update, end
    visitorId,
    firstPage,
    lastPage,
    referrer,
    pageCount,
    eventCount,
    duration,
    userAgent,
    screenWidth,
    screenHeight,
    utmSource,
    utmMedium,
    utmCampaign,
    utmTerm,
    utmContent,
    converted,
    conversionType,
    conversionValue,
    timestamp
  } = payload

  if (!sessionId) return

  const deviceInfo = parseUserAgent(userAgent)

  if (action === 'start') {
    await supabase.from('analytics_sessions').insert({
      id: sessionId,
      org_id: orgId,
      tenant_id: tenantId,
      visitor_id: visitorId,
      first_page: firstPage,
      last_page: lastPage,
      referrer,
      device_type: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      screen_width: screenWidth,
      screen_height: screenHeight,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_term: utmTerm,
      utm_content: utmContent,
      started_at: new Date(timestamp || Date.now()).toISOString()
    })
  } else if (action === 'update' || action === 'end') {
    const updates = {
      last_page: lastPage,
      page_count: pageCount,
      event_count: eventCount,
      duration_seconds: duration,
      updated_at: new Date().toISOString()
    }

    if (converted) {
      updates.converted = true
      updates.conversion_type = conversionType
      updates.conversion_value = conversionValue
    }

    if (action === 'end') {
      updates.ended_at = new Date().toISOString()
    }

    await supabase.from('analytics_sessions')
      .update(updates)
      .eq('id', sessionId)
  }
}

/**
 * Handle scroll depth tracking
 */
async function handleScrollDepth(supabase, orgId, tenantId, payload) {
  const {
    sessionId,
    path,
    url,
    depth,
    maxDepthPercent,
    timeTo25,
    timeTo50,
    timeTo75,
    timeTo100,
    totalTimeSeconds,
    deviceType,
    timestamp
  } = payload

  const parsedPath = path || (url ? new URL(url).pathname : '/')
  const depthValue = depth || maxDepthPercent || 0

  await supabase.from('analytics_scroll_depth').insert({
    org_id: orgId,
    tenant_id: tenantId,
    session_id: sessionId,
    path: parsedPath,
    depth: depthValue,
    max_depth_percent: maxDepthPercent || depthValue,
    time_to_25: timeTo25,
    time_to_50: timeTo50,
    time_to_75: timeTo75,
    time_to_100: timeTo100,
    total_time_seconds: totalTimeSeconds,
    device_type: deviceType,
    created_at: new Date(timestamp || Date.now()).toISOString()
  })
}

/**
 * Handle Web Vitals tracking
 */
async function handleWebVitals(supabase, orgId, tenantId, payload) {
  const {
    metric,
    metricName,
    value,
    metricValue,
    rating,
    delta,
    path,
    url,
    sessionId,
    deviceType,
    connectionType,
    timestamp
  } = payload

  const name = metric || metricName
  const val = value ?? metricValue
  if (!name || val === undefined) return

  const parsedPath = path || (url ? new URL(url).pathname : '/')

  await supabase.from('analytics_web_vitals').insert({
    org_id: orgId,
    tenant_id: tenantId,
    session_id: sessionId,
    page_path: parsedPath,
    metric_name: name.toUpperCase(),
    metric_value: val,
    metric_rating: rating,
    metric_delta: delta,
    device_type: deviceType,
    connection_type: connectionType,
    created_at: new Date(timestamp || Date.now()).toISOString()
  })
}

/**
 * Handle heatmap click tracking
 */
async function handleHeatmapClick(supabase, orgId, tenantId, payload) {
  const {
    sessionId,
    path,
    url,
    xPercent,
    yPercent,
    xAbsolute,
    yAbsolute,
    viewportWidth,
    viewportHeight,
    pageHeight,
    elementTag,
    elementId,
    elementClass,
    elementText,
    deviceType,
    timestamp
  } = payload

  const parsedPath = path || (url ? new URL(url).pathname : '/')

  await supabase.from('analytics_heatmap_clicks').insert({
    org_id: orgId,
    tenant_id: tenantId,
    session_id: sessionId,
    page_path: parsedPath,
    x_percent: xPercent,
    y_percent: yPercent,
    x_absolute: xAbsolute,
    y_absolute: yAbsolute,
    viewport_width: viewportWidth,
    viewport_height: viewportHeight,
    page_height: pageHeight,
    element_tag: elementTag,
    element_id: elementId,
    element_class: elementClass?.substring(0, 200),
    element_text: elementText?.substring(0, 100),
    device_type: deviceType,
    created_at: new Date(timestamp || Date.now()).toISOString()
  })
}

/**
 * Handle visitor identification (link anonymous visitor to known contact)
 */
async function handleIdentify(supabase, orgId, tenantId, payload) {
  const {
    visitorId,
    sessionId,
    contactId,
    email,
    path,
    timestamp
  } = payload

  if (!contactId && !email) {
    console.log('[analytics-ingest] Identify called without contactId or email')
    return
  }

  // Check if known_visitors table exists, create entry if so
  try {
    // First, try to find or create the known visitor record
    const { data: existing } = await supabase
      .from('known_visitors')
      .select('id')
      .eq('visitor_id', visitorId)
      .single()

    if (existing) {
      // Update existing visitor with contact link
      await supabase
        .from('known_visitors')
        .update({
          contact_id: contactId,
          email,
          updated_at: new Date(timestamp || Date.now()).toISOString()
        })
        .eq('visitor_id', visitorId)
    } else {
      // Create new known visitor record
      await supabase.from('known_visitors').insert({
        visitor_id: visitorId,
        contact_id: contactId,
        email,
        first_seen: new Date(timestamp || Date.now()).toISOString(),
        last_seen: new Date(timestamp || Date.now()).toISOString()
      })
    }

    // Also log the identification as activity
    await supabase.from('known_visitor_activity').insert({
      visitor_id: visitorId,
      contact_id: contactId,
      session_id: sessionId,
      page_path: path,
      event_type: 'identify',
      created_at: new Date(timestamp || Date.now()).toISOString()
    })

  } catch (error) {
    // Tables might not exist yet, log and continue
    console.log('[analytics-ingest] Identify tracking skipped:', error.message)
  }
}
