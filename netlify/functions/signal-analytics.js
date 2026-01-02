// ============================================================================
// DEPRECATED: This function is now redundant - use Signal API directly
// ============================================================================
// Portal now calls Signal API (NestJS) instead of internal Signal implementation.
// This function remains for backward compatibility but should not be used in new code.
//
// Migration:
//   Old: /.netlify/functions/signal-xxx
//   New: Signal API endpoints (see SIGNAL-API-MIGRATION.md)
//
// Signal API Base URL: $SIGNAL_API_URL (http://localhost:3001 or https://signal-api.uptrademedia.com)
// ============================================================================


// netlify/functions/signal-analytics.js
// Signal Module: Dedicated analytics endpoint with SQL aggregations
// Returns: conversation stats, leads, ratings, top questions, hourly/daily distribution

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
}

// Calculate date range based on period
function getDateRange(period) {
  const now = new Date()
  const endDate = now.toISOString()
  let startDate
  let previousStartDate
  let previousEndDate

  switch (period) {
    case '7d':
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
      previousEndDate = startDate
      previousStartDate = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString()
      break
    case '30d':
      startDate = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
      previousEndDate = startDate
      previousStartDate = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString()
      break
    case '90d':
      startDate = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString()
      previousEndDate = startDate
      previousStartDate = new Date(now - 180 * 24 * 60 * 60 * 1000).toISOString()
      break
    case 'all':
    default:
      startDate = '2020-01-01T00:00:00.000Z' // Epoch for "all time"
      previousStartDate = null
      previousEndDate = null
      break
  }

  return { startDate, endDate, previousStartDate, previousEndDate }
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

  const { contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  const projectId = event.queryStringParameters?.projectId
  const period = event.queryStringParameters?.period || '30d'

  if (!projectId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Project ID is required' })
    }
  }

  const supabase = createSupabaseAdmin()
  const { startDate, endDate, previousStartDate, previousEndDate } = getDateRange(period)

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // 1. Current Period Stats
    // ─────────────────────────────────────────────────────────────────────────
    const { data: currentConversations, error: currentError } = await supabase
      .from('signal_widget_conversations')
      .select('id, status, lead_created, satisfaction_rating, message_count, total_tokens_used, created_at')
      .eq('project_id', projectId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    if (currentError) throw currentError

    const currentStats = {
      total: currentConversations?.length || 0,
      leadsCreated: currentConversations?.filter(c => c.lead_created).length || 0,
      byStatus: {
        active: currentConversations?.filter(c => c.status === 'active').length || 0,
        closed: currentConversations?.filter(c => c.status === 'closed').length || 0,
        escalated: currentConversations?.filter(c => c.status === 'escalated').length || 0,
        converted: currentConversations?.filter(c => c.status === 'converted').length || 0
      },
      ratings: currentConversations?.filter(c => c.satisfaction_rating != null) || [],
      totalTokens: currentConversations?.reduce((sum, c) => sum + (c.total_tokens_used || 0), 0) || 0
    }

    // Calculate satisfaction score
    const avgSatisfaction = currentStats.ratings.length > 0
      ? currentStats.ratings.reduce((sum, c) => sum + c.satisfaction_rating, 0) / currentStats.ratings.length
      : 0

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Previous Period Stats (for comparison)
    // ─────────────────────────────────────────────────────────────────────────
    let previousStats = { total: 0, leadsCreated: 0 }
    
    if (previousStartDate && previousEndDate) {
      const { data: previousConversations } = await supabase
        .from('signal_widget_conversations')
        .select('id, lead_created')
        .eq('project_id', projectId)
        .gte('created_at', previousStartDate)
        .lt('created_at', previousEndDate)

      previousStats = {
        total: previousConversations?.length || 0,
        leadsCreated: previousConversations?.filter(c => c.lead_created).length || 0
      }
    }

    // Calculate percentage changes
    const calculateChange = (current, previous) => {
      if (!previous || previous === 0) return current > 0 ? 100 : 0
      return Math.round(((current - previous) / previous) * 100)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Average Response Time (from messages)
    // ─────────────────────────────────────────────────────────────────────────
    const { data: messages } = await supabase
      .from('signal_widget_messages')
      .select('conversation_id, role, created_at, latency_ms')
      .in('conversation_id', currentConversations?.map(c => c.id) || [])
      .order('created_at', { ascending: true })

    // Calculate avg latency from AI responses
    const aiMessages = messages?.filter(m => m.role === 'assistant' && m.latency_ms) || []
    const avgResponseTime = aiMessages.length > 0
      ? Math.round(aiMessages.reduce((sum, m) => sum + m.latency_ms, 0) / aiMessages.length)
      : 0

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Top Questions (user messages)
    // ─────────────────────────────────────────────────────────────────────────
    const userMessages = messages?.filter(m => m.role === 'user') || []
    
    // Simple keyword extraction for common question patterns
    const questionPatterns = {}
    userMessages.forEach(m => {
      const content = m.content || ''
      // Extract first sentence or first 100 chars as the "question"
      const question = content.split(/[.!?]/)[0]?.trim().slice(0, 100) || ''
      if (question.length > 10) {
        // Normalize: lowercase, remove extra spaces
        const normalized = question.toLowerCase().replace(/\s+/g, ' ')
        if (!questionPatterns[normalized]) {
          questionPatterns[normalized] = { text: question, count: 0 }
        }
        questionPatterns[normalized].count++
      }
    })

    const topQuestions = Object.values(questionPatterns)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(q => ({ question: q.text, count: q.count }))

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Hourly Distribution
    // ─────────────────────────────────────────────────────────────────────────
    const hourlyDistribution = Array(24).fill(0)
    currentConversations?.forEach(c => {
      const hour = new Date(c.created_at).getHours()
      hourlyDistribution[hour]++
    })

    // Find peak hour
    const peakHour = hourlyDistribution.indexOf(Math.max(...hourlyDistribution))

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Daily Trend (for charts)
    // ─────────────────────────────────────────────────────────────────────────
    const dailyMap = {}
    currentConversations?.forEach(c => {
      const day = c.created_at.split('T')[0]
      if (!dailyMap[day]) {
        dailyMap[day] = { date: day, conversations: 0, leads: 0 }
      }
      dailyMap[day].conversations++
      if (c.lead_created) dailyMap[day].leads++
    })

    const dailyTrend = Object.values(dailyMap).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    )

    // ─────────────────────────────────────────────────────────────────────────
    // 7. Response
    // ─────────────────────────────────────────────────────────────────────────
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        period,
        dateRange: { startDate, endDate },
        
        conversations: {
          total: currentStats.total,
          change: calculateChange(currentStats.total, previousStats.total),
          byStatus: currentStats.byStatus
        },
        
        leads: {
          total: currentStats.leadsCreated,
          conversionRate: currentStats.total > 0 
            ? Math.round((currentStats.leadsCreated / currentStats.total) * 100) 
            : 0,
          change: calculateChange(currentStats.leadsCreated, previousStats.leadsCreated)
        },
        
        satisfaction: {
          score: parseFloat(avgSatisfaction.toFixed(1)),
          totalRatings: currentStats.ratings.length
        },
        
        performance: {
          avgResponseTime, // in ms
          totalTokens: currentStats.totalTokens,
          avgTokensPerConversation: currentStats.total > 0
            ? Math.round(currentStats.totalTokens / currentStats.total)
            : 0
        },
        
        topQuestions,
        hourlyDistribution,
        peakHour,
        dailyTrend
      })
    }

  } catch (error) {
    console.error('Signal analytics error:', error)
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message })
    }
  }
}
