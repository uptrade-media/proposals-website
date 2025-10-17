import { Resend } from 'resend'
import { neon } from '@neondatabase/serverless'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)
const sql = neon(process.env.DATABASE_URL)

export async function handler(event) {
  try {
    // Verify auth
    const token = event.headers.cookie?.match(/um_session=([^;]+)/)?.[1]
    if (!token) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    const user = jwt.verify(token, process.env.AUTH_JWT_SECRET)
    if (user.role !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Admin only' }) }
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

    // Get contact
    const [contact] = await sql`
      SELECT * FROM contacts WHERE id = ${contactId} AND role = 'client'
    `

    if (!contact) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Contact not found' })
      }
    }

    // Create campaign
    const campaignId = crypto.randomUUID()
    const now = new Date()
    const scheduledStart = scheduleType === 'later' ? new Date(scheduledTime) : now

    await sql`
      INSERT INTO campaigns (
        id, type, name, mailbox_id, status, scheduled_start,
        window_start_local, window_end_local, daily_cap, warmup_percent,
        goal_url, daypart_enabled, created_at
      ) VALUES (
        ${campaignId}, 'one_off', ${name}, ${mailboxId}, 'scheduled',
        ${scheduledStart},
        ${daypartEnabled ? 9 : 0}, ${daypartEnabled ? 17 : 23}, ${dailyCap}, ${warmupPercent},
        ${goalUrl || null}, ${daypartEnabled}, ${now}
      )
    `

    // Create initial step
    await sql`
      INSERT INTO campaign_steps (
        id, campaign_id, step_index, delay_days, subject_override, html_override
      ) VALUES (
        ${crypto.randomUUID()}, ${campaignId}, 0, 0, ${subject}, ${html}
      )
    `

    // Create follow-up steps
    for (let i = 0; i < followUpSteps.length; i++) {
      const step = followUpSteps[i]
      await sql`
        INSERT INTO campaign_steps (
          id, campaign_id, step_index, delay_days, subject_override, html_override
        ) VALUES (
          ${crypto.randomUUID()}, ${campaignId}, ${i + 1}, ${step.delayDays},
          ${step.subjectOverride}, ${step.htmlOverride}
        )
      `
    }

    // Create recipient
    const unsubToken = crypto.randomUUID()
    const recipientId = crypto.randomUUID()

    await sql`
      INSERT INTO recipients (
        id, campaign_id, contact_id, step_index, status, unsubscribe_token, created_at
      ) VALUES (
        ${recipientId}, ${campaignId}, ${contactId}, 0, 'queued', ${unsubToken}, ${now}
      )
    `

    // Log activity
    await sql`
      INSERT INTO client_activity (
        id, contact_id, activity_type, description, created_at
      ) VALUES (
        ${crypto.randomUUID()}, ${contactId}, 'email_campaign_created',
        ${'One-off campaign: ' + name}, ${now}
      )
    `

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
