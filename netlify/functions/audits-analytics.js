// netlify/functions/audits-analytics.js
// Returns analytics/engagement data for a specific audit

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

  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Verify auth via Supabase
  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    }
  }

  // Only admins can view analytics
  if (contact.role !== 'admin') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Admin access required' })
    }
  }

  const supabase = createSupabaseAdmin()

  // Get audit ID from query params
  const auditId = event.queryStringParameters?.auditId
  if (!auditId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing auditId parameter' })
    }
  }

  try {
    // Fetch the audit to make sure it exists
    const { data: audit, error: auditError } = await supabase
      .from('audits')
      .select('id, target_url, status, viewed_at')
      .eq('id', auditId)
      .single()

    if (auditError || !audit) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Audit not found' })
      }
    }

    // Fetch activity from audit_activity table (if it exists)
    const { data: activities, error: activityError } = await supabase
      .from('audit_activity')
      .select('*')
      .eq('audit_id', auditId)
      .order('created_at', { ascending: false })

    // If audit_activity table doesn't exist or has no data, return basic stats
    if (activityError || !activities || activities.length === 0) {
      // Return basic info based on viewed_at
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          auditId,
          totalViews: audit.viewed_at ? 1 : 0,
          uniqueDays: audit.viewed_at ? 1 : 0,
          totalTimeSpent: 0,
          maxScrollDepth: 0,
          sectionsViewed: [],
          engagementScore: audit.viewed_at ? 10 : 0,
          activityTimeline: audit.viewed_at ? [{
            eventType: 'view',
            eventData: {},
            createdAt: audit.viewed_at
          }] : []
        })
      }
    }

    // Calculate metrics from activity data
    const viewEvents = activities.filter(a => a.event_type === 'view')
    const scrollEvents = activities.filter(a => a.event_type === 'scroll')
    const timeEvents = activities.filter(a => a.event_type === 'time_spent')
    const sectionEvents = activities.filter(a => a.event_type === 'section_view')

    // Total views
    const totalViews = viewEvents.length

    // Unique days viewed
    const uniqueDays = new Set(
      viewEvents.map(v => new Date(v.created_at).toDateString())
    ).size

    // Total time spent (sum of all time_spent events)
    const totalTimeSpent = timeEvents.reduce((sum, t) => {
      const seconds = t.event_data?.seconds || 0
      return sum + seconds
    }, 0)

    // Max scroll depth
    const maxScrollDepth = scrollEvents.reduce((max, s) => {
      const depth = s.event_data?.depth || 0
      return Math.max(max, depth)
    }, 0)

    // Unique sections viewed
    const sectionsViewed = [...new Set(
      sectionEvents.map(s => s.event_data?.section).filter(Boolean)
    )]

    // Calculate engagement score (0-100)
    let engagementScore = 0
    
    // Views contribute up to 20 points
    engagementScore += Math.min(totalViews * 5, 20)
    
    // Scroll depth contributes up to 30 points
    engagementScore += Math.round(maxScrollDepth * 0.3)
    
    // Time spent contributes up to 30 points (max at 5 minutes)
    engagementScore += Math.min(Math.round(totalTimeSpent / 10), 30)
    
    // Sections viewed contribute up to 20 points
    engagementScore += Math.min(sectionsViewed.length * 4, 20)

    // Format activity timeline
    const activityTimeline = activities.slice(0, 50).map(a => ({
      eventType: a.event_type,
      eventData: a.event_data,
      createdAt: a.created_at
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        auditId,
        totalViews,
        uniqueDays,
        totalTimeSpent,
        maxScrollDepth,
        sectionsViewed,
        engagementScore: Math.min(engagementScore, 100),
        activityTimeline
      })
    }
  } catch (err) {
    console.error('Error fetching audit analytics:', err)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch analytics' })
    }
  }
}
