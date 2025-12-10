import { Resend } from 'resend'
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import crypto from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)

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
      contactId,
      subject,
      html,
      followUpSteps = [],
      goalUrl,
      scheduleType,
      scheduledTime,
      daypartEnabled,
      dailyCap = 100,
      warmupPercent = 0,
    } = body

    // Validate
    if (!name || !contactId || !subject || !html) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Get contact
    const { data: targetContact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('role', 'client')
      .single()

    if (contactError || !targetContact) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Contact not found' })
      }
    }

    // Create campaign
    const campaignId = crypto.randomUUID()
    const now = new Date().toISOString()
    const scheduledStart = scheduleType === 'later' ? new Date(scheduledTime).toISOString() : now

    const { error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        id: campaignId,
        type: 'one_off',
        name,
        mailbox_id: mailboxId,
        status: 'scheduled',
        scheduled_start: scheduledStart,
        window_start_local: daypartEnabled ? 9 : 0,
        window_end_local: daypartEnabled ? 17 : 23,
        daily_cap: dailyCap,
        warmup_percent: warmupPercent,
        goal_url: goalUrl || null,
        daypart_enabled: daypartEnabled,
        created_at: now
      })

    if (campaignError) {
      console.error('Campaign insert error:', campaignError)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create campaign' })
      }
    }

    // Create initial step
    const { error: stepError } = await supabase
      .from('campaign_steps')
      .insert({
        id: crypto.randomUUID(),
        campaign_id: campaignId,
        step_index: 0,
        delay_days: 0,
        subject_override: subject,
        html_override: html
      })

    if (stepError) {
      console.error('Step insert error:', stepError)
    }

    // Create follow-up steps
    for (let i = 0; i < followUpSteps.length; i++) {
      const step = followUpSteps[i]
      await supabase
        .from('campaign_steps')
        .insert({
          id: crypto.randomUUID(),
          campaign_id: campaignId,
          step_index: i + 1,
          delay_days: step.delayDays,
          subject_override: step.subjectOverride,
          html_override: step.htmlOverride
        })
    }

    // Create recipient
    const unsubToken = crypto.randomUUID()
    const recipientId = crypto.randomUUID()

    const { error: recipientError } = await supabase
      .from('recipients')
      .insert({
        id: recipientId,
        campaign_id: campaignId,
        contact_id: contactId,
        step_index: 0,
        status: 'queued',
        unsubscribe_token: unsubToken,
        created_at: now
      })

    if (recipientError) {
      console.error('Recipient insert error:', recipientError)
    }

    // Log activity
    await supabase
      .from('client_activity')
      .insert({
        id: crypto.randomUUID(),
        contact_id: contactId,
        activity_type: 'email_campaign_created',
        description: `One-off campaign: ${name}`,
        created_at: now
      })

    return {
      statusCode: 200,
      body: JSON.stringify({
        campaignId,
        status: 'scheduled',
        recipientCount: 1,
        followUps: followUpSteps.length,
        scheduledAt: scheduledStart
      }),
      headers: { 'Content-Type': 'application/json' }
    }
  } catch (err) {
    console.error('Compose one-off error:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Failed to create campaign' })
    }
  }
}
