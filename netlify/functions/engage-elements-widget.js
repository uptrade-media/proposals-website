// netlify/functions/engage-elements-widget.js
// Public API for serving engage elements to client websites (no auth required)
// Handles: get active elements for a page, track events

import { createSupabaseAdmin } from './utils/supabase.js'
import { findProject } from './utils/projectLookup.js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Visitor-Id, X-Session-Id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS }
  }

  const supabase = createSupabaseAdmin()

  try {
    const pathParts = event.path.split('/').filter(Boolean)
    const action = pathParts[pathParts.length - 1]

    // GET /engage-elements-widget/elements?projectId=xxx&url=/page
    if (event.httpMethod === 'GET' && (action === 'elements' || action === 'engage-elements-widget')) {
      return await handleGetElements(event, supabase)
    }

    // POST /engage-elements-widget/event
    if (event.httpMethod === 'POST' && action === 'event') {
      return await handleTrackEvent(event, supabase)
    }

    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Unknown endpoint' })
    }

  } catch (error) {
    console.error('Engage elements widget error:', error)
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

/**
 * Get active elements for a page
 */
async function handleGetElements(event, supabase) {
  const { projectId, slug, domain, url, device, source, visitor } = event.queryStringParameters || {}

  const { project } = await findProject({ supabase, projectId, slug, domain })

  if (!project) {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ elements: [] })
    }
  }

  // Get active elements for this project
  const now = new Date().toISOString()
  
  const { data: elements, error } = await supabase
    .from('engage_elements')
    .select(`
      id,
      name,
      element_type,
      headline,
      body,
      cta_text,
      cta_url,
      cta_action,
      image_url,
      variant,
      position,
      animation,
      custom_css,
      theme,
      page_patterns,
      exclude_patterns,
      device_targets,
      traffic_sources,
      visitor_types,
      trigger_type,
      trigger_config,
      frequency_cap,
      priority,
      variants:engage_variants(
        id,
        variant_name,
        headline,
        body,
        cta_text,
        image_url,
        traffic_percent
      )
    `)
    .eq('project_id', project.id)
    .eq('is_active', true)
    .eq('is_draft', false)
    .or(`start_date.is.null,start_date.lte.${now}`)
    .or(`end_date.is.null,end_date.gte.${now}`)
    .order('priority', { ascending: false })

  if (error) throw error

  // Filter elements based on targeting
  const pageUrl = url || '/'
  const deviceType = device || 'desktop'
  const trafficSource = source || 'direct'
  const isReturning = visitor === 'returning'

  const filteredElements = elements.filter(el => {
    // Check page patterns
    if (el.page_patterns?.length > 0) {
      const matches = el.page_patterns.some(pattern => matchPattern(pageUrl, pattern))
      if (!matches) return false
    }

    // Check exclude patterns
    if (el.exclude_patterns?.length > 0) {
      const excluded = el.exclude_patterns.some(pattern => matchPattern(pageUrl, pattern))
      if (excluded) return false
    }

    // Check device targeting
    if (el.device_targets && !el.device_targets.includes(deviceType)) {
      return false
    }

    // Check traffic source
    if (el.traffic_sources && !el.traffic_sources.includes(trafficSource)) {
      return false
    }

    // Check visitor type
    if (el.visitor_types) {
      const visitorType = isReturning ? 'returning' : 'new'
      if (!el.visitor_types.includes(visitorType)) {
        return false
      }
    }

    return true
  })

  // Select variant for each element (based on traffic allocation)
  const elementsWithVariant = filteredElements.map(el => {
    let selectedVariant = null
    
    if (el.variants?.length > 0) {
      // Simple random selection based on traffic percent
      const rand = Math.random() * 100
      let cumulative = 0
      
      for (const variant of el.variants) {
        cumulative += variant.traffic_percent
        if (rand <= cumulative) {
          selectedVariant = variant
          break
        }
      }
      
      // Fallback to first variant
      if (!selectedVariant) {
        selectedVariant = el.variants[0]
      }

      // Merge variant overrides with element
      if (selectedVariant) {
        return {
          ...el,
          activeVariant: {
            id: selectedVariant.id,
            name: selectedVariant.variant_name,
            headline: selectedVariant.headline || el.headline,
            body: selectedVariant.body || el.body,
            cta_text: selectedVariant.cta_text || el.cta_text,
            image_url: selectedVariant.image_url || el.image_url
          }
        }
      }
    }

    return {
      ...el,
      activeVariant: {
        id: null,
        name: 'default',
        headline: el.headline,
        body: el.body,
        cta_text: el.cta_text,
        image_url: el.image_url
      }
    }
  })

  // Remove variants array from response (we've selected one)
  const response = elementsWithVariant.map(({ variants, ...el }) => el)

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      projectId: project.id,
      projectName: project.title,
      elements: response
    })
  }
}

/**
 * Track element event (impression, click, dismiss, conversion)
 */
async function handleTrackEvent(event, supabase) {
  const body = JSON.parse(event.body || '{}')
  const {
    projectId,
    elementId,
    variantId,
    eventType,
    pageUrl,
    referrer,
    deviceType,
    trafficSource,
    visitorId,
    sessionId,
    metadata
  } = body

  if (!elementId || !eventType) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'elementId and eventType are required' })
    }
  }

  // Validate event type
  const validEventTypes = ['impression', 'click', 'dismiss', 'conversion', 'cta_click']
  if (!validEventTypes.includes(eventType)) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Invalid event type' })
    }
  }

  // Get element to find org_id
  const { data: element } = await supabase
    .from('engage_elements')
    .select('org_id, project_id')
    .eq('id', elementId)
    .single()

  // Insert event
  const { error } = await supabase
    .from('engage_element_events')
    .insert({
      org_id: element?.org_id,
      project_id: projectId || element?.project_id,
      element_id: elementId,
      variant_id: variantId || null,
      event_type: eventType,
      page_url: pageUrl,
      referrer,
      device_type: deviceType,
      traffic_source: trafficSource,
      visitor_id: visitorId,
      session_id: sessionId,
      metadata
    })

  if (error) throw error

  // Update denormalized stats on variant if present
  if (variantId) {
    const updateField = eventType === 'impression' ? 'impressions' 
      : eventType === 'click' || eventType === 'cta_click' ? 'clicks'
      : eventType === 'conversion' ? 'conversions'
      : null

    if (updateField) {
      await supabase.rpc('increment', { 
        table_name: 'engage_variants',
        column_name: updateField,
        row_id: variantId
      }).catch(() => {
        // Fallback if RPC doesn't exist - use raw update
        supabase
          .from('engage_variants')
          .update({ [updateField]: supabase.raw(`${updateField} + 1`) })
          .eq('id', variantId)
      })
    }
  }

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ success: true })
  }
}

/**
 * Match URL against a pattern
 * Supports wildcards: /blog/* matches /blog/anything
 */
function matchPattern(url, pattern) {
  // Normalize URLs
  const normalizedUrl = url.replace(/\/$/, '') || '/'
  const normalizedPattern = pattern.replace(/\/$/, '') || '/'

  // Exact match
  if (normalizedUrl === normalizedPattern) return true

  // Wildcard match
  if (normalizedPattern.includes('*')) {
    const regex = new RegExp(
      '^' + normalizedPattern.replace(/\*/g, '.*').replace(/\//g, '\\/') + '$'
    )
    return regex.test(normalizedUrl)
  }

  return false
}
