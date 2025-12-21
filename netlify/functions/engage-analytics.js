// netlify/functions/engage-analytics.js
// Analytics API for Engage module (elements and chat)

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Verify authentication
  const { contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  const supabase = createSupabaseAdmin()
  const { projectId, report, days = '30', elementId } = event.queryStringParameters || {}

  try {
    const daysInt = parseInt(days, 10) || 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysInt)
    const startDateStr = startDate.toISOString()

    switch (report) {
      case 'overview':
        return await getOverview(supabase, projectId, startDateStr, daysInt)
      case 'elements':
        return await getElementsPerformance(supabase, projectId, startDateStr)
      case 'element':
        return await getElementDetail(supabase, elementId, startDateStr)
      case 'chat':
        return await getChatAnalytics(supabase, projectId, startDateStr)
      case 'trends':
        return await getTrends(supabase, projectId, startDateStr, daysInt)
      default:
        return await getOverview(supabase, projectId, startDateStr, daysInt)
    }
  } catch (error) {
    console.error('Engage analytics error:', error)
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message })
    }
  }
}

/**
 * Overview metrics
 */
async function getOverview(supabase, projectId, startDate, days) {
  // Element stats
  let elementQuery = supabase
    .from('engage_stats_daily')
    .select('impressions, clicks, conversions')
    .gte('date', startDate.split('T')[0])

  if (projectId) {
    elementQuery = elementQuery.eq('project_id', projectId)
  }

  const { data: elementStats } = await elementQuery

  const elementTotals = (elementStats || []).reduce((acc, row) => ({
    impressions: acc.impressions + (row.impressions || 0),
    clicks: acc.clicks + (row.clicks || 0),
    conversions: acc.conversions + (row.conversions || 0)
  }), { impressions: 0, clicks: 0, conversions: 0 })

  // Chat stats
  let chatQuery = supabase
    .from('engage_chat_sessions')
    .select('id, status, chat_mode, first_response_at, created_at')
    .gte('created_at', startDate)

  if (projectId) {
    chatQuery = chatQuery.eq('project_id', projectId)
  }

  const { data: chatSessions } = await chatQuery

  const chatStats = {
    totalSessions: chatSessions?.length || 0,
    aiSessions: chatSessions?.filter(s => s.chat_mode === 'ai').length || 0,
    liveSessions: chatSessions?.filter(s => s.chat_mode === 'live_only').length || 0,
    handoffs: chatSessions?.filter(s => s.status === 'human').length || 0,
    avgResponseTime: calculateAvgResponseTime(chatSessions)
  }

  // Active elements count
  let activeQuery = supabase
    .from('engage_elements')
    .select('id', { count: 'exact' })
    .eq('is_active', true)
    .eq('is_draft', false)

  if (projectId) {
    activeQuery = activeQuery.eq('project_id', projectId)
  }

  const { count: activeElements } = await activeQuery

  // Calculate rates
  const ctr = elementTotals.impressions > 0 
    ? (elementTotals.clicks / elementTotals.impressions * 100).toFixed(2)
    : 0
  const conversionRate = elementTotals.impressions > 0
    ? (elementTotals.conversions / elementTotals.impressions * 100).toFixed(2)
    : 0

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      period: { days, startDate },
      elements: {
        active: activeElements || 0,
        impressions: elementTotals.impressions,
        clicks: elementTotals.clicks,
        conversions: elementTotals.conversions,
        ctr: parseFloat(ctr),
        conversionRate: parseFloat(conversionRate)
      },
      chat: chatStats
    })
  }
}

/**
 * Per-element performance
 */
async function getElementsPerformance(supabase, projectId, startDate) {
  let query = supabase
    .from('engage_elements')
    .select(`
      id,
      name,
      element_type,
      is_active,
      is_draft,
      priority,
      total_impressions,
      total_clicks,
      total_conversions,
      created_at,
      project:projects(id, title)
    `)
    .order('total_impressions', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data: elements, error } = await query

  if (error) throw error

  // Add calculated rates
  const enrichedElements = elements.map(el => ({
    ...el,
    ctr: el.total_impressions > 0 
      ? (el.total_clicks / el.total_impressions * 100).toFixed(2)
      : 0,
    conversionRate: el.total_impressions > 0
      ? (el.total_conversions / el.total_impressions * 100).toFixed(2)
      : 0,
    status: el.is_draft ? 'draft' : el.is_active ? 'active' : 'paused'
  }))

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ elements: enrichedElements })
  }
}

/**
 * Single element detailed analytics
 */
async function getElementDetail(supabase, elementId, startDate) {
  if (!elementId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Element ID is required' })
    }
  }

  // Get element with variants
  const { data: element, error } = await supabase
    .from('engage_elements')
    .select(`
      *,
      variants:engage_variants(*)
    `)
    .eq('id', elementId)
    .single()

  if (error) throw error

  // Get daily stats
  const { data: dailyStats } = await supabase
    .from('engage_stats_daily')
    .select('*')
    .eq('element_id', elementId)
    .gte('date', startDate.split('T')[0])
    .order('date', { ascending: true })

  // Get variant breakdown
  const variantStats = element.variants?.map(variant => ({
    id: variant.id,
    name: variant.variant_name,
    isControl: variant.is_control,
    isWinner: variant.is_winner,
    trafficPercent: variant.traffic_percent,
    impressions: variant.impressions,
    clicks: variant.clicks,
    conversions: variant.conversions,
    ctr: variant.impressions > 0 
      ? (variant.clicks / variant.impressions * 100).toFixed(2)
      : 0,
    conversionRate: variant.impressions > 0
      ? (variant.conversions / variant.impressions * 100).toFixed(2)
      : 0
  })) || []

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      element,
      dailyStats,
      variantStats
    })
  }
}

/**
 * Chat-specific analytics
 */
async function getChatAnalytics(supabase, projectId, startDate) {
  // Get all chat sessions in period
  let query = supabase
    .from('engage_chat_sessions')
    .select('*')
    .gte('created_at', startDate)

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data: sessions } = await query

  // Aggregate stats
  const stats = {
    totalSessions: sessions?.length || 0,
    byMode: {
      ai: sessions?.filter(s => s.chat_mode === 'ai').length || 0,
      live: sessions?.filter(s => s.chat_mode === 'live_only').length || 0
    },
    byStatus: {
      active: sessions?.filter(s => s.status === 'active' || s.status === 'ai').length || 0,
      pendingHandoff: sessions?.filter(s => s.status === 'pending_handoff').length || 0,
      human: sessions?.filter(s => s.status === 'human').length || 0,
      closed: sessions?.filter(s => s.status === 'closed').length || 0
    },
    avgMessageCount: calculateAvg(sessions, 'message_count'),
    avgResponseTime: calculateAvgResponseTime(sessions),
    handoffRate: sessions?.length > 0
      ? ((sessions?.filter(s => s.status === 'human').length / sessions.length) * 100).toFixed(1)
      : 0
  }

  // Get message volume by day
  let eventsQuery = supabase
    .from('engage_chat_events')
    .select('event_type, created_at')
    .gte('created_at', startDate)
    .in('event_type', ['message_sent', 'session_started', 'handoff_requested'])

  if (projectId) {
    eventsQuery = eventsQuery.eq('project_id', projectId)
  }

  const { data: events } = await eventsQuery

  // Group events by day
  const eventsByDay = {}
  events?.forEach(e => {
    const day = e.created_at.split('T')[0]
    if (!eventsByDay[day]) {
      eventsByDay[day] = { sessions: 0, messages: 0, handoffs: 0 }
    }
    if (e.event_type === 'session_started') eventsByDay[day].sessions++
    if (e.event_type === 'message_sent') eventsByDay[day].messages++
    if (e.event_type === 'handoff_requested') eventsByDay[day].handoffs++
  })

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      stats,
      eventsByDay
    })
  }
}

/**
 * Trend data for charts
 */
async function getTrends(supabase, projectId, startDate, days) {
  // Element trends
  let statsQuery = supabase
    .from('engage_stats_daily')
    .select('date, impressions, clicks, conversions')
    .gte('date', startDate.split('T')[0])
    .order('date', { ascending: true })

  if (projectId) {
    statsQuery = statsQuery.eq('project_id', projectId)
  }

  const { data: dailyStats } = await statsQuery

  // Aggregate by day
  const elementTrends = {}
  dailyStats?.forEach(row => {
    if (!elementTrends[row.date]) {
      elementTrends[row.date] = { impressions: 0, clicks: 0, conversions: 0 }
    }
    elementTrends[row.date].impressions += row.impressions || 0
    elementTrends[row.date].clicks += row.clicks || 0
    elementTrends[row.date].conversions += row.conversions || 0
  })

  // Chat trends
  let chatQuery = supabase
    .from('engage_chat_sessions')
    .select('created_at, chat_mode, status')
    .gte('created_at', startDate)

  if (projectId) {
    chatQuery = chatQuery.eq('project_id', projectId)
  }

  const { data: chatSessions } = await chatQuery

  const chatTrends = {}
  chatSessions?.forEach(session => {
    const day = session.created_at.split('T')[0]
    if (!chatTrends[day]) {
      chatTrends[day] = { sessions: 0, handoffs: 0 }
    }
    chatTrends[day].sessions++
    if (session.status === 'human') chatTrends[day].handoffs++
  })

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      elements: Object.entries(elementTrends).map(([date, data]) => ({ date, ...data })),
      chat: Object.entries(chatTrends).map(([date, data]) => ({ date, ...data }))
    })
  }
}

// Helper functions
function calculateAvg(items, field) {
  if (!items?.length) return 0
  const sum = items.reduce((acc, item) => acc + (item[field] || 0), 0)
  return (sum / items.length).toFixed(1)
}

function calculateAvgResponseTime(sessions) {
  const sessionsWithResponse = sessions?.filter(s => s.first_response_at && s.created_at)
  if (!sessionsWithResponse?.length) return null

  const totalMs = sessionsWithResponse.reduce((acc, s) => {
    const start = new Date(s.created_at).getTime()
    const response = new Date(s.first_response_at).getTime()
    return acc + (response - start)
  }, 0)

  const avgMs = totalMs / sessionsWithResponse.length
  const avgSeconds = Math.floor(avgMs / 1000)
  
  if (avgSeconds < 60) return `${avgSeconds}s`
  if (avgSeconds < 3600) return `${Math.floor(avgSeconds / 60)}m`
  return `${Math.floor(avgSeconds / 3600)}h`
}
