// netlify/functions/crm-lead-score.js
// Calculate lead scores based on multiple engagement signals
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Scoring weights
const WEIGHTS = {
  // Call signals (0-25 points)
  CALL_POSITIVE_SENTIMENT: 10,
  CALL_INTERESTED: 8,
  CALL_DURATION_LONG: 5, // > 5 min
  CALL_RECENT: 2, // Within last 7 days
  
  // Email signals (0-25 points)
  EMAIL_OPENED: 5,
  EMAIL_CLICKED: 10,
  EMAIL_REPLIED: 15,
  EMAIL_RECENT: 2,
  
  // Website signals (0-25 points)
  WEBSITE_VISIT: 3,
  WEBSITE_MULTIPLE_PAGES: 5,
  WEBSITE_PRICING_VIEW: 8,
  WEBSITE_CONTACT_VIEW: 8,
  WEBSITE_RECENT: 5, // Visit in last 24h
  
  // Engagement signals (0-25 points)
  AUDIT_VIEWED: 8,
  PROPOSAL_VIEWED: 10,
  PROPOSAL_DOWNLOADED: 5,
  FORM_SUBMITTED: 10,
  MEETING_SCHEDULED: 15,
  
  // Pipeline stage bonus
  STAGE_QUALIFIED: 10,
  STAGE_PROPOSAL_SENT: 15,
  STAGE_NEGOTIATION: 20,
  
  // Recency decay
  DAYS_SINCE_ACTIVITY_PENALTY: -2 // Per day over 7 days
}

/**
 * Calculate lead score for a contact
 */
async function calculateLeadScore(contactId) {
  const factors = {
    callScore: { value: 0, signals: [] },
    emailScore: { value: 0, signals: [] },
    websiteScore: { value: 0, signals: [] },
    engagementScore: { value: 0, signals: [] },
    recencyScore: { value: 0, signals: [] }
  }
  
  const now = new Date()
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)
  const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000)
  
  // Get contact data
  const { data: contact } = await supabase
    .from('contacts')
    .select('*, pipeline_stage')
    .eq('id', contactId)
    .single()
  
  if (!contact) return null
  
  // --- Call Score ---
  const { data: calls } = await supabase
    .from('call_logs')
    .select('*')
    .eq('contact_id', contactId)
    .order('start_time', { ascending: false })
    .limit(10)
  
  if (calls && calls.length > 0) {
    calls.forEach(call => {
      const sentiment = call.ai_analysis?.sentiment?.toLowerCase()
      if (sentiment === 'positive' || sentiment === 'very positive') {
        factors.callScore.value += WEIGHTS.CALL_POSITIVE_SENTIMENT
        factors.callScore.signals.push('Positive call sentiment')
      }
      
      if (call.ai_analysis?.interested === true) {
        factors.callScore.value += WEIGHTS.CALL_INTERESTED
        factors.callScore.signals.push('Showed interest on call')
      }
      
      if (call.duration_seconds && call.duration_seconds > 300) {
        factors.callScore.value += WEIGHTS.CALL_DURATION_LONG
        factors.callScore.signals.push(`Long call (${Math.round(call.duration_seconds / 60)}min)`)
      }
      
      const callDate = new Date(call.start_time)
      if (callDate > sevenDaysAgo) {
        factors.callScore.value += WEIGHTS.CALL_RECENT
        factors.callScore.signals.push('Recent call activity')
      }
    })
  }
  factors.callScore.value = Math.min(factors.callScore.value, 25)
  
  // --- Email Score ---
  const { data: emails } = await supabase
    .from('email_tracking')
    .select('*')
    .eq('contact_id', contactId)
    .order('sent_at', { ascending: false })
    .limit(10)
  
  if (emails && emails.length > 0) {
    const hasOpened = emails.some(e => e.opened_at)
    const hasClicked = emails.some(e => e.clicked_at)
    const hasReplied = emails.some(e => e.replied)
    const hasRecent = emails.some(e => new Date(e.sent_at) > sevenDaysAgo)
    
    if (hasOpened) {
      factors.emailScore.value += WEIGHTS.EMAIL_OPENED
      factors.emailScore.signals.push('Opened email')
    }
    if (hasClicked) {
      factors.emailScore.value += WEIGHTS.EMAIL_CLICKED
      factors.emailScore.signals.push('Clicked email link')
    }
    if (hasReplied) {
      factors.emailScore.value += WEIGHTS.EMAIL_REPLIED
      factors.emailScore.signals.push('Replied to email')
    }
    if (hasRecent) {
      factors.emailScore.value += WEIGHTS.EMAIL_RECENT
      factors.emailScore.signals.push('Recent email activity')
    }
  }
  factors.emailScore.value = Math.min(factors.emailScore.value, 25)
  
  // --- Website Score ---
  const { data: websiteVisits } = await supabase
    .from('known_visitor_activity')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .limit(50)
  
  if (websiteVisits && websiteVisits.length > 0) {
    factors.websiteScore.value += WEIGHTS.WEBSITE_VISIT
    factors.websiteScore.signals.push(`${websiteVisits.length} page views`)
    
    if (websiteVisits.length >= 3) {
      factors.websiteScore.value += WEIGHTS.WEBSITE_MULTIPLE_PAGES
      factors.websiteScore.signals.push('Multiple pages viewed')
    }
    
    const viewedPricing = websiteVisits.some(v => 
      v.page_path?.includes('pricing') || v.page_path?.includes('services')
    )
    if (viewedPricing) {
      factors.websiteScore.value += WEIGHTS.WEBSITE_PRICING_VIEW
      factors.websiteScore.signals.push('Viewed pricing/services')
    }
    
    const viewedContact = websiteVisits.some(v => 
      v.page_path?.includes('contact') || v.page_path?.includes('schedule')
    )
    if (viewedContact) {
      factors.websiteScore.value += WEIGHTS.WEBSITE_CONTACT_VIEW
      factors.websiteScore.signals.push('Viewed contact page')
    }
    
    const hasRecentVisit = websiteVisits.some(v => 
      new Date(v.created_at) > twentyFourHoursAgo
    )
    if (hasRecentVisit) {
      factors.websiteScore.value += WEIGHTS.WEBSITE_RECENT
      factors.websiteScore.signals.push('Visited in last 24h')
    }
  }
  factors.websiteScore.value = Math.min(factors.websiteScore.value, 25)
  
  // --- Engagement Score ---
  // Check audits
  const { data: audits } = await supabase
    .from('audits')
    .select('id, viewed_at')
    .eq('contact_id', contactId)
  
  if (audits && audits.length > 0) {
    const viewedAudit = audits.some(a => a.viewed_at)
    if (viewedAudit) {
      factors.engagementScore.value += WEIGHTS.AUDIT_VIEWED
      factors.engagementScore.signals.push('Viewed audit report')
    }
  }
  
  // Check proposals
  const { data: proposals } = await supabase
    .from('proposals')
    .select('id, viewed_at, status')
    .eq('contact_id', contactId)
  
  if (proposals && proposals.length > 0) {
    const viewedProposal = proposals.some(p => p.viewed_at)
    if (viewedProposal) {
      factors.engagementScore.value += WEIGHTS.PROPOSAL_VIEWED
      factors.engagementScore.signals.push('Viewed proposal')
    }
  }
  
  // Pipeline stage bonus
  if (contact.pipeline_stage === 'qualified') {
    factors.engagementScore.value += WEIGHTS.STAGE_QUALIFIED
    factors.engagementScore.signals.push('Qualified lead')
  } else if (contact.pipeline_stage === 'proposal_sent') {
    factors.engagementScore.value += WEIGHTS.STAGE_PROPOSAL_SENT
    factors.engagementScore.signals.push('Proposal sent')
  } else if (contact.pipeline_stage === 'negotiation') {
    factors.engagementScore.value += WEIGHTS.STAGE_NEGOTIATION
    factors.engagementScore.signals.push('In negotiation')
  }
  
  factors.engagementScore.value = Math.min(factors.engagementScore.value, 25)
  
  // --- Recency Score ---
  // Find most recent activity across all channels
  let lastActivityDate = null
  
  if (calls?.[0]?.start_time) {
    const callDate = new Date(calls[0].start_time)
    if (!lastActivityDate || callDate > lastActivityDate) {
      lastActivityDate = callDate
    }
  }
  
  if (emails?.[0]?.sent_at) {
    const emailDate = new Date(emails[0].sent_at)
    if (!lastActivityDate || emailDate > lastActivityDate) {
      lastActivityDate = emailDate
    }
  }
  
  if (websiteVisits?.[0]?.created_at) {
    const visitDate = new Date(websiteVisits[0].created_at)
    if (!lastActivityDate || visitDate > lastActivityDate) {
      lastActivityDate = visitDate
    }
  }
  
  if (lastActivityDate) {
    const daysSinceActivity = Math.floor((now - lastActivityDate) / (24 * 60 * 60 * 1000))
    
    if (daysSinceActivity <= 1) {
      factors.recencyScore.value = 25
      factors.recencyScore.signals.push('Active today')
    } else if (daysSinceActivity <= 3) {
      factors.recencyScore.value = 20
      factors.recencyScore.signals.push('Active in last 3 days')
    } else if (daysSinceActivity <= 7) {
      factors.recencyScore.value = 15
      factors.recencyScore.signals.push('Active this week')
    } else if (daysSinceActivity <= 14) {
      factors.recencyScore.value = 10
      factors.recencyScore.signals.push('Active in last 2 weeks')
    } else if (daysSinceActivity <= 30) {
      factors.recencyScore.value = 5
      factors.recencyScore.signals.push('Active this month')
    } else {
      factors.recencyScore.value = 0
      factors.recencyScore.signals.push(`No activity in ${daysSinceActivity} days`)
    }
  }
  
  // Calculate total score (max 100)
  const totalScore = Math.min(100, Math.max(0,
    factors.callScore.value +
    factors.emailScore.value +
    factors.websiteScore.value +
    factors.engagementScore.value +
    factors.recencyScore.value
  ))
  
  return {
    totalScore,
    callScore: factors.callScore.value,
    emailScore: factors.emailScore.value,
    websiteScore: factors.websiteScore.value,
    engagementScore: factors.engagementScore.value,
    recencyScore: factors.recencyScore.value,
    factors
  }
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
    const { contactId, calculateAll = false } = JSON.parse(event.body || '{}')

    // Calculate for single contact
    if (contactId) {
      const score = await calculateLeadScore(contactId)
      
      if (!score) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Contact not found' })
        }
      }
      
      // Get previous score for trend
      const { data: existingScore } = await supabase
        .from('lead_scores')
        .select('total_score')
        .eq('contact_id', contactId)
        .single()
      
      const previousScore = existingScore?.total_score || 0
      let scoreTrend = 'stable'
      if (score.totalScore > previousScore + 5) scoreTrend = 'rising'
      else if (score.totalScore < previousScore - 5) scoreTrend = 'falling'
      
      // Upsert lead score
      const { error: upsertError } = await supabase
        .from('lead_scores')
        .upsert({
          contact_id: contactId,
          total_score: score.totalScore,
          call_score: score.callScore,
          email_score: score.emailScore,
          website_score: score.websiteScore,
          engagement_score: score.engagementScore,
          recency_score: score.recencyScore,
          factors: score.factors,
          previous_score: previousScore,
          score_trend: scoreTrend,
          last_calculated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'contact_id'
        })
      
      if (upsertError) {
        console.error('Error upserting lead score:', upsertError)
      }
      
      // Update contact's cached lead score
      await supabase
        .from('contacts')
        .update({
          lead_score: score.totalScore,
          lead_score_updated_at: new Date().toISOString()
        })
        .eq('id', contactId)
      
      // Check if score spiked and create notification
      if (score.totalScore >= 70 && previousScore < 70) {
        const { data: contact } = await supabase
          .from('contacts')
          .select('name, email, company')
          .eq('id', contactId)
          .single()
        
        if (contact) {
          await supabase
            .from('smart_notifications')
            .insert({
              contact_id: contactId,
              type: 'score_spike',
              priority: 'high',
              title: `${contact.name || contact.email} is now a hot lead!`,
              message: `Lead score jumped from ${previousScore} to ${score.totalScore}`,
              metadata: {
                previousScore,
                newScore: score.totalScore,
                factors: score.factors
              }
            })
        }
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          score,
          scoreTrend,
          previousScore
        })
      }
    }

    // Calculate for all contacts (batch job)
    if (calculateAll) {
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id')
        .in('pipeline_stage', ['new', 'qualified', 'meeting_scheduled', 'proposal_sent', 'negotiation'])
        .limit(100)
      
      const results = []
      for (const contact of contacts || []) {
        const score = await calculateLeadScore(contact.id)
        if (score) {
          await supabase
            .from('contacts')
            .update({
              lead_score: score.totalScore,
              lead_score_updated_at: new Date().toISOString()
            })
            .eq('id', contact.id)
          
          results.push({ contactId: contact.id, score: score.totalScore })
        }
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          processed: results.length,
          results
        })
      }
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'contactId or calculateAll is required' })
    }

  } catch (error) {
    console.error('Lead score calculation error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to calculate lead score' })
    }
  }
}
