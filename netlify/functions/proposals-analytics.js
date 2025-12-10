// netlify/functions/proposals-analytics.js
// Fetch proposal analytics and activity data
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from './utils/supabase.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Verify admin authentication
    const { contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: authError || 'No authentication token provided' })
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

    const proposalId = event.queryStringParameters?.id

    if (!proposalId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'proposalId is required' })
      }
    }

    // Fetch all activity for this proposal
    const { data: activities, error: activityError } = await supabase
      .from('proposal_activity')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('created_at', { ascending: false })

    if (activityError) {
      console.error('Error fetching activity:', activityError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch analytics' })
      }
    }

    // Parse metadata and compute analytics
    const parsedActivities = activities.map(a => ({
      ...a,
      metadata: a.metadata ? JSON.parse(a.metadata) : {}
    }))

    // Compute summary statistics
    const viewEvents = parsedActivities.filter(a => a.action === 'view')
    const scrollEvents = parsedActivities.filter(a => a.action === 'scroll')
    const sectionViews = parsedActivities.filter(a => a.action === 'section_view')
    const timeSpentEvents = parsedActivities.filter(a => a.action === 'time_spent')
    const clickEvents = parsedActivities.filter(a => a.action === 'click')
    const signatureEvents = parsedActivities.filter(a => a.action === 'signature_started')

    // Calculate total time spent (sum of all time_spent events)
    const totalTimeSpent = timeSpentEvents.reduce((sum, e) => {
      const duration = e.metadata?.duration || 0
      return sum + duration
    }, 0)

    // Calculate max scroll depth
    const maxScrollDepth = scrollEvents.reduce((max, e) => {
      const depth = e.metadata?.scrollDepth || 0
      return Math.max(max, depth)
    }, 0)

    // Get unique sections viewed
    const sectionsViewed = [...new Set(sectionViews.map(s => s.metadata?.section).filter(Boolean))]

    // Get first view and last activity
    const firstView = viewEvents.length > 0 
      ? viewEvents[viewEvents.length - 1].created_at 
      : null
    const lastActivity = parsedActivities.length > 0 
      ? parsedActivities[0].created_at 
      : null

    // Calculate engagement score (0-100)
    // Based on: views, scroll depth, time spent, sections viewed
    let engagementScore = 0
    if (viewEvents.length > 0) engagementScore += 20 // Base points for viewing
    if (viewEvents.length > 1) engagementScore += 10 // Multiple views
    if (maxScrollDepth >= 50) engagementScore += 15
    if (maxScrollDepth >= 80) engagementScore += 15
    if (totalTimeSpent >= 60) engagementScore += 10 // 1+ minute
    if (totalTimeSpent >= 180) engagementScore += 10 // 3+ minutes
    if (sectionsViewed.length >= 3) engagementScore += 10
    if (signatureEvents.length > 0) engagementScore += 10 // Started signing

    const analytics = {
      proposalId,
      summary: {
        totalViews: viewEvents.length,
        uniqueViewDays: [...new Set(viewEvents.map(v => 
          new Date(v.created_at).toDateString()
        ))].length,
        totalTimeSpent, // in seconds
        maxScrollDepth, // percentage
        sectionsViewed,
        totalClicks: clickEvents.length,
        signatureStarted: signatureEvents.length > 0,
        engagementScore: Math.min(100, engagementScore),
        firstView,
        lastActivity
      },
      timeline: parsedActivities.slice(0, 50).map(a => ({
        action: a.action,
        timestamp: a.created_at,
        metadata: a.metadata
      })),
      // Detailed breakdowns
      viewsByDay: viewEvents.reduce((acc, v) => {
        const day = new Date(v.created_at).toLocaleDateString()
        acc[day] = (acc[day] || 0) + 1
        return acc
      }, {}),
      accessTypes: viewEvents.reduce((acc, v) => {
        const type = v.metadata?.accessType || 'unknown'
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {})
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ analytics })
    }

  } catch (error) {
    console.error('Error fetching proposal analytics:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
