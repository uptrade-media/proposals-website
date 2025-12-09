// netlify/functions/proposals-track-view.js
// Track proposal view analytics
import jwt from 'jsonwebtoken'
import { createClient } from '@supabase/supabase-js'

const JWT_SECRET = process.env.AUTH_JWT_SECRET

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    const { proposalId, event: eventType, metadata = {} } = JSON.parse(event.body || '{}')

    if (!proposalId || !eventType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'proposalId and event are required' })
      }
    }

    // Valid event types
    const validEvents = ['view', 'scroll', 'section_view', 'time_spent', 'click', 'signature_started']
    if (!validEvents.includes(eventType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid event type' })
      }
    }

    // Get proposal to verify it exists
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select('id, contact_id')
      .eq('id', proposalId)
      .single()

    if (proposalError || !proposal) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Proposal not found' })
      }
    }

    // Insert activity record
    const { error: insertError } = await supabase
      .from('proposal_activity')
      .insert({
        proposal_id: proposalId,
        action: eventType,
        performed_by: proposal.contact_id,
        metadata: JSON.stringify({
          ...metadata,
          ip: event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown',
          timestamp: new Date().toISOString()
        })
      })

    if (insertError) {
      console.error('Failed to insert activity:', insertError)
      // Don't fail the request - analytics is non-critical
    }

    // Update viewed_at timestamp if this is a view event and not already set
    if (eventType === 'view') {
      const { data: currentProposal } = await supabase
        .from('proposals')
        .select('viewed_at')
        .eq('id', proposalId)
        .single()
      
      if (!currentProposal?.viewed_at) {
        await supabase
          .from('proposals')
          .update({ viewed_at: new Date().toISOString() })
          .eq('id', proposalId)
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    }

  } catch (error) {
    console.error('Error tracking view:', error)
    // Return success anyway - analytics should not block user experience
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, warning: 'Analytics tracking failed' })
    }
  }
}
