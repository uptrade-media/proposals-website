import { neon } from '@neondatabase/serverless'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

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

    // Create campaign
    const campaignId = crypto.randomUUID()
    const now = new Date()
    const scheduledStart = scheduleType === 'later' ? new Date(scheduledTime) : now

    await sql`
      INSERT INTO campaigns (
        id, type, name, mailbox_id, status, scheduled_start,
        preheader, ab_test_enabled, ab_split_percent, ab_metric,
        ab_evaluation_window_hours, resend_to_non_openers, resend_delay_days,
        resend_subject, view_in_browser_enabled, utm_preset, created_at
      ) VALUES (
        ${campaignId}, 'newsletter', ${name}, ${mailboxId}, 'scheduled',
        ${scheduledStart},
        ${preheader}, ${abTestEnabled}, ${abSplitPercent}, ${abMetric},
        ${abEvaluationWindowHours}, ${resendEnabled}, ${resendDelayDays},
        ${resendSubject || null}, ${viewInBrowserEnabled}, ${utmPreset}, ${now}
      )
    `

    // Create audience
    const audienceId = crypto.randomUUID()
    await sql`
      INSERT INTO campaign_audiences (
        id, campaign_id, lists, tags, computed_count
      ) VALUES (
        ${audienceId}, ${campaignId}, ${JSON.stringify(lists)}, ${JSON.stringify(tags)}, 0
      )
    `

    // Get opt-in contacts for audience count
    const listsPlaceholder = lists.map((_, i) => '$' + (i + 1)).join(',')
    const countResult = await sql`
      SELECT COUNT(*) as count FROM contacts
      WHERE consent_status = 'opt_in'
        AND id IN (
          SELECT contact_id FROM contact_list
          WHERE list_id IN (${lists.join(',')})
        )
      ${tags.length > 0 ? sql`AND tags @> ${JSON.stringify(tags)}` : sql``}
    `

    const estimatedCount = countResult[0]?.count || 0

    // Update audience count
    await sql`
      UPDATE campaign_audiences
      SET computed_count = ${estimatedCount}
      WHERE id = ${audienceId}
    `

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
