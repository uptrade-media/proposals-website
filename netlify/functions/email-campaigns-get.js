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

  try {
    // Verify auth using Supabase
    const { user, contact, error: authError } = await getAuthenticatedUser(event)
    if (authError || !contact) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    if (contact.role !== 'admin') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin only' }) }
    }

    const campaignId = event.queryStringParameters?.id
    if (!campaignId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Campaign ID required' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Get campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Campaign not found' })
      }
    }

    // Get recipients and metrics
    const { data: recipients, error: recipientsError } = await supabase
      .from('recipients')
      .select('id, contact_id, step_index, status, sent_at, created_at')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })

    // Get recipient IDs for event query
    const recipientIds = recipients?.map(r => r.id) || []

    // Get events (opens, clicks, etc.)
    let eventMap = {}
    if (recipientIds.length > 0) {
      const { data: events } = await supabase
        .from('events')
        .select('type')
        .in('recipient_id', recipientIds)

      // Count events by type
      if (events) {
        events.forEach(e => {
          eventMap[e.type] = (eventMap[e.type] || 0) + 1
        })
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        campaign,
        recipients: recipients?.length || 0,
        metrics: {
          sent: recipients?.filter(r => r.status === 'sent').length || 0,
          delivered: eventMap.delivered || 0,
          opened: eventMap.open || 0,
          clicked: eventMap.click || 0,
          bounced: eventMap.bounce || 0,
          unsubscribed: eventMap.unsubscribe || 0,
        }
      }),
      headers: { 'Content-Type': 'application/json' }
    }
  } catch (err) {
    console.error('Get campaign error:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to get campaign' })
    }
  }
}
