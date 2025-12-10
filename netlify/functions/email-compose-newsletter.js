import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import crypto from 'crypto'

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    const body = JSON.parse(event.body || '{}')
    const {
      name,
      mailboxId,
      subject,
      preheader,
      html,
      text,
      lists = [],
      tags = [],
      abTestEnabled,
      abSubjectB,
      abSplitPercent,
      abMetric,
      abEvaluationWindowHours,
      scheduleType,
      scheduledTime,
      timezone,
      seedTestEnabled,
      resendEnabled,
      resendDelayDays,
      resendSubject,
      viewInBrowserEnabled,
      utmPreset,
    } = body

    // Validate
    if (!name || !subject || !html || lists.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Create campaign
    const campaignId = crypto.randomUUID()
    const now = new Date().toISOString()
    const scheduledStart = scheduleType === 'later' ? new Date(scheduledTime).toISOString() : now

    const { error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        id: campaignId,
        type: 'newsletter',
        name,
        mailbox_id: mailboxId,
        status: 'scheduled',
        scheduled_start: scheduledStart,
        preheader,
        ab_test_enabled: abTestEnabled,
        ab_split_percent: abSplitPercent,
        ab_metric: abMetric,
        ab_evaluation_window_hours: abEvaluationWindowHours,
        resend_to_non_openers: resendEnabled,
        resend_delay_days: resendDelayDays,
        resend_subject: resendSubject || null,
        view_in_browser_enabled: viewInBrowserEnabled,
        utm_preset: utmPreset,
        created_at: now
      })

    if (campaignError) {
      console.error('Campaign insert error:', campaignError)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create campaign' })
      }
    }

    // Create audience
    const audienceId = crypto.randomUUID()
    const { error: audienceError } = await supabase
      .from('campaign_audiences')
      .insert({
        id: audienceId,
        campaign_id: campaignId,
        lists: lists,
        tags: tags,
        computed_count: 0
      })

    if (audienceError) {
      console.error('Audience insert error:', audienceError)
    }

    // Get opt-in contacts for audience count
    let estimatedCount = 0
    try {
      // Count contacts that are opted in and in the selected lists
      const { count } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('consent_status', 'opt_in')
        .in('id', 
          supabase
            .from('contact_list')
            .select('contact_id')
            .in('list_id', lists)
        )

      estimatedCount = count || 0
    } catch (countErr) {
      console.error('Count error:', countErr)
    }

    // Update audience count
    await supabase
      .from('campaign_audiences')
      .update({ computed_count: estimatedCount })
      .eq('id', audienceId)

    return {
      statusCode: 200,
      body: JSON.stringify({
        campaignId,
        status: 'scheduled',
        recipientCount: estimatedCount,
        abTestEnabled,
        resendEnabled,
        scheduledAt: scheduledStart
      }),
      headers: { 'Content-Type': 'application/json' }
    }
  } catch (err) {
    console.error('Compose newsletter error:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Failed to create campaign' })
    }
  }
}
