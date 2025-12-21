// netlify/functions/engage-chat-widget.js
// Public API for the embeddable chat widget (no auth required)
// Handles: config fetch, message sending, session management

import { createSupabaseAdmin } from './utils/supabase.js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Visitor-Id, X-Session-Id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
}

/**
 * Check if current time is within business hours
 * @param {Object} businessHours - Business hours config from DB
 * @returns {boolean} - True if within business hours or if business hours disabled
 */
function checkBusinessHours(businessHours) {
  // If no business hours config or not enabled, consider it "always open"
  if (!businessHours || !businessHours.enabled) {
    return true
  }

  const timezone = businessHours.timezone || 'America/New_York'
  const schedule = businessHours.schedule

  if (!schedule) {
    return true
  }

  // Get current time in configured timezone
  const now = new Date()
  const options = { timeZone: timezone, weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: false }
  const formatter = new Intl.DateTimeFormat('en-US', options)
  const parts = formatter.formatToParts(now)

  const weekday = parts.find(p => p.type === 'weekday')?.value?.toLowerCase()
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10)
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10)
  const currentMinutes = hour * 60 + minute

  // Check if today is in the schedule and enabled
  const todaySchedule = schedule[weekday]
  if (!todaySchedule || !todaySchedule.enabled) {
    return false
  }

  // Parse start and end times (format: "09:00", "17:00")
  const [startHour, startMin] = (todaySchedule.start || '09:00').split(':').map(Number)
  const [endHour, endMin] = (todaySchedule.end || '17:00').split(':').map(Number)

  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin

  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS }
  }

  const supabase = createSupabaseAdmin()

  try {
    // Route based on path: /engage-chat-widget/config, /engage-chat-widget/message, etc.
    const pathParts = event.path.split('/').filter(Boolean)
    const action = pathParts[pathParts.length - 1] // Last segment

    // GET /engage-chat-widget/config?projectId=xxx
    if (event.httpMethod === 'GET' && action === 'config') {
      return await handleGetConfig(event, supabase)
    }

    // GET /engage-chat-widget/config?slug=xxx (lookup by slug)
    if (event.httpMethod === 'GET' && action === 'engage-chat-widget') {
      return await handleGetConfig(event, supabase)
    }

    // POST /engage-chat-widget/message
    if (event.httpMethod === 'POST' && action === 'message') {
      return await handleSendMessage(event, supabase)
    }

    // GET /engage-chat-widget/messages?sessionId=xxx
    if (event.httpMethod === 'GET' && action === 'messages') {
      return await handleGetMessages(event, supabase)
    }

    // POST /engage-chat-widget/event
    if (event.httpMethod === 'POST' && action === 'event') {
      return await handleTrackEvent(event, supabase)
    }

    // Default: treat as config request
    if (event.httpMethod === 'GET') {
      return await handleGetConfig(event, supabase)
    }

    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Unknown endpoint' })
    }

  } catch (error) {
    console.error('Engage widget error:', error)
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

/**
 * Get widget configuration for a project
 */
async function handleGetConfig(event, supabase) {
  const { projectId, slug, domain } = event.queryStringParameters || {}

  let project = null

  // Look up project by ID, slug, or domain
  if (projectId) {
    const { data } = await supabase
      .from('projects')
      .select('id, title, org_id')
      .eq('id', projectId)
      .single()
    project = data
  } else if (slug) {
    const { data } = await supabase
      .from('projects')
      .select('id, title, org_id')
      .eq('slug', slug)
      .single()
    project = data
  } else if (domain) {
    // Look up by organization domain, then get first project
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('domain', domain)
      .single()
    
    if (org) {
      const { data } = await supabase
        .from('projects')
        .select('id, title, org_id')
        .eq('org_id', org.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()
      project = data
    }
  }

  if (!project) {
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Project not found' })
    }
  }

  // Get chat config
  const { data: config } = await supabase
    .from('engage_chat_config')
    .select('*')
    .eq('project_id', project.id)
    .single()

  // If no config or not enabled, return minimal response
  if (!config || !config.is_enabled) {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        enabled: false,
        projectId: project.id
      })
    }
  }

  // Check if within business hours
  const isWithinBusinessHours = checkBusinessHours(config.business_hours)

  // Return public-safe config (exclude internal fields)
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      enabled: true,
      projectId: project.id,
      projectName: project.title,
      chatMode: config.chat_mode,
      position: config.position,
      theme: config.theme,
      widgetIcon: config.widget_icon,
      customIconUrl: config.custom_icon_url,
      initialMessage: config.initial_message,
      quickActions: config.quick_actions,
      formHeading: config.form_heading,
      formDescription: config.form_description,
      formRequiredFields: config.form_required_fields,
      formOptionalFields: config.form_optional_fields,
      formShowMessage: config.form_show_message,
      formSubmitText: config.form_submit_text,
      autoOpenDelay: config.auto_open_delay,
      showUnreadIndicator: config.show_unread_indicator,
      playSoundOnMessage: config.play_sound_on_message,
      showPoweredBy: config.show_powered_by,
      handoffEnabled: config.handoff_enabled,
      businessHours: config.business_hours,
      isWithinBusinessHours,
      offlineBehavior: config.business_hours?.offline_behavior || 'show_form'
    })
  }
}

/**
 * Send a message in a chat session
 */
async function handleSendMessage(event, supabase) {
  const body = JSON.parse(event.body || '{}')
  const { sessionId, content, role = 'visitor', attachments = [] } = body

  if (!sessionId || !content) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'sessionId and content required' })
    }
  }

  // Verify session exists
  const { data: session, error: sessionError } = await supabase
    .from('engage_chat_sessions')
    .select('id, project_id, org_id, status')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Session not found' })
    }
  }

  // Don't allow messages to closed sessions
  if (session.status === 'closed') {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Session is closed' })
    }
  }

  // Insert message
  const { data: message, error: messageError } = await supabase
    .from('engage_chat_messages')
    .insert({
      session_id: sessionId,
      role: role === 'visitor' ? 'visitor' : 'visitor', // Widget can only send as visitor
      content,
      attachments: attachments.length > 0 ? attachments : null
    })
    .select()
    .single()

  if (messageError) {
    console.error('Message insert error:', messageError)
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to send message' })
    }
  }

  // Update session
  const { error: updateError } = await supabase
    .from('engage_chat_sessions')
    .update({
      message_count: session.message_count + 1,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId)

  if (updateError) {
    console.error('Session update error:', updateError)
  }

  // Track event
  await supabase
    .from('engage_chat_events')
    .insert({
      session_id: sessionId,
      project_id: session.project_id,
      org_id: session.org_id,
      event_type: 'message_sent',
      metadata: { role, contentLength: content.length }
    })

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ message })
  }
}

/**
 * Get messages for a session (for widget polling)
 */
async function handleGetMessages(event, supabase) {
  const { sessionId, after } = event.queryStringParameters || {}

  if (!sessionId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'sessionId required' })
    }
  }

  let query = supabase
    .from('engage_chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  // Optionally filter to messages after a timestamp
  if (after) {
    query = query.gt('created_at', after)
  }

  const { data: messages, error } = await query

  if (error) {
    console.error('Get messages error:', error)
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to get messages' })
    }
  }

  // Also get session status
  const { data: session } = await supabase
    .from('engage_chat_sessions')
    .select('status, handoff_assigned_to, handoff_message_thread_id')
    .eq('id', sessionId)
    .single()

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ 
      messages,
      session: {
        status: session?.status,
        hasAgent: !!session?.handoff_assigned_to
      }
    })
  }
}

/**
 * Track widget events (opened, closed, etc.)
 */
async function handleTrackEvent(event, supabase) {
  const body = JSON.parse(event.body || '{}')
  const { projectId, sessionId, eventType, pageUrl, visitorId, metadata } = body

  if (!projectId || !eventType) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'projectId and eventType required' })
    }
  }

  // Get project org_id
  const { data: project } = await supabase
    .from('projects')
    .select('org_id')
    .eq('id', projectId)
    .single()

  // Insert event
  await supabase
    .from('engage_chat_events')
    .insert({
      session_id: sessionId || null,
      project_id: projectId,
      org_id: project?.org_id,
      event_type: eventType,
      page_url: pageUrl,
      visitor_id: visitorId,
      metadata
    })

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ success: true })
  }
}
