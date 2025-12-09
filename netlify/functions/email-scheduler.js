// netlify/functions/email-scheduler.js
// Scheduled function: runs every 5 minutes
// Sends queued emails, respects daily caps, dayparting, warmup %

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { and, eq, isNull, lte, gte, count, sql } from 'drizzle-orm'
import * as schema from '../../src/db/schema.js'
import { Resend } from 'resend'

const DATABASE_URL = process.env.DATABASE_URL
const RESEND_API_KEY = process.env.RESEND_API_KEY
const SENDING_DOMAIN = process.env.SENDING_DOMAIN || 'portal@send.uptrademedia.com'

// Helper: Check if current time is within business hours (9 AM - 5 PM)
function isBusinessHours() {
  const now = new Date()
  const hour = now.getHours()
  const dayOfWeek = now.getDay()
  
  // Monday-Friday, 9 AM - 5 PM
  return dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 9 && hour < 17
}

// Helper: Get daily send count for a campaign mailbox
async function getDailySendCount(db, campaignId) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  try {
    const result = await db
      .select({ count: count() })
      .from(schema.events)
      .where(
        and(
          eq(schema.events.campaignId, campaignId),
          eq(schema.events.eventType, 'sent'),
          gte(schema.events.createdAt, today)
        )
      )
    
    return parseInt(result[0]?.count || 0)
  } catch (err) {
    console.warn(`[email-scheduler] Error counting daily sends:`, err.message)
    return 0
  }
}

// Helper: Check if recipient should receive email based on warmup %
function shouldSendByWarmup(warmupPercent) {
  if (warmupPercent === 100) return true
  if (warmupPercent <= 0) return false
  return Math.random() * 100 < warmupPercent
}

export async function handler(event) {
  console.log('[email-scheduler] Running scheduled function')
  
  if (!DATABASE_URL) {
    console.error('[email-scheduler] DATABASE_URL not configured')
    return { statusCode: 500, body: JSON.stringify({ error: 'Database not configured' }) }
  }

  if (!RESEND_API_KEY) {
    console.error('[email-scheduler] RESEND_API_KEY not configured')
    return { statusCode: 500, body: JSON.stringify({ error: 'Resend not configured' }) }
  }

  try {
    const sql = neon(DATABASE_URL)
    const db = drizzle(sql, { schema })
    const resend = new Resend(RESEND_API_KEY)

    // 1. Get all campaigns that need to be sent
    // Status: scheduled, scheduledStart <= now, not yet marked as sending/done
    const now = new Date()
    const campaignsToSend = await db.query.campaigns.findMany({
      where: and(
        eq(schema.campaigns.status, 'scheduled'),
        lte(schema.campaigns.scheduledStart, now),
        isNull(schema.campaigns.sentAt)
      ),
      with: {
        mailbox: true,
        recipients: {
          where: eq(schema.recipients.status, 'queued')
        }
      }
    })

    console.log(`[email-scheduler] Found ${campaignsToSend.length} campaigns to process`)

    let totalSent = 0
    let totalSkipped = 0

    for (const campaign of campaignsToSend) {
      console.log(`[email-scheduler] Processing campaign: ${campaign.id} (${campaign.recipients.length} recipients)`)

      // Skip if no mailbox configured
      if (!campaign.mailbox || !campaign.mailbox.fromEmail) {
        console.warn(`[email-scheduler] Campaign ${campaign.id} has no mailbox configured`)
        continue
      }

      // Check dayparting
      if (campaign.daypartEnabled && !isBusinessHours()) {
        console.log(`[email-scheduler] Campaign ${campaign.id} dayparting enabled, outside business hours`)
        totalSkipped += campaign.recipients.length
        continue
      }

      // Get daily send count
      const dailySendCount = await getDailySendCount(db, campaign.id)
      const dailyCap = campaign.dailyCap || 1000
      const remainingToday = Math.max(0, dailyCap - dailySendCount)

      if (remainingToday === 0) {
        console.log(`[email-scheduler] Campaign ${campaign.id} hit daily cap (${dailyCap})`)
        totalSkipped += campaign.recipients.length
        continue
      }

      // Process recipients up to daily cap
      let sentThisBatch = 0

      for (const recipient of campaign.recipients.slice(0, remainingToday)) {
        // Check warmup %
        if (!shouldSendByWarmup(campaign.warmupPercent || 100)) {
          console.log(`[email-scheduler] Recipient ${recipient.id} skipped by warmup filter`)
          totalSkipped++
          continue
        }

        try {
          // Get recipient contact info
          const contact = await db.query.contacts.findFirst({
            where: eq(schema.contacts.id, recipient.contactId)
          })

          if (!contact) {
            console.warn(`[email-scheduler] Recipient contact not found: ${recipient.contactId}`)
            totalSkipped++
            continue
          }

          // Get campaign step (subject, HTML)
          const step = await db.query.campaignSteps.findFirst({
            where: and(
              eq(schema.campaignSteps.campaignId, campaign.id),
              eq(schema.campaignSteps.stepIndex, recipient.currentStep || 0)
            )
          })

          if (!step) {
            console.warn(`[email-scheduler] Step not found for campaign ${campaign.id}`)
            totalSkipped++
            continue
          }

          // Send via Resend
          const result = await resend.emails.send({
            from: campaign.mailbox.fromEmail,
            to: contact.email,
            subject: step.subject,
            html: step.htmlContent,
            headers: {
              'X-Campaign-ID': campaign.id,
              'X-Recipient-ID': recipient.id,
              'X-Unsubscribe-Token': recipient.unsubscribeToken
            }
          })

          if (result.error) {
            console.error(`[email-scheduler] Failed to send to ${contact.email}:`, result.error)
            totalSkipped++
            continue
          }

          // Log success
          console.log(`[email-scheduler] Sent email to ${contact.email} (messageId: ${result.data.id})`)

          // Update recipient status and message ID
          await db.update(schema.recipients)
            .set({
              status: 'sent',
              messageId: result.data.id,
              sentAt: new Date()
            })
            .where(eq(schema.recipients.id, recipient.id))

          // Log event
          await db.insert(schema.events).values({
            campaignId: campaign.id,
            recipientId: recipient.id,
            eventType: 'sent',
            messageId: result.data.id,
            createdAt: new Date()
          })

          // If multi-step campaign, schedule next step
          if (campaign.type === 'one_off' && step.stepIndex < 2) {
            const nextStep = await db.query.campaignSteps.findFirst({
              where: and(
                eq(schema.campaignSteps.campaignId, campaign.id),
                eq(schema.campaignSteps.stepIndex, step.stepIndex + 1)
              )
            })

            if (nextStep && nextStep.delayDays) {
              // Create queued recipient for next step
              const nextStepDate = new Date()
              nextStepDate.setDate(nextStepDate.getDate() + nextStep.delayDays)

              await db.insert(schema.recipients).values({
                campaignId: campaign.id,
                contactId: recipient.contactId,
                currentStep: step.stepIndex + 1,
                status: 'queued',
                scheduledAt: nextStepDate,
                unsubscribeToken: recipient.unsubscribeToken
              })

              console.log(`[email-scheduler] Scheduled follow-up (step ${step.stepIndex + 1}) for ${contact.email} on ${nextStepDate.toISOString()}`)
            }
          }

          sentThisBatch++
          totalSent++
        } catch (err) {
          console.error(`[email-scheduler] Error sending to recipient ${recipient.id}:`, err.message)
          totalSkipped++
        }
      }

      // If all recipients sent, mark campaign as done
      const remainingRecipients = await db
        .select({ count: count() })
        .from(schema.recipients)
        .where(
          and(
            eq(schema.recipients.campaignId, campaign.id),
            eq(schema.recipients.status, 'queued')
          )
        )

      if (parseInt(remainingRecipients[0]?.count || 0) === 0) {
        await db.update(schema.campaigns)
          .set({
            status: 'done',
            sentAt: new Date()
          })
          .where(eq(schema.campaigns.id, campaign.id))

        console.log(`[email-scheduler] Campaign ${campaign.id} completed`)
      }
    }

    console.log(`[email-scheduler] Complete: Sent ${totalSent}, Skipped ${totalSkipped}`)

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        sent: totalSent,
        skipped: totalSkipped,
        campaigns: campaignsToSend.length,
        message: `Processed ${campaignsToSend.length} campaigns`
      })
    }
  } catch (err) {
    console.error('[email-scheduler] Error:', err.message)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    }
  }
}
