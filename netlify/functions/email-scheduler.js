// netlify/functions/email-scheduler.js
// Scheduled function: runs every 5 minutes
// Sends queued emails, respects daily caps, dayparting, warmup %

import { createSupabaseAdmin } from './utils/supabase.js'
import { Resend } from 'resend'

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
async function getDailySendCount(supabase, campaignId) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  try {
    const { count } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('event_type', 'sent')
      .gte('created_at', today.toISOString())
    
    return count || 0
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
  
  if (!RESEND_API_KEY) {
    console.error('[email-scheduler] RESEND_API_KEY not configured')
    return { statusCode: 500, body: JSON.stringify({ error: 'Resend not configured' }) }
  }

  try {
    const supabase = createSupabaseAdmin()
    const resend = new Resend(RESEND_API_KEY)

    // 1. Get all campaigns that need to be sent
    // Status: scheduled, scheduledStart <= now, not yet marked as sending/done
    const now = new Date().toISOString()
    
    const { data: campaignsToSend, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*, mailboxes(*)')
      .eq('status', 'scheduled')
      .lte('scheduled_start', now)
      .is('sent_at', null)

    if (campaignsError) {
      console.error('[email-scheduler] Error fetching campaigns:', campaignsError)
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch campaigns' }) }
    }

    console.log(`[email-scheduler] Found ${campaignsToSend?.length || 0} campaigns to process`)

    let totalSent = 0
    let totalSkipped = 0

    for (const campaign of (campaignsToSend || [])) {
      // Get queued recipients for this campaign
      const { data: recipients } = await supabase
        .from('recipients')
        .select('*')
        .eq('campaign_id', campaign.id)
        .eq('status', 'queued')

      console.log(`[email-scheduler] Processing campaign: ${campaign.id} (${recipients?.length || 0} recipients)`)

      // Skip if no mailbox configured
      if (!campaign.mailboxes || !campaign.mailboxes.from_email) {
        console.warn(`[email-scheduler] Campaign ${campaign.id} has no mailbox configured`)
        continue
      }

      // Check dayparting
      if (campaign.daypart_enabled && !isBusinessHours()) {
        console.log(`[email-scheduler] Campaign ${campaign.id} dayparting enabled, outside business hours`)
        totalSkipped += recipients?.length || 0
        continue
      }

      // Get daily send count
      const dailySendCount = await getDailySendCount(supabase, campaign.id)
      const dailyCap = campaign.daily_cap || 1000
      const remainingToday = Math.max(0, dailyCap - dailySendCount)

      if (remainingToday === 0) {
        console.log(`[email-scheduler] Campaign ${campaign.id} hit daily cap (${dailyCap})`)
        totalSkipped += recipients?.length || 0
        continue
      }

      // Process recipients up to daily cap
      let sentThisBatch = 0

      for (const recipient of (recipients || []).slice(0, remainingToday)) {
        // Check warmup %
        if (!shouldSendByWarmup(campaign.warmup_percent || 100)) {
          console.log(`[email-scheduler] Recipient ${recipient.id} skipped by warmup filter`)
          totalSkipped++
          continue
        }

        try {
          // Get recipient contact info
          const { data: contact } = await supabase
            .from('contacts')
            .select('*')
            .eq('id', recipient.contact_id)
            .single()

          if (!contact) {
            console.warn(`[email-scheduler] Recipient contact not found: ${recipient.contact_id}`)
            totalSkipped++
            continue
          }

          // Get campaign step (subject, HTML)
          const { data: step } = await supabase
            .from('campaign_steps')
            .select('*')
            .eq('campaign_id', campaign.id)
            .eq('step_index', recipient.current_step || 0)
            .single()

          if (!step) {
            console.warn(`[email-scheduler] Step not found for campaign ${campaign.id}`)
            totalSkipped++
            continue
          }

          // Send via Resend
          const result = await resend.emails.send({
            from: campaign.mailboxes.from_email,
            to: contact.email,
            subject: step.subject || step.subject_override,
            html: step.html_content || step.html_override,
            headers: {
              'X-Campaign-ID': campaign.id,
              'X-Recipient-ID': recipient.id,
              'X-Unsubscribe-Token': recipient.unsubscribe_token
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
          await supabase
            .from('recipients')
            .update({
              status: 'sent',
              message_id: result.data.id,
              sent_at: new Date().toISOString()
            })
            .eq('id', recipient.id)

          // Log event
          await supabase
            .from('events')
            .insert({
              campaign_id: campaign.id,
              recipient_id: recipient.id,
              event_type: 'sent',
              message_id: result.data.id,
              created_at: new Date().toISOString()
            })

          // If multi-step campaign, schedule next step
          if (campaign.type === 'one_off' && (recipient.current_step || 0) < 2) {
            const { data: nextStep } = await supabase
              .from('campaign_steps')
              .select('*')
              .eq('campaign_id', campaign.id)
              .eq('step_index', (recipient.current_step || 0) + 1)
              .single()

            if (nextStep && nextStep.delay_days) {
              // Create queued recipient for next step
              const nextStepDate = new Date()
              nextStepDate.setDate(nextStepDate.getDate() + nextStep.delay_days)

              await supabase
                .from('recipients')
                .insert({
                  campaign_id: campaign.id,
                  contact_id: recipient.contact_id,
                  current_step: (recipient.current_step || 0) + 1,
                  status: 'queued',
                  scheduled_at: nextStepDate.toISOString(),
                  unsubscribe_token: recipient.unsubscribe_token
                })

              console.log(`[email-scheduler] Scheduled follow-up (step ${(recipient.current_step || 0) + 1}) for ${contact.email} on ${nextStepDate.toISOString()}`)
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
      const { count: remainingRecipients } = await supabase
        .from('recipients')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .eq('status', 'queued')

      if ((remainingRecipients || 0) === 0) {
        await supabase
          .from('campaigns')
          .update({
            status: 'done',
            sent_at: new Date().toISOString()
          })
          .eq('id', campaign.id)

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
        campaigns: campaignsToSend?.length || 0,
        message: `Processed ${campaignsToSend?.length || 0} campaigns`
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
