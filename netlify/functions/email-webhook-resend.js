// netlify/functions/email-webhook-resend.js
// Receives Resend webhook events and logs them to the database
// Events: sent, delivered, open, click, bounce, complaint, unsubscribe

import crypto from 'crypto'
import { createSupabaseAdmin } from './utils/supabase.js'

const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET

// Verify Resend webhook signature
function verifyWebhookSignature(payload, signature) {
  if (!RESEND_WEBHOOK_SECRET) {
    console.warn('[email-webhook-resend] RESEND_WEBHOOK_SECRET not configured, skipping signature verification')
    return true
  }

  try {
    const hash = crypto
      .createHmac('sha256', RESEND_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex')

    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature))
  } catch {
    return false
  }
}

// Handle auto-cancel rules
async function handleAutoCancelRules(supabase, recipientId, eventType) {
  // Auto-cancel follow-ups on:
  // - reply, bounce, complaint, unsubscribe, goal click
  const shouldCancel = ['reply', 'bounce', 'complaint', 'unsubscribe', 'goal'].includes(eventType)

  if (shouldCancel) {
    console.log(`[email-webhook-resend] Auto-canceling follow-ups for recipient ${recipientId} (${eventType})`)

    // Get recipient details
    const { data: recipient } = await supabase
      .from('recipients')
      .select('*, campaigns(*)')
      .eq('id', recipientId)
      .single()

    if (recipient) {
      // Find next steps in campaign and mark as cancelled
      const { data: nextSteps } = await supabase
        .from('recipients')
        .select('id')
        .eq('campaign_id', recipient.campaign_id)
        .eq('contact_id', recipient.contact_id)
        .eq('status', 'queued')

      for (const nextStep of (nextSteps || [])) {
        await supabase
          .from('recipients')
          .update({ status: 'cancelled' })
          .eq('id', nextStep.id)

        console.log(`[email-webhook-resend] Cancelled follow-up ${nextStep.id}`)
      }
    }
  }
}

export async function handler(event) {
  console.log('[email-webhook-resend] Received webhook')

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

    const supabase = createSupabaseAdmin()

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

    // ==== CRM Email Tracking ====
    // Check if this email is tracked in email_tracking table (CRM audits, proposals, etc.)
    const { data: emailTracking } = await supabase
      .from('email_tracking')
      .select('id, open_count, click_count, clicked_links')
      .eq('resend_email_id', messageId)
      .single()

    if (emailTracking) {
      const now = new Date().toISOString()
      let trackingUpdate = {}

      switch (ourEventType) {
        case 'delivered':
          trackingUpdate = { delivered_at: now, status: 'delivered' }
          break
        case 'open':
          trackingUpdate = {
            opened_at: emailTracking.opened_at || now,
            last_opened_at: now,
            open_count: (emailTracking.open_count || 0) + 1,
            status: 'opened',
            engagement_score: ((emailTracking.open_count || 0) + 1) * 1 + (emailTracking.click_count || 0) * 5
          }
          break
        case 'click':
          const clickedUrl = data.link || data.url
          const existingLinks = emailTracking.clicked_links || []
          if (clickedUrl) existingLinks.push({ url: clickedUrl, clicked_at: now })
          trackingUpdate = {
            clicked_at: emailTracking.clicked_at || now,
            click_count: (emailTracking.click_count || 0) + 1,
            clicked_links: existingLinks,
            status: 'clicked',
            engagement_score: (emailTracking.open_count || 0) * 1 + ((emailTracking.click_count || 0) + 1) * 5
          }
          break
        case 'bounce':
          trackingUpdate = { status: 'bounced', bounce_reason: data.bounce?.type || 'Unknown' }
          break
        case 'complaint':
          trackingUpdate = { status: 'complained', bounce_reason: 'Marked as spam' }
          break
      }

      if (Object.keys(trackingUpdate).length > 0) {
        await supabase
          .from('email_tracking')
          .update(trackingUpdate)
          .eq('id', emailTracking.id)
        console.log(`[email-webhook-resend] Updated email_tracking ${emailTracking.id} with ${ourEventType}`)
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, source: 'email_tracking', event: ourEventType })
      }
    }

    // ==== Campaign Email Tracking ====
    // Find recipient by message ID (campaign emails)
    const { data: recipient } = await supabase
      .from('recipients')
      .select('*, campaigns(*)')
      .eq('message_id', messageId)
      .single()

    if (!recipient) {
      console.warn(`[email-webhook-resend] Recipient not found for message ${messageId}`)
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, message: 'Recipient not found' })
      }
    }

    // Log event
    await supabase
      .from('events')
      .insert({
        campaign_id: recipient.campaign_id,
        recipient_id: recipient.id,
        message_id: messageId,
        event_type: ourEventType,
        metadata: data, // Store full Resend data
        created_at: new Date().toISOString()
      })

    console.log(`[email-webhook-resend] Logged event: ${ourEventType} for recipient ${recipient.id}`)

    // Handle auto-cancel rules
    await handleAutoCancelRules(supabase, recipient.id, ourEventType)

    // Update recipient status if needed
    if (ourEventType === 'delivered') {
      await supabase
        .from('recipients')
        .update({ status: 'delivered' })
        .eq('id', recipient.id)
    }

    if (ourEventType === 'unsubscribe') {
      await supabase
        .from('recipients')
        .update({ status: 'unsubscribed' })
        .eq('id', recipient.id)

      // Also add to suppressions table
      await supabase
        .from('suppressions')
        .insert({
          email: data.email || recipient.email,
          reason: 'unsubscribe',
          created_at: new Date().toISOString()
        })

      // Auto-cancel all follow-ups for this contact
      const { data: followUps } = await supabase
        .from('recipients')
        .select('id')
        .eq('contact_id', recipient.contact_id)
        .eq('status', 'queued')

      for (const followUp of (followUps || [])) {
        await supabase
          .from('recipients')
          .update({ status: 'cancelled' })
          .eq('id', followUp.id)
      }
    }

    if (ourEventType === 'bounce' || ourEventType === 'complaint') {
      await supabase
        .from('recipients')
        .update({ status: 'failed' })
        .eq('id', recipient.id)

      // Add to suppressions
      await supabase
        .from('suppressions')
        .insert({
          email: data.email || recipient.email,
          reason: ourEventType,
          created_at: new Date().toISOString()
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
