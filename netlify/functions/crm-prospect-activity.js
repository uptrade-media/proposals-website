// netlify/functions/crm-prospect-activity.js
// Get activity timeline for a specific prospect/contact
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

  // Verify authentication using Supabase
  const { user, contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  try {
    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      }
    }

    const params = event.queryStringParameters || {}
    const { contactId, limit = '50' } = params

    if (!contactId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'contactId is required' })
      }
    }

    // Fetch all activity types for this contact
    const [
      activityResult,
      callsResult,
      proposalsResult,
      followUpsResult,
      tasksResult
    ] = await Promise.all([
      // Activity log (notes, stage changes, etc.)
      supabase
        .from('activity_log')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit)),
      
      // Call logs
      supabase
        .from('call_logs')
        .select('id, direction, duration, sentiment, ai_summary, created_at')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(20),
      
      // Proposals
      supabase
        .from('proposals')
        .select('id, title, status, total_amount, created_at, accepted_at')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false }),
      
      // Follow-ups
      supabase
        .from('call_follow_ups')
        .select('id, follow_up_type, scheduled_for, status, created_at')
        .eq('contact_id', contactId)
        .order('scheduled_for', { ascending: false })
        .limit(10),
      
      // Tasks
      supabase
        .from('call_tasks')
        .select('id, title, status, priority, due_date, created_at')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(10)
    ])

    // Combine and sort all activities into a timeline
    const timeline = []

    // Add activity log items
    if (activityResult.data) {
      activityResult.data.forEach(item => {
        timeline.push({
          id: item.id,
          type: item.activity_type,
          title: getActivityTitle(item.activity_type),
          description: item.description,
          metadata: item.metadata,
          timestamp: item.created_at,
          icon: getActivityIcon(item.activity_type)
        })
      })
    }

    // Add calls
    if (callsResult.data) {
      callsResult.data.forEach(call => {
        timeline.push({
          id: call.id,
          type: 'call',
          title: `${call.direction === 'inbound' ? 'Inbound' : 'Outbound'} Call`,
          description: call.ai_summary || `${Math.floor(call.duration / 60)}m ${call.duration % 60}s call`,
          metadata: { sentiment: call.sentiment, duration: call.duration },
          timestamp: call.created_at,
          icon: 'phone'
        })
      })
    }

    // Add proposals
    if (proposalsResult.data) {
      proposalsResult.data.forEach(proposal => {
        timeline.push({
          id: proposal.id,
          type: 'proposal',
          title: `Proposal: ${proposal.title}`,
          description: `Status: ${proposal.status}${proposal.total_amount ? ` • $${proposal.total_amount.toLocaleString()}` : ''}`,
          metadata: { status: proposal.status, amount: proposal.total_amount },
          timestamp: proposal.created_at,
          icon: 'file-text'
        })
      })
    }

    // Add follow-ups
    if (followUpsResult.data) {
      followUpsResult.data.forEach(followUp => {
        timeline.push({
          id: followUp.id,
          type: 'follow_up',
          title: `Follow-up: ${followUp.follow_up_type}`,
          description: `Scheduled for ${new Date(followUp.scheduled_for).toLocaleDateString()}`,
          metadata: { status: followUp.status },
          timestamp: followUp.created_at,
          icon: 'clock'
        })
      })
    }

    // Add tasks
    if (tasksResult.data) {
      tasksResult.data.forEach(task => {
        timeline.push({
          id: task.id,
          type: 'task',
          title: task.title,
          description: `Priority: ${task.priority} • Status: ${task.status}`,
          metadata: { status: task.status, priority: task.priority },
          timestamp: task.created_at,
          icon: 'check-square'
        })
      })
    }

    // Sort by timestamp descending
    timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    // Get pinned notes separately
    const pinnedNotes = (activityResult.data || [])
      .filter(item => item.activity_type === 'note' && item.metadata?.is_pinned)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        timeline: timeline.slice(0, parseInt(limit)),
        pinnedNotes,
        counts: {
          activities: activityResult.data?.length || 0,
          calls: callsResult.data?.length || 0,
          proposals: proposalsResult.data?.length || 0,
          followUps: followUpsResult.data?.length || 0,
          tasks: tasksResult.data?.length || 0
        }
      })
    }

  } catch (error) {
    console.error('Error fetching prospect activity:', error)
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired session' })
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch activity' })
    }
  }
}

function getActivityTitle(type) {
  const titles = {
    note: 'Note Added',
    stage_change: 'Pipeline Stage Changed',
    email_sent: 'Email Sent',
    meeting_scheduled: 'Meeting Scheduled',
    proposal_sent: 'Proposal Sent',
    converted: 'Converted to User'
  }
  return titles[type] || type
}

function getActivityIcon(type) {
  const icons = {
    note: 'message-square',
    stage_change: 'git-branch',
    email_sent: 'mail',
    meeting_scheduled: 'calendar',
    proposal_sent: 'file-text',
    converted: 'user-check'
  }
  return icons[type] || 'activity'
}
