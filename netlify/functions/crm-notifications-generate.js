// netlify/functions/crm-notifications-generate.js
// Scheduled function to generate smart notifications
// Detects: hot leads, overdue follow-ups, stale proposals, engagement opportunities
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Check for overdue follow-ups
 */
async function checkOverdueFollowups() {
  const notifications = []
  const now = new Date()

  // Get follow-ups that are overdue (due_date in past, not completed)
  const { data: overdueFollowups } = await supabase
    .from('call_follow_ups')
    .select(`
      *,
      contact:contacts(id, name, email, company)
    `)
    .lt('due_date', now.toISOString())
    .eq('status', 'pending')
    .limit(20)

  for (const followup of overdueFollowups || []) {
    const daysOverdue = Math.floor((now - new Date(followup.due_date)) / (24 * 60 * 60 * 1000))
    const contactName = followup.contact?.name || followup.contact?.email || 'Unknown'
    
    // Check if we already have an unread notification for this
    const { data: existing } = await supabase
      .from('smart_notifications')
      .select('id')
      .eq('contact_id', followup.contact_id)
      .eq('type', 'overdue_followup')
      .is('read_at', null)
      .single()

    if (!existing) {
      notifications.push({
        contact_id: followup.contact_id,
        type: 'overdue_followup',
        priority: daysOverdue > 3 ? 'urgent' : 'high',
        title: `Follow-up overdue: ${contactName}`,
        message: `"${followup.title}" is ${daysOverdue} day(s) overdue`,
        metadata: {
          followupId: followup.id,
          daysOverdue,
          originalDueDate: followup.due_date,
          followupType: followup.type
        }
      })
    }
  }

  return notifications
}

/**
 * Check for hot leads (high lead score without recent outreach)
 */
async function checkHotLeads() {
  const notifications = []
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

  // Get contacts with high lead scores
  const { data: hotLeads } = await supabase
    .from('contacts')
    .select(`
      id, name, email, company, lead_score, pipeline_stage,
      lead_scores(factors, last_calculated_at)
    `)
    .gte('lead_score', 70)
    .in('pipeline_stage', ['qualified', 'meeting_scheduled', 'proposal_sent'])
    .limit(20)

  for (const lead of hotLeads || []) {
    // Check last outreach (calls or emails)
    const { data: recentCall } = await supabase
      .from('call_logs')
      .select('id')
      .eq('contact_id', lead.id)
      .eq('direction', 'outbound')
      .gte('start_time', threeDaysAgo)
      .limit(1)

    const { data: recentEmail } = await supabase
      .from('email_tracking')
      .select('id')
      .eq('contact_id', lead.id)
      .gte('sent_at', threeDaysAgo)
      .limit(1)

    // If no recent outreach, suggest callback
    if (!recentCall?.length && !recentEmail?.length) {
      // Check if we already have this notification
      const { data: existing } = await supabase
        .from('smart_notifications')
        .select('id')
        .eq('contact_id', lead.id)
        .eq('type', 'hot_lead_callback')
        .is('read_at', null)
        .single()

      if (!existing) {
        const contactName = lead.name || lead.email
        const signals = lead.lead_scores?.[0]?.factors || {}
        
        let topSignal = 'High engagement'
        if (signals.websiteScore?.value > 15) topSignal = 'Recently visited website'
        else if (signals.emailScore?.value > 15) topSignal = 'Engaged with emails'
        else if (signals.callScore?.value > 15) topSignal = 'Positive call history'

        notifications.push({
          contact_id: lead.id,
          type: 'hot_lead_callback',
          priority: 'high',
          title: `Hot lead needs attention: ${contactName}`,
          message: `Score: ${lead.lead_score} • ${topSignal}`,
          metadata: {
            leadScore: lead.lead_score,
            pipelineStage: lead.pipeline_stage,
            company: lead.company,
            signals
          }
        })
      }
    }
  }

  return notifications
}

/**
 * Check for stale proposals (sent but not viewed in 3+ days)
 */
async function checkStaleProposals() {
  const notifications = []
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

  // Get proposals sent but not viewed
  const { data: staleProposals } = await supabase
    .from('proposals')
    .select(`
      *,
      contact:contacts(id, name, email, company)
    `)
    .eq('status', 'sent')
    .is('viewed_at', null)
    .lt('sent_at', threeDaysAgo)
    .limit(20)

  for (const proposal of staleProposals || []) {
    const daysSinceSent = Math.floor(
      (Date.now() - new Date(proposal.sent_at)) / (24 * 60 * 60 * 1000)
    )

    // Check if we already have this notification
    const { data: existing } = await supabase
      .from('smart_notifications')
      .select('id')
      .eq('contact_id', proposal.contact_id)
      .eq('type', 'proposal_stale')
      .is('read_at', null)
      .single()

    if (!existing) {
      const contactName = proposal.contact?.name || proposal.contact?.email || 'Unknown'

      notifications.push({
        contact_id: proposal.contact_id,
        type: 'proposal_stale',
        priority: daysSinceSent > 7 ? 'high' : 'normal',
        title: `Proposal not viewed: ${contactName}`,
        message: `"${proposal.title}" sent ${daysSinceSent} days ago, never opened`,
        metadata: {
          proposalId: proposal.id,
          proposalTitle: proposal.title,
          sentAt: proposal.sent_at,
          daysSinceSent
        }
      })
    }
  }

  return notifications
}

/**
 * Check for recent proposal views (engagement opportunity)
 */
async function checkProposalEngagement() {
  const notifications = []
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Get proposals viewed in last 24h
  const { data: recentViews } = await supabase
    .from('proposals')
    .select(`
      *,
      contact:contacts(id, name, email, company)
    `)
    .eq('status', 'sent')
    .not('viewed_at', 'is', null)
    .gte('viewed_at', twentyFourHoursAgo)
    .limit(20)

  for (const proposal of recentViews || []) {
    // Check if we already have this notification
    const { data: existing } = await supabase
      .from('smart_notifications')
      .select('id')
      .eq('contact_id', proposal.contact_id)
      .eq('type', 'proposal_engagement')
      .gte('created_at', twentyFourHoursAgo)
      .single()

    if (!existing) {
      const contactName = proposal.contact?.name || proposal.contact?.email || 'Unknown'
      const viewedAgo = Math.round(
        (Date.now() - new Date(proposal.viewed_at)) / (60 * 60 * 1000)
      )

      notifications.push({
        contact_id: proposal.contact_id,
        type: 'proposal_engagement',
        priority: 'high',
        title: `${contactName} is reviewing your proposal!`,
        message: `Viewed "${proposal.title}" ${viewedAgo}h ago`,
        metadata: {
          proposalId: proposal.id,
          proposalTitle: proposal.title,
          viewedAt: proposal.viewed_at,
          hoursAgo: viewedAgo
        },
        expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() // 4h expiry
      })
    }
  }

  return notifications
}

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  try {
    // Collect all notifications
    const [overdue, hotLeads, staleProposals, proposalEngagement] = await Promise.all([
      checkOverdueFollowups(),
      checkHotLeads(),
      checkStaleProposals(),
      checkProposalEngagement()
    ])

    const allNotifications = [
      ...overdue,
      ...hotLeads,
      ...staleProposals,
      ...proposalEngagement
    ]

    // Insert all notifications
    if (allNotifications.length > 0) {
      const { error } = await supabase
        .from('smart_notifications')
        .insert(allNotifications)

      if (error) {
        console.error('Error inserting notifications:', error)
      }
    }

    // Clean up old expired/read notifications (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    await supabase
      .from('smart_notifications')
      .delete()
      .lt('created_at', thirtyDaysAgo)
      .not('read_at', 'is', null)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        generated: {
          overdue: overdue.length,
          hotLeads: hotLeads.length,
          staleProposals: staleProposals.length,
          proposalEngagement: proposalEngagement.length,
          total: allNotifications.length
        }
      })
    }

  } catch (error) {
    console.error('Notification generation error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to generate notifications' })
    }
  }
}
