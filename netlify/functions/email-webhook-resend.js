// netlify/functions/email-webhook-resend.js
// Receives Resend webhook events and logs them to the database
// Events: sent, delivered, open, click, bounce, complaint, unsubscribe

import crypto from 'crypto'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { and, eq } from 'drizzle-orm'
import * as schema from '../../src/db/schema.ts'

const DATABASE_URL = process.env.DATABASE_URL
const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET

// Verify Resend webhook signature
function verifyWebhookSignature(payload, signature) {
  if (!RESEND_WEBHOOK_SECRET) {
    console.warn('[email-webhook-resend] RESEND_WEBHOOK_SECRET not configured, skipping signature verification')
    return true
  }

  const hash = crypto
    .createHmac('sha256', RESEND_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')

  return crypto.timingSafeEqual(hash, signature) || false
}

// Handle auto-cancel rules
async function handleAutoCancelRules(db, recipientId, eventType) {
  // Auto-cancel follow-ups on:
  // - reply, bounce, complaint, unsubscribe, goal click
  const shouldCancel = ['reply', 'bounce', 'complaint', 'unsubscribe', 'goal'].includes(eventType)

  if (shouldCancel) {
    console.log(`[email-webhook-resend] Auto-canceling follow-ups for recipient ${recipientId} (${eventType})`)

    // Get all queued follow-ups for this recipient
    const recipient = await db.query.recipients.findFirst({
      where: eq(schema.recipients.id, recipientId),
      with: { campaign: true }
    })

    if (recipient) {
      // Find next steps in campaign
      const nextSteps = await db.query.recipients.findMany({
        where: and(
          eq(schema.recipients.campaignId, recipient.campaignId),
          eq(schema.recipients.contactId, recipient.contactId),
          eq(schema.recipients.status, 'queued')
        )
      })

      // Mark as cancelled
      for (const nextStep of nextSteps) {
        await db.update(schema.recipients)
          .set({ status: 'cancelled' })
          .where(eq(schema.recipients.id, nextStep.id))

        console.log(`[email-webhook-resend] Cancelled follow-up ${nextStep.id}`)
      }
    }
  }
}

export async function handler(event) {
  console.log('[email-webhook-resend] Received webhook')

  if (!DATABASE_URL) {
    console.error('[email-webhook-resend] DATABASE_URL not configured')
    return { statusCode: 500, body: JSON.stringify({ error: 'Database not configured' }) }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Verify webhook signature (if secret configured)
    if (RESEND_WEBHOOK_SECRET) {
      const signature = event.headers['x-resend-signature']
      if (!signature || !verifyWebhookSignature(event.body, signature)) {
        console.warn('[email-webhook-resend] Invalid webhook signature')
        return {
          statusCode: 401,
          body: JSON.stringify({ error: 'Invalid signature' })
        }
      }
    }

    // Parse webhook payload
    const payload = JSON.parse(event.body || '{}')
    const { type, data } = payload

    console.log(`[email-webhook-resend] Event: ${type}`)

    if (!type || !data) {
      console.warn('[email-webhook-resend] Missing type or data in webhook')
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing type or data' })
      }
    }

    const sql = neon(DATABASE_URL)
    const db = drizzle(sql, { schema })

    // Map Resend event types to our event types
    const eventTypeMap = {
      'email.sent': 'sent',
      'email.delivered': 'delivered',
      'email.opened': 'open',
      'email.clicked': 'click',
      'email.bounced': 'bounce',
      'email.complained': 'complaint',
      'email.unsubscribed': 'unsubscribe'
    }

    const ourEventType = eventTypeMap[type]
    if (!ourEventType) {
      console.warn(`[email-webhook-resend] Unknown event type: ${type}`)
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, message: 'Event type not tracked' })
      }
    }

    // Extract message ID from data
    const messageId = data.message_id || data.id
    if (!messageId) {
      console.warn('[email-webhook-resend] No message ID in webhook data')
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No message ID' })
      }
    }

    // Find recipient by message ID
    const recipient = await db.query.recipients.findFirst({
      where: eq(schema.recipients.messageId, messageId),
      with: { campaign: true }
    })

    if (!recipient) {
      console.warn(`[email-webhook-resend] Recipient not found for message ${messageId}`)
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, message: 'Recipient not found' })
      }
    }

    // Log event
    await db.insert(schema.events).values({
      campaignId: recipient.campaignId,
      recipientId: recipient.id,
      messageId: messageId,
      eventType: ourEventType,
      metadata: JSON.stringify(data), // Store full Resend data
      createdAt: new Date()
    })

    console.log(`[email-webhook-resend] Logged event: ${ourEventType} for recipient ${recipient.id}`)

    // Handle auto-cancel rules
    await handleAutoCancelRules(db, recipient.id, ourEventType)

    // Update recipient status if needed
    if (ourEventType === 'delivered') {
      await db.update(schema.recipients)
        .set({ status: 'delivered' })
        .where(eq(schema.recipients.id, recipient.id))
    }

    if (ourEventType === 'unsubscribe') {
      await db.update(schema.recipients)
        .set({ status: 'unsubscribed' })
        .where(eq(schema.recipients.id, recipient.id))

      // Also add to suppressions table
      await db.insert(schema.suppressions).values({
        email: data.email || recipient.email,
        reason: 'unsubscribe',
        createdAt: new Date()
      })

      // Auto-cancel all follow-ups
      const contact = await db.query.contacts.findFirst({
        where: eq(schema.contacts.id, recipient.contactId)
      })

      if (contact) {
        const followUps = await db.query.recipients.findMany({
          where: and(
            eq(schema.recipients.contactId, recipient.contactId),
            eq(schema.recipients.status, 'queued')
          )
        })

        for (const followUp of followUps) {
          await db.update(schema.recipients)
            .set({ status: 'cancelled' })
            .where(eq(schema.recipients.id, followUp.id))
        }
      }
    }

    if (ourEventType === 'bounce' || ourEventType === 'complaint') {
      await db.update(schema.recipients)
        .set({ status: 'failed' })
        .where(eq(schema.recipients.id, recipient.id))

      // Add to suppressions
      await db.insert(schema.suppressions).values({
        email: data.email || recipient.email,
        reason: ourEventType,
        createdAt: new Date()
      })
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, message: 'Event logged' })
    }
  } catch (err) {
    console.error('[email-webhook-resend] Error:', err.message)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    }
  }
}
